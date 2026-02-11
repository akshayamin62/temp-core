import IvyExpert from '../models/IvyExpert';
import Student from '../models/Student';

/**
 * Resolve IvyExpert._id from a User._id.
 * Used across all ivy controllers to map the authenticated user
 * to their IvyExpert document (since activeIvyExpertId stores IvyExpert._id).
 */
export const resolveIvyExpertId = async (userId: string): Promise<string> => {
  const expert = await IvyExpert.findOne({ userId });
  if (!expert) {
    throw new Error('IvyExpert record not found for this user');
  }
  return expert._id.toString();
};

/**
 * Resolve Student._id from a User._id.
 */
export const resolveStudentId = async (userId: string): Promise<string> => {
  const student = await Student.findOne({ userId });
  if (!student) {
    throw new Error('Student record not found for this user');
  }
  return student._id.toString();
};
