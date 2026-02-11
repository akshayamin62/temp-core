"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController = __importStar(require("../controllers/notification.controller"));
const authorize_1 = require("../middleware/authorize");
const roles_1 = require("../types/roles");
const router = (0, express_1.Router)();
// Get unread notification counts
router.get('/unread-counts', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), notificationController.getUnreadCounts);
// Get notifications by pointer
router.get('/by-pointer', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), notificationController.getNotificationsByPointer);
// Mark pointer notifications as read
router.post('/mark-read', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), notificationController.markPointerAsRead);
// Get task-level unread count
router.get('/task-count', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), notificationController.getTaskUnreadCount);
// Get bulk task-level unread counts (optimized for multiple tasks)
router.post('/task-counts-bulk', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), notificationController.getBulkTaskUnreadCounts);
// Mark task-level notifications as read
router.post('/task-mark-read', (0, authorize_1.authorize)([roles_1.USER_ROLE.IVY_EXPERT, roles_1.USER_ROLE.STUDENT]), notificationController.markTaskAsRead);
exports.default = router;
//# sourceMappingURL=notification.routes.js.map