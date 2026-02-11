'use client';

import { FormStructure } from '@/types';

interface FormPartsNavigationProps {
  formStructure: FormStructure[];
  currentPartIndex: number;
  onPartChange: (index: number) => void;
}

export default function FormPartsNavigation({
  formStructure,
  currentPartIndex,
  onPartChange,
}: FormPartsNavigationProps) {
  if (formStructure.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 overflow-hidden">
      <div className="flex border-b border-gray-200">
        {formStructure.map((formStruct, index) => (
          <button
            key={formStruct.part._id}
            onClick={() => onPartChange(index)}
            className={`flex-1 px-6 py-4 font-medium transition-colors border-b-2 ${
              currentPartIndex === index
                ? 'border-blue-600 text-blue-600 bg-blue-50'
                : 'border-transparent text-gray-700 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            {formStruct.part.title}
          </button>
        ))}
      </div>
    </div>
  );
}


