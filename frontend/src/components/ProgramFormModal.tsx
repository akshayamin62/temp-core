'use client';

import { useState } from 'react';

interface ProgramFormData {
  university: string;
  universityRanking: {
    webometricsWorld: string;
    webometricsNational: string;
    usNews: string;
    qs: string;
  };
  programName: string;
  programUrl: string;
  campus: string;
  country: string;
  studyLevel: string;
  duration: string;
  ieltsScore: string;
  applicationFee: string;
  yearlyTuitionFees: string;
}

interface ProgramFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProgramFormData) => Promise<void>;
  submitting: boolean;
}

export default function ProgramFormModal({
  isOpen,
  onClose,
  onSubmit,
  submitting,
}: ProgramFormModalProps) {
  const [formData, setFormData] = useState<ProgramFormData>({
    university: '',
    universityRanking: {
      webometricsWorld: '',
      webometricsNational: '',
      usNews: '',
      qs: '',
    },
    programName: '',
    programUrl: '',
    campus: '',
    country: '',
    studyLevel: '',
    duration: '',
    ieltsScore: '',
    applicationFee: '',
    yearlyTuitionFees: '',
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('ranking.')) {
      const rankingKey = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        universityRanking: {
          ...prev.universityRanking,
          [rankingKey]: value,
        },
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      university: '',
      universityRanking: {
        webometricsWorld: '',
        webometricsNational: '',
        usNews: '',
        qs: '',
      },
      programName: '',
      programUrl: '',
      campus: '',
      country: '',
      studyLevel: '',
      duration: '',
      ieltsScore: '',
      applicationFee: '',
      yearlyTuitionFees: '',
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Add New Program</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">University *</label>
              <input
                type="text"
                name="university"
                value={formData.university}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Name *</label>
              <input
                type="text"
                name="programName"
                value={formData.programName}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Link *</label>
              <input
                type="url"
                name="programUrl"
                value={formData.programUrl}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Campus</label>
              <input
                type="text"
                name="campus"
                value={formData.campus}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Country *</label>
              <input
                type="text"
                name="country"
                value={formData.country}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Study Level *</label>
              <select
                name="studyLevel"
                value={formData.studyLevel}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              >
                <option value="">Select Level</option>
                <option value="Certificate">Certificate</option>
                <option value="Diploma">Diploma</option>
                <option value="Undergraduate">Undergraduate</option>
                <option value="Postgraduate/Master">Postgraduate/Master</option>
                <option value="PhD">PhD</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Duration (months)</label>
              <input
                type="number"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">IELTS Score</label>
              <input
                type="number"
                step="0.5"
                name="ieltsScore"
                value={formData.ieltsScore}
                onChange={handleInputChange}
                min="0"
                max="9"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Application Fee</label>
              <input
                type="number"
                step="0.01"
                name="applicationFee"
                value={formData.applicationFee}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Yearly Tuition Fees</label>
              <input
                type="number"
                step="0.01"
                name="yearlyTuitionFees"
                value={formData.yearlyTuitionFees}
                onChange={handleInputChange}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">University Rankings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webometrics World</label>
                <input
                  type="number"
                  name="ranking.webometricsWorld"
                  value={formData.universityRanking.webometricsWorld}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Webometrics National</label>
                <input
                  type="number"
                  name="ranking.webometricsNational"
                  value={formData.universityRanking.webometricsNational}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">US News</label>
                <input
                  type="number"
                  name="ranking.usNews"
                  value={formData.universityRanking.usNews}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">QS Ranking</label>
                <input
                  type="number"
                  name="ranking.qs"
                  value={formData.universityRanking.qs}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Program'}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

