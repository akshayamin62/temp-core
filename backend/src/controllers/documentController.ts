import { Response } from "express";
import mongoose from "mongoose";
import { AuthRequest } from "../types/auth";
import StudentDocument, { DocumentStatus } from "../models/StudentDocument";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import Student from "../models/Student";
import Ops from "../models/Ops";
import User from "../models/User";
import { sendDocumentRejectionEmail } from "../utils/email";
import fs from "fs";
import path from "path";
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// Upload document (auto-save)
export const uploadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId, documentKey, documentName, category, isCustomField } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    // Verify registration exists
    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      // Delete uploaded file
      fs.unlinkSync(file.path);
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    const studentId = registration.studentId;

    // Create student directory
    const studentDir = path.join(getUploadBaseDir(), studentId.toString());
    ensureDir(studentDir);

    // Generate final filename and move file to student folder
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    const finalFilename = `${documentKey}_${timestamp}_${sanitizedName}${ext}`;
    const finalPath = path.join(studentDir, finalFilename);
    
    fs.renameSync(file.path, finalPath);

    // Determine status based on uploader role
    const userRole = req.user!.role;
    const documentStatus = (userRole === 'SUPER_ADMIN' || userRole === 'OPS') 
      ? DocumentStatus.APPROVED 
      : DocumentStatus.PENDING;

    // For allowMultiple fields, always create new document
    // For single fields, check and replace existing document
    const allowMultiple = req.body.allowMultiple === "true" || req.body.allowMultiple === true;
    
    let document;
    
    if (!allowMultiple) {
      // Check for existing document (single file field)
      const existingDoc = await StudentDocument.findOne({
        registrationId,
        documentKey,
      });

      if (existingDoc) {
        // Delete old file
        const oldFilePath = path.join(__dirname, "../../", existingDoc.filePath);
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath);
        }

        // Update with new file
        existingDoc.fileName = finalFilename;
        existingDoc.filePath = `uploads/${studentId}/${finalFilename}`;
        existingDoc.fileSize = file.size;
        existingDoc.mimeType = file.mimetype;
        existingDoc.uploadedAt = new Date();
        existingDoc.uploadedBy = new mongoose.Types.ObjectId(req.user!.userId);
        existingDoc.uploadedByRole = req.user!.role as any;
        existingDoc.status = documentStatus;
        existingDoc.version += 1;
        existingDoc.approvedBy = (userRole === 'SUPER_ADMIN' || userRole === 'OPS') 
          ? new mongoose.Types.ObjectId(req.user!.userId) 
          : undefined;
        existingDoc.approvedAt = (userRole === 'SUPER_ADMIN' || userRole === 'OPS') 
          ? new Date() 
          : undefined;

        document = await existingDoc.save();
      } else {
        // Create new document
        document = await StudentDocument.create({
          registrationId,
          studentId,
          documentCategory: category,
          documentName,
          documentKey,
          fileName: finalFilename,
          filePath: `uploads/${studentId}/${finalFilename}`,
          fileSize: file.size,
          mimeType: file.mimetype,
          uploadedBy: new mongoose.Types.ObjectId(req.user!.userId),
          uploadedByRole: req.user!.role,
          status: documentStatus,
          isCustomField: isCustomField === "true" || isCustomField === true,
          version: 1,
          approvedBy: (userRole === 'SUPER_ADMIN' || userRole === 'OPS') 
            ? new mongoose.Types.ObjectId(req.user!.userId) 
            : undefined,
          approvedAt: (userRole === 'SUPER_ADMIN' || userRole === 'OPS') 
            ? new Date() 
            : undefined,
        });
      }
    } else {
      // Always create new document for multiple file fields
      document = await StudentDocument.create({
        registrationId,
        studentId,
        documentCategory: category,
        documentName,
        documentKey,
        fileName: finalFilename,
        filePath: `uploads/${studentId}/${finalFilename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: new mongoose.Types.ObjectId(req.user!.userId),
        uploadedByRole: req.user!.role,
        status: documentStatus,
        isCustomField: isCustomField === "true" || isCustomField === true,
        version: 1,
        approvedBy: (userRole === 'SUPER_ADMIN' || userRole === 'OPS') 
          ? new mongoose.Types.ObjectId(req.user!.userId) 
          : undefined,
        approvedAt: (userRole === 'SUPER_ADMIN' || userRole === 'OPS') 
          ? new Date() 
          : undefined,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: { document },
    });
  } catch (error: any) {
    console.warn("Document upload error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to upload document",
    });
  }
};

// Get all documents for a registration
export const getDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId } = req.params;

    // Verify registration exists and user has access
    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Authorization check
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    if (userRole === "STUDENT") {
      // Students can only see their own documents
      // Get student record to compare userId
      const student = await Student.findById(registration.studentId);
      if (!student || student.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (userRole === "OPS") {
      // Ops can see documents of assigned students
      let hasAccess = false;
      
      if (registration.primaryOpsId) {
        const primaryOps = await Ops.findById(registration.primaryOpsId);
        if (primaryOps && primaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess && registration.secondaryOpsId) {
        const secondaryOps = await Ops.findById(registration.secondaryOpsId);
        if (secondaryOps && secondaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }
    // Admins can see all documents

    // Get all documents
    const documents = await StudentDocument.find({ registrationId })
      .populate("uploadedBy", "firstName middleName lastName email")
      .populate("approvedBy", "firstName middleName lastName email")
      .populate("rejectedBy", "firstName middleName lastName email")
      .sort({ documentCategory: 1, createdAt: 1 });

    // Group by category
    const primary = documents.filter(doc => doc.documentCategory === "PRIMARY");
    const secondary = documents.filter(doc => doc.documentCategory === "SECONDARY");

    return res.status(200).json({
      success: true,
      data: {
        documents,
        primary,
        secondary,
      },
    });
  } catch (error: any) {
    console.warn("Get documents error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch documents",
    });
  }
};

// Download document
export const downloadDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;

    const document = await StudentDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Verify access
    const registration = await StudentServiceRegistration.findById(document.registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    const userRole = req.user!.role;
    const userId = req.user!.userId;

    if (userRole === "STUDENT") {
      // Get student record to compare userId
      const student = await Student.findById(registration.studentId);
      if (!student || student.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (userRole === "OPS") {
      let hasAccess = false;
      
      if (registration.primaryOpsId) {
        const primaryOps = await Ops.findById(registration.primaryOpsId);
        if (primaryOps && primaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess && registration.secondaryOpsId) {
        const secondaryOps = await Ops.findById(registration.secondaryOpsId);
        if (secondaryOps && secondaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Stream file
    const filePath = path.join(__dirname, "../../", document.filePath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found on server",
      });
    }

    return res.download(filePath, document.fileName);
  } catch (error: any) {
    console.warn("Download document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to download document",
    });
  }
};

// View document (inline - no download)
export const viewDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { documentId } = req.params;

    const document = await StudentDocument.findById(documentId);
    if (!document) {
      res.status(404).json({
        success: false,
        message: "Document not found",
      });
      return;
    }

    // Verify access
    const registration = await StudentServiceRegistration.findById(document.registrationId);
    if (!registration) {
      res.status(404).json({
        success: false,
        message: "Registration not found",
      });
      return;
    }

    const userRole = req.user!.role;
    const userId = req.user!.userId;

    if (userRole === "STUDENT") {
      // Get student record to compare userId
      const student = await Student.findById(registration.studentId);
      if (!student || student.userId.toString() !== userId) {
        res.status(403).json({
          success: false,
          message: "Access denied",
        });
        return;
      }
    } else if (userRole === "OPS") {
      let hasAccess = false;
      
      if (registration.primaryOpsId) {
        const primaryOps = await Ops.findById(registration.primaryOpsId);
        if (primaryOps && primaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess && registration.secondaryOpsId) {
        const secondaryOps = await Ops.findById(registration.secondaryOpsId);
        if (secondaryOps && secondaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: "Access denied",
        });
        return;
      }
    }

    // Stream file for viewing
    const filePath = path.join(__dirname, "../../", document.filePath);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        success: false,
        message: "File not found on server",
      });
      return;
    }

    // Set content type and inline disposition for viewing
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.fileName}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (error): void => {
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
    console.warn("View document error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to view document",
    });
  }
};

// Approve document (OPS/Admin only)
export const approveDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userRole = req.user!.role;

    if (userRole !== "OPS" && userRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only ops and admins can approve documents",
      });
    }

    const document = await StudentDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Verify OPS is assigned (for OPS role)
    if (userRole === "OPS") {
      const registration = await StudentServiceRegistration.findById(document.registrationId);
      if (!registration) {
        return res.status(404).json({
          success: false,
          message: "Registration not found",
        });
      }

      let hasAccess = false;
      
      if (registration.primaryOpsId) {
        const primaryOps = await Ops.findById(registration.primaryOpsId);
        if (primaryOps && primaryOps.userId.toString() === req.user!.userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess && registration.secondaryOpsId) {
        const secondaryOps = await Ops.findById(registration.secondaryOpsId);
        if (secondaryOps && secondaryOps.userId.toString() === req.user!.userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    document.status = DocumentStatus.APPROVED;
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
    console.warn("Approve document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to approve document",
    });
  }
};

// Reject document (OPS/Admin only)
export const rejectDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const { rejectionMessage } = req.body;
    const userRole = req.user!.role;

    if (userRole !== "OPS" && userRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only ops and admins can reject documents",
      });
    }

    if (!rejectionMessage || rejectionMessage.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Rejection message is required",
      });
    }

    const document = await StudentDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Verify OPS is assigned (for OPS role)
    if (userRole === "OPS") {
      const registration = await StudentServiceRegistration.findById(document.registrationId);
      if (!registration) {
        return res.status(404).json({
          success: false,
          message: "Registration not found",
        });
      }

      let hasAccess = false;
      
      if (registration.primaryOpsId) {
        const primaryOps = await Ops.findById(registration.primaryOpsId);
        if (primaryOps && primaryOps.userId.toString() === req.user!.userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess && registration.secondaryOpsId) {
        const secondaryOps = await Ops.findById(registration.secondaryOpsId);
        if (secondaryOps && secondaryOps.userId.toString() === req.user!.userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Delete file from storage
    const filePath = path.join(__dirname, "../../", document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Send email notification to student BEFORE deleting from database
    try {
      const registration = await StudentServiceRegistration.findById(document.registrationId);
      if (registration) {
        const student = await Student.findById(registration.studentId);
        if (student) {
          const user = await User.findById(student.userId);
          if (user && user.email) {
            const rejectedByRole = userRole === 'SUPER_ADMIN' ? 'super_admin' : 'OPS';
            const fullName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
            await sendDocumentRejectionEmail(
              user.email,
              fullName,
              document.documentName,
              rejectionMessage,
              rejectedByRole,
              document.registrationId.toString()
            );
            console.log(`✅ Document rejection email sent to ${user.email}`);
          }
        }
      }
    } catch (emailError) {
      console.warn("⚠️ Failed to send rejection email:", emailError);
      // Don't fail the request if email fails
    }

    // Delete document from database completely
    await StudentDocument.findByIdAndDelete(documentId);

    return res.status(200).json({
      success: true,
      message: "Document rejected and deleted successfully",
    });
  } catch (error: any) {
    console.warn("Reject document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to reject document",
    });
  }
};

// Add custom document field
export const addCustomField = async (req: AuthRequest, res: Response) => {
  try {
    const { registrationId, documentName, category } = req.body;

    if (!registrationId || !documentName || !category) {
      return res.status(400).json({
        success: false,
        message: "registrationId, documentName, and category are required",
      });
    }

    // Verify registration exists
    const registration = await StudentServiceRegistration.findById(registrationId);
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: "Registration not found",
      });
    }

    // Authorization check
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    if (userRole === "STUDENT") {
      // Get student record to compare userId
      const student = await Student.findById(registration.studentId);
      if (!student || student.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    } else if (userRole === "OPS") {
      let hasAccess = false;
      
      if (registration.primaryOpsId) {
        const primaryOps = await Ops.findById(registration.primaryOpsId);
        if (primaryOps && primaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess && registration.secondaryOpsId) {
        const secondaryOps = await Ops.findById(registration.secondaryOpsId);
        if (secondaryOps && secondaryOps.userId.toString() === userId) {
          hasAccess = true;
        }
      }
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: "Access denied",
        });
      }
    }

    // Generate unique document key
    const documentKey = `custom_${Date.now()}_${documentName.toLowerCase().replace(/\s+/g, "_")}`;

    return res.status(201).json({
      success: true,
      message: "Custom field created successfully",
      data: {
        documentKey,
        documentName,
        category,
        isCustomField: true,
      },
    });
  } catch (error: any) {
    console.warn("Add custom field error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add custom field",
    });
  }
};

// Delete document (Admin only or rejected documents by student)
export const deleteDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { documentId } = req.params;
    const userRole = req.user!.role;

    const document = await StudentDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: "Document not found",
      });
    }

    // Only admin can delete documents
    if (userRole !== "SUPER_ADMIN") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete documents",
      });
    }

    // Delete file from storage
    const filePath = path.join(__dirname, "../../", document.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete document record
    await StudentDocument.findByIdAndDelete(documentId);

    return res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error: any) {
    console.warn("Delete document error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to delete document",
    });
  }
};

