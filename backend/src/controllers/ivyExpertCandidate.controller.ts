import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import IvyLeagueRegistration from '../models/IvyLeagueRegistration';
import IvyTestSession from '../models/ivy/IvyTestSession';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import Service from '../models/Service';
import User from '../models/ivy/User';
import IvyExpert from '../models/IvyExpert';
import Student from '../models/Student';
import { resolveIvyExpertId } from '../utils/resolveRole';

/* ── Helper: get Ivy League service ID ─────────────────────────────── */
let _ivyServiceId: any = null;
const getIvyServiceId = async () => {
  if (_ivyServiceId) return _ivyServiceId;
  const svc = await Service.findOne({ slug: 'ivy-league' }).select('_id');
  if (svc) _ivyServiceId = svc._id;
  return _ivyServiceId;
};

/* ══════════════════════════════════════════════════════════════════════
   Super-admin: Assign ivy expert to a candidate (at candidate stage)
   POST /api/super-admin/ivy-league/assign-expert
   Body: { userId, ivyExpertId }
   ══════════════════════════════════════════════════════════════════════ */
export const assignExpertToCandidate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId, ivyExpertId } = req.body;

    if (!userId || !ivyExpertId) {
      res.status(400).json({ success: false, message: 'userId and ivyExpertId are required' });
      return;
    }

    const expert = await IvyExpert.findById(ivyExpertId);
    if (!expert) {
      res.status(404).json({ success: false, message: 'Ivy Expert not found' });
      return;
    }

    const registration = await IvyLeagueRegistration.findOne({ userId });
    if (!registration) {
      res.status(404).json({ success: false, message: 'Ivy League registration not found' });
      return;
    }

    registration.assignedIvyExpertId = ivyExpertId;
    await registration.save();

    res.json({ success: true, message: 'Ivy Expert assigned to candidate successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to assign expert' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   Ivy Expert: Get MY candidates (assigned to me but not yet converted)
   GET /api/ivy/ivy-expert-candidates/my-candidates
   ══════════════════════════════════════════════════════════════════════ */
export const getMyIvyCandidates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ivyExpertId = await resolveIvyExpertId(req.user!.userId);
    const serviceId = await getIvyServiceId();

    // Get all registrations assigned to this expert
    const registrations = await IvyLeagueRegistration.find({
      assignedIvyExpertId: ivyExpertId,
    }).lean();

    if (registrations.length === 0) {
      res.json({ success: true, candidates: [] });
      return;
    }

    // Find which of these have already been converted (have SSR with activeIvyExpertId)
    let convertedUserIds: string[] = [];
    if (serviceId) {
      const ssrs = await StudentServiceRegistration.find({
        serviceId,
        activeIvyExpertId: { $ne: null },
      }).populate('studentId', 'userId').lean();

      for (const ssr of ssrs) {
        const student = ssr.studentId as any;
        if (student && student.userId) {
          convertedUserIds.push(student.userId.toString());
        }
      }
    }

    // Candidates = assigned to this expert BUT not yet converted
    const candidates = registrations.filter(
      (r: any) => !convertedUserIds.includes(r.userId.toString())
    );

    const candidatesWithStatus = await Promise.all(
      candidates.map(async (reg: any) => {
        const testSession = await IvyTestSession.findOne({ studentId: reg.userId }).lean();
        const user = await User.findById(reg.userId).select('email profilePicture').lean();
        return {
          ...reg,
          email: (user as any)?.email || '',
          profilePicture: (user as any)?.profilePicture || null,
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
   Ivy Expert: Get MY students (converted from candidate, have SSR)
   GET /api/ivy/ivy-expert-candidates/my-ivy-students
   ══════════════════════════════════════════════════════════════════════ */
export const getMyIvyStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ivyExpertId = await resolveIvyExpertId(req.user!.userId);
    const serviceId = await getIvyServiceId();

    if (!serviceId) {
      res.json({ success: true, students: [] });
      return;
    }

    // Base truth: SSRs where this expert is assigned
    const ssrs = await StudentServiceRegistration.find({
      serviceId,
      activeIvyExpertId: ivyExpertId,
    }).populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'firstName middleName lastName email profilePicture' },
    }).lean();

    if (ssrs.length === 0) {
      res.json({ success: true, students: [] });
      return;
    }

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
          firstName: (registration as any)?.firstName || userDoc?.firstName || '',
          middleName: (registration as any)?.middleName || userDoc?.middleName || '',
          lastName: (registration as any)?.lastName || userDoc?.lastName || '',
          email: userDoc?.email || '',
          profilePicture: userDoc?.profilePicture || null,
          schoolName: (registration as any)?.schoolName || '',
          curriculum: (registration as any)?.curriculum || '',
          currentGrade: (registration as any)?.currentGrade || '',
          parentFirstName: (registration as any)?.parentFirstName || '',
          parentLastName: (registration as any)?.parentLastName || '',
          parentEmail: (registration as any)?.parentEmail || '',
          parentMobile: (registration as any)?.parentMobile || '',
          testStatus: testSession ? testSession.status : 'not-started',
          totalScore: testSession?.totalScore ?? null,
          maxScore: testSession?.maxScore ?? 120,
          completedSections: testSession
            ? testSession.sections.filter((s: any) => s.status === 'submitted').length
            : 0,
          studentId: student ? student._id.toString() : null,
          studentIvyServiceId: ssr._id.toString(),
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
   Ivy Expert: Convert candidate to student (assign expert via SSR)
   POST /api/ivy/ivy-expert-candidates/convert-to-student
   Body: { userId }
   ══════════════════════════════════════════════════════════════════════ */
export const ivyExpertConvertToStudent = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ivyExpertId = await resolveIvyExpertId(req.user!.userId);
    const { userId } = req.body;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    // Verify this candidate is assigned to this expert
    const registration = await IvyLeagueRegistration.findOne({
      userId,
      assignedIvyExpertId: ivyExpertId,
    });
    if (!registration) {
      res.status(403).json({ success: false, message: 'This candidate is not assigned to you' });
      return;
    }

    const serviceId = await getIvyServiceId();
    if (!serviceId) {
      res.status(500).json({ success: false, message: 'Ivy League service not found' });
      return;
    }

    const student = await Student.findOne({ userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student record not found' });
      return;
    }

    let ssr = await StudentServiceRegistration.findOne({
      studentId: student._id,
      serviceId,
    });

    if (ssr) {
      ssr.primaryIvyExpertId = ivyExpertId as any;
      ssr.activeIvyExpertId = ivyExpertId as any;
      await ssr.save();
    } else {
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

    res.json({ success: true, message: 'Candidate converted to student successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to convert candidate' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   Ivy Expert: Get test result for a student/candidate
   GET /api/ivy/ivy-expert-candidates/test-result/:userId
   ══════════════════════════════════════════════════════════════════════ */
export const getTestResultForExpert = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const IvyTestQuestion = (await import('../models/ivy/IvyTestQuestion')).default;

    const session = await IvyTestSession.findOne({ studentId: userId });
    if (!session) {
      res.json({ success: true, session: null, message: 'Student has not started the test yet' });
      return;
    }

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
   Ivy Expert: Save interview data
   PUT /api/ivy/ivy-expert-candidates/interview/:userId
   Body: { type: 'student' | 'parent', answers: [...] }
   ══════════════════════════════════════════════════════════════════════ */
export const saveInterviewForExpert = async (req: AuthRequest, res: Response): Promise<void> => {
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
   Ivy Expert: Get interview data
   GET /api/ivy/ivy-expert-candidates/interview/:userId
   ══════════════════════════════════════════════════════════════════════ */
export const getInterviewForExpert = async (req: AuthRequest, res: Response): Promise<void> => {
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
