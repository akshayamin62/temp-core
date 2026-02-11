"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const serviceController_1 = require("../controllers/serviceController");
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const validate_1 = require("../middleware/validate");
const router = express_1.default.Router();
// Public routes
router.get("/services", serviceController_1.getAllServices);
router.get("/services/:serviceId/form", serviceController_1.getServiceForm);
// Protected routes (require authentication + authorization)
router.get("/my-services", auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), serviceController_1.getMyServices);
router.post("/register", auth_1.authenticate, (0, authorize_1.authorize)(roles_1.USER_ROLE.STUDENT), (0, validate_1.validateRequest)(["serviceId"]), serviceController_1.registerForService);
router.get("/registrations/:registrationId", auth_1.authenticate, (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN]), serviceController_1.getRegistrationDetails);
exports.default = router;
//# sourceMappingURL=serviceRoutes.js.map