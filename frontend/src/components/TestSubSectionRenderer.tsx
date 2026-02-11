'use client';

import React, { useState } from 'react';
import { FormSubSection } from '@/types';
import FormFieldRenderer from './FormFieldRenderer';

interface TestSubSectionRendererProps {
  subSection: FormSubSection;
  values: any[];
  onChange: (index: number, key: string, value: any) => void;
  errors?: { [key: string]: string }[];
  isAdminEdit?: boolean;
}

export default function TestSubSectionRenderer({
  subSection,
  values,
  onChange,
  errors = [],
  isAdminEdit = false,
}: TestSubSectionRendererProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the first field value to determine if test is taken
  const instanceValues = values[0] || {};
  const firstField = subSection.fields.sort((a, b) => a.order - b.order)[0];
  const hasTakenValue = instanceValues?.[firstField?.key];

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:border-blue-400 transition-all">
      {/* Test Header - Always Visible */}
      <div
        className="flex items-center justify-between px-6 py-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-all border-b border-gray-200"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          {/* Test Icon */}
          <div className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all ${
            isExpanded 
              ? 'bg-blue-600' 
              : 'bg-gray-400'
          }`}>
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>

          {/* Test Title and Status */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900">
              {subSection.title}
            </h4>
            {hasTakenValue && (
              <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-md text-xs font-medium ${
                hasTakenValue === 'yes' 
                  ? 'bg-green-100 text-green-700' 
                  : hasTakenValue === 'planning'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {hasTakenValue === 'yes' ? '✓ Taken' : hasTakenValue === 'planning' ? '⏳ Planning' : '✗ Not Taken'}
              </span>
            )}
          </div>
        </div>

        {/* Expand/Collapse Icon */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-700 font-medium">
            {isExpanded ? 'Hide' : 'Show'}
          </span>
          <svg
            className={`w-5 h-5 text-gray-700 transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>

      {/* Test Fields - Shown when expanded */}
      {isExpanded && (
        <div className="p-6 bg-white">
          {(() => {
            const sortedFields = subSection.fields.sort((a, b) => a.order - b.order);
            const renderedFields: React.ReactElement[] = [];
            let i = 0;

            while (i < sortedFields.length) {
              const field = sortedFields[i];
              
              // First field (Have you taken X?) - Full width
              if (i === 0) {
                renderedFields.push(
                  <div key={field._id} className="mb-5">
                    <FormFieldRenderer
                      field={field}
                      value={instanceValues?.[field.key]}
                      onChange={(key, value) => onChange(0, key, value)}
                      error={errors[0]?.[field.key]}
                      isAdminEdit={isAdminEdit}
                    />
                  </div>
                );
                i++;
              }
              // Test Date - Full width
              else if (field.key.includes('TestDate')) {
                renderedFields.push(
                  <div key={field._id} className="mb-5">
                    <FormFieldRenderer
                      field={field}
                      value={instanceValues?.[field.key]}
                      onChange={(key, value) => onChange(0, key, value)}
                      error={errors[0]?.[field.key]}
                      isAdminEdit={isAdminEdit}
                    />
                  </div>
                );
                i++;
              }
              // Score fields - Group in grid (2 or 3 columns based on remaining fields)
              else {
                const remainingFields = sortedFields.length - i;
                const fieldsInRow: any[] = [];
                
                // Determine how many fields to put in this row
                if (remainingFields >= 3) {
                  // 3 columns for 3+ fields
                  fieldsInRow.push(sortedFields[i]);
                  if (i + 1 < sortedFields.length) fieldsInRow.push(sortedFields[i + 1]);
                  if (i + 2 < sortedFields.length) fieldsInRow.push(sortedFields[i + 2]);
                } else if (remainingFields === 2) {
                  // 2 columns for 2 fields
                  fieldsInRow.push(sortedFields[i]);
                  if (i + 1 < sortedFields.length) fieldsInRow.push(sortedFields[i + 1]);
                } else {
                  // 1 column for 1 field
                  fieldsInRow.push(sortedFields[i]);
                }

                renderedFields.push(
                  <div 
                    key={`row-${i}`} 
                    className={`grid gap-4 mb-5 ${
                      fieldsInRow.length === 3 
                        ? 'grid-cols-1 md:grid-cols-3' 
                        : fieldsInRow.length === 2 
                        ? 'grid-cols-1 md:grid-cols-2' 
                        : 'grid-cols-1'
                    }`}
                  >
                    {fieldsInRow.map((f) => (
                <FormFieldRenderer
                  key={f._id}
                  field={f}
                  value={instanceValues?.[f.key]}
                  onChange={(key, value) => onChange(0, key, value)}
                  error={errors[0]?.[f.key]}
                  allValues={instanceValues}
                />
                    ))}
                  </div>
                );
                i += fieldsInRow.length;
              }
            }

            return renderedFields;
          })()}
        </div>
      )}
    </div>
  );
}


