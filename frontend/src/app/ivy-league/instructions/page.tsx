'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function IvyLeagueInstructionsPage() {
  const router = useRouter();
  const [showBanner, setShowBanner] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowBanner(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    {
      number: 1,
      title: 'Take an Ivy-League Test',
      description:
        'You will be required to take a comprehensive aptitude and academic assessment designed specifically for Ivy League aspirants. This test evaluates your critical thinking, analytical skills, and academic readiness.',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
    },
    {
      number: 2,
      title: 'Student Interview',
      description:
        'After the test, you will go through a one-on-one interview session where our expert panel will assess your personality, aspirations, extracurricular involvement, and overall fit for the Ivy League preparation program.',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      number: 3,
      title: "Parent's Interview",
      description:
        'A brief interview will be conducted with one of your parents/guardians to understand the family\'s commitment, expectations, and support for the student\'s Ivy League journey. This helps us ensure a collaborative approach.',
      icon: (
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-4xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Success Banner */}
        {showBanner && (
        <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl p-6 flex items-start gap-4 transition-opacity duration-500">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-green-800">Registration Successful!</h2>
            <p className="text-green-700 mt-1">
              Your Ivy League registration has been submitted. Please review the procedure below to understand the next steps.
            </p>
          </div>
        </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2959ba] to-[#1e3f8a] shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
            Ivy League Admission Procedure
          </h1>
          <p className="text-gray-600 mt-3 text-lg max-w-2xl mx-auto">
            To proceed with the Ivy League preparation program, students need to pass through the following procedure
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow duration-300"
            >
              <div className="flex items-stretch">
                {/* Step Number + Icon */}
                <div className="flex-shrink-0 w-24 sm:w-28 bg-gradient-to-b from-[#2959ba] to-[#1e3f8a] flex flex-col items-center justify-center gap-2 p-4">
                  <span className="text-white/70 text-sm font-medium uppercase tracking-wider">Step</span>
                  <span className="text-white text-3xl font-bold">{step.number}</span>
                  <div className="mt-1">{step.icon}</div>
                </div>

                {/* Content */}
                <div className="flex-1 p-6 sm:p-8">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">{step.description}</p>

                  {step.number === 1 && (
                    <div className="mt-5">
                      <button
                        onClick={() => router.push('/ivy-league/test')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] text-white font-semibold rounded-xl shadow-md hover:shadow-lg hover:shadow-[#2959ba]/30 transition-all duration-200"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Start Test
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Connector line between steps */}
              {index < steps.length - 1 && (
                <div className="flex justify-center -mb-6 relative z-10">
                  <div className="w-0.5 h-6 bg-[#2959ba]/30"></div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom Note */}
        <div className="mt-10 bg-blue-50 border border-blue-200 rounded-2xl p-6 text-center">
          <p className="text-blue-800 font-medium">
            Our team will reach out to you with the schedule for each step. Please ensure your contact details are up to date.
          </p>
        </div>

        {/* Back to Dashboard Button */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
