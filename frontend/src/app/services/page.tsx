'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { serviceAPI, enrollmentAPI } from '@/lib/formApi';
import { Service } from '@/types/form';

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState<string | null>(null);

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      setLoading(true);
      const response = await serviceAPI.getAll({ isActive: 'true' });
      setServices(response.data.data.services);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async (serviceId: string) => {
    try {
      setEnrolling(serviceId);
      const response = await enrollmentAPI.enroll(serviceId);
      toast.success('Successfully enrolled in service!');
      
      // Navigate to form
      const enrollmentId = response.data.data.enrollment._id;
      router.push(`/form/${enrollmentId}`);
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already enrolled')) {
        toast.error('You are already enrolled in this service');
      } else {
        toast.error(error.response?.data?.message || 'Failed to enroll');
      }
    } finally {
      setEnrolling(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Available Services
          </h1>
          <p className="text-xl text-gray-600">
            Choose a service to get started with your journey
          </p>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-2xl p-16 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No Services Available</h2>
            <p className="text-gray-600">Check back later for new services</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group"
              >
                {/* Card Header with Gradient */}
                <div className="h-32 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 relative">
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                  <div className="absolute bottom-4 left-6">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center text-3xl">
                      📚
                    </div>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 pt-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 mb-6 line-clamp-3">
                    {service.description}
                  </p>

                  <button
                    onClick={() => handleEnroll(service._id)}
                    disabled={enrolling === service._id}
                    className={`w-full py-3 rounded-xl font-semibold text-white transition-all duration-200 ${
                      enrolling === service._id
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                    }`}
                  >
                    {enrolling === service._id ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Enrolling...
                      </span>
                    ) : (
                      'Enroll Now →'
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* My Enrollments Link */}
        <div className="mt-12 text-center">
          <button
            onClick={() => router.push('/my-enrollments')}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 font-semibold"
          >
            <span>📝</span>
            View My Enrollments
          </button>
        </div>
      </div>
    </div>
  );
}

