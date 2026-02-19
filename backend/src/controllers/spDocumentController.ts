import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/auth";
import ServiceProviderDocument, { SPDocumentStatus } from "../models/ServiceProviderDocument";
import ServiceProvider from "../models/ServiceProvider";
import User from "../models/User";
import fs from "fs";
import path from "path";
import { getUploadBaseDir, ensureDir } from "../utils/uploadDir";

// Upload SP document
export const uploadSPDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentKey, documentName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Find service provider
    let serviceProvider;
    if (userRole === "SERVICE_PROVIDER") {
      serviceProvider = await ServiceProvider.findOne({ userId });
    } else if (userRole === "SUPER_ADMIN") {
      const { serviceProviderId } = req.body;
      if (!serviceProviderId) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: "serviceProviderId is required for super admin uploads",
        });
      }
      serviceProvider = await ServiceProvider.findById(serviceProviderId);
    }

    if (!serviceProvider) {
      fs.unlinkSync(file.path);
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    // Create SP directory
    const spDir = path.join(getUploadBaseDir(), `service-provider/${serviceProvider._id.toString()}`);
    ensureDir(spDir);

    // Generate final filename and move file
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    const finalFilename = `${documentKey}_${timestamp}_${sanitizedName}${ext}`;
    const finalPath = path.join(spDir, finalFilename);

    fs.renameSync(file.path, finalPath);

    // Determine status based on uploader role
    const documentStatus =
      userRole === "SUPER_ADMIN"
        ? SPDocumentStatus.APPROVED
        : SPDocumentStatus.PENDING;

    // Check for existing document (single file field - replace)
    const existingDoc = await ServiceProviderDocument.findOne({
      serviceProviderId: serviceProvider._id,
      documentKey,
    });

    let document;

    if (existingDoc) {
      // Delete old file
      const oldFilePath = path.join(process.cwd(), existingDoc.filePath);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }

      // Update with new file
      existingDoc.fileName = finalFilename;
      existingDoc.filePath = `uploads/service-provider/${serviceProvider._id}/${finalFilename}`;
      existingDoc.fileSize = file.size;
      existingDoc.mimeType = file.mimetype;
      existingDoc.uploadedAt = new Date();
      existingDoc.uploadedBy = new mongoose.Types.ObjectId(userId);
      existingDoc.uploadedByRole = userRole;
      existingDoc.status = documentStatus;
      existingDoc.version += 1;
      existingDoc.approvedBy =
        userRole === "SUPER_ADMIN"
          ? new mongoose.Types.ObjectId(userId)
          : undefined;
      existingDoc.approvedAt =
        userRole === "SUPER_ADMIN" ? new Date() : undefined;
      existingDoc.rejectionMessage = undefined;
      existingDoc.rejectedBy = undefined;
      existingDoc.rejectedAt = undefined;

      document = await existingDoc.save();
    } else {
      document = await ServiceProviderDocument.create({
        serviceProviderId: serviceProvider._id,
        documentName,
        documentKey,
        fileName: finalFilename,
        filePath: `uploads/service-provider/${serviceProvider._id}/${finalFilename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: new mongoose.Types.ObjectId(userId),
        uploadedByRole: userRole,
        status: documentStatus,
        version: 1,
        approvedBy:
          userRole === "SUPER_ADMIN"
            ? new mongoose.Types.ObjectId(userId)
            : undefined,
        approvedAt: userRole === "SUPER_ADMIN" ? new Date() : undefined,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: { document },
    });
  } catch (error: any) {
    console.warn("SP document upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
    });
  }
};

// Upload company logo
export const uploadCompanyLogo = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const userRole = req.user!.role;
    const userId = req.user!.userId;

    let serviceProvider;
    if (userRole === "SERVICE_PROVIDER") {
      serviceProvider = await ServiceProvider.findOne({ userId });
    } else if (userRole === "SUPER_ADMIN") {
      const { serviceProviderId } = req.body;
      if (!serviceProviderId) {
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: "serviceProviderId is required",
        });
      }
      serviceProvider = await ServiceProvider.findById(serviceProviderId);
    }

    if (!serviceProvider) {
      fs.unlinkSync(file.path);
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    // Create SP directory
    const spDir = path.join(getUploadBaseDir(), `service-provider/${serviceProvider._id.toString()}`);
    ensureDir(spDir);

    // Delete old logo if exists
    if (serviceProvider.companyLogo) {
      const oldLogoPath = path.join(process.cwd(), serviceProvider.companyLogo);
      if (fs.existsSync(oldLogoPath)) {
        fs.unlinkSync(oldLogoPath);
      }
    }

    // Move file
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const finalFilename = `company_logo_${timestamp}${ext}`;
    const finalPath = path.join(spDir, finalFilename);
    fs.renameSync(file.path, finalPath);

    // Update service provider
    serviceProvider.companyLogo = `uploads/service-provider/${serviceProvider._id}/${finalFilename}`;
    await serviceProvider.save();

    return res.status(200).json({
      success: true,
      message: "Company logo uploaded successfully",
      data: { companyLogo: serviceProvider.companyLogo },
    });
  } catch (error: any) {
    console.warn("Logo upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload logo",
    });
  }
};

// Get all SP documents
export const getSPDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { serviceProviderId } = req.params;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Authorization check
    if (userRole === "SERVICE_PROVIDER") {
      const sp = await ServiceProvider.findById(serviceProviderId);
      if (!sp || sp.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }
    // SUPER_ADMIN has full access

    const documents = await ServiceProviderDocument.find({ serviceProviderId })
      .populate("uploadedBy", "firstName middleName lastName email")
      .populate("approvedBy", "firstName middleName lastName email")
      .populate("rejectedBy", "firstName middleName lastName email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: { documents },
    });
  } catch (error: any) {
    console.warn("Get SP documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
    });
  }
};

// Get my SP documents (for logged-in service provider)
export const getMySPDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const serviceProvider = await ServiceProvider.findOne({ userId });

    if (!serviceProvider) {
      return res.status(404).json({
        success: false,
        message: "Service provider not found",
      });
    }

    const documents = await ServiceProviderDocument.find({
      serviceProviderId: serviceProvider._id,
    })
      .populate("uploadedBy", "firstName middleName lastName email")
      .populate("approvedBy", "firstName middleName lastName email")
      .populate("rejectedBy", "firstName middleName lastName email")
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: {
        documents,
        serviceProvider,
      },
    });
  } catch (error: any) {
    console.warn("Get my SP documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
    });
  }
};

// View SP document (inline)
export const viewSPDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;

    const document = await ServiceProviderDocument.findById(documentId);
    if (!document) {
      res.status(404).json({
        success: false,
        message: "Document not found",
      });
      return;
    }

    // Authorization check
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    if (userRole === "SERVICE_PROVIDER") {
      const sp = await ServiceProvider.findById(document.serviceProviderId);
      if (!sp || sp.userId.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: "Access denied",
        });
        return;
      }
    }

    const filePath = path.join(process.cwd(), document.filePath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: "File not found on server",
      });
      return;
    }

    res.setHeader("Content-Type", document.mimeType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${document.fileName}"`
    );

    const fileStream = fs.createReadStream(filePath);
    fileStream.on("error", (error): void => {
      console.warn("File stream error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: "Failed to stream document",
        });
      }
    });

    fileStream.pipe(res);
  } catch (error: any) {
    console.warn("View SP document error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to view document",
    });
  }
};

