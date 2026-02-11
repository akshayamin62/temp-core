import { Request, Response } from 'express';
import { getUsersByRole } from '../services/user.service';

export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { role } = req.query;

    if (!role || (role !== 'STUDENT' && role !== 'IVY_EXPERT')) {
      res.status(400).json({
        success: false,
        message: 'Valid role parameter (STUDENT or IVY_EXPERT) is required',
      });
      return;
    }

    const users = await getUsersByRole(role as string);

    res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch users',
    });
  }
};

