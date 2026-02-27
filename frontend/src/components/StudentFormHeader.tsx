'use client';

import { useState } from 'react';
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

  const getApiBase = () => {
    // admin and counselor use admin routes; everyone else uses super-admin routes
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
        { message: message.trim(), serviceName },

        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Message sent successfully');
      setMessage('');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-shrink-0">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {studentName}
          </h1>
          <p className="text-gray-600">
            Service: <span className="font-medium text-gray-900">{serviceName}</span>
          </p>
        </div>

        {studentId && (
          <div className="flex items-start gap-2 flex-shrink-0">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="Type a message to student... (Enter to send, Shift+Enter for new line)"
              rows={3}
              className="w-72 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={sending}
            />
            <button
              onClick={handleSendMessage}
              disabled={sending || !message.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap self-end"
            >
              {sending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Send Message
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


