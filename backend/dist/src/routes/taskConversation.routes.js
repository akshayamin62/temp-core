"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const taskConversation_controller_1 = require("../controllers/taskConversation.controller");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = express_1.default.Router();
router.get('/conversation', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), taskConversation_controller_1.getTaskConversation);
router.post('/conversation/message', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), taskConversation_controller_1.messageFileUploadMiddleware, taskConversation_controller_1.addTaskMessage);
exports.default = router;
//# sourceMappingURL=taskConversation.routes.js.map