"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { superAdminAPI, authAPI, parentAPI } from "@/lib/api";
import { User, USER_ROLE } from "@/types";
import SuperAdminLayout from "@/components/SuperAdminLayout";
import toast, { Toaster } from "react-hot-toast";
import { getFullName, getInitials } from "@/utils/nameHelpers";
import { BACKEND_URL } from "@/lib/ivyApi";
import AuthImage from "@/components/AuthImage";

interface RoleUserListPageProps {
  role: string;
  roleDisplayName: string;
  roleEnum: USER_ROLE;
  canAddUser?: boolean;
  headerExtra?: React.ReactNode;
  extraStats?: React.ReactNode;
  hideActiveUsers?: boolean;
}

interface UserStats {
  total: number;
  active: number;
  verified: number;
}

interface AdminOption {
  _id: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email: string;
  companyName?: string;
}

export default function RoleUserListPage({
  role,
  roleDisplayName,
  roleEnum,
  canAddUser = false,
  headerExtra,
  extraStats,
  hideActiveUsers = false,
}: RoleUserListPageProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats>({
    total: 0,
    active: 0,
    verified: 0,
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [parentIdMap, setParentIdMap] = useState<Record<string, string>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Edit user state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Record<string, any>>({});
  const [editLoading, setEditLoading] = useState(false);
  const [editFetching, setEditFetching] = useState(false);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editLogoPreview, setEditLogoPreview] = useState<string | null>(null);

  // Admin list for counselor creation
  const [admins, setAdmins] = useState<AdminOption[]>([]);
  const [selectedAdminId, setSelectedAdminId] = useState("");

  // Add user form state
  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
  });

  // Admin-specific form fields
  const [adminFormData, setAdminFormData] = useState({
    companyName: "",
    address: "",
  });

  const [companyLogoFile, setCompanyLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  // Check if this role should show verified stats (only Alumni and Service Provider)
  const showVerifiedStats =
    roleEnum === USER_ROLE.ALUMNI || roleEnum === USER_ROLE.SERVICE_PROVIDER;

  // Check if we need to show admin selection (for Counselor creation)
  const requiresAdminSelection = roleEnum === USER_ROLE.COUNSELOR;

  // Check if this is Admin role (for slug editing)
  const isAdminRole = roleEnum === USER_ROLE.ADMIN;

  // Check if this is Advisor role
  const isAdvisorRole = roleEnum === USER_ROLE.ADVISOR;

  // Admin and Advisor share company fields
  const isCompanyRole = isAdminRole || isAdvisorRole;

  // Allowed services for Advisor creation
  const ALL_SERVICES = [
    { slug: "study-abroad", label: "Study Abroad" },
    { slug: "ivy-league", label: "Ivy League" },
    { slug: "education-planning", label: "Education Planning" },
    { slug: "coaching-classes", label: "Coaching Classes" },
  ];
  const [allowedServices, setAllowedServices] = useState<string[]>([]);

  // Slug state for Admin/Advisor creation
  const [customSlug, setCustomSlug] = useState("");
  const [slugPreview, setSlugPreview] = useState("");

  // Generate slug preview from company name
  const generateSlugFromName = (text: string): string => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
  };

  // Update slug preview when company name changes (for Admin/Advisor)
  useEffect(() => {
    if (isCompanyRole && adminFormData.companyName && !customSlug) {
      setSlugPreview(generateSlugFromName(adminFormData.companyName));
    }
  }, [adminFormData.companyName, isCompanyRole, customSlug]);

  // Update slug preview when custom slug changes
  useEffect(() => {
    if (customSlug) {
      setSlugPreview(generateSlugFromName(customSlug));
    } else if (adminFormData.companyName) {
      setSlugPreview(generateSlugFromName(adminFormData.companyName));
    }
  }, [customSlug, adminFormData.companyName]);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  useEffect(() => {
    if (currentUser && currentUser.role === USER_ROLE.SUPER_ADMIN) {
      fetchUsers();
      // Fetch admins if this role requires admin selection
      if (requiresAdminSelection && canAddUser) {
        fetchAdmins();
      }
    }
  }, [currentUser, searchQuery, statusFilter]);

  const fetchAdmins = async () => {
    try {
      const response = await superAdminAPI.getAdmins();
      setAdmins(response.data.data.admins || []);
    } catch (error) {
      console.error("Failed to fetch admins:", error);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data.data.user;

      if (userData.role !== USER_ROLE.SUPER_ADMIN) {
        toast.error("Access denied. Super Admin privileges required.");
        router.push("/");
        return;
      }

      setCurrentUser(userData);
    } catch (error) {
      toast.error("Authentication failed");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { role: roleEnum, isActive: true };
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const response = await superAdminAPI.getUsers(params);
      const fetchedUsers = response.data.data.users || [];
      setUsers(fetchedUsers);

      // Fetch parent records to map userId -> parentId
      if (roleEnum === USER_ROLE.PARENT) {
        try {
          const parentRes = await parentAPI.getMyParents();
          const parents = parentRes.data.data.parents || [];
          const map: Record<string, string> = {};
          parents.forEach((p: any) => {
            const uid = typeof p.userId === "object" ? p.userId._id : p.userId;
            map[uid] = p._id;
          });
          setParentIdMap(map);
        } catch (err) {
          console.error("Failed to fetch parent records:", err);
        }
      }

      // Calculate stats
      setStats({
        total: fetchedUsers.length,
        active: fetchedUsers.filter((u: User) => u.isActive).length,
        verified: fetchedUsers.filter((u: User) => u.isVerified).length,
      });
    } catch (error: any) {
      console.error("Fetch users error:", error);
      toast.error(error.response?.data?.message || "Failed to fetch users");
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      setActionLoading(userId);
      await superAdminAPI.toggleUserStatus(userId);
      toast.success("User status updated");
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update status");
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenEdit = async (userId: string) => {
    setEditUserId(userId);
    setEditFetching(true);
    setEditLogoFile(null);
    setEditLogoPreview(null);
    setShowEditModal(true);
    try {
      const res = await superAdminAPI.getUserWithProfile(userId);
      const { user, profile } = res.data.data;
      const base: Record<string, any> = {
        firstName: user.firstName || "",
        middleName: user.middleName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        mobileNumber: profile?.mobileNumber || "",
      };
      // Admin extra fields
      if (roleEnum === USER_ROLE.ADMIN) {
        base.companyName = profile?.companyName || "";
        base.address = profile?.address || "";
        base.enquiryFormSlug = profile?.enquiryFormSlug || "";
      }
      // Advisor extra fields
      if (roleEnum === USER_ROLE.ADVISOR) {
        base.companyName = profile?.companyName || "";
        base.address = profile?.address || "";
        base.enquiryFormSlug = profile?.enquiryFormSlug || "";
        base.allowedServices = profile?.allowedServices || [];
      }
      // Service Provider extra fields
      if (roleEnum === USER_ROLE.SERVICE_PROVIDER) {
        base.companyName = profile?.companyName || "";
        base.businessType = profile?.businessType || "";
        base.registrationNumber = profile?.registrationNumber || "";
        base.gstNumber = profile?.gstNumber || "";
        base.address = profile?.address || "";
        base.city = profile?.city || "";
        base.state = profile?.state || "";
        base.country = profile?.country || "";
        base.pincode = profile?.pincode || "";
        base.website = profile?.website || "";
      }
      setEditFormData(base);
    } catch (error: any) {
      toast.error("Failed to load user data");
      setShowEditModal(false);
    } finally {
      setEditFetching(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId) return;
    if (
      !editFormData.firstName?.trim() ||
      !editFormData.lastName?.trim() ||
      !editFormData.email?.trim()
    ) {
      toast.error("First name, last name, and email are required");
      return;
    }
    setEditLoading(true);
    try {
      // Build payload with trimmed values
      const payload: Record<string, any> = {
        firstName: editFormData.firstName.trim(),
        middleName: editFormData.middleName?.trim() || undefined,
        lastName: editFormData.lastName.trim(),
        email: editFormData.email.trim(),
        mobileNumber: editFormData.mobileNumber?.trim() || undefined,
      };
      // Admin extra fields
      if (roleEnum === USER_ROLE.ADMIN) {
        if (editFormData.companyName !== undefined)
          payload.companyName = editFormData.companyName.trim();
        if (editFormData.address !== undefined)
          payload.address = editFormData.address.trim();
        if (editFormData.enquiryFormSlug !== undefined)
          payload.enquiryFormSlug = editFormData.enquiryFormSlug.trim();
      }
      // Advisor extra fields
      if (roleEnum === USER_ROLE.ADVISOR) {
        if (editFormData.companyName !== undefined)
          payload.companyName = editFormData.companyName.trim();
        if (editFormData.address !== undefined)
          payload.address = editFormData.address.trim();
        if (editFormData.enquiryFormSlug !== undefined)
          payload.enquiryFormSlug = editFormData.enquiryFormSlug.trim();
        if (editFormData.allowedServices !== undefined)
          payload.allowedServices = editFormData.allowedServices;
      }
      // Service Provider extra fields
      if (roleEnum === USER_ROLE.SERVICE_PROVIDER) {
        if (editFormData.companyName !== undefined)
          payload.companyName = editFormData.companyName.trim();
        if (editFormData.businessType !== undefined)
          payload.businessType = editFormData.businessType;
        if (editFormData.registrationNumber !== undefined)
          payload.registrationNumber = editFormData.registrationNumber.trim();
        if (editFormData.gstNumber !== undefined)
          payload.gstNumber = editFormData.gstNumber.trim();
        if (editFormData.address !== undefined)
          payload.address = editFormData.address.trim();
        if (editFormData.city !== undefined)
          payload.city = editFormData.city.trim();
        if (editFormData.state !== undefined)
          payload.state = editFormData.state.trim();
        if (editFormData.country !== undefined)
          payload.country = editFormData.country.trim();
        if (editFormData.pincode !== undefined)
          payload.pincode = editFormData.pincode.trim();
        if (editFormData.website !== undefined)
          payload.website = editFormData.website.trim();
      }
      // If there's a logo file (advisor edit), send as FormData
      if (editLogoFile && roleEnum === USER_ROLE.ADVISOR) {
        const formDataToSend = new FormData();
        for (const [key, value] of Object.entries(payload)) {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              formDataToSend.append(key, JSON.stringify(value));
            } else {
              formDataToSend.append(key, String(value));
            }
          }
        }
        formDataToSend.append("companyLogo", editLogoFile);
        await superAdminAPI.editUserByRole(editUserId, formDataToSend);
      } else {
        await superAdminAPI.editUserByRole(editUserId, payload);
      }
      toast.success("User updated successfully");
      setShowEditModal(false);
      setEditUserId(null);
      setEditLogoFile(null);
      setEditLogoPreview(null);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update user");
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.firstName.trim() ||
      !formData.lastName.trim() ||
      !formData.email.trim()
    ) {
      toast.error("First name, last name, and email are required");
      return;
    }

    if (!formData.phoneNumber.trim()) {
      toast.error("Phone number is required");
      return;
    }

    // Validate phone number format
    const phoneRegex =
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}$/;
    if (!phoneRegex.test(formData.phoneNumber.trim())) {
      toast.error(
        "Invalid phone number format. Please use only numbers and allowed characters (+, -, (), spaces)",
      );
      return;
    }

    // Validate admin selection for counselors
    if (requiresAdminSelection && !selectedAdminId) {
      toast.error("Please select an admin for this counselor");
      return;
    }

    // Validate admin/advisor-specific fields
    if (isCompanyRole) {
      if (!adminFormData.companyName.trim()) {
        toast.error("Company name is required");
        return;
      }
    }

    // Validate advisor-specific fields
    if (isAdvisorRole && allowedServices.length === 0) {
      toast.error("Please select at least one allowed service");
      return;
    }

    setSubmitting(true);
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append("firstName", formData.firstName.trim());
      if (formData.middleName.trim()) {
        formDataToSend.append("middleName", formData.middleName.trim());
      }
      formDataToSend.append("lastName", formData.lastName.trim());
      formDataToSend.append("email", formData.email.trim());
      if (formData.phoneNumber.trim()) {
        formDataToSend.append("phoneNumber", formData.phoneNumber.trim());
      }
      formDataToSend.append("role", roleEnum);

      if (requiresAdminSelection) {
        formDataToSend.append("adminId", selectedAdminId);
      }

      if (isCompanyRole) {
        formDataToSend.append("companyName", adminFormData.companyName.trim());
        if (adminFormData.address.trim()) {
          formDataToSend.append("address", adminFormData.address.trim());
        }
        if (companyLogoFile) {
          formDataToSend.append("companyLogo", companyLogoFile);
        }
        if (customSlug?.trim()) {
          formDataToSend.append("customSlug", customSlug.trim());
        }
      }

      if (isAdvisorRole && allowedServices.length > 0) {
        formDataToSend.append(
          "allowedServices",
          JSON.stringify(allowedServices),
        );
      }

      const response = await superAdminAPI.createUserByRole(formDataToSend);

      // Show success message with slug for Admin/Advisor
      if (isCompanyRole && response.data.data.enquiryFormSlug) {
        toast.success(
          `${roleDisplayName} created successfully! Enquiry form slug: ${response.data.data.enquiryFormSlug}`,
          { duration: 5000 },
        );
      } else {
        toast.success(
          `${roleDisplayName} created successfully! They can log in using OTP.`,
        );
      }

      setFormData({
        firstName: "",
        middleName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
      });
      setAdminFormData({ companyName: "", address: "" });
      setCompanyLogoFile(null);
      setLogoPreview(null);
      setSelectedAdminId("");
      setCustomSlug("");
      setSlugPreview("");
      setAllowedServices([]);
      setShowAddModal(false);
      await fetchUsers();
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || `Failed to create ${roleDisplayName}`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleBadgeColor = (userRole: string) => {
    const colors: Record<string, string> = {
      ADMIN: "bg-red-100 text-red-800",
      OPS: "bg-green-100 text-green-800",
      EDUPLAN_COACH: "bg-indigo-100 text-indigo-800",
      IVY_EXPERT: "bg-purple-100 text-purple-800",
      COUNSELOR: "bg-teal-100 text-teal-800",
      STUDENT: "bg-blue-100 text-blue-800",
      PARENT: "bg-amber-100 text-amber-800",
      ALUMNI: "bg-pink-100 text-pink-800",
      SERVICE_PROVIDER: "bg-orange-100 text-orange-800",
    };
    return colors[userRole] || "bg-gray-100 text-gray-800";
  };
  console.log(roleDisplayName);
  let pluralSuffix;

  if (roleDisplayName.toLowerCase() === "eduplan coach") {
    pluralSuffix = "es";
  } else if (roleDisplayName.toLowerCase() === "ops") {
    pluralSuffix = "";
  } else if (roleDisplayName.toLowerCase() === "advisor") {
    pluralSuffix = "s";
  } else {
    pluralSuffix = "s";
  }

  if (loading && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return null;

  return (
    <>
      <Toaster position="top-right" />
      <SuperAdminLayout user={currentUser}>
        <div className="p-8">
          {/* Header with Add Button */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {roleDisplayName}
                {pluralSuffix}
              </h1>
              <p className="text-gray-600 mt-1">
                Manage all {roleDisplayName.toLowerCase()} accounts
              </p>
            </div>
            {canAddUser && (
              <div className="flex items-center gap-3">
                {headerExtra}
                <button
                  onClick={() => setShowAddModal(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add {roleDisplayName}
                </button>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          <div
            className={`grid grid-cols-1 ${extraStats ? "md:grid-cols-3" : showVerifiedStats ? "md:grid-cols-3" : "md:grid-cols-2"} gap-6 mb-6`}
          >
            <StatCard
              title={`Total ${roleDisplayName}${pluralSuffix}`}
              value={stats.total.toString()}
              color="blue"
            />
            {!hideActiveUsers && (
              <StatCard
                title="Active Users"
                value={stats.active.toString()}
                color="green"
              />
            )}
            {showVerifiedStats && (
              <StatCard
                title="Verified Users"
                value={stats.verified.toString()}
                color="purple"
              />
            )}
            {extraStats}
          </div>

          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input
                  type="text"
                  placeholder={
                    roleEnum === USER_ROLE.COUNSELOR
                      ? "Search by name, email, or company..."
                      : "Search by name or email..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                >
                  <option value="">All Status</option>
                  <option value="active">Active</option>
                </select>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setStatusFilter("");
                  }}
                  className="px-4 py-2.5 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="spinner"></div>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                    />
                  </svg>
                  <p className="mt-2 text-gray-900 font-medium">
                    No {roleDisplayName.toLowerCase()}
                    {pluralSuffix} found
                  </p>
                  {canAddUser && (
                    <button
                      onClick={() => setShowAddModal(true)}
                      className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Add your first {roleDisplayName.toLowerCase()}
                    </button>
                  )}
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        User
                      </th>
                      {roleEnum === USER_ROLE.COUNSELOR && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Admin
                        </th>
                      )}
                      {roleEnum === USER_ROLE.PARENT && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Students
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Joined
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr
                        key={user._id || user.id}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {(isCompanyRole ||
                              roleEnum === USER_ROLE.SERVICE_PROVIDER) &&
                            user.companyLogo ? (
                              <AuthImage
                                path={user.companyLogo}
                                alt={user.companyName || "Company Logo"}
                                className="w-10 h-10 rounded-full object-cover"
                                fallback={
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold">
                                      {user.companyName
                                        ?.charAt(0)
                                        .toUpperCase() || getInitials(user)}
                                    </span>
                                  </div>
                                }
                              />
                            ) : (
                              <AuthImage
                                path={user.profilePicture}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                                fallback={
                                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold">
                                      {(isCompanyRole ||
                                        roleEnum ===
                                          USER_ROLE.SERVICE_PROVIDER) &&
                                      user.companyName
                                        ? user.companyName
                                            .charAt(0)
                                            .toUpperCase()
                                        : getInitials(user)}
                                    </span>
                                  </div>
                                }
                              />
                            )}
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {isCompanyRole && user.companyName
                                  ? user.companyName
                                  : getFullName(user) || "N/A"}
                              </div>
                              <div className="text-sm text-gray-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        {roleEnum === USER_ROLE.COUNSELOR && (
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {user.companyName || "N/A"}
                            </div>
                          </td>
                        )}
                        {roleEnum === USER_ROLE.PARENT && (
                          <td className="px-6 py-4">
                            {user.students && user.students.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {user.students.map(
                                  (s: {
                                    studentId: string;
                                    firstName: string;
                                    lastName: string;
                                  }) => (
                                    <button
                                      key={s.studentId}
                                      onClick={() =>
                                        router.push(
                                          `/super-admin/roles/student/${s.studentId}`,
                                        )
                                      }
                                      className="text-sm text-blue-600 hover:text-blue-800 hover:underline text-left"
                                    >
                                      {`${s.firstName} ${s.lastName}`.trim() ||
                                        "N/A"}
                                    </button>
                                  ),
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">
                                No students linked
                              </span>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-3 py-1 text-xs font-semibold rounded-full ${getRoleBadgeColor(user.role as string)}`}
                          >
                            {(user.role as string).replace(/_/g, " ")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col space-y-1">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                user.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {user.isActive ? "Active" : "Inactive"}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                user.isVerified
                                  ? "bg-blue-100 text-blue-800"
                                  : "bg-yellow-100 text-yellow-800"
                              }`}
                            >
                              {user.isVerified ? "Verified" : "Unverified"}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {user.createdAt
                            ? new Date(user.createdAt).toLocaleDateString(
                                "en-GB",
                              )
                            : "N/A"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-left text-sm font-medium">
                          <div className="flex items-center justify-start gap-2">
                            {isAdminRole && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/admin/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Detail
                              </button>
                            )}
                            {roleEnum === USER_ROLE.COUNSELOR && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/counselor/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Detail
                              </button>
                            )}
                            {roleEnum === USER_ROLE.STUDENT && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/student/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Detail
                              </button>
                            )}
                            {roleEnum === USER_ROLE.IVY_EXPERT && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/ivy-expert/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Details
                              </button>
                            )}
                            {roleEnum === USER_ROLE.OPS && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/ops/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Details
                              </button>
                            )}
                            {roleEnum === USER_ROLE.EDUPLAN_COACH && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/eduplan-coach/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Details
                              </button>
                            )}
                            {roleEnum === USER_ROLE.SERVICE_PROVIDER && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/service-provider/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Details
                              </button>
                            )}
                            {roleEnum === USER_ROLE.PARENT && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/parent/${parentIdMap[user._id || user.id!] || user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Detail
                              </button>
                            )}
                            {roleEnum === USER_ROLE.ADVISOR && (
                              <button
                                onClick={() =>
                                  router.push(
                                    `/super-admin/roles/advisor/${user._id || user.id}`,
                                  )
                                }
                                className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-blue-600 text-white hover:bg-blue-700"
                              >
                                View Detail
                              </button>
                            )}
                            <button
                              onClick={() =>
                                handleOpenEdit(user._id || user.id!)
                              }
                              className="px-3 py-1.5 rounded-lg transition-colors text-xs bg-brand-600 text-white hover:bg-brand-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() =>
                                handleToggleStatus(user._id || user.id!)
                              }
                              disabled={actionLoading === (user._id || user.id)}
                              className={`px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 text-xs ${
                                user.isActive
                                  ? "bg-yellow-600 text-white hover:bg-yellow-700"
                                  : "bg-blue-600 text-white hover:bg-blue-700"
                              }`}
                            >
                              {user.isActive ? "Deactivate" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination info */}
            {users.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Showing {users.length} {roleDisplayName.toLowerCase()}
                  {users.length !== 1 ? pluralSuffix : ""}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Add User Modal */}
        {showAddModal && canAddUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className={`bg-white rounded-xl shadow-xl w-full mx-4 p-6 ${isAdvisorRole ? 'max-w-4xl' : 'max-w-2xl'}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Add New {roleDisplayName}
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-4">
                <div className={`grid gap-4 ${isAdvisorRole ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.firstName}
                      onChange={(e) =>
                        setFormData({ ...formData, firstName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="Enter first name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Middle Name
                    </label>
                    <input
                      type="text"
                      value={formData.middleName}
                      onChange={(e) =>
                        setFormData({ ...formData, middleName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="Enter middle name (optional)"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.lastName}
                      onChange={(e) =>
                        setFormData({ ...formData, lastName: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="Enter last name"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="user@example.com"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        // Allow only numbers and phone number special characters
                        if (value === "" || /^[+()\-\s.0-9]*$/.test(value)) {
                          setFormData({ ...formData, phoneNumber: value });
                        }
                      }}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="+1234567890 or (123) 456-7890"
                      pattern="[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,5}[-\s.]?[0-9]{1,5}"
                      required
                    />
                  </div>
                </div>

                {/* Admin/Advisor-specific fields */}
                {isCompanyRole && (
                  <>
                    <div className={`grid gap-4 ${isAdvisorRole ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={adminFormData.companyName}
                          onChange={(e) =>
                            setAdminFormData({
                              ...adminFormData,
                              companyName: e.target.value,
                            })
                          }
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          placeholder="Enter company name"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Thumbnail
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              // Validate file size (5MB)
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error("File size must be less than 5MB");
                                e.target.value = "";
                                return;
                              }
                              setCompanyLogoFile(file);
                              // Create preview
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setLogoPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                        {logoPreview && (
                          <div className="mt-2">
                            <img
                              src={logoPreview}
                              alt="Logo preview"
                              className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Address
                      </label>
                      <textarea
                        value={adminFormData.address}
                        onChange={(e) =>
                          setAdminFormData({
                            ...adminFormData,
                            address: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="Enter company address"
                        rows={2}
                      />
                    </div>
                  </>
                )}

                {/* Admin Selection for Counselor */}
                {requiresAdminSelection && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Select Admin <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedAdminId}
                      onChange={(e) => setSelectedAdminId(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      required
                    >
                      <option value="">-- Select an Admin --</option>
                      {admins.map((admin) => (
                        <option key={admin._id} value={admin._id}>
                          {admin.companyName || getFullName(admin)} (
                          {getFullName(admin)})
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      The counselor will be managed by this admin
                    </p>
                  </div>
                )}

                {/* Enquiry Form Slug for Admin/Advisor */}
                {isCompanyRole && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Enquiry Form Slug
                      <span className="text-gray-400 font-normal ml-1">
                        (optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={customSlug}
                      onChange={(e) => setCustomSlug(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                      placeholder="custom-slug (auto-generated from name if empty)"
                    />
                    {slugPreview && (
                      <div className="mt-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-xs text-gray-500 mb-1">
                          Enquiry Form URL Preview:
                        </p>
                        <p className="text-sm text-blue-600 font-mono break-all">
                          /enquiry/
                          <span className="font-semibold">{slugPreview}</span>
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      This will be the unique URL for the{" "}
                      {isAdvisorRole ? "advisor" : "admin"}&apos;s enquiry
                      form. If left empty, it will be auto-generated from the
                      name.
                    </p>
                  </div>
                )}

                {/* Allowed Services for Advisor */}
                {isAdvisorRole && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Allowed Services <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {ALL_SERVICES.map((service) => (
                        <label
                          key={service.slug}
                          className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={allowedServices.includes(service.slug)}
                            onChange={() => {
                              setAllowedServices((prev) =>
                                prev.includes(service.slug)
                                  ? prev.filter((s) => s !== service.slug)
                                  : [...prev, service.slug],
                              );
                            }}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            {service.label}
                          </span>
                        </label>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Select the services this advisor is allowed to offer.
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                  >
                    {submitting ? "Creating..." : `Create ${roleDisplayName}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  Edit {roleDisplayName}
                </h2>
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditUserId(null);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg
                    className="w-5 h-5 text-gray-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {editFetching ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : (
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  {/* User Information */}
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                    User Information
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.firstName || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            firstName: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        required
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Middle Name
                      </label>
                      <input
                        type="text"
                        value={editFormData.middleName || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            middleName: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editFormData.lastName || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            lastName: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                        required
                        disabled
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={editFormData.email || ""}
                        onChange={(e) =>
                          setEditFormData({
                            ...editFormData,
                            email: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={editFormData.mobileNumber || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "" || /^[+()\-\s.0-9]*$/.test(value)) {
                            setEditFormData({
                              ...editFormData,
                              mobileNumber: value,
                            });
                          }
                        }}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        placeholder="+1234567890"
                      />
                    </div>
                  </div>

                  {/* Admin Extra Fields */}
                  {roleEnum === USER_ROLE.ADMIN && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2">
                        Company Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editFormData.companyName || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                companyName: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            required
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enquiry Form Slug
                          </label>
                          <input
                            type="text"
                            value={editFormData.enquiryFormSlug || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                enquiryFormSlug: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={editFormData.address || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                address: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Advisor Extra Fields */}
                  {roleEnum === USER_ROLE.ADVISOR && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2">
                        Company Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={editFormData.companyName || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                companyName: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            required
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Enquiry Form Slug
                          </label>
                          <input
                            type="text"
                            value={editFormData.enquiryFormSlug || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                enquiryFormSlug: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={editFormData.address || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                address: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Company Thumbnail
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error("File size must be less than 5MB");
                                e.target.value = "";
                                return;
                              }
                              setEditLogoFile(file);
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setEditLogoPreview(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                        />
                        {editLogoPreview && (
                          <div className="mt-2">
                            <img
                              src={editLogoPreview}
                              alt="Logo preview"
                              className="h-20 w-20 object-cover rounded-lg border-2 border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Allowed Services
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { slug: "study-abroad", label: "Study Abroad" },
                            { slug: "ivy-league", label: "Ivy League" },
                            {
                              slug: "education-planning",
                              label: "Education Planning",
                            },
                            {
                              slug: "coaching-classes",
                              label: "Coaching Classes",
                            },
                          ].map((service) => (
                            <label
                              key={service.slug}
                              className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={(
                                  editFormData.allowedServices || []
                                ).includes(service.slug)}
                                onChange={() => {
                                  const current =
                                    editFormData.allowedServices || [];
                                  const updated = current.includes(service.slug)
                                    ? current.filter(
                                        (s: string) => s !== service.slug,
                                      )
                                    : [...current, service.slug];
                                  setEditFormData({
                                    ...editFormData,
                                    allowedServices: updated,
                                  });
                                }}
                                className="w-4 h-4 text-blue-600 rounded"
                              />
                              <span className="text-sm font-medium text-gray-700">
                                {service.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Service Provider Extra Fields */}
                  {roleEnum === USER_ROLE.SERVICE_PROVIDER && (
                    <>
                      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider pt-2">
                        Business Information
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Company Name
                          </label>
                          <input
                            type="text"
                            value={editFormData.companyName || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                companyName: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Business Type
                          </label>
                          <select
                            value={editFormData.businessType || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                businessType: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          >
                            <option value="">Select</option>
                            <option value="Individual">Individual</option>
                            <option value="Sole Proprietors">
                              Sole Proprietors
                            </option>
                            <option value="Partnership Firm">
                              Partnership Firm
                            </option>
                            <option value="Private Ltd. Company">
                              Private Ltd. Company
                            </option>
                            <option value="Public Ltd. Company">
                              Public Ltd. Company
                            </option>
                            <option value="Limited Liability Partnership (LLP)">
                              Limited Liability Partnership (LLP)
                            </option>
                            <option value="Trust, Association, Society, Club">
                              Trust, Association, Society, Club
                            </option>
                            <option value="Government Entity">
                              Government Entity
                            </option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Registration Number
                          </label>
                          <input
                            type="text"
                            value={editFormData.registrationNumber || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                registrationNumber: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            GST Number
                          </label>
                          <input
                            type="text"
                            value={editFormData.gstNumber || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                gstNumber: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Address
                          </label>
                          <input
                            type="text"
                            value={editFormData.address || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                address: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            City
                          </label>
                          <input
                            type="text"
                            value={editFormData.city || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                city: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            State
                          </label>
                          <input
                            type="text"
                            value={editFormData.state || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                state: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Country
                          </label>
                          <input
                            type="text"
                            value={editFormData.country || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                country: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Pincode
                          </label>
                          <input
                            type="text"
                            value={editFormData.pincode || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                pincode: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
                            disabled
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Website
                          </label>
                          <input
                            type="text"
                            value={editFormData.website || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                website: e.target.value,
                              })
                            }
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="flex gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditUserId(null);
                      }}
                      className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editLoading}
                      className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium"
                    >
                      {editLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </SuperAdminLayout>
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string;
  color: "blue" | "green" | "purple" | "yellow";
}

function StatCard({ title, value, color }: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    purple: "bg-purple-100 text-purple-600",
    yellow: "bg-yellow-100 text-yellow-600",
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
