"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const followUpController_1 = require("../controllers/followUpController");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Counselor and Admin routes
router.post("/", (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN]), followUpController_1.createFollowUp);
router.get("/", (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR]), followUpController_1.getCounselorFollowUps);
router.get("/summary", (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR]), followUpController_1.getFollowUpSummary);
router.get("/check-availability", (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN]), followUpController_1.checkTimeSlotAvailability);
router.get("/lead/:leadId/history", (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.SUPER_ADMIN]), followUpController_1.getLeadFollowUpHistory);
router.get("/:followUpId", (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN, roles_1.USER_ROLE.SUPER_ADMIN]), followUpController_1.getFollowUpById);
router.patch("/:followUpId", (0, authorize_1.authorize)([roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.ADMIN]), followUpController_1.updateFollowUp);
exports.default = router;
//# sourceMappingURL=followUpRoutes.js.map