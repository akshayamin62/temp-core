import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import AgentSuggestion from '../models/ivy/AgentSuggestion';
import IvyExpertSelectedSuggestion, { IIvyExpertSelectedSuggestion } from '../models/ivy/IvyExpertSelectedSuggestion';
import StudentSubmission from '../models/ivy/StudentSubmission';
import IvyExpertEvaluation from '../models/ivy/IvyExpertEvaluation';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import IvyExpert from '../models/IvyExpert';
import Student from '../models/Student';
import User from '../models/User';
import Service from '../models/Service';
import { PointerNo } from '../types/PointerNo';
import { updateScoreAfterEvaluation } from './ivyScore.service';
import { extractTOC } from './tocExtractor.service';
import { createNotification } from './notification.service';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';
import { sendWhatsAppGeneral4LineNotification } from '../utils/whatsapp';
import { sendEmail } from '../utils/email';

const POINTER_LABELS: Record<number, string> = {
  2: 'Spike in One Area',
  3: 'Leadership Initiative',
  4: 'Global & Social Impact',
};

const SUPPORTED_POINTERS = [
  PointerNo.SpikeInOneArea,
  PointerNo.LeadershipInitiative,
  PointerNo.GlobalSocialImpact,
];

const UPLOAD_DIR = path.join(getUploadBaseDir(), 'pointer-activities');
ensureDir(UPLOAD_DIR);

const ensureObjectId = (value: string, label: string): mongoose.Types.ObjectId => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${label}`);
  }
  return new mongoose.Types.ObjectId(value);
};

const ensureAllowedPointer = (pointerNo: number) => {
  if (!SUPPORTED_POINTERS.includes(pointerNo)) {
    throw new Error('pointerNo must be 2, 3, or 4');
  }
};

const cleanFileName = (name: string) => name.replace(/[^\w.\- ]/g, '');

const saveProofFiles = async (
  files: Express.Multer.File[],
  pointerNo: PointerNo,
  selectionId: string,
): Promise<string[]> => {
  const folderPath = path.join(UPLOAD_DIR, pointerNo.toString(), selectionId);
  ensureDir(folderPath);

  return files.map((file) => {
    const safeName = cleanFileName(file.originalname);
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/pointer-activities/${pointerNo}/${selectionId}/${fileName}`;
  });
};

