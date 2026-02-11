'use client';

import { useRouter } from 'next/navigation';

interface FormSaveButtonsProps {
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

export default function FormSaveButtons({
  onSave,
  saving = false,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
}: FormSaveButtonsProps) {
  const router = useRouter();

  return (
    <div className="flex justify-end gap-4">
      <button
        onClick={() => router.back()}
        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
      >
        {cancelLabel}
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving...' : saveLabel}
      </button>
    </div>
  );
}


