'use client';

export default function IvyExpertParentsPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-20 h-20 bg-rose-100 rounded-2xl flex items-center justify-center mb-6">
        <svg className="w-10 h-10 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h1 className="text-3xl font-black text-gray-900 mb-3 uppercase tracking-tight">Parents</h1>
      <p className="text-gray-400 font-medium max-w-sm leading-relaxed">
        This section is coming soon. Parent management and communication features will be available here.
      </p>
      <span className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 text-sm font-bold rounded-full border border-rose-100">
        <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></span>
        Coming Soon
      </span>
    </div>
  );
}
