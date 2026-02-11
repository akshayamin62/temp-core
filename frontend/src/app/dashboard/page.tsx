'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, serviceAPI } from '@/lib/api';
import { User, Service, StudentServiceRegistration } from '@/types';
import toast, { Toaster } from 'react-hot-toast';
import ServiceCard from '@/components/ServiceCard';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<Service[]>([]);
  const [registrations, setRegistrations] = useState<StudentServiceRegistration[]>([]);
  const [registeringServiceId, setRegisteringServiceId] = useState<string | null>(null);
  const [otherServices, setOtherServices] = useState<Service[]>([]);

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      // Redirect admin/OPS to their dashboard
      if (user.role === 'SUPER_ADMIN') {
        router.push('/super-admin/dashboard');
      } else if (user.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else if (user.role === 'OPS') {
        router.push('/ops/dashboard');
      } else if (user.role === 'COUNSELOR') {
        router.push('/counselor/dashboard');
      } else if (user.role === 'IVY_EXPERT') {
        router.push('/ivy-league/ivy-expert');
      } else {
        fetchMyServices();
      }
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      setUser(response.data.data.user);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to fetch profile';
      toast.error(message);
      
      // Redirect to login if unauthorized
      if (error.response?.status === 401 || error.response?.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMyServices = async () => {
    try {
      // Only fetch services if user is a student
      if (user?.role !== 'STUDENT') {
        return;
      }
      const response = await serviceAPI.getMyServices();
      setRegistrations(response.data.data.registrations);
      
      // Fetch all services to show other available services
      fetchOtherServices(response.data.data.registrations);
    } catch (error: any) {
      console.error('Failed to fetch my services:', error);
      // If 404 or unauthorized, user might be admin/OPS - redirect them
      if (error.response?.status === 404 || error.response?.status === 401) {
        if (user?.role === 'SUPER_ADMIN') {
          router.push('/super-admin/dashboard');
        } else if (user?.role === 'ADMIN') {
          router.push('/admin/dashboard');
        } else if (user?.role === 'OPS') {
          router.push('/ops/dashboard');
        }
      }
    }
  };

  const fetchOtherServices = async (myRegistrations: StudentServiceRegistration[]) => {
    try {
      const response = await serviceAPI.getAllServices();
      const allServices = response.data.data.services || [];
      
      // Filter out services the student is already registered for
      const registeredServiceIds = myRegistrations.map((r) => 
        typeof r.serviceId === 'object' ? r.serviceId._id : r.serviceId
      );
      
      const unregisteredServices = allServices.filter((service: Service) => 
        !registeredServiceIds.includes(service._id)
      );
      
      setOtherServices(unregisteredServices);
    } catch (error: any) {
      console.error('Failed to fetch other services:', error);
    }
  };

  const handleRegister = async (serviceId: string) => {
    // Check if service is configured (only study-abroad is currently configured)
    const service = otherServices.find(s => s._id === serviceId);
    if (service && service.slug !== 'study-abroad' && service.slug !== 'ivy-league' && service.slug !== 'ivy-league-admission' && service.name !== 'Ivy League Preparation' && service.name !== 'Ivy League Admission') {
      toast('This service will be available soon for registration.');
      return;
    }

    setRegisteringServiceId(serviceId);
    try {
      await serviceAPI.registerForService(serviceId);
      toast.success('Successfully registered for service!');
      await fetchMyServices(); // Refresh both my services and other services
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to register for service';
      toast.error(message);
    } finally {
      setRegisteringServiceId(null);
    }
  };

  const handleViewDetails = (serviceId: string) => {
    const registration = registrations.find((r) => {
      if (!r.serviceId) return false;
      return (typeof r.serviceId === 'object' ? r.serviceId._id : r.serviceId) === serviceId;
    });
    if (registration) {
      // Check if this is the Ivy League service
      const service = typeof registration.serviceId === 'object' ? registration.serviceId : null;
      if (service && (service.slug === 'ivy-league' || service.slug === 'ivy-league-admission' || service.name === 'Ivy League Preparation' || service.name === 'Ivy League Admission')) {
        // Route to the Ivy League student dashboard (auth-based, no params needed)
        router.push('/ivy-league/student');
      } else {
        router.push(`/student/registration/${registration._id}`);
      }
    } else {
      // Show service details modal or page
      toast('Service details coming soon!');
    }
  };

  const isRegistered = (serviceId: string) => {
    return registrations.some((r) => {
      if (!r.serviceId) return false;
      return (typeof r.serviceId === 'object' ? r.serviceId._id : r.serviceId) === serviceId;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        <div className="text-center animate-scale-in">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      <Toaster position="top-right" />

      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-float" style={{animationDelay: '1.5s'}}></div>
      </div>

      {/* Main Content */}
      <div className="relative max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
        <div className="px-4 sm:px-0">
          {/* Welcome Header */}
          <div className="mb-8 animate-fade-in">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              My Services
            </h1>
            <p className="text-gray-600 text-base mt-2">
              Manage your registered services and track your progress.
            </p>
          </div>

          {/* My Services Section */}
          {registrations.length > 0 ? (
            <div className="animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {registrations.map((registration) => {
                  const service = typeof registration.serviceId === 'object' 
                    ? registration.serviceId 
                    : null;
                  
                  if (!service) return null;
                  
                  return (
                    <ServiceCard
                      key={registration._id}
                      service={service}
                      isRegistered={true}
                      onViewDetails={handleViewDetails}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No Services Yet</h3>
              <p className="text-gray-600">You haven't registered for any services yet.</p>
            </div>
          )}

          {/* Other Services Section */}
          {otherServices.length > 0 && (
            <div className="mt-12 animate-fade-in" style={{animationDelay: '0.2s'}}>
              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Services
                </h2>
                <p className="text-gray-600 text-base mt-2">
                  Explore and register for additional services.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherServices.map((service) => (
                  <ServiceCard
                    key={service._id}
                    service={service}
                    isRegistered={false}
                    onRegister={handleRegister}
                    loading={registeringServiceId === service._id}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

