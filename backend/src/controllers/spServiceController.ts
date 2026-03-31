import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import SPService from '../models/SPService';
import SPEnquiry from '../models/SPEnquiry';
import ServiceProvider from '../models/ServiceProvider';
import path from 'path';
import fs from 'fs';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// ============ SP-facing endpoints ============

// Create a new service listing
export const createSPService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sp = await ServiceProvider.findOne({ userId: req.user?.userId });
    if (!sp) {
      res.status(404).json({ success: false, message: 'Service Provider profile not found' });
      return;
    }

    const { title, description, category, price, priceType } = req.body;

    // Validate category against SP's own servicesOffered
    if (category && sp.servicesOffered && sp.servicesOffered.length > 0) {
      if (!sp.servicesOffered.includes(category)) {
        res.status(400).json({ success: false, message: 'Category must be one of your Services Offered' });
        return;
      }
    }

    const service = await SPService.create({
      serviceProviderId: sp._id,
      title,
      description,
      category,
      price,
      priceType,
    });

    res.status(201).json({ success: true, data: { service } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to create service' });
  }
};

// Get all services for the logged-in SP
export const getMySPServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sp = await ServiceProvider.findOne({ userId: req.user?.userId });
    if (!sp) {
      res.status(404).json({ success: false, message: 'Service Provider profile not found' });
      return;
    }

    const services = await SPService.find({ serviceProviderId: sp._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: { services } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch services' });
  }
};

// Update a service listing
export const updateSPService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sp = await ServiceProvider.findOne({ userId: req.user?.userId });
    if (!sp) {
      res.status(404).json({ success: false, message: 'Service Provider profile not found' });
      return;
    }

    const { serviceId } = req.params;
    const service = await SPService.findOneAndUpdate(
      { _id: serviceId, serviceProviderId: sp._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    res.json({ success: true, data: { service } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update service' });
  }
};

// Delete a service listing
export const deleteSPService = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sp = await ServiceProvider.findOne({ userId: req.user?.userId });
    if (!sp) {
      res.status(404).json({ success: false, message: 'Service Provider profile not found' });
      return;
    }

    const { serviceId } = req.params;
    const service = await SPService.findOneAndDelete({ _id: serviceId, serviceProviderId: sp._id });

    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    res.json({ success: true, message: 'Service deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to delete service' });
  }
};

// Upload thumbnail for a service listing
export const uploadSPServiceThumbnail = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = req.file;
    if (!file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const sp = await ServiceProvider.findOne({ userId: req.user?.userId });
    if (!sp) {
      fs.unlinkSync(file.path);
      res.status(404).json({ success: false, message: 'Service Provider profile not found' });
      return;
    }

    const { serviceId } = req.params;
    const service = await SPService.findOne({ _id: serviceId, serviceProviderId: sp._id });
    if (!service) {
      fs.unlinkSync(file.path);
      res.status(404).json({ success: false, message: 'Service not found' });
      return;
    }

    // Store in service-provider/<spId>/ directory
    const spDir = path.join(getUploadBaseDir(), `service-provider/${sp._id.toString()}`);
    ensureDir(spDir);

    // Delete old thumbnail if exists
    if (service.thumbnail) {
      const oldPath = path.join(process.cwd(), service.thumbnail);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Move file
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const finalFilename = `service_thumb_${serviceId}_${timestamp}${ext}`;
    const finalPath = path.join(spDir, finalFilename);
    fs.renameSync(file.path, finalPath);

    service.thumbnail = `uploads/service-provider/${sp._id}/${finalFilename}`;
    await service.save();

    res.json({ success: true, data: { service } });
  } catch (error: any) {
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch {}
    }
    res.status(500).json({ success: false, message: error.message || 'Failed to upload thumbnail' });
  }
};

// Get enquiries for the logged-in SP
export const getMySPEnquiries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sp = await ServiceProvider.findOne({ userId: req.user?.userId });
    if (!sp) {
      res.status(404).json({ success: false, message: 'Service Provider profile not found' });
      return;
    }

    const enquiries = await SPEnquiry.find({ serviceProviderId: sp._id })
      .populate('spServiceId', 'title category thumbnail')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { enquiries } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch enquiries' });
  }
};

// Update enquiry status (SP can mark as Contacted or Closed)
export const updateSPEnquiryStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const sp = await ServiceProvider.findOne({ userId: req.user?.userId });
    if (!sp) {
      res.status(404).json({ success: false, message: 'Service Provider profile not found' });
      return;
    }

    const { enquiryId } = req.params;
    const { status } = req.body;

    if (!['New', 'Contacted', 'Closed', 'Converted'].includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status' });
      return;
    }

    const enquiry = await SPEnquiry.findOneAndUpdate(
      { _id: enquiryId, serviceProviderId: sp._id },
      { status },
      { new: true }
    );

    if (!enquiry) {
      res.status(404).json({ success: false, message: 'Enquiry not found' });
      return;
    }

    res.json({ success: true, data: { enquiry } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to update enquiry' });
  }
};