const deleteFilesIfExist = (filePaths: string[]) => {
  filePaths.forEach((relativePath) => {
    const fullPath = path.join(process.cwd(), relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  });
};

const saveIvyExpertDocuments = async (
  files: Express.Multer.File[],
  pointerNo: PointerNo,
  selectionId: string,
): Promise<string[]> => {
  const folderPath = path.join(UPLOAD_DIR, 'ivy-expert-docs', pointerNo.toString(), selectionId);
  ensureDir(folderPath);

  return files.map((file) => {
    const safeName = cleanFileName(file.originalname);
    const fileName = `${Date.now()}-${safeName}`;
    const filePath = path.join(folderPath, fileName);
    fs.writeFileSync(filePath, file.buffer);
    return `/uploads/pointer-activities/ivy-expert-docs/${pointerNo}/${selectionId}/${fileName}`;
  });
};

export const selectActivities = async (
  studentIvyServiceId: string,
  ivyExpertId: string,
  pointerNo: number,
  agentSuggestionIds: string[],
  isVisibleToStudent: boolean = true,
  weightages?: number[],
  deadlines?: string[],
) => {
  ensureAllowedPointer(pointerNo);
  if (!agentSuggestionIds || agentSuggestionIds.length === 0) {
    throw new Error('agentSuggestionIds is required');
  }

  // Validate weightages for Pointers 2, 3, 4
  if (pointerNo === PointerNo.SpikeInOneArea || pointerNo === PointerNo.LeadershipInitiative || pointerNo === PointerNo.GlobalSocialImpact) {
    if (agentSuggestionIds.length === 1) {
      // Auto-assign 100 for single activity
      weightages = [100];
    } else if (weightages && weightages.length > 0) {
      // Multiple activities - validate weightages
      if (weightages.length !== agentSuggestionIds.length) {
        throw new Error('Weightages array must match the number of activities');
      }
      
      // Validate each weightage
      for (const w of weightages) {
        if (typeof w !== 'number' || w < 0 || w > 100) {
          throw new Error('Each weightage must be a number between 0 and 100');
        }
      }
      
      // Validate sum equals 100
      const sum = weightages.reduce((acc, w) => acc + w, 0);
      if (Math.abs(sum - 100) > 0.01) {
        throw new Error(`Total weightage must equal 100, got ${sum}`);
      }
    }
  }

  const service = await StudentServiceRegistration.findById(ensureObjectId(studentIvyServiceId, 'studentIvyServiceId'));
  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: IvyExpert not found');
  }

  const suggestionObjectIds = agentSuggestionIds.map((id) => ensureObjectId(id, 'agentSuggestionId'));
  const suggestions = await AgentSuggestion.find({
    _id: { $in: suggestionObjectIds },
    pointerNo,
  });

  if (suggestions.length !== agentSuggestionIds.length) {
    throw new Error('One or more agentSuggestionIds are invalid for the given pointer');
  }

  const existingSelections = await IvyExpertSelectedSuggestion.find({
    studentIvyServiceId: service._id,
    pointerNo,
  });

  const incomingSet = new Set(agentSuggestionIds.map((id) => id.toString()));
  const toDelete = existingSelections.filter(
    (sel) => !incomingSet.has(sel.agentSuggestionId.toString()),
  );

  // Remove deselected activities along with submissions and evaluations
  for (const sel of toDelete) {
    const submissions = await StudentSubmission.find({
      ivyExpertSelectedSuggestionId: sel._id,
    });
    const submissionIds = submissions.map((s) => s._id);

    if (submissionIds.length > 0) {
      await IvyExpertEvaluation.deleteMany({ studentSubmissionId: { $in: submissionIds } });
    }

    // Delete stored files for these submissions
    submissions.forEach((sub) => deleteFilesIfExist(sub.files || []));

    await StudentSubmission.deleteMany({ ivyExpertSelectedSuggestionId: sel._id });
    await sel.deleteOne();
  }

  // If activities were deleted, it might affect the average score for this pointer
  if (toDelete.length > 0) {
    await refreshPointerAverageScore(service._id.toString(), pointerNo);
  }

  // Create suggestion map before the loop
  const suggestionMap = new Map(
    suggestions.map((sug) => [sug._id.toString(), sug]),
  );

  const updatedSelections: typeof existingSelections = [];

  for (const agentSuggestionId of agentSuggestionIds) {
    const existing = existingSelections.find(
      (sel) => sel.agentSuggestionId.toString() === agentSuggestionId,
    );

    if (existing) {
      existing.isVisibleToStudent = isVisibleToStudent;
      // Update weightage for Pointers 2, 3, 4
      if ((pointerNo === PointerNo.SpikeInOneArea || pointerNo === PointerNo.LeadershipInitiative || pointerNo === PointerNo.GlobalSocialImpact) && weightages) {
        const index = agentSuggestionIds.indexOf(agentSuggestionId);
        if (index !== -1 && weightages[index] !== undefined) {
          existing.weightage = weightages[index];
        }
      }
      // Update deadline if provided
      if (deadlines) {
        const index = agentSuggestionIds.indexOf(agentSuggestionId);
        if (index !== -1 && deadlines[index]) {
          const dl = new Date(deadlines[index]);
          if (!isNaN(dl.getTime())) {
            existing.deadline = dl;
          }
        }
      }
      await existing.save();
      updatedSelections.push(existing);
    } else {
      const index = agentSuggestionIds.indexOf(agentSuggestionId);
      
      // Check if this is a SUPERADMIN activity with a document
      const suggestion = suggestionMap.get(agentSuggestionId);
      let ivyExpertDocuments: any[] = [];
      
      if (suggestion && suggestion.source === 'SUPERADMIN' && suggestion.documentUrl) {
        // Extract TOC from the superadmin's document
        try {
          const fullPath = path.join(process.cwd(), suggestion.documentUrl);
          const extractedTasks = await extractTOC(fullPath);
          
          ivyExpertDocuments = [{
            url: suggestion.documentUrl,
            tasks: extractedTasks.map(task => ({
              title: task.title,
              page: task.page,
              status: 'not-started' as const
            }))
          }];
        } catch (error) {
          console.error('Error extracting TOC for superadmin activity:', error);
          // If extraction fails, create a default task
          ivyExpertDocuments = [{
            url: suggestion.documentUrl,
            tasks: [{
              title: 'Complete Document Review',
              status: 'not-started' as const
            }]
          }];
        }
      }
      
      // Parse deadline if provided
      let deadlineValue: Date | undefined;
      if (deadlines && deadlines[index]) {
        const dl = new Date(deadlines[index]);
        if (!isNaN(dl.getTime())) {
          deadlineValue = dl;
        }
      }

      const created = await IvyExpertSelectedSuggestion.create({
        studentIvyServiceId: service._id,
        agentSuggestionId: ensureObjectId(agentSuggestionId, 'agentSuggestionId'),
        pointerNo,
        isVisibleToStudent,
        ivyExpertDocuments: ivyExpertDocuments.length > 0 ? ivyExpertDocuments : undefined,
        ...((pointerNo === PointerNo.SpikeInOneArea || pointerNo === PointerNo.LeadershipInitiative || pointerNo === PointerNo.GlobalSocialImpact) && weightages && weightages[index] !== undefined 
          ? { weightage: weightages[index] } 
          : {}),
        ...(deadlineValue ? { deadline: deadlineValue } : {}),
      });
      updatedSelections.push(created);
    }
  }

  // Recalculate scores when weightages are updated for Pointers 2, 3, 4
  if ((pointerNo === PointerNo.SpikeInOneArea || pointerNo === PointerNo.LeadershipInitiative || pointerNo === PointerNo.GlobalSocialImpact) && weightages) {
    await refreshPointerAverageScore(service._id.toString(), pointerNo);
  }

  // Create notification to alert student about new activities
  if (updatedSelections.length > 0) {
    try {
      await createNotification({
        studentIvyServiceId: service._id.toString(),
        userId: service.studentId,
        userRole: 'student',
        pointerNumber: pointerNo,
        notificationType: 'activities_assigned',
        referenceId: updatedSelections[0]._id,
      });
    } catch (notifCreateErr) {
      console.error('[PointerActivity] createNotification failed:', notifCreateErr);
    }
  }

  // WhatsApp + email notification to student (Template 25)
  try {
    const studentDoc = await Student.findById(service.studentId).lean() as any;
    const studentUserDoc = studentDoc?.userId
      ? await User.findById(studentDoc.userId).select('firstName middleName lastName email mobileNumber').lean() as any
      : null;
    const studentName = studentUserDoc
      ? [studentUserDoc.firstName, studentUserDoc.middleName, studentUserDoc.lastName].filter(Boolean).join(' ')
      : 'Student';
    const studentMobile = studentDoc?.mobileNumber || studentUserDoc?.mobileNumber;
    const studentEmail = studentDoc?.email || studentUserDoc?.email;

    const pointerLabel = POINTER_LABELS[pointerNo] || `Pointer ${pointerNo}`;
    const activityCount = updatedSelections.length;
    const activityTitles = updatedSelections
      .map((sel) => suggestionMap.get(sel.agentSuggestionId.toString())?.title || '')
      .filter(Boolean)
      .join(', ');
    const line2 = `Your IVY League Expert has suggested ${activityCount} activit${activityCount === 1 ? 'y' : 'ies'} for Pointer *${pointerNo} - ${pointerLabel}*.`;

    if (studentMobile) {
      await sendWhatsAppGeneral4LineNotification(studentMobile, studentName, line2, activityTitles, 'Log in to your dashboard to review and get started.');
    }
    if (studentEmail) {
      const activityListHtml = updatedSelections
        .map((sel, i) => `<li>${i + 1}. ${suggestionMap.get(sel.agentSuggestionId.toString())?.title || ''}</li>`)
        .join('');
      await sendEmail({
        to: studentEmail,
        subject: `New Activities Suggested — Pointer ${pointerNo}: ${pointerLabel}`,
        html: `<p>Hi ${studentName},</p><p>Your IVY League Expert has suggested <strong>${activityCount} activit${activityCount === 1 ? 'y' : 'ies'}</strong> for you under:</p><p>📌 <strong>Pointer ${pointerNo}: ${pointerLabel}</strong></p><ul>${activityListHtml}</ul><p>Log in to your dashboard to review them and start working:</p><p><a href="https://core.admitra.io/dashboard">https://core.admitra.io/dashboard</a></p><p>Best regards,<br/>ADMITra Team</p>`,
      });
    }
  } catch (notifErr) {
    console.error('[PointerActivity Notif] Failed to send notification:', notifErr);
  }

  return updatedSelections.map((sel) => ({
    selection: sel,
    suggestion: suggestionMap.get(sel.agentSuggestionId.toString())!,
  }));
};

