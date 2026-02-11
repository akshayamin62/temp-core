import { Response } from "express";
import OpsSchedule, { OPS_SCHEDULE_STATUS } from "../models/OpsSchedule";
import Ops from "../models/Ops";
import Student from "../models/Student";
import StudentServiceRegistration from "../models/StudentServiceRegistration";
import { AuthRequest } from "../types/auth";

// Helper functions for date operations
const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const endOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

const addDays = (date: Date, days: number): Date => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

// Get all schedules for current OPS user
export const getMySchedules = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    
    // Find OPS record for this user
    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: "OPS profile not found",
      });
    }

    const schedules = await OpsSchedule.find({ opsId: ops._id })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "firstName middleName lastName email",
        },
      })
      .sort({ scheduledDate: 1, scheduledTime: 1 });

    res.json({
      success: true,
      data: { schedules },
    });
  } catch (error: any) {
    console.error("Error fetching OPS schedules:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedules",
      error: error.message,
    });
  }
};

// Get schedule summary (today, missed, tomorrow)
export const getScheduleSummary = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    
    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: "OPS profile not found",
      });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const tomorrowStart = startOfDay(addDays(now, 1));
    const tomorrowEnd = endOfDay(addDays(now, 1));

    // Today's schedules (scheduled status only)
    const today = await OpsSchedule.find({
      opsId: ops._id,
      scheduledDate: { $gte: todayStart, $lte: todayEnd },
      status: OPS_SCHEDULE_STATUS.SCHEDULED,
    })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "firstName middleName lastName email",
        },
      })
      .sort({ scheduledTime: 1 });

    // Missed schedules (past scheduled items that weren't completed)
    const missed = await OpsSchedule.find({
      opsId: ops._id,
      scheduledDate: { $lt: todayStart },
      status: OPS_SCHEDULE_STATUS.SCHEDULED,
    })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "firstName middleName lastName email",
        },
      })
      .sort({ scheduledDate: -1, scheduledTime: -1 })
      .limit(10);

    // Tomorrow's schedules
    const tomorrow = await OpsSchedule.find({
      opsId: ops._id,
      scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      status: OPS_SCHEDULE_STATUS.SCHEDULED,
    })
      .populate({
        path: "studentId",
        populate: {
          path: "userId",
          select: "firstName middleName lastName email",
        },
      })
      .sort({ scheduledTime: 1 });

    // Counts
    const counts = {
      today: today.length,
      missed: missed.length,
      tomorrow: tomorrow.length,
      total: await OpsSchedule.countDocuments({
        opsId: ops._id,
        status: OPS_SCHEDULE_STATUS.SCHEDULED,
      }),
    };

    res.json({
      success: true,
      data: {
        today,
        missed,
        tomorrow,
        counts,
      },
    });
  } catch (error: any) {
    console.error("Error fetching schedule summary:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedule summary",
      error: error.message,
    });
  }
};

// Get students assigned to current OPS user
export const getMyStudents = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    
    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: "OPS profile not found",
      });
    }

    // Find all registrations where this OPS is the active ops
    const registrations = await StudentServiceRegistration.find({
      activeOpsId: ops._id,
    }).distinct("studentId");

    // Get student details
    const students = await Student.find({
      _id: { $in: registrations },
    }).populate({
      path: "userId",
      select: "firstName middleName lastName email",
    });

    res.json({
      success: true,
      data: { students },
    });
  } catch (error: any) {
    console.error("Error fetching OPS students:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch students",
      error: error.message,
    });
  }
};

