'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ivyLeagueRegistrationAPI } from '@/lib/api';
import toast, { Toaster } from 'react-hot-toast';

const CURRICULUM_OPTIONS = [
  { value: 'CBSE', label: 'CBSE' },
  { value: 'State Board', label: 'State Board' },
  { value: 'ICSE', label: 'ICSE' },
  { value: 'IGCSE', label: 'IGCSE' },
  { value: 'International Baccalaureate', label: 'International Baccalaureate' },
  { value: 'Cambridge', label: 'Cambridge' },
];

const COUNTRY_CODES = [
  { code: '+91', label: '+91 (India)' },
  { code: '+1', label: '+1 (USA/Canada)' },
  { code: '+44', label: '+44 (UK)' },
  { code: '+61', label: '+61 (Australia)' },
  { code: '+971', label: '+971 (UAE)' },
  { code: '+65', label: '+65 (Singapore)' },
  { code: '+81', label: '+81 (Japan)' },
  { code: '+49', label: '+49 (Germany)' },
  { code: '+33', label: '+33 (France)' },
  { code: '+86', label: '+86 (China)' },
];

const ONLY_LETTERS_RE = /^[a-zA-Z\s'-]+$/;
const DIGITS_ONLY_RE = /^\d+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormData {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  mobile: string;
  parentFirstName: string;
  parentMiddleName: string;
  parentLastName: string;
  parentMobileCode: string;
  parentMobileNumber: string;
  parentEmail: string;
  schoolName: string;
  curriculum: string;
  currentGrade: string;
}

interface FormErrors {
  parentFirstName?: string;
  parentMiddleName?: string;
  parentLastName?: string;
  parentMobileCode?: string;
  parentMobileNumber?: string;
  parentEmail?: string;
  schoolName?: string;
  curriculum?: string;
  currentGrade?: string;
}

function validate(data: FormData): FormErrors {
  const errors: FormErrors = {};

  if (!data.parentFirstName.trim()) {
    errors.parentFirstName = 'Parent first name is required';
  } else if (!ONLY_LETTERS_RE.test(data.parentFirstName.trim())) {
    errors.parentFirstName = 'Only letters, spaces, hyphens and apostrophes are allowed';
  }

  if (data.parentMiddleName.trim() && !ONLY_LETTERS_RE.test(data.parentMiddleName.trim())) {
    errors.parentMiddleName = 'Only letters, spaces, hyphens and apostrophes are allowed';
  }

  if (!data.parentLastName.trim()) {
    errors.parentLastName = 'Parent last name is required';
  } else if (!ONLY_LETTERS_RE.test(data.parentLastName.trim())) {
    errors.parentLastName = 'Only letters, spaces, hyphens and apostrophes are allowed';
  }

  if (!data.parentMobileCode) {
    errors.parentMobileCode = 'Select a country code';
  }

  if (!data.parentMobileNumber.trim()) {
    errors.parentMobileNumber = 'Mobile number is required';
  } else if (!DIGITS_ONLY_RE.test(data.parentMobileNumber)) {
    errors.parentMobileNumber = 'Only digits are allowed — no letters or special characters';
  } else if (data.parentMobileNumber.length !== 10) {
    errors.parentMobileNumber = 'Mobile number must be exactly 10 digits';
  }

  if (!data.parentEmail.trim()) {
    errors.parentEmail = 'Parent email is required';
  } else if (!EMAIL_RE.test(data.parentEmail.trim())) {
    errors.parentEmail = 'Please enter a valid email address';
  }

  if (!data.schoolName.trim()) {
    errors.schoolName = 'School name is required';
  } else if (data.schoolName.trim().length < 3) {
    errors.schoolName = 'School name must be at least 3 characters';
  }

  if (!data.curriculum) {
    errors.curriculum = 'Please select a curriculum';
  }

  if (!data.currentGrade.trim()) {
    errors.currentGrade = 'Current grade is required';
  }

  return errors;
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
      <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      {message}
    </p>
  );
}

