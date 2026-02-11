'use client';

import { useState, useEffect, Suspense, useRef, useMemo, useCallback } from 'react';
import axios from 'axios';
import { useSearchParams, useRouter } from 'next/navigation';
import mammoth from 'mammoth';
import { useTaskNotifications } from '@/hooks/useTaskNotifications';
import { NotificationBadge } from '@/components/NotificationBadge';
import { useNotifications } from '@/contexts/NotificationContext';
import { IVY_API_URL, BACKEND_URL } from '@/lib/ivyApi';

function InlineDocViewer({ url, onClose }: { url: string, onClose: () => void }) {
  const fullUrl = `${BACKEND_URL}${url}`;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(url);
  const isWord = /\.(doc|docx)$/i.test(url);
  const [wordContent, setWordContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (isWord) {
      setIsLoading(true);
      setError('');
      axios.get(fullUrl, { responseType: 'arraybuffer' })
        .then(response => {
          return mammoth.convertToHtml({ arrayBuffer: response.data });
        })
        .then(result => {
          setWordContent(result.value);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('Error loading Word document:', err);
          setError('Failed to load document');
          setIsLoading(false);
        });
    }
  }, [fullUrl, isWord]);

  useEffect(() => {
    // Prevent right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+S, Ctrl+P, Ctrl+A, Ctrl+X
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' ||
          e.key === 's' ||
          e.key === 'p' ||
          e.key === 'a' ||
          e.key === 'x')
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <div className="mt-4 relative bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border-4 border-gray-800 animate-in fade-in zoom-in-95 duration-300"
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
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
        {isImage ? (
          <img src={fullUrl} alt="Document" className="max-w-full max-h-[800px] object-contain" />
        ) : isWord ? (
          <div className="w-full h-[600px] overflow-auto bg-white p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-full text-red-500">{error}</div>
            ) : (
              <>
                <style jsx global>{`
                  .ivy-expert-word-content p, .ivy-expert-word-content h1, .ivy-expert-word-content h2, .ivy-expert-word-content h3, 
                  .ivy-expert-word-content h4, .ivy-expert-word-content h5, .ivy-expert-word-content h6, .ivy-expert-word-content li,
                  .ivy-expert-word-content span, .ivy-expert-word-content div, .ivy-expert-word-content td, .ivy-expert-word-content th {
                    color: #1f2937 !important;
                  }
                  .ivy-expert-word-content h1, .ivy-expert-word-content h2, .ivy-expert-word-content h3 {
                    font-weight: 700 !important;
                    margin-bottom: 0.5rem !important;
                  }
                  .ivy-expert-word-content p {
                    margin-bottom: 0.75rem !important;
                    line-height: 1.6 !important;
                  }
                `}</style>
                <div 
                  className="ivy-expert-word-content text-gray-800"
                  dangerouslySetInnerHTML={{ __html: wordContent }}
                />
              </>
            )}
          </div>
        ) : (
          <iframe src={fullUrl} className="w-full h-[600px] border-none" title="Document Viewer" />
        )}
      </div>
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

