import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import {
  getMySchedules,
  getScheduleSummary,
  getMyStudents,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  getScheduleById,
} from "../controllers/opsScheduleController";

const router = express.Router();

// All routes require OPS role
router.use(authenticate, authorize(USER_ROLE.OPS));

// Get all schedules for current OPS
router.get("/", getMySchedules);

// Get schedule summary (today, missed, tomorrow)
router.get("/summary", getScheduleSummary);

// Get students assigned to current OPS
router.get("/students", getMyStudents);

// Get single schedule by ID
router.get("/:scheduleId", getScheduleById);

// Create new schedule
router.post("/", createSchedule);

// Update schedule
router.put("/:scheduleId", updateSchedule);

// Delete schedule
router.delete("/:scheduleId", deleteSchedule);

export default router;
