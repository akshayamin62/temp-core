import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { resolveIvyExpertId } from '../utils/resolveRole';
import { createStudentIvyService, getStudentsForIvyExpert, updateStudentInterest, getStudentIvyServiceById, getServiceByStudentId } from '../services/ivyService.service';

export const createIvyService = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, ivyExpertId } = req.body;

    // Validate input
    if (!studentId || !ivyExpertId) {
      res.status(400).json({
        success: false,
        message: 'studentId and ivyExpertId are required'
      });
      return;
    }

    // Call service layer
    const newService = await createStudentIvyService(studentId, ivyExpertId);

    // Return created document
    res.status(201).json({
      success: true,
      message: 'Ivy League service created successfully',
      data: newService,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create Ivy League service',
    });
  }
};

/**
 * Auth-based: Get students for the logged-in ivy expert.
 * Derives IvyExpert._id from req.user.userId (JWT).
 */
export const getMyStudentsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);
    const students = await getStudentsForIvyExpert(ivyExpertId);

    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch students',
    });
  }
};

export const getStudentsForIvyExpertHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ivyExpertId } = req.params;

    if (!ivyExpertId) {
      res.status(400).json({ success: false, message: 'ivyExpertId is required' });
      return;
    }

    const students = await getStudentsForIvyExpert(ivyExpertId as string);

    res.status(200).json({
      success: true,
      data: students,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch students',
    });
  }
};

/**
 * Super Admin: Get students for an ivy expert by User._id.
 * Resolves User._id → IvyExpert._id → students.
 */
export const getStudentsForIvyExpertByUserIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    if (!userId) {
      res.status(400).json({ success: false, message: 'userId is required' });
      return;
    }

    // Resolve User._id to IvyExpert._id
    const ivyExpertId = await resolveIvyExpertId(userId);
    const students = await getStudentsForIvyExpert(ivyExpertId);

    res.status(200).json({
      success: true,
      data: students,
      ivyExpertId,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch students',
    });
  }
};

export const updateInterestHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const { interest } = req.body;

    if (!interest) {
      res.status(400).json({ success: false, message: 'Interest is required' });
      return;
    }

    const updatedService = await updateStudentInterest(serviceId as string, interest);

    res.status(200).json({
      success: true,
      data: updatedService,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update interest',
    });
  }
};

export const getServiceDetailsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { serviceId } = req.params;
    const service = await getStudentIvyServiceById(serviceId as string);

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch service details',
    });
  }
};

export const getServiceByStudentIdHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      res.status(400).json({ success: false, message: 'studentId is required' });
      return;
    }

    const service = await getServiceByStudentId(studentId as string);

    if (!service) {
      res.status(404).json({ success: false, message: 'No service found for this student' });
      return;
    }

    res.status(200).json({
      success: true,
      data: service,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch service for student',
    });
  }
};

/**
 * GET /api/ivy/ivy-service/my-service
 * Auth-based: get the logged-in student's ivy service registration
 */
export const getMyServiceHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.userId;
    const service = await getServiceByStudentId(userId);
    if (!service) {
      res.status(404).json({ success: false, message: 'No Ivy service found for this student' });
      return;
    }
    res.status(200).json({ success: true, data: service });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || 'Failed to fetch service' });
  }
};

