import { Router } from 'express';
import { createIvyService, getMyStudentsHandler, getMyServiceHandler, getStudentsForIvyExpertHandler, getServiceDetailsHandler, getServiceByStudentIdHandler, updateInterestHandler, getStudentsForIvyExpertByUserIdHandler } from '../controllers/ivyService.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// POST /api/ivy/ivy-service - Create new Ivy League service
router.post('/', authorize(USER_ROLE.SUPER_ADMIN), createIvyService);

// GET /api/ivy/ivy-service/my-students - Auth-based: get students for logged-in ivy expert
router.get('/my-students', authorize(USER_ROLE.IVY_EXPERT), getMyStudentsHandler);

// GET /api/ivy/ivy-service/my-service - Auth-based: get logged-in student's ivy service
router.get('/my-service', authorize(USER_ROLE.STUDENT), getMyServiceHandler);

// GET /api/ivy/ivy-service/user/:userId/students - Super Admin: get students by ivy expert's User._id
router.get('/user/:userId/students', authorize(USER_ROLE.SUPER_ADMIN), getStudentsForIvyExpertByUserIdHandler);

// GET /api/ivy/ivy-service/ivy-expert/:ivyExpertId/students (legacy, param-based)
router.get('/ivy-expert/:ivyExpertId/students', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), getStudentsForIvyExpertHandler);
// GET /api/ivy/ivy-service/student/:studentId - Get service for a student
router.get('/student/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getServiceByStudentIdHandler);
// GET /api/ivy/ivy-service/:serviceId - Get service details
router.get('/:serviceId', getServiceDetailsHandler);

// PUT /api/ivy/ivy-service/:serviceId/interest - Update student interest
router.put('/:serviceId/interest', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.SUPER_ADMIN]), updateInterestHandler);

export default router;

