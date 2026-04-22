/**
 * Email service utility using Nodemailer
 */

import nodemailer from "nodemailer";

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Create email transporter
 */
const createTransporter = () => {
  const emailAddress = process.env.EMAIL_ADDRESS;
  const emailPassword = process.env.EMAIL_PASSWORD;

  if (!emailAddress || !emailPassword) {
    console.warn("⚠️  Email credentials not configured. Emails will be logged to console only.");
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail", // Using Gmail service
    auth: {
      user: emailAddress,
      pass: emailPassword,
    },
  });
};

/**
 * Send email
 */
export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const transporter = createTransporter();

  // If no transporter (missing credentials), log to console
  if (!transporter) {
    console.log("=".repeat(50));
    console.log("📧 EMAIL (Development Mode - No Credentials)");
    console.log("=".repeat(50));
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    console.log("Body:", options.text || options.html);
    console.log("=".repeat(50));
    return;
  }

  try {
    await transporter.sendMail({
      from: `"CORE-Community Platform" <${process.env.EMAIL_ADDRESS}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    
    console.log(`✅ Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
    // Log email details for debugging
    console.log("Failed email details:");
    console.log("To:", options.to);
    console.log("Subject:", options.subject);
    throw new Error("Failed to send email");
  }
};

/**
 * Send OTP email
 */
export const sendOTPEmail = async (
  email: string,
  name: string,
  otp: string,
  purpose: 'signup' | 'login' = 'login'
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your OTP Code</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd;">
        <h2 style="color: #333; margin-bottom: 20px;">Your OTP Code</h2>
        <p>Hi ${name},</p>
        <p>Your ${purpose === 'signup' ? 'signup' : 'login'} verification code is:</p>
        <div style="margin: 20px 0;">
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 5px; margin: 10px 0;">
            ${otp}
          </p>
        </div>
        <p style="color: #666; font-size: 14px;">
          This code will expire in 10 minutes.
        </p>
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          If you didn't ${purpose === 'signup' ? 'sign up' : 'request this code'}, please ignore this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Your OTP Code
    
    Hi ${name},
    
    Your ${purpose === 'signup' ? 'signup' : 'login'} verification code is: ${otp}
    
    This code will expire in 10 minutes.
    
    If you didn't ${purpose === 'signup' ? 'sign up' : 'request this code'}, please ignore this email.
  `;

  await sendEmail({
    to: email,
    subject: `Your ${purpose === 'signup' ? 'Signup' : 'Login'} Verification Code`,
    html,
    text,
  });
};

/**
 * Send document rejection email
 */
export const sendDocumentRejectionEmail = async (
  email: string,
  studentName: string,
  documentName: string,
  rejectionMessage: string,
  rejectedBy: string = 'OPS',
  registrationId?: string
): Promise<void> => {
  const detailsUrl = registrationId 
    ? `${process.env.FRONTEND_URL || 'http://localhost:3000'}/my-details?registrationId=${registrationId}`
    : `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard`;
    
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Document Rejected</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd;">
        <h2>Document Rejected</h2>
        <p>Hi ${studentName},</p>
        <p>Your uploaded document "${documentName}" has been rejected by your ${rejectedBy}.</p>
        
        <p><strong>Reason for rejection:</strong></p>
        <p>${rejectionMessage}</p>
        
        <p><strong>What you need to do:</strong></p>
        <ol>
          <li>Review the rejection reason above</li>
          <li>Prepare a corrected version of the document</li>
          <li>Log in to your account and re-upload the document</li>
        </ol>
        
        <p><a href="${detailsUrl}">Upload Document Again</a></p>
        
        <p>If you have any questions, please contact your ${rejectedBy}.</p>
        
        <p style="color: #999; font-size: 12px; margin-top: 20px;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Document Rejected
    
    Hi ${studentName},
    
    Your uploaded document "${documentName}" has been rejected by your ${rejectedBy}.
    
    Reason for rejection:
    ${rejectionMessage}
    
    What you need to do:
    1. Review the rejection reason above
    2. Prepare a corrected version of the document
    3. Log in to your account and re-upload the document
    
    If you have any questions, please contact your ${rejectedBy}.
  `;

  await sendEmail({
    to: email,
    subject: `Document Rejected: ${documentName}`,
    html,
    text,
  });
};

/**
 * Send student account creation email
 */
export const sendStudentAccountCreatedEmail = async (
  email: string,
  name: string,
  loginUrl: string = 'http://localhost:3000/'
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to CORE - Your Account is Ready!</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">🎉 Welcome to CORE!</h1>
        </div>
        
        <p style="font-size: 16px;">Hi ${name},</p>
        
        <p style="font-size: 16px;">Great news! Your student account has been successfully created.</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-weight: bold;">Your Login Email:</p>
          <p style="margin: 5px 0; font-size: 18px; color: #2563eb;">${email}</p>
        </div>
        
        <p style="font-size: 16px;">You can now access your account and start your journey with us!</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Click Here to Login</a>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>Note:</strong> You will receive a one-time password (OTP) on this email when you try to login.
          </p>
        </div>
        
        <p style="font-size: 14px; color: #666;">If you have any questions, feel free to reach out to your counselor or contact our support team.</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        
        <p style="color: #999; font-size: 12px; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Welcome to CORE - Your Account is Ready!
    
    Hi ${name},
    
    Great news! Your student account has been successfully created.
    
    Your Login Email: ${email}
    
    You can now access your account and start your journey with us!
    
    Click here to login: ${loginUrl}
    
    Note: You will receive a one-time password (OTP) on this email when you try to login.
    
    If you have any questions, feel free to reach out to your counselor or contact our support team.
  `;

  await sendEmail({
    to: email,
    subject: 'Welcome to CORE - Your Account is Ready!',
    html,
    text,
  });
};

/**
 * Send service registration notification to super admin
 */
export const sendServiceRegistrationEmailToSuperAdmin = async (
  superAdminEmail: string,
  studentName: string,
  studentEmail: string,
  serviceName: string
): Promise<void> => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">New Service Registration</h2>
      <p>A student has registered for a service and requires role assignment.</p>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Student Details:</h3>
        <p><strong>Name:</strong> ${studentName}</p>
        <p><strong>Email:</strong> ${studentEmail}</p>
      </div>
      
      <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #1f2937;">Service Details:</h3>
        <p><strong>Service:</strong> ${serviceName}</p>
      </div>
      
      <p style="color: #dc2626; font-weight: bold;">Action Required: Please assign the appropriate role to this registration.</p>
      
      <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/super-admin/roles/student" 
         style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; 
                text-decoration: none; border-radius: 6px; margin-top: 20px;">
        View Student Dashboard
      </a>
    </div>
  `;

  const text = `New Service Registration - Role Assignment Pending\n\nStudent: ${studentName} (${studentEmail})\nService: ${serviceName}\n\nPlease assign the appropriate role to this registration.`;

  await sendEmail({
    to: superAdminEmail,
    subject: 'New Service Registration - Role Assignment Pending',
    html,
    text,
  });
};

/**
 * Send meeting pending confirmation email — only to the receiver.
 * Plain text style, no colors, proper grammar.
 */
export const sendMeetingPendingEmail = async (
  recipientEmail: string,
  recipientName: string,
  meetingDetails: {
    subject: string;
    date: string;
    time: string;
    duration: number;
    meetingType: string;
    otherPartyName: string;
    agenda?: string;
  }
): Promise<void> => {
  const { subject, date, time, duration, meetingType, otherPartyName, agenda } = meetingDetails;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Request</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="margin-bottom: 20px;">Meeting Request</h2>
        <p>Hi ${recipientName},</p>
        <p>A meeting has been scheduled for you by <strong>${otherPartyName}</strong>. Please review the details below and confirm your availability.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 140px; vertical-align: top;">Subject:</td>
            <td style="padding: 8px 0;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Date:</td>
            <td style="padding: 8px 0;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Time:</td>
            <td style="padding: 8px 0;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Duration:</td>
            <td style="padding: 8px 0;">${duration} minutes</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Type:</td>
            <td style="padding: 8px 0;">${meetingType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Scheduled By:</td>
            <td style="padding: 8px 0;">${otherPartyName}</td>
          </tr>${agenda ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Meeting Agenda:</td>
            <td style="padding: 8px 0;">${agenda}</td>
          </tr>` : ''}
        </table>

        <p>Please log in to your account to confirm your availability for this meeting.</p>

        <p style="font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from CORE-Community Platform.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Meeting Request\n\nHi ${recipientName},\n\nA meeting has been scheduled for you by ${otherPartyName}. Please review the details below and confirm your availability.\n\nSubject: ${subject}\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\nType: ${meetingType}\nScheduled By: ${otherPartyName}\n${agenda ? `Meeting Agenda: ${agenda}\n` : ''}\nPlease log in to your account to confirm your availability for this meeting.`;

  await sendEmail({
    to: recipientEmail,
    subject: `Meeting Request: ${subject}`,
    html,
    text,
  });
};

/**
 * Send meeting scheduled/pending email (no meeting link yet — link comes on confirmation)
 */
export const sendMeetingScheduledEmail = async (
  recipientEmail: string,
  recipientName: string,
  meetingDetails: {
    subject: string;
    date: string;
    time: string;
    duration: number;
    meetingType: string;
    meetingUrl?: string;
    meetingId?: string;
    meetingPassword?: string;
    otherPartyName: string;
    agenda?: string;
  }
): Promise<void> => {
  const { subject, date, time, duration, meetingType, meetingUrl, meetingId, meetingPassword, otherPartyName, agenda } = meetingDetails;

  const meetingLinkSection = meetingUrl
    ? `
      <div style="margin: 20px 0; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">Join Meeting Online</p>
        <a href="${meetingUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
          Join Zoho Meeting
        </a>
        ${meetingId ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #444;"><strong>Meeting ID:</strong> ${meetingId}</p>` : ''}
        ${meetingPassword ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #444;"><strong>Password:</strong> ${meetingPassword}</p>` : ''}
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
          Or copy this link: <br/>
          <a href="${meetingUrl}" style="color: #1976d2; word-break: break-all;">${meetingUrl}</a>
        </p>
      </div>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Scheduled</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="margin-bottom: 20px;">Meeting Scheduled</h2>
        <p>Hi ${recipientName},</p>
        <p>A meeting has been scheduled for you. Here are the details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 140px; vertical-align: top;">Subject:</td>
            <td style="padding: 8px 0;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Date:</td>
            <td style="padding: 8px 0;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Time:</td>
            <td style="padding: 8px 0;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Duration:</td>
            <td style="padding: 8px 0;">${duration} minutes</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Type:</td>
            <td style="padding: 8px 0;">${meetingType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">With:</td>
            <td style="padding: 8px 0;">${otherPartyName}</td>
          </tr>${agenda ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Meeting Agenda:</td>
            <td style="padding: 8px 0;">${agenda}</td>
          </tr>` : ''}
        </table>

        ${meetingLinkSection}

        <p style="font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from CORE-Community Platform.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Meeting Scheduled\n\nHi ${recipientName},\n\nSubject: ${subject}\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\nType: ${meetingType}\nWith: ${otherPartyName}\n${agenda ? `Meeting Agenda: ${agenda}\n` : ''}${meetingUrl ? `\nJoin Link: ${meetingUrl}` : ''}${meetingId ? `\nMeeting ID: ${meetingId}` : ''}${meetingPassword ? `\nPassword: ${meetingPassword}` : ''}`;

  await sendEmail({
    to: recipientEmail,
    subject: `Meeting Scheduled: ${subject}`,
    html,
    text,
  });
};

/**
 * Send meeting confirmed email with Zoho Meeting link, Meeting ID, and Password
 */
export const sendMeetingConfirmedEmail = async (
  recipientEmail: string,
  recipientName: string,
  meetingDetails: {
    subject: string;
    date: string;
    time: string;
    duration: number;
    meetingType: string;
    meetingUrl?: string;
    meetingId?: string;
    meetingPassword?: string;
    otherPartyName: string;
    agenda?: string;
  }
): Promise<void> => {
  const { subject, date, time, duration, meetingType, meetingUrl, meetingId, meetingPassword, otherPartyName, agenda } = meetingDetails;

  const meetingLinkSection = meetingUrl
    ? `
      <div style="margin: 20px 0; padding: 16px; background-color: #f5f5f5; border-radius: 8px;">
        <p style="margin: 0 0 8px 0; font-weight: bold;">Join Meeting Online</p>
        <a href="${meetingUrl}" 
           style="display: inline-block; padding: 12px 24px; background-color: #1976d2; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
          Join Zoho Meeting
        </a>
        ${meetingId ? `<p style="margin: 8px 0 0 0; font-size: 13px; color: #444;"><strong>Meeting ID:</strong> ${meetingId}</p>` : ''}
        ${meetingPassword ? `<p style="margin: 4px 0 0 0; font-size: 13px; color: #444;"><strong>Password:</strong> ${meetingPassword}</p>` : ''}
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">
          Or copy this link: <br/>
          <a href="${meetingUrl}" style="color: #1976d2; word-break: break-all;">${meetingUrl}</a>
        </p>
      </div>`
    : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Meeting Confirmed</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="margin-bottom: 20px;">Meeting Confirmed</h2>
        <p>Hi ${recipientName},</p>
        <p>Your meeting has been confirmed. Here are the details:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; width: 140px; vertical-align: top;">Subject:</td>
            <td style="padding: 8px 0;">${subject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Date:</td>
            <td style="padding: 8px 0;">${date}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Time:</td>
            <td style="padding: 8px 0;">${time}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Duration:</td>
            <td style="padding: 8px 0;">${duration} minutes</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Type:</td>
            <td style="padding: 8px 0;">${meetingType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">With:</td>
            <td style="padding: 8px 0;">${otherPartyName}</td>
          </tr>${agenda ? `
          <tr>
            <td style="padding: 8px 0; font-weight: bold; vertical-align: top;">Meeting Agenda:</td>
            <td style="padding: 8px 0;">${agenda}</td>
          </tr>` : ''}
        </table>

        ${meetingLinkSection}

        <p style="font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from CORE-Community Platform.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Meeting Confirmed\n\nHi ${recipientName},\n\nSubject: ${subject}\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\nType: ${meetingType}\nWith: ${otherPartyName}\n${agenda ? `Meeting Agenda: ${agenda}\n` : ''}${meetingUrl ? `\nJoin Link: ${meetingUrl}` : ''}${meetingId ? `\nMeeting ID: ${meetingId}` : ''}${meetingPassword ? `\nPassword: ${meetingPassword}` : ''}`;

  await sendEmail({
    to: recipientEmail,
    subject: `Meeting Confirmed: ${subject}`,
    html,
    text,
  });
};

/**
 * Send a custom message to a student from staff
 */
export const sendCustomMessageToStudent = async (
  studentEmail: string,
  studentName: string,
  senderName: string,
  senderRole: string,
  message: string,
  serviceName?: string
): Promise<void> => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Message from ${senderRole}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="margin-bottom: 20px;">Message from Your ${senderRole}</h2>
        <p>Hi ${studentName},</p>
        ${serviceName ? `<p style="color: #555; font-size: 14px;">Service: <strong>${serviceName}</strong></p>` : ''}
        <p>You have received a message from <strong>${senderName}</strong> (${senderRole}):</p>
        
        <div style="margin: 20px 0; padding: 16px; background-color: #f5f5f5; border-radius: 8px; border-left: 4px solid #333;">
          <p style="margin: 0; white-space: pre-wrap;">${message}</p>
        </div>

        <p>If you have any questions, please reach out to your ${senderRole.toLowerCase()} directly.</p>

        <p style="font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from CORE-Community Platform.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Message from Your ${senderRole}\n\nHi ${studentName},${serviceName ? `\nService: ${serviceName}` : ''}\n\nYou have received a message from ${senderName} (${senderRole}):\n\n${message}\n\nIf you have any questions, please reach out to your ${senderRole.toLowerCase()} directly.`;

  await sendEmail({
    to: studentEmail,
    subject: `Message from ${senderName} - CORE Platform`,
    html,
    text,
  });
};

/**
 * Send email when OPS/Admin suggests a new program to student
 */
export const sendProgramSuggestedEmail = async (
  studentEmail: string,
  studentName: string,
  programDetails: {
    programName: string;
    university: string;
    country: string;
    intake?: string;
    year?: string;
  }
): Promise<void> => {
  const { programName, university, country, intake, year } = programDetails;
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Program Suggestion</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">New Program Suggestion</h2>
        <p style="font-size: 16px;">Hi ${studentName},</p>
        <p style="font-size: 16px;">Your team has suggested a new program for you:</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 5px 0;"><strong>Program:</strong> ${programName}</p>
          <p style="margin: 5px 0;"><strong>University:</strong> ${university}</p>
          <p style="margin: 5px 0;"><strong>Country:</strong> ${country}</p>
          ${intake ? `<p style="margin: 5px 0;"><strong>Intake:</strong> ${intake}${year ? ` ${year}` : ''}</p>` : ''}
        </div>

        <p style="font-size: 16px;">Log in to review and select this program:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Program</a>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from Admitra.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `New Program Suggestion\n\nHi ${studentName},\n\nYour team has suggested a new program for you:\n\nProgram: ${programName}\nUniversity: ${university}\nCountry: ${country}${intake ? `\nIntake: ${intake}${year ? ` ${year}` : ''}` : ''}\n\nLog in to review and select this program:\n${dashboardUrl}\n\nBest regards,\nAdmitra Team`;

  await sendEmail({
    to: studentEmail,
    subject: `New Program Suggestion - ${programName} at ${university}`,
    html,
    text,
  });
};

/**
 * Send email when student selects/applies to a program (notify OPS)
 */
export const sendStudentSelectedProgramEmail = async (
  opsEmail: string,
  opsName: string,
  studentName: string,
  programDetails: {
    programName: string;
    university: string;
    priority?: number;
  }
): Promise<void> => {
  const { programName, university, priority } = programDetails;
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/ops/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Student Selected a Program</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Student Selected a Program</h2>
        <p style="font-size: 16px;">Hi ${opsName},</p>
        <p style="font-size: 16px;"><strong>${studentName}</strong> has selected a program for application:</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 5px 0;"><strong>Program:</strong> ${programName}</p>
          <p style="margin: 5px 0;"><strong>University:</strong> ${university}</p>
          ${priority ? `<p style="margin: 5px 0;"><strong>Priority:</strong> ${priority}</p>` : ''}
        </div>

        <p style="font-size: 16px;">Please review and proceed with the application process.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Dashboard</a>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from Admitra.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Student Selected a Program\n\nHi ${opsName},\n\n${studentName} has selected a program for application:\n\nProgram: ${programName}\nUniversity: ${university}${priority ? `\nPriority: ${priority}` : ''}\n\nPlease review and proceed with the application process.\n${dashboardUrl}\n\nBest regards,\nAdmitra Team`;

  await sendEmail({
    to: opsEmail,
    subject: `${studentName} selected a program - Action needed`,
    html,
    text,
  });
};

/**
 * Send email when program status is updated (notify student)
 */
export const sendProgramStatusUpdateEmail = async (
  studentEmail: string,
  studentName: string,
  programDetails: {
    programName: string;
    university: string;
    country: string;
    newStatus: string;
  }
): Promise<void> => {
  const { programName, university, country, newStatus } = programDetails;
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Application Status Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <h2 style="color: #2563eb; margin-bottom: 20px;">Application Status Update</h2>
        <p style="font-size: 16px;">Hi ${studentName},</p>
        <p style="font-size: 16px;">There is an update on your application:</p>
        
        <div style="background-color: #f0f9ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 5px 0;"><strong>Program:</strong> ${programName}</p>
          <p style="margin: 5px 0;"><strong>University:</strong> ${university}</p>
          <p style="margin: 5px 0;"><strong>Country:</strong> ${country}</p>
          <p style="margin: 5px 0;"><strong>New Status:</strong> ${newStatus}</p>
        </div>

        <p style="font-size: 16px;">Log in for more details:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">View Application</a>
        </div>

        <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from Admitra.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Application Status Update\n\nHi ${studentName},\n\nThere is an update on your application:\n\nProgram: ${programName}\nUniversity: ${university}\nCountry: ${country}\nNew Status: ${newStatus}\n\nLog in for more details:\n${dashboardUrl}\n\nBest regards,\nAdmitra Team`;

  await sendEmail({
    to: studentEmail,
    subject: `Application Update - ${programName} at ${university}`,
    html,
    text,
  });
};

/**
 * Send email when student receives an offer (special celebration email)
 */
export const sendOfferReceivedEmail = async (
  studentEmail: string,
  studentName: string,
  programDetails: {
    programName: string;
    university: string;
    country: string;
  }
): Promise<void> => {
  const { programName, university, country } = programDetails;
  const dashboardUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/student/dashboard`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Congratulations! Offer Received</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 20px auto; background-color: white; padding: 30px; border: 1px solid #ddd; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #16a34a; margin-bottom: 10px;">Congratulations! Offer Received</h1>
        </div>
        
        <p style="font-size: 16px;">Hi ${studentName},</p>
        <p style="font-size: 16px;">Great news! You have received an admission offer:</p>
        
        <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 5px 0;"><strong>Program:</strong> ${programName}</p>
          <p style="margin: 5px 0;"><strong>University:</strong> ${university}</p>
          <p style="margin: 5px 0;"><strong>Country:</strong> ${country}</p>
        </div>

        <p style="font-size: 16px;">Please log in to review the offer and take the next steps:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${dashboardUrl}" style="display: inline-block; background-color: #16a34a; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Review Offer</a>
        </div>

        <p style="text-align: center; font-size: 14px; color: #666;">Congratulations from the Admitra Team!</p>

        <p style="color: #999; font-size: 12px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
          This is an automated notification from Admitra.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `Congratulations! Offer Received\n\nHi ${studentName},\n\nGreat news! You have received an admission offer:\n\nProgram: ${programName}\nUniversity: ${university}\nCountry: ${country}\n\nPlease log in to review the offer and take the next steps:\n${dashboardUrl}\n\nCongratulations!\nAdmitra Team`;

  await sendEmail({
    to: studentEmail,
    subject: `Congratulations! Offer from ${university}`,
    html,
    text,
  });
};

/**
 * Send B2B enquiry confirmation email to the enquirer
 */
export const sendB2BEnquiryConfirmationEmail = async (
  email: string,
  firstName: string,
  type: string
): Promise<void> => {
  const typeLabel =
    type === 'Franchise' ? 'Franchise Partner'
    : type === 'Advisor' ? 'Advisor'
    : type === 'Referrer' ? 'Referrer'
    : type;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your ADMITra Business Opportunity Enquiry</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.8; color: #333; background-color: #f9f9f9; margin: 0; padding: 0;">
      <div style="max-width: 620px; margin: 30px auto; background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <!-- Header -->
        <div style="background-color: #1e3a5f; padding: 28px 36px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: 0.5px;">ADMITra</h1>
          <p style="color: #a8c4e0; margin: 4px 0 0; font-size: 13px;">Business Opportunity Enquiry</p>
        </div>

        <!-- Body -->
        <div style="padding: 36px;">
          <p style="margin-top: 0;">Hi ${firstName},</p>

          <p>Thank you for reaching out and showing interest in exploring a business opportunity with <strong>ADMITra</strong>.</p>

          <p>We've received your enquiry for business collaboration as a <strong>${typeLabel}</strong>, and it's great to see your interest in building something meaningful in the education and study abroad space.</p>

          <p>Before we move ahead, it's important you understand how we operate.</p>

          <p><strong>ADMITra is not built like a typical commission-driven model.</strong><br>
          We focus on structured consulting, long-term client relationships, and a system-driven approach that allows our partners to build credible and sustainable income streams.</p>

          <p style="margin-bottom: 8px;">Depending on the path you choose:</p>
          <ul style="margin: 0 0 16px; padding-left: 20px; color: #444;">
            <li style="margin-bottom: 6px;">As a <strong>Referrer</strong>, you leverage your network and earn through qualified conversions</li>
            <li style="margin-bottom: 6px;">As an <strong>Advisor</strong>, you actively guide students and parents using our frameworks</li>
            <li style="margin-bottom: 6px;">As a <strong>Franchise Partner</strong>, you build and scale your own consulting setup using the ADMITra ecosystem</li>
          </ul>

          <p>Each model has a different level of involvement, earning potential, and commitment — so the next step is to understand what fits you best.</p>

          <p style="margin-bottom: 8px;">I'd suggest we connect for a short discussion to:</p>
          <ul style="margin: 0 0 16px; padding-left: 20px; color: #444;">
            <li style="margin-bottom: 6px;">Understand your background and expectations</li>
            <li style="margin-bottom: 6px;">Walk you through the model in detail</li>
            <li style="margin-bottom: 6px;">Clarify the earning structure and onboarding process</li>
          </ul>

          <!-- Team note -->
          <div style="background-color: #f0f4ff; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 14px 18px; margin: 24px 0;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">Our team will review your enquiry and reach out to you shortly to schedule a convenient time for a discussion. Please keep an eye on your email.</p>
          </div>

          <p>Looking forward to connecting for mutual benefits.</p>

          <p style="margin-bottom: 4px;">Regards,</p>
          <p style="margin: 0; font-weight: 600; color: #1e3a5f;">Makrand Bhatt</p>
          <p style="margin: 2px 0; color: #555; font-size: 14px;">Founder</p>
          <p style="margin: 0; color: #555; font-size: 14px; font-weight: 600;">ADMITra</p>
        </div>

        <!-- Footer -->
        <div style="background-color: #f5f7fa; padding: 18px 36px; border-top: 1px solid #e0e0e0;">
          <p style="margin: 0; font-size: 12px; color: #999;">This is an automated confirmation from ADMITra. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `Hi ${firstName},

Thank you for reaching out and showing interest in exploring a business opportunity with ADMITra.

We've received your enquiry for business collaboration as a ${typeLabel}.

ADMITra is not built like a typical commission-driven model. We focus on structured consulting, long-term client relationships, and a system-driven approach that allows our partners to build credible and sustainable income streams.

Our team will review your enquiry and reach out to you shortly.

Looking forward to connecting for mutual benefits.

Regards,

Makrand Bhatt
Founder, ADMITra`;

  await sendEmail({
    to: email,
    subject: 'Your ADMITra Business Opportunity Enquiry',
    html,
    text,
  });
};
