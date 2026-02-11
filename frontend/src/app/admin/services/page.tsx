'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { serviceAPI, sectionAPI } from '@/lib/formApi';
import { Service, FormSection, ServiceSection } from '@/types/form';
import AdminLayout from '@/components/AdminLayout';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [sections, setSections] = useState<FormSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [serviceSections, setServiceSections] = useState<any[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  // Filters
  const [activeFilter, setActiveFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchSections();
    fetchServices();
  }, [activeFilter, searchTerm]);

  const fetchSections = async () => {
    try {
      const response = await sectionAPI.getAll({ isActive: 'true' });
      setSections(response.data.data.sections);
    } catch (error: any) {
      console.error('Error fetching sections:', error);
    }
  };

  const fetchServices = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (activeFilter) params.isActive = activeFilter;
      if (searchTerm) params.search = searchTerm;

      const response = await serviceAPI.getAll(params);
      setServices(response.data.data.services);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch services');
    } finally {
      setLoading(false);
    }
  };

  const fetchServiceSections = async (serviceId: string) => {
    try {
      const response = await serviceAPI.getById(serviceId);
      setServiceSections(response.data.data.sections || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch service sections');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.description.trim()) {
      toast.error('Name and description are required');
      return;
    }

    try {
      if (editingService) {
        await serviceAPI.update(editingService._id, formData);
        toast.success('Service updated successfully');
      } else {
        await serviceAPI.create(formData);
        toast.success('Service created successfully');
      }
      closeModal();
      fetchServices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save service');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await serviceAPI.toggleStatus(id);
      toast.success('Service status updated');
      fetchServices();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleAddSection = async (sectionId: string) => {
    if (!selectedService) return;

    try {
      await serviceAPI.addSection(selectedService._id, {
        sectionId,
        order: serviceSections.length,
      });
      toast.success('Section added to service');
      fetchServiceSections(selectedService._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add section');
    }
  };

  const handleRemoveSection = async (sectionId: string) => {
    if (!selectedService) return;

    try {
      await serviceAPI.removeSection(selectedService._id, sectionId);
      toast.success('Section removed from service');
      fetchServiceSections(selectedService._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to remove section');
    }
  };

  const handleUpdateOrder = async (sectionId: string, newOrder: number) => {
    if (!selectedService) return;

    try {
      await serviceAPI.updateSectionOrder(selectedService._id, sectionId, newOrder);
      toast.success('Section order updated');
      fetchServiceSections(selectedService._id);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order');
    }
  };

  const openModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        name: service.name,
        description: service.description,
      });
    } else {
      setEditingService(null);
      setFormData({
        name: '',
        description: '',
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
  };

  const openSectionModal = async (service: Service) => {
    setSelectedService(service);
    await fetchServiceSections(service._id);
    setShowSectionModal(true);
  };

  const closeSectionModal = () => {
    setShowSectionModal(false);
    setSelectedService(null);
    setServiceSections([]);
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Service Management</h1>
          <p className="text-gray-600">Create and manage your consultancy services</p>
        </div>

        {/* Filters & Actions */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Search services..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            />
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-green-600 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-green-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg"
            >
              + Create Service
            </button>
          </div>
        </div>

        {/* Services Grid */}
        {loading ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading services...</p>
          </div>
        ) : services.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No services found</p>
            <button
              onClick={() => openModal()}
              className="mt-4 text-green-600 hover:text-green-700 font-medium"
            >
              Create your first service
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service._id}
                className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 border-2 border-transparent hover:border-green-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{service.name}</h3>
                    <p className="text-gray-600 text-sm line-clamp-3">{service.description}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ml-2 ${
                      service.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {service.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => openSectionModal(service)}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors"
                  >
                    📋 Manage Sections
                  </button>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => openModal(service)}
                      className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleStatus(service._id)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        service.isActive
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-green-100 text-green-700 hover:bg-green-200'
                      }`}
                    >
                      {service.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Service Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingService ? 'Edit Service' : 'Create Service'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  placeholder="e.g., Education Planning"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                  rows={4}
                  placeholder="Describe what this service offers..."
                  required
                />
              </div>

              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-medium shadow-lg"
                >
                  {editingService ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Sections Modal */}
      {showSectionModal && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-gray-900">
                Manage Sections - {selectedService.name}
              </h2>
              <p className="text-gray-600 mt-1">Add or remove sections for this service</p>
            </div>

            <div className="p-6">
              {/* Add Section */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Section
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddSection(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-gray-900"
                >
                  <option value="">Select a section to add...</option>
                  {sections
                    .filter(s => !serviceSections.some(ss => ss.section._id === s._id))
                    .map((section) => (
                      <option key={section._id} value={section._id}>
                        {section.title} ({section.questions.length} questions)
                      </option>
                    ))}
                </select>
              </div>

              {/* Current Sections */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Current Sections ({serviceSections.length})
                </h3>
                {serviceSections.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No sections added yet. Add sections from the dropdown above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {serviceSections
                      .sort((a, b) => a.order - b.order)
                      .map((ss, index) => (
                        <div
                          key={ss._id}
                          className="bg-gray-50 p-4 rounded-lg flex items-center justify-between"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-bold text-gray-400">#{ss.order + 1}</span>
                              <div>
                                <h4 className="font-semibold text-gray-900">{ss.section.title}</h4>
                                <p className="text-sm text-gray-600">
                                  {ss.section.questions?.length || 0} questions
                                  {ss.section.isRepeatable && ' • Repeatable'}
                                  {ss.section.isGlobal && ' • Global'}
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleUpdateOrder(ss.section._id, ss.order - 1)}
                              disabled={index === 0}
                              className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 font-bold"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => handleUpdateOrder(ss.section._id, ss.order + 1)}
                              disabled={index === serviceSections.length - 1}
                              className="px-3 py-1 text-gray-600 hover:text-gray-900 disabled:opacity-30 font-bold"
                            >
                              ↓
                            </button>
                            <button
                              onClick={() => handleRemoveSection(ss.section._id)}
                              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium ml-2"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={closeSectionModal}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg hover:from-green-700 hover:to-blue-700 font-medium shadow-lg"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </AdminLayout>
  );
}

