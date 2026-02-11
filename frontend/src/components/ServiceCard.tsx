'use client';

import { Service } from '@/types';
import toast from 'react-hot-toast';

interface ServiceCardProps {
  service: Service;
  isRegistered?: boolean;
  onRegister?: (serviceId: string) => void;
  onViewDetails?: (serviceId: string) => void;
  loading?: boolean;
  showLearnMore?: boolean;
}

export default function ServiceCard({
  service,
  isRegistered = false,
  onRegister,
  onViewDetails,
  loading = false,
  showLearnMore = true,
}: ServiceCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 overflow-hidden group">
      {/* Card Header with Gradient */}
      <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
      
      <div className="p-6">
        {/* Icon */}
        <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
        </div>

        {/* Title */}
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {service.name}
        </h3>

        {/* Short Description */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {service.shortDescription}
        </p>

        {/* Status Badge */}
        {isRegistered && (
          <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 mb-4">
            <svg
              className="w-4 h-4 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            Registered
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-4">
          {isRegistered ? (
            <>
              <button
                onClick={() => onViewDetails?.(service._id)}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                View Details
              </button>
              {showLearnMore && (
                service.learnMoreUrl ? (
                  <button
                    onClick={() => window.open(service.learnMoreUrl, '_blank')}
                    className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200"
                  >
                    Learn More
                  </button>
                ) : (
                  <button
                    onClick={() => toast('Coming soon!')}
                    className="px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200"
                  >
                    Learn More
                  </button>
                )
              )}
            </>
          ) : (
            <>
              {onRegister && (
                <button
                  onClick={() => onRegister(service._id)}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin h-4 w-4 mr-2"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Registering...
                    </span>
                  ) : (
                    'Register'
                  )}
                </button>
              )}
              {showLearnMore && (
                service.learnMoreUrl ? (
                  <button
                    onClick={() => window.open(service.learnMoreUrl, '_blank')}
                    className={`px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200 ${!onRegister ? 'flex-1' : ''}`}
                  >
                    Learn More
                  </button>
                ) : (
                  <button
                    onClick={() => toast('Coming soon!')}
                    className={`px-4 py-2 border-2 border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-all duration-200 ${!onRegister ? 'flex-1' : ''}`}
                  >
                    Learn More
                  </button>
                )
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}


