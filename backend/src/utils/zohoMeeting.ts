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
  zsoid?: string; // Zoho organization ID
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

/**
 * Get the Zoho Meeting Organization ID (zsoid).
 *
 * Priority:
 *   1. ZOHO_ZSOID env var (fastest — set this in .env)
 *   2. GET /api/v2/user.json  (needs ZohoMeeting.meeting.READ scope)
 *   3. GET accounts.zoho.com/oauth/user/info  (needs AaaServer.profile.READ scope)
 *
 * ━━━ HOW TO SET ZOHO_ZSOID ━━━
 * 1. Go to https://api-console.zoho.com → Self Client → "Generate Code"
 * 2. Scope: ZohoMeeting.meeting.READ   Time Duration: 10 minutes
 * 3. Exchange the code for tokens:
 *      POST https://accounts.zoho.com/oauth/v2/token
 *        ?code=<code>&client_id=...&client_secret=...
 *        &redirect_uri=<your_redirect>&grant_type=authorization_code
 * 4. Use the access_token to call:
 *      GET https://meeting.zoho.com/api/v2/user.json
 *        Authorization: Zoho-oauthtoken <access_token>
 * 5. Copy the "zsoid" value into ZOHO_ZSOID in your .env
 *
 * ━━━ OR regenerate ZOHO_REFRESH_TOKEN with scope ━━━
 *   ZohoMeeting.meeting.CREATE,ZohoMeeting.meeting.READ,ZohoMeeting.meeting.DELETE
 * and the zsoid will be auto-fetched on every startup.
 */
