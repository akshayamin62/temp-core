'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { enrollmentAPI, answerAPI, serviceAPI } from '@/lib/formApi';
import { Enrollment, EnrollmentStatus, QuestionType } from '@/types/form';
import { v4 as uuidv4 } from 'uuid';

export default function FormPage() {
  const router = useRouter();
  const params = useParams();
  const enrollmentId = params.enrollmentId as string;

  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [formStructure, setFormStructure] = useState<any>(null);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentInstanceId, setCurrentInstanceId] = useState<string>('');
  const [sectionInstances, setSectionInstances] = useState<{ [key: string]: string[] }>({}); // Track instances per section
  const [sectionAnswers, setSectionAnswers] = useState<any>({}); // Answers for current section instance
  const [savedAnswers, setSavedAnswers] = useState<any>({}); // All saved answers from backend
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (enrollmentId) {
      fetchFormData();
    }
  }, [enrollmentId]);

  const fetchFormData = async () => {
    try {
      setLoading(true);

      // Fetch enrollment
      const enrollmentRes = await enrollmentAPI.getById(enrollmentId);
      const enrollmentData = enrollmentRes.data.data.enrollment;
      setEnrollment(enrollmentData);

      const service = typeof enrollmentData.service === 'object' ? enrollmentData.service : null;
      if (!service) {
        toast.error('Service not found');
        return;
      }

      // Fetch service structure
      const serviceRes = await serviceAPI.getById(service._id);
      setFormStructure(serviceRes.data.data);

      // Fetch existing answers (includes auto-fill from other services)
      const answersRes = await answerAPI.getServiceAnswers(service._id);
      const answersData = answersRes.data.data;

      // Transform answers and track instances
      const transformedAnswers: any = {};
      const instances: { [key: string]: string[] } = {};
      
      answersData.sections.forEach((sectionData: any) => {
        const sectionId = sectionData.section._id;
        
        // Track all instances for this section
        if (!instances[sectionId]) {
          instances[sectionId] = [];
        }
        
        sectionData.instances.forEach((instance: any) => {
          const key = `${sectionId}_${instance.sectionInstanceId}`;
          transformedAnswers[key] = instance.answers;
          instances[sectionId].push(instance.sectionInstanceId);
        });
      });

      setSavedAnswers(transformedAnswers);
      setSectionInstances(instances);
      
      // Initialize first section
      if (serviceRes.data.data.sections.length > 0) {
        const firstSection = serviceRes.data.data.sections[0].section;
        const firstInstanceId = instances[firstSection._id]?.[0] || `default-${firstSection._id}`;
        setCurrentInstanceId(firstInstanceId);
        loadSectionInstanceAnswers(firstSection._id, firstInstanceId, transformedAnswers);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to load form');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSection = () => {
    if (!formStructure?.sections || currentSectionIndex >= formStructure.sections.length) {
      return null;
    }
    return formStructure.sections[currentSectionIndex];
  };

  const loadSectionInstanceAnswers = (sectionId: string, instanceId: string, answersData: any = savedAnswers) => {
    const key = `${sectionId}_${instanceId}`;
    const saved = answersData[key] || {};
    const loadedAnswers: any = {};
    
    Object.keys(saved).forEach(questionId => {
      loadedAnswers[questionId] = saved[questionId].value;
    });
    
    setSectionAnswers(loadedAnswers);
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setSectionAnswers((prev: any) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const validateCurrentSection = () => {
    const currentSection = getCurrentSection();
    if (!currentSection) return { valid: true, missingFields: [] };

    const section = currentSection.section;
    const missingFields: string[] = [];

    section.questions?.forEach((questionConfig: any) => {
      if (questionConfig.isRequired && questionConfig.isIncluded) {
        const question = questionConfig.question;
        const questionId = typeof question === 'object' ? question._id : question;
        const questionLabel = typeof question === 'object' ? question.label : 'Question';
        
        const answerValue = sectionAnswers[questionId];
        
        if (answerValue === undefined || answerValue === '' || 
            (Array.isArray(answerValue) && answerValue.length === 0)) {
          missingFields.push(questionLabel);
        }
      }
    });

    return { valid: missingFields.length === 0, missingFields };
  };

  const handleSaveDraft = async () => {
    const currentSection = getCurrentSection();
    if (!currentSection) return;

    const section = currentSection.section;

    // Validate required fields
    const validation = validateCurrentSection();
    if (!validation.valid) {
      toast.error(
        <div>
          <p className="font-bold mb-2">Please fill all required fields:</p>
          <ul className="list-disc list-inside">
            {validation.missingFields.map((field, idx) => (
              <li key={idx} className="text-sm">{field}</li>
            ))}
          </ul>
        </div>,
        { duration: 4000 }
      );
      return;
    }

    try {
      setSaving(true);

      // Prepare answers array
      const answersArray = Object.keys(sectionAnswers)
        .filter(questionId => sectionAnswers[questionId] !== undefined && sectionAnswers[questionId] !== '')
        .map(questionId => ({
          questionId,
          value: sectionAnswers[questionId],
        }));

      if (answersArray.length === 0) {
        toast('No answers to save in this section', { icon: 'ℹ️' });
        return;
      }

      // Save entire section at once
      await answerAPI.saveSection({
        enrollmentId,
        sectionId: section._id,
        sectionInstanceId: currentInstanceId,
        answers: answersArray,
      });

      // Update saved answers
      const key = `${section._id}_${currentInstanceId}`;
      const updatedSavedAnswers = { ...savedAnswers };
      if (!updatedSavedAnswers[key]) {
        updatedSavedAnswers[key] = {};
      }
      answersArray.forEach(({ questionId, value }) => {
        updatedSavedAnswers[key][questionId] = { value };
      });
      setSavedAnswers(updatedSavedAnswers);

      toast.success('Section saved successfully!');

      // Update enrollment status
      if (enrollment?.status === EnrollmentStatus.NOT_STARTED) {
        setEnrollment({ ...enrollment, status: EnrollmentStatus.IN_PROGRESS });
      }
    } catch (error: any) {
      toast.error('Failed to save section');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddInstance = () => {
    const currentSection = getCurrentSection();
    if (!currentSection) return;

    const section = currentSection.section;
    const newInstanceId = uuidv4();
    
    // Add new instance to tracking
    setSectionInstances(prev => ({
      ...prev,
      [section._id]: [...(prev[section._id] || []), newInstanceId]
    }));
    
    // Switch to new instance
    setCurrentInstanceId(newInstanceId);
    setSectionAnswers({});
    
    toast.success('New instance added');
  };

  const handleRemoveInstance = (instanceId: string) => {
    const currentSection = getCurrentSection();
    if (!currentSection) return;

    const section = currentSection.section;
    const instances = sectionInstances[section._id] || [];
    
    if (instances.length <= (section.minRepeats || 1)) {
      toast.error(`Minimum ${section.minRepeats || 1} instance(s) required`);
      return;
    }

    // Remove instance
    const updatedInstances = instances.filter(id => id !== instanceId);
    setSectionInstances(prev => ({
      ...prev,
      [section._id]: updatedInstances
    }));

    // If removing current instance, switch to first instance
    if (instanceId === currentInstanceId && updatedInstances.length > 0) {
      const firstInstanceId = updatedInstances[0];
      setCurrentInstanceId(firstInstanceId);
      loadSectionInstanceAnswers(section._id, firstInstanceId);
    }

    // Remove from saved answers
    const key = `${section._id}_${instanceId}`;
    const updatedSavedAnswers = { ...savedAnswers };
    delete updatedSavedAnswers[key];
    setSavedAnswers(updatedSavedAnswers);

    toast.success('Instance removed');
  };

  const handleNext = () => {
    if (formStructure?.sections && currentSectionIndex < formStructure.sections.length - 1) {
      const nextIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIndex);
      
      // Load next section's first instance
      const nextSection = formStructure.sections[nextIndex].section;
      const instances = sectionInstances[nextSection._id] || [];
      const nextInstanceId = instances[0] || `default-${nextSection._id}`;
      
      // Initialize instances if not exists
      if (instances.length === 0) {
        setSectionInstances(prev => ({
          ...prev,
          [nextSection._id]: [nextInstanceId]
        }));
      }
      
      setCurrentInstanceId(nextInstanceId);
      loadSectionInstanceAnswers(nextSection._id, nextInstanceId);
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      const prevIndex = currentSectionIndex - 1;
      setCurrentSectionIndex(prevIndex);
      
      // Load previous section's first instance
      const prevSection = formStructure.sections[prevIndex].section;
      const instances = sectionInstances[prevSection._id] || [];
      const prevInstanceId = instances[0] || `default-${prevSection._id}`;
      
      setCurrentInstanceId(prevInstanceId);
      loadSectionInstanceAnswers(prevSection._id, prevInstanceId);
    }
  };

  const handleInstanceSwitch = (instanceId: string) => {
    const currentSection = getCurrentSection();
    if (!currentSection) return;

    setCurrentInstanceId(instanceId);
    loadSectionInstanceAnswers(currentSection.section._id, instanceId);
  };

  const validateRequiredFields = () => {
    const missingFields: string[] = [];
    
    if (!formStructure?.sections) return missingFields;
    
    formStructure.sections.forEach((serviceSection: any) => {
      const section = serviceSection.section;
      const instances = sectionInstances[section._id] || [`default-${section._id}`];
      
      instances.forEach((instanceId) => {
        const key = `${section._id}_${instanceId}`;
        
        section.questions?.forEach((questionConfig: any) => {
          if (questionConfig.isRequired && questionConfig.isIncluded) {
            const question = questionConfig.question;
            const questionId = typeof question === 'object' ? question._id : question;
            const questionLabel = typeof question === 'object' ? question.label : 'Question';
            
            const answerValue = savedAnswers[key]?.[questionId]?.value;
            
            if (answerValue === undefined || answerValue === '' || 
                (Array.isArray(answerValue) && answerValue.length === 0)) {
              missingFields.push(`${section.title}: ${questionLabel}`);
            }
          }
        });
      });
    });
    
    return missingFields;
  };

  const handleSubmit = async () => {
    if (!enrollment) return;

    // Validate all required fields
    const missingFields = validateRequiredFields();
    if (missingFields.length > 0) {
      toast.error(
        <div>
          <p className="font-bold mb-2">Please complete all required fields:</p>
          <ul className="list-disc list-inside">
            {missingFields.slice(0, 5).map((field, idx) => (
              <li key={idx} className="text-sm">{field}</li>
            ))}
            {missingFields.length > 5 && (
              <li className="text-sm">...and {missingFields.length - 5} more</li>
            )}
          </ul>
        </div>,
        { duration: 5000 }
      );
      return;
    }

    const confirmSubmit = window.confirm(
      'Are you sure you want to submit this form? You may need approval to make changes after submission.'
    );

    if (!confirmSubmit) return;

    try {
      setSubmitting(true);
      await answerAPI.submit(enrollmentId);
      toast.success('Form submitted successfully!');
      router.push('/my-enrollments');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit form');
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: any, questionConfig: any) => {
    const questionId = typeof question === 'object' ? question._id : question;
    const actualQuestion = typeof question === 'object' ? question : null;
    
    if (!actualQuestion) return null;

    const currentValue = sectionAnswers[questionId] !== undefined ? sectionAnswers[questionId] : '';
    const section = getCurrentSection()?.section;
    const key = `${section._id}_${currentInstanceId}`;
    
    // Check if saved and non-editable
    const hasBeenSaved = savedAnswers[key]?.[questionId]?.value !== undefined;
    const isDisabled = (!questionConfig.isEditable && hasBeenSaved) || 
                       enrollment?.status === EnrollmentStatus.SUBMITTED;

    switch (actualQuestion.type) {
      case QuestionType.TEXT:
        return (
          <input
            type="text"
            value={currentValue}
            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
            disabled={isDisabled}
            required={questionConfig.isRequired}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter your answer..."
          />
        );

      case QuestionType.NUMBER:
        return (
          <input
            type="number"
            value={currentValue}
            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
            disabled={isDisabled}
            required={questionConfig.isRequired}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
            placeholder="Enter a number..."
          />
        );

      case QuestionType.DATE:
        return (
          <input
            type="date"
            value={currentValue}
            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
            disabled={isDisabled}
            required={questionConfig.isRequired}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
        );

      case QuestionType.SELECT:
        return (
          <select
            value={currentValue}
            onChange={(e) => handleAnswerChange(questionId, e.target.value)}
            disabled={isDisabled}
            required={questionConfig.isRequired}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Select an option...</option>
            {actualQuestion.options?.map((option: string, idx: number) => (
              <option key={idx} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case QuestionType.MULTISELECT:
        const selectedValues = Array.isArray(currentValue) ? currentValue : [];
        return (
          <div className="space-y-2">
            {actualQuestion.options?.map((option: string, idx: number) => (
              <label key={idx} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option)}
                  onChange={(e) => {
                    const newValues = e.target.checked
                      ? [...selectedValues, option]
                      : selectedValues.filter((v: string) => v !== option);
                    handleAnswerChange(questionId, newValues);
                  }}
                  disabled={isDisabled}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-900">{option}</span>
              </label>
            ))}
          </div>
        );

      default:
        return <p className="text-gray-500">Unsupported question type</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  const currentSection = getCurrentSection();
  const isSubmitted = enrollment?.status === EnrollmentStatus.SUBMITTED;
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === (formStructure?.sections?.length || 0) - 1;
  
  const section = currentSection?.section;
  const instances = section ? (sectionInstances[section._id] || [`default-${section._id}`]) : [];
  const canAddInstance = section?.isRepeatable && !section.maxRepeats || (instances.length < (section?.maxRepeats || Infinity));
  const canRemoveInstance = section?.isRepeatable && instances.length > (section?.minRepeats || 1);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/my-enrollments')}
            className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-2"
          >
            ← Back to Enrollments
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            {typeof enrollment?.service === 'object' ? enrollment.service.name : 'Service Form'}
          </h1>
        </div>

        {/* Section Tabs - Horizontal Navigation */}
        <div className="bg-white rounded-2xl shadow-lg p-4 mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {formStructure?.sections?.map((serviceSection: any, index: number) => {
              const sec = serviceSection.section;
              const isActive = index === currentSectionIndex;
              return (
                <button
                  key={sec._id}
                  onClick={() => {
                    const prevIndex = currentSectionIndex;
                    setCurrentSectionIndex(index);
                    const insts = sectionInstances[sec._id] || [`default-${sec._id}`];
                    const firstInstanceId = insts[0];
                    setCurrentInstanceId(firstInstanceId);
                    loadSectionInstanceAnswers(sec._id, firstInstanceId);
                  }}
                  className={`px-6 py-3 rounded-lg font-semibold transition-all whitespace-nowrap ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}. {sec.title}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Section Form */}
        {currentSection && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  {section.title}
                </h2>
                {section.description && (
                  <p className="text-gray-600">{section.description}</p>
                )}
              </div>
              
              {/* Repeatable Section Controls - Only show in edit mode */}
              {section.isRepeatable && !isSubmitted && (
                <div className="flex items-center gap-2">
                  {instances.map((instId, idx) => (
                    <button
                      key={instId}
                      onClick={() => handleInstanceSwitch(instId)}
                      className={`px-3 py-2 rounded-lg font-medium transition-all ${
                        instId === currentInstanceId
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      #{idx + 1}
                    </button>
                  ))}
                  {canAddInstance && (
                    <button
                      onClick={handleAddInstance}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                    >
                      + Add
                    </button>
                  )}
                  {canRemoveInstance && (
                    <button
                      onClick={() => handleRemoveInstance(currentInstanceId)}
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                    >
                      Remove
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Render based on mode: Edit (single instance) or View (all instances) */}
            {!isSubmitted ? (
              // EDIT MODE - Show only current instance
              <div className="space-y-6">
                {section.questions
                  ?.filter((q: any) => q.isIncluded)
                  .map((questionConfig: any, qIndex: number) => {
                    const question = questionConfig.question;
                    if (!question || !question._id) return null;

                    return (
                      <div key={`${question._id}-${qIndex}`}>
                        <label className="block text-sm font-medium text-gray-900 mb-2">
                          {question.label}
                          {questionConfig.isRequired && (
                            <span className="text-red-600 ml-1">*</span>
                          )}
                        </label>
                        {renderQuestion(question, questionConfig)}
                      </div>
                    );
                  })}
              </div>
            ) : (
              // VIEW MODE - Show all instances
              <div className="space-y-8">
                {instances.map((instId, instanceIdx) => {
                  // Load answers for this instance
                  const key = `${section._id}_${instId}`;
                  const instanceAnswers = savedAnswers[key] || {};

                  return (
                    <div key={instId} className="border-b border-gray-200 pb-6 last:border-b-0">
                      {section.isRepeatable && instances.length > 1 && (
                        <h3 className="text-lg font-semibold text-gray-800 mb-4 bg-blue-50 px-4 py-2 rounded-lg">
                          {section.title} #{instanceIdx + 1}
                        </h3>
                      )}
                      <div className="space-y-6">
                        {section.questions
                          ?.filter((q: any) => q.isIncluded)
                          .map((questionConfig: any, qIndex: number) => {
                            const question = questionConfig.question;
                            if (!question || !question._id) return null;

                            const answerValue = instanceAnswers[question._id]?.value;
                            
                            return (
                              <div key={`${question._id}-${instId}-${qIndex}`} className="bg-gray-50 p-4 rounded-lg">
                                <label className="block text-sm font-medium text-gray-900 mb-2">
                                  {question.label}
                                  {questionConfig.isRequired && (
                                    <span className="text-red-600 ml-1">*</span>
                                  )}
                                </label>
                                <div className="text-gray-800 font-medium">
                                  {answerValue !== undefined && answerValue !== '' ? (
                                    Array.isArray(answerValue) ? (
                                      <ul className="list-disc list-inside">
                                        {answerValue.map((val: string, idx: number) => (
                                          <li key={idx}>{val}</li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <span>{String(answerValue)}</span>
                                    )
                                  ) : (
                                    <span className="text-gray-400 italic">Not answered</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Section Navigation Buttons - Only in edit mode */}
            {!isSubmitted && (
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handlePrevious}
                  disabled={isFirstSection}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    isFirstSection
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-600 text-white hover:bg-gray-700'
                  }`}
                >
                  ← Previous
                </button>

                <button
                  onClick={handleSaveDraft}
                  disabled={saving}
                  className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                    saving
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-orange-500 to-yellow-500 text-white hover:from-orange-600 hover:to-yellow-600 shadow-lg'
                  }`}
                >
                  {saving ? 'Saving...' : '💾 Save Draft'}
                </button>

                {!isLastSection ? (
                  <button
                    onClick={handleNext}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                      submitting
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-gradient-to-r from-green-600 to-blue-600 text-white hover:from-green-700 hover:to-blue-700 shadow-lg'
                    }`}
                  >
                    {submitting ? 'Submitting...' : '📤 Submit Form'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Progress Indicator */}
        <div className="text-center text-sm text-gray-600">
          Section {currentSectionIndex + 1} of {formStructure?.sections?.length || 0}
          {section?.isRepeatable && ` • Instance ${instances.findIndex(id => id === currentInstanceId) + 1} of ${instances.length}`}
        </div>
      </div>
    </div>
  );
}
