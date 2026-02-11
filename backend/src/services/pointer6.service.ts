import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Student from '../models/Student';
import IvyExpert from '../models/IvyExpert';
import Service from '../models/Service';
import { PointerNo } from '../types/PointerNo';
import Pointer6CourseList, { IPointer6CourseList } from '../models/ivy/Pointer6CourseList';
import Pointer6Course from '../models/ivy/Pointer6Course';
import Pointer6SelectedCourse from '../models/ivy/Pointer6SelectedCourse';
import Pointer6Certificate, { IPointer6Certificate } from '../models/ivy/Pointer6Certificate';
import Pointer6Evaluation, { IPointer6Evaluation } from '../models/ivy/Pointer6Evaluation';
import Pointer6CertificateEvaluation, { IPointer6CertificateEvaluation } from '../models/ivy/Pointer6CertificateEvaluation';
import { updateScoreAfterEvaluation } from './ivyScore.service';
import { createNotification } from './notification.service';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// File storage directory for Pointer 6
const UPLOAD_DIR_P6 = path.join(getUploadBaseDir(), 'pointer6');
ensureDir(UPLOAD_DIR_P6);

const savePointer6File = async (file: Express.Multer.File, subfolder: string): Promise<string> => {
  const folderPath = path.join(UPLOAD_DIR_P6, subfolder);
  ensureDir(folderPath);

  const fileName = `${Date.now()}-${file.originalname}`;
  const filePath = path.join(folderPath, fileName);
  fs.writeFileSync(filePath, file.buffer);

  return `/uploads/pointer6/${subfolder}/${fileName}`;
};

/** Ivy Expert uploads course list (Excel) */
export const uploadCourseList = async (
  studentIvyServiceId: string,
  ivyExpertId: string,
  file: Express.Multer.File
): Promise<IPointer6CourseList> => {
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(ivyExpertId)) {
    throw new Error('Invalid ivyExpertId');
  }

  const service = await StudentServiceRegistration.findById(studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: User is not an Ivy Expert');
  }

  // Validate Excel mimetype
  const allowedMimeTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only Excel files (.xlsx, .xls) are allowed');
  }

  // Parse Excel file
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const data = XLSX.utils.sheet_to_json(worksheet);

  if (data.length === 0) {
    throw new Error('Excel file is empty');
  }

  // Delete existing courses for this student
  await Pointer6Course.deleteMany({
    studentIvyServiceId,
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  // Save courses to database
  const courses = data.map((row: any, index: number) => {
    // Normalize keys by trimming spaces
    const normalizedRow: any = {};
    Object.keys(row).forEach(key => {
      normalizedRow[key.trim()] = row[key];
    });

    // Helper function to get field value with multiple possible keys
    const getField = (keys: string[]): string => {
      for (const key of keys) {
        if (normalizedRow[key] !== undefined && normalizedRow[key] !== null && normalizedRow[key] !== '') {
          return String(normalizedRow[key]).trim();
        }
      }
      return '';
    };

    const courseName = getField(['course name', 'courseName', 'Course name', 'Course Name', 'CourseName']);
    const duration = getField(['Duration', 'duration']);
    const link = getField(['link', 'Link', 'URL', 'url']);
    const platform = getField(['Platform', 'platform']);

    // Validate required fields
    if (!courseName || !duration || !link) {
      console.error(`Row ${index + 1} validation failed:`, {
        courseName: courseName || 'MISSING',
        duration: duration || 'MISSING',
        link: link || 'MISSING',
        availableKeys: Object.keys(normalizedRow)
      });
      throw new Error(`Row ${index + 1}: Missing required fields. courseName: "${courseName}", duration: "${duration}", link: "${link}"`);
    }

    return {
      studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
      pointerNo: PointerNo.IntellectualCuriosity,
      srNo: parseInt(getField(['Sr. no.', 'Sr.no.', 'Sr no', 'srNo', 'Sr. No.', 'Sr No.']) || '0'),
      platform: platform || 'N/A',
      courseName,
      duration,
      fees: getField(['Fees Rs.', 'Fees', 'fees', 'Fee']) || 'N/A',
      link,
      uploadedBy: new mongoose.Types.ObjectId(ivyExpertId),
    };
  });

  await Pointer6Course.insertMany(courses);

  const fileUrl = await savePointer6File(file, 'courses');

  // Overwrite existing course list if any
  const existing = await Pointer6CourseList.findOne({
    studentIvyServiceId,
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  if (existing) {
    const oldFilePath = path.join(process.cwd(), existing.fileUrl);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
    existing.fileUrl = fileUrl;
    existing.fileName = file.originalname;
    existing.fileSize = file.size;
    existing.mimeType = file.mimetype;
    existing.uploadedBy = new mongoose.Types.ObjectId(ivyExpertId);
    existing.uploadedAt = new Date();
    await existing.save();
    return existing;
  }

  const courseList = await Pointer6CourseList.create({
    studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    pointerNo: PointerNo.IntellectualCuriosity,
    fileUrl,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    uploadedBy: new mongoose.Types.ObjectId(ivyExpertId),
  });

  // Create notification to alert student about new course list
  await createNotification({
    studentIvyServiceId,
    userId: service.studentId,
    userRole: 'student',
    pointerNumber: 6,
    notificationType: 'course_list_uploaded',
    referenceId: courseList._id,
  });

  return courseList;
};

/** Student uploads one or more completion certificates */
export const uploadCertificates = async (
  studentIvyServiceId: string,
  studentId: string,
  files: Express.Multer.File[]
): Promise<IPointer6Certificate[]> => {
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error('Invalid studentId');
  }

  const service = await StudentServiceRegistration.findById(studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }
  if (service.studentId.toString() !== studentId) {
    throw new Error('Unauthorized: Student does not match this service');
  }

  const studentRecord = await Student.findById(studentId);
  if (!studentRecord) {
    throw new Error('Unauthorized: Student not found');
  }

  if (!files || files.length === 0) {
    throw new Error('No certificate files provided');
  }

  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  const created: IPointer6Certificate[] = [];

  for (const file of files) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      // Skip unsupported file types
      continue;
    }

    const fileUrl = await savePointer6File(file, 'certificates');

    const certificate = await Pointer6Certificate.create({
      studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
      pointerNo: PointerNo.IntellectualCuriosity,
      fileUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: new mongoose.Types.ObjectId(studentId),
    });

    created.push(certificate);
  }

  if (created.length === 0) {
    throw new Error('No valid certificate files were uploaded');
  }

  // Recalculate average score after new certificates are added
  await recalculatePointer6Score(studentIvyServiceId);

  return created;
};