export const uploadProof = async (
  ivyExpertSelectedSuggestionId: string,
  studentId: string,
  files: Express.Multer.File[],
  remarks?: string,
) => {
  if (!files || files.length === 0) {
    throw new Error('At least one proof file is required');
  }

  const selection = await IvyExpertSelectedSuggestion.findById(
    ensureObjectId(ivyExpertSelectedSuggestionId, 'ivyExpertSelectedSuggestionId'),
  );
  if (!selection) {
    throw new Error('Selected activity not found');
  }
  ensureAllowedPointer(selection.pointerNo);

  const service = await StudentServiceRegistration.findById(selection.studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }
  if (service.studentId.toString() !== studentId) {
    throw new Error('Unauthorized: student does not match this service');
  }

  const student = await Student.findById(studentId);
  if (!student) {
    throw new Error('Unauthorized: Student not found');
  }

  const filePaths = await saveProofFiles(files, selection.pointerNo, selection._id.toString());

  const existingSubmission = await StudentSubmission.findOne({
    ivyExpertSelectedSuggestionId: selection._id,
  });

  if (existingSubmission) {
    console.log(`[P234-Upload] Appending files to existing submission for selection: ${selection._id}`);
    // Append new files to existing files (don't delete old files)
    existingSubmission.files = [...(existingSubmission.files || []), ...filePaths];
    existingSubmission.remarks = remarks || existingSubmission.remarks || '';
    existingSubmission.submittedAt = new Date();
    await existingSubmission.save();

    // Note: We don't delete the evaluation because we're just adding more proof files
    // The Ivy Expert can review the additional files without re-evaluating

    return existingSubmission;
  }

  const submission = await StudentSubmission.create({
    studentIvyServiceId: service._id,
    ivyExpertSelectedSuggestionId: selection._id,
    files: filePaths,
    remarks: remarks || '',
  });

  // Create notification to alert Ivy Expert about proof upload
  if (service.activeIvyExpertId) {
    await createNotification({
      studentIvyServiceId: service._id.toString(),
      userId: service.activeIvyExpertId,
      userRole: 'ivyExpert',
      pointerNumber: selection.pointerNo,
      notificationType: 'activity_proof_uploaded',
      referenceId: submission._id,
    });
  }

  return submission;
};

