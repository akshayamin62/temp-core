import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import TaskConversation from '../models/ivy/TaskConversation';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import IvyExpertSelectedSuggestion from '../models/ivy/IvyExpertSelectedSuggestion';
import { createNotification } from '../services/notification.service';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
  },
});

export const messageFileUploadMiddleware = upload.single('file');

/**
 * Save uploaded file to disk
 */
const saveFile = async (file: Express.Multer.File, subfolder: string): Promise<{ url: string; size: string }> => {
  const uploadDir = path.join(getUploadBaseDir(), subfolder);
  
  // Create directory if it doesn't exist
  ensureDir(uploadDir);

  // Sanitize filename to remove special characters
  const sanitizedOriginalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
  const fileName = `${Date.now()}-${sanitizedOriginalName}`;
  const filePath = path.join(uploadDir, fileName);
  
  // Write file to disk
  fs.writeFileSync(filePath, file.buffer);
  
  // Calculate file size in readable format
  const bytes = file.size;
  let size = '';
  if (bytes < 1024) {
    size = bytes + ' B';
  } else if (bytes < 1024 * 1024) {
    size = (bytes / 1024).toFixed(2) + ' KB';
  } else {
    size = (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  return {
    url: `/uploads/${subfolder}/${fileName}`,
    size,
  };
};

/**
 * Get conversation for a specific task
 */
export const getTaskConversation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { selectionId, taskTitle, taskPage } = req.query;

    if (!selectionId || !taskTitle) {
      res.status(400).json({ success: false, message: 'selectionId and taskTitle are required' });
      return;
    }

    // Normalize taskPage: convert empty string, 'undefined', or undefined to actual undefined
    const normalizedTaskPage = taskPage && taskPage !== 'undefined' ? taskPage : undefined;

    // Find or create conversation
    let conversation = await TaskConversation.findOne({
      selectionId,
      taskTitle,
      ...(normalizedTaskPage && { taskPage: normalizedTaskPage }),
    });

    if (!conversation) {
      res.json({ success: true, data: { messages: [] } });
      return;
    }

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    console.error('Error fetching task conversation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add a message to task conversation
 */
export const addTaskMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      studentIvyServiceId,
      selectionId,
      taskTitle,
      taskPage,
      sender,
      senderName,
      text,
      messageType,
    } = req.body;

    if (!studentIvyServiceId || !selectionId || !taskTitle || !sender || !senderName) {
      res.status(400).json({
        success: false,
        message: 'studentIvyServiceId, selectionId, taskTitle, sender, and senderName are required',
      });
      return;
    }

    // Require either text or file attachment
    if (!text && !req.file) {
      res.status(400).json({
        success: false,
        message: 'Either text or file attachment is required',
      });
      return;
    }

    if (!['student', 'ivyExpert'].includes(sender)) {
      res.status(400).json({ success: false, message: 'sender must be "student" or "ivyExpert"' });
      return;
    }

    // Normalize taskPage: convert empty string, 'undefined', or undefined to actual undefined
    const normalizedTaskPage = taskPage && taskPage !== 'undefined' ? taskPage : undefined;

    // Find existing conversation using normalized taskPage
    const query: any = {
      selectionId,
      taskTitle,
    };
    
    if (normalizedTaskPage) {
      query.taskPage = normalizedTaskPage;
    }

    let conversation = await TaskConversation.findOne(query);

    if (!conversation) {
      conversation = new TaskConversation({
        studentIvyServiceId,
        selectionId,
        taskTitle,
        ...(normalizedTaskPage && { taskPage: normalizedTaskPage }),
        messages: [],
      });
    }

    // Handle file upload if present
    let attachment = undefined;
    if (req.file) {
      const fileData = await saveFile(req.file, 'task-conversations');
      attachment = {
        name: req.file.originalname,
        url: fileData.url,
        size: fileData.size,
      };
    }

    // Add message
    conversation.messages.push({
      sender,
      senderName,
      text: text || '',
      timestamp: new Date(),
      messageType: messageType || 'normal',
      attachment,
    });

    await conversation.save();

    // Create notification for the other party
    try {
      const service = await StudentServiceRegistration.findById(studentIvyServiceId);
      const selection = await IvyExpertSelectedSuggestion.findById(selectionId);
      
      if (service && selection) {
        // Determine recipient based on sender
        const isFromStudent = sender === 'student';
        const recipientId = isFromStudent ? service.activeIvyExpertId : service.studentId;
        const recipientRole = isFromStudent ? 'ivyExpert' : 'student';
        
        if (recipientId) {
          await createNotification({
            studentIvyServiceId,
            userId: recipientId,
            userRole: recipientRole,
            pointerNumber: selection.pointerNo,
            notificationType: 'new_message',
            referenceId: selectionId,
            taskTitle: taskTitle || undefined,
            taskPage: taskPage || undefined,
          });
        }
      }
    } catch (notificationError) {
      console.error('Error creating notification for message:', notificationError);
      // Don't fail the request if notification creation fails
    }

    res.json({ success: true, data: conversation });
  } catch (error: any) {
    console.error('Error adding task message:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
