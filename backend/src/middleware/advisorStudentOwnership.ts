import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth';
import Advisor from '../models/Advisor';
import Student from '../models/Student';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import { USER_ROLE } from '../types/roles';

/**
 * Middleware: for ADVISOR role, verify that the :studentId param (or ?studentId query)
 * belongs to this advisor (student.advisorId matches advisor._id).
 * Transferred students are still allowed (advisorId is preserved after transfer).
 * Non-ADVISOR roles pass through immediately.
 */
export const checkAdvisorStudentAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  if (req.user?.role !== USER_ROLE.ADVISOR) {
    return next();
  }

  const studentId = req.params.studentId || (req.query.studentId as string);
  if (!studentId) {
    return next();
  }

  try {
    const advisor = await Advisor.findOne({ userId: req.user.userId });
    if (!advisor) {
      return res.status(403).json({ success: false, message: 'Advisor profile not found' });
    }

    // Some routes pass Student._id, others pass User._id (e.g. ivy-service)
    let student = await Student.findById(studentId).select('advisorId');
    if (!student) {
      student = await Student.findOne({ userId: studentId }).select('advisorId');
    }
    if (!student || student.advisorId?.toString() !== advisor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied — this student is not under your advisor',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to verify student access' });
  }
};

/**
 * Middleware: for ADVISOR role, verify that the :registrationId param belongs
 * to a student under this advisor.
 * Non-ADVISOR roles pass through immediately.
 */
export const checkAdvisorRegistrationAccess = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  if (req.user?.role !== USER_ROLE.ADVISOR) {
    return next();
  }

  const registrationId = req.params.registrationId;
  if (!registrationId) {
    return next();
  }

  try {
    const advisor = await Advisor.findOne({ userId: req.user.userId });
    if (!advisor) {
      return res.status(403).json({ success: false, message: 'Advisor profile not found' });
    }

    const registration = await StudentServiceRegistration.findById(registrationId).select('studentId');
    if (!registration) {
      return res.status(404).json({ success: false, message: 'Registration not found' });
    }

    const student = await Student.findById(registration.studentId).select('advisorId');
    if (!student || student.advisorId?.toString() !== advisor._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied — this registration does not belong to your advisor student',
      });
    }

    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to verify registration access' });
  }
};
