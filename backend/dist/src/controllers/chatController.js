"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyChatsList = exports.sendMessage = exports.getChatMessages = exports.getOrCreateChat = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const ProgramChat_1 = __importDefault(require("../models/ProgramChat"));
const ChatMessage_1 = __importDefault(require("../models/ChatMessage"));
const Program_1 = __importDefault(require("../models/Program"));
const Student_1 = __importDefault(require("../models/Student"));
const User_1 = __importDefault(require("../models/User"));
const StudentServiceRegistration_1 = __importDefault(require("../models/StudentServiceRegistration"));
const roles_1 = require("../types/roles");
// Get or create chat for a program
const getOrCreateChat = async (req, res) => {
    try {
        const { programId } = req.params;
        const { chatType = 'open' } = req.query; // Default to 'open'
        const userId = req.user.userId;
        const userRole = req.user.role;
        // Validate chatType
        if (chatType !== 'open' && chatType !== 'private') {
            return res.status(400).json({ message: 'Invalid chat type. Must be "open" or "private"' });
        }
        // Students cannot access private chats
        if (chatType === 'private' && userRole === roles_1.USER_ROLE.STUDENT) {
            return res.status(403).json({ message: 'Students cannot access private chats' });
        }
        // Find the program and check if it's selected by student
        const program = await Program_1.default.findById(programId).populate('studentId');
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
        const student = await Student_1.default.findById(studentId).populate('userId');
        if (!student || !student.userId) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const studentUserId = student.userId._id;
        // Authorization check
        if (userRole === roles_1.USER_ROLE.STUDENT) {
            // Student can only access their own program chats (open only)
            if (studentUserId.toString() !== userId) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        else if (userRole === roles_1.USER_ROLE.OPS) {
            // OPS must be active or primary OPS for the student (across any service)
            const registrations = await StudentServiceRegistration_1.default.find({ studentId })
                .populate('activeOpsId', 'userId')
                .populate('primaryOpsId', 'userId');
            const isAuthorized = registrations.some((reg) => {
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
        let chat = await ProgramChat_1.default.findOne({ programId, studentId, chatType })
            .populate('participants.student', 'firstName middleName lastName email')
            .populate('participants.OPS', 'firstName middleName lastName email')
            .populate('participants.superAdmin', 'firstName middleName lastName email')
            .populate('participants.admin', 'firstName middleName lastName email')
            .populate('participants.counselor', 'firstName middleName lastName email');
        if (!chat) {
            // Get OPS info (check all registrations)
            const registrations = await StudentServiceRegistration_1.default.find({ studentId })
                .populate('activeOpsId', 'userId')
                .populate('primaryOpsId', 'userId');
            let ops = null;
            for (const reg of registrations) {
                const activeOps = reg.activeOpsId;
                const primaryOps = reg.primaryOpsId;
                if (activeOps || primaryOps) {
                    ops = activeOps || primaryOps;
                    break;
                }
            }
            // Use findOneAndUpdate with upsert to avoid duplicate key errors from race conditions
            chat = await ProgramChat_1.default.findOneAndUpdate({ programId, studentId, chatType }, {
                $setOnInsert: {
                    programId,
                    studentId,
                    chatType,
                    participants: {
                        student: studentUserId,
                        OPS: ops?.userId || undefined,
                        superAdmin: userRole === roles_1.USER_ROLE.SUPER_ADMIN ? userId : undefined,
                        admin: userRole === roles_1.USER_ROLE.ADMIN ? userId : undefined,
                        counselor: userRole === roles_1.USER_ROLE.COUNSELOR ? userId : undefined,
                    },
                },
            }, { upsert: true, new: true });
            chat = await ProgramChat_1.default.findById(chat._id)
                .populate('participants.student', 'name email')
                .populate('participants.OPS', 'name email')
                .populate('participants.superAdmin', 'name email')
                .populate('participants.admin', 'name email')
                .populate('participants.counselor', 'name email');
        }
        else {
            // Update participant based on role if not set
            let needsSave = false;
            if (userRole === roles_1.USER_ROLE.SUPER_ADMIN && !chat.participants.superAdmin) {
                chat.participants.superAdmin = new mongoose_1.default.Types.ObjectId(userId);
                needsSave = true;
            }
            else if (userRole === roles_1.USER_ROLE.ADMIN && !chat.participants.admin) {
                chat.participants.admin = new mongoose_1.default.Types.ObjectId(userId);
                needsSave = true;
            }
            else if (userRole === roles_1.USER_ROLE.COUNSELOR && !chat.participants.counselor) {
                chat.participants.counselor = new mongoose_1.default.Types.ObjectId(userId);
                needsSave = true;
            }
            if (needsSave) {
                await chat.save();
                chat = await ProgramChat_1.default.findById(chat._id)
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
    }
    catch (error) {
        console.error('Get or create chat error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getOrCreateChat = getOrCreateChat;
// Get all messages for a chat
const getChatMessages = async (req, res) => {
    try {
        const { programId } = req.params;
        const { chatType = 'open' } = req.query;
        const userId = req.user.userId;
        const userRole = req.user.role;
        // Validate chatType
        if (chatType !== 'open' && chatType !== 'private') {
            return res.status(400).json({ message: 'Invalid chat type. Must be "open" or "private"' });
        }
        // Students cannot access private chats
        if (chatType === 'private' && userRole === roles_1.USER_ROLE.STUDENT) {
            return res.status(403).json({ message: 'Students cannot access private chats' });
        }
        // Find the program
        const program = await Program_1.default.findById(programId).populate('studentId');
        if (!program) {
            return res.status(404).json({ message: 'Program not found' });
        }
        const studentId = program.studentId;
        if (!studentId) {
            return res.status(400).json({ message: 'Program has no student associated' });
        }
        // Get student's user ID
        const student = await Student_1.default.findById(studentId).populate('userId');
        if (!student || !student.userId) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const studentUserId = student.userId._id;
        // Authorization check
        if (userRole === roles_1.USER_ROLE.STUDENT) {
            if (studentUserId.toString() !== userId) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        else if (userRole === roles_1.USER_ROLE.OPS) {
            const registrations = await StudentServiceRegistration_1.default.find({ studentId })
                .populate('activeOpsId', 'userId')
                .populate('primaryOpsId', 'userId');
            const isAuthorized = registrations.some((reg) => {
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
        const chat = await ProgramChat_1.default.findOne({ programId, studentId, chatType });
        if (!chat) {
            return res.status(200).json({ success: true, data: { messages: [] } });
        }
        // Get messages sorted by timestamp
        const messages = await ChatMessage_1.default.find({ chatId: chat._id })
            .sort({ timestamp: 1 })
            .limit(500)
            .populate('senderId', 'firstName middleName lastName');
        // Map messages to include senderName from populated User
        const messagesWithNames = messages.map(msg => {
            const msgObj = msg.toObject();
            if (msgObj.senderId && typeof msgObj.senderId === 'object') {
                msgObj.senderName = [msgObj.senderId.firstName, msgObj.senderId.middleName, msgObj.senderId.lastName].filter(Boolean).join(' ') || 'Unknown';
            }
            else {
                msgObj.senderName = 'Unknown';
            }
            return msgObj;
        });
        return res.status(200).json({
            success: true,
            data: { messages: messagesWithNames },
        });
    }
    catch (error) {
        console.error('Get chat messages error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getChatMessages = getChatMessages;
// Send a message
const sendMessage = async (req, res) => {
    try {
        const { programId } = req.params;
        const { message, chatType = 'open' } = req.body;
        const userId = req.user.userId;
        const userRole = req.user.role;
        // Validate chatType
        if (chatType !== 'open' && chatType !== 'private') {
            return res.status(400).json({ message: 'Invalid chat type. Must be "open" or "private"' });
        }
        if (!message || message.trim().length === 0) {
            return res.status(400).json({ message: 'Message cannot be empty' });
        }
        // Get user name
        const user = await User_1.default.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        const userName = [user.firstName, user.middleName, user.lastName].filter(Boolean).join(' ');
        // Check who can send messages
        // For OPEN chats: All roles can send
        // For PRIVATE chats: All roles EXCEPT students can send
        if (chatType === 'private') {
            // Private chat - students cannot send
            if (userRole === roles_1.USER_ROLE.STUDENT) {
                return res.status(403).json({
                    success: false,
                    message: 'Students cannot access private chats.'
                });
            }
        }
        // Open chats - all roles can send (no restriction needed)
        // Find the program
        const program = await Program_1.default.findById(programId).populate('studentId');
        if (!program) {
            return res.status(404).json({ message: 'Program not found' });
        }
        const studentId = program.studentId;
        if (!studentId) {
            return res.status(400).json({ message: 'Program has no student associated' });
        }
        // Get student's user ID
        const student = await Student_1.default.findById(studentId).populate('userId');
        if (!student || !student.userId) {
            return res.status(404).json({ message: 'Student not found' });
        }
        const studentUserId = student.userId._id;
        // Authorization check
        if (userRole === roles_1.USER_ROLE.STUDENT) {
            if (studentUserId.toString() !== userId) {
                return res.status(403).json({ message: 'Access denied' });
            }
        }
        else if (userRole === roles_1.USER_ROLE.OPS) {
            const registrations = await StudentServiceRegistration_1.default.find({ studentId })
                .populate('activeOpsId', 'userId')
                .populate('primaryOpsId', 'userId');
            const isAuthorized = registrations.some((reg) => {
                const activeOpsUserId = reg.activeOpsId?.userId;
                const primaryOpsUserId = reg.primaryOpsId?.userId;
                return activeOpsUserId?.toString() === userId || primaryOpsUserId?.toString() === userId;
            });
            if (!isAuthorized) {
                return res.status(403).json({ message: 'You are not the OPS for this student' });
            }
        }
        // Find or create chat with chatType (atomic upsert to avoid E11000 duplicate key)
        let chat = await ProgramChat_1.default.findOne({ programId, studentId, chatType });
        if (!chat) {
            // Get OPS info (check all registrations)
            const registrations = await StudentServiceRegistration_1.default.find({ studentId })
                .populate('activeOpsId', 'userId')
                .populate('primaryOpsId', 'userId');
            let ops = null;
            for (const reg of registrations) {
                const activeOps = reg.activeOpsId;
                const primaryOps = reg.primaryOpsId;
                if (activeOps || primaryOps) {
                    ops = activeOps || primaryOps;
                    break;
                }
            }
            // Use findOneAndUpdate with upsert to avoid duplicate key errors from race conditions
            chat = await ProgramChat_1.default.findOneAndUpdate({ programId, studentId, chatType }, {
                $setOnInsert: {
                    programId,
                    studentId,
                    chatType,
                    participants: {
                        student: studentUserId,
                        OPS: ops?.userId || undefined,
                        superAdmin: userRole === roles_1.USER_ROLE.SUPER_ADMIN ? userId : undefined,
                        admin: userRole === roles_1.USER_ROLE.ADMIN ? userId : undefined,
                        counselor: userRole === roles_1.USER_ROLE.COUNSELOR ? userId : undefined,
                    },
                },
            }, { upsert: true, new: true });
        }
        else {
            // Update participant based on role if not set
            let needsSave = false;
            if (userRole === roles_1.USER_ROLE.SUPER_ADMIN && !chat.participants.superAdmin) {
                chat.participants.superAdmin = new mongoose_1.default.Types.ObjectId(userId);
                needsSave = true;
            }
            else if (userRole === roles_1.USER_ROLE.ADMIN && !chat.participants.admin) {
                chat.participants.admin = new mongoose_1.default.Types.ObjectId(userId);
                needsSave = true;
            }
            else if (userRole === roles_1.USER_ROLE.COUNSELOR && !chat.participants.counselor) {
                chat.participants.counselor = new mongoose_1.default.Types.ObjectId(userId);
                needsSave = true;
            }
            if (needsSave) {
                await chat.save();
            }
        }
        // Determine OPS type if user is a OPS
        let opsType = undefined;
        if (userRole === roles_1.USER_ROLE.OPS) {
            const registrations = await StudentServiceRegistration_1.default.find({ studentId })
                .populate('activeOpsId', 'userId')
                .populate('primaryOpsId', 'userId');
            for (const reg of registrations) {
                const activeOpsUserId = reg.activeOpsId?.userId;
                const primaryOpsUserId = reg.primaryOpsId?.userId;
                if (primaryOpsUserId?.toString() === userId) {
                    opsType = 'PRIMARY';
                    break;
                }
                else if (activeOpsUserId?.toString() === userId) {
                    opsType = 'ACTIVE';
                    break;
                }
            }
        }
        // Create message
        const newMessage = await ChatMessage_1.default.create({
            chatId: chat._id,
            senderId: userId,
            senderRole: userRole,
            opsType,
            message: message.trim(),
            timestamp: new Date(),
            readBy: [userId],
        });
        // Populate sender info for response
        await newMessage.populate('senderId', 'firstName middleName lastName');
        const messageResponse = newMessage.toObject();
        messageResponse.senderName = [(newMessage.senderId?.firstName), (newMessage.senderId?.middleName), (newMessage.senderId?.lastName)].filter(Boolean).join(' ') || userName;
        return res.status(201).json({
            success: true,
            data: { message: messageResponse },
        });
    }
    catch (error) {
        console.error('Send message error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.sendMessage = sendMessage;
// Get all chats for current user
const getMyChatsList = async (req, res) => {
    try {
        const userId = req.user.userId;
        const userRole = req.user.role;
        const { chatType } = req.query; // Optional filter by chatType
        let query = {};
        // Filter by chatType if provided
        if (chatType && (chatType === 'open' || chatType === 'private')) {
            // Students can only see open chats
            if (userRole === roles_1.USER_ROLE.STUDENT && chatType === 'private') {
                return res.status(403).json({ message: 'Students cannot access private chats' });
            }
            query.chatType = chatType;
        }
        else if (userRole === roles_1.USER_ROLE.STUDENT) {
            // If no chatType specified, students can only see open chats
            query.chatType = 'open';
        }
        let chats;
        if (userRole === roles_1.USER_ROLE.STUDENT) {
            query['participants.student'] = userId;
            chats = await ProgramChat_1.default.find(query)
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
        }
        else if (userRole === roles_1.USER_ROLE.OPS) {
            query['participants.OPS'] = userId;
            chats = await ProgramChat_1.default.find(query)
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
        }
        else if (userRole === roles_1.USER_ROLE.SUPER_ADMIN || userRole === roles_1.USER_ROLE.ADMIN || userRole === roles_1.USER_ROLE.COUNSELOR) {
            chats = await ProgramChat_1.default.find(query)
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
    }
    catch (error) {
        console.error('Get my chats list error:', error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};
exports.getMyChatsList = getMyChatsList;
//# sourceMappingURL=chatController.js.map