"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = void 0;
// Bridge file — re-exports main User model for ivy service compatibility
var User_1 = require("../User");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return __importDefault(User_1).default; } });
//# sourceMappingURL=User.js.map