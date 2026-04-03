// Central plan configs per service — defines each service's unique plans/tiers

export interface PlanConfig {
  key: string;
  name: string;
  subtitle?: string;
  // Tailwind class strings
  borderColor: string;
  headerGradient: string;
  textColor: string;
  iconBg: string;
  iconText: string;
  cellBg: string;
  badgeBg: string;
  glowColor: string;
}

export interface ServiceFeature {
  area: string;
  description: string;
  values: Record<string, string>;
}

export const STUDY_ABROAD_PLANS: PlanConfig[] = [
  {
    key: 'PRO', name: 'PRO', subtitle: 'Essential',
    borderColor: 'border-blue-200', headerGradient: 'bg-blue-500',
    textColor: 'text-blue-600', iconBg: 'bg-blue-50', iconText: 'text-blue-500',
    cellBg: 'bg-blue-50/30', badgeBg: 'bg-blue-500', glowColor: 'shadow-blue-100/40',
  },
  {
    key: 'PREMIUM', name: 'PREMIUM', subtitle: 'Recommended',
    borderColor: 'border-blue-300', headerGradient: 'bg-blue-600',
    textColor: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-600',
    cellBg: 'bg-blue-50/40', badgeBg: 'bg-blue-600', glowColor: 'shadow-blue-200/40',
  },
  {
    key: 'PLATINUM', name: 'PLATINUM', subtitle: 'All-Inclusive',
    borderColor: 'border-blue-400', headerGradient: 'bg-blue-700',
    textColor: 'text-blue-800', iconBg: 'bg-blue-100', iconText: 'text-blue-700',
    cellBg: 'bg-blue-50/50', badgeBg: 'bg-blue-700', glowColor: 'shadow-blue-200/50',
  },
];