// Download SP document
export const downloadSPDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await ServiceProviderDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Authorization check
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    if (userRole === "SERVICE_PROVIDER") {
      const sp = await ServiceProvider.findById(document.serviceProviderId);
      if (!sp || sp.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    const filePath = path.join(process.cwd(), document.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    return res.download(filePath, document.fileName);
  } catch (error: any) {
    console.warn("Download SP document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download document",
    });
  }
};

// Approve SP document (Super Admin only)
export const approveSPDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await ServiceProviderDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    document.status = SPDocumentStatus.APPROVED;
    document.approvedBy = new mongoose.Types.ObjectId(req.user!.userId);
    document.approvedAt = new Date();
    document.rejectionMessage = undefined;
    document.rejectedBy = undefined;
    document.rejectedAt = undefined;

    await document.save();

    return res.status(200).json({
      success: true,
      message: "Document approved successfully",
      data: { document },
    });
  } catch (error: any) {
    console.warn("Approve SP document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve document",
    });
  }
};

// Reject SP document (Super Admin only)
export const rejectSPDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { rejectionMessage } = req.body;

    if (!rejectionMessage || rejectionMessage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Rejection message is required",
      });
    }

    const document = await ServiceProviderDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete file from storage
    const filePath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document from database
    await ServiceProviderDocument.findByIdAndDelete(documentId);

    return res.status(200).json({
      success: true,
      message: "Document rejected and deleted successfully",
    });
  } catch (error: any) {
    console.warn("Reject SP document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject document",
    });
  }
};

// Delete SP document (Super Admin only)
export const deleteSPDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await ServiceProviderDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Delete file from storage
    const filePath = path.join(process.cwd(), document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document record
    await ServiceProviderDocument.findByIdAndDelete(documentId);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.warn("Delete SP document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document",
    });
  }
};
