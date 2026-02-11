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
export interface ZohoMeetingResult {
    meetingKey: string;
    meetingUrl: string;
    startUrl?: string;
    meetingNumber?: string;
    topic: string;
    startTime: string;
    duration: number;
}
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
export declare const createZohoMeeting: (params: CreateMeetingParams) => Promise<ZohoMeetingResult>;
/**
 * Delete a Zoho meeting by its key.
 */
export declare const deleteZohoMeeting: (meetingKey: string) => Promise<void>;
export {};
//# sourceMappingURL=zohoMeeting.d.ts.map