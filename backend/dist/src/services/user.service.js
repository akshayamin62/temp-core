"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsersByRole = void 0;
const User_1 = __importDefault(require("../models/ivy/User"));
const getUsersByRole = async (role) => {
    const users = await User_1.default.find({ role }).select('_id firstName middleName lastName email role');
    return users;
};
exports.getUsersByRole = getUsersByRole;
//# sourceMappingURL=user.service.js.map