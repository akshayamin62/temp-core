'use client';

import { getFullName } from '@/utils/nameHelpers';

interface Program {
  _id: string;
  university: string;
  universityRanking: {
    webometricsWorld?: number;
    webometricsNational?: number;
    usNews?: number;
    qs?: number;
  };
  programName: string;
  programUrl?: string;
  campus?: string;
  country: string;
  studyLevel: string;
  duration?: number;
  ieltsScore?: number;
  applicationFee?: number;
  yearlyTuitionFees?: number;
  priority?: number;
  intake?: string;
  year?: string;
  createdBy?: {
    _id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    email: string;
    role: string;
  };
}

interface ProgramCardProps {
  program: Program;
  showPriority?: boolean;
  showActions?: boolean;
  onEdit?: (programId: string) => void;
  editingProgramId?: string | null;
  index?: number;
}

export default function ProgramCard({
  program,
  showPriority = false,
  showActions = false,
  onEdit,
  editingProgramId,
  index,
}: ProgramCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {showPriority && (program.priority || program.intake || program.year) && (
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              {program.priority && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                  Priority: {program.priority}
                </span>
              )}
              {program.intake && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">
                  Intake: {program.intake}
                </span>
              )}
              {program.year && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">
                  Year: {program.year}
                </span>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mb-1">
            {index !== undefined && (
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">
                {index + 1}
              </div>
            )}
            <h4 className="font-semibold text-gray-900">{program.programName}</h4>
          </div>
          <p className="text-sm text-gray-600 mb-2">{program.university}</p>
          {getFullName(program.createdBy) && (
            <p className="text-xs text-blue-600 mb-2">
              Created by: <span className="font-medium">{getFullName(program.createdBy)}</span>
            </p>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
            {program.campus && (
              <div>
                <span className="font-medium">Campus:</span> {program.campus}
              </div>
            )}
            <div>
              <span className="font-medium">Country:</span> {program.country}
            </div>
            <div>
              <span className="font-medium">Study Level:</span> {program.studyLevel}
            </div>
            {program.duration && (
              <div>
                <span className="font-medium">Duration:</span> {program.duration} months
              </div>
            )}
            {program.ieltsScore && (
              <div>
                <span className="font-medium">IELTS:</span> {program.ieltsScore}
              </div>
            )}
            {program.yearlyTuitionFees && (
              <div>
                <span className="font-medium">Tuition:</span> £{program.yearlyTuitionFees.toLocaleString()}
              </div>
            )}
            {program.applicationFee && (
              <div>
                <span className="font-medium">Application Fee:</span> £{program.applicationFee.toLocaleString()}
              </div>
            )}
            {program.programUrl && (
              <div>
                <span className="font-medium">Program Link:</span>{' '}
                <a href={program.programUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  View Program
                </a>
              </div>
            )}
          </div>
          {program.universityRanking && (Object.keys(program.universityRanking).some(key => program.universityRanking[key as keyof typeof program.universityRanking])) && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
              <div className="flex flex-wrap gap-4">
                {program.universityRanking.webometricsWorld && (
                  <span>Webometrics World: {program.universityRanking.webometricsWorld}</span>
                )}
                {program.universityRanking.webometricsNational && (
                  <span>Webometrics National: {program.universityRanking.webometricsNational}</span>
                )}
                {program.universityRanking.usNews && (
                  <span>US News: {program.universityRanking.usNews}</span>
                )}
                {program.universityRanking.qs && (
                  <span>QS: {program.universityRanking.qs}</span>
                )}
              </div>
            </div>
          )}
        </div>
        {showActions && onEdit && editingProgramId !== program._id && (
          <button
            onClick={() => onEdit(program._id)}
            className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}


