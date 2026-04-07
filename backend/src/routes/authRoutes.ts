import { Router } from "express";
import {
  signup,
  login,
  verifyOTP,
  verifySignupOTP,
  getProfile,
  updateSPProfile,
  uploadProfilePic,
  removeProfilePic,
} from "../controllers/authController";
import {
  validateSignup,
} from "../middleware/validate";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { uploadProfilePicture } from "../middleware/upload";
import { generateCaptchaChallenge } from "../utils/captcha";

const router = Router();

// Captcha endpoint — returns a math question + token
router.get("/captcha", (_req, res) => {
  const { token, question } = generateCaptchaChallenge();
  res.json({ success: true, data: { token, question } });
});

// Public routes
router.post("/signup", validateSignup, signup);
router.post("/verify-signup-otp", verifySignupOTP); // Verify OTP during signup
router.post("/login", login); // Request OTP for login
router.post("/verify-otp", verifyOTP); // Verify OTP and login

// Protected routes (require authentication)
router.get("/profile", authenticate, getProfile);
router.put("/sp-profile", authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), updateSPProfile);
router.post("/profile-picture", authenticate, uploadProfilePicture.single('profilePicture'), uploadProfilePic);
router.delete("/profile-picture", authenticate, removeProfilePic);

export default router;

