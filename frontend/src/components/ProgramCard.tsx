'use client';

import { getFullName } from '@/utils/nameHelpers';
import { classifyUniversity } from '@/utils/universityClassification';

interface Program {
  _id: string;
  university: string;
  universityRanking: {
    webometricsWorld?: number;
    webometricsNational?: number;
    usNews?: number;
    qs?: number;
  };
  universityStatus?: string;
  programName: string;
  programUrl?: string;
  campus?: string;
  country: string;
  studyLevel: string;
  duration?: number;
  ieltsScore?: number;
  applicationFee?: string;
  yearlyTuitionFees?: string;
  priority?: number;
  intake?: string;
  year?: string;
  status?: string;
  applicationOpenDate?: string;
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
  topRow?: React.ReactNode; // Rendered inside card, above program name
}

export default function ProgramCard({
  program,
  showPriority = false,
  showActions = false,
  onEdit,
  editingProgramId,
  index,
  topRow,
}: ProgramCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors bg-white">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Custom top row (status badges + action buttons) */}
          {topRow && <div className="mb-2">{topRow}</div>}
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
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <p className="text-sm text-gray-600">{program.university}</p>
            {classifyUniversity(program.university) === 'ivy-league' && (
              <a
                href="https://en.wikipedia.org/wiki/Ivy_League"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold bg-red-600 text-white border border-green-200 hover:bg-red-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                Ivy League
              </a>
            )}
            {classifyUniversity(program.university) === 'russell-group' && (
              <a
                href="https://en.wikipedia.org/wiki/Russell_Group"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-sm font-semibold bg-purple-600 text-white border border-purple-200 hover:bg-purple-700 transition-colors"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" /></svg>
                Russell Group
              </a>
            )}
          </div>
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
                <span className="font-medium">Tuition:</span> {program.yearlyTuitionFees}
              </div>
            )}
            {program.applicationFee && (
              <div>
                <span className="font-medium">Application Fee:</span> {program.applicationFee}
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
          {(program.universityRanking && (Object.keys(program.universityRanking).some(key => program.universityRanking[key as keyof typeof program.universityRanking])) || program.universityStatus) && (
            <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-600">
              <div className="flex flex-wrap gap-4 items-center">
                {program.universityRanking?.webometricsWorld && (
                  <span>Webometrics World: {program.universityRanking.webometricsWorld}</span>
                )}
                {program.universityRanking?.webometricsNational && (
                  <span>Webometrics National: {program.universityRanking.webometricsNational}</span>
                )}
                {program.universityRanking?.usNews && (
                  <span>US News: {program.universityRanking.usNews}</span>
                )}
                {program.universityRanking?.qs && (
                  <span>QS: {program.universityRanking.qs}</span>
                )}
                {program.universityStatus && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {program.universityStatus} University
                  </span>
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


