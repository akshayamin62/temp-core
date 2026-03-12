'use client';

export default function IvyExpertServiceProvidersPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 bg-violet-100 rounded-2xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Service Providers</h1>
      <p className="text-gray-400 font-medium max-w-sm leading-relaxed">
        This section is coming soon. Service provider management and coordination features will be available here.
      </p>
      <span className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-600 text-sm font-bold rounded-full border border-violet-100">
        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></span>
        Coming Soon
      </span>
    </div>
  );
}
