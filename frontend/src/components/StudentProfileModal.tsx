'use client';

import { useEffect, useState } from 'react';
import { formAnswerAPI } from '@/lib/api';
import { USER_ROLE } from '@/types';
import { SectionConfig } from '@/config/formConfig';
import FormSectionRenderer from './FormSectionRenderer';
import toast, { Toaster } from 'react-hot-toast';

interface StudentProfileModalProps {
  studentId: string;
  onClose: () => void;
  viewerRole?: string;
}

export default function StudentProfileModal({ studentId, onClose, viewerRole }: StudentProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formSections, setFormSections] = useState<SectionConfig[]>([]);
  const [formValues, setFormValues] = useState<any>({});
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [errors, setErrors] = useState<any>({});

  // Role-based permissions
  const isReadOnly = viewerRole === USER_ROLE.ADMIN || viewerRole === USER_ROLE.COUNSELOR || viewerRole === USER_ROLE.PARENT;
  const canEditParents = viewerRole === USER_ROLE.SUPER_ADMIN;
  const canEdit = !isReadOnly;

  useEffect(() => {
    fetchData();
  }, [studentId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await formAnswerAPI.getStudentProfileById(studentId);
      const { formStructure, answers, student } = res.data.data;
      setFormSections(formStructure || []);
      setStudentInfo(student);

      const values: any = {};
      formStructure?.forEach((section: SectionConfig) => {
        if (!values[section.key]) values[section.key] = {};
        const sectionAnswers = answers?.[section.key] || {};
        section.subSections?.forEach((sub: any) => {
          if (sectionAnswers[sub.key]) {
            values[section.key][sub.key] = sectionAnswers[sub.key];
          } else {
            values[section.key][sub.key] = [{}];
          }
        });
      });
      setFormValues(values);
    } catch (error) {
      console.error('Failed to fetch student profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (sectionId: string, subSectionId: string, index: number, key: string, value: any) => {
    setFormValues((prev: any) => {
      const updated = { ...prev };
      if (!updated[sectionId]) updated[sectionId] = {};
      if (!updated[sectionId][subSectionId]) updated[sectionId][subSectionId] = [{}];
      const instances = [...updated[sectionId][subSectionId]];
      instances[index] = { ...instances[index], [key]: value };
      updated[sectionId] = { ...updated[sectionId], [subSectionId]: instances };
      return updated;
    });
  };

  const handleAddInstance = (sectionId: string, subSectionId: string) => {
    setFormValues((prev: any) => {
      const updated = { ...prev };
      if (!updated[sectionId]) updated[sectionId] = {};
      if (!updated[sectionId][subSectionId]) updated[sectionId][subSectionId] = [];
      updated[sectionId] = {
        ...updated[sectionId],
        [subSectionId]: [...updated[sectionId][subSectionId], {}],
      };
      return updated;
    });
  };

  const handleRemoveInstance = (sectionId: string, subSectionId: string, index: number) => {
    setFormValues((prev: any) => {
      const updated = { ...prev };
      if (!updated[sectionId]?.[subSectionId]) return prev;
      const instances = [...updated[sectionId][subSectionId]];
      instances.splice(index, 1);
      updated[sectionId] = { ...updated[sectionId], [subSectionId]: instances };
      return updated;
    });
  };

  const validateSection = (sectionKey: string): boolean => {
    const section = formSections[selectedSectionIndex];
    if (!section) return true;
    const sectionValues = formValues[sectionKey] || {};

    const newErrors: any = {};
    let hasErrors = false;

    section.subSections?.forEach((subSection) => {
      const subSectionValues = sectionValues[subSection.key] || [{}];

      subSectionValues.forEach((instanceValues: any, index: number) => {
        subSection.fields.forEach((field) => {
          if (field.required) {
            let value = instanceValues?.[field.key];

            if ((!value || (typeof value === 'string' && value.trim() === '')) && field.defaultValue) {
              value = field.defaultValue;
              setFormValues((prev: any) => {
                const updated = { ...prev };
                if (updated[sectionKey]?.[subSection.key]?.[index]) {
                  const instances = [...updated[sectionKey][subSection.key]];
                  instances[index] = { ...instances[index], [field.key]: field.defaultValue };
                  updated[sectionKey] = { ...updated[sectionKey], [subSection.key]: instances };
                }
                return updated;
              });
            }

            if (!value || (typeof value === 'string' && value.trim() === '')) {
              if (!newErrors[subSection.key]) newErrors[subSection.key] = [];
              if (!newErrors[subSection.key][index]) newErrors[subSection.key][index] = {};
              newErrors[subSection.key][index][field.key] = `${field.label} is required`;
              hasErrors = true;
            }
          }
        });
      });
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSaveSection = async (sectionId: string) => {
    if (!validateSection(sectionId)) {
      toast.error('Please fill all required fields');
      return;
    }
    try {
      setSaving(true);
      const sectionValues = formValues[sectionId] || {};
      await formAnswerAPI.saveStudentProfileById(studentId, { [sectionId]: sectionValues });
      toast.success('Section saved successfully');
      setErrors({});
    } catch (error) {
      console.error('Failed to save section:', error);
      toast.error('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  const currentSection = formSections[selectedSectionIndex];
  const isParentalSection = currentSection?.title === 'Parental Details';
  const isPersonalSection = currentSection?.title === 'Personal Details';

  // ReadOnlyKeys: lock name fields for ALL editing roles
  const readOnlyKeys = isPersonalSection
    ? ['firstName', 'middleName', 'lastName']
    : undefined;

  // Parental readOnlyInstances: for non-super-admin editors, filled entries are read-only
  const parentalReadOnlyInstances: number[] = [];
  if (isParentalSection && canEdit && !canEditParents) {
    const sData = formValues[currentSection.key] || {};
    Object.values(sData).forEach((subData: any) => {
      if (Array.isArray(subData)) {
        subData.forEach((entry: any, idx: number) => {
          if (entry && Object.values(entry).some((v: any) => v && String(v).trim() !== '')) {
            parentalReadOnlyInstances.push(idx);
          }
        });
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <Toaster position="top-right" />
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Student Profile</h2>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="spinner mr-3"></div>
              <p className="text-gray-600">Loading profile data...</p>
            </div>
          ) : formSections.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No profile data available.</p>
          ) : (
            <>
              {/* Section Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                {formSections.map((section, idx) => (
                  <button
                    key={section.key}
                    onClick={() => setSelectedSectionIndex(idx)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      idx === selectedSectionIndex
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {section.title}
                  </button>
                ))}
              </div>

              {/* Form Section */}
              {currentSection && (
                <div>
                  <FormSectionRenderer
                    section={currentSection}
                    values={formValues[currentSection.key] || {}}
                    onChange={canEdit
                      ? (subSectionId, index, key, value) =>
                          handleFieldChange(currentSection.key, subSectionId, index, key, value)
                      : () => {}
                    }
                    onAddInstance={canEdit
                      ? (subSectionId) => handleAddInstance(currentSection.key, subSectionId)
                      : () => {}
                    }
                    onRemoveInstance={canEdit
                      ? (subSectionId, index) => handleRemoveInstance(currentSection.key, subSectionId, index)
                      : () => {}
                    }
                    errors={errors}
                    readOnly={isReadOnly}
                    readOnlyKeys={readOnlyKeys}
                    noDelete={isParentalSection}
                    readOnlyInstances={isParentalSection ? parentalReadOnlyInstances : []}
                  />
                  {canEdit && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => handleSaveSection(currentSection.key)}
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
