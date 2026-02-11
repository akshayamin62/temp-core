"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const studentController_1 = require("../controllers/studentController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = express_1.default.Router();
// All routes require authentication + student role
router.get("/profile", auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), studentController_1.getStudentProfile);
router.put("/profile", auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), studentController_1.updateStudentProfile);
router.delete("/profile", auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), studentController_1.deleteStudentProfile);
exports.default = router;
//# sourceMappingURL=studentRoutes.js.map