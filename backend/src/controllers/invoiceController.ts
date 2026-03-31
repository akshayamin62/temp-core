import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Invoice from '../models/Invoice';

// ===== Get Invoices by Registration =====

export const getInvoicesByRegistration = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { registrationId } = req.params;

    const invoices = await Invoice.find({ registrationId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { invoices, count: invoices.length },
    });
  } catch (error: any) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ===== Get Invoices by Student =====

export const getInvoicesByStudent = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { studentId } = req.params;

    const invoices = await Invoice.find({ studentId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: { invoices, count: invoices.length },
    });
  } catch (error: any) {
    console.error('Error fetching student invoices:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ===== Get Single Invoice =====

export const getInvoice = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { invoiceId } = req.params;

    const invoice = await Invoice.findById(invoiceId).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    return res.status(200).json({
      success: true,
      data: { invoice },
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// ===== Get Invoice by Number =====

export const getInvoiceByNumber = async (req: AuthRequest, res: Response): Promise<Response> => {
  try {
    const { invoiceNumber } = req.params;

    const invoice = await Invoice.findOne({ invoiceNumber }).lean();
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    return res.status(200).json({
      success: true,
      data: { invoice },
    });
  } catch (error: any) {
    console.error('Error fetching invoice:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};
