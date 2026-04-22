'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { referralAPI } from '@/lib/api';
import { SERVICE_TYPE } from '@/types';
import AuthImage from '@/components/AuthImage';
import toast, { Toaster } from 'react-hot-toast';
import Link from 'next/link';

interface ReferralInfo {
  referrerName: string;
  adminName: string;
  companyName: string;
  companyLogo: string | null;
  services: string[];
}

export default function PublicReferralFormPage() {
  const params = useParams();
  const referralSlug = params.referralSlug as string;

  const [referralInfo, setReferralInfo] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    city: '',
    serviceTypes: [] as string[],
    intake: '',
    year: '',
    parentFirstName: '',
    parentMiddleName: '',
    parentLastName: '',
    parentRelationship: '',
    parentMobile: '',
    parentEmail: '',
    parentQualification: '',
    parentOccupation: '',
  });

  const INTAKE_REQUIRED_SERVICES = [
    SERVICE_TYPE.CAREER_FOCUS_STUDY_ABROAD,
    SERVICE_TYPE.IVY_LEAGUE_ADMISSION,
    SERVICE_TYPE.COACHING_CLASSES,
  ];

  const showIntakeYear = formData.serviceTypes.some(s =>
    INTAKE_REQUIRED_SERVICES.includes(s as SERVICE_TYPE)
  );

  const intakeOptions = [
    'Spring', 'Summer', 'Fall', 'Winter',
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 6 }, (_, i) => String(currentYear + i));

  useEffect(() => {
    fetchReferralInfo();
  }, [referralSlug]);

  const fetchReferralInfo = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await referralAPI.getReferralInfo(referralSlug);
      setReferralInfo(response.data.data);
    } catch (error: any) {
      console.error('Error fetching referral info:', error);
      if (error.response?.status === 404) {
        setError('This referral link does not exist or has been removed.');
      } else if (error.response?.status === 410) {
        setError('This referral link is no longer active.');
      } else {
        setError('Unable to load the referral form. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (service: string) => {
    setFormData(prev => {
      const isSelected = prev.serviceTypes.includes(service);
      if (isSelected) {
        return { ...prev, serviceTypes: prev.serviceTypes.filter(s => s !== service) };
      } else {
        return { ...prev, serviceTypes: [...prev.serviceTypes, service] };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.firstName.trim()) { toast.error('Please enter your first name'); return; }
    if (!formData.lastName.trim()) { toast.error('Please enter your last name'); return; }
    if (!formData.email.trim()) { toast.error('Please enter your email'); return; }
    if (!formData.mobileNumber.trim()) { toast.error('Please enter your mobile number'); return; }
    if (!formData.city.trim()) { toast.error('Please enter your city'); return; }
    if (formData.serviceTypes.length === 0) { toast.error('Please select at least one service'); return; }

    if (showIntakeYear) {
      if (!formData.intake) { toast.error('Please select an intake'); return; }
      if (!formData.year) { toast.error('Please select a year'); return; }
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { toast.error('Please enter a valid email address'); return; }

    const phoneDigits = formData.mobileNumber.replace(/\D/g, '');
    if (phoneDigits.length < 10) { toast.error('Please enter a valid mobile number (at least 10 digits)'); return; }

    if (!formData.parentFirstName.trim()) { toast.error('Please enter parent first name'); return; }
    if (!formData.parentLastName.trim()) { toast.error('Please enter parent last name'); return; }
    if (!formData.parentRelationship) { toast.error('Please select relationship with student'); return; }
    if (!formData.parentMobile.trim()) { toast.error('Please enter parent mobile number'); return; }
    const parentPhoneDigits = formData.parentMobile.replace(/\D/g, '');
    if (parentPhoneDigits.length < 10) { toast.error('Please enter a valid parent mobile number'); return; }
    if (!formData.parentEmail.trim()) { toast.error('Please enter parent email address'); return; }
    if (!emailRegex.test(formData.parentEmail)) { toast.error('Please enter a valid parent email address'); return; }
    if (!formData.parentQualification.trim()) { toast.error('Please enter parent qualification'); return; }
    if (!formData.parentOccupation.trim()) { toast.error('Please enter parent occupation'); return; }

    const fullName = [formData.firstName.trim(), formData.middleName.trim(), formData.lastName.trim()]
      .filter(Boolean)
      .join(' ');

    try {
      setSubmitting(true);
      await referralAPI.submitReferralEnquiry(referralSlug, {
        name: fullName,
        email: formData.email.trim().toLowerCase(),
        mobileNumber: formData.mobileNumber.trim(),
        city: formData.city.trim(),
        serviceTypes: formData.serviceTypes,
        ...(showIntakeYear && { intake: formData.intake, year: formData.year }),
        parentDetail: {
          firstName: formData.parentFirstName.trim(),
          middleName: formData.parentMiddleName.trim(),
          lastName: formData.parentLastName.trim(),
          relationship: formData.parentRelationship,
          mobileNumber: formData.parentMobile.trim(),
          email: formData.parentEmail.trim().toLowerCase(),
          qualification: formData.parentQualification.trim(),
          occupation: formData.parentOccupation.trim(),
        },
      });
      setSubmitted(true);
      toast.success('Your enquiry has been submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting referral enquiry:', error);
      toast.error(error.response?.data?.message || 'Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
          >
            Go to Homepage
          </Link>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-indigo-100 p-4">
        <Toaster position="top-right" />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h1>
          <p className="text-gray-600 mb-6">
            Your enquiry has been submitted successfully. Our team will contact you shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 py-12 px-4">
      <Toaster position="top-right" />

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <AuthImage
            path={referralInfo?.companyLogo}
            alt={referralInfo?.companyName || 'Company Logo'}
            className="w-24 h-24 rounded-2xl object-cover mx-auto mb-4 shadow-lg border border-gray-200"
            fallback={
              <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-purple-500/30">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
            }
          />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Get in Touch with {referralInfo?.companyName || 'Us'}
          </h1>
          <p className="text-gray-500 text-lg">
            Referred by <span className="font-semibold text-purple-600">{referralInfo?.referrerName}</span>
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 p-10 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Details */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-1">Student Details</h3>
              <p className="text-sm text-gray-500 mb-4">Please provide the student&apos;s information.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="First name" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
              <div>
                <label htmlFor="middleName" className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>
                <input type="text" id="middleName" name="middleName" value={formData.middleName} onChange={handleInputChange} placeholder="Middle name" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Last name" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} placeholder="Enter your email address" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input type="tel" id="mobileNumber" name="mobileNumber" value={formData.mobileNumber} onChange={handleInputChange} placeholder="Enter your mobile number" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
              <div>
                <label htmlFor="city" className="block text-sm font-semibold text-gray-700 mb-2">
                  City <span className="text-red-500">*</span>
                </label>
                <input type="text" id="city" name="city" value={formData.city} onChange={handleInputChange} placeholder="Enter your city" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
            </div>

            {/* Parent Details */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Parent Details</h3>
              <p className="text-sm text-gray-500 mb-4">Please provide the parent / guardian&apos;s information.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="parentFirstName" className="block text-sm font-semibold text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input type="text" id="parentFirstName" name="parentFirstName" value={formData.parentFirstName} onChange={handleInputChange} placeholder="Enter first name" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
              <div>
                <label htmlFor="parentMiddleName" className="block text-sm font-semibold text-gray-700 mb-2">Middle Name</label>
                <input type="text" id="parentMiddleName" name="parentMiddleName" value={formData.parentMiddleName} onChange={handleInputChange} placeholder="Enter middle name" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" />
              </div>
              <div>
                <label htmlFor="parentLastName" className="block text-sm font-semibold text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input type="text" id="parentLastName" name="parentLastName" value={formData.parentLastName} onChange={handleInputChange} placeholder="Enter last name" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label htmlFor="parentRelationship" className="block text-sm font-semibold text-gray-700 mb-2">
                  Relationship with Student <span className="text-red-500">*</span>
                </label>
                <select id="parentRelationship" name="parentRelationship" value={formData.parentRelationship} onChange={handleInputChange} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900" required>
                  <option value="">Select Relationship</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                </select>
              </div>
              <div>
                <label htmlFor="parentMobile" className="block text-sm font-semibold text-gray-700 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input type="tel" id="parentMobile" name="parentMobile" value={formData.parentMobile} onChange={handleInputChange} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div>
                <label htmlFor="parentEmail" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input type="email" id="parentEmail" name="parentEmail" value={formData.parentEmail} onChange={handleInputChange} placeholder="parent@example.com" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
              <div>
                <label htmlFor="parentQualification" className="block text-sm font-semibold text-gray-700 mb-2">
                  Qualification <span className="text-red-500">*</span>
                </label>
                <input type="text" id="parentQualification" name="parentQualification" value={formData.parentQualification} onChange={handleInputChange} placeholder="e.g., Bachelor's in Commerce" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
              <div>
                <label htmlFor="parentOccupation" className="block text-sm font-semibold text-gray-700 mb-2">
                  Occupation <span className="text-red-500">*</span>
                </label>
                <input type="text" id="parentOccupation" name="parentOccupation" value={formData.parentOccupation} onChange={handleInputChange} placeholder="e.g., Business, Government Service" className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900 placeholder:text-gray-400" required />
              </div>
            </div>

            {/* Services */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-1">Services</h3>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Services Interested In <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {referralInfo?.services?.map((service) => (
                  <label
                    key={service}
                    className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.serviceTypes.includes(service)
                        ? 'border-purple-500 bg-purple-50 shadow-sm shadow-purple-100'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={formData.serviceTypes.includes(service)}
                      onChange={() => handleServiceToggle(service)}
                      className="w-5 h-5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <span className="text-gray-900 font-medium">{service}</span>
                  </label>
                ))}
              </div>
              {formData.serviceTypes.length > 0 && (
                <p className="text-sm text-purple-600 mt-3 font-medium">
                  {formData.serviceTypes.length} service{formData.serviceTypes.length > 1 ? 's' : ''} selected
                </p>
              )}
              <p className="text-sm text-gray-400 mt-2">You can select multiple options</p>
            </div>

            {showIntakeYear && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="year" className="block text-sm font-semibold text-gray-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select id="year" name="year" value={formData.year} onChange={handleInputChange} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900" required>
                    <option value="">Select Year</option>
                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label htmlFor="intake" className="block text-sm font-semibold text-gray-700 mb-2">
                    Intake <span className="text-red-500">*</span>
                  </label>
                  <select id="intake" name="intake" value={formData.intake} onChange={handleInputChange} className="w-full px-4 py-3.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-gray-900" required>
                    <option value="">Select Intake</option>
                    {intakeOptions.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-700 hover:to-indigo-700 focus:ring-4 focus:ring-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  <span>Submit Enquiry</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-400">
              By submitting this form, you agree to be contacted by our team regarding your enquiry.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