// Conversation Window Component for Ivy Expert
function ConversationWindow({ 
  activityTitle, 
  task, 
  activityId,
  studentIvyServiceId,
  onClose,
  ivyExpertId,
  markTaskAsRead,
  refreshNotifications,
  refreshTaskCounts
}: { 
  activityTitle: string; 
  task: DocumentTask; 
  activityId: string;
  studentIvyServiceId: string;
  onClose: () => void;
  ivyExpertId: string;
  markTaskAsRead: (userId: string, referenceId: string, taskTitle: string, taskPage: string) => Promise<void>;
  refreshNotifications: () => Promise<void>;
  refreshTaskCounts: () => Promise<void>;
}) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [messageType, setMessageType] = useState<'feedback' | 'action' | 'resource' | 'normal'>('normal');
  const [loading, setLoading] = useState(true);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesLengthRef = useRef(0);

  const getFileType = (filename: string): string => {
    const ext = filename.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) return 'image';
    if (['mp4', 'webm', 'ogg', 'mov'].includes(ext || '')) return 'video';
    if (['pdf'].includes(ext || '')) return 'pdf';
    return 'document';
  };

  const handleFileClick = (url: string, name: string) => {
    const fileType = getFileType(name);
    const fullUrl = `${BACKEND_URL}${url}`;
    console.log('Opening file preview:', { url, fullUrl, name, type: fileType });
    setPreviewFile({ url: fullUrl, name, type: fileType });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
          await markTaskAsRead(ivyExpertId, activityId, task.title, String(task.page));
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
            await markTaskAsRead(ivyExpertId, activityId, task.title, String(task.page));
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
  }, [activityId, task.title, task.page, ivyExpertId]);

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
      formData.append('sender', 'ivyExpert');
      formData.append('senderName', 'Ivy Expert');
      formData.append('text', newMessage.trim() || ' ');
      formData.append('messageType', messageType);
      
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
              <p className="text-sm text-gray-500">Spike in One Area</p>
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
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="font-medium text-green-600">ADMIN ACTIVE</span>
            </div>
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
              <div key={index} className={`flex ${msg.sender === 'ivyExpert' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${msg.sender === 'ivyExpert' ? 'order-2' : 'order-1'}`}>
                  {msg.messageType === 'feedback' && msg.sender === 'ivyExpert' ? (
                    // Feedback message from Ivy Expert
                    <div className="bg-blue-500 text-white rounded-2xl px-4 py-3 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold uppercase tracking-wide">Feedback</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-blue-400/30 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-blue-400/40 transition-colors`}
                        >
                          <div className="p-2 bg-blue-400 rounded">
                            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{msg.attachment.name}</p>
                            <p className="text-xs text-blue-100">{msg.attachment.size}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : msg.messageType === 'feedback' && msg.sender === 'student' ? (
                    // Advice message from student
                    <div className="bg-white border-2 border-green-200 rounded-2xl px-4 py-3 mb-1">
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="text-xs font-semibold text-green-600 uppercase tracking-wide">Get Advice</span>
                      </div>
                      {msg.text.trim() && <p className="text-sm text-gray-800 leading-relaxed">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 bg-green-50 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-green-100 transition-colors`}
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
                  ) : msg.messageType === 'action' && msg.sender === 'ivyExpert' ? (
                    // Action Suggested message from Ivy Expert
                    <div className="bg-white border-2 border-purple-200 rounded-2xl px-4 py-3 mb-1">
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
                    <div className="bg-white border-2 border-indigo-200 rounded-2xl px-4 py-3 mb-1">
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
                  ) : msg.messageType === 'resource' && msg.sender === 'student' ? (
                    // Resource message from student
                    <div className="bg-white border-2 border-indigo-200 rounded-2xl px-4 py-3 mb-1">
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
                    <div className={`rounded-2xl px-4 py-3 ${msg.sender === 'ivyExpert' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                      {msg.text.trim() && <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>}
                      {msg.attachment && (
                        <div 
                          onClick={() => handleFileClick(msg.attachment!.url, msg.attachment!.name)}
                          className={`${msg.text.trim() ? 'mt-3' : ''} p-3 rounded-lg flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity ${msg.sender === 'ivyExpert' ? 'bg-blue-400/30' : 'bg-white'}`}
                        >
                          <div className={`p-2 rounded ${msg.sender === 'ivyExpert' ? 'bg-blue-400' : 'bg-red-100'}`}>
                            <svg className={`w-5 h-5 ${msg.sender === 'ivyExpert' ? 'text-white' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${msg.sender === 'ivyExpert' ? 'text-white' : 'text-gray-900'}`}>
                              {msg.attachment.name}
                            </p>
                            <p className={`text-xs ${msg.sender === 'ivyExpert' ? 'text-blue-100' : 'text-gray-500'}`}>
                              {msg.attachment.size}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <p className={`text-xs text-gray-500 mt-1 ${msg.sender === 'ivyExpert' ? 'text-right' : 'text-left'}`}>
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
              onClick={() => setMessageType('feedback')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                messageType === 'feedback'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Feedback
            </button>
            <button
              onClick={() => setMessageType('action')}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                messageType === 'action'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Action
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
              placeholder="Write structured feedback..."
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
          <p className="text-xs text-gray-400 mt-2 text-center">Sending as "Advanced Ivy Expert" mode</p>
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

interface AgentSuggestion {
  _id: string;
  title: string;
  description: string;
  tags: string[];
  pointerNo: number;
  source?: string;
  documentUrl?: string | null;
  documentName?: string | null;
}

interface StudentActivity {
  selectionId: string;
  suggestion?: AgentSuggestion;
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
  const studentIvyServiceId = searchParams.get('studentIvyServiceId');
  const ivyExpertId = searchParams.get('ivyExpertId') || '695b93a44df1114a001dc23d';

  const [careerRole, setCareerRole] = useState<string>('');
  const [selectedPointer, setSelectedPointer] = useState<number | ''>(() => {
    const p = searchParams.get('pointerNo');
    return p ? parseInt(p) : 2;
  });

  useEffect(() => {
    const p = searchParams.get('pointerNo');
    if (p) {
      setSelectedPointer(parseInt(p));
    }
  }, [searchParams]);
  const [suggestions, setSuggestions] = useState<AgentSuggestion[]>([]);
  const [selectedActivities, setSelectedActivities] = useState<Set<string>>(new Set());
  const [activityWeightages, setActivityWeightages] = useState<Record<string, number>>({});
  const [studentActivities, setStudentActivities] = useState<StudentActivity[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingActivities, setLoadingActivities] = useState<boolean>(false);
  const [selectingActivities, setSelectingActivities] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'suggestions' | 'evaluate'>('suggestions');
  const [viewingFileUrl, setViewingFileUrl] = useState<string | null>(null);
  const [viewingIvyExpertDocUrl, setViewingIvyExpertDocUrl] = useState<string | null>(null);
  const [viewingDocumentForActivity, setViewingDocumentForActivity] = useState<string | null>(null); // Store activity ID
  const [selectedTask, setSelectedTask] = useState<{ activityTitle: string; task: DocumentTask; activityId: string } | null>(null);

  // Memoize task list to prevent unnecessary re-renders and API calls
  const taskList = useMemo(() => {
    if (!ivyExpertId || !studentActivities || studentActivities.length === 0) return [];
    
    return studentActivities.flatMap(activity => 
      (activity.ivyExpertDocuments || []).flatMap(doc =>
        (doc.tasks || []).map(task => ({
          userId: ivyExpertId,
          referenceId: activity.selectionId,
          taskTitle: task.title,
          taskPage: String(task.page),
        }))
      )
    );
  }, [ivyExpertId, studentActivities]);

  // Initialize task notifications
  // Initialize task notifications
  const { getTaskCount, markTaskAsRead, refreshCounts } = useTaskNotifications(taskList);
  const { refreshNotifications } = useNotifications();

  // Real-time countdown timer
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Deadline state per suggestion (keyed by suggestion._id, used during selection)
  const [activityDeadlines, setActivityDeadlines] = useState<Record<string, string>>({});
  // Deadline update state for evaluate tab (keyed by selectionId)
  const [deadlineInputs, setDeadlineInputs] = useState<Record<string, string>>({});
  const [savingDeadline, setSavingDeadline] = useState<string | null>(null);

  const handleSetDeadline = async (selectionId: string) => {
    const deadline = deadlineInputs[selectionId];
    if (!deadline) return;
    setSavingDeadline(selectionId);
    try {
      const response = await axios.post(`${IVY_API_URL}/pointer/activity/deadline`, {
        selectionId,
        ivyExpertId,
        deadline,
      });
      if (response.data.success) {
        setStudentActivities(prev => prev.map(act =>
          act.selectionId === selectionId ? { ...act, deadline: response.data.data.deadline } : act
        ));
        setMessage({ type: 'success', text: 'Deadline updated successfully!' });
        setTimeout(() => setMessage(null), 2000);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update deadline' });
    } finally {
      setSavingDeadline(null);
    }
  };

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
    if (ivyExpertId) {
      await markTaskAsRead(ivyExpertId, activityId, task.title, String(task.page));
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

  const fetchStudentActivities = async () => {
    const studentId = searchParams.get('studentId');
    const svcId = searchParams.get('studentIvyServiceId');
    if (!studentId) return;

    setLoadingActivities(true);
    try {
      const response = await axios.get(
        `${IVY_API_URL}/pointer/activity/student/${studentId}`,
        { params: { studentIvyServiceId: svcId } }
      );
      if (response.data.success) {
        const payload = response.data.data;
        const rawActivities = payload && Array.isArray(payload.activities) ? payload.activities : [];

        const activitiesData = rawActivities.map((act: any) => ({
          ...act,
          title: act.suggestion?.title || 'Untitled Activity',
          description: act.suggestion?.description || '',
          tags: act.suggestion?.tags || []
        }));

        setStudentActivities(activitiesData);
        
        // Load weightages from database
        const weightagesFromDb: Record<string, number> = {};
        activitiesData.forEach((act: StudentActivity) => {
          if (act.suggestion?._id && act.weightage !== undefined && act.weightage !== null) {
            weightagesFromDb[act.suggestion._id] = act.weightage;
          }
        });
        setActivityWeightages(prev => ({ ...prev, ...weightagesFromDb }));
      }
    } catch (error: any) {
      console.error('Error fetching student activities:', error);
      console.error('Error details:', {
        url: `${IVY_API_URL}/pointer/activity/student/${studentId}`,
        status: error.response?.status,
        message: error.message
      });
      // Don't show error to user if student simply has no activities yet
    } finally {
      setLoadingActivities(false);
    }
  };

  useEffect(() => {
    if (!studentIvyServiceId) return;
    if (activeTab === 'evaluate') {
      fetchStudentActivities();
    }
  }, [studentIvyServiceId, searchParams, activeTab]);

  useEffect(() => {
    if (!studentIvyServiceId) return;

    const initData = async () => {
      setLoadingActivities(true);
      try {
        const serviceResponse = await axios.get(`${IVY_API_URL}/ivy-service/${studentIvyServiceId}`);
        if (serviceResponse.data.success && serviceResponse.data.data.studentInterest) {
          setCareerRole(serviceResponse.data.data.studentInterest);
        }

        const studentId = searchParams.get('studentId');
        if (studentId) {
          try {
            const activitiesResponse = await axios.get(`${IVY_API_URL}/pointer/activity/student/${studentId}`, { params: { studentIvyServiceId } });
            if (activitiesResponse.data.success) {
              const payload = activitiesResponse.data.data;
              const rawActivities = payload && Array.isArray(payload.activities) ? payload.activities : [];

              const activitiesData = rawActivities.map((act: any) => ({
                ...act,
                title: act.suggestion?.title || 'Untitled Activity',
                description: act.suggestion?.description || '',
                tags: act.suggestion?.tags || []
              }));

              setStudentActivities(activitiesData);

              const assignedIds = new Set<string>();
              const weightagesFromDb: Record<string, number> = {};
              const deadlinesFromDb: Record<string, string> = {};
              activitiesData.forEach((act: StudentActivity) => {
                if (act.suggestion?._id) {
                  assignedIds.add(act.suggestion._id);
                  // Load weightage from database if available
                  if (act.weightage !== undefined && act.weightage !== null) {
                    weightagesFromDb[act.suggestion._id] = act.weightage;
                  }
                  // Load deadline from database if available
                  if (act.deadline) {
                    deadlinesFromDb[act.suggestion._id] = new Date(act.deadline).toISOString().slice(0, 16);
                  }
                }
              });
              setSelectedActivities(assignedIds);
              setActivityWeightages(weightagesFromDb);
              setActivityDeadlines(deadlinesFromDb);
            }
          } catch (activityError: any) {
            console.error("Error fetching activities:", activityError);
            // Don't fail the whole init if activities fetch fails
            // Student might not have any activities yet
          }
        }
      } catch (error) {
        console.error("Error initializing data:", error);
      } finally {
        setLoadingActivities(false);
      }
    };

    initData();
  }, [studentIvyServiceId, searchParams]);

  const handleFetchSuggestions = async () => {
    if (!careerRole.trim()) {
      setMessage({ type: 'error', text: 'Please enter career role' });
      return;
    }

    if (!selectedPointer) {
      setMessage({ type: 'error', text: 'Please select a pointer' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await axios.put(`${IVY_API_URL}/ivy-service/${studentIvyServiceId}/interest`, {
        interest: careerRole.trim()
      });

      const response = await axios.get<AgentSuggestion[]>(
        `${IVY_API_URL}/agent-suggestions`,
        {
          params: {
            careerRole: careerRole.trim(),
            pointerNo: selectedPointer,
          },
        }
      );

      setSuggestions(response.data);
      if (response.data.length === 0) {
        setMessage({
          type: 'error',
          text: 'No suitable activities found.',
        });
      }
    } catch (error: any) {
      console.error('Error fetching agent suggestions:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to load agent suggestions';
      setMessage({ type: 'error', text: errorMessage });
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch suggestions logic
  useEffect(() => {
    if (careerRole && selectedPointer && !loading) {
      handleFetchSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPointer, careerRole]);

  const handleToggleActivity = (activityId: string) => {
    const newSelected = new Set(selectedActivities);
    const updatedWeightages = { ...activityWeightages };
    const updatedDeadlines = { ...activityDeadlines };
    
    if (newSelected.has(activityId)) {
      // Removing activity
      newSelected.delete(activityId);
      delete updatedWeightages[activityId];
      delete updatedDeadlines[activityId];
    } else {
      // Adding activity
      newSelected.add(activityId);
      // Auto-assign weightage for Pointers 2, 3, 4
      if ([2, 3, 4].includes(selectedPointer as number)) {
        if (newSelected.size === 1) {
          updatedWeightages[activityId] = 100;
        } else {
          // Distribute evenly
          const equalWeight = Math.floor(100 / newSelected.size);
          const remainder = 100 - (equalWeight * newSelected.size);
          let index = 0;
          newSelected.forEach(actId => {
            updatedWeightages[actId] = index === 0 ? equalWeight + remainder : equalWeight;
            index++;
          });
        }
      }
    }
    
    setSelectedActivities(newSelected);
    setActivityWeightages(updatedWeightages);
    setActivityDeadlines(updatedDeadlines);
  };

  const handleWeightageChange = async (id: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const newWeightages = { ...activityWeightages, [id]: numValue };
    setActivityWeightages(newWeightages);
    
    // Auto-save weightages to database
    if ([2, 3, 4].includes(selectedPointer as number) && studentIvyServiceId) {
      try {
        // Prepare weightages object for all selected activities
        const weightagesPayload: Record<string, number> = {};
        selectedActivities.forEach(actId => {
          weightagesPayload[actId] = newWeightages[actId] || 0;
        });

        await axios.put(`${IVY_API_URL}/pointer/activity/weightages`, {
          studentIvyServiceId,
          ivyExpertId,
          weightages: weightagesPayload,
        });
        
        // Clear any previous error message if save was successful
        if (message?.type === 'error' && message.text.includes('weightage')) {
          setMessage(null);
        }
      } catch (error: any) {
        // Silently handle weightage validation errors - they'll be shown in the UI warning box
        const errorMsg = error.response?.data?.message || '';
        if (!errorMsg.includes('weightage') && !errorMsg.includes('100')) {
          // Only show message for non-weightage errors
          console.error('Error saving weightages:', error);
          setMessage({ type: 'error', text: 'Failed to save weightages' });
        }
      }
    }
  };

  const getTotalWeightage = () => {
    // Only sum weightages for currently selected activities in current pointer suggestions
    const currentSuggestionIds = new Set(suggestions.map(s => s._id));
    return Array.from(selectedActivities)
      .filter(id => currentSuggestionIds.has(id))
      .reduce((sum, id) => sum + (activityWeightages[id] || 0), 0);
  };

  const isWeightageValid = () => {
    if (![2, 3, 4].includes(selectedPointer as number)) return true;
    if (currentPointerSelectionCount === 0) return true;
    if (currentPointerSelectionCount === 1) return true;
    
    const total = getTotalWeightage();
    return Math.abs(total - 100) < 0.01;
  };

  const areDeadlinesValid = () => {
    // Check if all selected activities have deadlines
    const currentPointerSuggestionIds = new Set(suggestions.map(s => s._id));
    const selectedIds = Array.from(selectedActivities).filter(id => currentPointerSuggestionIds.has(id));
    
    for (const id of selectedIds) {
      if (!activityDeadlines[id] || activityDeadlines[id].trim() === '') {
        return false;
      }
    }
    return true;
  };

  const handleSelectActivities = async () => {
    // Filter selected activities to only include those in the current suggestions (current pointer)
    const currentPointerSuggestionIds = new Set(suggestions.map(s => s._id));
    const idsToSubmit = Array.from(selectedActivities).filter(id => currentPointerSuggestionIds.has(id));

    if (idsToSubmit.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one activity for this pointer' });
      return;
    }

    if (!studentIvyServiceId) {
      setMessage({ type: 'error', text: 'Student Ivy Service ID is required' });
      return;
    }

    if (!selectedPointer) {
      setMessage({ type: 'error', text: 'Pointer must be selected' });
      return;
    }

    // Validate weightages for Pointers 2, 3, 4
    if ([2, 3, 4].includes(selectedPointer as number) && idsToSubmit.length > 1) {
      if (!isWeightageValid()) {
        setMessage({ type: 'error', text: `Total weightage must equal 100. Current total: ${getTotalWeightage().toFixed(2)}` });
        return;
      }
    }

    // Validate all selected activities have deadlines
    if (!areDeadlinesValid()) {
      setMessage({ type: 'error', text: 'All selected activities must have a deadline set' });
      return;
    }

    setSelectingActivities(true);
    setMessage(null);

    try {
      const payload: any = {
        studentIvyServiceId,
        ivyExpertId,
        agentSuggestionIds: idsToSubmit,
        pointerNo: selectedPointer,
      };

      // Add weightages for Pointers 2, 3, 4
      if ([2, 3, 4].includes(selectedPointer as number) && idsToSubmit.length > 0) {
        payload.weightages = idsToSubmit.map(id => activityWeightages[id] || 0);
      }

      // Add deadlines for each activity
      payload.deadlines = idsToSubmit.map(id => activityDeadlines[id] || '');

      const response = await axios.post(`${IVY_API_URL}/pointer/activity/select`, payload);

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Activities selected successfully!' });
        // Don't reset weightages - keep them for reference
        setTimeout(() => {
          fetchStudentActivities();
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to select activities';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSelectingActivities(false);
    }
  };

  const handleEvaluate = async (submissionId: string, score: string, feedback: string) => {
    const scoreNum = parseFloat(score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 10) {
      setMessage({ type: 'error', text: 'Score must be between 0 and 10' });
      return;
    }

    try {
      const response = await axios.post(`${IVY_API_URL}/pointer/activity/evaluate`, {
        studentSubmissionId: submissionId,
        ivyExpertId,
        score: scoreNum,
        feedback,
      });

      if (response.data.success) {
        setMessage({ type: 'success', text: 'Activity evaluated successfully!' });
        setTimeout(() => {
          fetchStudentActivities();
        }, 500);
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to evaluate activity';
      setMessage({ type: 'error', text: errorMessage });
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

  if (!studentIvyServiceId) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-md">
            Student Ivy Service ID is required. Please provide studentIvyServiceId as a query parameter.
          </div>
        </div>
      </div>
    );
  }

  // Calculate distinct selection count for the current pointer
  const currentPointerSelectionCount = suggestions.filter(s => selectedActivities.has(s._id)).length;

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Main Content - Tasks */}
      <div 
        className={`flex-1 overflow-y-auto transition-all duration-300 ${selectedTask ? 'w-[35%]' : 'w-full'}`}
        style={{ maxWidth: selectedTask ? '35%' : '100%' }}
      >
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Activity Management</h1>

        {/* Tabs */}
        <div className="flex space-x-4 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`px-4 py-2 font-medium ${activeTab === 'suggestions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Select Activities
          </button>
          <button
            onClick={() => setActiveTab('evaluate')}
            className={`px-4 py-2 font-medium ${activeTab === 'evaluate'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Evaluate Proofs
          </button>
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

        {/* Select Activities Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-6">
            <div className="mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                <span className={`w-3 h-10 rounded-full ${selectedPointer === 2 ? 'bg-blue-500' : selectedPointer === 3 ? 'bg-indigo-500' : 'bg-purple-500'}`}></span>
                {getPointerLabel(selectedPointer as number)}
              </h2>
            </div>

            {/* Career Role Input */}
            <div className="mb-6">
              <label
                htmlFor="careerRole"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Career Role for {getPointerLabel(selectedPointer as number)}
              </label>
              <div className="flex gap-2">
                <textarea
                  id="careerRole"
                  value={careerRole}
                  onChange={(e) => setCareerRole(e.target.value)}
                  rows={3}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white resize-y"
                  placeholder="Enter career role for this pointer (e.g., 'Doctor', 'Engineer', 'Finance')..."
                />
                <button
                  onClick={handleFetchSuggestions}
                  disabled={loading || !careerRole.trim()}
                  className="self-start px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed h-[86px]"
                >
                  {loading ? '...' : 'Save & Get Suggestions'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                * Updating the interest here will save it for this student. Use "Get Suggestions" to refresh the list below.
              </p>
            </div>

            {/* Suggestions Render Logic */}
            {selectedPointer && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8 text-gray-500">
                    Loading suggestions...
                  </div>
                ) : suggestions.length > 0 ? (
                  <div className="space-y-4">
                    {/* Weightage Info Banner for Pointers 2, 3, 4 */}
                    {[2, 3, 4].includes(selectedPointer as number) && currentPointerSelectionCount > 0 && (
                      <div className={`p-4 rounded-lg border-2 ${
                        currentPointerSelectionCount === 1 
                          ? 'bg-green-50 border-green-300' 
                          : isWeightageValid() 
                            ? 'bg-green-50 border-green-300' 
                            : 'bg-red-50 border-red-300'
                      }`}>
                        <h4 className="font-bold text-sm mb-2 text-gray-900">
                          {currentPointerSelectionCount === 1 ? '✓ Single Activity Selected' : '⚠️ Multiple Activities - Weightage Required'}
                        </h4>
                        {currentPointerSelectionCount === 1 ? (
                          <p className="text-sm text-green-900 font-medium">
                            This activity will automatically receive 100% weightage.
                          </p>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-sm font-semibold text-gray-900">
                              Total Weightage: <span className={`text-lg font-bold ${isWeightageValid() ? 'text-green-800' : 'text-red-800'}`}>
                                {getTotalWeightage().toFixed(1)}/100
                              </span>
                            </p>
                            <p className="text-sm text-gray-800 font-medium">
                              Assign weightage to each activity below. The total must equal exactly 100%.
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">
                        {getPointerLabel(selectedPointer as number)} - Suitable Activities
                      </h2>
                      <span className="text-sm text-gray-500">
                        {suggestions.length} activit{suggestions.length !== 1 ? 'ies' : 'y'}
                        {currentPointerSelectionCount > 0 && ` • ${currentPointerSelectionCount} selected`}
                        {[2, 3, 4].includes(selectedPointer as number) && currentPointerSelectionCount > 1 && (
                          <span className={`ml-2 font-semibold ${isWeightageValid() ? 'text-green-600' : 'text-red-600'}`}>
                            • Total: {getTotalWeightage().toFixed(1)}/100
                          </span>
                        )}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {suggestions.map((suggestion) => (
                        <div
                          key={suggestion._id}
                          className={`border rounded-lg p-4 transition-all ${selectedActivities.has(suggestion._id)
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:shadow-md'
                            }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              id={`activity-${suggestion._id}`}
                              checked={selectedActivities.has(suggestion._id)}
                              onChange={() => handleToggleActivity(suggestion._id)}
                              className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <div className="flex-1">
                              <div className="flex items-start justify-between gap-4 mb-2">
                                <label
                                  htmlFor={`activity-${suggestion._id}`}
                                  className="cursor-pointer flex-1"
                                >
                                  <h3 className="text-lg font-semibold text-gray-900">
                                    {suggestion.title}
                                  </h3>
                                </label>
                                {suggestion.documentUrl && (
                                  <button
                                    onClick={() => setViewingDocumentForActivity(
                                      viewingDocumentForActivity === suggestion._id ? null : suggestion._id
                                    )}
                                    className={`flex-shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-100 transition text-sm font-medium border ${
                                      viewingDocumentForActivity === suggestion._id
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                    }`}
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      {viewingDocumentForActivity === suggestion._id ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                      ) : (
                                        <>
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </>
                                      )}
                                    </svg>
                                    {viewingDocumentForActivity === suggestion._id ? 'Hide Doc' : 'View Doc'}
                                  </button>
                                )}
                              </div>
                              <p className="text-gray-700 mb-3 whitespace-pre-wrap">
                                {suggestion.description}
                              </p>
                              {suggestion.tags && suggestion.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {suggestion.tags.map((tag, tagIndex) => (
                                    <span
                                      key={tagIndex}
                                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                              
                              {/* Weightage input for Pointers 2, 3, 4 - Multiple Activities */}
                              {[2, 3, 4].includes(selectedPointer as number) && selectedActivities.has(suggestion._id) && currentPointerSelectionCount > 1 && (
                                <div className="mt-3 p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-2 border-orange-400 rounded-lg shadow-sm">
                                  <div className="flex items-center gap-3">
                                    <label className="text-sm font-bold text-orange-900">Weightage:</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="0.1"
                                      value={activityWeightages[suggestion._id] || 0}
                                      onChange={(e) => handleWeightageChange(suggestion._id, e.target.value)}
                                      className="w-28 px-4 py-2.5 border-2 border-orange-500 rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-orange-600 focus:border-orange-600 text-base font-bold text-orange-900 bg-white"
                                    />
                                    <span className="text-base font-bold text-orange-900">%</span>
                                  </div>
                                  <p className="text-xs text-orange-800 mt-2 font-medium">
                                    Assign weightage for this activity (total must equal 100%)
                                  </p>
                                </div>
                              )}
                              
                              {/* Weightage for Pointers 2, 3, 4 - Single Activity */}
                              {[2, 3, 4].includes(selectedPointer as number) && selectedActivities.has(suggestion._id) && currentPointerSelectionCount === 1 && (
                                <div className="mt-3">
                                  <span className="text-sm font-semibold text-green-700 bg-green-100 px-3 py-1.5 rounded-md border border-green-300">
                                    ✓ Weightage: 100% (Auto-assigned)
                                  </span>
                                </div>
                              )}

                              {/* Deadline Picker - shown when activity is selected */}
                              {selectedActivities.has(suggestion._id) && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <span className="text-sm font-bold text-blue-900">⏰ Deadline:</span>
                                    <input
                                      type="datetime-local"
                                      value={activityDeadlines[suggestion._id] || ''}
                                      onChange={(e) => setActivityDeadlines(prev => ({ ...prev, [suggestion._id]: e.target.value }))}
                                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Inline Document Viewer */}
                              {viewingDocumentForActivity === suggestion._id && suggestion.documentUrl && (
                                <div className="mt-4 border-2 border-indigo-200 rounded-lg overflow-hidden bg-gray-50">
                                  <div className="bg-indigo-600 text-white px-4 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                      </svg>
                                      <span className="font-semibold text-sm">{suggestion.documentName || 'Activity Document'}</span>
                                    </div>
                                    <span className="text-xs bg-white/20 px-2 py-1 rounded">View-only</span>
                                  </div>
                                  <div 
                                    className="bg-white"
                                    style={{ userSelect: 'none' }}
                                    onContextMenu={(e) => e.preventDefault()}
                                  >
                                    <InlineDocViewer 
                                      url={suggestion.documentUrl} 
                                      onClose={() => setViewingDocumentForActivity(null)} 
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Select Button */}
                    {currentPointerSelectionCount > 0 && (
                      <div>
                        {/* Weightage Validation Warning */}
                        {[2, 3, 4].includes(selectedPointer as number) && currentPointerSelectionCount > 1 && !isWeightageValid() && (
                          <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
                            <div className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-red-900 mb-1">Invalid Weightage Total</h4>
                                <p className="text-sm text-red-800">
                                  Total weightage must equal <strong>100%</strong>. Current total: <strong className="text-red-900">{getTotalWeightage().toFixed(1)}%</strong>
                                </p>
                                <p className="text-xs text-red-700 mt-2">
                                  Please adjust the weightages above so they add up to exactly 100%.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Deadline Validation Warning */}
                        {!areDeadlinesValid() && (
                          <div className="mb-4 p-4 bg-red-50 border-2 border-red-400 rounded-lg">
                            <div className="flex items-start gap-3">
                              <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                              <div className="flex-1">
                                <h4 className="text-sm font-bold text-red-900 mb-1">Missing Deadlines</h4>
                                <p className="text-sm text-red-800">
                                  All selected activities must have a deadline set before you can proceed.
                                </p>
                                <p className="text-xs text-red-700 mt-2">
                                  Please set a deadline for each selected activity above.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        <button
                          onClick={handleSelectActivities}
                          disabled={selectingActivities || ([2, 3, 4].includes(selectedPointer as number) && currentPointerSelectionCount > 1 && !isWeightageValid()) || !areDeadlinesValid()}
                          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {selectingActivities ? 'Selecting...' : `Select ${currentPointerSelectionCount} Activity(ies)`}
                        </button>
                      </div>
                    )}
                  </div>
                ) : careerRole ? (
                  <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    No suggestions found. Try a different career role or ensure database has activities for this pointer.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* Evaluate Proofs Tab */}
        {activeTab === 'evaluate' && (
          <div className="space-y-6">
            <div className="mb-8 pb-6 border-b border-gray-100">
              <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase flex items-center gap-3">
                <span className={`w-3 h-10 rounded-full ${selectedPointer === 2 ? 'bg-blue-500' : selectedPointer === 3 ? 'bg-indigo-500' : 'bg-purple-500'}`}></span>
                {getPointerLabel(selectedPointer as number)} - EVALUATION
              </h2>
            </div>

            <div className="flex justify-end">
              <button
                onClick={fetchStudentActivities}
                disabled={loadingActivities}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingActivities ? 'Refreshing...' : 'Refresh Activities'}
              </button>
            </div>

            {loadingActivities ? (
              <div className="text-center py-8">
                <div className="text-gray-500">Loading activities...</div>
              </div>
            ) : studentActivities.filter(a => a.pointerNo === selectedPointer).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No activities assigned for {getPointerLabel(selectedPointer as number)} yet.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {studentActivities
                  .filter(activity => activity.pointerNo === selectedPointer)
                  .map((activity) => {
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
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{activity.title}</h3>
                          {[2, 3, 4].includes(activity.pointerNo) && (
                            <div className="flex items-center gap-2">
                              <div className="w-32 h-2.5 bg-gray-200 rounded-full overflow-hidden">
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
                          {[2, 3, 4].includes(activity.pointerNo) && activity.weightage !== undefined && (
                            <span className="ml-3 font-semibold text-blue-600">
                              • Weightage: {activity.weightage}%
                            </span>
                          )}
                        </p>
                        <p className="text-gray-700 whitespace-pre-wrap mb-4">
                          {activity.description}
                        </p>
                      </div>

                      {/* Deadline Section */}
                      {!activity.proofUploaded && activity.deadline && (() => {
                        const cd = getCountdown(activity.deadline);
                        return (
                          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-bold text-blue-900">⏰ Activity Deadline</p>
                            </div>
                            {cd.expired ? (
                              <div className="flex items-center gap-2 px-3 py-2 bg-red-100 border border-red-300 rounded-lg">
                                <span className="text-red-700 font-bold text-sm">⚠ Deadline Expired</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide mr-2">Time Left:</span>
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
                            {/* Update deadline */}
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-blue-200">
                              <input
                                type="datetime-local"
                                value={deadlineInputs[activity.selectionId] || new Date(activity.deadline).toISOString().slice(0, 16)}
                                onChange={(e) => setDeadlineInputs(prev => ({ ...prev, [activity.selectionId]: e.target.value }))}
                                className="flex-1 px-3 py-1.5 border border-blue-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                              <button
                                onClick={() => handleSetDeadline(activity.selectionId)}
                                disabled={savingDeadline === activity.selectionId || !deadlineInputs[activity.selectionId]}
                                className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                {savingDeadline === activity.selectionId ? 'Saving...' : 'Update Deadline'}
                              </button>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Ivy Expert Documents Section */}
                      <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-md">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-sm font-medium text-purple-900">Activity guides for Student</p>
                        </div>
                        {activity.ivyExpertDocuments && activity.ivyExpertDocuments.length > 0 ? (
                          <div className="space-y-3">
                            {activity.ivyExpertDocuments.map((doc, docIdx) => (
                              <div key={docIdx} className="bg-white rounded-lg border border-purple-200 overflow-hidden">
                                {/* Document Header */}
                                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-white border-b border-purple-100">
                                  <span className="text-sm text-gray-800 font-semibold">📎 Guide {docIdx + 1}</span>
                                  <button
                                    onClick={() => setViewingIvyExpertDocUrl(viewingIvyExpertDocUrl === doc.url ? null : doc.url)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-md ${viewingIvyExpertDocUrl === doc.url ? 'bg-purple-600 text-white' : 'bg-purple-100 text-purple-700 hover:bg-purple-200'}`}
                                  >
                                    {viewingIvyExpertDocUrl === doc.url ? 'Hide' : 'View'}
                                  </button>
                                </div>

                                {/* Tasks List with Status Dropdown */}
                                <div className="p-3">
                                  <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">Tasks</p>
                                  <div className="space-y-1.5">
                                    {[...doc.tasks].sort((a, b) => {
                                      // Sort: not-started and in-progress first, completed last
                                      if (a.status === 'completed' && b.status !== 'completed') return 1;
                                      if (a.status !== 'completed' && b.status === 'completed') return -1;
                                      return 0;
                                    }).map((task, taskIdx) => {
                                      // Find original index for API call
                                      const originalIndex = doc.tasks.findIndex(t => t.title === task.title && t.page === task.page);
                                      
                                      return (
                                        <div
                                          key={taskIdx}
                                          className="flex items-start gap-2 p-2 rounded bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer relative"
                                          onClick={() => handleTaskClick(activity.title, task, activity.selectionId)}
                                        >
                                          {task.status === 'completed' && (
                                            <div className="flex-shrink-0 mt-0.5">
                                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                              </svg>
                                            </div>
                                          )}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-700'}`}>
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
                                              <p className="text-xs text-gray-500">Page {task.page}</p>
                                            )}
                                          </div>
                                          <select
                                            value={task.status}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={async (e) => {
                                              e.stopPropagation();
                                              const newStatus = e.target.value as 'not-started' | 'in-progress' | 'completed';
                                              try {
                                                const response = await axios.post(`${IVY_API_URL}/pointer/activity/ivy-expert/task/status`, {
                                                  selectionId: activity.selectionId,
                                                  ivyExpertId,
                                                  documentUrl: doc.url,
                                                  taskIndex: originalIndex,
                                                  status: newStatus
                                                });
                                                
                                                if (response.data.success) {
                                                  // Update local state
                                                  setStudentActivities(prev => prev.map(act => {
                                                    if (act.selectionId === activity.selectionId) {
                                                      const updatedDocs = act.ivyExpertDocuments?.map((d, idx) => {
                                                        if (idx === docIdx) {
                                                          const updatedTasks = d.tasks.map((t, tIdx) => 
                                                            tIdx === originalIndex ? { ...t, status: newStatus } : t
                                                          );
                                                          return { ...d, tasks: updatedTasks };
                                                        }
                                                        return d;
                                                      });
                                                      return { ...act, ivyExpertDocuments: updatedDocs };
                                                    }
                                                    return act;
                                                  }));
                                                  setMessage({ type: 'success', text: 'Task status updated' });
                                                  setTimeout(() => setMessage(null), 2000);
                                                }
                                              } catch (error: any) {
                                                setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update task' });
                                              }
                                            }}
                                            className={`text-xs font-medium px-3 py-1.5 rounded-md border-2 cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                                              task.status === 'completed' 
                                                ? 'bg-green-100 text-green-800 border-green-300' 
                                                : task.status === 'in-progress'
                                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                                : 'bg-gray-100 text-gray-600 border-gray-300'
                                            }`}
                                          >
                                            <option value="not-started">Not Started</option>
                                            <option value="in-progress">In Progress</option>
                                            <option value="completed">Completed</option>
                                          </select>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  <div className="mt-3 pt-2 border-t border-gray-200">
                                    <p className="text-xs text-gray-600">
                                      <span className="font-medium text-purple-700">
                                        {doc.tasks.filter(t => t.status === 'completed').length} of {doc.tasks.length}
                                      </span> tasks completed
                                    </p>
                                  </div>
                                </div>

                                {/* Document Viewer */}
                                {viewingIvyExpertDocUrl === doc.url && (
                                  <div className="border-t border-purple-100">
                                    <InlineDocViewer url={doc.url} onClose={() => setViewingIvyExpertDocUrl(null)} />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-purple-700">No activity guides uploaded yet. Upload Word guides for students to view.</p>
                        )}
                      </div>

                      {activity.proofUploaded ? (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                          <p className="text-sm font-medium text-blue-900 mb-2">Proof Submitted</p>
                          <p className="text-xs text-blue-700 mb-3">
                            Submitted: {new Date(activity.submission!.submittedAt).toLocaleString()}
                          </p>
                          <div className="space-y-4">
                            {activity.submission!.files.map((fileUrl, index) => (
                              <div key={index} className="flex flex-col gap-2">
                                <button
                                  onClick={() => setViewingFileUrl(viewingFileUrl === fileUrl ? null : fileUrl)}
                                  className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all w-fit ${viewingFileUrl === fileUrl ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                                >
                                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                  </svg>
                                  {viewingFileUrl === fileUrl ? 'Hide Proof' : `View Proof ${index + 1}`}
                                </button>
                                {viewingFileUrl === fileUrl && (
                                  <InlineDocViewer url={fileUrl} onClose={() => setViewingFileUrl(null)} />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
                          <p className="text-sm text-yellow-800">Waiting for student to upload proof...</p>
                        </div>
                      )}

                      {activity.evaluated ? (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
                          <p className="text-sm font-medium text-green-900 mb-1">
                            Score: {activity.evaluation!.score}/10
                          </p>
                          {activity.evaluation!.feedback && (
                            <p className="text-sm text-green-800 whitespace-pre-wrap">
                              {activity.evaluation!.feedback}
                            </p>
                          )}
                          <p className="text-xs text-green-700 mt-2">
                            Evaluated: {new Date(activity.evaluation!.evaluatedAt).toLocaleString()}
                          </p>
                        </div>
                      ) : activity.proofUploaded ? (
                        <ActivityEvaluationForm
                          submissionId={activity.submission!._id}
                          onEvaluate={handleEvaluate}
                        />
                      ) : null}
                    </div>
                  );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
      </div>
    

      {/* Conversation Window */}
      {selectedTask && (
        <div className="w-[65%] border-l border-gray-200 flex-shrink-0 overflow-hidden">
          <ConversationWindow
            activityTitle={selectedTask.activityTitle}
            task={selectedTask.task}
            activityId={selectedTask.activityId}
            studentIvyServiceId={studentIvyServiceId!}
            onClose={handleCloseConversation}
            ivyExpertId={ivyExpertId}
            markTaskAsRead={markTaskAsRead}
            refreshNotifications={refreshNotifications}
            refreshTaskCounts={refreshCounts}
          />
        </div>
      )}
    </div>
  );
}

function ActivityEvaluationForm({
  submissionId,
  onEvaluate,
}: {
  submissionId: string;
  onEvaluate: (submissionId: string, score: string, feedback: string) => void;
}) {
  const [score, setScore] = useState<string>('');
  const [feedback, setFeedback] = useState<string>('');

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
      <h4 className="text-sm font-medium text-gray-900 mb-3">Evaluate Activity</h4>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Score (0-10)</label>
          <input
            type="number"
            min="0"
            max="10"
            step="0.1"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (Optional)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
          />
        </div>
        <button
          onClick={() => onEvaluate(submissionId, score, feedback)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Submit Evaluation
        </button>
      </div>
    </div>
  );
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ActivitiesContent />
    </Suspense>
  );
}
