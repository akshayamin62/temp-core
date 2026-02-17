'use client';

import { useEffect, useState, useRef } from 'react';
import { chatAPI } from '@/lib/api';
import toast from 'react-hot-toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';

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

interface DocumentMeta {
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
}

interface ChatMessage {
  _id: string;
  senderId: string;
  senderRole: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR';
  senderName: string;
  opsType?: 'PRIMARY' | 'ACTIVE';
  messageType: 'text' | 'document';
  message: string;
  documentMeta?: DocumentMeta;
  savedToExtra: boolean;
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
  const [uploading, setUploading] = useState(false);
  const [chatInfo, setChatInfo] = useState<ChatInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save to extra modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveMessageId, setSaveMessageId] = useState('');
  const [saveDocName, setSaveDocName] = useState('');
  const [saveDocDescription, setSaveDocDescription] = useState('');
  const [savingToExtra, setSavingToExtra] = useState(false);

  // Document preview modal state
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ fileName: string; filePath: string; mimeType: string } | null>(null);

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

  const prevMessagesLengthRef = useRef(messages.length);
  const isInitialLoadRef = useRef(true);
  useEffect(() => {
    if (isInitialLoadRef.current && messages.length > 0) {
      scrollToBottom();
      isInitialLoadRef.current = false;
    } else if (messages.length > prevMessagesLengthRef.current) {
      scrollToBottom();
    }
    prevMessagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    fetchChatAndMessages();
    const interval = setInterval(() => { fetchMessages(); }, 3000);
    return () => clearInterval(interval);
  }, [program._id, chatType]);

  const fetchChatAndMessages = async () => {
    try {
      setLoading(true);
      const chatResponse = await chatAPI.getOrCreateChat(program._id, chatType);
      setChatInfo(chatResponse.data.data.chat);
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
      setNewMessage(messageToSend);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      toast.error('File size exceeds 10MB limit');
      e.target.value = '';
      return;
    }

    setUploading(true);
    try {
      const response = await chatAPI.uploadDocument(program._id, file);
      setMessages(prev => [...prev, response.data.data.message]);
      toast.success('Document uploaded');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to upload document');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSaveToExtra = async () => {
    if (!saveDocName.trim()) {
      toast.error('Document name is required');
      return;
    }
    setSavingToExtra(true);
    try {
      await chatAPI.saveToExtra(saveMessageId, saveDocName.trim(), saveDocDescription.trim());
      toast.success('Document saved to Extra Documents');
      setSaveModalOpen(false);
      setSaveDocName('');
      setSaveDocDescription('');
      setSaveMessageId('');
      fetchMessages(); // Refresh to update savedToExtra status
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save document');
    } finally {
      setSavingToExtra(false);
    }
  };

  const openSaveModal = (messageId: string, defaultName: string) => {
    setSaveMessageId(messageId);
    setSaveDocName(defaultName);
    setSaveDocDescription('');
    setSaveModalOpen(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes('pdf')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6" />
        </svg>
      );
    }
    if (mimeType.includes('image')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (mimeType.includes('word') || mimeType.includes('document')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (mimeType.includes('sheet') || mimeType.includes('excel')) {
      return (
        <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  const openPreviewModal = (fileName: string, filePath: string, mimeType: string) => {
    setPreviewDoc({ fileName, filePath, mimeType });
    setPreviewModalOpen(true);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'bg-blue-100 text-blue-800';
      case 'OPS': return 'bg-green-100 text-green-800';
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800';
      case 'ADMIN': return 'bg-orange-100 text-orange-800';
      case 'COUNSELOR': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
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
    const dateStr = date.toLocaleDateString('en-GB');
    return `${dateStr}, ${timeStr}`;
  };

  const canSaveToExtra = userRole === 'OPS' || userRole === 'SUPER_ADMIN';

  return (
    <div className="w-full h-[600px] bg-white rounded-lg shadow-lg overflow-hidden flex flex-col relative">
      {/* Save to Extra Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Save to Extra Documents</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={saveDocName}
                  onChange={(e) => setSaveDocName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Passport Copy"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={saveDocDescription}
                  onChange={(e) => setSaveDocDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Brief description of this document..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setSaveModalOpen(false); setSaveDocName(''); setSaveDocDescription(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={savingToExtra}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveToExtra}
                disabled={savingToExtra || !saveDocName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {savingToExtra ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewModalOpen && previewDoc && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreviewModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="shrink-0">{getFileIcon(previewDoc.mimeType)}</div>
                <h3 className="text-lg font-semibold text-gray-900 truncate">{previewDoc.fileName}</h3>
              </div>
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 rounded-full p-2 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-auto p-6 bg-gray-50">
              {previewDoc.mimeType.includes('image') ? (
                <div className="flex items-center justify-center">
                  <img
                    src={`${API_BASE}/${previewDoc.filePath}`}
                    alt={previewDoc.fileName}
                    className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : previewDoc.mimeType.includes('pdf') ? (
                <iframe
                  src={`${API_BASE}/${previewDoc.filePath}`}
                  className="w-full h-[70vh] rounded-lg shadow-lg"
                  title={previewDoc.fileName}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 space-y-4">
                  <div className="shrink-0">{getFileIcon(previewDoc.mimeType)}</div>
                  <p className="text-gray-600">Preview not available for this file type</p>
                  <a
                    href={`${API_BASE}/${previewDoc.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                      {msg.messageType === 'document' && msg.documentMeta ? (
                        /* Document message */
                        <div className="inline-block max-w-sm rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                          <div 
                            className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => openPreviewModal(msg.documentMeta!.fileName, msg.documentMeta!.filePath, msg.documentMeta!.mimeType)}
                          >
                            <div className="shrink-0">{getFileIcon(msg.documentMeta.mimeType)}</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{msg.documentMeta.fileName}</p>
                              <p className="text-xs text-gray-500">{formatFileSize(msg.documentMeta.fileSize)}</p>
                            </div>
                          </div>
                          <div className="flex border-t border-gray-100">
                            <a
                              href={`${API_BASE}/${msg.documentMeta.filePath}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center text-xs font-medium text-blue-600 hover:bg-blue-50 py-2 transition-colors"
                            >
                              Download
                            </a>
                            {canSaveToExtra && chatType === 'open' && (
                              <>
                                <div className="w-px bg-gray-100" />
                                {msg.savedToExtra ? (
                                  <span className="flex-1 text-center text-xs font-medium text-green-600 py-2">
                                    ✓ Saved
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => openSaveModal(msg._id, msg.documentMeta!.fileName.replace(/\.[^.]+$/, ''))}
                                    className="flex-1 text-center text-xs font-medium text-purple-600 hover:bg-purple-50 py-2 transition-colors"
                                  >
                                    Save to Extra
                                  </button>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Text message */
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
                      )}
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
              {/* Attachment button (open chat only) */}
              {chatType === 'open' && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-3 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors disabled:opacity-50"
                    title="Attach document"
                  >
                    {uploading ? (
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    )}
                  </button>
                </>
              )}
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

