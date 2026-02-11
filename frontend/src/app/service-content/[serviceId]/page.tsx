'use client';

import { useParams, useRouter } from 'next/navigation';

export default function ServiceContentPage() {
  const router = useRouter();
  const params = useParams();
  const serviceId = params.serviceId as string;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push('/my-enrollments')}
          className="text-blue-600 hover:text-blue-700 font-medium mb-4 flex items-center gap-2"
        >
          ← Back to My Enrollments
        </button>

        <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Service Content</h1>
          <p className="text-gray-600 mb-6">
            Service content will be displayed here. This section is currently under development.
          </p>
          <p className="text-sm text-gray-500">
            Service ID: {serviceId}
          </p>
        </div>
      </div>
    </div>
  );
}

