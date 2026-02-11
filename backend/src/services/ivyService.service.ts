import mongoose from 'mongoose';
import StudentServiceRegistration, { IStudentServiceRegistration } from '../models/StudentServiceRegistration';
import IvyExpert from '../models/IvyExpert';
import Student from '../models/Student';
import User from '../models/ivy/User';
import Service from '../models/Service';

/** Helper: get the Ivy League service ObjectId (cached per process) */
let _ivyServiceId: mongoose.Types.ObjectId | null = null;
const getIvyLeagueServiceId = async (): Promise<mongoose.Types.ObjectId | null> => {
  if (_ivyServiceId) return _ivyServiceId;
  const svc = await Service.findOne({ slug: 'ivy-league' }).select('_id');
  if (svc) _ivyServiceId = svc._id as mongoose.Types.ObjectId;
  return _ivyServiceId;
};

export const createStudentIvyService = async (
  studentUserId: string,
  ivyExpertUserId: string
): Promise<IStudentServiceRegistration> => {
  // Validate ObjectId format
  if (!mongoose.Types.ObjectId.isValid(studentUserId)) {
    throw new Error('Invalid student ID format');
  }
  if (!mongoose.Types.ObjectId.isValid(ivyExpertUserId)) {
    throw new Error('Invalid Ivy Expert ID format');
  }

  // Validate both Users exist
  const studentUser = await User.findById(studentUserId);
  if (!studentUser) {
    throw new Error('Student not found');
  }

  const ivyExpertUser = await User.findById(ivyExpertUserId);
  if (!ivyExpertUser) {
    throw new Error('Ivy Expert not found');
  }

  // Find the Student record
  const student = await Student.findOne({ userId: studentUserId });
  if (!student) {
    throw new Error('Student record not found');
  }

  // Find the IvyExpert record (activeIvyExpertId stores IvyExpert._id)
  const ivyExpert = await IvyExpert.findOne({ userId: ivyExpertUserId });
  if (!ivyExpert) {
    throw new Error('IvyExpert record not found for this user');
  }

  // Find the Ivy League service
  const ivyServiceId = await getIvyLeagueServiceId();

  // Find an existing Ivy League registration for this student
  const serviceFilter: any = { studentId: student._id, activeIvyExpertId: { $exists: false } };
  if (ivyServiceId) serviceFilter.serviceId = ivyServiceId;
  const registration = await StudentServiceRegistration.findOne(serviceFilter);
  if (!registration) {
    // Check if already assigned
    const assignedFilter: any = { studentId: student._id, activeIvyExpertId: { $exists: true, $ne: null } };
    if (ivyServiceId) assignedFilter.serviceId = ivyServiceId;
    const existingAssignment = await StudentServiceRegistration.findOne(assignedFilter);
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

export const getStudentsForIvyExpert = async (ivyExpertId: string) => {
  // ivyExpertId is IvyExpert._id (NOT User._id)
  if (!mongoose.Types.ObjectId.isValid(ivyExpertId)) {
    throw new Error('Invalid Ivy Expert ID format');
  }

  const registrations = await StudentServiceRegistration.find({ activeIvyExpertId: new mongoose.Types.ObjectId(ivyExpertId) })
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'firstName lastName email' }
    })
    .sort({ createdAt: -1 });

  // Transform to match expected frontend shape
  return registrations.map((reg: any) => ({
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

export const updateStudentInterest = async (registrationId: string, interest: string) => {
  if (!mongoose.Types.ObjectId.isValid(registrationId)) {
    throw new Error('Invalid registration ID');
  }

  const registration = await StudentServiceRegistration.findByIdAndUpdate(
    registrationId,
    { studentInterest: interest },
    { new: true }
  );

  if (!registration) {
    throw new Error('Registration not found');
  }

  return registration;
};

export const getStudentIvyServiceById = async (registrationId: string) => {
  if (!mongoose.Types.ObjectId.isValid(registrationId)) {
    throw new Error('Invalid registration ID');
  }
  const reg = await StudentServiceRegistration.findById(registrationId)
    .populate({
      path: 'studentId',
      populate: { path: 'userId', select: 'firstName lastName email' }
    });
  if (!reg) return null;
  // Transform to match expected shape
  const regObj = reg.toObject() as any;
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

export const getServiceByStudentId = async (studentUserId: string) => {
  if (!mongoose.Types.ObjectId.isValid(studentUserId)) {
    throw new Error('Invalid student ID');
  }
  // Find Student record by userId
  const student = await Student.findOne({ userId: studentUserId });
  if (!student) return null;

  // Find the Ivy League service registration specifically
  const ivyServiceId = await getIvyLeagueServiceId();
  const filter: any = { studentId: student._id };
  if (ivyServiceId) filter.serviceId = ivyServiceId;

  const reg = await StudentServiceRegistration.findOne(filter).populate({
    path: 'studentId',
    populate: { path: 'userId', select: 'firstName lastName email' }
  });
  if (!reg) return null;

  const regObj = reg.toObject() as any;
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

