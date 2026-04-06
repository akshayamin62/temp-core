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