function inputCls(error?: string, extra = '') {
  const base = 'w-full px-4 py-2.5 border rounded-lg outline-none transition-all';
  const focus = 'focus:ring-2 focus:border-transparent';
  if (error) return `${base} border-red-400 ${focus} focus:ring-red-300 ${extra}`;
  return `${base} border-gray-300 ${focus} focus:ring-[#2959ba] ${extra}`;
}

export default function IvyLeagueRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    mobile: '',
    parentFirstName: '',
    parentMiddleName: '',
    parentLastName: '',
    parentMobileCode: '+91',
    parentMobileNumber: '',
    parentEmail: '',
    schoolName: '',
    curriculum: '',
    currentGrade: '',
  });

  useEffect(() => {
    fetchPrefill();
  }, []);

  const fetchPrefill = async () => {
    try {
      const response = await ivyLeagueRegistrationAPI.getPrefill();
      const { firstName, middleName, lastName, email, mobile, alreadyRegistered, advisoryBlocked } = response.data.data;

      if (advisoryBlocked) {
        toast.error('Ivy League service is not available through your advisor. Please contact your advisor for more information.');
        router.push('/dashboard');
        return;
      }

      if (alreadyRegistered) {
        toast('You have already registered for Ivy League. Redirecting...');
        router.push('/ivy-league/instructions');
        return;
      }

      setFormData((prev) => ({
        ...prev,
        firstName: firstName || '',
        middleName: middleName || '',
        lastName: lastName || '',
        email: email || '',
        mobile: mobile || '',
      }));
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to load student details';
      toast.error(message);
      if (error.response?.status === 401 || error.response?.status === 403) {
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    // Mobile number: strip non-digits and cap at 10
    if (name === 'parentMobileNumber') {
      const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, parentMobileNumber: digitsOnly }));
      if (touched[name]) {
        const updated = { ...formData, parentMobileNumber: digitsOnly };
        const newErrors = validate(updated);
        setErrors((prev) => ({ ...prev, parentMobileNumber: newErrors.parentMobileNumber }));
      }
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));

    // Live re-validate only fields already touched
    if (touched[name]) {
      const updated = { ...formData, [name]: value };
      const newErrors = validate(updated);
      setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
    }
  };

  const handleBlur = (name: string) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const newErrors = validate(formData);
    setErrors((prev) => ({ ...prev, [name]: newErrors[name as keyof FormErrors] }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Touch all validatable fields
    const allTouched: Record<string, boolean> = {};
    [
      'parentFirstName', 'parentMiddleName', 'parentLastName',
      'parentMobileCode', 'parentMobileNumber', 'parentEmail',
      'schoolName', 'curriculum', 'currentGrade',
    ].forEach((f) => { allTouched[f] = true; });
    setTouched(allTouched);

    const newErrors = validate(formData);
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error('Please fix the errors before submitting');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        parentFirstName: formData.parentFirstName.trim(),
        parentMiddleName: formData.parentMiddleName.trim() || undefined,
        parentLastName: formData.parentLastName.trim(),
        parentMobile: `${formData.parentMobileCode}${formData.parentMobileNumber}`,
        parentEmail: formData.parentEmail.trim().toLowerCase(),
        schoolName: formData.schoolName.trim(),
        curriculum: formData.curriculum,
        currentGrade: formData.currentGrade.trim(),
      };

      await ivyLeagueRegistrationAPI.submit(payload);
      toast.success('Registration submitted successfully!');
      router.push('/ivy-league/instructions');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to submit registration';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading registration form...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Toaster position="top-right" />

      {/* Decorative Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative max-w-3xl mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2959ba] to-[#1e3f8a] shadow-lg mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Ivy League Registration</h1>
          <p className="text-gray-600 mt-2 text-lg">
            Please fill in the details below to register for the Ivy League service
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-8">

          {/* ── Section 1: Student Information ── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#2959ba] text-white text-sm font-bold">1</span>
              Student Information
            </h2>
            <p className="text-sm text-gray-500 mb-4 ml-9">Auto-filled from your profile - not editable</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.firstName}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  value={formData.middleName}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.lastName}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <input
                  type="text"
                  value={formData.email}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={formData.mobile}
                  readOnly
                  className="w-full px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 cursor-not-allowed focus:outline-none"
                />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* ── Section 2: Parent / Guardian Information ── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#2959ba] text-white text-sm font-bold">2</span>
              Parent / Guardian Information
            </h2>
            <p className="text-sm text-gray-500 mb-4 ml-9">Enter details of one of the parent or guardian</p>

            {/* Parent Names */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="parentFirstName"
                  value={formData.parentFirstName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('parentFirstName')}
                  placeholder="Parent's first name"
                  className={inputCls(errors.parentFirstName)}
                />
                <FieldError message={errors.parentFirstName} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                <input
                  type="text"
                  name="parentMiddleName"
                  value={formData.parentMiddleName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('parentMiddleName')}
                  placeholder="Parent's middle name"
                  className={inputCls(errors.parentMiddleName)}
                />
                <FieldError message={errors.parentMiddleName} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="parentLastName"
                  value={formData.parentLastName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('parentLastName')}
                  placeholder="Parent's last name"
                  className={inputCls(errors.parentLastName)}
                />
                <FieldError message={errors.parentLastName} />
              </div>
            </div>

            {/* Mobile + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Split Mobile Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="parentMobileCode"
                    value={formData.parentMobileCode}
                    onChange={handleChange}
                    onBlur={() => handleBlur('parentMobileCode')}
                    className={`flex-shrink-0 px-2 py-2.5 border rounded-lg outline-none transition-all text-sm bg-white focus:ring-2 focus:border-transparent ${errors.parentMobileCode ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:ring-[#2959ba]'}`}
                  >
                    {COUNTRY_CODES.map((c) => (
                      <option key={c.code} value={c.code}>{c.label}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    name="parentMobileNumber"
                    value={formData.parentMobileNumber}
                    onChange={handleChange}
                    onBlur={() => handleBlur('parentMobileNumber')}
                    placeholder="10-digit number"
                    maxLength={10}
                    inputMode="numeric"
                    className={inputCls(errors.parentMobileNumber)}
                  />
                </div>
                {errors.parentMobileCode && <FieldError message={errors.parentMobileCode} />}
                {errors.parentMobileNumber && <FieldError message={errors.parentMobileNumber} />}
                {!errors.parentMobileNumber && formData.parentMobileNumber && (
                  <p className="mt-1 text-xs text-gray-400">{formData.parentMobileNumber.length}/10 digits</p>
                )}
              </div>

              {/* Parent Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="parentEmail"
                  value={formData.parentEmail}
                  onChange={handleChange}
                  onBlur={() => handleBlur('parentEmail')}
                  placeholder="Parent's email address"
                  className={inputCls(errors.parentEmail)}
                />
                <FieldError message={errors.parentEmail} />
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* ── Section 3: School & Academic Information ── */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#2959ba] text-white text-sm font-bold">3</span>
              School &amp; Academic Information
            </h2>
            <p className="text-sm text-gray-500 mb-4 ml-9">Provide your current school and academic details</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name of School <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="schoolName"
                  value={formData.schoolName}
                  onChange={handleChange}
                  onBlur={() => handleBlur('schoolName')}
                  placeholder="Enter your school name"
                  className={inputCls(errors.schoolName)}
                />
                <FieldError message={errors.schoolName} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Curriculum (Board) <span className="text-red-500">*</span>
                </label>
                <select
                  name="curriculum"
                  value={formData.curriculum}
                  onChange={handleChange}
                  onBlur={() => handleBlur('curriculum')}
                  className={inputCls(errors.curriculum, 'bg-white')}
                >
                  <option value="">Select curriculum</option>
                  {CURRICULUM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <FieldError message={errors.curriculum} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Grade <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="currentGrade"
                  value={formData.currentGrade}
                  onChange={handleChange}
                  onBlur={() => handleBlur('currentGrade')}
                  placeholder="e.g. 8th, 9th, 10th"
                  className={inputCls(errors.currentGrade)}
                />
                <FieldError message={errors.currentGrade} />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#2959ba] to-[#1e3f8a] text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Submit Registration
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