export const COACHING_CLASSES_PLANS: PlanConfig[] = [
  {
    key: 'IELTS', name: 'IELTS', subtitle: '25 Sessions × 1.5 hrs • 02 Mocks',
    borderColor: 'border-blue-300', headerGradient: 'bg-gradient-to-br from-blue-500 to-blue-600',
    textColor: 'text-blue-700', iconBg: 'bg-blue-100', iconText: 'text-blue-600',
    cellBg: 'bg-blue-50/30', badgeBg: 'bg-blue-600', glowColor: 'shadow-blue-200/50',
  },
  {
    key: 'IELTS_PREMIUM', name: 'IELTS Premium', subtitle: '54 Sessions × 1.5 hrs • 06 Mocks',
    borderColor: 'border-indigo-300', headerGradient: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-700', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600',
    cellBg: 'bg-indigo-50/30', badgeBg: 'bg-indigo-600', glowColor: 'shadow-indigo-200/50',
  },
  {
    key: 'GRE', name: 'GRE', subtitle: '58 Sessions × 1.5 hrs • 10 Mocks',
    borderColor: 'border-purple-300', headerGradient: 'bg-gradient-to-br from-purple-500 to-purple-600',
    textColor: 'text-purple-700', iconBg: 'bg-purple-100', iconText: 'text-purple-600',
    cellBg: 'bg-purple-50/30', badgeBg: 'bg-purple-600', glowColor: 'shadow-purple-200/50',
  },
  {
    key: 'GMAT', name: 'GMAT', subtitle: '54 Sessions × 1.5 hrs • 06 Mocks',
    borderColor: 'border-violet-300', headerGradient: 'bg-gradient-to-br from-violet-500 to-violet-600',
    textColor: 'text-violet-700', iconBg: 'bg-violet-100', iconText: 'text-violet-600',
    cellBg: 'bg-violet-50/30', badgeBg: 'bg-violet-600', glowColor: 'shadow-violet-200/50',
  },
  {
    key: 'SAT', name: 'SAT', subtitle: '34 Sessions × 1.5 hrs • 07 Mocks',
    borderColor: 'border-teal-300', headerGradient: 'bg-gradient-to-br from-teal-500 to-teal-600',
    textColor: 'text-teal-700', iconBg: 'bg-teal-100', iconText: 'text-teal-600',
    cellBg: 'bg-teal-50/30', badgeBg: 'bg-teal-600', glowColor: 'shadow-teal-200/50',
  },
  {
    key: 'PTE', name: 'PTE', subtitle: '20 Sessions × 1.5 hrs • 01 Mock',
    borderColor: 'border-emerald-300', headerGradient: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-700', iconBg: 'bg-emerald-100', iconText: 'text-emerald-600',
    cellBg: 'bg-emerald-50/30', badgeBg: 'bg-emerald-600', glowColor: 'shadow-emerald-200/50',
  },
  {
    key: 'GERMAN_A1', name: 'German A1 Level', subtitle: '45 Sessions • 03 Mocks',
    borderColor: 'border-rose-300', headerGradient: 'bg-gradient-to-br from-rose-500 to-rose-600',
    textColor: 'text-rose-700', iconBg: 'bg-rose-100', iconText: 'text-rose-600',
    cellBg: 'bg-rose-50/30', badgeBg: 'bg-rose-600', glowColor: 'shadow-rose-200/50',
  },
  {
    key: 'GERMAN_A2', name: 'German A2 Level', subtitle: '45 Sessions • 03 Mocks',
    borderColor: 'border-pink-300', headerGradient: 'bg-gradient-to-br from-pink-500 to-pink-600',
    textColor: 'text-pink-700', iconBg: 'bg-pink-100', iconText: 'text-pink-600',
    cellBg: 'bg-pink-50/30', badgeBg: 'bg-pink-600', glowColor: 'shadow-pink-200/50',
  },
  {
    key: 'FRENCH_A1', name: 'French A1 Level', subtitle: '45 Sessions • 03 Mocks',
    borderColor: 'border-amber-300', headerGradient: 'bg-gradient-to-br from-amber-500 to-amber-600',
    textColor: 'text-amber-700', iconBg: 'bg-amber-100', iconText: 'text-amber-600',
    cellBg: 'bg-amber-50/30', badgeBg: 'bg-amber-600', glowColor: 'shadow-amber-200/50',
  },
  {
    key: 'FRENCH_A2', name: 'French A2 Level', subtitle: '45 Sessions • 03 Mocks',
    borderColor: 'border-orange-300', headerGradient: 'bg-gradient-to-br from-orange-500 to-orange-600',
    textColor: 'text-orange-700', iconBg: 'bg-orange-100', iconText: 'text-orange-600',
    cellBg: 'bg-orange-50/30', badgeBg: 'bg-orange-600', glowColor: 'shadow-orange-200/50',
  },
  {
    key: 'JAPANESE_N5', name: 'Japanese N5 Level', subtitle: '55 Sessions • 05 Mocks',
    borderColor: 'border-cyan-300', headerGradient: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    textColor: 'text-cyan-700', iconBg: 'bg-cyan-100', iconText: 'text-cyan-600',
    cellBg: 'bg-cyan-50/30', badgeBg: 'bg-cyan-600', glowColor: 'shadow-cyan-200/50',
  },
];

export const SERVICE_PLANS: Record<string, PlanConfig[]> = {
  'study-abroad': STUDY_ABROAD_PLANS,
  'education-planning': STUDY_ABROAD_PLANS,
  'coaching-classes': COACHING_CLASSES_PLANS,
};

export function getServicePlans(serviceSlug: string): PlanConfig[] {
  return SERVICE_PLANS[serviceSlug] || [];
}

// ─── Hardcoded Features per Service ───