/** Student replaces/re-uploads a specific certificate */
export const replaceCertificate = async (
  certificateId: string,
  studentId: string,
  file: Express.Multer.File
): Promise<IPointer6Certificate> => {
  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    throw new Error('Invalid certificateId');
  }
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error('Invalid studentId');
  }

  const certificate = await Pointer6Certificate.findById(certificateId);
  if (!certificate) {
    throw new Error('Certificate not found');
  }

  // Verify student owns this certificate
  if (certificate.uploadedBy.toString() !== studentId) {
    throw new Error('Unauthorized: You do not own this certificate');
  }

  const studentRecord = await Student.findById(studentId);
  if (!studentRecord) {
    throw new Error('Unauthorized: Student not found');
  }

  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only PDF and images are allowed');
  }

  // Delete old file
  const oldFilePath = path.join(process.cwd(), certificate.fileUrl);
  if (fs.existsSync(oldFilePath)) {
    fs.unlinkSync(oldFilePath);
  }

  // Delete existing evaluation for this certificate (require re-evaluation)
  await Pointer6CertificateEvaluation.deleteOne({ certificateId: certificate._id });

  // Save new file
  const fileUrl = await savePointer6File(file, 'certificates');

  // Update certificate
  certificate.fileUrl = fileUrl;
  certificate.fileName = file.originalname;
  certificate.fileSize = file.size;
  certificate.mimeType = file.mimetype;
  certificate.uploadedAt = new Date();
  await certificate.save();

  // Recalculate average score
  await recalculatePointer6Score(certificate.studentIvyServiceId.toString());

  return certificate;
};

