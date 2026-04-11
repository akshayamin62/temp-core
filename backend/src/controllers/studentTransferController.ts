import { Response } from "express";
import { AuthRequest } from "../types/auth";
import StudentTransfer, { TRANSFER_STATUS } from "../models/StudentTransfer";
import Student from "../models/Student";
import Advisory from "../models/Advisory";
import Admin from "../models/Admin";
import mongoose from "mongoose";

/**
 * ADVISORY: Initiate student transfer to main admin
 */
export const initiateTransfer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;
    const { interestedServices } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!interestedServices || !Array.isArray(interestedServices) || interestedServices.length === 0) {
      return res.status(400).json({ success: false, message: "At least one interested service is required" });
    }

    const advisory = await Advisory.findOne({ userId });
    if (!advisory) {
      return res.status(404).json({ success: false, message: "Advisory profile not found" });
    }

    const student = await Student.findOne({ _id: studentId, advisoryId: advisory._id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found or does not belong to your advisory" });
    }

    // Check if student already has a pending transfer
    const existingTransfer = await StudentTransfer.findOne({
      studentId: student._id,
      status: TRANSFER_STATUS.PENDING,
    });
    if (existingTransfer) {
      return res.status(400).json({ success: false, message: "A transfer request is already pending for this student" });
    }

    // Check if student is already transferred (has adminId)
    if (student.adminId) {
      return res.status(400).json({ success: false, message: "Student has already been transferred to an admin" });
    }

    // Get main admin from env
    const mainAdminUserId = process.env.MAIN_ADMIN_USER_ID;
    if (!mainAdminUserId) {
      return res.status(500).json({ success: false, message: "Main admin not configured" });
    }

    const mainAdmin = await Admin.findOne({ userId: mainAdminUserId });
    if (!mainAdmin) {
      return res.status(500).json({ success: false, message: "Main admin not found" });
    }

    const transfer = new StudentTransfer({
      studentId: student._id,
      fromAdvisoryId: advisory._id,
      toAdminId: mainAdmin._id,
      interestedServices,
      status: TRANSFER_STATUS.PENDING,
      requestedBy: new mongoose.Types.ObjectId(userId),
    });

    await transfer.save();

    return res.status(201).json({
      success: true,
      message: "Transfer request submitted. Waiting for admin approval.",
      data: { transfer },
    });
  } catch (error: any) {
    console.error("Error initiating transfer:", error);
    return res.status(500).json({ success: false, message: "Failed to initiate transfer" });
  }
};

/**
 * ADVISORY: Get transfer history for advisory
 */
export const getAdvisoryTransfers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { status } = req.query;

    const advisory = await Advisory.findOne({ userId });
    if (!advisory) {
      return res.status(404).json({ success: false, message: "Advisory profile not found" });
    }

    const filter: any = { fromAdvisoryId: advisory._id };
    if (status) filter.status = status;

    const transfers = await StudentTransfer.find(filter)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "toAdminId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: { transfers } });
  } catch (error: any) {
    console.error("Error fetching advisory transfers:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch transfers" });
  }
};

// ============= ADMIN: TRANSFER MANAGEMENT =============

/**
 * ADMIN: Get pending incoming transfers
 */
export const getPendingTransfers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;

    const admin = await Admin.findOne({ userId });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin profile not found" });
    }

    const transfers = await StudentTransfer.find({
      toAdminId: admin._id,
      status: TRANSFER_STATUS.PENDING,
    })
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "fromAdvisoryId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: { transfers } });
  } catch (error: any) {
    console.error("Error fetching pending transfers:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch pending transfers" });
  }
};

/**
 * ADMIN: Get all transfers (all statuses)
 */
export const getAdminTransfers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { status } = req.query;

    const admin = await Admin.findOne({ userId });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin profile not found" });
    }

    const filter: any = { toAdminId: admin._id };
    if (status) filter.status = status;

    const transfers = await StudentTransfer.find(filter)
      .populate({
        path: "studentId",
        populate: { path: "userId", select: "firstName middleName lastName email" },
      })
      .populate({
        path: "fromAdvisoryId",
        populate: { path: "userId", select: "firstName middleName lastName" },
      })
      .sort({ createdAt: -1 });

    return res.json({ success: true, data: { transfers } });
  } catch (error: any) {
    console.error("Error fetching admin transfers:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch transfers" });
  }
};

/**
 * ADMIN: Approve transfer
 */
export const approveTransfer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { transferId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await Admin.findOne({ userId });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin profile not found" });
    }

    const transfer = await StudentTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer request not found" });
    }

    if (transfer.toAdminId.toString() !== admin._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only approve transfers to your organization" });
    }

    if (transfer.status !== TRANSFER_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: `Transfer request is already ${transfer.status.toLowerCase()}` });
    }

    // Update student: set adminId to this admin, keep advisoryId
    await Student.findByIdAndUpdate(transfer.studentId, {
      adminId: admin._id,
    });

    // Update transfer
    transfer.status = TRANSFER_STATUS.APPROVED;
    transfer.approvedBy = new mongoose.Types.ObjectId(userId);
    transfer.approvedAt = new Date();
    await transfer.save();

    return res.status(200).json({
      success: true,
      message: "Transfer approved. Student is now under your organization.",
      data: { transfer },
    });
  } catch (error: any) {
    console.error("Error approving transfer:", error);
    return res.status(500).json({ success: false, message: "Failed to approve transfer" });
  }
};

/**
 * ADMIN: Reject transfer
 */
export const rejectTransfer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { transferId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const admin = await Admin.findOne({ userId });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin profile not found" });
    }

    const transfer = await StudentTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer request not found" });
    }

    if (transfer.toAdminId.toString() !== admin._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only reject transfers to your organization" });
    }

    if (transfer.status !== TRANSFER_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: `Transfer request is already ${transfer.status.toLowerCase()}` });
    }

    transfer.status = TRANSFER_STATUS.REJECTED;
    transfer.rejectedBy = new mongoose.Types.ObjectId(userId);
    transfer.rejectedAt = new Date();
    transfer.rejectionReason = reason || "No reason provided";
    await transfer.save();

    return res.status(200).json({
      success: true,
      message: "Transfer request rejected",
      data: { transfer },
    });
  } catch (error: any) {
    console.error("Error rejecting transfer:", error);
    return res.status(500).json({ success: false, message: "Failed to reject transfer" });
  }
};

/**
 * ADVISORY: Cancel a pending transfer
 */
export const cancelTransfer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { transferId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const advisory = await Advisory.findOne({ userId });
    if (!advisory) {
      return res.status(404).json({ success: false, message: "Advisory profile not found" });
    }

    const transfer = await StudentTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer request not found" });
    }

    if (transfer.fromAdvisoryId.toString() !== advisory._id.toString()) {
      return res.status(403).json({ success: false, message: "You can only cancel your own transfer requests" });
    }

    if (transfer.status !== TRANSFER_STATUS.PENDING) {
      return res.status(400).json({ success: false, message: `Cannot cancel a transfer that is already ${transfer.status.toLowerCase()}` });
    }

    transfer.status = TRANSFER_STATUS.CANCELLED;
    await transfer.save();

    return res.status(200).json({
      success: true,
      message: "Transfer request cancelled",
      data: { transfer },
    });
  } catch (error: any) {
    console.error("Error cancelling transfer:", error);
    return res.status(500).json({ success: false, message: "Failed to cancel transfer" });
  }
};
