import express from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { USER_ROLE } from "../types/roles";
import { upload } from "../middleware/upload";
import {
  requestInProcessConversion,
  approveInProcessConversion,
  requestAdminAdvisorConversion,
  approveAdminAdvisorConversion,
  rejectB2BConversion,
  getPendingB2BConversions,
  getB2BConversionHistory,
  getAllB2BConversions,
} from "../controllers/b2bConversionController";

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// ============= STEP 1: B2B Sales → In Process =============

// B2B Sales: Request In Process conversion
router.post(
  "/request-in-process/:b2bLeadId",
  authorize(USER_ROLE.B2B_SALES),
  requestInProcessConversion
);

// Super Admin: Approve In Process conversion
router.post(
  "/approve-in-process/:conversionId",
  authorize(USER_ROLE.SUPER_ADMIN),
  approveInProcessConversion
);

// ============= STEP 2: B2B OPS → Admin/Advisor =============

// B2B OPS: Request Admin/Advisor conversion (with doc uploads)
router.post(
  "/request-admin-advisor/:b2bLeadId",
  authorize(USER_ROLE.B2B_OPS),
  upload.fields([
    { name: "aadharDoc", maxCount: 1 },
    { name: "panDoc", maxCount: 1 },
  ]),
  requestAdminAdvisorConversion
);

// Super Admin: Approve Admin/Advisor conversion
router.post(
  "/approve-admin-advisor/:conversionId",
  authorize(USER_ROLE.SUPER_ADMIN),
  approveAdminAdvisorConversion
);

// ============= SHARED =============

// Super Admin: Reject any conversion
router.post(
  "/reject/:conversionId",
  authorize(USER_ROLE.SUPER_ADMIN),
  rejectB2BConversion
);

// Super Admin: Get pending conversions
router.get(
  "/pending",
  authorize(USER_ROLE.SUPER_ADMIN),
  getPendingB2BConversions
);

// Super Admin: Get all conversions
router.get(
  "/all",
  authorize(USER_ROLE.SUPER_ADMIN),
  getAllB2BConversions
);

// History for a specific B2B lead
router.get(
  "/history/:b2bLeadId",
  authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.B2B_SALES, USER_ROLE.B2B_OPS]),
  getB2BConversionHistory
);

export default router;