const getZsoid = async (accessToken: string): Promise<string> => {
  // 1. Return cached value if already resolved
  if (tokenCache?.zsoid) {
    return tokenCache.zsoid;
  }

  // 2. Use env variable if set (most reliable, no extra API call needed)
  const envZsoid = process.env.ZOHO_ZSOID?.trim();
  if (envZsoid) {
    if (tokenCache) tokenCache.zsoid = envZsoid;
    console.log(`✅ Zoho zsoid from env: ${envZsoid}`);
    return envZsoid;
  }

  // 3. Try Meeting API user endpoint (needs ZohoMeeting.meeting.READ scope)
  try {
    const response = await axios.get(
      `${getMeetingApiBase()}/user.json`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );
    const zsoid =
      response.data?.userDetails?.zsoid ||
      response.data?.zsoid ||
      response.data?.ZSOID;
    if (zsoid) {
      if (tokenCache) tokenCache.zsoid = zsoid;
      console.log(`✅ Zoho zsoid from meeting API: ${zsoid}`);
      return zsoid;
    }
  } catch {
    // Scope insufficient — fall through to next method
  }

  // 4. Try Accounts API user/info endpoint (needs AaaServer.profile.READ scope)
  try {
    const response = await axios.get(
      `${getAccountsDomain()}/oauth/user/info`,
      { headers: { Authorization: `Zoho-oauthtoken ${accessToken}` } }
    );
    const zsoid =
      response.data?.ZSOID ||
      response.data?.zsoid ||
      response.data?.userDetails?.zsoid;
    if (zsoid) {
      if (tokenCache) tokenCache.zsoid = zsoid;
      console.log(`✅ Zoho zsoid from accounts API: ${zsoid}`);
      return zsoid;
    }
  } catch {
    // Scope insufficient — fall through to error
  }

  // 5. All methods failed — tell the user exactly what to do
  throw new Error(
    "\n\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "Zoho Meeting: ZOHO_ZSOID not set and cannot be auto-fetched.\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "Your refresh token is missing the ZohoMeeting.meeting.READ scope.\n\n" +
    "QUICK FIX – Option A (recommended):\n" +
    "  1. Go to: https://api-console.zoho.com → Self Client → Generate Code\n" +
    "  2. Scope: ZohoMeeting.meeting.READ   Duration: 10 min\n" +
    "  3. Run: curl -X POST \"https://accounts.zoho.com/oauth/v2/token\" \\\n" +
    "             -d \"code=<code>&client_id=ZOHO_CLIENT_ID&client_secret=ZOHO_CLIENT_SECRET&grant_type=authorization_code&redirect_uri=http://localhost\"\n" +
    "  4. Use returned access_token: curl https://meeting.zoho.com/api/v2/user.json -H \"Authorization: Zoho-oauthtoken <access_token>\"\n" +
    "  5. Add ZOHO_ZSOID=<zsoid> to your .env\n\n" +
    "QUICK FIX – Option B (regenerate refresh token):\n" +
    "  Regenerate ZOHO_REFRESH_TOKEN with scope:\n" +
    "    ZohoMeeting.meeting.CREATE,ZohoMeeting.meeting.READ,ZohoMeeting.meeting.DELETE\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
  );
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
 * API: POST /api/v2/{zsoid}/sessions.json
 * Docs: https://www.zoho.com/meeting/api-integration/meeting-api/create-a-meeting.html
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
  const zsoid = await getZsoid(accessToken);

  // Format start time for Zoho: "MMM dd, yyyy hh:mm AM/PM" (e.g. "Feb 07, 2026 10:30 AM")
  const dateObj = new Date(startTime);
  const zohoStartTime = formatZohoDateTime(dateObj);

  // Duration must be in milliseconds (not minutes)
  const durationMs = duration * 60 * 1000;

  const sessionData: any = {
    session: {
      topic,
      startTime: zohoStartTime, // Note: capital T in startTime
      duration: durationMs, // milliseconds
      timezone,
    },
  };

  if (agenda) {
    sessionData.session.agenda = agenda;
  }

  if (participantEmails && participantEmails.length > 0) {
    sessionData.session.participants = participantEmails.map((email) => ({
      email,
    }));
  }

  try {
    // Zoho Meeting API requires Content-Type: application/json
    // The 'presenter' field must be the ZOHO_PRESENTER_ID (user's ZUID, e.g. 796824556)
    const presenterZuid = process.env.ZOHO_PRESENTER_ID?.trim() || zsoid;
    sessionData.session.presenter = presenterZuid;

    const response = await axios.post(
      `${getMeetingApiBase()}/${zsoid}/sessions.json`,
      sessionData,
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
      meetingUrl: session.joinLink || session.joinUrl || session.meetingURL || "",
      startUrl: session.startLink || session.startUrl || session.hostUrl || "",
      meetingNumber: session.meetingKey || session.meetingNumber || session.sessionId || "",
      topic: session.topic || topic,
      startTime: session.startTime || dateObj.toISOString(),
      duration: session.duration || duration,
    };

    console.log(`✅ Zoho Meeting created: ${result.meetingUrl}`);
    return result;
  } catch (error: any) {
    const errData = error?.response?.data;
    console.error(
      "❌ Failed to create Zoho Meeting:",
      errData ? JSON.stringify(errData) : error.message
    );
    const errMsg = errData?.error?.message || errData?.message || error.message;
    throw new Error(`Failed to create Zoho Meeting: ${errMsg}`);
  }
};

// ──────────────────────────────────────────────────
// Delete / Cancel Meeting
// ──────────────────────────────────────────────────

/**
 * Delete a Zoho meeting by its key.
 * API: DELETE /api/v2/{zsoid}/sessions/{meetingKey}.json
 */
export const deleteZohoMeeting = async (meetingKey: string): Promise<void> => {
  if (!meetingKey || meetingKey === "not-configured") return;

  if (!process.env.ZOHO_CLIENT_ID) {
    console.warn("⚠️  Zoho not configured, skipping meeting deletion.");
    return;
  }

  try {
    const accessToken = await getAccessToken();
    const zsoid = await getZsoid(accessToken);

    await axios.delete(`${getMeetingApiBase()}/${zsoid}/sessions/${meetingKey}.json`, {
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
