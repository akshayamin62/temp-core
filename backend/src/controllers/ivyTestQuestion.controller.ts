import { Request, Response } from 'express';
import IvyTestQuestion from '../models/ivy/IvyTestQuestion';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// ── Multer config for question images ────────────────────────────────
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WEBP) are allowed'));
    }
  },
});

export const ivyTestQuestionImageUpload = upload.single('questionImage');

// ── Create question ──────────────────────────────────────────────────
export const createIvyTestQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { section, questionText, options, correctOption, explanation } =
      req.body;

    if (!section || !questionText || !options || !correctOption) {
      res.status(400).json({ success: false, message: 'Section, question text, options, and correct option are required' });
      return;
    }

    // Parse options (sent as JSON string from FormData)
    let parsedOptions;
    try {
      parsedOptions = typeof options === 'string' ? JSON.parse(options) : options;
    } catch {
      res.status(400).json({ success: false, message: 'Options must be a valid JSON array' });
      return;
    }

    if (!Array.isArray(parsedOptions) || parsedOptions.length < 2) {
      res.status(400).json({ success: false, message: 'At least 2 options are required' });
      return;
    }

    // Validate correct option exists in provided options
    const optionLabels = parsedOptions.map((o: any) => o.label);
    if (!optionLabels.includes(correctOption)) {
      res.status(400).json({
        success: false,
        message: `Correct option "${correctOption}" does not match any option label (${optionLabels.join(', ')})`,
      });
      return;
    }

    // Handle image upload
    let questionImageUrl: string | null = null;
    if (req.file) {
      const uploadDir = path.join(getUploadBaseDir(), 'ivy-test-questions');
      ensureDir(uploadDir);

      const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      questionImageUrl = `/uploads/ivy-test-questions/${fileName}`;
    }

    const question = new IvyTestQuestion({
      section,
      questionText,
      questionImageUrl,
      options: parsedOptions,
      correctOption,
      marks: 2,
      explanation: explanation || null,
    });

    await question.save();

    res.json({ success: true, message: 'Question created successfully', data: question });
  } catch (error: any) {
    console.error('Error creating ivy test question:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create question' });
  }
};

// ── Get all questions (with optional section filter) ─────────────────
export const getIvyTestQuestions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { section, isActive } = req.query;

    const filter: any = {};
    if (section) filter.section = section;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const questions = await IvyTestQuestion.find(filter).sort({ section: 1, createdAt: -1 });

    // Aggregate counts per section
    const sectionCounts = await IvyTestQuestion.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$section', count: { $sum: 1 }, totalMarks: { $sum: '$marks' } } },
    ]);

    res.json({ success: true, data: questions, sectionCounts });
  } catch (error: any) {
    console.error('Error fetching ivy test questions:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch questions' });
  }
};

// ── Get single question ──────────────────────────────────────────────
export const getIvyTestQuestionById = async (req: Request, res: Response): Promise<void> => {
  try {
    const question = await IvyTestQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }
    res.json({ success: true, data: question });
  } catch (error: any) {
    console.error('Error fetching ivy test question:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch question' });
  }
};

// ── Update question ──────────────────────────────────────────────────
export const updateIvyTestQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const question = await IvyTestQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    const { section, questionText, options, correctOption, explanation, isActive } =
      req.body;

    if (section) question.section = section;
    if (questionText) question.questionText = questionText;
    if (explanation !== undefined) question.explanation = explanation || null;
    if (isActive !== undefined) question.isActive = isActive === 'true' || isActive === true;

    if (options) {
      const parsed = typeof options === 'string' ? JSON.parse(options) : options;
      question.options = parsed;
    }

    if (correctOption) question.correctOption = correctOption;

    // Handle new image upload
    if (req.file) {
      // Delete old image if it exists
      if (question.questionImageUrl) {
        const oldPath = path.join(getUploadBaseDir(), question.questionImageUrl.replace('/uploads/', ''));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }

      const uploadDir = path.join(getUploadBaseDir(), 'ivy-test-questions');
      ensureDir(uploadDir);

      const fileName = `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const filePath = path.join(uploadDir, fileName);
      fs.writeFileSync(filePath, req.file.buffer);

      question.questionImageUrl = `/uploads/ivy-test-questions/${fileName}`;
    }

    await question.save();

    res.json({ success: true, message: 'Question updated successfully', data: question });
  } catch (error: any) {
    console.error('Error updating ivy test question:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to update question' });
  }
};

// ── Delete question ──────────────────────────────────────────────────
export const deleteIvyTestQuestion = async (req: Request, res: Response): Promise<void> => {
  try {
    const question = await IvyTestQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    // Delete image from disk
    if (question.questionImageUrl) {
      const imgPath = path.join(getUploadBaseDir(), question.questionImageUrl.replace('/uploads/', ''));
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    await IvyTestQuestion.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Question deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting ivy test question:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to delete question' });
  }
};

// ── Toggle active status ─────────────────────────────────────────────
export const toggleIvyTestQuestionActive = async (req: Request, res: Response): Promise<void> => {
  try {
    const question = await IvyTestQuestion.findById(req.params.id);
    if (!question) {
      res.status(404).json({ success: false, message: 'Question not found' });
      return;
    }

    question.isActive = !question.isActive;
    await question.save();

    res.json({
      success: true,
      message: `Question ${question.isActive ? 'activated' : 'deactivated'} successfully`,
      data: question,
    });
  } catch (error: any) {
    console.error('Error toggling ivy test question:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to toggle question' });
  }
};
