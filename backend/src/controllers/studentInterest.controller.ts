import { Request, Response } from 'express';
import { getStudentInterest, updateStudentInterest } from '../services/studentInterest.service';

export const getStudentInterestData = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId } = req.query;

    if (!studentIvyServiceId) {
      res.status(400).json({
        success: false,
        message: 'studentIvyServiceId is required',
      });
      return;
    }

    const service = await getStudentInterest(studentIvyServiceId as string);

    res.status(200).json({
      success: true,
      data: {
        studentInterest: service.studentInterest || '',
        updatedAt: service.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch student interest',
    });
  }
};

/**
 * PATCH /api/student-interest
 * Store student interest - plain text, overwrite allowed, no validation
 */
export const patchStudentInterest = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId, studentInterest } = req.body;

    if (!studentIvyServiceId) {
      res.status(400).json({
        success: false,
        message: 'studentIvyServiceId is required',
      });
      return;
    }

    // Store as plain text - no validation, overwrite allowed
    const updatedService = await updateStudentInterest(
      studentIvyServiceId,
      studentInterest || ''
    );

    res.status(200).json({
      success: true,
      message: 'Student interest updated successfully',
      data: {
        studentInterest: updatedService.studentInterest,
        updatedAt: updatedService.updatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update student interest',
    });
  }
};

