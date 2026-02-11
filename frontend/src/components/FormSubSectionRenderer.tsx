'use client';

import { FormSubSection } from '@/types';
import FormFieldRenderer from './FormFieldRenderer';
import { useState } from 'react';

interface FormSubSectionRendererProps {
  subSection: FormSubSection;
  values: any[];
  onChange: (index: number, key: string, value: any) => void;
  onAdd?: () => void;
  onRemove?: (index: number) => void;
  errors?: { [key: string]: string }[];
  isAdminEdit?: boolean;
  readOnly?: boolean;
}

export default function FormSubSectionRenderer({
  subSection,
  values,
  onChange,
  onAdd,
  onRemove,
  errors = [],
  isAdminEdit = false,
  readOnly = false,
}: FormSubSectionRendererProps) {
  const [expandedIndices, setExpandedIndices] = useState<Set<number>>(
    new Set([0])
  );

  // When a new instance is added, expand it automatically
  const handleAddInstance = () => {
    if (onAdd) {
      const currentLength = values.length;
      onAdd();
      // Add the new index to expanded set (it will be the last index)
      setExpandedIndices(prev => {
        const newSet = new Set(prev);
        newSet.add(currentLength); // Add the new instance index
        return newSet;
      });
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedIndices);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedIndices(newExpanded);
  };

  return (
    <div className="space-y-4">
      {/* SubSection Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            {subSection.title}
          </h4>
          {subSection.description && (
            <p className="text-sm text-gray-800 mt-1">
              {subSection.description}
            </p>
          )}
        </div>
        {subSection.isRepeatable && !readOnly && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              handleAddInstance();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Add {subSection.title}
          </button>
        )}
      </div>

      {/* Render each instance */}
      {values.map((instanceValues, index) => (
        <div
          key={`${subSection._id}-${index}`}
          className="bg-white rounded-lg border border-gray-200 overflow-hidden"
        >
          {/* Instance Header (for repeatable sections) */}
          {subSection.isRepeatable && (
            <div
              className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleExpanded(index)}
            >
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-lg text-sm font-semibold">
                  {index + 1}
                </span>
                <span className="font-semibold text-gray-900 text-base">
                  {subSection.title} #{index + 1}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {values.length > 1 && !readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      onRemove?.(index);
                    }}
                    className="p-2 text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                    title="Delete this entry"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${
                    expandedIndices.has(index) ? 'rotate-180' : ''
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
          )}

          {/* Fields */}
          {(!subSection.isRepeatable || expandedIndices.has(index)) && (
            <div className="p-5 bg-white">
              {(() => {
                const sortedFields = subSection.fields.sort((a, b) => a.order - b.order);
                const renderedFields: React.ReactElement[] = [];
                let i = 0;

                while (i < sortedFields.length) {
                  const field = sortedFields[i];
                  
                  // CHECKBOX fields - Full width for "Same as Mailing Address"
                  if (field.type === 'CHECKBOX' && field.key === 'sameAsMailingAddress') {
                    renderedFields.push(
                      <div key={field._id} className="mb-5">
                        <FormFieldRenderer
                          field={field}
                          value={instanceValues?.[field.key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[field.key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                      </div>
                    );
                    i++;
                  }
                  // TEXTAREA and FILE fields - Always full width
                  else if (field.type === 'TEXTAREA' || field.type === 'FILE') {
                    renderedFields.push(
                      <div key={field._id} className="mb-4">
                        <FormFieldRenderer
                          field={field}
                          value={instanceValues?.[field.key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[field.key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                      </div>
                    );
                    i++;
                  }
                  // Check if this is part of a name group (firstName, middleName, lastName)
                  else if (field.key === 'firstName' && i + 2 < sortedFields.length &&
                      sortedFields[i + 1].key === 'middleName' &&
                      sortedFields[i + 2].key === 'lastName') {
                    renderedFields.push(
                      <div key={`name-row-${i}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <FormFieldRenderer
                          field={sortedFields[i]}
                          value={instanceValues?.[sortedFields[i].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                        <FormFieldRenderer
                          field={sortedFields[i + 1]}
                          value={instanceValues?.[sortedFields[i + 1].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i + 1].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                        <FormFieldRenderer
                          field={sortedFields[i + 2]}
                          value={instanceValues?.[sortedFields[i + 2].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i + 2].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                      </div>
                    );
                    i += 3;
                  }
                  // Check for address line 1 and 2
                  else if ((field.key === 'mailingAddress1' || field.key === 'permanentAddress1') && 
                           i + 1 < sortedFields.length &&
                           (sortedFields[i + 1].key === 'mailingAddress2' || sortedFields[i + 1].key === 'permanentAddress2')) {
                    renderedFields.push(
                      <div key={`address-row-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormFieldRenderer
                          field={sortedFields[i]}
                          value={instanceValues?.[sortedFields[i].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                        <FormFieldRenderer
                          field={sortedFields[i + 1]}
                          value={instanceValues?.[sortedFields[i + 1].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i + 1].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                      </div>
                    );
                    i += 2;
                  }
                  // Check for city, state, postal code (3 in a row)
                  else if ((field.key === 'mailingCity' || field.key === 'permanentCity') && 
                           i + 2 < sortedFields.length) {
                    const nextKey = sortedFields[i + 1].key;
                    const nextNextKey = sortedFields[i + 2].key;
                    if ((nextKey === 'mailingState' || nextKey === 'permanentState') &&
                        (nextNextKey === 'mailingPostalCode' || nextNextKey === 'permanentPostalCode')) {
                      renderedFields.push(
                        <div key={`city-row-${i}`} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <FormFieldRenderer
                            field={sortedFields[i]}
                            value={instanceValues?.[sortedFields[i].key]}
                            onChange={(key, value) => onChange(index, key, value)}
                            error={errors[index]?.[sortedFields[i].key]}
                          />
                          <FormFieldRenderer
                            field={sortedFields[i + 1]}
                            value={instanceValues?.[sortedFields[i + 1].key]}
                            onChange={(key, value) => onChange(index, key, value)}
                            error={errors[index]?.[sortedFields[i + 1].key]}
                          />
                          <FormFieldRenderer
                            field={sortedFields[i + 2]}
                            value={instanceValues?.[sortedFields[i + 2].key]}
                            onChange={(key, value) => onChange(index, key, value)}
                            error={errors[index]?.[sortedFields[i + 2].key]}
                          />
                        </div>
                      );
                      i += 3;
                    } else {
                      // Try to group remaining fields in pairs
                      if (i + 1 < sortedFields.length && 
                          sortedFields[i].type !== 'TEXTAREA' && 
                          sortedFields[i + 1].type !== 'TEXTAREA') {
                        renderedFields.push(
                          <div key={`row-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <FormFieldRenderer
                              field={sortedFields[i]}
                              value={instanceValues?.[sortedFields[i].key]}
                              onChange={(key, value) => onChange(index, key, value)}
                              error={errors[index]?.[sortedFields[i].key]}
                            />
                            <FormFieldRenderer
                              field={sortedFields[i + 1]}
                              value={instanceValues?.[sortedFields[i + 1].key]}
                              onChange={(key, value) => onChange(index, key, value)}
                              error={errors[index]?.[sortedFields[i + 1].key]}
                            />
                          </div>
                        );
                        i += 2;
                      } else {
                        renderedFields.push(
                          <div key={field._id} className="mb-4">
                            <FormFieldRenderer
                              field={field}
                              value={instanceValues?.[field.key]}
                              onChange={(key, value) => onChange(index, key, value)}
                              error={errors[index]?.[field.key]}
                            />
                          </div>
                        );
                        i++;
                      }
                    }
                  }
                  // Check for gender and marital status (2 in a row)
                  else if (field.key === 'gender' && i + 1 < sortedFields.length &&
                           sortedFields[i + 1].key === 'maritalStatus') {
                    renderedFields.push(
                      <div key={`gender-row-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormFieldRenderer
                          field={sortedFields[i]}
                          value={instanceValues?.[sortedFields[i].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                        <FormFieldRenderer
                          field={sortedFields[i + 1]}
                          value={instanceValues?.[sortedFields[i + 1].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i + 1].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                      </div>
                    );
                    i += 2;
                  }
                  // Check for phone and email (2 in a row)
                  else if (field.key === 'phone' && i + 1 < sortedFields.length &&
                           sortedFields[i + 1].key === 'email') {
                    renderedFields.push(
                      <div key={`contact-row-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <FormFieldRenderer
                          field={sortedFields[i]}
                          value={instanceValues?.[sortedFields[i].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                        <FormFieldRenderer
                          field={sortedFields[i + 1]}
                          value={instanceValues?.[sortedFields[i + 1].key]}
                          onChange={(key, value) => onChange(index, key, value)}
                          error={errors[index]?.[sortedFields[i + 1].key]}
                          allValues={instanceValues}
                          isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                        />
                      </div>
                    );
                    i += 2;
                  }
                  // Default: Try to group in pairs for better layout
                  else {
                    if (i + 1 < sortedFields.length && 
                        sortedFields[i].type !== 'TEXTAREA' && 
                        sortedFields[i].type !== 'FILE' &&
                        sortedFields[i + 1].type !== 'TEXTAREA' &&
                        sortedFields[i + 1].type !== 'FILE') {
                      renderedFields.push(
                        <div key={`row-${i}`} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <FormFieldRenderer
                            field={sortedFields[i]}
                            value={instanceValues?.[sortedFields[i].key]}
                            onChange={(key, value) => onChange(index, key, value)}
                            error={errors[index]?.[sortedFields[i].key]}
                          />
                          <FormFieldRenderer
                            field={sortedFields[i + 1]}
                            value={instanceValues?.[sortedFields[i + 1].key]}
                            onChange={(key, value) => onChange(index, key, value)}
                            error={errors[index]?.[sortedFields[i + 1].key]}
                          />
                        </div>
                      );
                      i += 2;
                    } else {
                      renderedFields.push(
                        <div key={field._id} className="mb-4">
                          <FormFieldRenderer
                            field={field}
                            value={instanceValues?.[field.key]}
                            onChange={(key, value) => onChange(index, key, value)}
                            error={errors[index]?.[field.key]}
                            isAdminEdit={isAdminEdit}
                          readOnly={readOnly}
                          />
                        </div>
                      );
                      i++;
                    }
                  }
                }

                return renderedFields;
              })()}
            </div>
          )}
        </div>
      ))}

      {/* Add button at bottom for repeatable sections */}
      {subSection.isRepeatable && values.length > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            handleAddInstance();
            // onAdd?.();
          }}
          className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 bg-white hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add Another {subSection.title}
        </button>
      )}
    </div>
  );
}


