"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadProgramsFromExcel = exports.getStudentAppliedPrograms = exports.getSuperAdminStudentPrograms = exports.updateProgramSelection = exports.removeProgram = exports.selectProgram = exports.createProgram = exports.getOpsPrograms = exports.getOpsStudentPrograms = exports.getStudentPrograms = void 0;
const Program_1 = __importDefault(require("../models/Program"));
const Ops_1 = __importDefault(require("../models/Ops"));
const Student_1 = __importDefault(require("../models/Student"));
const roles_1 = require("../types/roles");
const User_1 = __importDefault(require("../models/User"));
const XLSX = __importStar(require("xlsx"));
/**
 * Get all programs for a student (added by their assigned OPS)
 */
const getStudentPrograms = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.STUDENT) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student record not found',
            });
        }
        // Get all programs made for this student by any OPS
        // Show all programs where studentId matches, regardless of which OPS created them
        const allPrograms = await Program_1.default.find({
            $or: [
                { studentId: student._id }, // Programs specifically for this student
                { studentId: null }, // General programs (not linked to any student)
                { studentId: { $exists: false } }, // Programs without studentId field
            ],
        })
            .populate({
            path: 'createdBy',
            select: 'firstName middleName lastName email role'
        })
            .sort({ createdAt: -1 });
        // Separate available and applied programs
        const availablePrograms = allPrograms.filter(p => !p.isSelectedByStudent || p.studentId?.toString() !== student._id.toString());
        const appliedPrograms = allPrograms
            .filter(p => p.isSelectedByStudent && p.studentId?.toString() === student._id.toString())
            .sort((a, b) => {
            // Sort by priority first, then by selectedAt
            if (a.priority !== b.priority) {
                return (a.priority || 0) - (b.priority || 0);
            }
            return (a.selectedAt?.getTime() || 0) - (b.selectedAt?.getTime() || 0);
        });
        return res.status(200).json({
            success: true,
            message: 'Programs fetched successfully',
            data: {
                availablePrograms,
                appliedPrograms,
            },
        });
    }
    catch (error) {
        console.error('Get student programs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch programs',
            error: error.message,
        });
    }
};
exports.getStudentPrograms = getStudentPrograms;
/**
 * Get programs for a specific student (Ops view)
 */
const getOpsStudentPrograms = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        // Allow OPS, ADMIN, and COUNSELOR roles
        if (!user || (user.role !== roles_1.USER_ROLE.OPS && user.role !== roles_1.USER_ROLE.ADMIN && user.role !== roles_1.USER_ROLE.COUNSELOR)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        // OPS role verification (skip for ADMIN/COUNSELOR who are read-only)
        if (user.role === roles_1.USER_ROLE.OPS) {
            const ops = await Ops_1.default.findOne({ userId });
            if (!ops) {
                return res.status(404).json({
                    success: false,
                    message: 'Ops record not found',
                });
            }
        }
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required',
            });
        }
        // Get all programs for this student from ANY OPS (not just this OPS)
        // If section is "Applied Program", only return programs selected by the student
        // If section is "all" or not specified, only show programs NOT selected by student (for "Apply to Program")
        const { section } = req.query;
        // If requesting applied programs, only show selected ones
        if (section === 'applied') {
            const query = {
                studentId: studentId,
                isSelectedByStudent: true,
            };
            const programs = await Program_1.default.find(query)
                .populate({
                path: 'createdBy',
                select: 'firstName middleName lastName email role'
            })
                .sort({ priority: 1, selectedAt: 1 });
            return res.status(200).json({
                success: true,
                message: 'Programs fetched successfully',
                data: { programs },
            });
        }
        else {
            // For "Apply to Program", show only programs that are NOT selected
            // $ne: true will match false, null, and undefined (since default is false)
            const query = {
                studentId: studentId,
                isSelectedByStudent: { $ne: true },
            };
            const programs = await Program_1.default.find(query)
                .populate({
                path: 'createdBy',
                select: 'firstName middleName lastName email role'
            })
                .sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                message: 'Programs fetched successfully',
                data: { programs },
            });
        }
    }
    catch (error) {
        console.error('Get OPS student programs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch programs',
            error: error.message,
        });
    }
};
exports.getOpsStudentPrograms = getOpsStudentPrograms;
/**
 * Get all programs for a OPS
 */
