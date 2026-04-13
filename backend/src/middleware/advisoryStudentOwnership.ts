import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import Advisory from '../models/Advisory';
import Student from '../models/Student';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import { USER_ROLE } from '../types/roles';

/**
 * Middleware: for ADVISORY role, verify that the :studentId param (or ?studentId query)
 * belongs to this advisory (student.advisoryId matches advisory._id).
 * Transferred students are still allowed (advisoryId is preserved after transfer).
 * Non-ADVISORY roles pass through immediately.
 */
export const checkAdvisoryStudentAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  if (req.user?.role !== USER_ROLE.ADVISORY) {
    return next();
  }

  const studentId = req.params.studentId || (req.query.studentId as string);
  if (!studentId) {
    return next();
  }

  try {
    const advisory = await Advisory.findOne({ userId: req.user.userId });
    if (!advisory) {
      return res.status(403).json({ success: false, message: 'Advisory profile not found' });
    }

    // Some routes pass Student._id, others pass User._id (e.g. ivy-service)
    let student = await Student.findById(studentId).select('advisoryId');
    if (!student) {
      student = await Student.findOne({ userId: studentId }).select('advisoryId');
    }
    if (!student || student.advisoryId?.toString() !== advisory._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied — this student is not under your advisory',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to verify student access' });
  }
};

/**
 * Middleware: for ADVISORY role, verify that the :registrationId param belongs
 * to a student under this advisory.
 * Non-ADVISORY roles pass through immediately.
 */
export const checkAdvisoryRegistrationAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  if (req.user?.role !== USER_ROLE.ADVISORY) {
    return next();
  }

  const registrationId = req.params.registrationId;
  if (!registrationId) {
    return next();
  }

  try {
    const advisory = await Advisory.findOne({ userId: req.user.userId });
    if (!advisory) {
      return res.status(403).json({ success: false, message: 'Advisory profile not found' });
    }

    const registration = await StudentServiceRegistration.findById(registrationId).select('studentId');
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const student = await Student.findById(registration.studentId).select('advisoryId');
    if (!student || student.advisoryId?.toString() !== advisory._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied — this registration does not belong to your advisory student',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to verify registration access' });
  }
};
