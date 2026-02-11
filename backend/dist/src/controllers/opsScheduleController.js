"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markMissedSchedules = exports.getScheduleById = exports.deleteSchedule = exports.updateSchedule = exports.createSchedule = exports.getMyStudents = exports.getScheduleSummary = exports.getMySchedules = void 0;
const OpsSchedule_1 = __importStar(require("../models/OpsSchedule"));
const Ops_1 = __importDefault(require("../models/Ops"));
const Student_1 = __importDefault(require("../models/Student"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
// Helper functions for date operations
const startOfDay = (date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};
const endOfDay = (date) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};
const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
};
// Get all schedules for current OPS user
const getMySchedules = async (req, res) => {
    try {
        const userId = req.user?.userId;
        // Find OPS record for this user
        const ops = await Ops_1.default.findOne({ userId });
        if (!ops) {
            return res.status(404).json({
                success: false,
                message: "OPS profile not found",
            });
        }
        const schedules = await OpsSchedule_1.default.find({ opsId: ops._id })
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
    }
    catch (error) {
        console.error("Error fetching OPS schedules:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch schedules",
            error: error.message,
        });
    }
};
exports.getMySchedules = getMySchedules;
// Get schedule summary (today, missed, tomorrow)
const getScheduleSummary = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const ops = await Ops_1.default.findOne({ userId });
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
        const today = await OpsSchedule_1.default.find({
            opsId: ops._id,
            scheduledDate: { $gte: todayStart, $lte: todayEnd },
            status: OpsSchedule_1.OPS_SCHEDULE_STATUS.SCHEDULED,
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
        const missed = await OpsSchedule_1.default.find({
            opsId: ops._id,
            scheduledDate: { $lt: todayStart },
            status: OpsSchedule_1.OPS_SCHEDULE_STATUS.SCHEDULED,
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
        const tomorrow = await OpsSchedule_1.default.find({
            opsId: ops._id,
            scheduledDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
            status: OpsSchedule_1.OPS_SCHEDULE_STATUS.SCHEDULED,
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
            total: await OpsSchedule_1.default.countDocuments({
                opsId: ops._id,
                status: OpsSchedule_1.OPS_SCHEDULE_STATUS.SCHEDULED,
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
    }
    catch (error) {
        console.error("Error fetching schedule summary:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch schedule summary",
            error: error.message,
        });
    }
};
exports.getScheduleSummary = getScheduleSummary;
// Get students assigned to current OPS user
const getMyStudents = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const ops = await Ops_1.default.findOne({ userId });
        if (!ops) {
            return res.status(404).json({
                success: false,
                message: "OPS profile not found",
            });
        }
        // Find all registrations where this OPS is the active ops
        const registrations = await StudentServiceRegistration_1.default.find({
            activeOpsId: ops._id,
        }).distinct("studentId");
        // Get student details
        const students = await Student_1.default.find({
            _id: { $in: registrations },
        }).populate({
            path: "userId",
            select: "firstName middleName lastName email",
        });
        res.json({
            success: true,
            data: { students },
        });
    }
    catch (error) {
        console.error("Error fetching OPS students:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch students",
            error: error.message,
        });
    }
};
exports.getMyStudents = getMyStudents;
// Create a new schedule
const createSchedule = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { studentId, scheduledDate, scheduledTime, description } = req.body;
        const ops = await Ops_1.default.findOne({ userId });
        if (!ops) {
            return res.status(404).json({
                success: false,
                message: "OPS profile not found",
            });
        }
        // Validate student if provided (not "Me" task)
        if (studentId) {
            const student = await Student_1.default.findById(studentId);
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: "Student not found",
                });
            }
            // Check if student is assigned to this ops
            const registration = await StudentServiceRegistration_1.default.findOne({
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
        const schedule = await OpsSchedule_1.default.create({
            opsId: ops._id,
            studentId: studentId || null,
            scheduledDate: new Date(scheduledDate),
            scheduledTime,
            description,
            status: OpsSchedule_1.OPS_SCHEDULE_STATUS.SCHEDULED,
        });
        const populatedSchedule = await OpsSchedule_1.default.findById(schedule._id).populate({
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
    }
    catch (error) {
        console.error("Error creating schedule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to create schedule",
            error: error.message,
        });
    }
};
exports.createSchedule = createSchedule;
// Update a schedule
const updateSchedule = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { scheduleId } = req.params;
        const { studentId, scheduledDate, scheduledTime, description, status } = req.body;
        const ops = await Ops_1.default.findOne({ userId });
        if (!ops) {
            return res.status(404).json({
                success: false,
                message: "OPS profile not found",
            });
        }
        const schedule = await OpsSchedule_1.default.findById(scheduleId);
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
                const registration = await StudentServiceRegistration_1.default.findOne({
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
        const updateData = {};
        if (studentId !== undefined)
            updateData.studentId = studentId || null;
        if (scheduledDate)
            updateData.scheduledDate = new Date(scheduledDate);
        if (scheduledTime)
            updateData.scheduledTime = scheduledTime;
        if (description)
            updateData.description = description;
        if (status) {
            updateData.status = status;
            if (status === OpsSchedule_1.OPS_SCHEDULE_STATUS.COMPLETED) {
                updateData.completedAt = new Date();
            }
        }
        const updatedSchedule = await OpsSchedule_1.default.findByIdAndUpdate(scheduleId, updateData, { new: true }).populate({
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
    }
    catch (error) {
        console.error("Error updating schedule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update schedule",
            error: error.message,
        });
    }
};
exports.updateSchedule = updateSchedule;
// Delete a schedule
const deleteSchedule = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { scheduleId } = req.params;
        const ops = await Ops_1.default.findOne({ userId });
        if (!ops) {
            return res.status(404).json({
                success: false,
                message: "OPS profile not found",
            });
        }
        const schedule = await OpsSchedule_1.default.findById(scheduleId);
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
        await OpsSchedule_1.default.findByIdAndDelete(scheduleId);
        res.json({
            success: true,
            message: "Schedule deleted successfully",
        });
    }
    catch (error) {
        console.error("Error deleting schedule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete schedule",
            error: error.message,
        });
    }
};
exports.deleteSchedule = deleteSchedule;
// Get single schedule by ID
const getScheduleById = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const { scheduleId } = req.params;
        const ops = await Ops_1.default.findOne({ userId });
        if (!ops) {
            return res.status(404).json({
                success: false,
                message: "OPS profile not found",
            });
        }
        const schedule = await OpsSchedule_1.default.findById(scheduleId).populate({
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
    }
    catch (error) {
        console.error("Error fetching schedule:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch schedule",
            error: error.message,
        });
    }
};
exports.getScheduleById = getScheduleById;
// Mark schedule as missed (can be run as a cron job)
const markMissedSchedules = async () => {
    try {
        const now = new Date();
        const todayStart = startOfDay(now);
        // Find all scheduled items that are in the past
        const result = await OpsSchedule_1.default.updateMany({
            scheduledDate: { $lt: todayStart },
            status: OpsSchedule_1.OPS_SCHEDULE_STATUS.SCHEDULED,
        }, {
            status: OpsSchedule_1.OPS_SCHEDULE_STATUS.MISSED,
        });
        console.log(`Marked ${result.modifiedCount} schedules as missed`);
        return result;
    }
    catch (error) {
        console.error("Error marking missed schedules:", error);
        throw error;
    }
};
exports.markMissedSchedules = markMissedSchedules;
//# sourceMappingURL=opsScheduleController.js.map