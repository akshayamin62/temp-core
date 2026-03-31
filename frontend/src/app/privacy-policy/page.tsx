import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy – CORE by ADMITra',
  description: 'Privacy Policy for CORE – Student Application and Admission Management System by ADMITra.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-linear-to-br from-gray-900 via-blue-950 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-blue-400 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span>Privacy Policy</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-blue-200 text-lg">CORE – Student Application and Admission Management System</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
            <span>Effective Date: 01 January 2026</span>
            <span>•</span>
            <span>Operated by ADMITra</span>
          </div>
        </div>
      </div>

      {/* Table of Contents */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mb-8">
          <h2 className="text-base font-semibold text-blue-900 mb-3">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-blue-700">
            {[
              '1. Introduction', '2. Scope of This Policy', '3. Information We Collect',
              '4. Purpose of Data Collection', '5. Absolute Confidentiality Commitment',
              '6. Data Sharing Policy', '7. Data Storage and Security', '8. Data Retention Policy',
              '9. User Rights', '10. Cookies and Tracking', '11. Third-Party Integrations',
              '12. Children\'s Data Protection', '13. Policy Updates', '14. Governing Law', '15. Contact Information'
            ].map((item) => (
              <a key={item} href={`#section-${item.split('.')[0].trim()}`} className="hover:text-blue-900 hover:underline py-0.5 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-10 text-gray-700 leading-relaxed">

          {/* Section 1 */}
          <section id="section-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">1</span>
              Introduction
            </h2>
            <p>
              CORE – Student Application and Admission Management System ("CORE", "Platform", "System") is a centralized digital ecosystem developed and managed by ADMITra for structured education planning, study abroad consulting, IVY league application consulting, coaching classes and admission management.
            </p>
            <p className="mt-3">
              This Privacy Policy explains how CORE collects, uses, stores, protects, and processes personal data of students, parents, schools, counselors, alumni, and service providers who access or use the platform available at{' '}
              <a href="https://core.admitra.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://core.admitra.io</a>.
            </p>
            <p className="mt-3">By accessing or using CORE, you agree to the terms outlined in this Privacy Policy.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2 */}
          <section id="section-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">2</span>
              Scope of This Policy
            </h2>
            <p className="mb-3">This policy applies to:</p>
            <ul className="space-y-2">
              {[
                'Students registering on the platform',
                'Parents or guardians linked to student accounts',
                'School representatives and teachers',
                'Counselors and mentors',
                'Alumni and verified service providers',
                'External Service Providers',
                'Any user interacting with the platform',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 3 */}
          <section id="section-3">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">3</span>
              Information We Collect
            </h2>
            <p className="mb-4">CORE may collect the following categories of information:</p>

            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">3.1 Personal Identification Information</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                  {['Full name', 'Date of birth', 'Gender', 'Contact number', 'Email address', 'Residential address', 'Nationality', 'Passport details (where required for applications)'].map((i) => (
                    <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{i}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">3.2 Academic Information</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                  {['School details', 'Academic records and transcripts', 'Test scores (IELTS, GRE, SAT, etc.)', 'Certificates and achievements', 'Extracurricular records', 'Recommendation letters'].map((i) => (
                    <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{i}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">3.3 Application & Admission Data</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                  {['University selections', 'Course preferences', 'Application documents', 'SOP drafts', 'Resume and portfolio files', 'Offer letters and admission communications'].map((i) => (
                    <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{i}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">3.4 Technical Information</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                  {['IP address', 'Device information', 'Browser type', 'Login timestamps', 'Usage logs'].map((i) => (
                    <li key={i} className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />{i}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">3.5 Payment Information</h3>
                <p className="text-sm">Where applicable, payment transaction records may be stored. Sensitive payment card information is not stored directly on CORE servers if processed via third-party payment gateways.</p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 4 */}
          <section id="section-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">4</span>
              Purpose of Data Collection
            </h2>
            <p className="mb-3">We collect and process data strictly for:</p>
            <ul className="space-y-2">
              {[
                'Student profile creation and management',
                'Application tracking and documentation management',
                'Admission consulting workflow execution',
                'Communication between student, parents, counselors, and authorized stakeholders',
                'Progress monitoring and performance analytics',
                'Compliance with legal or regulatory obligations',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm italic text-gray-500">Data is never collected for speculative, unrelated, or commercial resale purposes.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 5 */}
          <section id="section-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">5</span>
              Absolute Confidentiality Commitment
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
              <p className="font-medium text-blue-900">CORE maintains a strict confidentiality standard:</p>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Student data and identity will remain completely confidential and will never be shared with any individual, organization, institution, or company without explicit written consent from the student or legal guardian, except where required by law.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                We do not sell, rent, trade, distribute, or commercially exploit any student information.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Confidentiality is foundational to the CORE system architecture and governance.
              </li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 6 */}
          <section id="section-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">6</span>
              Data Sharing Policy
            </h2>
            <p className="mb-3">Data may only be shared under the following limited circumstances:</p>
            <ol className="space-y-2 list-decimal list-inside">
              <li>With the student's explicit written authorization</li>
              <li>With universities or institutions strictly for application submission</li>
              <li>When required by statutory or legal authorities under applicable law</li>
            </ol>
            <p className="mt-3 text-sm">In all such cases, sharing is purpose-limited and documented.</p>
            <p className="mt-2 text-sm italic text-gray-500">CORE does not share data for marketing partnerships, advertising, or third-party monetization.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 7 */}
          <section id="section-7">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">7</span>
              Data Storage and Security
            </h2>
            <p className="mb-3">CORE implements reasonable and industry-standard safeguards, including:</p>
            <ul className="space-y-2">
              {['Secure cloud infrastructure', 'Role-based access control', 'Encrypted login protocols', 'Access authentication systems', 'Audit logs and monitoring', 'Restricted internal access'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-4 text-sm">Only authorized personnel with defined roles may access student data.</p>
            <p className="mt-2 text-sm italic text-gray-500">While we implement high security standards, no digital system can be guaranteed 100% immune from cyber threats. Users are advised to maintain secure passwords and device safety.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 8 */}
          <section id="section-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">8</span>
              Data Retention Policy
            </h2>
            <p className="mb-3">Student data will be retained:</p>
            <ul className="space-y-2">
              {[
                'For the duration of active engagement with CORE, or maximum up to 3 years',
                'For a defined archival period post-engagement for record purposes',
                'As required under applicable regulatory frameworks',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">Users may request deletion of their data subject to legal and contractual obligations.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 9 */}
          <section id="section-9">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">9</span>
              User Rights
            </h2>
            <p className="mb-3">Students and parents have the right to:</p>
            <ul className="space-y-2">
              {[
                'Access their personal data',
                'Request correction of inaccurate information',
                'Request deletion (subject to compliance requirements)',
                'Request a copy of stored records',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">Requests may be submitted through official support channels.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 10 */}
          <section id="section-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">10</span>
              Cookies and Tracking
            </h2>
            <p className="mb-3">CORE may use essential cookies for:</p>
            <ul className="space-y-2">
              {['Login authentication', 'Session management', 'Platform functionality'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm">We do not use behavioral advertising trackers. For more details, see our{' '}
              <Link href="/cookie-policy" className="text-blue-600 hover:underline">Cookie Policy</Link>.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 11 */}
          <section id="section-11">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">11</span>
              Third-Party Integrations
            </h2>
            <p>If the platform integrates with third-party services (e.g., test providers, document upload systems, payment gateways), such services operate under their respective privacy policies.</p>
            <p className="mt-3">CORE remains responsible for safeguarding user data within its operational control.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 12 */}
          <section id="section-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">12</span>
              Children's Data Protection
            </h2>
            <p className="mb-3">CORE primarily serves students, including minors. In such cases:</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Parent or guardian consent may be required for account activation.
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                Additional care is taken to protect sensitive academic and identity data.
              </li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 13 */}
          <section id="section-13">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">13</span>
              Policy Updates
            </h2>
            <p>CORE reserves the right to update this Privacy Policy periodically. Updated versions will be posted on{' '}
              <a href="https://core.admitra.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://core.admitra.io</a>{' '}
              with revised effective dates.</p>
            <p className="mt-3">Continued use of the platform constitutes acceptance of updated terms.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 14 */}
          <section id="section-14">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">14</span>
              Governing Law
            </h2>
            <p>This Privacy Policy shall be governed by and interpreted in accordance with the laws applicable in India.</p>
            <p className="mt-3">Any disputes shall fall under the jurisdiction of competent courts as defined by the governing entity of ADMITra.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 15 */}
          <section id="section-15">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center shrink-0">15</span>
              Contact Information
            </h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-2">
              <p>For privacy-related concerns, requests, or complaints:</p>
              <div className="mt-3 space-y-2 text-sm">
                <p><span className="font-medium text-gray-900">Email:</span>{' '}
                  <a href="mailto:hello@admitra.io" className="text-blue-600 hover:underline">hello@admitra.io</a>
                </p>
                <p><span className="font-medium text-gray-900">Entity:</span> ADMITra</p>
                <p><span className="font-medium text-gray-900">Website:</span>{' '}
                  <a href="https://core.admitra.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">https://core.admitra.io</a>
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Related links */}
        {/* <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link href="/terms-of-service" className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div>
              <p className="text-xs text-gray-500 mb-1">Legal</p>
              <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Terms of Service →</p>
            </div>
          </Link>
          <Link href="/cookie-policy" className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all group">
            <div>
              <p className="text-xs text-gray-500 mb-1">Legal</p>
              <p className="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">Cookie Policy →</p>
            </div>
          </Link>
        </div> */}
      </div>
    </div>
  );
}
