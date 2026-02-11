import { Router } from "express";
import {
  signup,
  login,
  verifyOTP,
  verifySignupOTP,
  getProfile,
} from "../controllers/authController";
import {
  validateSignup,
} from "../middleware/validate";
import { authenticate } from "../middleware/auth";

const router = Router();

// Public routes
router.post("/signup", validateSignup, signup);
router.post("/verify-signup-otp", verifySignupOTP); // Verify OTP during signup
router.post("/login", login); // Request OTP for login
router.post("/verify-otp", verifyOTP); // Verify OTP and login

// Protected routes (require authentication)
router.get("/profile", authenticate, getProfile);

export default router;

