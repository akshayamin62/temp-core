import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import mongoose from 'mongoose';
import IvyParentInterviewSchedule, {
  IVY_PARENT_INTERVIEW_STATUS,
  IVY_INTERVIEW_MEETING_MODE,
} from '../models/ivy/IvyParentInterviewSchedule';
import IvyLeagueRegistration from '../models/IvyLeagueRegistration';
import User from '../models/User';
import { sendEmail } from '../utils/email';
import { sendWhatsAppGeneralNotification } from '../utils/whatsapp';
import { createZohoMeeting } from '../utils/zohoMeeting';

/* ══════════════════════════════════════════════════════════════════════
   POST /api/ivy/parent-interview-schedule
   Body: { candidateUserId, subject, scheduledDate, scheduledTime,
           duration, meetingMode, meetLink? }
   ══════════════════════════════════════════════════════════════════════ */
export const createParentInterviewSchedule = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const scheduledBy = req.user?.userId;
    const {
      candidateUserId,
      subject,
      scheduledDate,
      scheduledTime,
      duration,
      meetingMode,
      meetLink,
    } = req.body;

    if (!candidateUserId || !subject || !scheduledDate || !scheduledTime || !duration) {
      res.status(400).json({ success: false, message: 'candidateUserId, subject, scheduledDate, scheduledTime, and duration are required' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(candidateUserId)) {
      res.status(400).json({ success: false, message: 'Invalid candidateUserId' });
      return;
    }

    const parsedDuration = parseInt(duration, 10);
    if (![15, 30, 45, 60].includes(parsedDuration)) {
      res.status(400).json({ success: false, message: 'Duration must be 15, 30, 45, or 60 minutes' });
      return;
    }

    if (meetingMode && !Object.values(IVY_INTERVIEW_MEETING_MODE).includes(meetingMode)) {
      res.status(400).json({ success: false, message: 'Invalid meetingMode' });
      return;
    }

    const scheduleDate = new Date(scheduledDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduleDate < today) {
      res.status(400).json({ success: false, message: 'Cannot schedule meetings in the past' });
      return;
    }

    // Fetch parent details from IvyLeagueRegistration
    const registration = await IvyLeagueRegistration.findOne({ userId: candidateUserId }).lean();
    if (!registration) {
      res.status(404).json({ success: false, message: 'Ivy League registration not found for this candidate' });
      return;
    }

    const toName = [registration.parentFirstName, registration.parentMiddleName, registration.parentLastName]
      .filter(Boolean)
      .join(' ');
    const toEmail = registration.parentEmail;
    const toMobile = registration.parentMobile;

    const schedule = await IvyParentInterviewSchedule.create({
      candidateUserId,
      subject,
      scheduledDate: scheduleDate,
      scheduledTime,
      duration: parsedDuration,
      meetingMode: meetingMode || IVY_INTERVIEW_MEETING_MODE.ONLINE,
      meetLink: meetLink || null,
      status: IVY_PARENT_INTERVIEW_STATUS.SCHEDULED,
      scheduledBy,
      toName,
      toEmail,
      toMobile,
    });

    // For online meetings: auto-create a Zoho meeting
    const effectiveMode = meetingMode || IVY_INTERVIEW_MEETING_MODE.ONLINE;
    if (effectiveMode === IVY_INTERVIEW_MEETING_MODE.ONLINE) {
      try {
        const [hours, mins] = scheduledTime.split(':').map(Number);
        const meetingStartTime = new Date(scheduleDate);
        meetingStartTime.setHours(hours, mins, 0, 0);
        const zohoResult = await createZohoMeeting({
          topic: subject,
          startTime: meetingStartTime,
          duration: parsedDuration,
          agenda: subject,
          participantEmails: toEmail ? [toEmail] : [],
        });
        schedule.zohoMeetingKey = zohoResult.meetingKey;
        schedule.zohoMeetingUrl = zohoResult.meetingUrl;
        schedule.zohoMeetingId = zohoResult.meetingNumber || zohoResult.meetingKey;
        schedule.zohoMeetingPassword = zohoResult.meetingPassword || '';
        await schedule.save();
      } catch (zohoErr) {
        console.error('⚠️  Zoho Meeting creation failed for parent interview (saved without link):', zohoErr);
      }
    }
    const schedulerUser = await User.findById(scheduledBy).select('firstName middleName lastName').lean() as any;
    const schedulerName = schedulerUser
      ? [schedulerUser.firstName, schedulerUser.middleName, schedulerUser.lastName].filter(Boolean).join(' ')
      : 'Our team';

    const formattedDate = scheduleDate.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const effectiveMode2 = meetingMode || IVY_INTERVIEW_MEETING_MODE.ONLINE;
    const modeLabel = effectiveMode2 === IVY_INTERVIEW_MEETING_MODE.ONLINE ? 'Online' : 'In-Person';
    const zUrl = schedule.zohoMeetingUrl || meetLink;
    const zId = schedule.zohoMeetingId;
    const zPwd = schedule.zohoMeetingPassword;
    const meetLinkHtml = (effectiveMode2 === IVY_INTERVIEW_MEETING_MODE.ONLINE && (zUrl || zId))
      ? `${zId ? `<p><strong>Meeting ID:</strong> ${zId}</p>` : ''}${zPwd ? `<p><strong>Password:</strong> ${zPwd}</p>` : ''}${zUrl ? `<p><strong>Join Link:</strong> <a href="${zUrl}">${zUrl}</a></p>` : ''}`
      : '';

    // Student name for the email body
    const studentName = [registration.firstName, registration.middleName, registration.lastName]
      .filter(Boolean)
      .join(' ');

    // Email to parent
    if (toEmail) {
      sendEmail({
        to: toEmail,
        subject: `Parent Interview Scheduled — ${subject}`,
        html: `<p>Dear ${toName},</p>
<p>A parent interview has been scheduled for <strong>${studentName}</strong>'s Ivy League admission process.</p>
<p><strong>Subject:</strong> ${subject}</p>
<p><strong>Date:</strong> ${formattedDate}</p>
<p><strong>Time:</strong> ${scheduledTime}</p>
<p><strong>Duration:</strong> ${parsedDuration} minutes</p>
<p><strong>Mode:</strong> ${modeLabel}</p>
${meetLinkHtml}
<p>This interview has been scheduled by <strong>${schedulerName}</strong>. Please ensure you are available at the scheduled time.</p>
<p>Best regards,<br/>ADMITra Team</p>`,
      }).catch((err) => console.error('Failed to send parent interview email:', err));
    }

    // WhatsApp to parent
    if (toMobile) {
      sendWhatsAppGeneralNotification(
        toMobile,
        toName,
        `A parent interview has been scheduled for ${studentName}'s Ivy League process.`,
        `"${subject}" on ${formattedDate} at ${scheduledTime} (${parsedDuration} mins; ${modeLabel}). Please be available at the scheduled time`
      ).catch((err) => console.error('Failed to send parent interview WhatsApp:', err));
    }

    res.status(201).json({ success: true, message: 'Parent interview scheduled successfully', data: { schedule } });
  } catch (err: any) {
    console.error('Error creating parent interview schedule:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create parent interview schedule' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   GET /api/ivy/parent-interview-schedule?candidateUserId=
   ══════════════════════════════════════════════════════════════════════ */
export const getParentInterviewSchedules = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { candidateUserId } = req.query;

    if (!candidateUserId || !mongoose.Types.ObjectId.isValid(candidateUserId as string)) {
      res.status(400).json({ success: false, message: 'Valid candidateUserId query param is required' });
      return;
    }

    const schedules = await IvyParentInterviewSchedule.find({ candidateUserId })
      .populate('scheduledBy', 'firstName middleName lastName email role')
      .sort({ scheduledDate: 1, scheduledTime: 1 })
      .lean();

    res.status(200).json({ success: true, data: { schedules } });
  } catch (err: any) {
    console.error('Error fetching parent interview schedules:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to fetch schedules' });
  }
};

/* ══════════════════════════════════════════════════════════════════════
   PATCH /api/ivy/parent-interview-schedule/:id/status
   Body: { status?: 'scheduled' | 'completed' | 'cancelled', notes? }
   ══════════════════════════════════════════════════════════════════════ */
export const updateParentInterviewStatus = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, message: 'Invalid schedule ID' });
      return;
    }

    if (status && !Object.values(IVY_PARENT_INTERVIEW_STATUS).includes(status)) {
      res.status(400).json({ success: false, message: 'Invalid status value' });
      return;
    }

    const schedule = await IvyParentInterviewSchedule.findById(id);
    if (!schedule) {
      res.status(404).json({ success: false, message: 'Schedule not found' });
      return;
    }

    if (status) schedule.status = status;
    if (notes !== undefined) schedule.notes = notes;
    if (status === IVY_PARENT_INTERVIEW_STATUS.COMPLETED && !schedule.completedAt) {
      schedule.completedAt = new Date();
    }
    await schedule.save();

    res.status(200).json({ success: true, message: 'Schedule updated', data: { schedule } });
  } catch (err: any) {
    console.error('Error updating parent interview status:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update' });
  }
};