const getOpsPrograms = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.OPS) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const ops = await Ops_1.default.findOne({ userId });
        if (!ops) {
            return res.status(404).json({
                success: false,
                message: 'Ops record not found',
            });
        }
        const programs = await Program_1.default.find({ opsId: ops._id })
            .populate('studentId', 'userId')
            .sort({ createdAt: -1 });
        return res.status(200).json({
            success: true,
            message: 'Programs fetched successfully',
            data: { programs },
        });
    }
    catch (error) {
        console.error('Get OPS programs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch programs',
            error: error.message,
        });
    }
};
exports.getOpsPrograms = getOpsPrograms;
/**
 * Create a new program (OPS)
 */
const createProgram = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.OPS && user?.role !== roles_1.USER_ROLE.STUDENT && user?.role !== roles_1.USER_ROLE.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const { studentId, // Optional for OPS/admin: if provided, link program to specific student
        university, universityRanking, programName, programUrl, campus, country, studyLevel, duration, ieltsScore, applicationFee, yearlyTuitionFees, } = req.body;
        // Validate required fields (only 5 fields are required)
        if (!university || !programName || !programUrl || !country || !studyLevel) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: University, Program Name, Program Link, Country, and Study Level are required',
            });
        }
        let opsObjectId;
        let studentObjectId;
        // Handle different user roles
        if (user.role === roles_1.USER_ROLE.STUDENT) {
            // Student creates program for themselves
            const student = await Student_1.default.findOne({ userId });
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student record not found',
                });
            }
            studentObjectId = student._id;
            // No opsId for student-created programs
            opsObjectId = null;
        }
        else if (user.role === roles_1.USER_ROLE.OPS) {
            // Ops creates program
            const ops = await Ops_1.default.findOne({ userId });
            if (!ops) {
                return res.status(404).json({
                    success: false,
                    message: 'Ops record not found',
                });
            }
            opsObjectId = ops._id;
            // If studentId is provided, validate it exists
            if (studentId) {
                const student = await Student_1.default.findById(studentId);
                if (!student) {
                    return res.status(404).json({
                        success: false,
                        message: 'Student not found',
                    });
                }
                studentObjectId = student._id;
            }
        }
        else if (user.role === roles_1.USER_ROLE.SUPER_ADMIN) {
            // Admin creates program - must provide studentId
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required for admin',
                });
            }
            const student = await Student_1.default.findById(studentId);
            if (!student) {
                return res.status(404).json({
                    success: false,
                    message: 'Student not found',
                });
            }
            studentObjectId = student._id;
            // No opsId for admin-created programs
            opsObjectId = null;
        }
        const program = await Program_1.default.create({
            createdBy: userId,
            opsId: opsObjectId,
            studentId: studentObjectId, // Link to specific student if provided
            university,
            universityRanking: universityRanking || {},
            programName,
            programUrl,
            campus,
            country,
            studyLevel,
            duration,
            ieltsScore,
            applicationFee,
            yearlyTuitionFees,
            isSelectedByStudent: false,
        });
        return res.status(201).json({
            success: true,
            message: 'Program created successfully',
            data: { program },
        });
    }
    catch (error) {
        console.error('Create program error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to create program',
            error: error.message,
        });
    }
};
exports.createProgram = createProgram;
/**
 * Student selects a program
 */
const selectProgram = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.STUDENT) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student record not found',
            });
        }
        const { programId, priority, intake, year } = req.body;
        if (!programId || priority === undefined || !intake || !year) {
            return res.status(400).json({
                success: false,
                message: 'Program ID, priority, intake, and year are required',
            });
        }
        const program = await Program_1.default.findById(programId);
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found',
            });
        }
        // Verify the program is made for this student (or is a general program)
        if (program.studentId && program.studentId.toString() !== student._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'This program is not available for you',
            });
        }
        program.studentId = student._id;
        program.priority = priority;
        program.intake = intake;
        program.year = year;
        program.selectedAt = new Date();
        program.isSelectedByStudent = true;
        await program.save();
        return res.status(200).json({
            success: true,
            message: 'Program selected successfully',
            data: { program },
        });
    }
    catch (error) {
        console.error('Select program error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to select program',
            error: error.message,
        });
    }
};
exports.selectProgram = selectProgram;
/**
 * Student removes a program from applied list
 */
