/**
 * Zoho Meeting Integration Utility
 *
 * Uses Zoho Meeting REST API with OAuth2 Server-to-Server auth.
 *
 * Required ENV variables:
 *   ZOHO_CLIENT_ID       – from Zoho API Console
 *   ZOHO_CLIENT_SECRET   – from Zoho API Console
 *   ZOHO_REFRESH_TOKEN   – generated once via OAuth2 flow
 *   ZOHO_ACCOUNT_DOMAIN  – "com" | "in" | "eu" | "com.au" | "com.cn" (default "com")
 */

import axios from "axios";

// ──────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────

export interface ZohoMeetingResult {
  meetingKey: string;
  meetingUrl: string; // join URL for all participants
  startUrl?: string; // host start URL (if returned)
  meetingNumber?: string;
  topic: string;
  startTime: string;
  duration: number;
}

interface ZohoTokenCache {
  accessToken: string;
  expiresAt: number; // epoch ms
}

// ──────────────────────────────────────────────────
// Token Management (cached in-memory)
// ──────────────────────────────────────────────────

let tokenCache: ZohoTokenCache | null = null;

const getAccountsDomain = (): string => {
  const domain = process.env.ZOHO_ACCOUNT_DOMAIN || "com";
  return `https://accounts.zoho.${domain}`;
};

const getMeetingApiBase = (): string => {
  const domain = process.env.ZOHO_ACCOUNT_DOMAIN || "com";
  return `https://meeting.zoho.${domain}/api/v2`;
};

/**
 * Refresh the access token using the stored refresh token.
 * Caches response; reuses until 2 min before expiry.
 */
const getAccessToken = async (): Promise<string> => {
  // Return cached token if still valid (with 2-min buffer)
  if (tokenCache && Date.now() < tokenCache.expiresAt - 120_000) {
    return tokenCache.accessToken;
  }

  const clientId = process.env.ZOHO_CLIENT_ID;
  const clientSecret = process.env.ZOHO_CLIENT_SECRET;
  const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Zoho Meeting credentials not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN."
    );
  }

  try {
    const response = await axios.post(
      `${getAccountsDomain()}/oauth/v2/token`,
      null,
      {
        params: {
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: "refresh_token",
        },
      }
    );

    const { access_token, expires_in } = response.data;

    if (!access_token) {
      console.error("Zoho token response:", response.data);
      throw new Error("No access_token in Zoho response");
    }

    tokenCache = {
      accessToken: access_token,
      expiresAt: Date.now() + expires_in * 1000,
    };

    console.log("✅ Zoho access token refreshed");
    return access_token;
  } catch (error: any) {
    console.error("❌ Failed to refresh Zoho access token:", error?.response?.data || error.message);
    throw new Error("Failed to obtain Zoho access token");
  }
};

// ──────────────────────────────────────────────────
// Create Meeting
// ──────────────────────────────────────────────────

interface CreateMeetingParams {
  topic: string;
  /** ISO date string or Date object */
  startTime: Date | string;
  /** Duration in minutes */
  duration: number;
  /** Timezone (IANA), default Asia/Kolkata */
  timezone?: string;
  /** Optional agenda / description */
  agenda?: string;
  /** Participant emails to invite */
  participantEmails?: string[];
}

/**
 * Create a Zoho Meeting and return the join link.
 *
 * API: POST /api/v2/session.json
 * Docs: https://www.zoho.com/meeting/api-integration.html
 */
export const createZohoMeeting = async (
  params: CreateMeetingParams
): Promise<ZohoMeetingResult> => {
  const {
    topic,
    startTime,
    duration,
    timezone = "Asia/Kolkata",
    agenda,
    participantEmails,
  } = params;

  // Check if Zoho credentials are configured
  if (!process.env.ZOHO_CLIENT_ID || !process.env.ZOHO_CLIENT_SECRET || !process.env.ZOHO_REFRESH_TOKEN) {
    console.warn("⚠️  Zoho Meeting credentials not configured. Returning placeholder link.");
    return {
      meetingKey: "not-configured",
      meetingUrl: "",
      topic,
      startTime: new Date(startTime).toISOString(),
      duration,
    };
  }

  const accessToken = await getAccessToken();

  // Format start time for Zoho: "MMM dd, yyyy HH:mm AM/PM" (e.g. "Feb 07, 2026 10:30 AM")
  const dateObj = new Date(startTime);
  const zohoStartTime = formatZohoDateTime(dateObj);

  const requestBody: any = {
    session: {
      topic,
      startTime: zohoStartTime,
      duration: duration,
      timezone,
      type: 2, // 2 = meeting (1 = webinar)
    },
  };

  if (agenda) {
    requestBody.session.agenda = agenda;
  }

  if (participantEmails && participantEmails.length > 0) {
    requestBody.session.participants = participantEmails.map((email) => ({
      email,
    }));
  }

  try {
    const response = await axios.post(
      `${getMeetingApiBase()}/session.json`,
      requestBody,
      {
        headers: {
          Authorization: `Zoho-oauthtoken ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const session = response.data?.session;

    if (!session) {
      console.error("Zoho Meeting API response:", JSON.stringify(response.data, null, 2));
      throw new Error("Unexpected Zoho Meeting API response structure");
    }

    const result: ZohoMeetingResult = {
      meetingKey: session.meetingKey || session.sessionKey || "",
      meetingUrl: session.joinUrl || session.meetingURL || "",
      startUrl: session.startUrl || session.hostUrl || "",
      meetingNumber: session.meetingNumber || session.sessionId || "",
      topic: session.topic || topic,
      startTime: session.startTime || dateObj.toISOString(),
      duration: session.duration || duration,
    };

    console.log(`✅ Zoho Meeting created: ${result.meetingUrl}`);
    return result;
  } catch (error: any) {
    console.error(
      "❌ Failed to create Zoho Meeting:",
      error?.response?.data || error.message
    );
    throw new Error(
      `Failed to create Zoho Meeting: ${error?.response?.data?.message || error.message}`
    );
  }
};

// ──────────────────────────────────────────────────
// Delete / Cancel Meeting
// ──────────────────────────────────────────────────

/**
 * Delete a Zoho meeting by its key.
 */
export const deleteZohoMeeting = async (meetingKey: string): Promise<void> => {
  if (!meetingKey || meetingKey === "not-configured") return;

  if (!process.env.ZOHO_CLIENT_ID) {
    console.warn("⚠️  Zoho not configured, skipping meeting deletion.");
    return;
  }

  try {
    const accessToken = await getAccessToken();

    await axios.delete(`${getMeetingApiBase()}/${meetingKey}.json`, {
      headers: {
        Authorization: `Zoho-oauthtoken ${accessToken}`,
      },
    });

    console.log(`✅ Zoho Meeting ${meetingKey} deleted`);
  } catch (error: any) {
    console.error(
      `❌ Failed to delete Zoho Meeting ${meetingKey}:`,
      error?.response?.data || error.message
    );
    // Non-fatal – don't throw; meeting might already be deleted
  }
};

// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────

/**
 * Format a Date to Zoho's expected format: "MMM dd, yyyy hh:mm a"
 * e.g. "Feb 07, 2026 02:30 PM"
 */
function formatZohoDateTime(date: Date): string {
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];

  const month = months[date.getMonth()];
  const day = String(date.getDate()).padStart(2, "0");
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
}
