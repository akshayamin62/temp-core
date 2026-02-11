"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getQuestionMetadata = exports.toggleQuestionStatus = exports.updateQuestion = exports.getQuestionById = exports.getAllQuestions = exports.createQuestion = void 0;
const Question_1 = require("../models/Question");
/**
 * @desc    Create a new question
 * @route   POST /api/admin/questions
 * @access  Private (Admin only)
 */
const createQuestion = async (req, res) => {
    try {
        const { label, type, options, editPolicy } = req.body;
        // Validation
        if (!label || !type) {
            return res.status(400).json({
                success: false,
                message: 'Label and type are required',
            });
        }
        // Validate type
        if (!Object.values(Question_1.QuestionType).includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question type',
            });
        }
        // Validate options for select/multiselect
        if ((type === Question_1.QuestionType.SELECT || type === Question_1.QuestionType.MULTISELECT) &&
            (!options || options.length === 0)) {
            return res.status(400).json({
                success: false,
                message: 'Options are required for select/multiselect question types',
            });
        }
        // Validate editPolicy
        if (editPolicy && !Object.values(Question_1.EditPolicy).includes(editPolicy)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid edit policy',
            });
        }
        const question = await Question_1.Question.create({
            label,
            type,
            options: options || [],
            editPolicy: editPolicy || Question_1.EditPolicy.STUDENT,
        });
        return res.status(201).json({
            success: true,
            message: 'Question created successfully',
            data: { question },
        });
    }
    catch (error) {
        console.error('Error creating question:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.createQuestion = createQuestion;
/**
 * @desc    Get all questions with filters
 * @route   GET /api/admin/questions
 * @access  Private (Admin only)
 */
const getAllQuestions = async (req, res) => {
    try {
        const { type, editPolicy, isActive, search } = req.query;
        // Build filter
        const filter = {};
        if (type) {
            filter.type = type;
        }
        if (editPolicy) {
            filter.editPolicy = editPolicy;
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }
        if (search) {
            filter.label = { $regex: search, $options: 'i' };
        }
        const questions = await Question_1.Question.find(filter).sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: {
                questions,
                count: questions.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching questions:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getAllQuestions = getAllQuestions;
/**
 * @desc    Get question by ID
 * @route   GET /api/admin/questions/:id
 * @access  Private (Admin only)
 */
const getQuestionById = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await Question_1.Question.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }
        return res.status(200).json({
            success: true,
            data: { question },
        });
    }
    catch (error) {
        console.error('Error fetching question:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getQuestionById = getQuestionById;
/**
 * @desc    Update question
 * @route   PUT /api/admin/questions/:id
 * @access  Private (Admin only)
 */
const updateQuestion = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, type, options, editPolicy, isActive } = req.body;
        const question = await Question_1.Question.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }
        // Validate type if provided
        if (type && !Object.values(Question_1.QuestionType).includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid question type',
            });
        }
        // Validate options if type is select/multiselect
        const finalType = type || question.type;
        if ((finalType === Question_1.QuestionType.SELECT || finalType === Question_1.QuestionType.MULTISELECT)) {
            const finalOptions = options !== undefined ? options : question.options;
            if (!finalOptions || finalOptions.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Options are required for select/multiselect question types',
                });
            }
        }
        // Validate editPolicy if provided
        if (editPolicy && !Object.values(Question_1.EditPolicy).includes(editPolicy)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid edit policy',
            });
        }
        // Update fields
        if (label !== undefined)
            question.label = label;
        if (type !== undefined)
            question.type = type;
        if (options !== undefined)
            question.options = options;
        if (editPolicy !== undefined)
            question.editPolicy = editPolicy;
        if (isActive !== undefined)
            question.isActive = isActive;
        await question.save();
        return res.status(200).json({
            success: true,
            message: 'Question updated successfully',
            data: { question },
        });
    }
    catch (error) {
        console.error('Error updating question:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.updateQuestion = updateQuestion;
/**
 * @desc    Toggle question active status
 * @route   PATCH /api/questions/:id/toggle-status
 * @access  Private (Admin only)
 */
const toggleQuestionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const question = await Question_1.Question.findById(id);
        if (!question) {
            return res.status(404).json({
                success: false,
                message: 'Question not found',
            });
        }
        // Toggle status
        question.isActive = !question.isActive;
        await question.save();
        return res.status(200).json({
            success: true,
            message: `Question ${question.isActive ? 'activated' : 'deactivated'} successfully`,
            data: { question },
        });
    }
    catch (error) {
        console.error('Error toggling question status:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.toggleQuestionStatus = toggleQuestionStatus;
/**
 * @desc    Get question types and edit policies (for frontend dropdowns)
 * @route   GET /api/admin/questions/metadata
 * @access  Private (Admin only)
 */
const getQuestionMetadata = async (_req, res) => {
    try {
        return res.status(200).json({
            success: true,
            data: {
                questionTypes: Object.values(Question_1.QuestionType),
                editPolicies: Object.values(Question_1.EditPolicy),
            },
        });
    }
    catch (error) {
        console.error('Error fetching metadata:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getQuestionMetadata = getQuestionMetadata;
//# sourceMappingURL=questionController.js.map