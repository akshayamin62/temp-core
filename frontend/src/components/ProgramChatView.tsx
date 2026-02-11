'use client';

import { useEffect, useState, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Program {
  _id: string;
  university: string;
  programName: string;
  campus?: string;
  country: string;
  priority?: number;
  intake?: string;
  year?: string;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  senderRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR';
  senderName: string;
  opsType?: 'PRIMARY' | 'ACTIVE';
  message: string;
  timestamp: string;
}

interface Participant {
  _id: string;
  name: string;
  email: string;
}

interface ChatInfo {
  _id: string;
  participants: {
    student?: Participant;
    OPS?: Participant;
    admin?: Participant;
  };
}

interface ProgramChatViewProps {
  program: Program;
  onClose: () => void;
  userRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR';
  isReadOnly?: boolean;
  chatType?: 'open' | 'private';
}

export default function ProgramChatView({ program, onClose, userRole, isReadOnly = false, chatType = 'open' }: ProgramChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);

  // Get current user ID from localStorage
  useEffect(() => {
    const user = localStorage.getItem('user');
    if (user) {
      const parsedUser = JSON.parse(user);
      setCurrentUserId(parsedUser._id || parsedUser.id);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
  };

  // Only scroll to bottom when messages count changes (new message arrives)
  const prevMessagesLengthRef = useRef(messages.length);
  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    // Scroll on initial load when messages first populate
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollToBottom();
      isInitialLoadRef.current = false;
    }
    // Or scroll when new messages arrive (count increases)
    else if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    fetchChatAndMessages();
    
    // Poll for new messages every 3 seconds
    const interval = setInterval(() => {
      fetchMessages();
    }, 3000);

    return () => clearInterval(interval);
  }, [program._id, chatType]);

  const fetchChatAndMessages = async () => {
    try {
      setLoading(true);
      
      // Get or create chat
      const chatResponse = await chatAPI.getOrCreateChat(program._id, chatType);
      setChatInfo(chatResponse.data.data.chat);
      
      // Get messages
      const messagesResponse = await chatAPI.getMessages(program._id, chatType);
      setMessages(messagesResponse.data.data.messages || []);
    } catch (error: any) {
      console.error('Failed to fetch chat:', error);
      toast.error(error.response?.data?.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await chatAPI.getMessages(program._id, chatType);
      setMessages(response.data.data.messages || []);
    } catch (error: any) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    const messageToSend = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const response = await chatAPI.sendMessage(program._id, messageToSend, chatType);
      setMessages(prev => [...prev, response.data.data.message]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
      setNewMessage(messageToSend); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'bg-blue-100 text-blue-800';
      case 'OPS':
        return 'bg-green-100 text-green-800';
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-orange-100 text-orange-800';
      case 'COUNSELOR':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMessageBubbleColor = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return 'bg-blue-500 text-white';
      case 'OPS':
        return 'bg-green-500 text-white';
      case 'SUPER_ADMIN':
        return 'bg-purple-500 text-white';
      case 'ADMIN':
        return 'bg-orange-500 text-white';
      case 'COUNSELOR':
        return 'bg-teal-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (isToday) return `Today, ${timeStr}`;
    if (isYesterday) return `Yesterday, ${timeStr}`;
    
    const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    return `${dateStr}, ${timeStr}`;
  };

  return (
    <div className="w-full h-[600px] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col">
      {/* Chat Header */}
      <div className={`${chatType === 'private' ? 'bg-gradient-to-r from-teal-600 to-cyan-600' : 'bg-gradient-to-r from-blue-600 to-indigo-600'} text-white p-6 shadow-lg`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold">{chatType === 'private' ? 'Private Chat' : 'Open Chat'}</h3>
              {chatType === 'private' && (
                <span className="px-2 py-0.5 bg-white/20 rounded text-xs">Staff Only</span>
              )}
            </div>
            <p className={`text-sm ${chatType === 'private' ? 'text-orange-100' : 'text-blue-100'}`}>{program.programName} - {program.university}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

          {/* Messages Container */}
          <div
            ref={messageContainerRef}
            className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50"
          >
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="flex flex-col items-center space-y-3">
                  <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 text-sm">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  </div>
                  <p className="text-gray-700 font-medium">No messages yet</p>
                  <p className="text-gray-600 text-sm mt-1">Start the conversation!</p>
                </div>
              </div>
            ) : (
              messages.map((msg, index) => {
                // Handle both populated and unpopulated senderId
                const msgSenderId = typeof msg.senderId === 'object' ? (msg.senderId as any)?._id : msg.senderId;
                const prevMsgSenderId = index > 0 
                  ? (typeof messages[index - 1].senderId === 'object' 
                    ? (messages[index - 1].senderId as any)?._id 
                    : messages[index - 1].senderId)
                  : null;
                
                const isConsecutive = index > 0 && prevMsgSenderId === msgSenderId;
                const isCurrentUser = msgSenderId === currentUserId || msgSenderId?.toString() === currentUserId;
                
                return (
                  <div key={msg._id} className={`flex flex-col ${isConsecutive ? 'mt-1' : 'mt-4'} ${
                    isCurrentUser ? 'items-end' : 'items-start'
                  }`}>
                    {!isConsecutive && (
                      <div className="flex items-center space-x-2 mb-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                          msg.senderRole === 'STUDENT' ? 'bg-blue-500' :
                          msg.senderRole === 'OPS' ? 'bg-green-500' :
                          msg.senderRole === 'SUPER_ADMIN' ? 'bg-purple-500' :
                          msg.senderRole === 'ADMIN' ? 'bg-orange-500' :
                          msg.senderRole === 'COUNSELOR' ? 'bg-teal-500' :
                          'bg-gray-500'
                        }`}>
                          {msg.senderName ? msg.senderName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-semibold text-gray-900">{msg.senderName || 'Unknown'}</span>
                          {msg.senderRole === 'OPS' && msg.opsType && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-medium">
                              {msg.opsType === 'PRIMARY' ? 'Primary' : 'Secondary'}
                            </span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getRoleBadgeColor(msg.senderRole)}`}>
                            {msg.senderRole.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className={`${isConsecutive ? (isCurrentUser ? 'mr-10' : 'ml-10') : (isCurrentUser ? 'mr-10' : 'ml-10')}`}>
                      <div className={`inline-block max-w-md rounded-2xl px-4 py-2.5 shadow-sm ${
                        isCurrentUser 
                          ? 'bg-blue-600 text-white' 
                          : msg.senderRole === 'STUDENT' ? 'bg-blue-100 text-gray-900' :
                            msg.senderRole === 'OPS' ? 'bg-green-100 text-gray-900' :
                            msg.senderRole === 'SUPER_ADMIN' ? 'bg-purple-100 text-gray-900' :
                            msg.senderRole === 'ADMIN' ? 'bg-orange-100 text-gray-900' :
                            msg.senderRole === 'COUNSELOR' ? 'bg-teal-100 text-gray-900' :
                            'bg-gray-100 text-gray-900'
                      }`}>
                        <p className="text-sm leading-relaxed break-words">{msg.message}</p>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 ml-1">{formatTimestamp(msg.timestamp)}</p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          {isReadOnly ? (
            <div className="bg-gray-50 border-t border-gray-200 p-4">
              <p className="text-sm text-gray-500 text-center">Chat is in read-only mode</p>
            </div>
          ) : (
          <div className="bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
              <div className="flex-1">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Type your message..."
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none text-sm text-gray-900"
                  disabled={sending}
                />
                <p className="text-xs text-gray-600 mt-1 ml-1">Press Enter to send, Shift+Enter for new line</p>
              </div>
              <button
                type="submit"
                disabled={!newMessage.trim() || sending}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-md hover:shadow-lg"
              >
                {sending ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>Send</span>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                )}
              </button>
            </form>
          </div>
          )}
        </div>
    );
  }

