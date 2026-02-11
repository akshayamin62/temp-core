'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { sectionAPI, questionAPI } from '@/lib/formApi';
import { FormSection, Question, SectionQuestion } from '@/types/form';
import AdminLayout from '@/components/AdminLayout';

export default function SectionsPage() {
  const [sections, setSections] = useState<FormSection[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSection, setEditingSection] = useState<FormSection | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    isRepeatable: false,
    minRepeats: 0,
    maxRepeats: undefined as number | undefined,
    questions: [] as SectionQuestion[],
    isGlobal: false,
  });

  // Filters
  const [globalFilter, setGlobalFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchQuestions();
    fetchSections();
  }, [globalFilter, activeFilter, searchTerm]);

  const fetchQuestions = async () => {
    try {
      const response = await questionAPI.getAll({ isActive: 'true' });
      setQuestions(response.data.data.questions);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
    }
  };

  const fetchSections = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (globalFilter) params.isGlobal = globalFilter;
      if (activeFilter) params.isActive = activeFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await sectionAPI.getAll(params);
      setSections(response.data.data.sections);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch sections');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (formData.questions.length === 0) {
      toast.error('At least one question is required');
      return;
    }

    try {
      if (editingSection) {
        await sectionAPI.update(editingSection._id, formData);
        toast.success('Section updated successfully');
      } else {
        await sectionAPI.create(formData);
        toast.success('Section created successfully');
      }
      closeModal();
      fetchSections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save section');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await sectionAPI.toggleStatus(id);
      toast.success('Section status updated');
      fetchSections();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const openModal = (section?: FormSection) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        title: section.title,
        description: section.description || '',
        isRepeatable: section.isRepeatable,
        minRepeats: section.minRepeats,
        maxRepeats: section.maxRepeats,
        questions: section.questions.map(q => ({
          question: typeof q.question === 'string' ? q.question : q.question._id,
          isIncluded: q.isIncluded,
          isRequired: q.isRequired,
          isEditable: q.isEditable,
          order: q.order,
        })),
        isGlobal: section.isGlobal,
      });
    } else {
      setEditingSection(null);
      setFormData({
        title: '',
        description: '',
        isRepeatable: false,
        minRepeats: 0,
        maxRepeats: undefined,
        questions: [],
        isGlobal: false,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingSection(null);
  };

  const addQuestion = (questionId: string) => {
    if (formData.questions.some(q => q.question === questionId)) {
      toast.error('Question already added');
      return;
    }

    setFormData({
      ...formData,
      questions: [
        ...formData.questions,
        {
          question: questionId,
          isIncluded: true,
          isRequired: true,
          isEditable: false,
          order: formData.questions.length,
        },
      ],
    });
  };

  const removeQuestion = (index: number) => {
    setFormData({
      ...formData,
      questions: formData.questions.filter((_, i) => i !== index),
    });
  };

  const updateQuestionConfig = (index: number, field: keyof SectionQuestion, value: any) => {
    const updated = [...formData.questions];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, questions: updated });
  };

  const moveQuestion = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= formData.questions.length) return;

    const updated = [...formData.questions];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated[index].order = index;
    updated[newIndex].order = newIndex;
    setFormData({ ...formData, questions: updated });
  };

  const getQuestionLabel = (questionId: string) => {
    const question = questions.find(q => q._id === questionId);
    return question?.label || 'Unknown Question';
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Section Builder</h1>
          <p className="text-gray-600">Create reusable form sections with questions</p>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Search sections..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            />
            <select
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            >
              <option value="">All Sections</option>
              <option value="true">Global Only</option>
              <option value="false">Local Only</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all duration-200 font-medium shadow-lg"
            >
              + Create Section
            </button>
          </div>
        </div>

        {/* Sections Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading sections...</p>
          </div>
        ) : sections.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No sections found</p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
            >
              Create your first section
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sections.map((section) => (
              <div
                key={section._id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{section.title}</h3>
                    <p className="text-gray-600 text-sm line-clamp-2">{section.description}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      section.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {section.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    {section.isGlobal && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium">
                        Global
                      </span>
                    )}
                    {section.isRepeatable && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                        Repeatable ({section.minRepeats}-{section.maxRepeats || '∞'})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    {section.questions.length} question{section.questions.length !== 1 ? 's' : ''}
                  </p>
                  {section.usedInServices && section.usedInServices.length > 0 && (
                    <p className="text-sm text-gray-600">
                      Used in {section.usedInServices.length} service{section.usedInServices.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(section)}
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleToggleStatus(section._id)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                      section.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {section.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingSection ? 'Edit Section' : 'Create Section'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Section Title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    placeholder="e.g., Personal Information"
                    required
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                    rows={2}
                    placeholder="Brief description of this section"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isRepeatable}
                      onChange={(e) => setFormData({ ...formData, isRepeatable: e.target.checked })}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Repeatable Section</span>
                  </label>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isGlobal}
                      onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                      className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                    />
                    <span className="text-sm font-medium text-gray-700">Global (Reusable)</span>
                  </label>
                </div>

                {formData.isRepeatable && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Min Repeats
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.minRepeats}
                        onChange={(e) => setFormData({ ...formData, minRepeats: parseInt(e.target.value) || 0 })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Repeats (optional)
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={formData.maxRepeats || ''}
                        onChange={(e) => setFormData({ ...formData, maxRepeats: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                        placeholder="Unlimited"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Question Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Questions *
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addQuestion(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select a question to add...</option>
                  {questions.map((q) => (
                    <option key={q._id} value={q._id}>{q.label}</option>
                  ))}
                </select>
              </div>

              {/* Selected Questions */}
              {formData.questions.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-gray-900">Selected Questions ({formData.questions.length})</h3>
                  {formData.questions.map((q, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{getQuestionLabel(q.question as string)}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => moveQuestion(index, 'up')}
                            disabled={index === 0}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-30"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveQuestion(index, 'down')}
                            disabled={index === formData.questions.length - 1}
                            className="text-gray-600 hover:text-gray-900 disabled:opacity-30"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={() => removeQuestion(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isIncluded}
                            onChange={(e) => updateQuestionConfig(index, 'isIncluded', e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm text-gray-700">Included</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isRequired}
                            onChange={(e) => updateQuestionConfig(index, 'isRequired', e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm text-gray-700">Required</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={q.isEditable}
                            onChange={(e) => updateQuestionConfig(index, 'isEditable', e.target.checked)}
                            className="w-4 h-4 text-purple-600 rounded"
                          />
                          <span className="text-sm text-gray-700">Editable</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 font-medium shadow-lg"
                >
                  {editingSection ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

