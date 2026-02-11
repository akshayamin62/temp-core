"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteZohoMeeting = exports.createZohoMeeting = void 0;
const axios_1 = __importDefault(require("axios"));
// ──────────────────────────────────────────────────
// Token Management (cached in-memory)
// ──────────────────────────────────────────────────
let tokenCache = null;
const getAccountsDomain = () => {
    const domain = process.env.ZOHO_ACCOUNT_DOMAIN || "com";
    return `https://accounts.zoho.${domain}`;
};
const getMeetingApiBase = () => {
    const domain = process.env.ZOHO_ACCOUNT_DOMAIN || "com";
    return `https://meeting.zoho.${domain}/api/v2`;
};
/**
 * Refresh the access token using the stored refresh token.
 * Caches response; reuses until 2 min before expiry.
 */
const getAccessToken = async () => {
    // Return cached token if still valid (with 2-min buffer)
    if (tokenCache && Date.now() < tokenCache.expiresAt - 120000) {
        return tokenCache.accessToken;
    }
    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;
    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error("Zoho Meeting credentials not configured. Set ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, and ZOHO_REFRESH_TOKEN.");
    }
    try {
        const response = await axios_1.default.post(`${getAccountsDomain()}/oauth/v2/token`, null, {
            params: {
                refresh_token: refreshToken,
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
            },
        });
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
    }
    catch (error) {
        console.error("❌ Failed to refresh Zoho access token:", error?.response?.data || error.message);
        throw new Error("Failed to obtain Zoho access token");
    }
};
/**
 * Create a Zoho Meeting and return the join link.
 *
 * API: POST /api/v2/session.json
 * Docs: https://www.zoho.com/meeting/api-integration.html
 */
const createZohoMeeting = async (params) => {
    const { topic, startTime, duration, timezone = "Asia/Kolkata", agenda, participantEmails, } = params;
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
    const requestBody = {
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
        const response = await axios_1.default.post(`${getMeetingApiBase()}/session.json`, requestBody, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
                "Content-Type": "application/json",
            },
        });
        const session = response.data?.session;
        if (!session) {
            console.error("Zoho Meeting API response:", JSON.stringify(response.data, null, 2));
            throw new Error("Unexpected Zoho Meeting API response structure");
        }
        const result = {
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
    }
    catch (error) {
        console.error("❌ Failed to create Zoho Meeting:", error?.response?.data || error.message);
        throw new Error(`Failed to create Zoho Meeting: ${error?.response?.data?.message || error.message}`);
    }
};
exports.createZohoMeeting = createZohoMeeting;
// ──────────────────────────────────────────────────
// Delete / Cancel Meeting
// ──────────────────────────────────────────────────
/**
 * Delete a Zoho meeting by its key.
 */
const deleteZohoMeeting = async (meetingKey) => {
    if (!meetingKey || meetingKey === "not-configured")
        return;
    if (!process.env.ZOHO_CLIENT_ID) {
        console.warn("⚠️  Zoho not configured, skipping meeting deletion.");
        return;
    }
    try {
        const accessToken = await getAccessToken();
        await axios_1.default.delete(`${getMeetingApiBase()}/${meetingKey}.json`, {
            headers: {
                Authorization: `Zoho-oauthtoken ${accessToken}`,
            },
        });
        console.log(`✅ Zoho Meeting ${meetingKey} deleted`);
    }
    catch (error) {
        console.error(`❌ Failed to delete Zoho Meeting ${meetingKey}:`, error?.response?.data || error.message);
        // Non-fatal – don't throw; meeting might already be deleted
    }
};
exports.deleteZohoMeeting = deleteZohoMeeting;
// ──────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────
/**
 * Format a Date to Zoho's expected format: "MMM dd, yyyy hh:mm a"
 * e.g. "Feb 07, 2026 02:30 PM"
 */
function formatZohoDateTime(date) {
    const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
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
//# sourceMappingURL=zohoMeeting.js.map