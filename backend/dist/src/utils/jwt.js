"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateToken = (user) => {
    const secret = process.env.JWT_SECRET;
    // Default to 7 days if not specified (format: "7d", "24h", "1h", etc.)
    const expiresIn = process.env.JWT_EXPIRES_IN || "7d";
    if (!secret) {
        throw new Error("JWT_SECRET not defined in environment variables");
    }
    const payload = {
        id: user._id.toString(),
        email: user.email,
        role: user.role,
    };
    const options = {
        expiresIn,
    };
    return jsonwebtoken_1.default.sign(payload, secret, options);
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET not defined in environment variables");
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        return decoded;
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            throw new Error("Token has expired");
        }
        else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            throw new Error("Invalid token");
        }
        throw new Error("Token verification failed");
    }
};
exports.verifyToken = verifyToken;
//# sourceMappingURL=jwt.js.map