'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { serviceAPI, formAnswerAPI } from '@/lib/api';
import { FormStructure, StudentServiceRegistration, Service } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import FormSectionRenderer from '@/components/FormSectionRenderer';
import StudentLayout from '@/components/StudentLayout';
import ProgramSection from '@/components/ProgramSection';

function MyDetailsContent() {
  const router = useRouter();
  const params = useParams();
  const registrationId = params.registrationId as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [registration, setRegistration] = useState<StudentServiceRegistration | null>(null);
  const [formStructure, setFormStructure] = useState<FormStructure[]>([]);
  const [selectedPartIndex, setSelectedPartIndex] = useState(0);
  const [selectedSectionIndex, setSelectedSectionIndex] = useState(0);
  const [formValues, setFormValues] = useState<any>({});
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (!registrationId) {
      toast.error('No registration selected');
      router.push('/dashboard');
      return;
    }
    fetchData();
  }, [registrationId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch registration details
      const regResponse = await serviceAPI.getRegistrationDetails(registrationId!);
      const reg = regResponse.data.data.registration;
      setRegistration(reg);

      // Fetch form structure
      const serviceId = typeof reg.serviceId === 'object' ? reg.serviceId._id : reg.serviceId;
      const formResponse = await serviceAPI.getServiceForm(serviceId);
      setFormStructure(formResponse.data.data.formStructure);

      // Fetch existing answers from database (for auto-fill)
      const answersResponse = await formAnswerAPI.getFormAnswers(registrationId!);
      const answers = answersResponse.data.data.answers || [];
      const studentData = answersResponse.data.data.student || {};
      
      // Convert answers to form values structure
      const values: any = {};
      answers.forEach((answer: any) => {
        const partKey = answer.partKey;
        if (!values[partKey]) {
          values[partKey] = {};
        }
        // The answers object contains section-wise data
        values[partKey] = answer.answers;
      });
      
      // Initialize form structure and pre-fill phone and country defaults
      if (formStructure.length > 0) {
        formStructure.forEach((part) => {
          const partKey = part.part.key;
          if (!values[partKey]) values[partKey] = {};
          
          part.sections?.forEach((section) => {
            if (!values[partKey][section._id]) values[partKey][section._id] = {};
            
            section.subSections?.forEach((subSection) => {
              if (!values[partKey][section._id][subSection._id]) {
                values[partKey][section._id][subSection._id] = [{}];
              }
              
              const instances = values[partKey][section._id][subSection._id];
              if (Array.isArray(instances) && instances.length > 0) {
                const instance = instances[0];
                
                // Pre-fill phone number from student table
                const phoneField = subSection.fields?.find(f => f.key === 'phone' || f.key === 'phoneNumber' || f.key === 'mobileNumber');
                if (phoneField && studentData.mobileNumber) {
                  if (!instance[phoneField.key]) {
                    instance[phoneField.key] = studentData.mobileNumber;
                  }
                }
                
                // Set India as default for country fields (always set if not present)
                subSection.fields?.forEach((field) => {
                  if (field.key === 'mailingCountry' || field.key === 'permanentCountry') {
                    // Always set default if field is empty or undefined
                    if (!instance[field.key] || instance[field.key] === '') {
                      instance[field.key] = field.defaultValue || 'IN';
                    }
                  }
                });
              }
            });
          });
        });
      }
      
      setFormValues(values);

    } catch (error: any) {
      console.error('Failed to fetch data:', error);
      const msg = error.response?.data?.message || error.message || 'Failed to load form data';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (
    partKey: string,
    sectionId: string,
    subSectionId: string,
    index: number,
    key: string,
    value: any
  ) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) {
        newValues[partKey][sectionId][subSectionId] = [{}];
      }
      
      // Ensure the instance exists at the index
      if (!newValues[partKey][sectionId][subSectionId][index]) {
        newValues[partKey][sectionId][subSectionId][index] = {};
      }
      
      // Update the specific field
      newValues[partKey][sectionId][subSectionId][index][key] = value;
      
      // Handle cascading dropdowns - clear dependent fields
      if (key.includes('Country')) {
        // Clear state and city when country changes
        const stateKey = key.replace('Country', 'State');
        const cityKey = key.replace('Country', 'City');
        newValues[partKey][sectionId][subSectionId][index][stateKey] = '';
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      } else if (key.includes('State')) {
        // Clear city when state changes
        const cityKey = key.replace('State', 'City');
        newValues[partKey][sectionId][subSectionId][index][cityKey] = '';
      }
      
      // Handle "Same as Mailing Address" checkbox
      if (key === 'sameAsMailingAddress' && value === true) {
        // Find mailing address subsection
        const mailingSubSection = Object.keys(newValues[partKey][sectionId] || {}).find(
          subSecId => {
            const data = newValues[partKey][sectionId][subSecId]?.[0];
            return data && 'mailingAddress1' in data;
          }
        );
        
        if (mailingSubSection) {
          const mailingData = newValues[partKey][sectionId][mailingSubSection][0];
          // Copy all mailing address fields to permanent address
          newValues[partKey][sectionId][subSectionId][index] = {
            ...newValues[partKey][sectionId][subSectionId][index],
            sameAsMailingAddress: true,
            permanentAddress1: mailingData.mailingAddress1 || '',
            permanentAddress2: mailingData.mailingAddress2 || '',
            permanentCountry: mailingData.mailingCountry || '',
            permanentState: mailingData.mailingState || '',
            permanentCity: mailingData.mailingCity || '',
            permanentPostalCode: mailingData.mailingPostalCode || '',
          };
        }
      }
      
      // Clear permanent address if checkbox is unchecked
      if (key === 'sameAsMailingAddress' && value === false) {
        newValues[partKey][sectionId][subSectionId][index] = {
          ...newValues[partKey][sectionId][subSectionId][index],
          sameAsMailingAddress: false,
        };
      }
      
      return newValues;
    });
  };

  const handleAddInstance = (partKey: string, sectionId: string, subSectionId: string) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (!newValues[partKey]) newValues[partKey] = {};
      if (!newValues[partKey][sectionId]) newValues[partKey][sectionId] = {};
      if (!newValues[partKey][sectionId][subSectionId]) {
        newValues[partKey][sectionId][subSectionId] = [];
      }
      
      // Create new instance with default values for country fields
      const newInstance: any = {};
      
      // Find the subsection to get field defaults
      const currentPart = formStructure.find(p => p.part.key === partKey);
      const section = currentPart?.sections?.find(s => s._id === sectionId);
      const subSection = section?.subSections?.find(ss => ss._id === subSectionId);
      
      if (subSection) {
        subSection.fields?.forEach((field) => {
          // Set default for country fields
          if ((field.key === 'mailingCountry' || field.key === 'permanentCountry') && field.defaultValue) {
            newInstance[field.key] = field.defaultValue;
          }
        });
      }
      
      // Add the new instance before the last one (if there are existing instances)
      const instances = newValues[partKey][sectionId][subSectionId];
      if (instances.length > 0) {
        // Insert before the last element
        instances.splice(instances.length - 1, 0, newInstance);
      } else {
        // No existing instances, just add it
        instances.push(newInstance);
      }
      return newValues;
    });
  };

  const handleRemoveInstance = (
    partKey: string,
    sectionId: string,
    subSectionId: string,
    index: number
  ) => {
    setFormValues((prev: any) => {
      // Deep clone to avoid mutation issues
      const newValues = JSON.parse(JSON.stringify(prev));
      if (newValues[partKey]?.[sectionId]?.[subSectionId]) {
        // Remove only the specified index
        const instances = newValues[partKey][sectionId][subSectionId];
        newValues[partKey][sectionId][subSectionId] = instances.filter((_: any, i: number) => i !== index);
      }
      return newValues;
    });
  };

  const validateSection = (partKey: string, sectionId: string): boolean => {
    const currentPart = formStructure[selectedPartIndex];
    const section = currentPart.sections[selectedSectionIndex];
    const sectionValues = formValues[partKey]?.[sectionId] || {};
    
    const newErrors: any = {};
    let hasErrors = false;

    // Validate each subsection
    section.subSections.forEach((subSection) => {
      const subSectionValues = sectionValues[subSection._id] || [{}];
      
      subSectionValues.forEach((instanceValues: any, index: number) => {
        subSection.fields.forEach((field) => {
          if (field.required) {
            let value = instanceValues?.[field.key];
            
            // If value is empty and field has defaultValue, use defaultValue
            if ((!value || (typeof value === 'string' && value.trim() === '')) && field.defaultValue) {
              value = field.defaultValue;
              // Update the instance value with default to ensure it's saved
              if (instanceValues) {
                instanceValues[field.key] = field.defaultValue;
              }
              // Also update formValues state to persist the default
              setFormValues((prev: any) => {
                const newValues = JSON.parse(JSON.stringify(prev));
                if (newValues[partKey]?.[sectionId]?.[subSection._id]?.[index]) {
                  newValues[partKey][sectionId][subSection._id][index][field.key] = field.defaultValue;
                }
                return newValues;
              });
            }
            
            // Now validate
            if (!value || (typeof value === 'string' && value.trim() === '')) {
              if (!newErrors[subSection._id]) newErrors[subSection._id] = [];
              if (!newErrors[subSection._id][index]) newErrors[subSection._id][index] = {};
              newErrors[subSection._id][index][field.key] = `${field.label} is required`;
              hasErrors = true;
            }
          }
        });
      });
    });

    setErrors(newErrors);
    return !hasErrors;
  };

  const handleSaveSection = async () => {
    try {
      const currentPart = formStructure[selectedPartIndex];
      const section = currentPart.sections[selectedSectionIndex];
      const partKey = currentPart.part.key;
      const sectionId = section._id;

      // Validate before saving
      if (!validateSection(partKey, sectionId)) {
        toast.error('Please fill all required fields');
        return;
      }

      setSaving(true);
      
      // Get ONLY current section answers
      const sectionAnswers = formValues[partKey]?.[sectionId] || {};
      
      // Get existing part answers from database to merge with
      const existingAnswersResponse = await formAnswerAPI.getFormAnswers(registrationId!, partKey);
      const existingAnswers = existingAnswersResponse.data.data.answers;
      
      // Merge: keep all existing answers and update only current section
      let allPartAnswers = {};
      if (existingAnswers && existingAnswers.length > 0) {
        allPartAnswers = { ...existingAnswers[0].answers };
      }
      allPartAnswers = { ...allPartAnswers, [sectionId]: sectionAnswers };
      
      await formAnswerAPI.saveFormAnswers({
        registrationId: registrationId!,
        partKey,
        answers: allPartAnswers,
        completed: false,
      });

      toast.success('Saved successfully!');
      setErrors({});
      
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to save';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading form...</p>
        </div>
      </div>
    );
  }

  if (!registration || formStructure.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">No form data available</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentPart = formStructure[selectedPartIndex];
  const currentSection = currentPart.sections.sort((a, b) => a.order - b.order)[selectedSectionIndex];
  const service = typeof registration.serviceId === 'object' 
    ? registration.serviceId 
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="top-right" />

      {/* Student Layout with Vertical Sidebar */}
      <StudentLayout
        formStructure={formStructure}
        currentPartIndex={selectedPartIndex}
        currentSectionIndex={selectedSectionIndex}
        onPartChange={(index) => {
          setSelectedPartIndex(index);
          setSelectedSectionIndex(0);
        }}
        onSectionChange={setSelectedSectionIndex}
        serviceName={service?.name || 'Service'}
      >
        {/* Section Navigation (Horizontal Tabs) */}
        {currentPart && currentPart.sections && currentPart.sections.length > 0 && (
          <div className="bg-white border-b border-gray-200 sticky top-20 z-20 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="inline-flex bg-gray-100 rounded-lg p-1 border border-gray-200 overflow-x-auto">
                {[...currentPart.sections]
                  .sort((a, b) => a.order - b.order)
                  .map((section, index) => (
                    <button
                      key={section._id}
                      onClick={() => setSelectedSectionIndex(index)}
                      className={`px-4 py-2 rounded-md font-medium transition-all whitespace-nowrap text-sm ${
                        selectedSectionIndex === index
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      {section.title}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* Form Content - Single Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-8">
          <div className="space-y-5">
            {currentSection && (
              <div>
                {/* Check if this is Application section with program management */}
                {currentPart.part.key === 'APPLICATION' && 
                 (currentSection.title === 'Apply to Program' || currentSection.title === 'Applied Program') ? (
                  <ProgramSection
                    sectionType={currentSection.title === 'Apply to Program' ? 'available' : 'applied'}
                    studentId={registrationId!}
                    userRole="STUDENT"
                  />
                ) : currentPart.part.key === 'DOCUMENT' ? (
                  // Document sections - no save button, auto-save on upload
                  <FormSectionRenderer
                    section={currentSection}
                    values={formValues[currentPart.part.key]?.[currentSection._id] || {}}
                    onChange={(subSectionId, index, key, value) =>
                      handleFieldChange(currentPart.part.key, currentSection._id, subSectionId, index, key, value)
                    }
                    onAddInstance={(subSectionId) =>
                      handleAddInstance(currentPart.part.key, currentSection._id, subSectionId)
                    }
                    onRemoveInstance={(subSectionId, index) =>
                      handleRemoveInstance(currentPart.part.key, currentSection._id, subSectionId, index)
                    }
                    errors={errors}
                    registrationId={registrationId!}
                    studentId={registration?.studentId?.toString()}
                    userRole="STUDENT"
                  />
                ) : (
                  <>
                    <FormSectionRenderer
                      section={currentSection}
                      values={formValues[currentPart.part.key]?.[currentSection._id] || {}}
                      onChange={(subSectionId, index, key, value) =>
                        handleFieldChange(currentPart.part.key, currentSection._id, subSectionId, index, key, value)
                      }
                      onAddInstance={(subSectionId) =>
                        handleAddInstance(currentPart.part.key, currentSection._id, subSectionId)
                      }
                      onRemoveInstance={(subSectionId, index) =>
                        handleRemoveInstance(currentPart.part.key, currentSection._id, subSectionId, index)
                      }
                      errors={errors}
                    />
                    
                    {/* Save Button */}
                    <div className="flex justify-end gap-3 mt-5">
                      <button
                        onClick={handleSaveSection}
                        disabled={saving}
                        className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </StudentLayout>
    </div>
  );
}

export default function MyDetailsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    }>
      <MyDetailsContent />
    </Suspense>
  );
}
