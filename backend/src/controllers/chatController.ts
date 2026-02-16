import { Response } from 'express';
import mongoose from 'mongoose';
import ProgramChat from '../models/ProgramChat';
import ChatMessage from '../models/ChatMessage';
import Program from '../models/Program';
import Student from '../models/Student';
import User from '../models/User';
import StudentServiceRegistration from '../models/StudentServiceRegistration';
import COREDocumentField, { COREDocumentType } from '../models/COREDocumentField';
import StudentDocument, { DocumentStatus } from '../models/StudentDocument';
import { AuthRequest } from '../types/auth';
import { USER_ROLE } from '../types/roles';
import path from 'path';
import fs from 'fs';
import { getUploadBaseDir, ensureDir } from '../utils/uploadDir';

// Get or create chat for a program
export const getOrCreateChat = async (req: AuthRequest, res: Response) => {
  try {
    const { programId } = req.params;
    const { chatType = 'open' } = req.query; // Default to 'open'
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Validate chatType
    if (chatType !== 'open' && chatType !== 'private') {
      return res.status(400).json({ message: 'Invalid chat type. Must be "open" or "private"' });
    }

    // Students cannot access private chats
    if (chatType === 'private' && userRole === USER_ROLE.STUDENT) {
      return res.status(403).json({ message: 'Students cannot access private chats' });
    }

    // Find the program and check if it's selected by student
    const program = await Program.findById(programId).populate('studentId');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    // Check if program is selected (has priority, intake, year)
    if (!program.priority || !program.intake || !program.year) {
      return res.status(400).json({ message: 'Program must be applied/selected before chatting' });
    }

    const studentId = program.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Program has no student associated' });
    }

    // Get student's user ID
    const student = await Student.findById(studentId).populate('userId');
    if (!student || !student.userId) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentUserId = student.userId._id;

    // Authorization check
    if (userRole === USER_ROLE.STUDENT) {
      // Student can only access their own program chats (open only)
      if (studentUserId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === USER_ROLE.OPS) {
      // OPS must be active or primary OPS for the student (across any service)
      const registrations = await StudentServiceRegistration.find({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const isAuthorized = registrations.some((reg: any) => {
        const activeOpsUserId = reg.activeOpsId?.userId;
        const primaryOpsUserId = reg.primaryOpsId?.userId;
        return activeOpsUserId?.toString() === userId || primaryOpsUserId?.toString() === userId;
      });

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the OPS for this student' });
      }
    }
    // SUPER_ADMIN, ADMIN, and COUNSELOR can access all chats

    // Find or create chat with chatType (atomic upsert to avoid E11000 duplicate key)
    let chat = await ProgramChat.findOne({ programId, studentId, chatType })
      .populate('participants.student', 'firstName middleName lastName email')
      .populate('participants.OPS', 'firstName middleName lastName email')
      .populate('participants.superAdmin', 'firstName middleName lastName email')
      .populate('participants.admin', 'firstName middleName lastName email')
      .populate('participants.counselor', 'firstName middleName lastName email');

    if (!chat) {
      // Get OPS info (check all registrations)
      const registrations = await StudentServiceRegistration.find({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      let ops: any = null;
      for (const reg of registrations) {
        const activeOps = reg.activeOpsId as any;
        const primaryOps = reg.primaryOpsId as any;
        if (activeOps || primaryOps) { ops = activeOps || primaryOps; break; }
      }

      // Use findOneAndUpdate with upsert to avoid duplicate key errors from race conditions
      chat = await ProgramChat.findOneAndUpdate(
        { programId, studentId, chatType },
        {
          $setOnInsert: {
            programId,
            studentId,
            chatType,
            participants: {
              student: studentUserId,
              OPS: ops?.userId || undefined,
              superAdmin: userRole === USER_ROLE.SUPER_ADMIN ? userId : undefined,
              admin: userRole === USER_ROLE.ADMIN ? userId : undefined,
              counselor: userRole === USER_ROLE.COUNSELOR ? userId : undefined,
            },
          },
        },
        { upsert: true, new: true }
      );

      chat = await ProgramChat.findById(chat!._id)
        .populate('participants.student', 'name email')
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email')
        .populate('participants.admin', 'name email')
        .populate('participants.counselor', 'name email');
    } else {
      // Update participant based on role if not set
      let needsSave = false;
      if (userRole === USER_ROLE.SUPER_ADMIN && !chat.participants.superAdmin) {
        chat.participants.superAdmin = new mongoose.Types.ObjectId(userId) as any;
        needsSave = true;
      } else if (userRole === USER_ROLE.ADMIN && !chat.participants.admin) {
        (chat.participants as any).admin = new mongoose.Types.ObjectId(userId);
        needsSave = true;
      } else if (userRole === USER_ROLE.COUNSELOR && !chat.participants.counselor) {
        (chat.participants as any).counselor = new mongoose.Types.ObjectId(userId);
        needsSave = true;
      }
      
      if (needsSave) {
        await chat.save();
        chat = await ProgramChat.findById(chat._id)
          .populate('participants.student', 'name email')
          .populate('participants.OPS', 'name email')
          .populate('participants.superAdmin', 'name email')
          .populate('participants.admin', 'name email')
          .populate('participants.counselor', 'name email');
      }
    }

    return res.status(200).json({
      success: true,
      data: { chat },
    });
  } catch (error: any) {
    console.error('Get or create chat error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all messages for a chat
export const getChatMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { programId } = req.params;
    const { chatType = 'open' } = req.query;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Validate chatType
    if (chatType !== 'open' && chatType !== 'private') {
      return res.status(400).json({ message: 'Invalid chat type. Must be "open" or "private"' });
    }

    // Students cannot access private chats
    if (chatType === 'private' && userRole === USER_ROLE.STUDENT) {
      return res.status(403).json({ message: 'Students cannot access private chats' });
    }

    // Find the program
    const program = await Program.findById(programId).populate('studentId');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const studentId = program.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Program has no student associated' });
    }

    // Get student's user ID
    const student = await Student.findById(studentId).populate('userId');
    if (!student || !student.userId) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentUserId = student.userId._id;

    // Authorization check
    if (userRole === USER_ROLE.STUDENT) {
      if (studentUserId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === USER_ROLE.OPS) {
      const registrations = await StudentServiceRegistration.find({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const isAuthorized = registrations.some((reg: any) => {
        const activeOpsUserId = reg.activeOpsId?.userId;
        const primaryOpsUserId = reg.primaryOpsId?.userId;
        return activeOpsUserId?.toString() === userId || primaryOpsUserId?.toString() === userId;
      });

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the OPS for this student' });
      }
    }
    // SUPER_ADMIN, ADMIN, and COUNSELOR can view all chats

    // Find chat with chatType
    const chat = await ProgramChat.findOne({ programId, studentId, chatType });
    if (!chat) {
      return res.status(200).json({ success: true, data: { messages: [] } });
    }

    // Get messages sorted by timestamp
    const messages = await ChatMessage.find({ chatId: chat._id })
      .sort({ timestamp: 1 })
      .limit(500)
      .populate('senderId', 'firstName middleName lastName');

    // Map messages to include senderName from populated User
    const messagesWithNames = messages.map(msg => {
      const msgObj: any = msg.toObject();
      if (msgObj.senderId && typeof msgObj.senderId === 'object') {
        msgObj.senderName = [msgObj.senderId.firstName, msgObj.senderId.middleName, msgObj.senderId.lastName].filter(Boolean).join(' ') || 'Unknown';
      } else {
        msgObj.senderName = 'Unknown';
      }
      return msgObj;
    });

    return res.status(200).json({
      success: true,
      data: { messages: messagesWithNames },
    });
  } catch (error: any) {
    console.error('Get chat messages error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Send a message
export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const { programId } = req.params;
    const { message, chatType = 'open' } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Validate chatType
    if (chatType !== 'open' && chatType !== 'private') {
      return res.status(400).json({ message: 'Invalid chat type. Must be "open" or "private"' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    // Get user name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const userName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');

    // Check who can send messages
    // For OPEN chats: All roles can send
    // For PRIVATE chats: All roles EXCEPT students can send
    if (chatType === 'private') {
      // Private chat - students cannot send
      if (userRole === USER_ROLE.STUDENT) {
        return res.status(403).json({ 
          success: false,
          message: 'Students cannot access private chats.' 
        });
      }
    }
    // Open chats - all roles can send (no restriction needed)

    // Find the program
    const program = await Program.findById(programId).populate('studentId');
    if (!program) {
      return res.status(404).json({ message: 'Program not found' });
    }

    const studentId = program.studentId;
    if (!studentId) {
      return res.status(400).json({ message: 'Program has no student associated' });
    }

    // Get student's user ID
    const student = await Student.findById(studentId).populate('userId');
    if (!student || !student.userId) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentUserId = student.userId._id;

    // Authorization check
    if (userRole === USER_ROLE.STUDENT) {
      if (studentUserId.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === USER_ROLE.OPS) {
      const registrations = await StudentServiceRegistration.find({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      const isAuthorized = registrations.some((reg: any) => {
        const activeOpsUserId = reg.activeOpsId?.userId;
        const primaryOpsUserId = reg.primaryOpsId?.userId;
        return activeOpsUserId?.toString() === userId || primaryOpsUserId?.toString() === userId;
      });

      if (!isAuthorized) {
        return res.status(403).json({ message: 'You are not the OPS for this student' });
      }
    }

    // Find or create chat with chatType (atomic upsert to avoid E11000 duplicate key)
    let chat = await ProgramChat.findOne({ programId, studentId, chatType });
    if (!chat) {
      // Get OPS info (check all registrations)
      const registrations = await StudentServiceRegistration.find({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      let ops: any = null;
      for (const reg of registrations) {
        const activeOps = reg.activeOpsId as any;
        const primaryOps = reg.primaryOpsId as any;
        if (activeOps || primaryOps) { ops = activeOps || primaryOps; break; }
      }

      // Use findOneAndUpdate with upsert to avoid duplicate key errors from race conditions
      chat = await ProgramChat.findOneAndUpdate(
        { programId, studentId, chatType },
        {
          $setOnInsert: {
            programId,
            studentId,
            chatType,
            participants: {
              student: studentUserId,
              OPS: ops?.userId || undefined,
              superAdmin: userRole === USER_ROLE.SUPER_ADMIN ? userId : undefined,
              admin: userRole === USER_ROLE.ADMIN ? userId : undefined,
              counselor: userRole === USER_ROLE.COUNSELOR ? userId : undefined,
            },
          },
        },
        { upsert: true, new: true }
      );
    } else {
      // Update participant based on role if not set
      let needsSave = false;
      if (userRole === USER_ROLE.SUPER_ADMIN && !chat.participants.superAdmin) {
        chat.participants.superAdmin = new mongoose.Types.ObjectId(userId) as any;
        needsSave = true;
      } else if (userRole === USER_ROLE.ADMIN && !(chat.participants as any).admin) {
        (chat.participants as any).admin = new mongoose.Types.ObjectId(userId);
        needsSave = true;
      } else if (userRole === USER_ROLE.COUNSELOR && !(chat.participants as any).counselor) {
        (chat.participants as any).counselor = new mongoose.Types.ObjectId(userId);
        needsSave = true;
      }
      if (needsSave) {
        await chat.save();
      }
    }

    // Determine OPS type if user is a OPS
    let opsType: 'PRIMARY' | 'ACTIVE' | undefined = undefined;
    if (userRole === USER_ROLE.OPS) {
      const registrations = await StudentServiceRegistration.find({ studentId })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');

      for (const reg of registrations) {
        const activeOpsUserId = (reg.activeOpsId as any)?.userId;
        const primaryOpsUserId = (reg.primaryOpsId as any)?.userId;
        if (primaryOpsUserId?.toString() === userId) {
          opsType = 'PRIMARY';
          break;
        } else if (activeOpsUserId?.toString() === userId) {
          opsType = 'ACTIVE';
          break;
        }
      }
    }

    // Create message
    const newMessage = await ChatMessage.create({
      chatId: chat!._id,
      senderId: userId,
      senderRole: userRole,
      opsType,
      message: message.trim(),
      timestamp: new Date(),
      readBy: [userId],
    });

    // Populate sender info for response
    await newMessage.populate('senderId', 'firstName middleName lastName');
    const messageResponse: any = newMessage.toObject();
    messageResponse.senderName = [((newMessage.senderId as any)?.firstName), ((newMessage.senderId as any)?.middleName), ((newMessage.senderId as any)?.lastName)].filter(Boolean).join(' ') || userName;

    return res.status(201).json({
      success: true,
      data: { message: messageResponse },
    });
  } catch (error: any) {
    console.error('Send message error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all chats for current user
export const getMyChatsList = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const { chatType } = req.query; // Optional filter by chatType

    let query: any = {};

    // Filter by chatType if provided
    if (chatType && (chatType === 'open' || chatType === 'private')) {
      // Students can only see open chats
      if (userRole === USER_ROLE.STUDENT && chatType === 'private') {
        return res.status(403).json({ message: 'Students cannot access private chats' });
      }
      query.chatType = chatType;
    } else if (userRole === USER_ROLE.STUDENT) {
      // If no chatType specified, students can only see open chats
      query.chatType = 'open';
    }

    let chats;

    if (userRole === USER_ROLE.STUDENT) {
      query['participants.student'] = userId;
      chats = await ProgramChat.find(query)
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email')
        .populate('participants.admin', 'name email')
        .populate('participants.counselor', 'name email')
        .sort({ updatedAt: -1 });
    } else if (userRole === USER_ROLE.OPS) {
      query['participants.OPS'] = userId;
      chats = await ProgramChat.find(query)
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email')
        .populate('participants.admin', 'name email')
        .populate('participants.counselor', 'name email')
        .sort({ updatedAt: -1 });
    } else if (userRole === USER_ROLE.SUPER_ADMIN || userRole === USER_ROLE.ADMIN || userRole === USER_ROLE.COUNSELOR) {
      chats = await ProgramChat.find(query)
        .populate({
          path: 'programId',
          select: 'university programName campus country priority intake year',
        })
        .populate('participants.student', 'name email')
        .populate('participants.OPS', 'name email')
        .populate('participants.superAdmin', 'name email')
        .populate('participants.admin', 'name email')
        .populate('participants.counselor', 'name email')
        .sort({ updatedAt: -1 })
        .limit(100);
    }

    return res.status(200).json({
      success: true,
      data: { chats },
    });
  } catch (error: any) {
    console.error('Get my chats list error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Upload a document in chat (open chat only)
export const uploadChatDocument = async (req: AuthRequest, res: Response) => {
  try {
    const { programId } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Find the program
    const program = await Program.findById(programId);
    if (!program) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'Program not found' });
    }

    if (!program.priority || !program.intake || !program.year) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Program must be applied/selected before chatting' });
    }

    // Extract studentId (handle both populated and non-populated cases)
    const studentIdValue = typeof program.studentId === 'object' && (program.studentId as any)._id 
      ? (program.studentId as any)._id 
      : program.studentId;

    if (!studentIdValue) {
      fs.unlinkSync(file.path);
      return res.status(400).json({ message: 'Program has no student associated' });
    }

    const student = await Student.findById(studentIdValue).populate('userId');
    if (!student || !student.userId) {
      fs.unlinkSync(file.path);
      return res.status(404).json({ message: 'Student not found' });
    }

    const studentUserId = student.userId._id;

    // Authorization (same as sendMessage)
    if (userRole === USER_ROLE.STUDENT) {
      if (studentUserId.toString() !== userId) {
        fs.unlinkSync(file.path);
        return res.status(403).json({ message: 'Access denied' });
      }
    } else if (userRole === USER_ROLE.OPS) {
      const registrations = await StudentServiceRegistration.find({ studentId: studentIdValue })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');
      const isAuthorized = registrations.some((reg: any) => {
        return reg.activeOpsId?.userId?.toString() === userId || reg.primaryOpsId?.userId?.toString() === userId;
      });
      if (!isAuthorized) {
        fs.unlinkSync(file.path);
        return res.status(403).json({ message: 'You are not the OPS for this student' });
      }
    }

    // Move file to student's chat-documents folder
    const chatDocDir = path.join(getUploadBaseDir(), studentIdValue.toString(), 'chat-documents');
    ensureDir(chatDocDir);

    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const sanitizedName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const finalFilename = `chat_${timestamp}_${sanitizedName}${ext}`;
    const finalPath = path.join(chatDocDir, finalFilename);

    fs.renameSync(file.path, finalPath);

    const relativePath = `uploads/${studentIdValue.toString()}/chat-documents/${finalFilename}`;

    // Find or create open chat
    let chat = await ProgramChat.findOne({ programId, studentId: studentIdValue, chatType: 'open' });
    if (!chat) {
      const registrations = await StudentServiceRegistration.find({ studentId: studentIdValue })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');
      let ops: any = null;
      for (const reg of registrations) {
        const activeOps = reg.activeOpsId as any;
        const primaryOps = reg.primaryOpsId as any;
        if (activeOps || primaryOps) { ops = activeOps || primaryOps; break; }
      }
      chat = await ProgramChat.findOneAndUpdate(
        { programId, studentId: studentIdValue, chatType: 'open' },
        {
          $setOnInsert: {
            programId,
            studentId: studentIdValue,
            chatType: 'open',
            participants: {
              student: studentUserId,
              OPS: ops?.userId || undefined,
              superAdmin: userRole === USER_ROLE.SUPER_ADMIN ? userId : undefined,
              admin: userRole === USER_ROLE.ADMIN ? userId : undefined,
              counselor: userRole === USER_ROLE.COUNSELOR ? userId : undefined,
            },
          },
        },
        { upsert: true, new: true }
      );
    }

    // Determine OPS type
    let opsType: 'PRIMARY' | 'ACTIVE' | undefined = undefined;
    if (userRole === USER_ROLE.OPS) {
      const registrations = await StudentServiceRegistration.find({ studentId: studentIdValue })
        .populate('activeOpsId', 'userId')
        .populate('primaryOpsId', 'userId');
      for (const reg of registrations) {
        if ((reg.primaryOpsId as any)?.userId?.toString() === userId) { opsType = 'PRIMARY'; break; }
        else if ((reg.activeOpsId as any)?.userId?.toString() === userId) { opsType = 'ACTIVE'; break; }
      }
    }

    // Create document message
    const newMessage = await ChatMessage.create({
      chatId: chat!._id,
      senderId: userId,
      senderRole: userRole,
      opsType,
      messageType: 'document',
      message: file.originalname,
      documentMeta: {
        fileName: file.originalname,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      timestamp: new Date(),
      readBy: [userId],
    });

    await newMessage.populate('senderId', 'firstName middleName lastName');
    const messageResponse: any = newMessage.toObject();
    messageResponse.senderName = [
      (newMessage.senderId as any)?.firstName,
      (newMessage.senderId as any)?.middleName,
      (newMessage.senderId as any)?.lastName,
    ].filter(Boolean).join(' ');

    return res.status(201).json({
      success: true,
      data: { message: messageResponse },
    });
  } catch (error: any) {
    console.error('Upload chat document error:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Save a chat document to Extra Documents (OPS / SUPER_ADMIN only)
export const saveChatDocumentToExtra = async (req: AuthRequest, res: Response) => {
  try {
    const { messageId } = req.params;
    const { documentName, description } = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Only OPS and SUPER_ADMIN can do this
    if (userRole !== USER_ROLE.OPS && userRole !== USER_ROLE.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: 'Only OPS and Super Admin can save documents to Extra section' });
    }

    if (!documentName || !documentName.trim()) {
      return res.status(400).json({ success: false, message: 'Document name is required' });
    }

    // Find the chat message
    const chatMessage = await ChatMessage.findById(messageId);
    if (!chatMessage) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    if (chatMessage.messageType !== 'document' || !chatMessage.documentMeta) {
      return res.status(400).json({ success: false, message: 'This message does not contain a document' });
    }

    if (chatMessage.savedToExtra) {
      return res.status(400).json({ success: false, message: 'Document already saved to Extra Documents' });
    }

    // Get the chat to find program and student
    const chat = await ProgramChat.findById(chatMessage.chatId);
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found' });
    }

    // Extract studentId (handle both populated and non-populated cases)
    const studentIdValue = typeof chat.studentId === 'object' && (chat.studentId as any)._id 
      ? (chat.studentId as any)._id 
      : chat.studentId;

    // Find registration for this student (Study Abroad / first registration)
    const registration = await StudentServiceRegistration.findOne({ studentId: studentIdValue }).sort({ createdAt: 1 });
    if (!registration) {
      return res.status(404).json({ success: false, message: 'No registration found for this student' });
    }

    // Copy file from chat-documents to student folder
    const srcPath = path.join(process.cwd(), chatMessage.documentMeta.filePath);
    if (!fs.existsSync(srcPath)) {
      return res.status(404).json({ success: false, message: 'Source file not found on disk' });
    }

    const studentDir = path.join(getUploadBaseDir(), studentIdValue.toString());
    ensureDir(studentDir);

    const timestamp = Date.now();
    const ext = path.extname(chatMessage.documentMeta.fileName);
    const sanitizedName = path.basename(chatMessage.documentMeta.fileName, ext).replace(/[^a-zA-Z0-9]/g, '_');
    const finalFilename = `extra_${timestamp}_${sanitizedName}${ext}`;
    const destPath = path.join(studentDir, finalFilename);

    fs.copyFileSync(srcPath, destPath);

    const docKey = `extra_${documentName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')}_${timestamp}`;

    // Create the EXTRA document field
    const maxOrderField = await COREDocumentField.findOne({
      studentId: studentIdValue,
      registrationId: registration._id,
      documentType: COREDocumentType.EXTRA,
    }).sort({ order: -1 });

    const nextOrder = maxOrderField ? maxOrderField.order + 1 : 1;

    await COREDocumentField.create({
      studentId: studentIdValue,
      registrationId: registration._id,
      documentName: documentName.trim(),
      documentKey: docKey,
      documentType: COREDocumentType.EXTRA,
      category: 'SECONDARY',
      required: false,
      helpText: description?.trim() || undefined,
      allowMultiple: false,
      order: nextOrder,
      isActive: true,
      createdBy: new mongoose.Types.ObjectId(userId),
      createdByRole: userRole as 'SUPER_ADMIN' | 'OPS',
    });

    // Create the StudentDocument record
    await StudentDocument.create({
      registrationId: registration._id,
      studentId: studentIdValue,
      documentCategory: 'SECONDARY',
      documentName: documentName.trim(),
      documentKey: docKey,
      fileName: finalFilename,
      filePath: `uploads/${studentIdValue.toString()}/${finalFilename}`,
      fileSize: chatMessage.documentMeta.fileSize,
      mimeType: chatMessage.documentMeta.mimeType,
      uploadedBy: new mongoose.Types.ObjectId(userId),
      uploadedByRole: userRole as any,
      status: DocumentStatus.APPROVED,
      approvedBy: new mongoose.Types.ObjectId(userId),
      approvedAt: new Date(),
      version: 1,
      isCustomField: true,
    });

    // Mark the chat message as saved
    chatMessage.savedToExtra = true;
    chatMessage.savedBy = new mongoose.Types.ObjectId(userId);
    chatMessage.savedAt = new Date();
    await chatMessage.save();

    return res.status(200).json({
      success: true,
      message: 'Document saved to Extra Documents successfully',
    });
  } catch (error: any) {
    console.error('Save chat document to extra error:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