export const evaluateActivity = async (
  studentSubmissionId: string,
  ivyExpertId: string,
  score: number,
  feedback?: string,
) => {
  if (score < 0 || score > 10) {
    throw new Error('Score must be between 0 and 10');
  }

  const submission = await StudentSubmission.findById(
    ensureObjectId(studentSubmissionId, 'studentSubmissionId'),
  );
  if (!submission) {
    throw new Error('Student submission not found');
  }

  const selection = await IvyExpertSelectedSuggestion.findById(submission.ivyExpertSelectedSuggestionId);
  if (!selection) {
    throw new Error('Selected activity not found');
  }
  ensureAllowedPointer(selection.pointerNo);

  const service = await StudentServiceRegistration.findById(submission.studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: IvyExpert not found');
  }

  let evaluation = await IvyExpertEvaluation.findOne({ studentSubmissionId: submission._id });
  if (evaluation) {
    evaluation.score = score;
    evaluation.feedback = feedback || '';
    evaluation.evaluatedAt = new Date();
    await evaluation.save();
  } else {
    evaluation = await IvyExpertEvaluation.create({
      studentSubmissionId: submission._id,
      pointerNo: Number(selection.pointerNo),
      score,
      feedback: feedback || '',
    });
  }

  // Recalculate average score for this pointer
  await refreshPointerAverageScore(service._id.toString(), Number(selection.pointerNo));

  return evaluation;
};

