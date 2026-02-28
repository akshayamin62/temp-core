import axios from 'axios';

// const SMS_API_URL = 'https://unify.smsgateway.center/SMSApi/send';
const SMS_API_URL = 'https://unify.smsgateway.center/S';

// Credentials loaded from environment
const SMS_USER_ID = process.env.SMS_USER_ID || '';
const SMS_PASSWORD = process.env.SMS_PASSWORD || '';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || '';
const SMS_DLT_ENTITY_ID = process.env.SMS_DLT_ENTITY_ID || '';

// DLT Template IDs — one constant per approved template
// Add new ones here as you register more templates on the DLT portal
const SMS_TMPL_ID_PROFILE_UPDATE  = process.env.SMS_TMPL_ID_PROFILE_UPDATE  || '';
const SMS_TMPL_ID_STAFF_MESSAGE   = process.env.SMS_TMPL_ID_STAFF_MESSAGE   || '';
const SMS_TMPL_ID_MEETING_REQUEST = process.env.SMS_TMPL_ID_MEETING_REQUEST || '';

/**
 * Template: PROFILE_UPDATE
 * Registered text: "There is a recent update to your profile. Kindly check and take required action {#var#}. KAREER Studio"
 * Variable {#var#} is replaced with a URL at send time.
 * This text must match EXACTLY what was submitted during DLT registration.
 */
const TMPL_PROFILE_UPDATE = 'There is a recent update to your profile on CORE platform. Kindly check and take required action https://kareerstudio.com. Team CORE';

/**
 * Template: STAFF_MESSAGE
 * Registered text (submit EXACTLY this to DLT):
 *   "You have a message from {#alphanumeric#} for {#alphanumeric#} on CORE platform. Kindly check your registered email for details. \n-Team CORE"
 * Variable 1 = sender name + role combined (e.g. "Rahul Sharma (Counselor)")
 * Variable 2 = service name               (e.g. "MBA Abroad 2026")
 */
const TMPL_STAFF_MESSAGE = (senderNameRole: string, serviceName: string) =>
  `You have a message from ${senderNameRole} for ${serviceName} on CORE platform. Kindly check your registered email for details. \n-Team CORE`;

/**
 * Template: MEETING_REQUEST
 * Registered text (submit EXACTLY this to DLT):
 *   "You have a meeting request from {#alphanumeric#} on CORE platform. Kindly login and confirm your availability.
 *   -Team CORE"
 * Variable 1 = sender full name (e.g. "Rahul Sharma")
 */
const TMPL_MEETING_REQUEST = (senderName: string) =>
  `You have a meeting request from ${senderName} on CORE platform. Kindly login and confirm your availability.\n-Team CORE`;

interface SendMeetingRequestSmsParams {
  mobile: string;
  senderName: string; // name of person who created the meeting
}

interface SendSmsParams {
  mobile: string;
  message?: string;
}

interface SendStaffMessageSmsParams {
  mobile: string;
  senderName: string;  // e.g. "Rahul Sharma"
  senderRole: string;  // e.g. "Counselor" — combined with name internally
  serviceName: string; // e.g. "MBA Abroad 2026"
}

/**
 * Send an SMS via SMS Gateway Center.
 * @param mobile – recipient mobile number (with or without country code)
 */
export const sendSms = async ({ mobile }: SendSmsParams): Promise<any> => {
  // Ensure mobile has country code prefix (default to 91 for India)
  let formattedMobile = mobile.replace(/[\s\-\(\)]/g, '');
  if (!formattedMobile.startsWith('91') && formattedMobile.length === 10) {
    formattedMobile = '91' + formattedMobile;
  }
  console.log('[SMS] Sending to:', formattedMobile);

  const formData = new URLSearchParams();
  formData.append('userid', SMS_USER_ID);
  formData.append('password', SMS_PASSWORD);
  formData.append('mobile', formattedMobile);
  formData.append('msg', TMPL_PROFILE_UPDATE);
  formData.append('senderid', SMS_SENDER_ID);
  formData.append('duplicatecheck', 'true');
  formData.append('msgType', 'text');
  formData.append('sendMethod', 'quick');
  formData.append('output', 'json');
  // DLT mandatory fields (required by TRAI regulations in India)
  formData.append('pe_id', SMS_DLT_ENTITY_ID);
  if (SMS_TMPL_ID_PROFILE_UPDATE) formData.append('templateid', SMS_TMPL_ID_PROFILE_UPDATE);

  const response = await axios.post(SMS_API_URL, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });

  console.log('[SMS] Gateway response:', response.data);
  return response.data;
};

/**
 * Send staff-message notification SMS.
 * Uses the STAFF_MESSAGE DLT template.
 * The actual typed message is delivered via email; SMS is a notification only.
 */
export const sendStaffMessageSms = async ({ mobile, senderName, senderRole, serviceName }: SendStaffMessageSmsParams): Promise<any> => {
  let formattedMobile = mobile.replace(/[\s\-\(\)]/g, '');
  if (!formattedMobile.startsWith('91') && formattedMobile.length === 10) {
    formattedMobile = '91' + formattedMobile;
  }
  console.log('[SMS:STAFF_MESSAGE] Sending to:', formattedMobile, '| from:', senderName, senderRole, '| service:', serviceName);

  const formData = new URLSearchParams();
  formData.append('userid', SMS_USER_ID);
  formData.append('password', SMS_PASSWORD);
  formData.append('mobile', formattedMobile);
  formData.append('msg', TMPL_STAFF_MESSAGE(`${senderName} (${senderRole})`, serviceName));
  formData.append('senderid', SMS_SENDER_ID);
  formData.append('duplicatecheck', 'true');
  formData.append('msgType', 'text');
  formData.append('sendMethod', 'quick');
  formData.append('output', 'json');
  formData.append('pe_id', SMS_DLT_ENTITY_ID);
  if (SMS_TMPL_ID_STAFF_MESSAGE) formData.append('templateid', SMS_TMPL_ID_STAFF_MESSAGE);

  const response = await axios.post(SMS_API_URL, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });

  console.log('[SMS:STAFF_MESSAGE] Gateway response:', response.data);
  return response.data;
};

/**
 * Send meeting request notification SMS.
 * Uses the MEETING_REQUEST DLT template.
 */
export const sendMeetingRequestSms = async ({ mobile, senderName }: SendMeetingRequestSmsParams): Promise<any> => {
  let formattedMobile = mobile.replace(/[\s\-\(\)]/g, '');
  if (!formattedMobile.startsWith('91') && formattedMobile.length === 10) {
    formattedMobile = '91' + formattedMobile;
  }
  console.log('[SMS:MEETING_REQUEST] Sending to:', formattedMobile, '| from:', senderName);

  const formData = new URLSearchParams();
  formData.append('userid', SMS_USER_ID);
  formData.append('password', SMS_PASSWORD);
  formData.append('mobile', formattedMobile);
  formData.append('msg', TMPL_MEETING_REQUEST(senderName));
  formData.append('senderid', SMS_SENDER_ID);
  formData.append('duplicatecheck', 'true');
  formData.append('msgType', 'text');
  formData.append('sendMethod', 'quick');
  formData.append('output', 'json');
  formData.append('pe_id', SMS_DLT_ENTITY_ID);
  if (SMS_TMPL_ID_MEETING_REQUEST) formData.append('templateid', SMS_TMPL_ID_MEETING_REQUEST);

  const response = await axios.post(SMS_API_URL, formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 15000,
  });

  console.log('[SMS:MEETING_REQUEST] Gateway response:', response.data);
  return response.data;
};

