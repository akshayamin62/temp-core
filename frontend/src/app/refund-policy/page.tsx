import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description: 'Refund Policy',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-linear-to-br from-gray-900 via-emerald-950 to-gray-900 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span>Refund Policy</span>
          </div>
          <h1 className="text-4xl font-bold mb-3">REFUND POLICY</h1>
          <p className="text-emerald-200 text-lg">ADMITra</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-gray-400">
            <span>Effective Date: 01 January 2026</span>
            <span>-</span>
            <span>Operated by ADMITra</span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-10 text-gray-700 leading-relaxed">
          <section>
            <p>
              This Refund Policy applies to all services, products, programs, assessments, consulting engagements,
              platform access, and business opportunities offered by KAREER Studio and ADMITra (collectively referred to
              as &ldquo;Company&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;).
            </p>
            <p className="mt-3">
              By making any payment to the Company, the user (&ldquo;Client&rdquo;) agrees to this Refund Policy.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">1. STRICT NO-REFUND POLICY</h2>
            <p>All fees paid to KAREER Studio / ADMITra are non-refundable under all circumstances.</p>
            <p className="mt-3 mb-3">This includes, but is not limited to:</p>
            <ul className="space-y-2">
              {[
                'Consultation fees',
                'Education & career planning fees',
                'Study abroad consulting fees',
                'IVY League admissions consulting fees',
                'Application processing fees',
                'Assessment fees (psychometric, Brainography, tests, reports)',
                'Coaching fees (IELTS, GRE, scholastic, language)',
                'Platform access fees (CORE or any system)',
                'Franchise sign-up fees',
                'Advisor / counselor onboarding fees',
                'Business opportunity or partnership fees',
                'Any other service fee paid for services procured or intended to be procured',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">
              No refund shall be provided once payment is made, irrespective of usage, non-usage, or partial usage of
              services.
            </p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">2. NO REFUND ON CHANGE OF INTENT</h2>
            <p className="mb-3">Refunds will not be granted in cases where the Client:</p>
            <ul className="space-y-2">
              {[
                'Changes their mind after payment',
                'Decides not to proceed with services',
                'Chooses a different country, course, or career path',
                'Withdraws from the process voluntarily',
                'Fails to participate in scheduled activities',
                'Does not utilize services after enrollment',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">3. NO REFUND BASED ON OUTCOMES</h2>
            <p className="mb-3">Refunds will not be provided based on:</p>
            <ul className="space-y-2">
              {[
                'Admission rejection by universities',
                'Failure to secure IVY League admission',
                'Scholarship or financial aid outcomes',
                'Visa rejection or delay',
                'Academic performance',
                'External institutional decisions',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">All such outcomes are beyond the control of the Company.</p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">4. NO REFUND FOR DELAYS OR THIRD-PARTY FACTORS</h2>
            <p className="mb-3">The Company shall not be liable for delays caused by:</p>
            <ul className="space-y-2">
              {[
                'Universities or educational institutions',
                'Embassies or visa authorities',
                'Third-party service providers',
                'Government regulations or policy changes',
                'Technical disruptions beyond reasonable control',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">Such delays shall not qualify for refunds.</p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">5. NON-TRANSFERABILITY</h2>
            <p className="mb-3">Fees paid:</p>
            <ul className="space-y-2">
              {[
                'Cannot be transferred to another individual',
                'Cannot be adjusted against other services unless explicitly approved in writing',
                'Cannot be carried forward beyond the agreed service period',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">6. EXCEPTION (IF ANY)</h2>
            <p className="mb-3">Any exception to this Refund Policy:</p>
            <ul className="space-y-2">
              {[
                'Must be explicitly documented in a written agreement',
                'Must be signed by an authorized representative of KAREER Studio / ADMITra',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">Verbal assurances or informal communication shall not be considered valid.</p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">7. FRAUD OR MISREPRESENTATION</h2>
            <p className="mb-3">If the Client is found to have:</p>
            <ul className="space-y-2">
              {[
                'Submitted false information',
                'Provided forged documents',
                'Misrepresented credentials',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3">Services may be terminated immediately without refund.</p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">8. PAYMENT DISPUTES</h2>
            <p className="mb-3">Clients agree not to initiate:</p>
            <ul className="space-y-2">
              {[
                'Chargebacks',
                'Payment reversals',
                'Payment disputes through banks or payment gateways',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-3 mb-3">without first attempting resolution through the Company.</p>
            <p className="mb-3">Any wrongful dispute may result in:</p>
            <ul className="space-y-2">
              {[
                'Legal action',
                'Recovery proceedings',
                'Blacklisting from future services',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">9. SERVICE AVAILABILITY</h2>
            <p>
              The Company commits to providing services as per defined scope and timelines.
            </p>
            <p className="mt-3">However, non-utilization of services by the Client does not qualify for any refund.</p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">10. MODIFICATION OF POLICY</h2>
            <p>
              KAREER Studio / ADMITra reserves the right to modify this Refund Policy at any time.
            </p>
            <p className="mt-3">Updated versions will be published on official platforms.</p>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">11. GOVERNING LAW</h2>
            <p>
              This Refund Policy shall be governed by the laws of India.
            </p>
            <p className="mt-3 mb-3">Any disputes shall be subject to:</p>
            <ul className="space-y-2">
              {['Arbitration as per applicable laws', 'Jurisdiction: [Insert City, e.g., Ahmedabad / Vadodara]'].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <hr className="border-gray-100" />

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-4">12. CONTACT</h2>
            <div className="bg-gray-50 rounded-xl p-5 space-y-2 text-sm">
              <p><span className="font-medium text-gray-900">Entity:</span> ADMITra and it's associates</p>
              <p>
                <span className="font-medium text-gray-900">Email:</span>{' '}
                <a href="mailto:hello@admitra.io" className="text-blue-600 hover:underline">hello@admitra.io</a>
              </p>
              <p>
                <span className="font-medium text-gray-900">Website:</span>{' '}
                <a href="https://core.admitra.io" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                  https://core.admitra.io
                </a>
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
