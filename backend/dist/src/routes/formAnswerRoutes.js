"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const formAnswerController_1 = require("../controllers/formAnswerController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const validate_1 = require("../middleware/validate");
const router = express_1.default.Router();
// All routes require authentication + student role
router.post("/save", auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), (0, validate_1.validateRequest)(["registrationId", "partKey", "answers"]), formAnswerController_1.saveFormAnswers);
router.get("/registrations/:registrationId/answers", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN]), formAnswerController_1.getFormAnswers);
router.get("/registrations/:registrationId/progress", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN]), formAnswerController_1.getProgress);
router.delete("/answers/:answerId", auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), formAnswerController_1.deleteFormAnswers);
exports.default = router;
//# sourceMappingURL=formAnswerRoutes.js.map