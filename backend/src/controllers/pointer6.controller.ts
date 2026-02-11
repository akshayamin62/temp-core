import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { resolveIvyExpertId, resolveStudentId } from '../utils/resolveRole';
import multer from 'multer';
import {
  uploadCourseList,
  uploadCertificates,
  replaceCertificate,
  deleteCertificate,
  evaluateCertificate,
  evaluatePointer6,
  getPointer6Status,
  selectCourse,
  unselectCourse,
  uploadCourseCertificate,
  scoreCourseCertificate,
  getPointer6Score,
} from '../services/pointer6.service';
import { updateScoreAfterEvaluation } from '../services/ivyScore.service';
import { PointerNo } from '../types/PointerNo';
import Pointer6Certificate from '../models/ivy/Pointer6Certificate';
import Pointer6Evaluation from '../models/ivy/Pointer6Evaluation';

// Multer in-memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});

/** POST /pointer6/course-list/upload (Ivy Expert only) */
export const uploadCourseListMiddleware = upload.single('courseListFile');

export const uploadCourseListHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { studentIvyServiceId } = req.body;
    const ivyExpertId = await resolveIvyExpertId((req as AuthRequest).user!.userId);

    if (!studentIvyServiceId) {
      res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
      return;
    }

    const courseList = await uploadCourseList(studentIvyServiceId, ivyExpertId as string, req.file);

    res.status(200).json({
      success: true,
      message: 'Course list uploaded successfully',
      data: {
        _id: courseList._id,
        fileName: courseList.fileName,
        fileUrl: courseList.fileUrl,
        uploadedAt: courseList.uploadedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload course list',
    });
  }
};

/** POST /pointer6/certificate/upload (Student only, multiple files) */
export const uploadCertificatesMiddleware = upload.array('certificates', 10);

export const uploadCertificatesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No certificate files uploaded' });
      return;
    }

    const { studentIvyServiceId } = req.body;
    const studentId = await resolveStudentId((req as AuthRequest).user!.userId);

    if (!studentIvyServiceId) {
      res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
      return;
    }

    const certificates = await uploadCertificates(
      studentIvyServiceId,
      studentId,
      files,
    );

    res.status(200).json({
      success: true,
      message: 'Certificates uploaded successfully',
      data: certificates.map((c) => ({
        _id: c._id,
        fileName: c.fileName,
        fileUrl: c.fileUrl,
        uploadedAt: c.uploadedAt,
      })),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload certificates',
    });
  }
};

/** POST /pointer6/evaluate (Ivy Expert only) */
export const evaluatePointer6Handler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId, score, feedback } = req.body;
    const ivyExpertId = await resolveIvyExpertId((req as AuthRequest).user!.userId);

    if (!studentIvyServiceId) {
      res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
      return;
    }
    if (score === undefined || score === null) {
      res.status(400).json({ success: false, message: 'score is required (0-10)' });
      return;
    }

    const evaluation = await evaluatePointer6(
      studentIvyServiceId,
      ivyExpertId as string,
      Number(score),
      feedback,
    );

    // Update overall Ivy score
    await updateScoreAfterEvaluation(
      evaluation.studentIvyServiceId.toString(),
      PointerNo.IntellectualCuriosity,
      evaluation.score
    );

    res.status(200).json({
      success: true,
      message: 'Pointer 6 evaluated successfully',
      data: {
        _id: evaluation._id,
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluatedAt: evaluation.evaluatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to evaluate Pointer 6',
    });
  }
};

/** GET /pointer6/status/:studentId or /pointer6/status?studentIvyServiceId=xxx */
export const getPointer6StatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { studentIvyServiceId } = req.query;

    const identifier = studentIvyServiceId ? (studentIvyServiceId as string) : (studentId as string);
    const useServiceId = !!studentIvyServiceId;

    if (!identifier) {
      res.status(400).json({
        success: false,
        message: 'studentId or studentIvyServiceId is required',
      });
      return;
    }

    const status = await getPointer6Status(identifier, useServiceId);

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get Pointer 6 status',
    });
  }
};

/** PUT /pointer6/certificate/:certificateId/replace (Student only) */
export const replaceCertificateMiddleware = upload.single('certificate');

export const replaceCertificateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { certificateId } = req.params;
    const studentId = await resolveStudentId((req as AuthRequest).user!.userId);

    if (!certificateId) {
      res.status(400).json({ success: false, message: 'certificateId is required' });
      return;
    }

    const certificate = await replaceCertificate(certificateId as string, studentId, req.file);

    res.status(200).json({
      success: true,
      message: 'Certificate replaced successfully. Please wait for re-evaluation.',
      data: {
        _id: certificate._id,
        fileName: certificate.fileName,
        fileUrl: certificate.fileUrl,
        uploadedAt: certificate.uploadedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to replace certificate',
    });
  }
};

/** DELETE /pointer6/certificate/:certificateId (Student only) */
export const deleteCertificateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { certificateId } = req.params;
    const studentId = await resolveStudentId((req as AuthRequest).user!.userId);

    if (!certificateId) {
      res.status(400).json({ success: false, message: 'certificateId is required' });
      return;
    }

    await deleteCertificate(certificateId as string, studentId);

    res.status(200).json({
      success: true,
      message: 'Certificate deleted successfully',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to delete certificate',
    });
  }
};

