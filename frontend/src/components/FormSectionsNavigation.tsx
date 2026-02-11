'use client';

import { FormSection } from '@/types';

interface FormSectionsNavigationProps {
  sections: FormSection[];
  currentSectionIndex: number;
  onSectionChange: (index: number) => void;
}

export default function FormSectionsNavigation({
  sections,
  currentSectionIndex,
  onSectionChange,
}: FormSectionsNavigationProps) {
  if (!sections || sections.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-2">
      <div className="flex gap-2 overflow-x-auto">
        {sections.map((section, index) => (
          <button
            key={section._id}
            onClick={() => onSectionChange(index)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              currentSectionIndex === index
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {section.title}
          </button>
        ))}
      </div>
    </div>
  );
}


