"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOTPExpiration = exports.isOTPExpired = exports.compareOTP = exports.hashOTP = exports.generateOTP = void 0;
/**
 * Generate a 4-digit OTP
 */
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};
exports.generateOTP = generateOTP;
/**
 * Hash OTP for storage (simple hash for 4-digit OTP)
 */
const hashOTP = (otp) => {
    // Simple hash for OTP (you can use bcrypt if needed, but for 4-digit OTP this is sufficient)
    // For better security, you might want to use bcrypt with lower rounds
    return Buffer.from(otp).toString('base64');
};
exports.hashOTP = hashOTP;
/**
 * Compare OTP
 */
const compareOTP = (otp, hashedOTP) => {
    const hashedInput = Buffer.from(otp).toString('base64');
    return hashedInput === hashedOTP;
};
exports.compareOTP = compareOTP;
/**
 * Check if OTP is expired
 */
const isOTPExpired = (expiresAt) => {
    return new Date() > expiresAt;
};
exports.isOTPExpired = isOTPExpired;
/**
 * Get OTP expiration time (default: 10 minutes)
 */
const getOTPExpiration = (minutes = 10) => {
    const expires = new Date();
    expires.setMinutes(expires.getMinutes() + minutes);
    return expires;
};
exports.getOTPExpiration = getOTPExpiration;
//# sourceMappingURL=otp.js.map