/**
 * Generate a 6-digit OTP
 */
export const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash OTP for storage
 */
export const hashOTP = (otp: string): string => {
  return Buffer.from(otp).toString('base64');
};

/**
 * Compare OTP
 */
export const compareOTP = (otp: string, hashedOTP: string): boolean => {
  const hashedInput = Buffer.from(otp).toString('base64');
  return hashedInput === hashedOTP;
};

/**
 * Check if OTP is expired
 */
export const isOTPExpired = (expiresAt: Date): boolean => {
  return new Date() > expiresAt;
};

/**
 * Get OTP expiration time (default: 10 minutes)
 */
export const getOTPExpiration = (minutes: number = 10): Date => {
  const expires = new Date();
  expires.setMinutes(expires.getMinutes() + minutes);
  return expires;
};


