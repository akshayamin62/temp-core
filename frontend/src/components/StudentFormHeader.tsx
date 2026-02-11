'use client';

interface StudentFormHeaderProps {
  studentName: string;
  serviceName: string;
  editMode: 'admin' | 'OPS';
}

export default function StudentFormHeader({
  studentName,
  serviceName,
  editMode,
}: StudentFormHeaderProps) {
  const badgeStyles = {
    admin: 'bg-blue-50 text-blue-700',
    OPS: 'bg-green-50 text-green-700',
  };

  const badgeText = {
    admin: 'Admin Edit Mode',
    OPS: 'OPS Edit Mode',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            {studentName}
          </h1>
          <p className="text-gray-600">
            Service: <span className="font-medium text-gray-900">{serviceName}</span>
          </p>
        </div>
        <div className={`px-4 py-2 ${badgeStyles[editMode]} rounded-lg font-medium`}>
          {badgeText[editMode]}
        </div>
      </div>
    </div>
  );
}


