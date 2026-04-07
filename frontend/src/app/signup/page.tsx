'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';
import { USER_ROLE } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import { Country, State, City, ICountry, IState, ICity } from 'country-state-city';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    email: '',
    mobileNumber: '',
    role: USER_ROLE.ALUMNI,
    // Service Provider specific fields
    companyName: '',
    businessType: '',
    registrationNumber: '',
    gstNumber: '',
    businessPan: '',
    address: '',
    city: '',
    state: '',
    country: '',
    pincode: '',
    website: '',
    servicesOffered: '',
    coachingTests: [] as string[],
  });
  const [selectedCountry, setSelectedCountry] = useState<ICountry | null>(null);
  const [selectedState, setSelectedState] = useState<IState | null>(null);
  const [selectedCity, setSelectedCity] = useState<ICity | null>(null);
  const [otp, setOtp] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [step, setStep] = useState<'signup' | 'verify-otp'>('signup');
  const [loading, setLoading] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [userMobileNumber, setUserMobileNumber] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userServiceProviderData, setUserServiceProviderData] = useState<{
    companyName: string;
    businessType: string;
    registrationNumber: string;
    gstNumber: string;
    businessPan: string;
    address: string;
    city: string;
    state: string;
    country: string;
    pincode: string;
    website: string;
    servicesOffered: string;
    coachingTests: string[];
  } | null>(null);

  // Fetch captcha from server
  const fetchCaptcha = async () => {
    try {
      const res = await authAPI.getCaptcha();
      setCaptchaToken(res.data.data.token);
      setCaptchaQuestion(res.data.data.question);
      setCaptchaAnswer('');
    } catch {
      toast.error('Failed to load captcha');
    }
  };

  useEffect(() => {
    if (step === 'signup') {
      fetchCaptcha();
    }
  }, [step]);

  const handleRegenerateCaptcha = () => {
    fetchCaptcha();
    toast.success('Captcha regenerated!');
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email) {
      toast.error('Please enter your email');
      return;
    }

    if (!captchaToken || !captchaQuestion) {
      toast.error('Please wait for captcha to load');
      return;
    }

    if (!captchaAnswer) {
      toast.error('Please enter the captcha answer');
      return;
    }

    setLoading(true);

    try {
      const response = await authAPI.signup({ 
        ...formData, 
        captchaToken,
        captchaAnswer
      });
      const message = response.data.message || 'OTP sent to your email!';
      toast.success(message, { duration: 4000 });
      setUserEmail(formData.email);
      setUserMobileNumber(formData.mobileNumber);
      setUserRole(formData.role);
      
      // Store Service Provider data if applicable
      if (formData.role === USER_ROLE.SERVICE_PROVIDER) {
        setUserServiceProviderData({
          companyName: formData.companyName,
          businessType: formData.businessType,
          registrationNumber: formData.registrationNumber,
          gstNumber: formData.gstNumber,
          businessPan: formData.businessPan,
          address: formData.address,
          city: formData.city,
          state: formData.state,
          country: formData.country,
          pincode: formData.pincode,
          website: formData.website,
          servicesOffered: formData.servicesOffered,
          coachingTests: formData.coachingTests,
        });
      }
      
      localStorage.removeItem('signup_captcha');
      setStep('verify-otp');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Signup failed. Please try again.';
      toast.error(message);
      // Regenerate captcha on error (old token is consumed)
      fetchCaptcha();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const otpData: any = { 
        email: userEmail, 
        otp, 
        mobileNumber: userMobileNumber 
      };
      
      // Add Service Provider fields if applicable
      if (userRole === USER_ROLE.SERVICE_PROVIDER && userServiceProviderData) {
        Object.assign(otpData, userServiceProviderData);
      }
      
      const response = await authAPI.verifySignupOTP(otpData);
      const message = response.data.message || 'OTP verified! Check your email for verification link.';
      toast.success(message, { duration: 4000 });
      
      // If student, redirect to dashboard (auto-verified)
      // Otherwise, show pending approval message
      if (response.data.data.user?.isVerified) {
        // Store token if provided
        if (response.data.data.token) {
          localStorage.setItem('token', response.data.data.token);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        }
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        // Show pending approval message
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (error: any) {
      const message = error.response?.data?.message || 'Invalid OTP. Please try again.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { value: USER_ROLE.ALUMNI, label: 'Alumni', icon: '🎖️', color: 'from-purple-500 to-pink-500' },
    { value: USER_ROLE.SERVICE_PROVIDER, label: 'Service Provider', icon: '🏢', color: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      <div className="relative max-w-3xl w-full">
        {/* Header */}
        <div className="text-center mb-10 animate-fade-in">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl shadow-2xl mb-5 transform hover:scale-105 transition-transform">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <h2 className="text-5xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">
            Create Account
          </h2>
          <p className="text-gray-700 text-lg">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-700 transition-colors underline decoration-2 underline-offset-2">
              Sign in
            </Link>
          </p>
        </div>

        {/* Signup Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 border border-gray-100 animate-scale-in backdrop-blur-sm bg-opacity-95">
          {step === 'signup' ? (
            <>
            <form onSubmit={handleSignup} className="space-y-5">
            {/* Name Fields - 3 in one row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* First Name Input */}
              <div>
                <label htmlFor="firstName" className="block text-sm font-bold text-gray-900 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="block w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                  placeholder="John"
                />
              </div>

              {/* Middle Name Input */}
              <div>
                <label htmlFor="middleName" className="block text-sm font-bold text-gray-900 mb-2">
                  Middle Name <span className="text-gray-400 font-normal text-xs">(Optional)</span>
                </label>
                <input
                  id="middleName"
                  name="middleName"
                  type="text"
                  value={formData.middleName}
                  onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                  className="block w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                  placeholder="Optional"
                />
              </div>

              {/* Last Name Input */}
              <div>
                <label htmlFor="lastName" className="block text-sm font-bold text-gray-900 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="block w-full px-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                  placeholder="Doe"
                />
              </div>
            </div>

            {/* Email and Phone Number - 2 in second row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Email Input */}
              <div>
                <label htmlFor="email" className="block text-sm font-bold text-gray-900 mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Mobile Number Input */}
              <div>
                <label htmlFor="mobileNumber" className="block text-sm font-bold text-gray-900 mb-2">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                  <input
                    id="mobileNumber"
                    name="mobileNumber"
                    type="tel"
                    required
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                    className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-gray-50 hover:bg-white"
                    placeholder="+1 234 567 8900"
                  />
                </div>
              </div>
            </div>


            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Select Your Role
              </label>
              <div className="grid grid-cols-2 gap-4">
                {roleOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: option.value })}
                    className={`relative p-5 border-2 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
                      formData.role === option.value
                        ? `border-transparent bg-gradient-to-br ${option.color} text-white shadow-xl scale-105`
                        : 'border-gray-200 bg-white text-gray-900 hover:border-blue-400 hover:shadow-md'
                    }`}
                  >
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-4xl mb-2">{option.icon}</div>
                      <div className="text-sm font-bold">{option.label}</div>
                    </div>
                    {formData.role === option.value && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Provider Additional Fields */}
            {formData.role === USER_ROLE.SERVICE_PROVIDER && (
              <div className="space-y-5 border-2 border-blue-200 rounded-2xl p-6 bg-blue-50">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Service Provider Details</h3>
                
                {/* Company Name and Business Type */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="companyName" className="block text-sm font-bold text-gray-900 mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                      placeholder="Enter company name"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="businessType" className="block text-sm font-bold text-gray-900 mb-2">
                      Business Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="businessType"
                      name="businessType"
                      required
                      value={formData.businessType}
                      onChange={(e) => setFormData({ ...formData, businessType: e.target.value })}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 bg-white"
                    >
                      <option value="">Select business type</option>
                      <option value="Individual">Individual</option>
                      <option value="Sole Proprietors">Sole Proprietors</option>
                      <option value="Partnership Firm">Partnership Firm</option>
                      <option value="Private Ltd. Company">Private Ltd. Company</option>
                      <option value="Public Ltd. Company">Public Ltd. Company</option>
                      <option value="Limited Liability Partnership (LLP)">Limited Liability Partnership (LLP)</option>
                      <option value="Trust, Association, Society, Club">Trust, Association, Society, Club</option>
                      <option value="Government Entity">Government Entity</option>
                    </select>
                  </div>
                </div>

                {/* Registration Number and Website */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="registrationNumber" className="block text-sm font-bold text-gray-900 mb-2">
                      Registration Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="registrationNumber"
                      name="registrationNumber"
                      type="text"
                      required
                      value={formData.registrationNumber}
                      onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                      placeholder="Enter registration number"
                    />
                  </div>
                
                  <div>
                    <label htmlFor="website" className="block text-sm font-bold text-gray-900 mb-2">
                      Website <span className="text-gray-500">(Optional)</span>
                    </label>
                    <input
                      id="website"
                      name="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                {/* GST Number and Business PAN */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="gstNumber" className="block text-sm font-bold text-gray-900 mb-2">
                      GST Number <span className="text-gray-500">(Optional)</span>
                    </label>
                    <input
                      id="gstNumber"
                      name="gstNumber"
                      type="text"
                      value={formData.gstNumber}
                      onChange={(e) => setFormData({ ...formData, gstNumber: e.target.value })}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                      placeholder="Enter GST number"
                    />
                  </div>

                  <div>
                    <label htmlFor="businessPan" className="block text-sm font-bold text-gray-900 mb-2">
                      Business PAN <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="businessPan"
                      name="businessPan"
                      type="text"
                      required
                      value={formData.businessPan}
                      onChange={(e) => setFormData({ ...formData, businessPan: e.target.value.toUpperCase() })}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                      placeholder="e.g. ABCDE1234F"
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label htmlFor="address" className="block text-sm font-bold text-gray-900 mb-2">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    required
                    rows={3}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white resize-none"
                    placeholder="Enter full address"
                  />
                </div>

                {/* Country and State */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="country" className="block text-sm font-bold text-gray-900 mb-2">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      name="country"
                      required
                      value={selectedCountry?.isoCode || ''}
                      onChange={(e) => {
                        const country = Country.getAllCountries().find(c => c.isoCode === e.target.value) || null;
                        setSelectedCountry(country);
                        setSelectedState(null);
                        setSelectedCity(null);
                        setFormData({ ...formData, country: country?.name || '', state: '', city: '' });
                      }}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 bg-white"
                    >
                      <option value="">Select country</option>
                      {Country.getAllCountries().map((c) => (
                        <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="state" className="block text-sm font-bold text-gray-900 mb-2">
                      State <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="state"
                      name="state"
                      required
                      value={selectedState?.isoCode || ''}
                      onChange={(e) => {
                        const states = selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : [];
                        const state = states.find(s => s.isoCode === e.target.value) || null;
                        setSelectedState(state);
                        setSelectedCity(null);
                        setFormData({ ...formData, state: state?.name || '', city: '' });
                      }}
                      disabled={!selectedCountry}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select state</option>
                      {selectedCountry && State.getStatesOfCountry(selectedCountry.isoCode).map((s) => (
                        <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* City and Pincode */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="city" className="block text-sm font-bold text-gray-900 mb-2">
                      City <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="city"
                      name="city"
                      required
                      value={selectedCity?.name || ''}
                      onChange={(e) => {
                        const cities = selectedCountry && selectedState ? City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode) : [];
                        const city = cities.find(c => c.name === e.target.value) || null;
                        setSelectedCity(city);
                        setFormData({ ...formData, city: city?.name || '' });
                      }}
                      disabled={!selectedState}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                    >
                      <option value="">Select city</option>
                      {selectedCountry && selectedState && City.getCitiesOfState(selectedCountry.isoCode, selectedState.isoCode).map((c) => (
                        <option key={c.name} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="pincode" className="block text-sm font-bold text-gray-900 mb-2">
                      Pincode <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="pincode"
                      name="pincode"
                      type="text"
                      required
                      value={formData.pincode}
                      onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                      className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 bg-white"
                      placeholder="Enter pincode"
                    />
                  </div>
                </div>

                {/* Services Offered Dropdown */}
                <div>
                  <label htmlFor="servicesOffered" className="block text-sm font-bold text-gray-900 mb-2">
                    Services Offered <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="servicesOffered"
                    name="servicesOffered"
                    required
                    value={formData.servicesOffered}
                    onChange={(e) => setFormData({ ...formData, servicesOffered: e.target.value })}
                    className="block w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 bg-white"
                  >
                    <option value="">Select a service</option>
                    <option value="SOP/LOR/Resume writer">SOP/LOR/Resume writer</option>
                    <option value="Coaching Classes">Coaching Classes</option>
                    <option value="Portfolio Designer">Portfolio Designer</option>
                    <option value="Student Education Loan">Student Education Loan</option>
                    <option value="Travel and Visa Agent">Travel and Visa Agent</option>
                    <option value="Forex/GIC/Blocked Account">Forex/GIC/Blocked Account</option>
                    <option value="Travel and Medical Insurance">Travel and Medical Insurance</option>
                    <option value="Housing">Housing</option>
                    <option value="Medical Checkup">Medical Checkup</option>
                    <option value="International SIM Card">International SIM Card</option>
                  </select>
                </div>

                {/* Coaching Classes Tests - shown only if Coaching Classes is selected */}
                {formData.servicesOffered === "Coaching Classes" && (
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-2">
                      Select Tests You Offer Coaching For <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['IELTS', 'TOEFL', 'GRE', 'GMAT', 'SAT', 'ACT', 'PTE', 'Duolingo'].map((test) => (
                        <label
                          key={test}
                          className="flex items-center space-x-2 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:bg-blue-50 transition-all duration-200"
                        >
                          <input
                            type="checkbox"
                            checked={formData.coachingTests.includes(test)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData({
                                  ...formData,
                                  coachingTests: [...formData.coachingTests, test]
                                });
                              } else {
                                setFormData({
                                  ...formData,
                                  coachingTests: formData.coachingTests.filter(t => t !== test)
                                });
                              }
                            }}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-900">{test}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                
              </div>
            )}

            {/* Captcha Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Solve to verify
              </label>
              <div className="space-y-3">
                {/* Display Math Question */}
                {captchaQuestion ? (
                  <div className="bg-gradient-to-r from-gray-100 via-gray-200 to-gray-100 border-2 border-gray-400 rounded-xl p-4 relative overflow-hidden">
                    <div className="flex items-center justify-center relative">
                      <span 
                        className="text-2xl font-bold text-gray-800 select-none tracking-wide"
                        style={{ fontFamily: 'monospace' }}
                      >
                        {captchaQuestion}
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Captcha Answer Input */}
                {captchaQuestion && (
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <input
                      type="number"
                      required
                      value={captchaAnswer}
                      onChange={(e) => setCaptchaAnswer(e.target.value)}
                      className="block w-full pl-12 pr-4 py-3.5 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-gray-900 placeholder-gray-400 text-center font-semibold bg-gray-50 hover:bg-white"
                      placeholder="Your answer"
                    />
                  </div>
                )}

                {/* Regenerate Button */}
                  {captchaQuestion && (
                    <button
                      type="button"
                      onClick={handleRegenerateCaptcha}
                      className="w-full py-2 px-4 bg-white border-2 border-purple-600 text-purple-600 hover:bg-purple-50 font-semibold rounded-xl shadow-sm hover:shadow-md transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      New Question
                    </button>
                  )}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold text-lg rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-glow"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending OTP...
                </span>
              ) : (
                'Send OTP'
              )}
            </button>
          </form>

            </>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="text-center mb-6">
                <div className="inline-block p-3 bg-gradient-to-br from-green-600 to-emerald-600 rounded-2xl shadow-xl mb-4">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Verify OTP</h3>
                <p className="text-gray-600">
                  Enter the 6-digit code sent to <span className="font-semibold">{userEmail}</span>
                </p>
              </div>

              {/* OTP Input */}
              <div>
                <label htmlFor="otp" className="block text-sm font-semibold text-gray-700 mb-2">
                  Enter OTP Code
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="block w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-400 text-center text-2xl font-bold tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <p className="mt-2 text-xs text-gray-500">Check your email for the 6-digit code</p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none btn-glow"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  'Verify OTP'
                )}
              </button>

              {/* Back Button */}
              <button
                type="button"
                onClick={() => {
                  setStep('signup');
                  setOtp('');
                  setCaptchaAnswer('');
                  fetchCaptcha();
                }}
                className="w-full py-2 px-4 text-gray-600 hover:text-gray-800 font-medium rounded-xl transition-colors"
              >
                ← Back to Signup
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