/** Delete a specific certificate (Student) */
export const deleteCertificate = async (
  certificateId: string,
  studentId: string
): Promise<void> => {
  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    throw new Error('Invalid certificateId');
  }

  const certificate = await Pointer6Certificate.findById(certificateId);
  if (!certificate) {
    throw new Error('Certificate not found');
  }

  // Verify student owns this certificate
  if (certificate.uploadedBy.toString() !== studentId) {
    throw new Error('Unauthorized: You do not own this certificate');
  }

  // Delete file
  const filePath = path.join(process.cwd(), certificate.fileUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  // Delete evaluation if exists
  await Pointer6CertificateEvaluation.deleteOne({ certificateId: certificate._id });

  // Delete certificate
  await Pointer6Certificate.deleteOne({ _id: certificate._id });

  // Recalculate average score
  await recalculatePointer6Score(certificate.studentIvyServiceId.toString());
};

/** Ivy Expert evaluates a specific certificate */
export const evaluateCertificate = async (
  certificateId: string,
  ivyExpertId: string,
  score: number,
  feedback?: string
): Promise<IPointer6CertificateEvaluation> => {
  if (score < 0 || score > 10) {
    throw new Error('Score must be between 0 and 10');
  }
  if (!mongoose.Types.ObjectId.isValid(certificateId)) {
    throw new Error('Invalid certificateId');
  }
  if (!mongoose.Types.ObjectId.isValid(ivyExpertId)) {
    throw new Error('Invalid ivyExpertId');
  }

  const certificate = await Pointer6Certificate.findById(certificateId);
  if (!certificate) {
    throw new Error('Certificate not found');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: User is not an Ivy Expert');
  }

  let evaluation = await Pointer6CertificateEvaluation.findOne({ certificateId });

  if (evaluation) {
    evaluation.score = score;
    evaluation.feedback = feedback || '';
    evaluation.evaluatedBy = new mongoose.Types.ObjectId(ivyExpertId);
    evaluation.evaluatedAt = new Date();
    await evaluation.save();
  } else {
    evaluation = await Pointer6CertificateEvaluation.create({
      studentIvyServiceId: certificate.studentIvyServiceId,
      certificateId: new mongoose.Types.ObjectId(certificateId),
      score,
      feedback: feedback || '',
      evaluatedBy: new mongoose.Types.ObjectId(ivyExpertId),
    });
  }

  // Recalculate average score after evaluation
  await recalculatePointer6Score(certificate.studentIvyServiceId.toString());

  return evaluation;
};

