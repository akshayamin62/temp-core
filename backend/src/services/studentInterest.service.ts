import StudentServiceRegistration, { IStudentServiceRegistration } from '../models/StudentServiceRegistration';

export const getStudentInterest = async (
  studentIvyServiceId: string
): Promise<IStudentServiceRegistration> => {
  const service = await StudentServiceRegistration.findById(studentIvyServiceId);

  if (!service) {
    throw new Error('Student service registration not found');
  }

  return service;
};

/**
 * Update student interest - stores as plain text with overwrite allowed
 * No validation logic applied to studentInterest content
 */
export const updateStudentInterest = async (
  studentIvyServiceId: string,
  studentInterest: string
): Promise<IStudentServiceRegistration> => {
  // Direct update - no validation, overwrite allowed
  const updatedService = await StudentServiceRegistration.findByIdAndUpdate(
    studentIvyServiceId,
    { studentInterest },
    { new: true, runValidators: false }
  );

  if (!updatedService) {
    throw new Error('Student service registration not found');
  }

  return updatedService;
};

