import { Response } from "express";
import { AuthRequest } from "../types/auth";
import StudentTransfer, { TRANSFER_STATUS } from "../models/StudentTransfer";
import Student from "../models/Student";
import Advisor from "../models/Advisor";
import Admin from "../models/Admin";
import StudentPlanDiscount from "../models/StudentPlanDiscount";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import Service from "../models/Service";
import mongoose from "mongoose";

/**
 * ADVISOR: Initiate student transfer to main admin
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

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const student = await Student.findOne({ _id: studentId, advisorId: advisor._id });
    if (!student) {
      return res.status(404).json({ success: false, message: "Student not found or does not belong to your advisor" });
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
      fromAdvisorId: advisor._id,
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
 * ADVISOR: Get transfer history for advisor
 */
export const getAdvisorTransfers = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const userId = req.user?.userId;
    const { status } = req.query;

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const filter: any = { fromAdvisorId: advisor._id };
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
    console.error("Error fetching advisor transfers:", error);
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
        path: "fromAdvisorId",
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
        path: "fromAdvisorId",
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

    // Update student: set adminId to this admin, keep advisorId
    await Student.findByIdAndUpdate(transfer.studentId, {
      adminId: admin._id,
    });

    // Deactivate advisor-set discounts for services the student has NOT registered under advisor
    // Keep discounts for services already taken under the advisor (registeredViaAdvisorId)
    try {
      const advisorDiscounts = await StudentPlanDiscount.find({
        studentId: transfer.studentId,
        advisorId: transfer.fromAdvisorId,
        isActive: true,
      }).lean();

      if (advisorDiscounts.length > 0) {
        // Find services the student actually registered under this advisor
        const advisorRegistrations = await StudentServiceRegistration.find({
          studentId: transfer.studentId,
          registeredViaAdvisorId: transfer.fromAdvisorId,
        }).populate('serviceId', 'slug').lean();

        // Build a Set of service slugs + plan tiers that are advisor-owned registrations
        const advisorOwnedKeys = new Set<string>();
        for (const reg of advisorRegistrations) {
          const svc = reg.serviceId as any;
          if (svc?.slug && reg.planTier) {
            advisorOwnedKeys.add(`${svc.slug}::${reg.planTier}`);
          }
        }

        // Deactivate discounts for services NOT in the advisor-owned set
        const discountIdsToDeactivate = advisorDiscounts
          .filter(d => !advisorOwnedKeys.has(`${d.serviceSlug}::${d.planTier}`))
          .map(d => d._id);

        if (discountIdsToDeactivate.length > 0) {
          await StudentPlanDiscount.updateMany(
            { _id: { $in: discountIdsToDeactivate } },
            { isActive: false }
          );
        }
      }
    } catch (discountError) {
      // Log but don't fail the transfer approval
      console.error('Error cleaning up advisor discounts during transfer:', discountError);
    }

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
 * ADVISOR: Cancel a pending transfer
 */
export const cancelTransfer = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { transferId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const advisor = await Advisor.findOne({ userId });
    if (!advisor) {
      return res.status(404).json({ success: false, message: "Advisor profile not found" });
    }

    const transfer = await StudentTransfer.findById(transferId);
    if (!transfer) {
      return res.status(404).json({ success: false, message: "Transfer request not found" });
    }

    if (transfer.fromAdvisorId.toString() !== advisor._id.toString()) {
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
