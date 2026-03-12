import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy – CORE by ADMITra',
  description: 'Cookie Policy for CORE – Student Application and Admission Management System by ADMITra.',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-linear-to-br from-gray-900 via-amber-950 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-amber-400 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span>Cookie Policy</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Cookie Policy</h1>
          <p className="text-amber-200 text-lg">CORE – Student Application and Admission Management System</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
            <span>Effective Date: 01 January 2026</span>
            <span>•</span>
            <span>Website: https://core.admitra.io</span>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-8">
          <h2 className="text-base font-semibold text-amber-900 mb-3">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-amber-700">
            {[
              '1. Introduction', '2. What Are Cookies?', '3. Types of Cookies We Use',
              '4. What We Do NOT Use', '5. Third-Party Cookies', '6. Legal Basis for Cookie Use',
              '7. Managing Cookies', '8. Data Retention', '9. Updates to This Policy', '10. Contact Information'
            ].map((item) => (
              <a key={item} href={`#section-${item.split('.')[0].trim()}`} className="hover:text-amber-900 hover:underline py-0.5 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-10 text-gray-700 leading-relaxed">

          {/* Section 1 */}
          <section id="section-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">1</span>
              Introduction
            </h2>
            <p>
              This Cookie Policy explains how CORE – Student Application and Admission Management System ("CORE", "Platform") uses cookies and similar technologies when you visit{' '}
              <a href="https://core.admitra.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://core.admitra.io</a>.
            </p>
            <p className="mt-3">
              By continuing to use the Platform, you consent to the use of cookies in accordance with this Policy, subject to your preferences and applicable law.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2 */}
          <section id="section-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">2</span>
              What Are Cookies?
            </h2>
            <p className="mb-3">Cookies are small text files placed on your device when you visit a website. They help websites:</p>
            <ul className="space-y-2">
              {['Recognize your device', 'Maintain login sessions', 'Improve performance', 'Enhance user experience', 'Monitor system security'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm italic text-gray-500">Cookies do not access files on your device or collect information beyond what is voluntarily provided.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 3 */}
          <section id="section-3">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">3</span>
              Types of Cookies We Use
            </h2>
            <p className="mb-4">CORE uses only necessary and operational cookies essential for platform functionality.</p>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-3">3.1 Essential Cookies</h3>
                <p className="text-sm text-gray-600 mb-3">These cookies are required for:</p>
                <ul className="space-y-1.5 text-sm">
                  {['Secure login authentication', 'Session management', 'Role-based access control', 'Dashboard functionality', 'Form submissions'].map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {i}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-3 italic">Without these cookies, the Platform cannot function properly.</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-3">3.2 Security Cookies</h3>
                <p className="text-sm text-gray-600 mb-3">Used to:</p>
                <ul className="space-y-1.5 text-sm">
                  {['Detect suspicious activity', 'Prevent unauthorized access', 'Protect student accounts', 'Monitor session integrity'].map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-800 mb-3">3.3 Performance Cookies <span className="text-xs font-normal text-gray-500">(If Applicable)</span></h3>
                <p className="text-sm text-gray-600 mb-3">These may be used to:</p>
                <ul className="space-y-1.5 text-sm">
                  {['Monitor system load', 'Identify performance bottlenecks', 'Improve platform stability'].map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {i}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-3 italic">These cookies do not track users for advertising or behavioral profiling.</p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 4 */}
          <section id="section-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">4</span>
              What We Do NOT Use
            </h2>
            <div className="bg-red-50 border border-red-100 rounded-xl p-5">
              <p className="font-medium text-red-800 mb-3">CORE does not use:</p>
              <ul className="space-y-2 text-sm text-red-700">
                {['Advertising cookies', 'Third-party marketing trackers', 'Behavioral profiling cookies', 'Social media tracking pixels', 'Cross-site tracking cookies'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-red-600 mt-3 italic">Student data is never monetized through tracking technologies.</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 5 */}
          <section id="section-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">5</span>
              Third-Party Cookies
            </h2>
            <p>If the Platform integrates with third-party services (e.g., payment gateways, document hosting, analytics tools), those services may place limited functional cookies governed by their own policies.</p>
            <p className="mt-3">CORE does not control third-party cookie policies but ensures integrations are selected responsibly.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 6 */}
          <section id="section-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">6</span>
              Legal Basis for Cookie Use
            </h2>

            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Under Indian Law (DPDP Act 2023)</h3>
                <p className="text-sm mb-2">Cookies used by CORE are limited to lawful purposes such as:</p>
                <ul className="space-y-1.5 text-sm">
                  {['Contractual necessity', 'Platform security', 'System functionality'].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-gray-800 mb-2">Under GDPR (For EU Users)</h3>
                <p className="text-sm mb-2">For EU users:</p>
                <ul className="space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    Essential cookies are processed under legitimate interest or contractual necessity.
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    Non-essential cookies (if introduced in future) will require explicit consent.
                  </li>
                </ul>
                <p className="text-sm mt-3 mb-2">Users have the right to:</p>
                <ul className="space-y-1.5 text-sm">
                  {['Withdraw consent', 'Request cookie data access', 'Restrict processing'].map((i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 7 */}
          <section id="section-7">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">7</span>
              Managing Cookies
            </h2>
            <p className="mb-3">Users can control cookies through:</p>
            <ul className="space-y-2 mb-4">
              {['Browser settings', 'Device privacy controls'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mb-3">You may:</p>
            <ul className="space-y-2">
              {['Block cookies', 'Delete stored cookies', 'Disable third-party cookies'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm italic text-gray-500">However, disabling essential cookies may prevent access to certain CORE features.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 8 */}
          <section id="section-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">8</span>
              Data Retention
            </h2>
            <p>Session cookies expire automatically after logout or session timeout.</p>
            <p className="mt-3">Persistent cookies (if used for system stability) are retained only as long as necessary for operational purposes.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 9 */}
          <section id="section-9">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">9</span>
              Updates to This Policy
            </h2>
            <p>CORE may update this Cookie Policy from time to time. Updated versions will be published at{' '}
              <a href="https://core.admitra.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://core.admitra.io</a>.
            </p>
            <p className="mt-3">Continued use of the Platform constitutes acceptance of the revised policy.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 10 */}
          <section id="section-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 text-sm font-bold flex items-center justify-center shrink-0">10</span>
              Contact Information
            </h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-2">
              <p>For questions related to cookies or data protection:</p>
              <div className="mt-3 space-y-2 text-sm">
                <p><span className="font-medium text-gray-900">Entity:</span> ADMITra</p>
                <p><span className="font-medium text-gray-900">Platform:</span>{' '}
                  <a href="https://core.admitra.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://core.admitra.io</a>
                </p>
                <p><span className="font-medium text-gray-900">Email:</span>{' '}
                  <a href="mailto:hello@admitra.io" className="text-blue-600 hover:underline">hello@admitra.io</a>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Related links */}
        {/* <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/privacy-policy" className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all group">
            <div>
              <p className="text-xs text-gray-500 mb-1">Legal</p>
              <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">Privacy Policy →</p>
            </div>
          </Link>
          <Link href="/terms-of-service" className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all group">
            <div>
              <p className="text-xs text-gray-500 mb-1">Legal</p>
              <p className="font-semibold text-gray-900 group-hover:text-amber-700 transition-colors">Terms of Service →</p>
            </div>
          </Link>
        </div> */}
      </div>
    </div>
  );
}
