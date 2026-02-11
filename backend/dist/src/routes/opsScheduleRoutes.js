"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const opsScheduleController_1 = require("../controllers/opsScheduleController");
const router = express_1.default.Router();
// All routes require OPS role
router.use(auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.OPS));
// Get all schedules for current OPS
router.get("/", opsScheduleController_1.getMySchedules);
// Get schedule summary (today, missed, tomorrow)
router.get("/summary", opsScheduleController_1.getScheduleSummary);
// Get students assigned to current OPS
router.get("/students", opsScheduleController_1.getMyStudents);
// Get single schedule by ID
router.get("/:scheduleId", opsScheduleController_1.getScheduleById);
// Create new schedule
router.post("/", opsScheduleController_1.createSchedule);
// Update schedule
router.put("/:scheduleId", opsScheduleController_1.updateSchedule);
// Delete schedule
router.delete("/:scheduleId", opsScheduleController_1.deleteSchedule);
exports.default = router;
//# sourceMappingURL=opsScheduleRoutes.js.map