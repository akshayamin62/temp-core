"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = require("../middleware/auth");
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const chatController_1 = require("../controllers/chatController");
const router = express_1.default.Router();
// All routes require authentication
router.use(auth_1.authenticate);
// Get all chats for current user
router.get('/my-chats', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.ADMIN]), chatController_1.getMyChatsList);
// Get or create chat for a program
router.get('/program/:programId/chat', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.ADMIN]), chatController_1.getOrCreateChat);
// Get all messages for a program
router.get('/program/:programId/messages', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.ADMIN]), chatController_1.getChatMessages);
// Send a message
router.post('/program/:programId/messages', (0, authorize_1.authorize)([roles_1.USER_ROLE.STUDENT, roles_1.USER_ROLE.COUNSELOR, roles_1.USER_ROLE.OPS, roles_1.USER_ROLE.SUPER_ADMIN, roles_1.USER_ROLE.ADMIN]), chatController_1.sendMessage);
exports.default = router;
//# sourceMappingURL=chatRoutes.js.map