// ============ Student-facing endpoints ============

// Get all active services (public listing for students)
// Only shows services from active (non-deactivated) service providers
export const getAllSPServicesForStudents = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;

    // Find all active SP user IDs, then their ServiceProvider profile IDs
    const User = (await import('../models/User')).default;
    const activeSpUsers = await User.find({ role: 'SERVICE_PROVIDER', isActive: true }).select('_id').lean();
    const activeSpUserIds = activeSpUsers.map((u: any) => u._id);
    const activeSPs = await ServiceProvider.find({ userId: { $in: activeSpUserIds } }).select('_id').lean();
    const activeSpIds = activeSPs.map((sp: any) => sp._id);

    const filter: any = { isActive: true, serviceProviderId: { $in: activeSpIds } };
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const services = await SPService.find(filter)
      .populate('serviceProviderId', 'companyName companyLogo city state country servicesOffered website')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { services } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch services' });
  }
};

// Student sends an enquiry
export const createSPEnquiry = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { spServiceId, serviceProviderId, message } = req.body;

    // Get student info from the authenticated user
    const Student = (await import('../models/Student')).default;
    const User = (await import('../models/User')).default;

    const user = await User.findById(req.user?.userId);
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const student = await Student.findOne({ userId: req.user?.userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found' });
      return;
    }

    // Verify the service exists and is active
    const service = await SPService.findOne({ _id: spServiceId, isActive: true });
    if (!service) {
      res.status(404).json({ success: false, message: 'Service not found or inactive' });
      return;
    }

    const enquiry = await SPEnquiry.create({
      studentId: student._id,
      serviceProviderId,
      spServiceId,
      studentName: `${user.firstName} ${user.lastName}`,
      studentEmail: user.email,
      studentMobile: student.mobileNumber || '',
      message,
    });

    res.status(201).json({ success: true, data: { enquiry } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to send enquiry' });
  }
};

// Student views their own enquiries
export const getStudentMyEnquiries = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const Student = (await import('../models/Student')).default;
    const student = await Student.findOne({ userId: req.user?.userId });
    if (!student) {
      res.status(404).json({ success: false, message: 'Student profile not found' });
      return;
    }

    const enquiries = await SPEnquiry.find({ studentId: student._id })
      .populate('spServiceId', 'title category description price priceType thumbnail')
      .populate('serviceProviderId', 'companyName companyLogo city state country website')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { enquiries } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch enquiries' });
  }
};

// ============ Admin-facing endpoints (Super Admin, Admin, Parent) ============

// Get enquiries for a specific student (by studentId)
export const getStudentEnquiriesById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    const enquiries = await SPEnquiry.find({ studentId })
      .populate('spServiceId', 'title category description price priceType thumbnail')
      .populate('serviceProviderId', 'companyName companyLogo city state country website')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { enquiries } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch student enquiries' });
  }
};

// Get services for a specific service provider (by userId)
export const getSPServicesById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    // providerId is a User._id; resolve to ServiceProvider._id
    const sp = await ServiceProvider.findOne({ userId: providerId }).lean();
    if (!sp) {
      res.json({ success: true, data: { services: [] } });
      return;
    }

    const services = await SPService.find({ serviceProviderId: sp._id }).sort({ createdAt: -1 });

    res.json({ success: true, data: { services } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch SP services' });
  }
};

// Get enquiries for a specific service provider (by userId)
export const getSPEnquiriesById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { providerId } = req.params;

    // providerId is a User._id; resolve to ServiceProvider._id
    const sp = await ServiceProvider.findOne({ userId: providerId }).lean();
    if (!sp) {
      res.json({ success: true, data: { enquiries: [] } });
      return;
    }

    const enquiries = await SPEnquiry.find({ serviceProviderId: sp._id })
      .populate('spServiceId', 'title category description price priceType thumbnail')
      .populate('studentId', 'userId')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { enquiries } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch SP enquiries' });
  }
};

// Get all services (for Super Admin - browse all services from all providers)
export const getAllSPServicesForSuperAdmin = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, search } = req.query;

    const filter: any = {};
    if (category && category !== 'All') {
      filter.category = category;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const services = await SPService.find(filter)
      .populate('serviceProviderId', 'companyName companyLogo city state country servicesOffered website')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: { services } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'Failed to fetch services' });
  }
};