const removeProgram = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.STUDENT) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const student = await Student_1.default.findOne({ userId });
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student record not found',
            });
        }
        const { programId } = req.params;
        const program = await Program_1.default.findById(programId);
        if (!program || program.studentId?.toString() !== student._id.toString()) {
            return res.status(404).json({
                success: false,
                message: 'Program not found or not selected by you',
            });
        }
        program.studentId = undefined;
        program.priority = undefined;
        program.intake = undefined;
        program.year = undefined;
        program.selectedAt = undefined;
        program.isSelectedByStudent = false;
        await program.save();
        return res.status(200).json({
            success: true,
            message: 'Program removed successfully',
        });
    }
    catch (error) {
        console.error('Remove program error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to remove program',
            error: error.message,
        });
    }
};
exports.removeProgram = removeProgram;
/**
 * Admin updates program priority, intake, and year
 */
const updateProgramSelection = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const { programId } = req.params;
        const { priority, intake, year } = req.body;
        if (priority === undefined || !intake || !year) {
            return res.status(400).json({
                success: false,
                message: 'Priority, intake, and year are required',
            });
        }
        const program = await Program_1.default.findById(programId);
        if (!program) {
            return res.status(404).json({
                success: false,
                message: 'Program not found',
            });
        }
        program.priority = priority;
        program.intake = intake;
        program.year = year;
        await program.save();
        return res.status(200).json({
            success: true,
            message: 'Program updated successfully',
            data: { program },
        });
    }
    catch (error) {
        console.error('Update program selection error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update program',
            error: error.message,
        });
    }
};
exports.updateProgramSelection = updateProgramSelection;
/**
 * Get programs for a specific student (super admin view) - only filter by studentId, not opsId
 */
const getSuperAdminStudentPrograms = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required',
            });
        }
        // Get all programs for this student (only filter by studentId, not opsId)
        // If section is "Applied Program", only return programs selected by the student
        // If section is "all" or not specified, only show programs NOT selected by student (for "Apply to Program")
        const { section } = req.query;
        // If requesting applied programs, only show selected ones
        if (section === 'applied') {
            const query = {
                studentId: studentId,
                isSelectedByStudent: true,
            };
            const programs = await Program_1.default.find(query)
                .populate({
                path: 'createdBy',
                select: 'firstName middleName lastName email role'
            })
                .sort({ priority: 1, selectedAt: 1 });
            return res.status(200).json({
                success: true,
                message: 'Programs fetched successfully',
                data: { programs },
            });
        }
        else {
            // For "Apply to Program", show only programs that are NOT selected
            // $ne: true will match false, null, and undefined (since default is false)
            const query = {
                studentId: studentId,
                isSelectedByStudent: { $ne: true },
            };
            const programs = await Program_1.default.find(query)
                .populate({
                path: 'createdBy',
                select: 'firstName middleName lastName email role'
            })
                .sort({ createdAt: -1 });
            return res.status(200).json({
                success: true,
                message: 'Programs fetched successfully',
                data: { programs },
            });
        }
    }
    catch (error) {
        console.error('Get admin student programs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch programs',
            error: error.message,
        });
    }
};
exports.getSuperAdminStudentPrograms = getSuperAdminStudentPrograms;
/**
 * Get applied programs for a student (admin view) - kept for backward compatibility
 */
const getStudentAppliedPrograms = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        const { studentId } = req.params;
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'Student ID is required',
            });
        }
        // Get all programs selected by this student
        const programs = await Program_1.default.find({
            studentId: studentId,
            isSelectedByStudent: true,
        })
            .populate({
            path: 'createdBy',
            select: 'firstName middleName lastName email role'
        })
            .sort({ priority: 1, selectedAt: 1 });
        return res.status(200).json({
            success: true,
            message: 'Applied programs fetched successfully',
            data: { programs },
        });
    }
    catch (error) {
        console.error('Get student applied programs error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch applied programs',
            error: error.message,
        });
    }
};
exports.getStudentAppliedPrograms = getStudentAppliedPrograms;
/**
 * Upload programs from Excel file
 */
