import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { resolveIvyExpertId, resolveStudentId } from '../utils/resolveRole';
import multer from 'multer';
import {
  selectActivities,
  getStudentActivities,
  uploadProof,
  evaluateActivity,
  uploadIvyExpertDocuments,
  updateDocumentTaskStatus,
  setActivityDeadline,
} from '../services/pointerActivity.service';
import { updateWeightages } from '../services/pointer234Activity.service';
import StudentPointerScore from '../models/ivy/StudentPointerScore';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
});

export const proofUploadMiddleware = upload.array('proofFiles', 5);
export const ivyExpertDocsMiddleware = upload.array('ivyExpertDocs', 5);

export const selectActivitiesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId, pointerNo, agentSuggestionIds, isVisibleToStudent, weightages, deadlines } =
      req.body;
    const authReq = req as AuthRequest;
    const ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);

    if (!studentIvyServiceId) {
      res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
      return;
    }
    if (!pointerNo) {
      res.status(400).json({ success: false, message: 'pointerNo is required (2, 3, or 4)' });
      return;
    }
    if (!agentSuggestionIds || !Array.isArray(agentSuggestionIds) || agentSuggestionIds.length === 0) {
      res.status(400).json({ success: false, message: 'agentSuggestionIds must be a non-empty array' });
      return;
    }
    const selections = await selectActivities(
      studentIvyServiceId,
      ivyExpertId,
      Number(pointerNo),
      agentSuggestionIds,
      isVisibleToStudent !== false, // default true
      weightages, // Pass weightages array
      deadlines, // Pass deadlines array
    );

    res.status(200).json({
      success: true,
      message: 'Activities saved successfully',
      data: selections.map(({ selection, suggestion }) => ({
        selectionId: selection._id,
        pointerNo: selection.pointerNo,
        isVisibleToStudent: selection.isVisibleToStudent,
        suggestion: {
          _id: suggestion._id,
          title: suggestion.title,
          description: suggestion.description,
          tags: suggestion.tags,
        },
      })),
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to save activities',
    });
  }
};

export const getStudentActivitiesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;
    const { studentIvyServiceId, includeInvisible } = req.query;

    const identifier = studentIvyServiceId ? (studentIvyServiceId as string) : (studentId as string);
    const useServiceId = !!studentIvyServiceId;

    if (!identifier) {
      res.status(400).json({
        success: false,
        message: 'studentId or studentIvyServiceId is required',
      });
      return;
    }

    const data = await getStudentActivities(
      identifier,
      useServiceId,
      includeInvisible === 'true',
    );

    res.status(200).json({
      success: true,
      data,
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to fetch activities',
    });
  }
};

export const uploadProofHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No proof files uploaded' });
      return;
    }

    const { ivyExpertSelectedSuggestionId, remarks } = req.body;
    const authReq = req as AuthRequest;
    const studentId = await resolveStudentId(authReq.user!.userId);

    if (!ivyExpertSelectedSuggestionId) {
      res.status(400).json({ success: false, message: 'ivyExpertSelectedSuggestionId is required' });
      return;
    }

    const submission = await uploadProof(
      ivyExpertSelectedSuggestionId,
      studentId,
      files,
      remarks,
    );

    res.status(200).json({
      success: true,
      message: 'Proof uploaded successfully',
      data: {
        _id: submission._id,
        files: submission.files,
        remarks: submission.remarks,
        submittedAt: submission.submittedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload proof',
    });
  }
};

export const evaluateActivityHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentSubmissionId, score, feedback } = req.body;
    const authReq = req as AuthRequest;
    const ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);

    if (!studentSubmissionId) {
      res.status(400).json({ success: false, message: 'studentSubmissionId is required' });
      return;
    }
    if (score === undefined || score === null) {
      res.status(400).json({ success: false, message: 'score is required (0-10)' });
      return;
    }
    const evaluation = await evaluateActivity(
      studentSubmissionId,
      ivyExpertId,
      Number(score),
      feedback,
    );

    res.status(200).json({
      success: true,
      message: 'Evaluation saved successfully',
      data: {
        _id: evaluation._id,
        score: evaluation.score,
        feedback: evaluation.feedback,
        evaluatedAt: evaluation.evaluatedAt,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to evaluate activity',
    });
  }
};

export const uploadIvyExpertDocumentsHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const { selectionId } = req.body;
    const authReq = req as AuthRequest;
    const ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);

    if (!selectionId) {
      res.status(400).json({ success: false, message: 'selectionId is required' });
      return;
    }

    const selection = await uploadIvyExpertDocuments(selectionId, ivyExpertId, files);

    res.status(200).json({
      success: true,
      message: 'Documents uploaded successfully',
      data: {
        selectionId: selection._id,
        ivyExpertDocuments: selection.ivyExpertDocuments,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to upload documents',
    });
  }
};

export const updateDocumentTaskStatusHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { selectionId, documentUrl, taskIndex, status } = req.body;
    const authReq = req as AuthRequest;
    const ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);

    if (!selectionId) {
      res.status(400).json({ success: false, message: 'selectionId is required' });
      return;
    }
    if (!documentUrl) {
      res.status(400).json({ success: false, message: 'documentUrl is required' });
      return;
    }
    if (typeof taskIndex !== 'number') {
      res.status(400).json({ success: false, message: 'taskIndex is required' });
      return;
    }
    if (!status || !['not-started', 'in-progress', 'completed'].includes(status)) {
      res.status(400).json({ success: false, message: 'status must be one of: not-started, in-progress, completed' });
      return;
    }

    const selection = await updateDocumentTaskStatus(
      selectionId,
      ivyExpertId,
      documentUrl,
      taskIndex,
      status
    );

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: {
        selectionId: selection._id,
        ivyExpertDocuments: selection.ivyExpertDocuments,
      },
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update task status',
    });
  }
};

export const updateWeightagesHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentIvyServiceId, weightages, pointerNo } = req.body;
    const authReq = req as AuthRequest;
    const ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);

    if (!studentIvyServiceId) {
      res.status(400).json({
        success: false,
        message: 'studentIvyServiceId is required',
      });
      return;
    }

    if (!weightages || typeof weightages !== 'object') {
      res.status(400).json({
        success: false,
        message: 'weightages object is required',
      });
      return;
    }

    const updated = await updateWeightages(studentIvyServiceId, ivyExpertId, weightages, pointerNo);

    res.status(200).json({
      success: true,
      message: 'Weightages updated successfully',
      data: {
        count: updated.length,
      },
    });
  } catch (error: any) {
    console.error('Update weightages error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update weightages',
    });
  }
};

export const getPointerActivityScoreHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentIvyServiceId = req.params.studentIvyServiceId || req.query.studentIvyServiceId;
    const pointerNo = req.params.pointerNo || req.query.pointerNo;

    if (!studentIvyServiceId) {
      res.status(400).json({ success: false, message: 'studentIvyServiceId is required' });
      return;
    }
    if (!pointerNo) {
      res.status(400).json({ success: false, message: 'pointerNo is required' });
      return;
    }

    // Read from StudentPointerScore which has the weighted average score
    // This ensures consistency with the dashboard
    const pointerScore = await StudentPointerScore.findOne({
      studentIvyServiceId,
      pointerNo: Number(pointerNo),
    });

    if (!pointerScore) {
      // If no score record exists yet, return 0
      res.status(200).json({ success: true, data: 0 });
      return;
    }

    // Return the normalized score (already calculated as weighted average)
    const normalizedScore = (pointerScore.scoreObtained / pointerScore.maxScore) * 10;

    res.status(200).json({
      success: true,
      data: Math.round(normalizedScore * 100) / 100, // Round to 2 decimals
    });
  } catch (error: any) {
    console.error('Get pointer activity score error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pointer activity score',
    });
  }
};

export const setDeadlineHandler = async (req: Request, res: Response): Promise<void> => {
  try {
    const { selectionId, deadline } = req.body;
    const authReq = req as AuthRequest;
    const ivyExpertId = await resolveIvyExpertId(authReq.user!.userId);

    if (!selectionId) {
      res.status(400).json({ success: false, message: 'selectionId is required' });
      return;
    }
    if (!deadline) {
      res.status(400).json({ success: false, message: 'deadline is required' });
      return;
    }
    const selection = await setActivityDeadline(selectionId, ivyExpertId, deadline);

    res.status(200).json({
      success: true,
      message: 'Deadline set successfully',
      data: {
        selectionId: selection._id,
        deadline: selection.deadline,
      },
    });
  } catch (error: any) {
    console.error('Set deadline error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to set deadline',
    });
  }
};
