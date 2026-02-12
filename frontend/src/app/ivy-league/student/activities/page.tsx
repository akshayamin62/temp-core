'use client';

import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import mammoth from 'mammoth';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { NotificationBadge } from '@/components/NotificationBadge';
import { useNotifications } from '@/contexts/NotificationContext';
import { useStudentService } from '../useStudentService';
import { IVY_API_URL } from '@/lib/ivyApi';
import { useBlobUrl, fetchBlobUrl, fileApi } from '@/lib/useBlobUrl';

function InlineDocViewer({ url, onClose }: { url: string, onClose: () => void }) {
  const { blobUrl, loading, error } = useBlobUrl(url);
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);

  return (
    <div className="mt-4 relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 animate-in fade-in zoom-in-95 duration-300">
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md transition-all border border-white/20"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="min-h-[500px] flex items-center justify-center bg-gray-800">
        {error ? (
          <p className="text-red-400 font-bold">Failed to load document</p>
        ) : loading || !blobUrl ? (
          <p className="text-gray-400 font-bold animate-pulse">Loading document...</p>
        ) : isImage ? (
          <img src={blobUrl} alt="Document" className="max-w-full max-h-[800px] object-contain" />
        ) : (
          <iframe src={blobUrl} className="w-full h-[600px] border-none" title="Document Viewer" />
        )}
      </div>
    </div>
  );
}

// Word Document Viewer Component
function WordDocViewer({ url }: { url: string }) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        const response = await fileApi.get(url, { responseType: 'arraybuffer' });
        const result = await mammoth.convertToHtml({ arrayBuffer: response.data });
        setHtmlContent(result.value);
        setError(null);
      } catch (err) {
        console.error('Error loading Word document:', err);
        setError('Failed to load document');
      } finally {
        setLoading(false);
      }
    };
    loadDocument();
  }, [url]);

  if (loading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-gray-50 rounded">
        <p className="text-gray-500">Loading document...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-red-50 rounded">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div
      className="w-full max-h-96 overflow-y-auto bg-white p-4 rounded border border-gray-200"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
      onContextMenu={(e) => e.preventDefault()}
      onCopy={(e) => e.preventDefault()}
    >
      <style jsx global>{`
        .word-doc-content p, .word-doc-content h1, .word-doc-content h2, .word-doc-content h3, 
        .word-doc-content h4, .word-doc-content h5, .word-doc-content h6, .word-doc-content li,
        .word-doc-content span, .word-doc-content div, .word-doc-content td, .word-doc-content th {
          color: #1f2937 !important;
        }
        .word-doc-content h1, .word-doc-content h2, .word-doc-content h3 {
          font-weight: 700 !important;
          margin-bottom: 0.5rem !important;
        }
        .word-doc-content p {
          margin-bottom: 0.75rem !important;
          line-height: 1.6 !important;
        }
      `}</style>
      <div 
        className="word-doc-content text-gray-800"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}

// Blob-based iframe/image viewer for cross-origin safe loading
function BlobIframe({ url, className, title }: { url: string, className?: string, title?: string }) {
  const { blobUrl, loading, error } = useBlobUrl(url);
  if (error) return <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded"><p className="text-red-400 font-bold">Failed to load document</p></div>;
  if (loading || !blobUrl) return <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded"><p className="text-gray-400 animate-pulse">Loading document...</p></div>;
  return <iframe src={blobUrl} className={className} title={title} />;
}

