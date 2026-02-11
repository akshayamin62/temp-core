/**
 * Email service utility using Nodemailer
 */
interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}
/**
 * Send email
 */
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
/**
 * Send OTP email
 */
export declare const sendOTPEmail: (email: string, name: string, otp: string, purpose?: "signup" | "login") => Promise<void>;
/**
 * Send document rejection email
 */
export declare const sendDocumentRejectionEmail: (email: string, studentName: string, documentName: string, rejectionMessage: string, rejectedBy?: string, registrationId?: string) => Promise<void>;
/**
 * Send student account creation email
 */
export declare const sendStudentAccountCreatedEmail: (email: string, name: string, loginUrl?: string) => Promise<void>;
/**
 * Send service registration notification to super admin
 */
export declare const sendServiceRegistrationEmailToSuperAdmin: (superAdminEmail: string, studentName: string, studentEmail: string, serviceName: string) => Promise<void>;
/**
 * Send meeting scheduled email with Zoho Meeting link
 */
export declare const sendMeetingScheduledEmail: (recipientEmail: string, recipientName: string, meetingDetails: {
    subject: string;
    date: string;
    time: string;
    duration: number;
    meetingType: string;
    meetingUrl?: string;
    otherPartyName: string;
    notes?: string;
}) => Promise<void>;
export {};
//# sourceMappingURL=email.d.ts.map