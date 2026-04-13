import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';
import {
  createSPService,
  getMySPServices,
  updateSPService,
  deleteSPService,
  uploadSPServiceThumbnail,
  getMySPEnquiries,
  updateSPEnquiryStatus,
  getAllSPServicesForStudents,
  createSPEnquiry,
  getStudentMyEnquiries,
  getStudentEnquiriesById,
  getSPServicesById,
  getSPEnquiriesById,
  getAllSPServicesForSuperAdmin,
} from '../controllers/spServiceController';
import { upload, handleMulterError } from '../middleware/upload';

const router = Router();

// SP-facing routes (Service Provider manages their services)
router.post('/my-services', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), createSPService);
router.get('/my-services', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), getMySPServices);
router.put('/my-services/:serviceId', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), updateSPService);
router.delete('/my-services/:serviceId', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), deleteSPService);
router.post('/my-services/:serviceId/thumbnail', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), upload.single('thumbnail'), handleMulterError, uploadSPServiceThumbnail);

// SP enquiry routes (SP views/manages enquiries)
router.get('/my-enquiries', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), getMySPEnquiries);
router.patch('/my-enquiries/:enquiryId/status', authenticate, authorize(USER_ROLE.SERVICE_PROVIDER), updateSPEnquiryStatus);

// Student-facing routes
router.get('/browse', authenticate, authorize(USER_ROLE.STUDENT), getAllSPServicesForStudents);
router.post('/enquiry', authenticate, authorize(USER_ROLE.STUDENT), createSPEnquiry);
router.get('/student-enquiries', authenticate, authorize(USER_ROLE.STUDENT), getStudentMyEnquiries);

// Admin-facing routes (Super Admin, Admin, Parent can view student/SP data)
router.get('/student/:studentId/enquiries', authenticate, authorize([USER_ROLE.SUPER_ADMIN, USER_ROLE.ADMIN, USER_ROLE.PARENT, USER_ROLE.REFERRER, USER_ROLE.ADVISORY]), getStudentEnquiriesById);
router.get('/provider/:providerId/services', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), getSPServicesById);
router.get('/provider/:providerId/enquiries', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), getSPEnquiriesById);
router.get('/all', authenticate, authorize([USER_ROLE.SUPER_ADMIN]), getAllSPServicesForSuperAdmin);

export default router;
