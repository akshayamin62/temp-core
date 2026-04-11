import { Router } from 'express';
import {
  createOrder,
  verifyPayment,
  requestInstallment,
  createMiscCollection,
  getPaymentsByRegistration,
  getPaymentsByStudent,
  getPaymentHistory,
  initializePayment,
  setPrice,
  createRegistrationOrder,
  verifyRegistrationPayment,
  createUpgradeOrder,
  verifyUpgradePayment,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// Initialize payment model for a registration (staff)
router.post(
  '/initialize',
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISORY,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
  ]),
  initializePayment
);

// Set price for a registration (admin only)
router.post(
  '/set-price',
  authenticate,
  authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.ADVISORY]),
  setPrice
);

// Create a Razorpay order (staff or student)
router.post(
  '/create-order',
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISORY,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.STUDENT,
  ]),
  createOrder
);

// Verify payment after Razorpay callback
router.post(
  '/verify',
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISORY,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.STUDENT,
  ]),
  verifyPayment
);

// Pay-first registration: create order without existing registration (student only)
router.post(
  '/create-registration-order',
  authenticate,
  authorize([USER_ROLE.STUDENT]),
  createRegistrationOrder
);

// Pay-first registration: verify payment and create registration
router.post(
  '/verify-registration',
  authenticate,
  authorize([USER_ROLE.STUDENT]),
  verifyRegistrationPayment
);

// Pay-first upgrade: create Razorpay order for the upgrade difference (student only)
router.post(
  '/create-upgrade-order',
  authenticate,
  authorize([USER_ROLE.STUDENT]),
  createUpgradeOrder
);

// Pay-first upgrade: verify payment and upgrade plan
router.post(
  '/verify-upgrade',
  authenticate,
  authorize([USER_ROLE.STUDENT]),
  verifyUpgradePayment
);

// Request next installment (staff triggers)
router.post(
  '/request-installment',
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISORY,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
  ]),
  requestInstallment
);

// Create miscellaneous collection (super admin, admin, advisory, ops)
router.post(
  '/misc-collection',
  authenticate,
  authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.ADVISORY, USER_ROLE.OPS]),
  createMiscCollection
);

// Get payments by registration (ownership verified in controller)
router.get(
  '/registration/:registrationId',
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISORY,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.STUDENT,
    USER_ROLE.PARENT,
    USER_ROLE.REFERRER,
    USER_ROLE.EDUPLAN_COACH,
  ]),
  getPaymentsByRegistration
);

// Get payments by student (ownership verified in controller)
router.get(
  '/student/:studentId',
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISORY,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.STUDENT,
    USER_ROLE.PARENT,
    USER_ROLE.REFERRER,
    USER_ROLE.EDUPLAN_COACH,
  ]),
  getPaymentsByStudent
);

// Get full payment history for a student (ownership verified in controller)
router.get(
  '/history/:studentId',
  authenticate,
  authorize([
    USER_ROLE.SUPER_ADMIN,
    USER_ROLE.ADMIN,
    USER_ROLE.ADVISORY,
    USER_ROLE.COUNSELOR,
    USER_ROLE.OPS,
    USER_ROLE.STUDENT,
    USER_ROLE.PARENT,
    USER_ROLE.REFERRER,
    USER_ROLE.EDUPLAN_COACH,
  ]),
  getPaymentHistory
);

export default router;