/** Recalculate Pointer 6 average score based on individual certificate evaluations */
const recalculatePointer6Score = async (studentIvyServiceId: string): Promise<void> => {
  const certificates = await Pointer6Certificate.find({
    studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  if (certificates.length === 0) {
    // No certificates, set score to 0
    await updateScoreAfterEvaluation(
      studentIvyServiceId,
      PointerNo.IntellectualCuriosity,
      0
    );
    return;
  }

  const certificateIds = certificates.map(c => c._id);
  const evaluations = await Pointer6CertificateEvaluation.find({
    certificateId: { $in: certificateIds },
  });

  if (evaluations.length === 0) {
    // No evaluations yet, set score to 0
    await updateScoreAfterEvaluation(
      studentIvyServiceId,
      PointerNo.IntellectualCuriosity,
      0
    );
    return;
  }

  // Calculate average score
  const totalScore = evaluations.reduce((sum, ev) => sum + ev.score, 0);
  const averageScore = totalScore / evaluations.length;

  // Update Pointer6Evaluation (for backward compatibility)
  let pointer6Eval = await Pointer6Evaluation.findOne({
    studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  if (pointer6Eval) {
    pointer6Eval.score = averageScore;
    pointer6Eval.feedback = `Average of ${evaluations.length} certificate evaluations`;
    pointer6Eval.evaluatedAt = new Date();
    await pointer6Eval.save();
  } else {
    await Pointer6Evaluation.create({
      studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
      pointerNo: PointerNo.IntellectualCuriosity,
      score: averageScore,
      feedback: `Average of ${evaluations.length} certificate evaluations`,
      evaluatedBy: evaluations[0].evaluatedBy,
    });
  }

  // Update overall Ivy score
  await updateScoreAfterEvaluation(
    studentIvyServiceId,
    PointerNo.IntellectualCuriosity,
    averageScore
  );
};

/** Ivy Expert assigns Pointer 6 score (DEPRECATED - use individual certificate evaluation) */
export const evaluatePointer6 = async (
  studentIvyServiceId: string,
  ivyExpertId: string,
  score: number,
  feedback?: string
): Promise<IPointer6Evaluation> => {
  if (score < 0 || score > 10) {
    throw new Error('Score must be between 0 and 10');
  }
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(ivyExpertId)) {
    throw new Error('Invalid ivyExpertId');
  }

  const service = await StudentServiceRegistration.findById(studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: User is not an Ivy Expert');
  }

  let evaluation = await Pointer6Evaluation.findOne({
    studentIvyServiceId,
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  if (evaluation) {
    evaluation.score = score;
    evaluation.feedback = feedback || '';
    evaluation.evaluatedBy = new mongoose.Types.ObjectId(ivyExpertId);
    evaluation.evaluatedAt = new Date();
    await evaluation.save();
    return evaluation;
  }

  evaluation = await Pointer6Evaluation.create({
    studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    pointerNo: PointerNo.IntellectualCuriosity,
    score,
    feedback: feedback || '',
    evaluatedBy: new mongoose.Types.ObjectId(ivyExpertId),
  });

  // Update overall Ivy score
  await updateScoreAfterEvaluation(
    service._id.toString(),
    PointerNo.IntellectualCuriosity,
    score
  );

  return evaluation;
};

/** Get Pointer 6 status for a student (by studentId or serviceId) */
export const getPointer6Status = async (
  studentIdOrServiceId: string,
  useServiceId: boolean = false
) => {
  if (!mongoose.Types.ObjectId.isValid(studentIdOrServiceId)) {
    throw new Error('Invalid studentId or studentIvyServiceId');
  }

  let service;
  if (useServiceId) {
    service = await StudentServiceRegistration.findById(studentIdOrServiceId);
  } else {
    // Filter by Ivy League service to avoid wrong registration for multi-service students
    const ivySvc = await Service.findOne({ slug: 'ivy-league' }).select('_id');
    const filter: any = { studentId: studentIdOrServiceId };
    if (ivySvc) filter.serviceId = ivySvc._id;
    service = await StudentServiceRegistration.findOne(filter);
  }

  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  const courseList = await Pointer6CourseList.findOne({
    studentIvyServiceId: service._id,
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  // Get courses from database
  const courses = await Pointer6Course.find({
    studentIvyServiceId: service._id,
    pointerNo: PointerNo.IntellectualCuriosity,
  }).sort({ srNo: 1 });

  // Get selected courses with dates
  const selectedCourses = await Pointer6SelectedCourse.find({
    studentIvyServiceId: service._id,
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  // Create map of selected courses with all details
  const selectedMap = new Map();
  selectedCourses.forEach(sc => {
    selectedMap.set(sc.courseId.toString(), {
      startDate: sc.startDate,
      endDate: sc.endDate,
      selectedBy: sc.selectedBy,
      selectedAt: sc.selectedAt,
      certificateFileName: sc.certificateFileName,
      certificateFileUrl: sc.certificateFileUrl,
      certificateUploadedAt: sc.certificateUploadedAt,
      score: sc.score,
      scoredBy: sc.scoredBy,
      scoredAt: sc.scoredAt,
    });
  });

  const certificates = await Pointer6Certificate.find({
    studentIvyServiceId: service._id,
    pointerNo: PointerNo.IntellectualCuriosity,
  }).sort({ uploadedAt: -1 });

  // Get evaluations for each certificate
  const certificateIds = certificates.map(c => c._id);
  const certificateEvaluations = await Pointer6CertificateEvaluation.find({
    certificateId: { $in: certificateIds },
  });

  const evaluationMap = new Map();
  certificateEvaluations.forEach(ev => {
    evaluationMap.set(ev.certificateId.toString(), ev);
  });

  const evaluation = await Pointer6Evaluation.findOne({
    studentIvyServiceId: service._id,
    pointerNo: PointerNo.IntellectualCuriosity,
  });

  return {
    studentIvyServiceId: service._id,
    courseList: courseList
      ? {
        _id: courseList._id,
        fileName: courseList.fileName,
        fileUrl: courseList.fileUrl,
        uploadedAt: courseList.uploadedAt,
      }
      : null,
    courses: courses.map((c) => ({
      _id: c._id,
      srNo: c.srNo,
      platform: c.platform,
      courseName: c.courseName,
      duration: c.duration,
      fees: c.fees,
      link: c.link,
      selected: selectedMap.has(c._id.toString()),
      startDate: selectedMap.get(c._id.toString())?.startDate || null,
      endDate: selectedMap.get(c._id.toString())?.endDate || null,
      certificateFileName: selectedMap.get(c._id.toString())?.certificateFileName || null,
      certificateFileUrl: selectedMap.get(c._id.toString())?.certificateFileUrl || null,
      certificateUploadedAt: selectedMap.get(c._id.toString())?.certificateUploadedAt || null,
      score: selectedMap.get(c._id.toString())?.score || null,
      scoredBy: selectedMap.get(c._id.toString())?.scoredBy || null,
      scoredAt: selectedMap.get(c._id.toString())?.scoredAt || null,
    })),
    certificates: certificates.map((c) => {
      const certEval = evaluationMap.get(c._id.toString());
      return {
        _id: c._id,
        fileName: c.fileName,
        fileUrl: c.fileUrl,
        uploadedAt: c.uploadedAt,
        evaluation: certEval ? {
          score: certEval.score,
          feedback: certEval.feedback,
          evaluatedAt: certEval.evaluatedAt,
        } : null,
      };
    }),
    evaluation: evaluation
      ? {
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluatedAt: evaluation.evaluatedAt,
      }
      : null,
  };
};

/** Select a course with start and end dates */
export const selectCourse = async (
  studentIvyServiceId: string,
  courseId: string,
  startDate: Date,
  endDate: Date,
  userId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error('Invalid courseId');
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new Error('Invalid userId');
  }

  // Resolve Student._id to User._id for the selectedBy field
  const studentRecord = await Student.findById(userId);
  const resolvedUserId = studentRecord ? studentRecord.userId : new mongoose.Types.ObjectId(userId);

  // Validate dates
  if (new Date(startDate) >= new Date(endDate)) {
    throw new Error('Start date must be before end date');
  }

  // Check if course exists
  const course = await Pointer6Course.findById(courseId);
  if (!course) {
    throw new Error('Course not found');
  }

  // Check if already selected
  const existing = await Pointer6SelectedCourse.findOne({
    studentIvyServiceId,
    courseId,
  });

  if (existing) {
    // Update existing selection
    existing.startDate = startDate;
    existing.endDate = endDate;
    existing.selectedBy = new mongoose.Types.ObjectId(resolvedUserId);
    existing.selectedAt = new Date();
    await existing.save();
    return existing;
  }

  // Create new selection
  const selection = await Pointer6SelectedCourse.create({
    studentIvyServiceId: new mongoose.Types.ObjectId(studentIvyServiceId),
    pointerNo: PointerNo.IntellectualCuriosity,
    courseId: new mongoose.Types.ObjectId(courseId),
    startDate,
    endDate,
    selectedBy: new mongoose.Types.ObjectId(resolvedUserId),
  });

  return selection;
};

/** Unselect a course */
export const unselectCourse = async (
  studentIvyServiceId: string,
  courseId: string
) => {
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error('Invalid courseId');
  }

  const result = await Pointer6SelectedCourse.deleteOne({
    studentIvyServiceId,
    courseId,
  });

  if (result.deletedCount === 0) {
    throw new Error('Course selection not found');
  }

  return { success: true };
};

/** Upload certificate for a selected course (Student) */
export const uploadCourseCertificate = async (
  studentIvyServiceId: string,
  courseId: string,
  studentId: string,
  file: Express.Multer.File
) => {
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error('Invalid courseId');
  }
  if (!mongoose.Types.ObjectId.isValid(studentId)) {
    throw new Error('Invalid studentId');
  }

  // Validate file type
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/jpg',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    throw new Error('Invalid file type. Only PDF and images are allowed');
  }

  // Find the selected course
  const selectedCourse = await Pointer6SelectedCourse.findOne({
    studentIvyServiceId,
    courseId,
  });

  if (!selectedCourse) {
    throw new Error('Selected course not found');
  }

  // Delete old certificate file if exists
  if (selectedCourse.certificateFileUrl) {
    const oldFilePath = path.join(process.cwd(), selectedCourse.certificateFileUrl);
    if (fs.existsSync(oldFilePath)) {
      fs.unlinkSync(oldFilePath);
    }
  }

  // Save new certificate
  const fileUrl = await savePointer6File(file, 'course-certificates');

  // Update selected course with certificate
  selectedCourse.certificateFileName = file.originalname;
  selectedCourse.certificateFileUrl = fileUrl;
  selectedCourse.certificateUploadedAt = new Date();
  // Reset score when new certificate is uploaded
  selectedCourse.score = undefined;
  selectedCourse.scoredBy = undefined;
  selectedCourse.scoredAt = undefined;
  await selectedCourse.save();

  // Create notification to alert Ivy Expert about new certificate
  const notificationService = await StudentServiceRegistration.findById(studentIvyServiceId);
  if (notificationService && notificationService.activeIvyExpertId) {
    await createNotification({
      studentIvyServiceId,
      userId: notificationService.activeIvyExpertId,
      userRole: 'ivyExpert',
      pointerNumber: 6,
      notificationType: 'certificate_uploaded',
      referenceId: selectedCourse._id,
    });
  }

  return selectedCourse;
};

/** Score a course certificate (Ivy Expert) */
export const scoreCourseCertificate = async (
  studentIvyServiceId: string,
  courseId: string,
  ivyExpertId: string,
  score: number
) => {
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error('Invalid courseId');
  }
  if (!mongoose.Types.ObjectId.isValid(ivyExpertId)) {
    throw new Error('Invalid ivyExpertId');
  }

  if (score < 0 || score > 10) {
    throw new Error('Score must be between 0 and 10');
  }

  // Find the selected course
  const selectedCourse = await Pointer6SelectedCourse.findOne({
    studentIvyServiceId,
    courseId,
  });

  if (!selectedCourse) {
    throw new Error('Selected course not found');
  }

  if (!selectedCourse.certificateFileUrl) {
    throw new Error('No certificate uploaded for this course');
  }

  // Update score
  selectedCourse.score = score;
  selectedCourse.scoredBy = new mongoose.Types.ObjectId(ivyExpertId);
  selectedCourse.scoredAt = new Date();
  await selectedCourse.save();

  // Update the overall Pointer 6 score
  await updatePointer6Score(studentIvyServiceId);

  return selectedCourse;
};

/** Calculate and update Pointer 6 score based on all scored certificates */
export const updatePointer6Score = async (studentIvyServiceId: string) => {
  const selectedCourses = await Pointer6SelectedCourse.find({
    studentIvyServiceId,
    pointerNo: PointerNo.IntellectualCuriosity,
    score: { $exists: true, $ne: null },
  });

  if (selectedCourses.length === 0) {
    return null;
  }

  // Calculate average score
  const totalScore = selectedCourses.reduce((sum, course) => sum + (course.score || 0), 0);
  const averageScore = totalScore / selectedCourses.length;

  // Update score in ivyScore service
  await updateScoreAfterEvaluation(
    studentIvyServiceId,
    PointerNo.IntellectualCuriosity,
    averageScore
  );

  return averageScore;
};

/** Get Pointer 6 score */
export const getPointer6Score = async (studentIvyServiceId: string) => {
  const selectedCourses = await Pointer6SelectedCourse.find({
    studentIvyServiceId,
    pointerNo: PointerNo.IntellectualCuriosity,
    score: { $exists: true, $ne: null },
  });

  if (selectedCourses.length === 0) {
    return 0;
  }

  const totalScore = selectedCourses.reduce((sum, course) => sum + (course.score || 0), 0);
  return totalScore / selectedCourses.length;
};


