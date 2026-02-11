import { Request, Response } from 'express';
import { getAgentSuggestions } from '../services/agentSuggestion.service';
import { PointerNo } from '../types/PointerNo';

/**
 * GET /api/agent-suggestions
 * Get all relevant agent suggestions based on career role and pointer number
 * 
 * Query parameters:
 * - careerRole: Required - Career role entered by Ivy Expert
 * - pointerNo: Required - Pointer number (2, 3, or 4)
 */
export const getAgentSuggestionsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { careerRole, pointerNo } = req.query;

    // Validate required parameters
    if (!careerRole) {
      res.status(400).json({
        success: false,
        message: 'careerRole is required',
      });
      return;
    }

    if (!pointerNo) {
      res.status(400).json({
        success: false,
        message: 'pointerNo is required (2, 3, or 4)',
      });
      return;
    }

    // Validate and convert pointerNo
    const pointerNum = parseInt(pointerNo as string, 10);
    if (
      pointerNum !== PointerNo.SpikeInOneArea &&
      pointerNum !== PointerNo.LeadershipInitiative &&
      pointerNum !== PointerNo.GlobalSocialImpact
    ) {
      res.status(400).json({
        success: false,
        message: 'Invalid pointerNo. Must be 2, 3, or 4',
      });
      return;
    }

    // Validate careerRole
    if (typeof careerRole !== 'string' || careerRole.trim().length === 0) {
      res.status(400).json({
        success: false,
        message: 'careerRole must be a non-empty string',
      });
      return;
    }

    // Get all relevant suggestions (high recall, no ranking)
    const suggestions = await getAgentSuggestions(
      careerRole as string,
      pointerNum as PointerNo.SpikeInOneArea | PointerNo.LeadershipInitiative | PointerNo.GlobalSocialImpact
    );

    // Format response as pure JSON array
    const activities = suggestions.map((activity) => ({
      _id: activity._id,
      title: activity.title,
      description: activity.description,
      tags: activity.tags,
      pointerNo: activity.pointerNo,
      documentUrl: activity.documentUrl || null,
      documentName: activity.documentName || null,
    }));

    // Return pure JSON array of activities
    res.status(200).json(activities);
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to get agent suggestions',
    });
  }
};
