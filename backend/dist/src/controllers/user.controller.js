"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = void 0;
const user_service_1 = require("../services/user.service");
const getUsers = async (req, res) => {
    try {
        const { role } = req.query;
        if (!role || (role !== 'STUDENT' && role !== 'IVY_EXPERT')) {
            res.status(400).json({
                success: false,
                message: 'Valid role parameter (STUDENT or IVY_EXPERT) is required',
            });
            return;
        }
        const users = await (0, user_service_1.getUsersByRole)(role);
        res.status(200).json({
            success: true,
            data: users,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to fetch users',
        });
    }
};
exports.getUsers = getUsers;
//# sourceMappingURL=user.controller.js.map