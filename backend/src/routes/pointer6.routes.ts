import { Router } from 'express';
import {
  uploadCourseListHandler,
  uploadCourseListMiddleware,
  uploadCertificatesHandler,
  uploadCertificatesMiddleware,
  replaceCertificateHandler,
  replaceCertificateMiddleware,
  deleteCertificateHandler,
  evaluateCertificateHandler,
  evaluatePointer6Handler,
  getPointer6StatusHandler,
  getPointer6ScoreHandler,
  selectCourseHandler,
  unselectCourseHandler,
  uploadCourseCertificateHandler,
  uploadCourseCertificateMiddleware,
  scoreCourseCertificateHandler,
  getPointer6CourseScoreHandler,
} from '../controllers/pointer6.controller';
import { authorize } from '../middleware/authorize';
import { USER_ROLE } from '../types/roles';

const router = Router();

// POST /pointer6/course-list/upload - Ivy Expert uploads course list Excel
router.post('/course-list/upload', authorize(USER_ROLE.IVY_EXPERT), uploadCourseListMiddleware, uploadCourseListHandler);

// POST /pointer6/certificate/upload - Student uploads certificates (multiple)
router.post('/certificate/upload', authorize(USER_ROLE.STUDENT), uploadCertificatesMiddleware, uploadCertificatesHandler);

// PUT /pointer6/certificate/:certificateId/replace - Student replaces a certificate
router.put('/certificate/:certificateId/replace', authorize(USER_ROLE.STUDENT), replaceCertificateMiddleware, replaceCertificateHandler);

// DELETE /pointer6/certificate/:certificateId - Student deletes a certificate
router.delete('/certificate/:certificateId', authorize(USER_ROLE.STUDENT), deleteCertificateHandler);

// POST /pointer6/certificate/:certificateId/evaluate - Ivy Expert evaluates individual certificate
router.post('/certificate/:certificateId/evaluate', authorize(USER_ROLE.IVY_EXPERT), evaluateCertificateHandler);

// POST /pointer6/evaluate - Ivy Expert assigns score (DEPRECATED - use individual certificate evaluation)
router.post('/evaluate', authorize(USER_ROLE.IVY_EXPERT), evaluatePointer6Handler);

// GET /pointer6/status/:studentId - by studentId
// GET /pointer6/status?studentIvyServiceId=xxx - by serviceId
router.get('/status', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointer6StatusHandler);
router.get('/status/:studentId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointer6StatusHandler);

// GET /pointer6/score/:studentIvyServiceId - Get pointer6 average score
router.get('/score/:studentIvyServiceId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointer6ScoreHandler);
router.get('/score', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointer6ScoreHandler);

// POST /pointer6/select-course - Select a course with start and end dates
router.post('/select-course', authorize([USER_ROLE.STUDENT, USER_ROLE.IVY_EXPERT]), selectCourseHandler);

// POST /pointer6/unselect-course - Unselect a course
router.post('/unselect-course', authorize([USER_ROLE.STUDENT, USER_ROLE.IVY_EXPERT]), unselectCourseHandler);

// POST /pointer6/upload-course-certificate - Upload certificate for selected course
router.post('/upload-course-certificate', authorize(USER_ROLE.STUDENT), uploadCourseCertificateMiddleware, uploadCourseCertificateHandler);

// POST /pointer6/score-course-certificate - Score a course certificate
router.post('/score-course-certificate', authorize(USER_ROLE.IVY_EXPERT), scoreCourseCertificateHandler);

// GET /pointer6/course-score/:studentIvyServiceId - Get Pointer 6 course average score
router.get('/course-score/:studentIvyServiceId', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointer6CourseScoreHandler);
router.get('/course-score', authorize([USER_ROLE.IVY_EXPERT, USER_ROLE.STUDENT, USER_ROLE.SUPER_ADMIN]), getPointer6CourseScoreHandler);

export default router;


