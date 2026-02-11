import { Request, Response } from 'express';
/**
 * GET /api/agent-suggestions
 * Get all relevant agent suggestions based on career role and pointer number
 *
 * Query parameters:
 * - careerRole: Required - Career role entered by Ivy Expert
 * - pointerNo: Required - Pointer number (2, 3, or 4)
 */
export declare const getAgentSuggestionsHandler: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=agentSuggestion.controller.d.ts.map