/**
 * Recalculates the average score for a given pointer and updates the Ivy ready score.
 * For pointers 2, 3, 4: Uses weighted average based on activity weightage.
 */
const refreshPointerAverageScore = async (studentIvyServiceId: string, pointerNo: number) => {
  // Get all selections for this student and pointer to access weightage
  const selections = await IvyExpertSelectedSuggestion.find({
    studentIvyServiceId: ensureObjectId(studentIvyServiceId, 'studentIvyServiceId'),
    pointerNo: Number(pointerNo)
  });

  // Get all submissions for this student
  const studentSubmissions = await StudentSubmission.find({
    studentIvyServiceId: ensureObjectId(studentIvyServiceId, 'studentIvyServiceId')
  });

  // Create a map of selection ID to weightage
  const selectionWeightageMap = new Map(
    selections.map(sel => [sel._id.toString(), sel.weightage || 0])
  );

  // Get evaluations and their corresponding submissions to link weightages
  const submissionIds = studentSubmissions.map(s => s._id);
  const evaluations = await IvyExpertEvaluation.find({
    studentSubmissionId: { $in: submissionIds },
    pointerNo: Number(pointerNo)
  });

  let averageScore = 0;
  
  if (evaluations.length > 0) {
    // Create a map of submission ID to selection ID
    const submissionToSelectionMap = new Map(
      studentSubmissions.map(sub => [sub._id.toString(), sub.ivyExpertSelectedSuggestionId.toString()])
    );

    // Calculate weighted average
    let totalWeightedScore = 0;
    let totalWeightage = 0;

    for (const evaluation of evaluations) {
      const selectionId = submissionToSelectionMap.get(evaluation.studentSubmissionId.toString());
      if (selectionId) {
        const weightage = selectionWeightageMap.get(selectionId) || 0;
        if (weightage > 0) {
          totalWeightedScore += (weightage / 100) * evaluation.score;
          totalWeightage += weightage;
        }
      }
    }

    // Use weighted average if weightages exist, otherwise fall back to simple average
    if (totalWeightage > 0) {
      averageScore = totalWeightedScore;
    } else {
      // Fallback to simple average if no weightages are set
      const totalScore = evaluations.reduce((sum, ev) => sum + ev.score, 0);
      averageScore = totalScore / evaluations.length;
    }
  }

  await updateScoreAfterEvaluation(
    studentIvyServiceId,
    Number(pointerNo),
    averageScore
  );
};