const uploadProgramsFromExcel = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await User_1.default.findById(userId);
        if (user?.role !== roles_1.USER_ROLE.OPS && user?.role !== roles_1.USER_ROLE.SUPER_ADMIN) {
            return res.status(403).json({
                success: false,
                message: 'Access denied',
            });
        }
        // Get OPS record if user is OPS
        let ops = null;
        if (user.role === roles_1.USER_ROLE.OPS) {
            ops = await Ops_1.default.findOne({ userId });
            if (!ops) {
                return res.status(404).json({
                    success: false,
                    message: 'OPS record not found',
                });
            }
        }
        // Check if file is uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded',
            });
        }
        // Read Excel file
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);
        const programs = [];
        const errors = [];
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                // Map Excel columns to program fields
                // Expected columns: University, Program Name, Program Link (or Website URL), Campus, Country, Study Level, Duration, IELTS Score, Application Fee, Yearly Tuition Fees, Webometrics World, Webometrics National, US News, QS
                // Helper function to get value from row with multiple possible column names
                const getValue = (keys) => {
                    for (const key of keys) {
                        if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
                            return row[key];
                        }
                    }
                    return '';
                };
                const getNumber = (keys, defaultValue = 0) => {
                    const value = getValue(keys);
                    if (value === '' || value === undefined || value === null)
                        return defaultValue;
                    // Handle string numbers with commas, currency symbols, or other formatting
                    let cleanValue = String(value).replace(/,/g, '').replace(/£/g, '').replace(/\$/g, '').trim();
                    // Remove any non-numeric characters except decimal point
                    cleanValue = cleanValue.replace(/[^\d.]/g, '');
                    const num = parseFloat(cleanValue);
                    return isNaN(num) ? defaultValue : num;
                };
                const getInt = (keys) => {
                    const value = getValue(keys);
                    if (value === '' || value === undefined || value === null)
                        return undefined;
                    const num = typeof value === 'number' ? value : parseInt(String(value));
                    return isNaN(num) ? undefined : num;
                };
                // Get studentId from request body if provided
                const studentId = req.body.studentId;
                // Validate studentId if provided
                let studentObjectId = undefined;
                if (studentId) {
                    const student = await Student_1.default.findById(studentId);
                    if (!student) {
                        errors.push({
                            row: i + 2,
                            error: 'Student not found',
                        });
                        continue;
                    }
                    studentObjectId = student._id;
                }
                const programData = {
                    createdBy: userId, // Track who created the program
                    studentId: studentObjectId, // Link to specific student if provided
                    university: getValue(['University', 'university', 'UNIVERSITY']),
                    programName: getValue(['Program Name', 'programName', 'Program', 'program']),
                    programUrl: getValue(['Program Link', 'programLink', 'Website URL', 'programUrl', 'Website', 'website', 'URL', 'url']),
                    campus: getValue(['Campus', 'campus', 'CAMPUS']),
                    country: getValue(['Country', 'country', 'COUNTRY']),
                    studyLevel: getValue(['Study Level', 'studyLevel', 'Level', 'level']) || 'Postgraduate',
                    duration: getNumber(['Duration', 'duration', 'DURATION'], 12),
                    ieltsScore: getNumber(['IELTS Score', 'ieltsScore', 'IELTS', 'ielts'], 0),
                    applicationFee: getNumber(['Application Fee', 'applicationFee', 'Fee', 'fee'], 0),
                    yearlyTuitionFees: getNumber(['Yearly Tuition Fees', 'yearlyTuitionFees', 'Tuition', 'tuition'], 0),
                    universityRanking: {
                        webometricsWorld: getInt(['Webometrics World', 'webometricsWorld', 'Webometrics World Ranking']),
                        webometricsNational: getInt(['Webometrics Continent', 'webometricsContinent', 'Webometrics National', 'webometricsNational', 'Webometrics National Ranking']),
                        usNews: getInt(['US News', 'usNews', 'US News Ranking']),
                        qs: getInt(['QS Ranking', 'QS', 'qs', 'qsRanking']),
                    },
                    isSelectedByStudent: false,
                };
                // Validate required fields (only 5 fields are required)
                if (!programData.university || !programData.programName || !programData.programUrl ||
                    !programData.country || !programData.studyLevel) {
                    errors.push({
                        row: i + 2, // +2 because Excel rows start at 1 and we have header
                        error: 'Missing required fields: University, Program Name, Website URL, Country, and Study Level are required',
                    });
                    continue;
                }
                const program = await Program_1.default.create(programData);
                programs.push(program);
            }
            catch (error) {
                errors.push({
                    row: i + 2,
                    error: error.message || 'Failed to create program',
                });
            }
        }
        return res.status(200).json({
            success: true,
            message: `Successfully imported ${programs.length} programs${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
            data: {
                imported: programs.length,
                errors: errors.length,
                errorDetails: errors,
            },
        });
    }
    catch (error) {
        console.error('Upload programs from Excel error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to upload programs from Excel',
            error: error.message,
        });
    }
};
exports.uploadProgramsFromExcel = uploadProgramsFromExcel;
//# sourceMappingURL=programController.js.map