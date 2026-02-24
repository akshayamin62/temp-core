import express from 'express';
import {
  createIvyTestQuestion,
  getIvyTestQuestions,
  getIvyTestQuestionById,
  updateIvyTestQuestion,
  deleteIvyTestQuestion,
  toggleIvyTestQuestionActive,
  ivyTestQuestionImageUpload,
} from '../controllers/ivyTestQuestion.controller';

const router = express.Router();

// POST   /api/ivy/test-questions          — Create question (with optional image)
router.post('/', ivyTestQuestionImageUpload, createIvyTestQuestion);

// GET    /api/ivy/test-questions          — List all (section / difficulty / isActive filters via query)
router.get('/', getIvyTestQuestions);

// GET    /api/ivy/test-questions/:id      — Get single question
router.get('/:id', getIvyTestQuestionById);

// PUT    /api/ivy/test-questions/:id      — Update question (with optional new image)
router.put('/:id', ivyTestQuestionImageUpload, updateIvyTestQuestion);

// DELETE /api/ivy/test-questions/:id      — Delete question
router.delete('/:id', deleteIvyTestQuestion);

// PATCH  /api/ivy/test-questions/:id/toggle — Toggle active/inactive
router.patch('/:id/toggle', toggleIvyTestQuestionActive);

export default router;
