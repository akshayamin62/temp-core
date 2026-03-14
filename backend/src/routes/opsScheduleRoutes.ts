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
  getMyOpsTasksAsStudent,
  getStudentOpsTasksById,
} from "../controllers/opsScheduleController";

const router = express.Router();

// Student route: get OPS tasks assigned to current student (requires STUDENT role)
router.get("/my-tasks", authenticate, authorize(USER_ROLE.STUDENT), getMyOpsTasksAsStudent);

// Get OPS tasks for a specific student (for admin/counselor/super-admin/ops viewing student dashboard)
router.get("/student/:studentId", authenticate, authorize([USER_ROLE.ADMIN, USER_ROLE.COUNSELOR, USER_ROLE.SUPER_ADMIN, USER_ROLE.OPS, USER_ROLE.EDUPLAN_COACH, USER_ROLE.IVY_EXPERT, USER_ROLE.PARENT]), getStudentOpsTasksById);

// All remaining routes require OPS role
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