export const getStudentActivities = async (
  studentIdOrServiceId: string,
  useServiceId: boolean = false,
  includeInvisible: boolean = false,
) => {
  if (!mongoose.Types.ObjectId.isValid(studentIdOrServiceId)) {
    throw new Error('Invalid studentId or studentIvyServiceId');
  }

  const service = useServiceId
    ? await StudentServiceRegistration.findById(studentIdOrServiceId)
    : await (async () => {
        // Filter by Ivy League service to avoid wrong registration for multi-service students
        const ivySvc = await Service.findOne({ slug: 'ivy-league' }).select('_id');
        const filter: any = { studentId: studentIdOrServiceId };
        if (ivySvc) filter.serviceId = ivySvc._id;
        return StudentServiceRegistration.findOne(filter);
      })();

  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  const selectionQuery: any = {
    studentIvyServiceId: service._id,
    pointerNo: { $in: SUPPORTED_POINTERS },
  };
  if (!includeInvisible) {
    selectionQuery.isVisibleToStudent = true;
  }

  const selections = await IvyExpertSelectedSuggestion.find(selectionQuery);
  const suggestionIds = selections.map((sel) => sel.agentSuggestionId);
  const suggestions = await AgentSuggestion.find({ _id: { $in: suggestionIds } });
  const suggestionMap = new Map(suggestions.map((s) => [s._id.toString(), s]));

  const activities = [];
  for (const sel of selections) {
    const submission = await StudentSubmission.findOne({
      ivyExpertSelectedSuggestionId: sel._id,
    });

    let evaluation = null;
    if (submission) {
      evaluation = await IvyExpertEvaluation.findOne({ studentSubmissionId: submission._id });
    }

    activities.push({
      selectionId: sel._id,
      pointerNo: sel.pointerNo,
      isVisibleToStudent: sel.isVisibleToStudent,
      suggestion: suggestionMap.get(sel.agentSuggestionId.toString()),
      selectedAt: sel.selectedAt,
      weightage: sel.weightage, // Include weightage for Pointer 2
      deadline: sel.deadline || null, // Include deadline for countdown
      ivyExpertDocuments: sel.ivyExpertDocuments || [], // Include Ivy Expert uploaded documents
      proofUploaded: !!submission,
      evaluated: !!evaluation,
      submission: submission
        ? {
          _id: submission._id,
          files: submission.files,
          remarks: submission.remarks,
          submittedAt: submission.submittedAt,
        }
        : null,
      evaluation: evaluation
        ? {
          _id: evaluation._id,
          score: evaluation.score,
          feedback: evaluation.feedback,
          evaluatedAt: evaluation.evaluatedAt,
        }
        : null,
    });
  }

  // Sort by pointer then selection date
  activities.sort((a, b) => {
    if (a.pointerNo !== b.pointerNo) return a.pointerNo - b.pointerNo;
    const aDate = selections.find((s) => s._id.equals(a.selectionId))?.selectedAt?.getTime() || 0;
    const bDate = selections.find((s) => s._id.equals(b.selectionId))?.selectedAt?.getTime() || 0;
    return aDate - bDate;
  });

  return {
    studentIvyServiceId: service._id,
    studentId: service.studentId,
    ivyExpertId: service.activeIvyExpertId,
    activities,
  };
};

export const uploadIvyExpertDocuments = async (
  selectionId: string,
  ivyExpertId: string,
  files: Express.Multer.File[],
) => {
  if (!files || files.length === 0) {
    throw new Error('At least one document file is required');
  }

  const selection = await IvyExpertSelectedSuggestion.findById(ensureObjectId(selectionId, 'selectionId'));
  if (!selection) {
    throw new Error('Selected activity not found');
  }
  ensureAllowedPointer(selection.pointerNo);

  const service = await StudentServiceRegistration.findById(selection.studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  if (!service.activeIvyExpertId || service.activeIvyExpertId.toString() !== ivyExpertId) {
    throw new Error('Unauthorized: Ivy Expert does not match this service');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: IvyExpert not found');
  }

  // Validate file types (PDF and Word documents)
  const allowedMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];
  for (const file of files) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new Error(`Invalid file type: ${file.originalname}. Only PDF and Word documents are allowed.`);
    }
  }

  // Save files first
  const savedFileUrls = await saveIvyExpertDocuments(files, selection.pointerNo, selection._id.toString());

  // Extract TOC and create document entries
  const documentEntries = await Promise.all(
    savedFileUrls.map(async (fileUrl) => {
      const fullPath = path.join(process.cwd(), fileUrl);
      
      // Extract table of contents from the document
      const extractedTasks = await extractTOC(fullPath);
      
      return {
        url: fileUrl,
        tasks: extractedTasks.map(task => ({
          title: task.title,
          page: task.page,
          status: 'not-started' as const
        }))
      };
    })
  );

  // Add to existing documents
  selection.ivyExpertDocuments = [...(selection.ivyExpertDocuments || []), ...documentEntries];
  await selection.save();

  return selection;
};

