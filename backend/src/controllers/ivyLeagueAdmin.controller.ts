import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import IvyLeagueRegistration from '../models/IvyLeagueRegistration';
import IvyTestSession from '../models/ivy/IvyTestSession';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Service from '../models/Service';
import User from '../models/ivy/User';
import IvyExpert from '../models/IvyExpert';
import Student from '../models/Student';

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
    const registrations = await IvyLeagueRegistration.find().lean();

    // Filter to those NOT assigned
    const candidates = registrations.filter(
      (r: any) => !assignedUserIds.includes(r.userId.toString())
    );

    // Get test session status for each candidate
    const candidatesWithStatus = await Promise.all(
      candidates.map(async (reg: any) => {
        const testSession = await IvyTestSession.findOne({ studentId: reg.userId }).lean();
        const user = await User.findById(reg.userId).select('email').lean();

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
          assignedIvyExpertId: reg.assignedIvyExpertId || null,
          assignedExpertName,
          testStatus: testSession ? testSession.status : 'not-started',
          totalScore: testSession?.totalScore ?? null,
          maxScore: testSession?.maxScore ?? 120,
          completedSections: testSession
            ? testSession.sections.filter((s: any) => s.status === 'submitted').length
            : 0,
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
      populate: { path: 'userId', select: 'firstName middleName lastName email' },
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

    res.json({ success: true, students: studentsWithStatus });
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
      });
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
