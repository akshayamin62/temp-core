"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authController_1 = require("../controllers/authController");
const validate_1 = require("../middleware/validate");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public routes
router.post("/signup", validate_1.validateSignup, authController_1.signup);
router.post("/verify-signup-otp", authController_1.verifySignupOTP); // Verify OTP during signup
router.post("/login", authController_1.login); // Request OTP for login
router.post("/verify-otp", authController_1.verifyOTP); // Verify OTP and login
// Protected routes (require authentication)
router.get("/profile", auth_1.authenticate, authController_1.getProfile);
exports.default = router;
//# sourceMappingURL=authRoutes.js.map