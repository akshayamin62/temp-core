import { Request, Response } from 'express';
import IvyTestSession from '../models/ivy/IvyTestSession';
import IvyTestQuestion from '../models/ivy/IvyTestQuestion';
import { AuthRequest } from '../middleware/auth';

/* ── Section config (must match frontend) ──────────────────────────── */
const SECTION_CONFIG = [
  { name: 'Global Awareness', questionCount: 20, timeLimit: 25 * 60 },   // 2700s
  { name: 'Critical Thinking', questionCount: 15, timeLimit: 20 * 60 },  // 1800s
  { name: 'Academic Aptitude', questionCount: 10, timeLimit: 15 * 60 },  // 1800s
  { name: 'Quantitative Logic', questionCount: 15, timeLimit: 22 * 60 }, // 2700s
];

/* ── Helper: shuffle array (Fisher-Yates) ──────────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ══════════════════════════════════════════════════════════════════════
   GET /test-session/status — Get or create test session for the student
   ══════════════════════════════════════════════════════════════════════ */
export const getTestStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.userId;

    let session = await IvyTestSession.findOne({ studentId });

    // If no session, create one with empty section slots
    if (!session) {
      session = await IvyTestSession.create({
        studentId,
        sections: SECTION_CONFIG.map((cfg) => ({
          sectionName: cfg.name,
          questions: [],
          questionCount: cfg.questionCount,
          timeLimit: cfg.timeLimit,
          startedAt: null,
          submittedAt: null,
          status: 'locked',
          score: 0,
        })),
        status: 'not-started',
      });
    }

    // Return session without leaking correct answers
    const sanitized = session.sections.map((sec) => ({
      sectionName: sec.sectionName,
      questionCount: sec.questionCount,
      timeLimit: sec.timeLimit,
      startedAt: sec.startedAt,
      submittedAt: sec.submittedAt,
      status: sec.status,
      score: sec.status === 'submitted' ? sec.score : undefined,
      answeredCount: sec.questions.filter((q) => q.selectedOption !== null).length,
      visitedCount: sec.questions.filter((q) => q.isVisited).length,
    }));

    res.json({
      success: true,
      session: {
        _id: session._id,
        status: session.status,
        totalScore: session.status === 'completed' ? session.totalScore : undefined,
        maxScore: session.maxScore,
        violations: session.violations,
        sections: sanitized,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get test status' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   POST /test-session/start-section — Start a section (fetch random Qs)
   Body: { sectionIndex: number }
   ══════════════════════════════════════════════════════════════════════ */
export const startSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.userId;
    const { sectionIndex } = req.body;

    if (sectionIndex === undefined || sectionIndex < 0 || sectionIndex > 3) {
      res.status(400).json({ success: false, message: 'Invalid sectionIndex (0-3)' });
      return;
    }

    let session = await IvyTestSession.findOne({ studentId });
    if (!session) {
      res.status(404).json({ success: false, message: 'No test session found. Get /status first.' });
      return;
    }

    const section = session.sections[sectionIndex];

    // Already started — return existing questions
    if (section.status === 'in-progress') {
      // Fetch the question details (without correctOption)
      const questionIds = section.questions.map((q) => q.questionId);
      const dbQuestions = await IvyTestQuestion.find({ _id: { $in: questionIds } })
        .select('-correctOption -explanation')
        .lean();

      // Maintain order from session
      const orderedQuestions = questionIds.map((id) => {
        const q = dbQuestions.find((dq: any) => dq._id.toString() === id.toString());
        return q;
      }).filter(Boolean);

      // Shuffle options for each question consistently (use stored order from session)
      const questionsWithAnswers = orderedQuestions.map((q: any, idx: number) => ({
        ...q,
        selectedOption: section.questions[idx].selectedOption,
        isVisited: section.questions[idx].isVisited,
      }));

      // Calculate remaining time
      const elapsed = section.startedAt
        ? Math.floor((Date.now() - new Date(section.startedAt).getTime()) / 1000)
        : 0;
      const remainingTime = Math.max(0, section.timeLimit - elapsed);

      res.json({
        success: true,
        sectionIndex,
        sectionName: section.sectionName,
        timeLimit: section.timeLimit,
        remainingTime,
        questions: questionsWithAnswers,
      });
      return;
    }

    // Already submitted
    if (section.status === 'submitted') {
      res.status(400).json({ success: false, message: 'This section has already been submitted.' });
      return;
    }

    // Check no other section is in-progress
    const inProgressIdx = session.sections.findIndex((s) => s.status === 'in-progress');
    if (inProgressIdx !== -1 && inProgressIdx !== sectionIndex) {
      res.status(400).json({
        success: false,
        message: `Section "${session.sections[inProgressIdx].sectionName}" is still in progress. Submit it first.`,
      });
      return;
    }

    // Fetch random active questions for this section
    const config = SECTION_CONFIG[sectionIndex];
    const allQuestions = await IvyTestQuestion.find({
      section: config.name,
      isActive: true,
    }).lean();

    if (allQuestions.length < config.questionCount) {
      res.status(400).json({
        success: false,
        message: `Not enough questions in "${config.name}". Need ${config.questionCount}, found ${allQuestions.length}.`,
      });
      return;
    }

    // Shuffle and pick the required number
    const selected = shuffle(allQuestions).slice(0, config.questionCount);

    // Build session question entries
    section.questions = selected.map((q) => ({
      questionId: q._id,
      selectedOption: null,
      isVisited: false,
      isCorrect: null,
      marksAwarded: 0,
    }));
    section.status = 'in-progress';
    section.startedAt = new Date();

    // Update overall session status
    session.status = 'in-progress';

    await session.save();

    // Return questions WITHOUT correctOption/explanation, WITH shuffled options
    const questionsForStudent = selected.map((q, idx) => ({
      _id: q._id,
      section: q.section,
      questionText: q.questionText,
      questionImageUrl: q.questionImageUrl,
      options: shuffle(q.options),  // shuffle answer order
      selectedOption: null,
      isVisited: false,
    }));

    res.json({
      success: true,
      sectionIndex,
      sectionName: section.sectionName,
      timeLimit: section.timeLimit,
      remainingTime: section.timeLimit,
      questions: questionsForStudent,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to start section' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   POST /test-session/save-answer — Auto-save a single answer
   Body: { sectionIndex, questionIndex, selectedOption, isVisited? }
   ══════════════════════════════════════════════════════════════════════ */
export const saveAnswer = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.userId;
    const { sectionIndex, questionIndex, selectedOption, isVisited } = req.body;

    const session = await IvyTestSession.findOne({ studentId });
    if (!session) {
      res.status(404).json({ success: false, message: 'No test session found' });
      return;
    }

    const section = session.sections[sectionIndex];
    if (!section || section.status !== 'in-progress') {
      res.status(400).json({ success: false, message: 'Section is not in progress' });
      return;
    }

    // Check if time has expired
    if (section.startedAt) {
      const elapsed = Math.floor((Date.now() - new Date(section.startedAt).getTime()) / 1000);
      if (elapsed > section.timeLimit + 5) { // 5s grace
        // Auto-submit
        await gradeAndSubmitSection(session, sectionIndex);
        await session.save();
        res.status(400).json({ success: false, message: 'Time expired. Section auto-submitted.' });
        return;
      }
    }

    const question = section.questions[questionIndex];
    if (!question) {
      res.status(400).json({ success: false, message: 'Invalid question index' });
      return;
    }

    if (selectedOption !== undefined) {
      question.selectedOption = selectedOption; // can be null to clear answer
    }
    if (isVisited !== undefined) {
      question.isVisited = true;
    }

    await session.save();
    res.json({ success: true, message: 'Answer saved' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to save answer' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   POST /test-session/submit-section — Submit & grade a section
   Body: { sectionIndex }
   ══════════════════════════════════════════════════════════════════════ */
export const submitSection = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.userId;
    const { sectionIndex } = req.body;

    const session = await IvyTestSession.findOne({ studentId });
    if (!session) {
      res.status(404).json({ success: false, message: 'No test session found' });
      return;
    }

    const section = session.sections[sectionIndex];
    if (!section) {
      res.status(400).json({ success: false, message: 'Invalid section index' });
      return;
    }
    if (section.status === 'submitted') {
      res.status(400).json({ success: false, message: 'Section already submitted' });
      return;
    }
    if (section.status !== 'in-progress') {
      res.status(400).json({ success: false, message: 'Section not started yet' });
      return;
    }

    await gradeAndSubmitSection(session, sectionIndex);
    await session.save();

    const sec = session.sections[sectionIndex];
    res.json({
      success: true,
      message: 'Section submitted and graded',
      sectionScore: sec.score,
      totalScore: session.totalScore,
      status: session.status,
      answered: sec.questions.filter((q) => q.selectedOption !== null).length,
      correct: sec.questions.filter((q) => q.isCorrect === true).length,
      incorrect: sec.questions.filter((q) => q.isCorrect === false).length,
      unanswered: sec.questions.filter((q) => q.selectedOption === null).length,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to submit section' });
  }
};

/* ── Helper: Grade & submit a section ──────────────────────────────── */
async function gradeAndSubmitSection(session: any, sectionIndex: number) {
  const section = session.sections[sectionIndex];

  // Fetch correct answers from DB
  const questionIds = section.questions.map((q: any) => q.questionId);
  const dbQuestions = await IvyTestQuestion.find({ _id: { $in: questionIds } })
    .select('correctOption')
    .lean();

  const correctMap = new Map(dbQuestions.map((q: any) => [q._id.toString(), q.correctOption]));

  let sectionScore = 0;

  for (const q of section.questions) {
    const correctAnswer = correctMap.get(q.questionId.toString());
    if (!q.selectedOption) {
      // Not answered → 0
      q.isCorrect = null;
      q.marksAwarded = 0;
    } else if (q.selectedOption === correctAnswer) {
      // Correct → +2
      q.isCorrect = true;
      q.marksAwarded = 2;
      sectionScore += 2;
    } else {
      // Incorrect → -0.5
      q.isCorrect = false;
      q.marksAwarded = -0.5;
      sectionScore -= 0.5;
    }
  }

  section.score = sectionScore;
  section.status = 'submitted';
  section.submittedAt = new Date();

  // Recalculate total score
  session.totalScore = session.sections.reduce(
    (acc: number, s: any) => acc + (s.status === 'submitted' ? s.score : 0),
    0,
  );

  // Check if all sections are submitted
  const allSubmitted = session.sections.every((s: any) => s.status === 'submitted');
  if (allSubmitted) {
    session.status = 'completed';
  }
}

/* ══════════════════════════════════════════════════════════════════════
   POST /test-session/violation — Record a violation
   ══════════════════════════════════════════════════════════════════════ */
export const recordViolation = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.userId;
    const session = await IvyTestSession.findOne({ studentId });
    if (!session) {
      res.status(404).json({ success: false, message: 'No test session found' });
      return;
    }
    session.violations += 1;
    await session.save();
    res.json({ success: true, violations: session.violations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to record violation' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /test-session/review — Get full answer review (only after test completed)
   Returns all questions with student answers, correct answers, explanations
   ══════════════════════════════════════════════════════════════════════ */
export const getTestReview = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const studentId = req.user!.userId;
    const session = await IvyTestSession.findOne({ studentId });

    if (!session) {
      res.status(404).json({ success: false, message: 'No test session found' });
      return;
    }

    if (session.status !== 'completed') {
      res.status(400).json({ success: false, message: 'Test not yet completed. Complete all sections first.' });
      return;
    }

    // Build review data for each section
    const reviewSections = [];

    for (let i = 0; i < session.sections.length; i++) {
      const section = session.sections[i];
      const questionIds = section.questions.map((q: any) => q.questionId);

      // Fetch full question data including correctOption and explanation
      const dbQuestions = await IvyTestQuestion.find({ _id: { $in: questionIds } }).lean();
      const questionMap = new Map(dbQuestions.map((q: any) => [q._id.toString(), q]));

      const reviewQuestions = section.questions.map((sq: any, idx: number) => {
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

      reviewSections.push({
        sectionName: section.sectionName,
        sectionIndex: i,
        score: section.score,
        maxMarks: section.questionCount * 2,
        questions: reviewQuestions,
      });
    }

    res.json({
      success: true,
      totalScore: session.totalScore,
      maxScore: session.maxScore,
      violations: session.violations,
      sections: reviewSections,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Failed to get test review' });
  }
};
