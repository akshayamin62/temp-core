"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const activity_controller_1 = require("../controllers/activity.controller");
const router = express_1.default.Router();
// Create activity (superadmin only)
router.post('/', activity_controller_1.activityFileUploadMiddleware, activity_controller_1.createActivity);
// Get all activities (can filter by pointerNo)
router.get('/', activity_controller_1.getActivities);
// Get activity by ID
router.get('/:id', activity_controller_1.getActivityById);
// Delete activity (superadmin only)
router.delete('/:id', activity_controller_1.deleteActivity);
exports.default = router;
//# sourceMappingURL=activity.routes.js.map