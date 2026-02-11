"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getServiceByStudentId = exports.getStudentIvyServiceById = exports.updateStudentInterest = exports.getStudentsForIvyExpert = exports.createStudentIvyService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const IvyExpert_1 = __importDefault(require("../models/IvyExpert"));
const Student_1 = __importDefault(require("../models/Student"));
const User_1 = __importDefault(require("../models/ivy/User"));
const Service_1 = __importDefault(require("../models/Service"));
/** Helper: get the Ivy League service ObjectId (cached per process) */
let _ivyServiceId = null;
const getIvyLeagueServiceId = async () => {
    if (_ivyServiceId)
        return _ivyServiceId;
    const svc = await Service_1.default.findOne({ slug: 'ivy-league' }).select('_id');
    if (svc)
        _ivyServiceId = svc._id;
    return _ivyServiceId;
};
const createStudentIvyService = async (studentUserId, ivyExpertUserId) => {
    // Validate ObjectId format
    if (!mongoose_1.default.Types.ObjectId.isValid(studentUserId)) {
        throw new Error('Invalid student ID format');
    }
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertUserId)) {
        throw new Error('Invalid Ivy Expert ID format');
    }
    // Validate both Users exist
    const studentUser = await User_1.default.findById(studentUserId);
    if (!studentUser) {
        throw new Error('Student not found');
    }
    const ivyExpertUser = await User_1.default.findById(ivyExpertUserId);
    if (!ivyExpertUser) {
        throw new Error('Ivy Expert not found');
    }
    // Find the Student record
    const student = await Student_1.default.findOne({ userId: studentUserId });
    if (!student) {
        throw new Error('Student record not found');
    }
    // Find the IvyExpert record (activeIvyExpertId stores IvyExpert._id)
    const ivyExpert = await IvyExpert_1.default.findOne({ userId: ivyExpertUserId });
    if (!ivyExpert) {
        throw new Error('IvyExpert record not found for this user');
    }
    // Find the Ivy League service
    const ivyServiceId = await getIvyLeagueServiceId();
    // Find an existing Ivy League registration for this student
    const serviceFilter = { studentId: student._id, activeIvyExpertId: { $exists: false } };
    if (ivyServiceId)
        serviceFilter.serviceId = ivyServiceId;
    const registration = await StudentServiceRegistration_1.default.findOne(serviceFilter);
    if (!registration) {
        // Check if already assigned
        const assignedFilter = { studentId: student._id, activeIvyExpertId: { $exists: true, $ne: null } };
        if (ivyServiceId)
            assignedFilter.serviceId = ivyServiceId;
        const existingAssignment = await StudentServiceRegistration_1.default.findOne(assignedFilter);
        if (existingAssignment) {
            throw new Error('Student already has an Ivy Expert assigned');
        }
        throw new Error('No service registration found for this student');
    }
    // Update the registration with the ivy expert (store IvyExpert._id, not User._id)
    registration.activeIvyExpertId = ivyExpert._id;
    await registration.save();
    return registration;
};
exports.createStudentIvyService = createStudentIvyService;
const getStudentsForIvyExpert = async (ivyExpertId) => {
    // ivyExpertId is IvyExpert._id (NOT User._id)
    if (!mongoose_1.default.Types.ObjectId.isValid(ivyExpertId)) {
        throw new Error('Invalid Ivy Expert ID format');
    }
    const registrations = await StudentServiceRegistration_1.default.find({ activeIvyExpertId: new mongoose_1.default.Types.ObjectId(ivyExpertId) })
        .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'firstName lastName email' }
    })
        .sort({ createdAt: -1 });
    // Transform to match expected frontend shape
    return registrations.map((reg) => ({
        _id: reg._id,
        studentId: {
            _id: reg.studentId?._id,
            userId: reg.studentId?.userId?._id,
            firstName: reg.studentId?.userId?.firstName || '',
            lastName: reg.studentId?.userId?.lastName || '',
            email: reg.studentId?.userId?.email || reg.studentId?.email || '',
        },
        status: reg.status,
        overallScore: reg.overallScore,
        studentInterest: reg.studentInterest,
        createdAt: reg.createdAt,
    }));
};
exports.getStudentsForIvyExpert = getStudentsForIvyExpert;
const updateStudentInterest = async (registrationId, interest) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(registrationId)) {
        throw new Error('Invalid registration ID');
    }
    const registration = await StudentServiceRegistration_1.default.findByIdAndUpdate(registrationId, { studentInterest: interest }, { new: true });
    if (!registration) {
        throw new Error('Registration not found');
    }
    return registration;
};
exports.updateStudentInterest = updateStudentInterest;
const getStudentIvyServiceById = async (registrationId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(registrationId)) {
        throw new Error('Invalid registration ID');
    }
    const reg = await StudentServiceRegistration_1.default.findById(registrationId)
        .populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'firstName lastName email' }
    });
    if (!reg)
        return null;
    // Transform to match expected shape
    const regObj = reg.toObject();
    return {
        ...regObj,
        studentId: {
            _id: regObj.studentId?._id,
            userId: regObj.studentId?.userId?._id,
            firstName: regObj.studentId?.userId?.firstName || '',
            lastName: regObj.studentId?.userId?.lastName || '',
            email: regObj.studentId?.userId?.email || regObj.studentId?.email || '',
        },
    };
};
exports.getStudentIvyServiceById = getStudentIvyServiceById;
const getServiceByStudentId = async (studentUserId) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(studentUserId)) {
        throw new Error('Invalid student ID');
    }
    // Find Student record by userId
    const student = await Student_1.default.findOne({ userId: studentUserId });
    if (!student)
        return null;
    // Find the Ivy League service registration specifically
    const ivyServiceId = await getIvyLeagueServiceId();
    const filter = { studentId: student._id };
    if (ivyServiceId)
        filter.serviceId = ivyServiceId;
    const reg = await StudentServiceRegistration_1.default.findOne(filter).populate({
        path: 'studentId',
        populate: { path: 'userId', select: 'firstName lastName email' }
    });
    if (!reg)
        return null;
    const regObj = reg.toObject();
    return {
        ...regObj,
        studentId: {
            _id: regObj.studentId?._id,
            userId: regObj.studentId?.userId?._id,
            firstName: regObj.studentId?.userId?.firstName || '',
            lastName: regObj.studentId?.userId?.lastName || '',
            email: regObj.studentId?.userId?.email || regObj.studentId?.email || '',
        },
    };
};
exports.getServiceByStudentId = getServiceByStudentId;
//# sourceMappingURL=ivyService.service.js.map