// Create a new schedule
export const createSchedule = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { studentId, scheduledDate, scheduledTime, description } = req.body;
    
    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: "OPS profile not found",
      });
    }

    // Validate student if provided (not "Me" task)
    if (studentId) {
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({
          success: false,
          message: "Student not found",
        });
      }

      // Check if student is assigned to this ops
      const registration = await StudentServiceRegistration.findOne({
        studentId,
        activeOpsId: ops._id,
      });

      if (!registration) {
        return res.status(403).json({
          success: false,
          message: "This student is not assigned to you",
        });
      }
    }

    const schedule = await OpsSchedule.create({
      opsId: ops._id,
      studentId: studentId || null,
      scheduledDate: new Date(scheduledDate),
      scheduledTime,
      description,
      status: OPS_SCHEDULE_STATUS.SCHEDULED,
    });

    const populatedSchedule = await OpsSchedule.findById(schedule._id).populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName middleName lastName email",
      },
    });

    res.status(201).json({
      success: true,
      message: "Schedule created successfully",
      data: { schedule: populatedSchedule },
    });
  } catch (error: any) {
    console.error("Error creating schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create schedule",
      error: error.message,
    });
  }
};

// Update a schedule
export const updateSchedule = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { scheduleId } = req.params;
    const { studentId, scheduledDate, scheduledTime, description, status } = req.body;
    
    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: "OPS profile not found",
      });
    }

    const schedule = await OpsSchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Check ownership
    if (schedule.opsId.toString() !== ops._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only update your own schedules",
      });
    }

    // If changing to a student task (from Me or different student), validate
    if (studentId !== undefined) {
      if (studentId && studentId !== schedule.studentId?.toString()) {
        const registration = await StudentServiceRegistration.findOne({
          studentId,
          activeOpsId: ops._id,
        });

        if (!registration) {
          return res.status(403).json({
            success: false,
            message: "This student is not assigned to you",
          });
        }
      }
    }

    // Build update object
    const updateData: any = {};
    if (studentId !== undefined) updateData.studentId = studentId || null;
    if (scheduledDate) updateData.scheduledDate = new Date(scheduledDate);
    if (scheduledTime) updateData.scheduledTime = scheduledTime;
    if (description) updateData.description = description;
    if (status) {
      updateData.status = status;
      if (status === OPS_SCHEDULE_STATUS.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }

    const updatedSchedule = await OpsSchedule.findByIdAndUpdate(
      scheduleId,
      updateData,
      { new: true }
    ).populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName middleName lastName email",
      },
    });

    res.json({
      success: true,
      message: "Schedule updated successfully",
      data: { schedule: updatedSchedule },
    });
  } catch (error: any) {
    console.error("Error updating schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update schedule",
      error: error.message,
    });
  }
};

// Delete a schedule
export const deleteSchedule = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { scheduleId } = req.params;
    
    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: "OPS profile not found",
      });
    }

    const schedule = await OpsSchedule.findById(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Check ownership
    if (schedule.opsId.toString() !== ops._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own schedules",
      });
    }

    await OpsSchedule.findByIdAndDelete(scheduleId);

    res.json({
      success: true,
      message: "Schedule deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete schedule",
      error: error.message,
    });
  }
};

// Get single schedule by ID
export const getScheduleById = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user?.userId;
    const { scheduleId } = req.params;
    
    const ops = await Ops.findOne({ userId });
    if (!ops) {
      return res.status(404).json({
        success: false,
        message: "OPS profile not found",
      });
    }

    const schedule = await OpsSchedule.findById(scheduleId).populate({
      path: "studentId",
      populate: {
        path: "userId",
        select: "firstName middleName lastName email",
      },
    });

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: "Schedule not found",
      });
    }

    // Check ownership
    if (schedule.opsId.toString() !== ops._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own schedules",
      });
    }

    res.json({
      success: true,
      data: { schedule },
    });
  } catch (error: any) {
    console.error("Error fetching schedule:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch schedule",
      error: error.message,
    });
  }
};

// Mark schedule as missed (can be run as a cron job)
export const markMissedSchedules = async () => {
  try {
    const now = new Date();
    const todayStart = startOfDay(now);

    // Find all scheduled items that are in the past
    const result = await OpsSchedule.updateMany(
      {
        scheduledDate: { $lt: todayStart },
        status: OPS_SCHEDULE_STATUS.SCHEDULED,
      },
      {
        status: OPS_SCHEDULE_STATUS.MISSED,
      }
    );

    console.log(`Marked ${result.modifiedCount} schedules as missed`);
    return result;
  } catch (error) {
    console.error("Error marking missed schedules:", error);
    throw error;
  }
};
