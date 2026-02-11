import express from "express";
import {
  getAllServices,
  getMyServices,
  registerForService,
  getServiceForm,
  getRegistrationDetails,
} from "../controllers/serviceController";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { validateRequest } from "../middleware/validate";

const router = express.Router();

// Public routes
router.get("/services", getAllServices);
router.get("/services/:serviceId/form", getServiceForm);

// Protected routes (require authentication + authorization)
router.get("/my-services", authenticate, authorize(USER_ROLE.STUDENT), getMyServices);
router.post(
  "/register",
  authenticate,
  authorize(USER_ROLE.STUDENT),
  validateRequest(["serviceId"]),
  registerForService
);
router.get(
  "/registrations/:registrationId",
  authenticate,
  authorize([USER_ROLE.STUDENT, USER_ROLE.OPS, USER_ROLE.SUPER_ADMIN]),
  getRegistrationDetails
);

export default router;