/** POST /pointer6/certificate/:certificateId/evaluate (Ivy Expert only) */
export const evaluateCertificateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { certificateId } = req.params;
    const { score, feedback } = req.body;
    const ivyExpertId = await resolveIvyExpertId((req as AuthRequest).user!.userId);

    if (!certificateId) {
      res.status(400).json({ success: false, message: 'certificateId is required' });
      return;
    }
    if (score === undefined || score === null) {
      res.status(400).json({ success: false, message: 'score is required (0-10)' });
      return;
    }

    const evaluation = await evaluateCertificate(
      certificateId as string,
      ivyExpertId as string,
      Number(score),
      feedback
    );

    res.status(200).json({
      success: true,
      message: 'Certificate evaluated successfully',
      data: {
        _id: evaluation._id,
        certificateId: evaluation.certificateId,
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluatedAt: evaluation.evaluatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to evaluate certificate',
    });
  }
};

export const getPointer6ScoreHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentIvyServiceId = req.params.studentIvyServiceId || req.query.studentIvyServiceId;

    if (!studentIvyServiceId) {
      res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
      return;
    }

    const certificates = await Pointer6Certificate.find({ studentIvyServiceId });

    if (certificates.length === 0) {
      res.status(200).json({ success: true, data: 0 });
      return;
    }

    const certificateIds = certificates.map((c: any) => c._id);
    const evaluations = await Pointer6Evaluation.find({
      certificateId: { $in: certificateIds },
    });

    if (evaluations.length === 0) {
      res.status(200).json({ success: true, data: 0 });
      return;
    }

    const averageScore = evaluations.reduce((sum: number, evaluation: any) => sum + (evaluation.score || 0), 0) / evaluations.length;

    res.status(200).json({
      success: true,
      data: averageScore,
    });
  } catch (error: any) {
    console.error('Get pointer6 score error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pointer6 score',
    });
  }
};

/** POST /pointer6/select-course - Select a course with start and end dates */
export const selectCourseHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId, courseId, startDate, endDate } = req.body;
    const studentId = await resolveStudentId((req as AuthRequest).user!.userId);

    if (!studentIvyServiceId || !courseId || !startDate || !endDate) {
      res.status(400).json({ 
        success: false, 
        message: 'studentIvyServiceId, courseId, startDate, and endDate are required' 
      });
      return;
    }

    const selection = await selectCourse(
      studentIvyServiceId,
      courseId,
      new Date(startDate),
      new Date(endDate),
      studentId
    );

    res.status(200).json({
      success: true,
      message: 'Course selected successfully',
      data: selection,
    });
  } catch (error: any) {
    console.error('Select course error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to select course',
    });
  }
};

/** POST /pointer6/unselect-course - Unselect a course */
export const unselectCourseHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId, courseId } = req.body;

    if (!studentIvyServiceId || !courseId) {
      res.status(400).json({ 
        success: false, 
        message: 'studentIvyServiceId and courseId are required' 
      });
      return;
    }

    await unselectCourse(studentIvyServiceId, courseId);

    res.status(200).json({
      success: true,
      message: 'Course unselected successfully',
    });
  } catch (error: any) {
    console.error('Unselect course error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to unselect course',
    });
  }
};

/** POST /pointer6/upload-course-certificate - Upload certificate for selected course (Student) */
export const uploadCourseCertificateMiddleware = upload.single('certificate');

export const uploadCourseCertificateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const { studentIvyServiceId, courseId } = req.body;
    const studentId = await resolveStudentId((req as AuthRequest).user!.userId);

    if (!studentIvyServiceId || !courseId) {
      res.status(400).json({ 
        success: false, 
        message: 'studentIvyServiceId and courseId are required' 
      });
      return;
    }

    const selectedCourse = await uploadCourseCertificate(
      studentIvyServiceId,
      courseId,
      studentId,
      req.file
    );

    res.status(200).json({
      success: true,
      message: 'Certificate uploaded successfully',
      data: selectedCourse,
    });
  } catch (error: any) {
    console.error('Upload course certificate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload certificate',
    });
  }
};

/** POST /pointer6/score-course-certificate - Score a course certificate (Ivy Expert) */
export const scoreCourseCertificateHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId, courseId, score } = req.body;
    const ivyExpertId = await resolveIvyExpertId((req as AuthRequest).user!.userId);

    if (!studentIvyServiceId || !courseId || score === undefined) {
      res.status(400).json({ 
        success: false, 
        message: 'studentIvyServiceId, courseId, and score are required' 
      });
      return;
    }

    const selectedCourse = await scoreCourseCertificate(
      studentIvyServiceId,
      courseId,
      ivyExpertId as string,
      Number(score)
    );

    res.status(200).json({
      success: true,
      message: 'Certificate scored successfully',
      data: selectedCourse,
    });
  } catch (error: any) {
    console.error('Score course certificate error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to score certificate',
    });
  }
};

/** GET /pointer6/course-score - Get Pointer 6 average score */
export const getPointer6CourseScoreHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentIvyServiceId = req.params.studentIvyServiceId || req.query.studentIvyServiceId;

    if (!studentIvyServiceId) {
      res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
      return;
    }

    const score = await getPointer6Score(studentIvyServiceId as string);

    res.status(200).json({
      success: true,
      data: { score },
    });
  } catch (error: any) {
    console.error('Get pointer6 course score error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pointer6 course score',
    });
  }
};
