import axios from 'axios';

/**
 * Send a WhatsApp registration message when a lead is converted to a student.
 * Uses the WhatAPI webhook endpoint configured in environment variables.
 */
export const sendWhatsAppRegistrationMessage = async (
  mobileNumber: string,
  name: string,
  email: string
): Promise<void> => {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ WHATSAPP_WEBHOOK_URL not configured, skipping WhatsApp message');
    return;
  }

  const countryCode = process.env.WHATSAPP_COUNTRY_CODE || '91';

  // Strip leading 0 or country code if already present
  let cleanNumber = mobileNumber.replace(/\D/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.substring(1);
  }
  if (cleanNumber.startsWith(countryCode) && cleanNumber.length > 10) {
    cleanNumber = cleanNumber.substring(countryCode.length);
  }

  const fullNumber = `${countryCode}${cleanNumber}`;

  const params = new URLSearchParams({
    number: fullNumber,
    message: `register,${name},${email}`,
  });

  const url = `${webhookUrl}?${params.toString()}`;
  console.log(
    url
  )

  try {
    const response = await axios.get(url, { timeout: 15000 });
    console.log(`✅ WhatsApp message sent to ${fullNumber}:`, response.status);
  } catch (error: any) {
    console.error(`⚠️ Failed to send WhatsApp message to ${fullNumber}:`, error.message);
  }
};

/**
 * Helper: clean mobile number and build full WhatsApp webhook URL
 */
const buildWhatsAppUrl = (mobileNumber: string, message: string): string | null => {
  const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('⚠️ WHATSAPP_WEBHOOK_URL not configured, skipping WhatsApp message');
    return null;
  }

  const countryCode = process.env.WHATSAPP_COUNTRY_CODE || '91';
  let cleanNumber = mobileNumber.replace(/\D/g, '');
  if (cleanNumber.startsWith('0')) {
    cleanNumber = cleanNumber.substring(1);
  }
  if (cleanNumber.startsWith(countryCode) && cleanNumber.length > 10) {
    cleanNumber = cleanNumber.substring(countryCode.length);
  }
  const fullNumber = `${countryCode}${cleanNumber}`;

  const params = new URLSearchParams({ number: fullNumber, message });
  return `${webhookUrl}?${params.toString()}`;
};

/**
 * Template 2: program_added_notification
 * Sent to student when OPS/Super Admin suggests a program.
 *
 * WhatsApp message format:
 *   program added notification,{studentName},{programName},{university - country}
 */
export const sendWhatsAppProgramAdded = async (
  mobileNumber: string,
  studentName: string,
  programName: string,
  universityWithCountry: string
): Promise<void> => {
  const message = `program added notification, ${studentName}, ${programName}, ${universityWithCountry}`;
  const url = buildWhatsAppUrl(mobileNumber, message);
  if (!url) return;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    console.log(`✅ WhatsApp program added notification sent:`, response.status);
  } catch (error: any) {
    console.error(`⚠️ Failed to send WhatsApp program added notification:`, error.message);
  }
};

/**
 * Template 3: program_status_update
 * Sent to student when program status changes.
 *
 * WhatsApp message format:
 *   program status update,{studentName},{programName at university},{newStatus}
 */
export const sendWhatsAppProgramStatusUpdate = async (
  mobileNumber: string,
  studentName: string,
  programAtUniversity: string,
  newStatus: string
): Promise<void> => {
  const message = `program status update, ${studentName}, ${programAtUniversity}, ${newStatus}`;
  const url = buildWhatsAppUrl(mobileNumber, message);
  if (!url) return;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    console.log(`✅ WhatsApp program status update sent:`, response.status);
  } catch (error: any) {
    console.error(`⚠️ Failed to send WhatsApp program status update:`, error.message);
  }
};

/**
 * Template 8: student_selected_program
 * Sent to OPS when a student selects/applies to a program.
 *
 * WhatsApp message format:
 *   student selected program,{opsName},{studentName},{programName},{university}
 */
export const sendWhatsAppStudentSelectedProgram = async (
  mobileNumber: string,
  opsName: string,
  studentName: string,
  programName: string,
  university: string
): Promise<void> => {
  const message = `student selected program,${opsName},${studentName},${programName},${university}`;
  const url = buildWhatsAppUrl(mobileNumber, message);
  if (!url) return;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    console.log(`✅ WhatsApp student selected program sent:`, response.status);
  } catch (error: any) {
    console.error(`⚠️ Failed to send WhatsApp student selected program:`, error.message);
  }
};

/**
 * Template 6: staff_message_to_student
 * Sent to student when any staff member sends a direct message from Study Abroad or
 * Education Planning service panels.
 *
 * WhatsApp message format:
 *   staff_message_to_student,{studentName},{serviceName},{message},{senderNameWithRole}
 *
 * Variables:
 *   1: studentName
 *   2: serviceName  (e.g. "Study Abroad", "Education Planning")
 *   3: full message body
 *   4: sender display name with role (e.g. "John Doe - OPS")
 */
export const sendWhatsAppStaffMessage = async (
  mobileNumber: string,
  studentName: string,
  serviceName: string,
  message: string,
  senderWithRole: string
): Promise<void> => {
  // Replace commas in the message body to avoid breaking the webhook's CSV-style param parsing
  const safeMessage = message.replace(/,/g, ';');
  const whatsappMessage = `staff message to student,${studentName},${serviceName},${safeMessage},${senderWithRole}`;
  console.log(whatsappMessage)
  const url = buildWhatsAppUrl(mobileNumber, whatsappMessage);
  console.log(url)
  if (!url) return;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    console.log(`✅ WhatsApp staff message sent:`, response.status);
  } catch (error: any) {
    console.error(`⚠️ Failed to send WhatsApp staff message:`, error.message);
  }
};

/**
 * Template 9: offer_received
 * Sent to student when program status = "Offer Received".
 *
 * WhatsApp message format:
 *   offer received,{studentName},{programName},{university}
 */
export const sendWhatsAppOfferReceived = async (
  mobileNumber: string,
  studentName: string,
  programName: string,
  university: string
): Promise<void> => {
  const message = `offer received,${studentName},${programName},${university}`;
  const url = buildWhatsAppUrl(mobileNumber, message);
  if (!url) return;

  try {
    const response = await axios.get(url, { timeout: 15000 });
    console.log(`✅ WhatsApp offer received notification sent:`, response.status);
  } catch (error: any) {
    console.error(`⚠️ Failed to send WhatsApp offer received notification:`, error.message);
  }
};
