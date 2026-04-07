import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import CoachingBatch from '../models/CoachingBatch';
import { USER_ROLE } from '../types/roles';

// Get all active batches (any authenticated user, or public)
export const getBatches = async (req: Request, res: Response): Promise<void> => {
  try {
    const { planKey } = req.query;
    const filter: any = { isActive: true };
    if (planKey && typeof planKey === 'string') {
      filter.planKey = planKey;
    }
    const batches = await CoachingBatch.find(filter).sort({ batchDate: 1 }).lean();
    res.json({ success: true, data: { batches } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch batches' });
  }
};

// Get all batches including inactive (super admin)
export const getAllBatches = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const batches = await CoachingBatch.find().sort({ planKey: 1, batchDate: 1 }).lean();
    res.json({ success: true, data: { batches } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch batches' });
  }
};

// Create batch (super admin)
export const createBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { planKey, batchDate, timeFrom, timeTo } = req.body;

    if (!planKey || !batchDate || !timeFrom || !timeTo) {
      res.status(400).json({ success: false, message: 'planKey, batchDate, timeFrom and timeTo are required' });
      return;
    }

    const batch = await CoachingBatch.create({ planKey, batchDate, timeFrom, timeTo });
    res.status(201).json({ success: true, data: { batch } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to create batch' });
  }
};

// Update batch (super admin)
export const updateBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    const { planKey, batchDate, timeFrom, timeTo, isActive } = req.body;

    const batch = await CoachingBatch.findByIdAndUpdate(
      batchId,
      { ...(planKey && { planKey }), ...(batchDate && { batchDate }), ...(timeFrom && { timeFrom }), ...(timeTo && { timeTo }), ...(isActive !== undefined && { isActive }) },
      { new: true, runValidators: true }
    );
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }
    res.json({ success: true, data: { batch } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to update batch' });
  }
};

// Delete batch (super admin)
export const deleteBatch = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { batchId } = req.params;
    const batch = await CoachingBatch.findByIdAndDelete(batchId);
    if (!batch) {
      res.status(404).json({ success: false, message: 'Batch not found' });
      return;
    }
    res.json({ success: true, message: 'Batch deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: 'Failed to delete batch' });
  }
};
