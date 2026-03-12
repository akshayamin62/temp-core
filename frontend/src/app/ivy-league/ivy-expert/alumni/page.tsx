'use client';

export default function IvyExpertAlumniPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 bg-sky-100 rounded-2xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 7v-7" />
        </svg>
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Alumni</h1>
      <p className="text-gray-400 font-medium max-w-sm leading-relaxed">
        This section is coming soon. Alumni network and mentorship features will be available here.
      </p>
      <span className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-sky-50 text-sky-600 text-sm font-bold rounded-full border border-sky-100">
        <span className="w-2 h-2 bg-sky-400 rounded-full animate-pulse"></span>
        Coming Soon
      </span>
    </div>
  );
}
