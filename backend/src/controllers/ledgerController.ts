import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Ledger from '../models/Ledger';

// ===== Get Ledger by Registration =====

export const getLedgerByRegistration = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;

    const ledger = await Ledger.findOne({ registrationId }).lean();
    if (!ledger) {
      return res.status(404).json({ success: false, message: 'Ledger not found' });
    }

    return res.status(200).json({
      success: true,
      data: { ledger },
    });
  } catch (error: any) {
    console.error('Error fetching ledger:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ===== Get Ledger by Student (all registrations) =====

export const getLedgersByStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const ledgers = await Ledger.find({ studentId })
      .populate('registrationId', 'serviceId planTier status')
      .sort({ createdAt: -1 })
      .lean();

    // Calculate summary totals across all ledgers
    const totalServiceAmount = ledgers.reduce((sum, l) => sum + l.totalServiceAmount, 0);
    const totalDiscount = ledgers.reduce((sum, l) => sum + l.totalDiscount, 0);
    const totalPaid = ledgers.reduce((sum, l) => sum + l.totalPaid, 0);
    const totalBalance = ledgers.reduce((sum, l) => sum + l.balance, 0);

    return res.status(200).json({
      success: true,
      data: {
        ledgers,
        summary: {
          totalServiceAmount,
          totalDiscount,
          totalPaid,
          totalBalance,
        },
        count: ledgers.length,
      },
    });
  } catch (error: any) {
    console.error('Error fetching student ledgers:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
