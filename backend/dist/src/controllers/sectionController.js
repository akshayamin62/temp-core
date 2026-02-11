"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSectionOrder = exports.removeSectionFromService = exports.addSectionToService = exports.toggleSectionStatus = exports.updateSection = exports.getSectionById = exports.getAllSections = exports.createSection = void 0;
const FormSection_1 = __importDefault(require("../models/FormSection"));
const ServiceSection_1 = require("../models/ServiceSection");
const Question_1 = require("../models/Question");
/**
 * @desc    Create a new section
 * @route   POST /api/admin/sections
 * @access  Private (Admin only)
 */
const createSection = async (req, res) => {
    try {
        const { title, description, isRepeatable, minRepeats, maxRepeats, questions, isGlobal, } = req.body;
        if (!title) {
            return res.status(400).json({
                success: false,
                message: 'Title is required',
            });
        }
        // Validate questions if provided
        if (questions && questions.length > 0) {
            const questionIds = questions.map((q) => q.question);
            const existingQuestions = await Question_1.Question.find({
                _id: { $in: questionIds },
                isActive: true,
            });
            if (existingQuestions.length !== questionIds.length) {
                return res.status(400).json({
                    success: false,
                    message: 'One or more questions are invalid or inactive',
                });
            }
        }
        const section = await FormSection_1.default.create({
            title,
            description,
            isRepeatable: isRepeatable || false,
            minRepeats: minRepeats || 0,
            maxRepeats,
            questions: questions || [],
            isGlobal: isGlobal || false,
            createdBy: req.user.userId,
            usedInServices: [],
        });
        const populatedSection = await FormSection_1.default.findById(section._id).populate('questions.question');
        return res.status(201).json({
            success: true,
            message: 'Section created successfully',
            data: { section: populatedSection },
        });
    }
    catch (error) {
        console.error('Error creating section:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.createSection = createSection;
/**
 * @desc    Get all sections (global or all)
 * @route   GET /api/admin/sections
 * @access  Private (Admin only)
 */
const getAllSections = async (req, res) => {
    try {
        const { isGlobal, isActive, search } = req.query;
        const filter = {};
        if (isGlobal !== undefined) {
            filter.isGlobal = isGlobal === 'true';
        }
        if (isActive !== undefined) {
            filter.isActive = isActive === 'true';
        }
        if (search) {
            filter.title = { $regex: search, $options: 'i' };
        }
        const sections = await FormSection_1.default.find(filter)
            .populate('questions.question')
            .populate('usedInServices', 'name')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            data: {
                sections,
                count: sections.length,
            },
        });
    }
    catch (error) {
        console.error('Error fetching sections:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getAllSections = getAllSections;
/**
 * @desc    Get section by ID
 * @route   GET /api/admin/sections/:id
 * @access  Private (Admin only)
 */
const getSectionById = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await FormSection_1.default.findById(id)
            .populate('questions.question')
            .populate('usedInServices', 'name');
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found',
            });
        }
        return res.status(200).json({
            success: true,
            data: { section },
        });
    }
    catch (error) {
        console.error('Error fetching section:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.getSectionById = getSectionById;
/**
 * @desc    Update section (with reusability logic)
 * @route   PUT /api/admin/sections/:id
 * @access  Private (Admin only)
 */
const updateSection = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, isRepeatable, minRepeats, maxRepeats, questions, isActive, isGlobal, } = req.body;
        const section = await FormSection_1.default.findById(id);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found',
            });
        }
        // Check if section is used in any service
        const isUsedInServices = section.usedInServices && section.usedInServices.length > 0;
        // If section is used in services, only allow appending questions
        if (isUsedInServices && questions) {
            const existingQuestionIds = (section.questions || []).map((q) => q.question.toString());
            const newQuestionIds = questions.map((q) => q.question);
            // Check if any existing questions are being removed
            const removedQuestions = existingQuestionIds.filter((id) => !newQuestionIds.includes(id));
            if (removedQuestions.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot remove questions from a section that is already used in services. You can only append new questions.',
                });
            }
            // Validate new questions
            const addedQuestions = newQuestionIds.filter((id) => !existingQuestionIds.includes(id));
            if (addedQuestions.length > 0) {
                const validQuestions = await Question_1.Question.find({
                    _id: { $in: addedQuestions },
                    isActive: true,
                });
                if (validQuestions.length !== addedQuestions.length) {
                    return res.status(400).json({
                        success: false,
                        message: 'One or more new questions are invalid or inactive',
                    });
                }
            }
        }
        // Update fields
        if (title !== undefined)
            section.title = title;
        if (description !== undefined)
            section.description = description;
        if (isRepeatable !== undefined)
            section.isRepeatable = isRepeatable;
        if (minRepeats !== undefined)
            section.minRepeats = minRepeats;
        if (maxRepeats !== undefined)
            section.maxRepeats = maxRepeats;
        if (questions !== undefined)
            section.questions = questions;
        if (isActive !== undefined)
            section.isActive = isActive;
        if (isGlobal !== undefined)
            section.isGlobal = isGlobal;
        await section.save();
        const updatedSection = await FormSection_1.default.findById(id).populate('questions.question');
        return res.status(200).json({
            success: true,
            message: 'Section updated successfully',
            data: { section: updatedSection },
        });
    }
    catch (error) {
        console.error('Error updating section:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.updateSection = updateSection;
/**
 * @desc    Toggle section active status
 * @route   PATCH /api/sections/:id/toggle-status
 * @access  Private (Admin only)
 */
const toggleSectionStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const section = await FormSection_1.default.findById(id);
        if (!section) {
            return res.status(404).json({
                success: false,
                message: 'Section not found',
            });
        }
        section.isActive = !section.isActive;
        await section.save();
        return res.status(200).json({
            success: true,
            message: `Section ${section.isActive ? 'activated' : 'deactivated'} successfully`,
            data: { section },
        });
    }
    catch (error) {
        console.error('Error toggling section status:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.toggleSectionStatus = toggleSectionStatus;
/**
 * @desc    Add section to service
 * @route   POST /api/admin/services/:serviceId/sections
 * @access  Private (Admin only)
 */
const addSectionToService = async (req, res) => {
    try {
        const { serviceId } = req.params;
        const { sectionId, order } = req.body;
        if (!sectionId) {
            return res.status(400).json({
                success: false,
                message: 'Section ID is required',
            });
        }
        // Check if section exists
        const section = await FormSection_1.default.findById(sectionId);
        if (!section || !section.isActive) {
            return res.status(404).json({
                success: false,
                message: 'Section not found or inactive',
            });
        }
        // Check if section is already added to this service
        const existingLink = await ServiceSection_1.ServiceSection.findOne({
            service: serviceId,
            section: sectionId,
        });
        if (existingLink) {
            return res.status(400).json({
                success: false,
                message: 'Section is already added to this service',
            });
        }
        // Add service to section's usedInServices
        if (!(section.usedInServices || []).includes(serviceId)) {
            (section.usedInServices = section.usedInServices || []).push(serviceId);
            await section.save();
        }
        // Create service-section link
        const serviceSection = await ServiceSection_1.ServiceSection.create({
            service: serviceId,
            section: sectionId,
            order: order || 0,
        });
        const populated = await ServiceSection_1.ServiceSection.findById(serviceSection._id).populate('section');
        return res.status(201).json({
            success: true,
            message: 'Section added to service successfully',
            data: { serviceSection: populated },
        });
    }
    catch (error) {
        console.error('Error adding section to service:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.addSectionToService = addSectionToService;
/**
 * @desc    Remove section from service
 * @route   DELETE /api/admin/services/:serviceId/sections/:sectionId
 * @access  Private (Admin only)
 */
const removeSectionFromService = async (req, res) => {
    try {
        const { serviceId, sectionId } = req.params;
        const serviceSection = await ServiceSection_1.ServiceSection.findOneAndDelete({
            service: serviceId,
            section: sectionId,
        });
        if (!serviceSection) {
            return res.status(404).json({
                success: false,
                message: 'Section not found in this service',
            });
        }
        // Remove service from section's usedInServices
        const section = await FormSection_1.default.findById(sectionId);
        if (section) {
            section.usedInServices = (section.usedInServices || []).filter((id) => id.toString() !== serviceId);
            await section.save();
        }
        return res.status(200).json({
            success: true,
            message: 'Section removed from service successfully',
        });
    }
    catch (error) {
        console.error('Error removing section from service:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.removeSectionFromService = removeSectionFromService;
/**
 * @desc    Update section order in service
 * @route   PATCH /api/admin/services/:serviceId/sections/:sectionId/order
 * @access  Private (Admin only)
 */
const updateSectionOrder = async (req, res) => {
    try {
        const { serviceId, sectionId } = req.params;
        const { order } = req.body;
        if (order === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Order is required',
            });
        }
        const serviceSection = await ServiceSection_1.ServiceSection.findOne({
            service: serviceId,
            section: sectionId,
        });
        if (!serviceSection) {
            return res.status(404).json({
                success: false,
                message: 'Section not found in this service',
            });
        }
        serviceSection.order = order;
        await serviceSection.save();
        return res.status(200).json({
            success: true,
            message: 'Section order updated successfully',
            data: { serviceSection },
        });
    }
    catch (error) {
        console.error('Error updating section order:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message,
        });
    }
};
exports.updateSectionOrder = updateSectionOrder;
//# sourceMappingURL=sectionController.js.map