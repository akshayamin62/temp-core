/**
 * Generate a 4-digit OTP
 */
export declare const generateOTP: () => string;
/**
 * Hash OTP for storage (simple hash for 4-digit OTP)
 */
export declare const hashOTP: (otp: string) => string;
/**
 * Compare OTP
 */
export declare const compareOTP: (otp: string, hashedOTP: string) => boolean;
/**
 * Check if OTP is expired
 */
export declare const isOTPExpired: (expiresAt: Date) => boolean;
/**
 * Get OTP expiration time (default: 10 minutes)
 */
export declare const getOTPExpiration: (minutes?: number) => Date;
//# sourceMappingURL=otp.d.ts.map