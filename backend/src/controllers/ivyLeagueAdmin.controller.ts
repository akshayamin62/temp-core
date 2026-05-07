import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import IvyLeagueRegistration from '../models/IvyLeagueRegistration';
import IvyTestSession from '../models/ivy/IvyTestSession';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Service from '../models/Service';
import User from '../models/ivy/User';
import IvyExpert from '../models/IvyExpert';
import Student from '../models/Student';
import { USER_ROLE } from '../types/roles';
import { sendEmail } from '../utils/email';
import { sendWhatsAppGeneralNotification, sendWhatsAppGeneral4LineNotification } from '../utils/whatsapp';

/* ── Helper: get Ivy League service ID ─────────────────────────────── */
let _ivyServiceId: any = null;
const getIvyServiceId = async () => {
  if (_ivyServiceId) return _ivyServiceId;
  const svc = await Service.findOne({ slug: 'ivy-league' }).select('_id');
  if (svc) _ivyServiceId = svc._id;
  return _ivyServiceId;
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/super-admin/ivy-league/stats
   Returns counts of ivy candidates and ivy students
   ══════════════════════════════════════════════════════════════════════ */
export const getIvyLeagueStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceId = await getIvyServiceId();

    // All IvyLeagueRegistrations
    const allRegistrations = await IvyLeagueRegistration.find().lean();
    const registeredUserIds = allRegistrations.map((r: any) => r.userId.toString());

    // Find which of these have a StudentServiceRegistration with an active ivy expert
    let assignedUserIds: string[] = [];
    if (serviceId && registeredUserIds.length > 0) {
      const ssrs = await StudentServiceRegistration.find({
        serviceId,
        activeIvyExpertId: { $ne: null },
      }).populate('studentId', 'userId').lean();

      // Get user IDs from the SSR's student records
      for (const ssr of ssrs) {
        const student = ssr.studentId as any;
        if (student && student.userId) {
          assignedUserIds.push(student.userId.toString());
        }
      }
    }

    const candidateCount = registeredUserIds.filter((id: string) => !assignedUserIds.includes(id)).length;
    const studentCount = assignedUserIds.length;

    res.json({
      success: true,
      candidates: candidateCount,
      students: studentCount,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get stats' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/super-admin/ivy-league/candidates
   Returns ivy league registrations without an assigned ivy expert
   ══════════════════════════════════════════════════════════════════════ */
export const getIvyCandidates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceId = await getIvyServiceId();
    const isStudent = req.user?.role === USER_ROLE.STUDENT;

    // Get all assigned student user IDs
    let assignedUserIds: string[] = [];
    if (serviceId) {
      const ssrs = await StudentServiceRegistration.find({
        serviceId,
        activeIvyExpertId: { $ne: null },
      }).populate('studentId', 'userId').lean();

      for (const ssr of ssrs) {
        const student = ssr.studentId as any;
        if (student && student.userId) {
          assignedUserIds.push(student.userId.toString());
        }
      }
    }

    // All registrations
    const registrations = await IvyLeagueRegistration.find(
      isStudent ? { userId: req.user!.userId } : {}
    ).lean();

    // Filter to those NOT assigned
    const candidates = registrations.filter(
      (r: any) => !assignedUserIds.includes(r.userId.toString())
    );

    // Get test session status for each candidate
    const candidatesWithStatus = await Promise.all(
      candidates.map(async (reg: any) => {
        const testSession = await IvyTestSession.findOne({ studentId: reg.userId }).lean();
        const user = await User.findById(reg.userId).select('email mobileNumber').lean();

        // Resolve assigned expert name if present
        let assignedExpertName: string | null = null;
        if (reg.assignedIvyExpertId) {
          const IvyExpert = require('../models/IvyExpert').default;
          const expert = await IvyExpert.findById(reg.assignedIvyExpertId).lean();
          if (expert) {
            const expertUser = await User.findById((expert as any).userId).select('firstName middleName lastName').lean();
            if (expertUser) {
              assignedExpertName = [(expertUser as any).firstName, (expertUser as any).middleName, (expertUser as any).lastName].filter(Boolean).join(' ');
            }
          }
        }

        return {
          ...reg,
          email: (user as any)?.email || '',
          mobileNumber: (user as any)?.mobileNumber || '',
          assignedIvyExpertId: reg.assignedIvyExpertId || null,
          assignedExpertName,
          testStatus: testSession ? testSession.status : 'not-started',
          totalScore: testSession?.totalScore ?? null,
          maxScore: testSession?.maxScore ?? 120,
          completedSections: testSession
            ? testSession.sections.filter((s: any) => s.status === 'submitted').length
            : 0,
          testCleared: testSession?.testCleared ?? false,
          studentInterviewCleared: testSession?.studentInterviewCleared ?? false,
          parentInterviewCleared: testSession?.parentInterviewCleared ?? false,
        };
      })
    );

    res.json({ success: true, candidates: candidatesWithStatus });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get candidates' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/super-admin/ivy-league/students
   Returns ivy league registrations WITH an assigned ivy expert
   ══════════════════════════════════════════════════════════════════════ */
export const getIvyStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const serviceId = await getIvyServiceId();
    const isStudent = req.user?.role === USER_ROLE.STUDENT;
    if (!serviceId) {
      res.json({ success: true, students: [] });
      return;
    }

    // Base truth: StudentServiceRegistration records with an active ivy expert
    const ssrs = await StudentServiceRegistration.find({
      serviceId,
      activeIvyExpertId: { $ne: null },
    }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'firstName middleName lastName email profilePicture' },
    }).lean();

    // Build results from SSRs directly (not filtered through IvyLeagueRegistration)
    const studentsWithStatus = await Promise.all(
      ssrs.map(async (ssr: any) => {
        const student = ssr.studentId;
        const userDoc = student?.userId;
        const userIdStr = userDoc?._id?.toString() || '';

        // Optionally enrich with IvyLeagueRegistration data
        const registration = userIdStr
          ? await IvyLeagueRegistration.findOne({ userId: userIdStr }).lean()
          : null;

        const testSession = userIdStr
          ? await IvyTestSession.findOne({ studentId: userIdStr }).lean()
          : null;

        return {
          _id: registration?._id || ssr._id,
          userId: userIdStr,
          studentDocId: student?._id?.toString() || '',
          firstName: (registration as any)?.firstName || userDoc?.firstName || '',
          middleName: (registration as any)?.middleName || userDoc?.middleName || '',
          lastName: (registration as any)?.lastName || userDoc?.lastName || '',
          email: userDoc?.email || '',
          schoolName: (registration as any)?.schoolName || '',
          curriculum: (registration as any)?.curriculum || '',
          currentGrade: (registration as any)?.currentGrade || '',
          parentFirstName: (registration as any)?.parentFirstName || '',
          parentLastName: (registration as any)?.parentLastName || '',
          parentEmail: (registration as any)?.parentEmail || '',
          parentMobile: (registration as any)?.parentMobile || '',
          assignedIvyExpertId: ssr.activeIvyExpertId?.toString() || '',
          testStatus: testSession ? testSession.status : 'not-started',
          totalScore: testSession?.totalScore ?? null,
          maxScore: testSession?.maxScore ?? 120,
          completedSections: testSession
            ? testSession.sections.filter((s: any) => s.status === 'submitted').length
            : 0,
          createdAt: ssr.createdAt,
        };
      })
    );

    // If STUDENT role, only return their own record
    const finalStudents = isStudent
      ? studentsWithStatus.filter((s: any) => s.userId === req.user!.userId)
      : studentsWithStatus;

    res.json({ success: true, students: finalStudents });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get students' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/super-admin/ivy-league/test-result/:userId
   Returns full test result for a specific student (for admin viewing)
   ══════════════════════════════════════════════════════════════════════ */
export const getStudentTestResult = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // STUDENT role can only access their own test result
    if (req.user?.role === USER_ROLE.STUDENT && req.user.userId !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }
    const IvyTestQuestion = (await import('../models/ivy/IvyTestQuestion')).default;

    const session = await IvyTestSession.findOne({ studentId: userId });
    if (!session) {
      res.json({ success: true, session: null, message: 'Student has not started the test yet' });
      return;
    }

    // Build section-level results
    const sections = [];
    for (let i = 0; i < session.sections.length; i++) {
      const sec = session.sections[i];
      let questions: any[] = [];

      if (sec.status === 'submitted') {
        const questionIds = sec.questions.map((q: any) => q.questionId);
        const dbQuestions = await IvyTestQuestion.find({ _id: { $in: questionIds } }).lean();
        const questionMap = new Map(dbQuestions.map((q: any) => [q._id.toString(), q]));

        questions = sec.questions.map((sq: any, idx: number) => {
          const dbQ: any = questionMap.get(sq.questionId.toString());
          return {
            questionNumber: idx + 1,
            questionText: dbQ?.questionText || '',
            questionImageUrl: dbQ?.questionImageUrl || null,
            options: dbQ?.options || [],
            selectedOption: sq.selectedOption,
            correctOption: dbQ?.correctOption || '',
            explanation: dbQ?.explanation || '',
            isCorrect: sq.isCorrect,
            marksAwarded: sq.marksAwarded,
          };
        });
      }

      sections.push({
        sectionName: sec.sectionName,
        sectionIndex: i,
        status: sec.status,
        score: sec.score,
        questionCount: sec.questionCount,
        timeLimit: sec.timeLimit,
        startedAt: sec.startedAt,
        submittedAt: sec.submittedAt,
        answered: sec.questions.filter((q: any) => q.selectedOption !== null).length,
        correct: sec.questions.filter((q: any) => q.isCorrect === true).length,
        incorrect: sec.questions.filter((q: any) => q.isCorrect === false).length,
        unanswered: sec.questions.filter((q: any) => q.selectedOption === null).length,
        questions,
      });
    }

    res.json({
      success: true,
      session: {
        status: session.status,
        totalScore: session.totalScore,
        maxScore: session.maxScore,
        violations: session.violations,
        testCleared: session.testCleared ?? false,
        studentInterviewCleared: session.studentInterviewCleared ?? false,
        parentInterviewCleared: session.parentInterviewCleared ?? false,
        sections,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get test result' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/super-admin/ivy-league/ivy-experts
   Returns list of ivy experts for assignment dropdown
   ══════════════════════════════════════════════════════════════════════ */
export const getIvyExperts = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const experts = await IvyExpert.find().lean();
    const expertUsers = await Promise.all(
      experts.map(async (exp: any) => {
        const user = await User.findById(exp.userId).select('firstName middleName lastName email').lean();
        return {
          _id: exp._id,
          userId: exp.userId,
          firstName: (user as any)?.firstName || '',
          middleName: (user as any)?.middleName || '',
          lastName: (user as any)?.lastName || '',
          email: (user as any)?.email || exp.email,
        };
      })
    );
    res.json({ success: true, experts: expertUsers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get ivy experts' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   POST /api/super-admin/ivy-league/convert-to-student
   Converts an ivy candidate into an ivy student by assigning an expert
   ══════════════════════════════════════════════════════════════════════ */
export const convertCandidateToStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, ivyExpertId } = req.body;

    if (!userId || !ivyExpertId) {
      res.status(400).json({ success: false, message: 'userId and ivyExpertId are required' });
      return;
    }

    // Validate ivy expert exists
    const ivyExpert = await IvyExpert.findById(ivyExpertId);
    if (!ivyExpert) {
      res.status(404).json({ success: false, message: 'Ivy Expert not found' });
      return;
    }

    // Validate registration exists
    const registration = await IvyLeagueRegistration.findOne({ userId });
    if (!registration) {
      res.status(404).json({ success: false, message: 'Ivy League registration not found for this user' });
      return;
    }

    // Enforce: all 3 stages must be cleared before conversion
    const session = await IvyTestSession.findOne({ studentId: userId });
    if (!session || !session.testCleared || !session.studentInterviewCleared || !session.parentInterviewCleared) {
      res.status(400).json({
        success: false,
        message: 'All 3 stages (Test, Student Interview, Parent Interview) must be cleared before converting to student',
      });
      return;
    }

    // Get ivy league service
    const serviceId = await getIvyServiceId();
    if (!serviceId) {
      res.status(500).json({ success: false, message: 'Ivy League service not found' });
      return;
    }

    // Find the student record
    const student = await Student.findOne({ userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    // Find or create StudentServiceRegistration
    let ssr = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId,
    });

    if (ssr) {
      // Already has SSR — just assign the expert
      ssr.primaryIvyExpertId = ivyExpertId;
      ssr.activeIvyExpertId = ivyExpertId;
      await ssr.save();
    } else {
      // Create new SSR
      ssr = await StudentServiceRegistration.create({
        studentId: student._id,
        serviceId,
        primaryIvyExpertId: ivyExpertId,
        activeIvyExpertId: ivyExpertId,
        status: 'REGISTERED',
        registeredAt: new Date(),
        ...(student.adminId ? { registeredViaAdminId: student.adminId } : {}),
        ...(student.advisorId && !student.adminId ? { registeredViaAdvisorId: student.advisorId } : {}),
      });
    }

    // Send congratulation notifications to student and parent
    try {
      const studentName = [registration.firstName, registration.middleName, registration.lastName].filter(Boolean).join(' ');
      const parentName = [registration.parentFirstName, registration.parentLastName].filter(Boolean).join(' ');
      const candidateUser = await User.findById(registration.userId).select('email mobileNumber').lean() as any;
      const studentEmail = candidateUser?.email || '';
      const studentMobile = (candidateUser as any)?.mobileNumber || '';
      const parentEmail = (registration as any).parentEmail || '';
      const parentMobile = (registration as any).parentMobile || '';

      // Fetch assigned expert info (ivyExpert is already fetched above)
      const expertUser = await User.findById(ivyExpert.userId).select('firstName middleName lastName email mobileNumber').lean() as any;
      const expertName = expertUser ? [expertUser.firstName, expertUser.middleName, expertUser.lastName].filter(Boolean).join(' ') : 'Ivy Expert';
      const expertEmail = expertUser?.email || ivyExpert.email || '';
      const expertMobile = (ivyExpert as any).mobileNumber || expertUser?.mobileNumber || '';

      // ── Student email ──
      if (studentEmail) sendEmail({
        to: studentEmail,
        subject: `Heartiest Congratulations! You are an IVY League Aspirant 🎓`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#7c3aed">🎉 Heartiest Congratulations, ${studentName}! 🎉</h2><p style="font-size:15px;color:#374151">You have been selected as an <strong>IVY League Aspirant</strong>. We wish you great success in your onward journey.</p><div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0 0 8px;font-size:14px;color:#5b21b6"><strong>Your IVY League Expert</strong></p><p style="margin:0;font-size:14px;color:#374151">👤 <strong>Name:</strong> ${expertName}<br/>📱 <strong>Mobile:</strong> ${expertMobile}<br/>📧 <strong>Email:</strong> ${expertEmail}</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch((err: any) => console.error('Failed to send IVY selection email to student:', err));

      // ── Student WhatsApp ──
      if (studentMobile) sendWhatsAppGeneral4LineNotification(
        studentMobile, studentName,
        `🎉 Heartiest Congratulations! You have been selected as an *IVY League Aspirant*!`,
        `Your IVY League Expert: *${expertName}* | ${expertMobile} | ${expertEmail}`,
        `Welcome to the IVY League family! Your IVY League Expert will be in touch shortly. 🎓`
      ).catch((err: any) => console.error('Failed to send IVY selection WhatsApp to student:', err));

      // ── Parent email ──
      if (parentEmail) sendEmail({
        to: parentEmail,
        subject: `${studentName} is now an IVY League Aspirant 🎓`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#7c3aed">🎉 Great News, ${parentName}!</h2><p style="font-size:15px;color:#374151"><strong>${studentName}</strong> has been selected as an <strong>IVY League Aspirant</strong>. We wish them great success in the journey ahead.</p><div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0 0 8px;font-size:14px;color:#5b21b6"><strong>Assigned IVY League Coach</strong></p><p style="margin:0;font-size:14px;color:#374151">👤 <strong>Name:</strong> ${expertName}<br/>📱 <strong>Mobile:</strong> ${expertMobile}<br/>📧 <strong>Email:</strong> ${expertEmail}</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch((err: any) => console.error('Failed to send IVY selection email to parent:', err));

      // ── Parent WhatsApp ──
      if (parentMobile) sendWhatsAppGeneral4LineNotification(
        parentMobile, parentName,
        `🎉 *${studentName}* has been selected as an *IVY League Aspirant*!`,
        `Assigned IVY League Expert: *${expertName}* | ${expertMobile} | ${expertEmail}`,
        `We wish ${studentName} great success in the journey ahead. 🎓`
      ).catch((err: any) => console.error('Failed to send IVY selection WhatsApp to parent:', err));

    } catch (notifErr) {
      console.error('Failed to send IVY selection notification:', notifErr);
    }

    res.json({
      success: true,
      message: 'Candidate converted to student successfully',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to convert candidate' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   PUT /api/super-admin/ivy-league/interview/:userId
   Save student or parent interview data (scores + responses)
   Body: { type: 'student' | 'parent', answers: [{ sectionIndex, questionIndex, score, response }] }
   ══════════════════════════════════════════════════════════════════════ */
export const saveInterviewData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { type, answers } = req.body;

    if (!type || !['student', 'parent'].includes(type)) {
      res.status(400).json({ success: false, message: 'type must be "student" or "parent"' });
      return;
    }
    if (!Array.isArray(answers)) {
      res.status(400).json({ success: false, message: 'answers must be an array' });
      return;
    }

    // Find existing session or create a minimal one to hold interview data
    let session = await IvyTestSession.findOne({ studentId: userId });
    if (!session) {
      session = await IvyTestSession.create({
        studentId: userId,
        sections: [],
        status: 'not-started',
      });
    }

    const interviewData = {
      answers: answers.map((a: any) => ({
        sectionIndex: a.sectionIndex,
        questionIndex: a.questionIndex,
        score: Math.min(5, Math.max(0, Number(a.score) || 0)),
        response: String(a.response || ''),
      })),
      updatedAt: new Date(),
    };

    if (type === 'student') {
      session.studentInterview = interviewData;
    } else {
      session.parentInterview = interviewData;
    }

    await session.save();

    res.json({ success: true, message: `${type} interview data saved successfully` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to save interview data' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/super-admin/ivy-league/interview/:userId
   Returns stored interview data (both student & parent) for a user
   ══════════════════════════════════════════════════════════════════════ */
export const getInterviewData = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    // STUDENT role can only access their own interview data
    if (req.user?.role === USER_ROLE.STUDENT && req.user.userId !== userId) {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    const session = await IvyTestSession.findOne({ studentId: userId })
      .select('studentInterview parentInterview')
      .lean();

    res.json({
      success: true,
      studentInterview: session?.studentInterview || null,
      parentInterview: session?.parentInterview || null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get interview data' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   POST /api/super-admin/ivy-league/clear-stage/:userId
   Mark one of the 3 screening stages as cleared and notify student.
   Body: { stage: 'test' | 'student-interview' | 'parent-interview' }
   Accessible by SUPER_ADMIN and IVY_EXPERT
   ══════════════════════════════════════════════════════════════════════ */
export const clearIvyStage = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const { stage } = req.body;

    if (!stage || !['test', 'student-interview', 'parent-interview'].includes(stage)) {
      res.status(400).json({ success: false, message: 'stage must be one of: test, student-interview, parent-interview' });
      return;
    }

    // Find or create session for this student
    let session = await IvyTestSession.findOne({ studentId: userId });
    if (!session) {
      session = await IvyTestSession.create({ studentId: userId, sections: [], status: 'not-started' });
    }

    // Enforce series order: test → student-interview → parent-interview
    if (stage === 'student-interview' && !session.testCleared) {
      res.status(400).json({ success: false, message: 'The Test must be cleared before the Student Interview can be cleared.' });
      return;
    }
    if (stage === 'parent-interview' && !session.studentInterviewCleared) {
      res.status(400).json({ success: false, message: 'The Student Interview must be cleared before the Parent Interview can be cleared.' });
      return;
    }

    // Set the relevant flag
    if (stage === 'test') session.testCleared = true;
    else if (stage === 'student-interview') session.studentInterviewCleared = true;
    else if (stage === 'parent-interview') session.parentInterviewCleared = true;

    await session.save();

    // Lookup registration and student user for notifications
    const registration = await IvyLeagueRegistration.findOne({ userId }).lean() as any;
    const studentUser = await User.findById(userId).select('email mobileNumber').lean() as any;

    const studentName = registration
      ? [registration.firstName, registration.middleName, registration.lastName].filter(Boolean).join(' ')
      : 'Student';
    const parentName = registration
      ? [registration.parentFirstName, registration.parentLastName].filter(Boolean).join(' ')
      : 'Parent';
    const studentEmail = studentUser?.email || '';
    const studentMobile = studentUser?.mobileNumber || '';
    const parentEmail = registration?.parentEmail || '';
    const parentMobile = registration?.parentMobile || '';

    if (stage === 'test') {
      // ── Student notification ──
      if (studentEmail) sendEmail({
        to: studentEmail,
        subject: `🎉 Congratulations! You Have Cleared the IVY League Aptitude Test`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#059669">🎉 Congratulations, ${studentName}!</h2><p style="font-size:15px;color:#374151">You have cleared the <strong>IVY League Aptitude Test</strong>!</p><div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0;font-size:14px;color:#166534"><strong>Next Step: Student Interview</strong><br/>Our IVY Expert will contact you soon to schedule your interview. Please be prepared and keep yourself available.</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch(console.error);
      if (studentMobile) sendWhatsAppGeneral4LineNotification(
        studentMobile, studentName,
        `🎉 Congratulations! You have cleared the *IVY League Aptitude Test*!`,
        `Your next step is the *Student Interview*. Our IVY Expert will contact you soon to schedule your interview.`,
        `Please be prepared and keep yourself available. All the best! 🎉`
      ).catch(console.error);
      // ── Parent notification ──
      if (parentEmail) sendEmail({
        to: parentEmail,
        subject: `${studentName} Has Cleared the IVY League Aptitude Test 🎉`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#059669">🎉 Great News, ${parentName}!</h2><p style="font-size:15px;color:#374151"><strong>${studentName}</strong> has cleared the <strong>IVY League Aptitude Test</strong>!</p><div style="background:#f0fdf4;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0;font-size:14px;color:#166534"><strong>Next Step: Student Interview</strong><br/>Our IVY Expert will contact ${studentName} soon to schedule the interview. Please encourage your child and help them prepare.</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch(console.error);
      if (parentMobile) sendWhatsAppGeneral4LineNotification(
        parentMobile, parentName,
        `🎉 *${studentName}* has cleared the IVY League Aptitude Test!`,
        `The next step is the *Student Interview*. Our IVY Expert will contact ${studentName} soon to schedule the interview.`,
        `Please encourage your child and help them prepare. All the best! 🎉`
      ).catch(console.error);
    } else if (stage === 'student-interview') {
      // ── Student notification ──
      if (studentEmail) sendEmail({
        to: studentEmail,
        subject: `🎉 Congratulations! You Have Cleared the IVY League Student Interview`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#2563eb">🎉 Congratulations, ${studentName}!</h2><p style="font-size:15px;color:#374151">You have cleared the <strong>IVY League Student Interview</strong>!</p><div style="background:#eff6ff;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0;font-size:14px;color:#1e40af"><strong>Next Step: Parent Interview</strong><br/>Our IVY Expert will contact your parents soon to schedule the interview. Please ensure your parents are informed and available.</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch(console.error);
      if (studentMobile) sendWhatsAppGeneral4LineNotification(
        studentMobile, studentName,
        `🎉 Congratulations! You have cleared the *IVY League Student Interview*!`,
        `Your next step is the *Parent Interview*. Our IVY Expert will contact your parents soon to schedule the interview.`,
        `Please ensure your parents are informed and available. All the best! 🎉`
      ).catch(console.error);
      // ── Parent notification ──
      if (parentEmail) sendEmail({
        to: parentEmail,
        subject: `${studentName} Has Cleared the Student Interview — Your Turn is Next! 🎉`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#2563eb">🎉 Great News, ${parentName}!</h2><p style="font-size:15px;color:#374151"><strong>${studentName}</strong> has cleared the <strong>IVY League Student Interview</strong>!</p><div style="background:#eff6ff;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0;font-size:14px;color:#1e40af"><strong>Your Turn is Next: Parent Interview</strong><br/>Our IVY Expert will contact you soon to schedule the Parent Interview. Please be prepared and available.</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch(console.error);
      if (parentMobile) sendWhatsAppGeneral4LineNotification(
        parentMobile, parentName,
        `🎉 *${studentName}* has cleared the IVY League Student Interview!`,
        `Your turn is next — the *Parent Interview*. Our IVY Expert will contact you soon to schedule the interview.`,
        `Please be prepared and available. We look forward to meeting you! 🎉`
      ).catch(console.error);
    } else {
      // parent-interview cleared
      // ── Parent notification ──
      if (parentEmail) sendEmail({
        to: parentEmail,
        subject: `🎉 Congratulations! You Have Cleared the IVY League Parent Interview`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#7c3aed">🎉 Congratulations, ${parentName}!</h2><p style="font-size:15px;color:#374151">You have cleared the <strong>IVY League Parent Interview</strong>!</p><div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0;font-size:14px;color:#5b21b6"><strong>${studentName}</strong> has now completed all 3 stages of the IVY League screening process. Our team will review the profile and be in touch shortly.</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch(console.error);
      if (parentMobile) sendWhatsAppGeneral4LineNotification(
        parentMobile, parentName,
        `🎉 Congratulations! You have cleared the *IVY League Parent Interview*!`,
        `*${studentName}* has now completed all 3 stages of the IVY League screening process.`,
        `Our team will review the profile and be in touch shortly. Thank you! 🎉`
      ).catch(console.error);
      // ── Student notification ──
      if (studentEmail) sendEmail({
        to: studentEmail,
        subject: `🎉 Your Parent Has Cleared the IVY League Parent Interview`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:32px;border:1px solid #e5e7eb;border-radius:12px"><h2 style="color:#7c3aed">🎉 Great News, ${studentName}!</h2><p style="font-size:15px;color:#374151">Your parent has cleared the <strong>IVY League Parent Interview</strong>!</p><div style="background:#f5f3ff;border-radius:8px;padding:16px;margin:20px 0"><p style="margin:0;font-size:14px;color:#5b21b6">You have now completed all 3 stages of the IVY League screening process. Our team will review your profile and be in touch with you shortly.</p></div><p style="font-size:13px;color:#6b7280">Best regards,<br/><strong>ADMITra Team</strong></p></div>`,
      }).catch(console.error);
      if (studentMobile) sendWhatsAppGeneral4LineNotification(
        studentMobile, studentName,
        `🎉 Your parent has cleared the *IVY League Parent Interview*!`,
        `You have now completed all 3 stages of the IVY League screening process.`,
        `Our team will review your profile and be in touch shortly. Well done! 🎉`
      ).catch(console.error);
    }

    res.json({
      success: true,
      message: `${stage} cleared successfully`,
      testCleared: session.testCleared,
      studentInterviewCleared: session.studentInterviewCleared,
      parentInterviewCleared: session.parentInterviewCleared,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to clear stage' });
  }
};
