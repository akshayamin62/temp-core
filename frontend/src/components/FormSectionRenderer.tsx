'use client';

import { SectionConfig } from '@/config/formConfig';
import FormSubSectionRenderer from './FormSubSectionRenderer';
import TestSubSectionRenderer from './TestSubSectionRenderer';
import DocumentUploadSection from './DocumentUploadSection';

interface FormSectionRendererProps {
  section: SectionConfig;
  values: any;
  onChange: (subSectionId: string, index: number, key: string, value: any) => void;
  onAddInstance: (subSectionId: string) => void;
  onRemoveInstance: (subSectionId: string, index: number) => void;
  errors?: { [subSectionId: string]: { [key: string]: string }[] };
  isAdminEdit?: boolean;
  registrationId?: string;
  studentId?: string;
  userRole?: 'STUDENT' | 'OPS' | 'SUPER_ADMIN' | 'ADMIN' | 'COUNSELOR' | 'EDUPLAN_COACH' | 'IVY_EXPERT' | 'PARENT';
  readOnly?: boolean;
  readOnlyKeys?: string[];
  noDelete?: boolean;
  readOnlyInstances?: number[];
}

export default function FormSectionRenderer({
  section,
  values,
  onChange,
  onAddInstance,
  onRemoveInstance,
  errors = {},
  isAdminEdit = false,
  registrationId,
  studentId,
  userRole,
  readOnly = false,
  readOnlyKeys,
  noDelete = false,
  readOnlyInstances = [],
}: FormSectionRendererProps) {
  // Check if this is a document section
  const isDocumentSection = section.title.toLowerCase().includes('document');
  
  // Check if this is a test section (Standardized Tests)
  const isTestSection = section.title.toLowerCase().includes('test');

  // Render document upload section for document sections
  if (isDocumentSection && registrationId && studentId && userRole) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative z-10">
        {/* Section Header */}
        <div className="bg-blue-600 px-6 py-4 border-b border-blue-700">
          <h3 className="text-xl font-semibold text-white">{section.title}</h3>
          {section.description && (
            <p className="text-blue-100 text-sm mt-1">{section.description}</p>
          )}
        </div>

        {/* Document Upload Component */}
        <div className="p-6">
          <DocumentUploadSection
            registrationId={registrationId}
            studentId={studentId}
            userRole={userRole}
            sectionTitle={section.title}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden relative z-10">
      {/* Section Header */}
      <div className="bg-blue-600 px-6 py-4 border-b border-blue-700">
        <h3 className="text-xl font-semibold text-white">{section.title}</h3>
        {section.description && (
          <p className="text-blue-100 text-sm mt-1">{section.description}</p>
        )}
      </div>

      {/* SubSections */}
      <div className="p-6 space-y-6 bg-white">
        
        {section.subSections
          .sort((a, b) => a.order - b.order)
          .map((subSection, idx) => {
            const subSectionValues = values[subSection.key] || [{}];
            
            // Use TestSubSectionRenderer for test sections
            if (isTestSection) {
              return (
                <TestSubSectionRenderer
                  key={subSection.key}
                  subSection={subSection}
                  values={subSectionValues}
                  onChange={(index, key, value) =>
                    onChange(subSection.key, index, key, value)
                  }
                  errors={errors[subSection.key]}
                  isAdminEdit={isAdminEdit}
                />
              );
            }
            
            // Add visual separator between Mailing and Permanent Address
            const isPermanentAddress = subSection.title.includes('Permanent Address');
            
            // Use regular FormSubSectionRenderer for other sections
            return (
              <div key={subSection.key}>
                {isPermanentAddress && idx > 0 && (
                  <div className="my-6 border-t-2 border-gray-200"></div>
                )}
                <FormSubSectionRenderer
                  subSection={subSection}
                  values={subSectionValues}
                  onChange={(index, key, value) =>
                    onChange(subSection.key, index, key, value)
                  }
                  onAdd={() => onAddInstance(subSection.key)}
                  onRemove={(index) => onRemoveInstance(subSection.key, index)}
                  errors={errors[subSection.key]}
                  isAdminEdit={isAdminEdit}
                  readOnly={readOnly}
                  readOnlyKeys={readOnlyKeys}
                  noDelete={noDelete}
                  readOnlyInstances={readOnlyInstances}
                />
              </div>
            );
          })}
      </div>
    </div>
  );
}