export const STUDY_ABROAD_FEATURES: ServiceFeature[] = [
  { area: 'Career Potential & Stream Assessment', description: 'Scientific potential intelligence assessment to identify career interests, academic strengths, and stream choices.', values: { PRO: '✗', PREMIUM: '✓ 2-Level Counselling', PLATINUM: '✓ 3-Level Counselling + Detailed Education Portfolio + Activity Management System Tool' } },
  { area: 'Country & Program Selection Guidance', description: 'Identify best-fit countries and programs based on Academic Potential, Career Goals, Education Profile, and Financial Budget.', values: { PRO: 'Upto 2 Countries', PREMIUM: '3–4 Countries', PLATINUM: '5–7 Countries' } },
  { area: 'University Shortlisting & Profiling', description: 'Curated list of universities based on Profile, Budget, Scholarships, and Course fit.', values: { PRO: '5–7 universities from Global Top 500 universities', PREMIUM: '10–12 universities from Global Top 200 universities', PLATINUM: '15–20 universities from Global Top 100 universities' } },
  { area: 'Change in University Shortlisting', description: 'Students can ask for change in university options provided, but should not exceed the options mentioned above.', values: { PRO: '01 Change', PREMIUM: '02 Changes', PLATINUM: '04 Changes' } },
  { area: 'One-on-One Counselling', description: 'Dedicated expert guidance at every milestone of the process.', values: { PRO: '✓', PREMIUM: '✓', PLATINUM: '✓ Senior Expert Panel on need basis' } },
  { area: 'Query Response Time', description: 'Get timely response from counseling or operation team, excluding weekly off / holidays.', values: { PRO: 'Within 48 working hours', PREMIUM: 'Within 24 working hours', PLATINUM: 'Within 12 working hours' } },
  { area: 'Documentation Guidance', description: 'SOPs, LORs, CVs, Transcripts-expert review and editing.', values: { PRO: 'Basic Review', PREMIUM: 'Professional Drafting', PLATINUM: 'Premium Design & Editing' } },
  { area: 'SOP (Statement of Purpose)', description: 'Highlight strengths, goals, and aspirations with compelling narrative.', values: { PRO: 'Review & Drafting + 2 revisions', PREMIUM: 'Basic Drafting + 2 revisions', PLATINUM: 'Premium Writing & Strategy + 5 revisions' } },
  { area: 'Letters of Recommendation', description: 'Structuring and drafting effective recommendation letters.', values: { PRO: 'Review Only + 01 Revision', PREMIUM: 'Basic Drafting + 02 Revisions', PLATINUM: 'Premium Writing & Strategy + 03 Revisions' } },
  { area: 'Resume/CV Development', description: 'Crafting academic/professional resume for global universities.', values: { PRO: 'Review Only + 01 Revision', PREMIUM: 'Basic Drafting + 02 Revisions', PLATINUM: 'Custom Design + Premium Writing & Strategy + 03 Revisions' } },
  { area: 'Application Submission', description: 'Complete support with online/offline applications.', values: { PRO: '3–5 Universities', PREMIUM: '5–7 Universities', PLATINUM: '12–15 Universities' } },
  { area: 'Entrance Exam (SAT/GRE/GMAT)', description: 'Guidance and coaching support (where applicable).', values: { PRO: 'Guidance Only', PREMIUM: 'Guidance Only', PLATINUM: 'Guidance + Online Live Coaching' } },
  { area: 'IELTS/TOEFL/PTE Support', description: 'Language test prep with practice materials and coaching.', values: { PRO: 'Guidance Only', PREMIUM: 'Guidance Only', PLATINUM: 'Guidance + Online Live Coaching' } },
  { area: 'Additional Essays & Interviews', description: 'Support for university-specific essays, supplementary questions, and mock interviews.', values: { PRO: 'Review Only', PREMIUM: 'Drafting + 1 Mock', PLATINUM: 'Premium Drafting + Multiple Mocks' } },
  { area: 'Portfolio designing for creative programs', description: 'Identifying the need for creative portfolio and sourcing the resource for portfolio review and designing.', values: { PRO: 'Guidance + Designing at cost', PREMIUM: 'Guidance + Designing at cost', PLATINUM: 'Guidance by experts + Designing at cost' } },
  { area: 'Scholarship Assistance', description: 'Identification of scholarship opportunities and help in applying.', values: { PRO: '✗', PREMIUM: '✓', PLATINUM: '✓' } },
  { area: 'Offer Evaluation & Admission Acceptance & Seat Blocking', description: 'Support in evaluating conditional/unconditional offers and documentation.', values: { PRO: '✓', PREMIUM: '✓', PLATINUM: '✓' } },
  { area: 'One-to-One Scheduled Meeting', description: 'Personalized Review or general meeting with parents and students during admission process.', values: { PRO: '02 online / face to face meeting of 45 mins each', PREMIUM: '04 online / face to face meeting of 45 mins each', PLATINUM: 'Upto 10 online / face to face meeting of 45 mins each' } },
  { area: 'Visa Documentation Support', description: 'End-to-end visa documentation, SOPs, checklist, financial proofs.', values: { PRO: '✓ Guidance', PREMIUM: '✓ Guided & Reviewed', PLATINUM: '✓ Personalised Review & Filing' } },
  { area: 'Visa Appointment & Application Filing', description: 'Assistance with scheduling and submitting visa application.', values: { PRO: '✗', PREMIUM: '✓ Only Appointment', PLATINUM: '✓ Applied by Experts' } },
  { area: 'Visa Interview Preparation', description: 'Country-specific mock interview and question bank.', values: { PRO: '✓ Basic Tips', PREMIUM: '1 Mock Interview', PLATINUM: '3 Mock Interview with Feedback' } },
  { area: 'Education Loan Support', description: 'Tie-up with banks/NBFCs for education loan facilitation.', values: { PRO: '3 Options Suggested', PREMIUM: '5 Loan Options', PLATINUM: 'Unlimited Guidance + Negotiation Help' } },
  { area: 'Progress Charting', description: 'Access to a progress-tracking for applications, deadlines, and counselor notes.', values: { PRO: '24X7 access to track progress', PREMIUM: '24X7 access to track progress', PLATINUM: '24X7 access to track progress' } },
  { area: 'Financial Planning (Blocked Account, Forex, Insurance)', description: 'Support with international remittance, GIC, travel insurance, health cover.', values: { PRO: 'Basic Guidance', PREMIUM: 'Full Support', PLATINUM: 'Customised Plan & Partnered Services' } },
  { area: 'Accommodation Assistance', description: 'Student housing portal access + local connects.', values: { PRO: 'Guided Search', PREMIUM: 'Guided and Customized Search', PLATINUM: 'End-to-End Assistance in procuring house' } },
  { area: 'Pre-Departure Briefing', description: 'Cultural orientation, checklist, travel hacks, legal tips.', values: { PRO: 'Email Guidance', PREMIUM: '1 Personal Session', PLATINUM: '3 Personalized sessions' } },
  { area: 'Local Partner Discounts', description: 'Negotiated discounts on banking, insurance, and remittance fees.', values: { PRO: 'Basic Tips Only', PREMIUM: 'Upto 3 Partner Discounts', PLATINUM: 'Up to 3 Partner Discounts' } },
  { area: 'Airport Pickup & Temporary Stay Help', description: 'First week support upon landing (subject to location).', values: { PRO: '✗', PREMIUM: '✗', PLATINUM: '✓ Included at cost (Partner-Supported)' } },
  { area: 'Part-Time Job & Resume Orientation', description: 'Guidance on part-time work, local resume format, job sites.', values: { PRO: '✗', PREMIUM: '✓ Basic Tips', PLATINUM: '✓ Complete Guidance' } },
];

