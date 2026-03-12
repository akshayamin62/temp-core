import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service – CORE by ADMITra',
  description: 'Terms of Service for CORE – Student Application and Admission Management System by ADMITra.',
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-linear-to-br from-gray-900 via-purple-950 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-purple-400 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span>Terms of Service</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">Terms of Service</h1>
          <p className="text-purple-200 text-lg">CORE – Student Application and Admission Management System</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
            <span>Effective Date: 01 January 2026</span>
            <span>•</span>
            <span>Operated by ADMITra</span>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 mb-6">
          <p className="text-purple-800 text-sm leading-relaxed">
            This Master Terms of Service ("Agreement") governs access to and use of CORE – Student Application and Admission Management System ("CORE", "Platform"), operated by ADMITra ("Company", "we", "us", "our").
            By accessing or using the Platform, you agree to be legally bound by this Agreement and the applicable Annexure corresponding to your role.
          </p>
        </div>

        {/* Table of Contents */}
        <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6 mb-8">
          <h2 className="text-base font-semibold text-purple-900 mb-3">Table of Contents</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-sm text-purple-700">
            {[
              '1. Definitions', '2. Nature of Platform', '3. Confidentiality and Data Protection',
              '4. Intellectual Property', '5. Account Security', '6. Fees and Payments',
              '7. Limitation of Liability', '8. Dispute Resolution', '9. Regulatory Compliance',
              '10. Force Majeure', '11. Amendments', '12. Role-Based Annexures', '13. Governing Law',
              '20. Contact Information'
            ].map((item) => (
              <a key={item} href={`#section-${item.split('.')[0].trim()}`} className="hover:text-purple-900 hover:underline py-0.5 transition-colors">
                {item}
              </a>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-10 text-gray-700 leading-relaxed">

          {/* Section 1 */}
          <section id="section-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">1</span>
              Definitions
            </h2>
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="font-semibold text-gray-800">"User"</span>
                <span className="text-sm ml-2">means any individual or entity accessing CORE, including Students, Parents, Counselors, Third-Party Service Providers, Agents, and Advisors.</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="font-semibold text-gray-800">"Student Data"</span>
                <span className="text-sm ml-2">means all personal, academic, identity, financial, and application-related information uploaded to the Platform.</span>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <span className="font-semibold text-gray-800">"Confidential Information"</span>
                <span className="text-sm ml-2">includes Student Data, system workflows, proprietary templates, intellectual property, and non-public business information.</span>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2 */}
          <section id="section-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">2</span>
              Nature of Platform
            </h2>
            <p className="mb-3">CORE is a centralized education and admission management system designed to:</p>
            <ul className="space-y-2 mb-5">
              {['Track applications and documentation', 'Facilitate structured education planning', 'Enable collaboration between stakeholders', 'Monitor readiness and performance workflows'].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  {item}
                </li>
              ))}
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="font-semibold text-yellow-800 mb-2">CORE does not guarantee:</p>
              <ul className="space-y-1.5 text-sm text-yellow-700">
                {['Admission', 'Scholarships', 'Visa approval', 'Immigration outcomes', 'Academic results'].map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-yellow-600 mt-3 italic">All institutional decisions are independent of CORE.</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 3 */}
          <section id="section-3">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">3</span>
              Confidentiality and Data Protection
            </h2>
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-4">
              <p className="font-medium text-blue-900">Student identity and data shall remain strictly confidential.</p>
            </div>
            <p className="mb-3">Student data will never be sold, rented, commercially shared, or disclosed to any individual or company without explicit written consent, except:</p>
            <ul className="space-y-2 mb-4">
              {['For official application submission', 'When required by law', 'For contractual compliance'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm">CORE implements role-based access controls and industry-standard safeguards.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 4 */}
          <section id="section-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">4</span>
              Intellectual Property
            </h2>
            <p className="mb-3">All platform architecture, workflows, scorecards, readiness models, templates, dashboards, and documentation formats are the exclusive intellectual property of ADMITra.</p>
            <p className="text-sm italic text-gray-500">No User may copy, distribute, reverse engineer, or commercially exploit any part of the Platform without written authorization.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 5 */}
          <section id="section-5">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">5</span>
              Account Security
            </h2>
            <p className="mb-3">Users are responsible for:</p>
            <ul className="space-y-2">
              {['Maintaining credential confidentiality', 'Ensuring accuracy of information', 'All activities under their account'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm italic text-gray-500">CORE is not liable for losses due to user negligence.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 6 */}
          <section id="section-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">6</span>
              Fees and Payments
            </h2>
            <p className="mb-3">Where applicable:</p>
            <ul className="space-y-2">
              {['Fees are governed by separate service agreements', 'Fees are non-refundable unless explicitly stated', 'Non-payment may result in suspension'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 7 */}
          <section id="section-7">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">7</span>
              Limitation of Liability
            </h2>
            <p className="mb-3">To the maximum extent permitted by law, CORE shall not be liable for:</p>
            <ul className="space-y-2 mb-4">
              {['Admission rejections', 'Visa denials', 'Institutional delays', 'Academic outcomes', 'Indirect or consequential damages'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-sm italic text-gray-500">Total liability shall not exceed the fees paid related to the dispute.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 8 */}
          <section id="section-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">8</span>
              Dispute Resolution
            </h2>
            <p className="mb-3">All disputes shall be resolved through:</p>
            <ol className="space-y-2 text-sm">
              {['Good faith negotiation', 'Binding arbitration under the Arbitration and Conciliation Act, 1996', 'Sole arbitrator', 'Venue in India', 'English language'].map((item, idx) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  {item}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-sm italic text-gray-500">Courts shall have jurisdiction only for enforcement of arbitral awards.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 9 */}
          <section id="section-9">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">9</span>
              Regulatory Compliance
            </h2>
            <div className="space-y-5">
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">9.1 India – Digital Personal Data Protection Act, 2023</h3>
                <p className="text-sm mb-2">CORE acts as Data Fiduciary. Users may request:</p>
                <ul className="space-y-1.5 text-sm">
                  {['Access', 'Correction', 'Erasure', 'Withdrawal of consent'].map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {i}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-gray-500 mt-2 italic">Subject to contractual and legal obligations.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-2">9.2 GDPR (If Applicable)</h3>
                <p className="text-sm mb-2">EU-based users retain rights to:</p>
                <ul className="grid grid-cols-2 gap-1.5 text-sm">
                  {['Access', 'Rectification', 'Erasure', 'Restriction', 'Portability', 'Objection'].map((i) => (
                    <li key={i} className="flex items-center gap-2">
                      <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      {i}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 10 */}
          <section id="section-10">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">10</span>
              Force Majeure
            </h2>
            <p className="mb-3">CORE shall not be liable for failure to perform due to:</p>
            <ul className="space-y-2">
              {['Natural disasters', 'Government orders', 'Cyber attacks', 'Public health emergencies', 'Infrastructure failure'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-purple-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 11 */}
          <section id="section-11">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">11</span>
              Amendments
            </h2>
            <p>CORE may modify this Agreement at any time. Continued use of the Platform constitutes acceptance of revised terms.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 12 – Annexures */}
          <section id="section-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">12</span>
              Role-Based Annexures
            </h2>
            <p className="mb-5 text-sm text-gray-500">Each User is additionally governed by the Annexure corresponding to their role.</p>

            <div className="space-y-4">
              {[
                {
                  title: 'Annexure A – Student Terms',
                  items: [
                    'Students must provide accurate academic and personal information.',
                    'Uploading forged or misleading documents results in immediate termination.',
                    'No admission, visa, or scholarship guarantee is provided.',
                    'Students may not redistribute proprietary templates or internal frameworks.',
                    'Misrepresentation voids all obligations of CORE.',
                  ]
                },
                {
                  title: 'Annexure B – Parent / Guardian Terms',
                  items: [
                    'Parents provide consent for processing of minor\'s data.',
                    'Parents acknowledge financial responsibility under service agreements.',
                    'Parents shall not interfere with structured workflows or bypass official communication channels.',
                    'Unauthorized direct engagement with institutions that disrupts process may result in service suspension.',
                  ]
                },
                {
                  title: 'Annexure C – Counselor Terms',
                  items: [
                    'Counselors act as structured advisors, not decision-makers.',
                    'Counselors must maintain strict confidentiality.',
                    'Counselors may not solicit private payments outside the platform.',
                    'Extraction or misuse of student database is strictly prohibited.',
                    'Conflict of interest must be disclosed immediately.',
                  ]
                },
                {
                  title: 'Annexure D – Third-Party Service Provider Terms',
                  items: [
                    'Providers receive limited, role-based access only.',
                    'Student data may be used solely for defined service delivery.',
                    'No data copying, retention, or marketing usage is permitted.',
                    'Providers act as independent contractors.',
                    'Providers indemnify CORE against misconduct or regulatory violations.',
                  ]
                },
                {
                  title: 'Annexure E – Agent Terms',
                  items: [
                    'Agents may not guarantee admission or visa approval.',
                    'Agents must use approved scripts and pricing structures.',
                    'Commission terms are governed by separate written agreements.',
                    'Database extraction or lead diversion results in immediate termination and legal action.',
                    'Agents must comply with anti-bribery and recruitment laws.',
                  ]
                },
                {
                  title: 'Annexure F – Advisor Terms',
                  items: [
                    'Advisors provide non-binding mentorship.',
                    'Advisors may not independently contract with students introduced through CORE without authorization.',
                    'Confidentiality obligations apply strictly.',
                    'Advisory opinions do not constitute legal or immigration advice.',
                  ]
                },
              ].map((annexure) => (
                <div key={annexure.title} className="border border-gray-100 rounded-xl overflow-hidden">
                  <div className="bg-purple-50 px-5 py-3">
                    <h3 className="font-semibold text-purple-900 text-sm">{annexure.title}</h3>
                  </div>
                  <div className="px-5 py-4">
                    <ol className="space-y-2 text-sm">
                      {annexure.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-purple-600 font-semibold shrink-0">{idx + 1}.</span>
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 13 */}
          <section id="section-13">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">13</span>
              Governing Law
            </h2>
            <p>This Agreement is governed by the laws of India.</p>
            <p className="mt-2 text-sm text-gray-500">Jurisdiction: Vadodara, Gujarat, subject to arbitration clause.</p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 20 */}
          <section id="section-20">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 text-sm font-bold flex items-center justify-center shrink-0">20</span>
              Contact Information
            </h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-2">
              <div className="mt-1 space-y-2 text-sm">
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
          <Link href="/privacy-policy" className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition-all group">
            <div>
              <p className="text-xs text-gray-500 mb-1">Legal</p>
              <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Privacy Policy →</p>
            </div>
          </Link>
          <Link href="/cookie-policy" className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-5 hover:border-purple-300 hover:shadow-sm transition-all group">
            <div>
              <p className="text-xs text-gray-500 mb-1">Legal</p>
              <p className="font-semibold text-gray-900 group-hover:text-purple-700 transition-colors">Cookie Policy →</p>
            </div>
          </Link>
        </div> */}
      </div>
    </div>
  );
}
