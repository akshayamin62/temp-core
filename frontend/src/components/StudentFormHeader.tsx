'use client';

import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface StudentFormHeaderProps {
  studentName: string;
  serviceName: string;
  editMode: 'admin' | 'OPS' | 'SUPER_ADMIN' | 'EDUPLAN_COACH' | 'COUNSELOR' | 'VIEW';
  studentId?: string;
}

export default function StudentFormHeader({
  studentName,
  serviceName,
  editMode,
  studentId,
}: StudentFormHeaderProps) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [open, setOpen] = useState(false);
  const [sendVia, setSendVia] = useState<'email' | 'sms' | 'both'>('email');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  const getApiBase = () => {
    if (editMode === 'admin' || editMode === 'COUNSELOR' || editMode === 'VIEW') {
      return `${API_URL}/admin/students`;
    }
    return `${API_URL}/super-admin/students`;
  };

  const handleSendMessage = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    if (!studentId) {
      toast.error('Student information not available');
      return;
    }

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${getApiBase()}/${studentId}/send-message`,
        { message: message.trim(), serviceName, sendVia },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Message sent successfully');
      setMessage('');
      setOpen(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCancel = () => {
    setMessage('');
    setSendVia('email');
    setOpen(false);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Top row: student info + trigger button */}
      <div className="flex items-center justify-between gap-6">
        <div className="shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{studentName}</h1>
          <p className="text-gray-600">
            Service: <span className="font-medium text-gray-900">{serviceName}</span>
          </p>
        </div>

        {studentId && !open && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Send Message
          </button>
        )}
      </div>

      {/* Compose panel — slides in below */}
      {studentId && open && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-gray-700">
              Message to <span className="text-gray-900">{studentName}</span>
            </p>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['email', 'sms', 'both'] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setSendVia(option)}
                  disabled={sending}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    sendVia === option
                      ? 'bg-white text-blue-700 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {option === 'email' ? 'Email' : option === 'sms' ? 'SMS' : 'Both'}
                </button>
              ))}
            </div>
          </div>
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
              if (e.key === 'Escape') {
                handleCancel();
              }
            }}
            placeholder="Type your message here… (Enter to send, Shift+Enter for new line, Esc to cancel)"
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={sending}
          />
          <div className="flex items-center justify-end gap-2 mt-3">
            <button
              onClick={handleCancel}
              disabled={sending}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Send Message
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