export const COACHING_CLASSES_FEATURES: ServiceFeature[] = [];

export const EDUCATION_PLANNING_FEATURES: ServiceFeature[] = [
  { area: 'Brainography Assessment Report', description: 'Scientific assessment to identify career interests, academic strengths, and potential.', values: { PRO: '✓', PREMIUM: '✓', PLATINUM: '✓ + MBTI Test' } },
  { area: 'Counseling Sessions', description: 'One-on-one expert counseling sessions for personalized education planning.', values: { PRO: '01 Session of 60 minutes', PREMIUM: '01 Session of 90 minutes', PLATINUM: '03 Sessions of 90 minutes each' } },
  { area: 'Education Portfolio', description: 'Comprehensive three-year education portfolio with structured planning.', values: { PRO: '✗', PREMIUM: '✓ Three Years Planning', PLATINUM: '✓ Three Years Planning' } },
  { area: 'Activity Management Book', description: 'Structured activity management book for tracking and planning extracurriculars.', values: { PRO: '✗', PREMIUM: 'Activity Management Book - 01', PLATINUM: 'Activity Management Book - 01' } },
];

export const SERVICE_FEATURES: Record<string, ServiceFeature[]> = {
  'study-abroad': STUDY_ABROAD_FEATURES,
  'education-planning': EDUCATION_PLANNING_FEATURES,
  'coaching-classes': COACHING_CLASSES_FEATURES,
};

export function getServiceFeatures(serviceSlug: string): ServiceFeature[] {
  return SERVICE_FEATURES[serviceSlug] || [];
}