// Conversation Window Component
function ConversationWindow({ 
  activityTitle, 
  task, 
  activityId,
  studentIvyServiceId,
  onClose,
  studentId,
  markTaskAsRead,
  refreshNotifications,
  refreshTaskCounts
}: { 
  activityTitle: string; 
  task: DocumentTask; 
  activityId: string;
  studentIvyServiceId: string;
  onClose: () => void;
  studentId: string;
  markTaskAsRead: (userId: string, referenceId: string, taskTitle: string, taskPage: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshTaskCounts: () => Promise<void>;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [messageType, setMessageType] = useState<'normal' | 'advice' | 'resource'>('normal');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const messagesLengthRef = useRef(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getFileType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) return 'video';
    if (['pdf'].includes(ext || '')) return 'pdf';
    return 'document';
  };

  const handleFileClick = async (url: string, name: string) => {
    const fileType = getFileType(name);
    try {
      const blobUrl = await fetchBlobUrl(url);
      setPreviewFile({ url: blobUrl, name, type: fileType });
    } catch {
      console.error('Failed to load file preview');
    }
  };

  // Fetch conversation messages from API with real-time polling
  useEffect(() => {
    // Keep ref in sync
    messagesLengthRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    const fetchConversation = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${IVY_API_URL}/task/conversation`, {
          params: {
            selectionId: activityId,
            taskTitle: task.title,
            taskPage: task.page,
          },
        });
        if (response.data.success) {
          const msgs = response.data.data.messages || [];
          setMessages(msgs);
          messagesLengthRef.current = msgs.length;
          // Mark as read on open
          await markTaskAsRead(studentId, activityId, task.title, String(task.page));
          await refreshNotifications();
          await refreshTaskCounts();
          // Scroll to bottom after messages are set
          setTimeout(() => scrollToBottom(), 100);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchConversation();

    // Poll for new messages every 3 seconds
    const pollInterval = setInterval(() => {
      axios.get(`${IVY_API_URL}/task/conversation`, {
        params: {
          selectionId: activityId,
          taskTitle: task.title,
          taskPage: task.page,
        },
      })
      .then(async response => {
        if (response.data.success) {
          const newMessages = response.data.data.messages || [];
          // Compare with ref to avoid stale closure issues
          if (newMessages.length !== messagesLengthRef.current) {
            setMessages(newMessages);
            messagesLengthRef.current = newMessages.length;
            // Mark task notifications as read since user is viewing the conversation
            await markTaskAsRead(studentId, activityId, task.title, String(task.page));
            // Refresh both navbar and task badges
            await refreshNotifications();
            await refreshTaskCounts();
          }
        }
      })
      .catch(error => {
        console.error('Error polling conversation:', error);
      });
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [activityId, task.title, task.page, studentId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() && !attachedFile) return;

    try {
      const formData = new FormData();
      formData.append('studentIvyServiceId', studentIvyServiceId);
      formData.append('selectionId', activityId);
      formData.append('taskTitle', task.title);
      formData.append('taskPage', String(task.page));
      formData.append('sender', 'student');
      formData.append('senderName', 'You');
      formData.append('text', newMessage.trim() || ' ');
      formData.append('messageType', messageType === 'normal' ? 'normal' : messageType === 'advice' ? 'feedback' : messageType === 'resource' ? 'resource' : 'normal');
      
      if (attachedFile) {
        formData.append('file', attachedFile);
      }

      const response = await axios.post(`${IVY_API_URL}/task/conversation/message`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        const msgs = response.data.data.messages || [];
        setMessages(msgs);
        messagesLengthRef.current = msgs.length;
        setNewMessage('');
        setAttachedFile(null);
        setMessageType('normal');
        // Refresh notification counts after sending (recipient gets notified)
        await refreshNotifications();
        await refreshTaskCounts();
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="h-full flex flex-col bg-white">
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-900 mb-1">{activityTitle}</h2>
              <p className="text-sm text-gray-500">Pointer: Spike</p>
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span>Student Perspective</span>
            </div>
            <button className="px-4 py-1.5 bg-gray-100 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-200 transition-colors uppercase tracking-wide">
              Live View
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">Loading conversation...</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${msg.sender === 'student' ? 'order-2' : 'order-1'}`}>
                  {msg.messageType === 'feedback' && msg.sender === 'student' ? (
                    // Advice message from student
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-green-800 uppercase tracking-wide">Get Advice</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-white rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors`}
                        >
                          <div className="p-2 bg-green-100 rounded">
                            <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'feedback' && msg.sender === 'ivyExpert' ? (
                    // Feedback message from Ivy Expert
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 9a1 1 0 112 0v4a1 1 0 11-2 0V9zm1-5a1 1 0 100 2 1 1 0 000-2z"/>
                        </svg>
                        <span className="text-xs font-semibold text-yellow-800 uppercase tracking-wide">Feedback</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-white rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors`}
                        >
                          <div className="p-2 bg-yellow-100 rounded">
                            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'resource' && msg.sender === 'student' ? (
                    // Resource message from student
                    <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Resource</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-white rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors`}
                        >
                          <div className="p-2 bg-indigo-100 rounded">
                            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'action' && msg.sender === 'ivyExpert' ? (
                    // Action message from Ivy Expert
                    <div className="bg-white border-2 border-purple-200 rounded-lg p-4 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Action Suggested</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-purple-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-purple-100 transition-colors`}
                        >
                          <div className="p-2 bg-purple-100 rounded">
                            <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'resource' && msg.sender === 'ivyExpert' ? (
                    // Resource message from Ivy Expert
                    <div className="bg-white border-2 border-indigo-200 rounded-lg p-4 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">Resource</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-indigo-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-indigo-100 transition-colors`}
                        >
                          <div className="p-2 bg-indigo-100 rounded">
                            <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-gray-500">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Regular message
                    <div className={`rounded-2xl px-4 py-3 ${msg.sender === 'student' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {msg.text.trim() && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${msg.sender === 'student' ? 'bg-blue-400/30' : 'bg-white'}`}
                        >
                          <div className={`p-2 rounded ${msg.sender === 'student' ? 'bg-blue-400' : 'bg-red-100'}`}>
                            <svg className={`w-5 h-5 ${msg.sender === 'student' ? 'text-white' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${msg.sender === 'student' ? 'text-white' : 'text-gray-900'}`}>
                              {msg.attachment.name}
                            </p>
                            <p className={`text-xs ${msg.sender === 'student' ? 'text-blue-100' : 'text-gray-500'}`}>
                              {msg.attachment.size}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className={`text-xs text-gray-500 mt-1 ${msg.sender === 'student' ? 'text-right' : 'text-left'}`}>
                    {msg.senderName} • {new Date(msg.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
          {/* Message Type Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setMessageType('normal')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                messageType === 'normal'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              General
            </button>
            <button
              onClick={() => setMessageType('advice')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                messageType === 'advice'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Get Advice
            </button>
            <button
              onClick={() => setMessageType('resource')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                messageType === 'resource'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resource
            </button>
          </div>
          {attachedFile && (
            <div className="mb-3 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded">
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{attachedFile.name}</p>
                <p className="text-xs text-gray-500">{(attachedFile.size / (1024 * 1024)).toFixed(1)} MB</p>
              </div>
              <button
                onClick={() => setAttachedFile(null)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
          <div className="flex items-end gap-3">
            {/* Photos/Videos Upload Button */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = 'image/*,video/*';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    setAttachedFile(file);
                    setMessageType('resource');
                  }
                };
                input.click();
              }}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach photo or video"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            {/* Files Upload Button */}
            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) {
                    setAttachedFile(file);
                    setMessageType('resource');
                  }
                };
                input.click();
              }}
              className="p-2.5 hover:bg-gray-100 rounded-lg transition-colors"
              title="Attach file"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </button>
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Auto-resize textarea
                e.target.style.height = 'auto';
                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type your message..."
              rows={1}
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white resize-none overflow-y-auto"
              style={{ minHeight: '42px', maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() && !attachedFile}
              className="p-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75" onClick={() => setPreviewFile(null)}>
          <div className="relative max-w-6xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="bg-white rounded-lg overflow-hidden">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{previewFile.name}</h3>
              </div>
              
              <div className="p-4 max-h-[calc(90vh-100px)] overflow-auto">
                {previewFile.type === 'image' && (
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full h-auto mx-auto" />
                )}
                {previewFile.type === 'video' && (
                  <video src={previewFile.url} controls className="max-w-full h-auto mx-auto" />
                )}
                {previewFile.type === 'pdf' && (
                  <iframe src={previewFile.url} className="w-full h-[calc(90vh-150px)]" title={previewFile.name} />
                )}
                {previewFile.type === 'document' && (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-gray-600 mb-4">Preview not available for this file type</p>
                    <a
                      href={previewFile.url}
                      download={previewFile.name}
                      className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download File
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface DocumentTask {
  title: string;
  page?: number;
  status: 'not-started' | 'in-progress' | 'completed';
}

interface IvyExpertDocument {
  url: string;
  tasks: DocumentTask[];
}

interface StudentActivity {
  selectionId: string;
  suggestion?: { _id: string; title: string; description: string; tags: string[] };
  pointerNo: number;
  title: string;
  description: string;
  tags: string[];
  selectedAt: string;
  weightage?: number; // Weightage for Pointers 2, 3, 4
  deadline?: string; // Deadline for countdown
  ivyExpertDocuments?: IvyExpertDocument[]; // Documents with tasks
  proofUploaded: boolean;
  submission: {
    _id: string;
    files: string[];
    remarks?: string;
    submittedAt: string;
  } | null;
  evaluated: boolean;
  evaluation: {
    _id: string;
    score: number;
    feedback?: string;
    evaluatedAt: string;
  } | null;
}

function ActivitiesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { studentId, studentIvyServiceId, loading: serviceLoading, error: serviceError } = useStudentService();

  const [activities, setActivities] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activePointer, setActivePointer] = useState<number>(() => {
    const p = searchParams.get('pointerNo');
    return p ? parseInt(p) : 2;
  });
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [viewingIvyExpertDocUrl, setViewingIvyExpertDocUrl] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ activityTitle: string; task: DocumentTask; activityId: string } | null>(null);
  const [pointerScore, setPointerScore] = useState<number | null>(null);

  // Memoize task list to prevent unnecessary re-renders and API calls
  const taskList = useMemo(() => {
    if (!studentId || !activities || activities.length === 0) return [];
    
    return activities.flatMap(activity => 
      (activity.ivyExpertDocuments || []).flatMap(doc =>
        (doc.tasks || []).map(task => ({
          userId: studentId,
          referenceId: activity.selectionId,
          taskTitle: task.title,
          taskPage: String(task.page),
        }))
      )
    );
  }, [studentId, activities]);

  // Initialize task notifications
  const { getTaskCount, markTaskAsRead, refreshCounts } = useTaskNotifications(taskList);
  const { refreshNotifications } = useNotifications();

  // Real-time countdown timer
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getCountdown = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const diff = deadlineDate.getTime() - currentTime.getTime();
    if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return { expired: false, days, hours, minutes, seconds };
  };

  // Update URL when conversation opens/closes
  const handleTaskClick = async (activityTitle: string, task: DocumentTask, activityId: string) => {
    setSelectedTask({ activityTitle, task, activityId });
    
    // Mark task notifications as read when opening conversation
    if (studentId) {
      await markTaskAsRead(studentId, activityId, task.title, String(task.page));
      // Refresh both navbar and task badge counts
      await refreshNotifications();
      await refreshCounts();
    }
    
    const params = new URLSearchParams(window.location.search);
    params.set('conversationOpen', 'true');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  const handleCloseConversation = () => {
    setSelectedTask(null);
    const params = new URLSearchParams(window.location.search);
    params.delete('conversationOpen');
    router.push(`${window.location.pathname}?${params.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const p = searchParams.get('pointerNo');
    if (p) {
      setActivePointer(parseInt(p));
    }
  }, [searchParams]);

  useEffect(() => {
    if (!studentId || serviceLoading) {
      return;
    }

    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await axios.get(
          `${IVY_API_URL}/pointer/activity/student/${studentId}`,
          { params: { studentIvyServiceId } }
        );
        if (response.data.success) {
          // API returns { data: { activities: [...] } }
          const payload = response.data.data;
          const rawActivities = payload && Array.isArray(payload.activities) ? payload.activities : [];

          const activitiesData = rawActivities.map((act: any) => ({
            ...act,
            title: act.suggestion?.title || 'Untitled Activity',
            description: act.suggestion?.description || '',
            tags: act.suggestion?.tags || []
          }));

          setActivities(activitiesData);
        }
      } catch (error: any) {
        console.error('Error fetching activities:', error);
        const errorMessage = error.response?.data?.message || 'Failed to load activities';
        setMessage({ type: 'error', text: errorMessage });
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [studentId]);

  // Fetch score for the active pointer
  const fetchPointerScore = async (pointerNo: number) => {
    if (!studentIvyServiceId) return;
    try {
      const response = await axios.get(
        `${IVY_API_URL}/pointer/activity/score/${studentIvyServiceId}/${pointerNo}`
      );
      if (response.data.success && response.data.data !== undefined) {
        setPointerScore(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching pointer score:', error);
    }
  };

  // Fetch score whenever activePointer or studentIvyServiceId changes
  useEffect(() => {
    if (studentIvyServiceId && activePointer) {
      fetchPointerScore(activePointer);
    }
  }, [studentIvyServiceId, activePointer]);

  const handleProofUpload = async (
    selectedActivityId: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      return;
    }

    if (!studentId) {
      setMessage({ type: 'error', text: 'Student ID is required' });
      return;
    }

    setUploadingProof(selectedActivityId);
    setMessage(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append('proofFiles', file);
      });
      formData.append('studentIvyServiceId', studentIvyServiceId);
      formData.append('ivyExpertSelectedSuggestionId', selectedActivityId);
      formData.append('studentId', studentId);

      const response = await axios.post(
        `${IVY_API_URL}/pointer/activity/proof/upload`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Proof uploaded successfully!' });
        // Refetch activities after a short delay to ensure backend has saved
        setTimeout(async () => {
          try {
            const refreshResponse = await axios.get(
              `${IVY_API_URL}/pointer/activity/student/${studentId}`,
              { params: { studentIvyServiceId } }
            );
            if (refreshResponse.data.success) {
              const payload = refreshResponse.data.data;
              const rawActivities = payload && Array.isArray(payload.activities) ? payload.activities : [];
              const activitiesData = rawActivities.map((act: any) => ({
                ...act,
                title: act.suggestion?.title || 'Untitled Activity',
                description: act.suggestion?.description || '',
                tags: act.suggestion?.tags || []
              }));
              setActivities(activitiesData);
            }
          } catch (error) {
            console.error('Error refreshing activities:', error);
            window.location.reload();
          }
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to upload proof';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setUploadingProof(null);
    }
  };

  const getPointerLabel = (pointerNo: number): string => {
    switch (pointerNo) {
      case 2:
        return 'Pointer 2: Spike in One Area';
      case 3:
        return 'Pointer 3: Leadership & Initiative';
      case 4:
        return 'Pointer 4: Global & Social Impact';
      default:
        return `Pointer ${pointerNo}`;
    }
  };

  // Calculate activity completion percentage based on completed tasks
  const getActivityCompletionPercentage = (activity: StudentActivity): number => {
    if (!activity.ivyExpertDocuments || activity.ivyExpertDocuments.length === 0) {
      return 0;
    }
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    activity.ivyExpertDocuments.forEach(doc => {
      if (doc.tasks && doc.tasks.length > 0) {
        totalTasks += doc.tasks.length;
        completedTasks += doc.tasks.filter(task => task.status === 'completed').length;
      }
    });
    
    if (totalTasks === 0) return 0;
    return Math.round((completedTasks / totalTasks) * 100);
  };

  // Check if all tasks are completed for an activity
  const areAllTasksCompleted = (activity: StudentActivity): boolean => {
    if (!activity.ivyExpertDocuments || activity.ivyExpertDocuments.length === 0) {
      return true; // No tasks means upload is allowed
    }
    
    let totalTasks = 0;
    let completedTasks = 0;
    
    activity.ivyExpertDocuments.forEach(doc => {
      if (doc.tasks && doc.tasks.length > 0) {
        totalTasks += doc.tasks.length;
        completedTasks += doc.tasks.filter(task => task.status === 'completed').length;
      }
    });
    
    if (totalTasks === 0) return true; // No tasks means upload is allowed
    return completedTasks === totalTasks;
  };

  if (serviceLoading) {
    return <div className="p-20 text-center text-gray-500">Loading...</div>;
  }

  if (serviceError || !studentId) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto bg-white rounded-[2.5rem] shadow-sm border border-red-100 p-8">
          <div className="bg-red-50 text-red-800 border border-red-200 p-6 rounded-2xl font-bold uppercase tracking-tight text-center">
            {serviceError || 'Student ID is required.'}
          </div>
        </div>
      </div>
    );
  }

  const filteredActivities = activities.filter(a => a.pointerNo === activePointer);

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Tasks List Section */}
      <div className={`transition-all duration-300 ${selectedTask ? 'w-[35%]' : 'w-full'} overflow-y-auto`}>
        <div className="py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto bg-white rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.02)] border border-gray-100 p-10 mt-6">
        <div className="mb-10 pb-6 border-b border-gray-100 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">{getPointerLabel(activePointer)}</h1>
            <p className="text-gray-500 font-medium mt-1">Proof submission and tracking.</p>
          </div>
          <div className="flex items-center gap-4">
            {/* <div className={`px-6 py-3 rounded-2xl border-2 flex items-center gap-3 ${activePointer === 2 ? 'border-blue-100 bg-blue-50 text-blue-700' : activePointer === 3 ? 'border-indigo-100 bg-indigo-50 text-indigo-700' : 'border-purple-100 bg-purple-50 text-purple-700'}`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${activePointer === 2 ? 'bg-blue-500' : activePointer === 3 ? 'bg-indigo-500' : 'bg-purple-500'}`}></span>
              <span className="font-bold uppercase tracking-wider">{getPointerLabel(activePointer)}</span>
            </div> */}
            {/* Score Card - Always show when studentIvyServiceId is present */}
            {studentIvyServiceId && (
              <div className="bg-white p-6 rounded-2xl shadow-md border-2 border-indigo-100 flex flex-col items-center justify-center text-center">
                <span className="text-xs font-black tracking-widest text-gray-400 uppercase mb-2">Current Score</span>
                <div className="text-5xl font-black text-indigo-600 leading-none">
                  {pointerScore !== null && pointerScore !== undefined ? pointerScore.toFixed(2) : '0.00'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div
            className={`mb-6 p-4 rounded-md ${message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
              }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading activities...</div>
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <p>No activities assigned for {getPointerLabel(activePointer)} yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredActivities.map((activity) => {
              const isActivityOverdue = activity.deadline && !activity.proofUploaded && getCountdown(activity.deadline).expired;
              return (
              <div
                key={activity.selectionId}
                className="relative border border-gray-200 rounded-lg p-6 overflow-hidden"
              >
                {/* Overdue Ribbon */}
                {isActivityOverdue && (
                  <div className="absolute top-0 left-0 w-28 h-28 overflow-hidden z-10 pointer-events-none">
                    <div className="absolute top-[14px] left-[-32px] w-[140px] text-center text-white text-[11px] font-extrabold uppercase tracking-wider py-1.5 bg-red-600 shadow-lg transform -rotate-45">
                      Overdue
                    </div>
                  </div>
                )}
                <div className="mb-4">
                  <div className="flex flex-col gap-2 mb-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-lg font-semibold text-gray-900 flex-1">{activity.title}</h3>
                      {/* Weightage Badge - Always visible next to title */}
                      {activity.weightage !== undefined && activity.weightage !== null && (
                        <div className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-orange-100 to-amber-100 border-2 border-orange-400 rounded-lg">
                          <span className="text-xs font-bold text-orange-900 whitespace-nowrap">Weightage: {activity.weightage}%</span>
                        </div>
                      )}
                    </div>
                    {/* Completion Progress - Below title */}
                    {[2, 3, 4].includes(activity.pointerNo) && (
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              getActivityCompletionPercentage(activity) === 100 
                                ? 'bg-green-500' 
                                : getActivityCompletionPercentage(activity) >= 50 
                                  ? 'bg-blue-500' 
                                  : 'bg-orange-500'
                            }`}
                            style={{ width: `${getActivityCompletionPercentage(activity)}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${
                          getActivityCompletionPercentage(activity) === 100 
                            ? 'text-green-600' 
                            : getActivityCompletionPercentage(activity) >= 50 
                              ? 'text-blue-600' 
                              : 'text-orange-600'
                        }`}>
                          {getActivityCompletionPercentage(activity)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mb-2">
                    {getPointerLabel(activity.pointerNo)}
                  </p>
                  <p className="text-gray-700 whitespace-pre-wrap mb-4">
                    {activity.description}
                  </p>
                  {activity.tags && activity.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {activity.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Deadline Countdown - Hidden when proof uploaded */}
                {activity.deadline && !activity.proofUploaded && (() => {
                  const cd = getCountdown(activity.deadline);
                  return (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-blue-900">⏰ Deadline:</span>
                        {cd.expired ? (
                          <div className="flex items-center gap-2 px-3 py-1.5 bg-red-100 border border-red-300 rounded-lg">
                            <span className="text-red-700 font-bold text-sm">⚠ Deadline Expired!</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            {[
                              { value: cd.days, unit: 'Days' },
                              { value: cd.hours, unit: 'Hrs' },
                              { value: cd.minutes, unit: 'Min' },
                              { value: cd.seconds, unit: 'Sec' },
                            ].map((item) => (
                              <div key={item.unit} className="flex flex-col items-center bg-blue-100 border border-blue-300 rounded-lg px-3 py-1.5 min-w-[48px]">
                                <span className="text-lg font-black text-blue-700 leading-none">{String(item.value).padStart(2, '0')}</span>
                                <span className="text-[10px] font-bold text-blue-500 uppercase">{item.unit}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Ivy Expert Documents with Tasks - View Only */}
                {activity.ivyExpertDocuments && activity.ivyExpertDocuments.length > 0 && (
                  <div className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-md">
                    <p className="text-sm font-medium text-indigo-900 mb-3"> Guides & Tasks from Ivy Expert (Click on task to chat with Ivy Expert)</p>
                    <div className="space-y-4">
                      {activity.ivyExpertDocuments.map((doc, docIdx) => {
                        const isPdf = doc.url.toLowerCase().endsWith('.pdf');
                        const isWord = doc.url.toLowerCase().endsWith('.doc') || doc.url.toLowerCase().endsWith('.docx');
                        const isViewing = viewingIvyExpertDocUrl === doc.url;
                        
                        return (
                          <div key={docIdx} className="bg-white rounded-lg border border-indigo-200 overflow-hidden">
                            {/* Document Header */}
                            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-white border-b border-indigo-100">
                              <span className="text-sm text-gray-800 font-semibold">📎 Activity Guide {docIdx + 1}</span>
                              <button
                                onClick={() => setViewingIvyExpertDocUrl(isViewing ? null : doc.url)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isViewing ? 'bg-indigo-600 text-white' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                {isViewing ? 'Hide' : 'View'}
                              </button>
                            </div>

                            {/* Tasks List */}
                            <div className="p-3">
                              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Tasks</p>
                              <div className="space-y-1.5">
                                {[...doc.tasks].sort((a, b) => {
                                  // Sort: not-started and in-progress first, completed last
                                  if (a.status === 'completed' && b.status !== 'completed') return 1;
                                  if (a.status !== 'completed' && b.status === 'completed') return -1;
                                  return 0;
                                }).map((task, taskIdx) => {
                                  const getStatusBadge = (status: string) => {
                                    switch (status) {
                                      case 'completed':
                                        return { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed', icon: '✓' };
                                      case 'in-progress':
                                        return { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress', icon: '⟳' };
                                      default:
                                        return { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Not Started', icon: '○' };
                                    }
                                  };
                                  const statusBadge = getStatusBadge(task.status);
                                  
                                  return (
                                    <div
                                      key={taskIdx}
                                      onClick={() => handleTaskClick(activity.title, task, activity.selectionId)}
                                      className="flex items-start gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative"
                                    >
                                      {task.status === 'completed' && (
                                        <div className="flex-shrink-0 mt-0.5">
                                          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                          </svg>
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                          <p className={`text-sm ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-700 font-medium'}`}>
                                            {task.title}
                                          </p>
                                          {/* Task-level notification badge */}
                                          {getTaskCount(activity.selectionId, task.title, String(task.page)) > 0 && (
                                            <NotificationBadge 
                                              count={getTaskCount(activity.selectionId, task.title, String(task.page))} 
                                              size="sm" 
                                            />
                                          )}
                                        </div>
                                        {task.page && (
                                          <p className="text-xs text-gray-500 mt-0.5">Page {task.page}</p>
                                        )}
                                      </div>
                                      <span className={`flex-shrink-0 px-2.5 py-1 text-xs font-medium ${statusBadge.bg} ${statusBadge.text} rounded-full flex items-center gap-1`}>
                                        <span>{statusBadge.icon}</span>
                                        {statusBadge.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                              <div className="mt-3 pt-2 border-t border-gray-200">
                                <p className="text-xs text-gray-600">
                                  <span className="font-medium text-indigo-700">
                                    {doc.tasks.filter(t => t.status === 'completed').length} of {doc.tasks.length}
                                  </span> tasks completed by Ivy Expert
                                </p>
                              </div>
                            </div>

                            {/* Document Viewer */}
                            {isViewing && (
                              <div className="border-t border-indigo-100 p-3 bg-gray-50">
                                {isPdf ? (
                                  <BlobIframe
                                    url={doc.url}
                                    className="w-full h-96 border-none rounded"
                                    title={`Ivy Expert Document ${docIdx + 1}`}
                                  />
                                ) : isWord ? (
                                  <WordDocViewer url={doc.url} />
                                ) : (
                                  <div className="w-full h-64 flex items-center justify-center bg-gray-100 rounded">
                                    <p className="text-gray-600">Document preview not available</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Proof Upload Section */}
                {activity.proofUploaded ? (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm font-medium text-blue-900 mb-2">Proof Files ({activity.submission!.files.length})</p>
                    <p className="text-xs text-blue-700 mb-3">
                      Submitted: {new Date(activity.submission!.submittedAt).toLocaleString()}
                    </p>
                    <div className="grid grid-cols-1 gap-3 mb-3">
                      {activity.submission!.files.map((fileUrl, index) => {
                        const fileName = fileUrl.split('/').pop() || `File ${index + 1}`;
                        const fileExt = fileName.split('.').pop()?.toLowerCase();
                        const isPdf = fileExt === 'pdf';
                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt || '');
                        const isWord = ['doc', 'docx'].includes(fileExt || '');
                        
                        return (
                          <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-200 hover:border-blue-400 transition-all">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="flex-shrink-0">
                                {isPdf && (
                                  <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                  </svg>
                                )}
                                {isImage && (
                                  <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                  </svg>
                                )}
                                {isWord && (
                                  <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  Proof {index + 1}
                                </p>
                                <p className="text-xs text-gray-500 truncate">{fileName}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => setViewingFileUrl(viewingFileUrl === fileUrl ? null : fileUrl)}
                              className={`flex-shrink-0 ml-3 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                viewingFileUrl === fileUrl 
                                  ? 'bg-indigo-600 text-white' 
                                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                              }`}
                            >
                              {viewingFileUrl === fileUrl ? 'Hide' : 'View'}
                            </button>
                          </div>
                        );
                      })}
                      {activity.submission!.files.map((fileUrl, index) => (
                        viewingFileUrl === fileUrl && (
                          <div key={`viewer-${index}`} className="col-span-1">
                            <InlineDocViewer url={fileUrl} onClose={() => setViewingFileUrl(null)} />
                          </div>
                        )
                      ))}
                    </div>
                    
                    {/* Add More Files Button */}
                    <button
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.multiple = true;
                        input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx';
                        input.onchange = (e) => {
                          handleProofUpload(activity.selectionId, e as any);
                        };
                        input.click();
                      }}
                      disabled={uploadingProof === activity.selectionId}
                      className="w-full px-4 py-2.5 bg-white border-2 border-dashed border-blue-300 text-blue-700 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      {uploadingProof === activity.selectionId ? 'Uploading...' : 'Add More Files'}
                    </button>
                  </div>
                ) : areAllTasksCompleted(activity) ? (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Upload Proof (PDF, Images, Word Documents)
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={(e) => handleProofUpload(activity.selectionId, e)}
                      disabled={uploadingProof === activity.selectionId}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                    />
                    {uploadingProof === activity.selectionId && (
                      <p className="text-xs text-gray-500 mt-2">Uploading...</p>
                    )}
                  </div>
                ) : (
                  <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div>
                        <p className="text-sm font-bold text-yellow-900 mb-1">Tasks Incomplete</p>
                        <p className="text-sm text-yellow-800">
                          You must complete all tasks ({getActivityCompletionPercentage(activity)}% done) before uploading proof. Please work on the pending tasks and check back once they're all marked as completed by your Ivy Expert.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evaluation Score */}
                {activity.evaluated && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm font-medium text-green-900 mb-1">
                      Score: {activity.evaluation!.score}/10
                    </p>
                    {activity.evaluation!.feedback && (
                      <p className="text-sm text-green-800 whitespace-pre-wrap mt-2">
                        {activity.evaluation!.feedback}
                      </p>
                    )}
                    <p className="text-xs text-green-700 mt-2">
                      Evaluated: {new Date(activity.evaluation!.evaluatedAt).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
            })}
          </div>
        )}
      </div>
      </div>
    </div>

      {/* Conversation Window Section */}
      {selectedTask && (
        <div className="w-[65%] border-l border-gray-200 h-screen overflow-hidden">
          <ConversationWindow
            activityTitle={selectedTask.activityTitle}
            task={selectedTask.task}
            activityId={selectedTask.activityId}
            studentIvyServiceId={studentIvyServiceId!}
            onClose={handleCloseConversation}
            studentId={studentId!}
            markTaskAsRead={markTaskAsRead}
            refreshNotifications={refreshNotifications}
            refreshTaskCounts={refreshCounts}
          />
        </div>
      )}
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <div className="font-sans">
      <Suspense fallback={<div className="p-20 text-center text-gray-400 font-bold uppercase tracking-widest text-xs animate-pulse">Syncing Activities...</div>}>
        <ActivitiesContent />
      </Suspense>
    </div>
  );
}