export const updateDocumentTaskStatus = async (
  selectionId: string,
  ivyExpertId: string,
  documentUrl: string,
  taskIndex: number,
  status: 'not-started' | 'in-progress' | 'completed'
) => {
  const selection = await IvyExpertSelectedSuggestion.findById(ensureObjectId(selectionId, 'selectionId'));
  if (!selection) {
    throw new Error('Selected activity not found');
  }
  ensureAllowedPointer(selection.pointerNo);

  const service = await StudentServiceRegistration.findById(selection.studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  if (!service.activeIvyExpertId || service.activeIvyExpertId.toString() !== ivyExpertId) {
    throw new Error('Unauthorized: Ivy Expert does not match this service');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: IvyExpert not found');
  }

  // Find the document and update task status
  const document = selection.ivyExpertDocuments?.find(doc => doc.url === documentUrl);
  if (!document) {
    throw new Error('Document not found');
  }

  if (taskIndex < 0 || taskIndex >= document.tasks.length) {
    throw new Error('Invalid task index');
  }

  document.tasks[taskIndex].status = status;
  await selection.save();

  return selection;
};

export const setActivityDeadline = async (
  selectionId: string,
  ivyExpertId: string,
  deadline: string,
) => {
  const selection = await IvyExpertSelectedSuggestion.findById(ensureObjectId(selectionId, 'selectionId'));
  if (!selection) {
    throw new Error('Selected activity not found');
  }
  ensureAllowedPointer(selection.pointerNo);

  const service = await StudentServiceRegistration.findById(selection.studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }

  if (!service.activeIvyExpertId || service.activeIvyExpertId.toString() !== ivyExpertId) {
    throw new Error('Unauthorized: Ivy Expert does not match this service');
  }

  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    throw new Error('Invalid deadline date');
  }

  selection.deadline = deadlineDate;
  await selection.save();

  return selection;
};

/**
 * Update weightages for selected activities (Ivy Expert only)
 * Input: studentIvyServiceId, ivyExpertId, weightages map { agentSuggestionId: weightage }, pointerNo
 */
export const updateWeightages = async (
  studentIvyServiceId: string,
  ivyExpertId: string,
  weightages: { [agentSuggestionId: string]: number },
  pointerNo?: number,
): Promise<IIvyExpertSelectedSuggestion[]> => {
  if (!mongoose.Types.ObjectId.isValid(studentIvyServiceId)) {
    throw new Error('Invalid studentIvyServiceId');
  }
  if (!mongoose.Types.ObjectId.isValid(ivyExpertId)) {
    throw new Error('Invalid ivyExpertId');
  }

  const service = await StudentServiceRegistration.findById(studentIvyServiceId);
  if (!service) {
    throw new Error('Student Service Registration not found');
  }
  if (!service.activeIvyExpertId || service.activeIvyExpertId.toString() !== ivyExpertId) {
    throw new Error('Unauthorized: Ivy Expert does not match this service');
  }

  const ivyExpert = await IvyExpert.findById(ivyExpertId);
  if (!ivyExpert) {
    throw new Error('Unauthorized: IvyExpert not found');
  }

  const query: any = { studentIvyServiceId };
  if (pointerNo && [2, 3, 4].includes(pointerNo)) {
    query.pointerNo = pointerNo;
  } else {
    query.pointerNo = { $in: [PointerNo.SpikeInOneArea, PointerNo.LeadershipInitiative, PointerNo.GlobalSocialImpact] };
  }

  const selectedActivities = await IvyExpertSelectedSuggestion.find(query);
  if (selectedActivities.length === 0) {
    throw new Error('No activities selected');
  }

  const activitiesToUpdate = selectedActivities.filter(
    (act) => weightages[act.agentSuggestionId.toString()] !== undefined,
  );
  if (activitiesToUpdate.length === 0) {
    throw new Error('No matching activities found for provided weightages');
  }

  const weightageValues = activitiesToUpdate.map((act) => weightages[act.agentSuggestionId.toString()]);
  if (activitiesToUpdate.length === 1) {
    if (weightageValues[0] !== 100) {
      throw new Error('Single activity must have weightage of 100');
    }
  } else {
    const sum = weightageValues.reduce((acc, w) => acc + w, 0);
    if (Math.abs(sum - 100) > 0.01) {
      throw new Error(`Total weightage must equal 100, got ${sum.toFixed(2)}`);
    }
    for (const w of weightageValues) {
      if (typeof w !== 'number' || w <= 0 || w > 100) {
        throw new Error('Each weightage must be a number between 0 and 100');
      }
    }
  }

  const updatedActivities: IIvyExpertSelectedSuggestion[] = [];
  for (const activity of activitiesToUpdate) {
    activity.weightage = weightages[activity.agentSuggestionId.toString()];
    await activity.save();
    updatedActivities.push(activity);
  }

  return updatedActivities;
};
