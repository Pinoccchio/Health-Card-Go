'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import { Container } from '@/components/ui';
import { Users, UserPlus, Search, Edit, Trash2 } from 'lucide-react';
import CreateSuperAdminForm from '@/components/admin/CreateSuperAdminForm';
import CreateHealthcareAdminForm from '@/components/admin/CreateHealthcareAdminForm';
import CreateStaffForm from '@/components/admin/CreateStaffForm';
import EditSuperAdminForm from '@/components/admin/EditSuperAdminForm';
import EditHealthcareAdminForm from '@/components/admin/EditHealthcareAdminForm';
import EditStaffForm from '@/components/admin/EditStaffForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/lib/contexts/ToastContext';
import { getCategoryColors } from '@/lib/utils/serviceHelpers';

type UserType = 'super-admin' | 'healthcare-admin' | 'staff';

interface SuperAdmin {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number?: string;
  status: string;
  created_at: string;
}

interface HealthcareAdmin {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number?: string;
  assigned_service: {
    id: number;
    name: string;
    category: string;
  } | null;
  status: string;
  created_at: string;
}

interface Staff {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  contact_number?: string;
  status: string;
  created_at: string;
}

export default function UsersManagementPage() {
  const [activeTab, setActiveTab] = useState<UserType>('super-admin');
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [healthcareAdmins, setHealthcareAdmins] = useState<HealthcareAdmin[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditSuperAdminModalOpen, setIsEditSuperAdminModalOpen] = useState(false);
  const [isEditHealthcareAdminModalOpen, setIsEditHealthcareAdminModalOpen] = useState(false);
  const [isEditStaffModalOpen, setIsEditStaffModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string>('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{id: string; name: string; type: UserType} | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadUsers();
  }, []); // Load all users once on mount

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Fetch all user types in parallel for accurate tab counts
      const [superAdminsRes, healthcareAdminsRes, staffRes] = await Promise.all([
        fetch('/api/admin/super-admins'),
        fetch('/api/admin/healthcare-admins'),
        fetch('/api/admin/staff'),
      ]);

      if (superAdminsRes.ok) {
        const data = await superAdminsRes.json();
        setSuperAdmins(data.data || []);
      }

      if (healthcareAdminsRes.ok) {
        const data = await healthcareAdminsRes.json();
        setHealthcareAdmins(data.data || []);
      }

      if (staffRes.ok) {
        const data = await staffRes.json();
        setStaff(data.data || []);
      }
    } catch (error) {
      // Error loading users - silently fail, UI will show empty state
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (id: string, name: string, type: UserType) => {
    setUserToDelete({ id, name, type });
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setDeleteLoading(true);
    try {
      const endpoint = userToDelete.type === 'super-admin'
        ? `/api/admin/super-admins/${userToDelete.id}`
        : userToDelete.type === 'healthcare-admin'
        ? `/api/admin/healthcare-admins/${userToDelete.id}`
        : `/api/admin/staff/${userToDelete.id}`;

      const res = await fetch(endpoint, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || 'User deleted successfully');
        setIsDeleteConfirmOpen(false);
        setUserToDelete(null);
        loadUsers();
      } else {
        toast.error(data.error || 'Failed to delete user');
      }
    } catch (error) {
      // Error deleting user - toast already shows user-friendly message
      toast.error('Error deleting user');
    } finally {
      setDeleteLoading(false);
    }
  };

  const filteredSuperAdmins = superAdmins.filter(admin =>
    `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredHealthcareAdmins = healthcareAdmins.filter(admin =>
    `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.assigned_service?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStaff = staff.filter(s =>
    `${s.first_name} ${s.last_name}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="User Management"
      pageDescription="Create and manage Healthcare Admins and Staff"
    >
      <Container size="full">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-6 h-6 text-primary-teal" />
                <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 bg-primary-teal text-white px-4 py-2 rounded-lg hover:bg-primary-teal-dark transition-colors"
              >
                <UserPlus className="w-5 h-5" />
                Create {activeTab === 'super-admin' ? 'Super Admin' : activeTab === 'healthcare-admin' ? 'Healthcare Admin' : 'Staff'}
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('super-admin')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'super-admin'
                    ? 'border-b-2 border-primary-teal text-primary-teal'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Super Admins ({superAdmins.length})
              </button>
              <button
                onClick={() => setActiveTab('healthcare-admin')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'healthcare-admin'
                    ? 'border-b-2 border-primary-teal text-primary-teal'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Healthcare Admins ({healthcareAdmins.length})
              </button>
              <button
                onClick={() => setActiveTab('staff')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'staff'
                    ? 'border-b-2 border-primary-teal text-primary-teal'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Staff ({staff.length})
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'super-admin' ? 'super admins' : activeTab === 'healthcare-admin' ? 'healthcare admins' : 'staff'}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-teal focus:border-transparent"
              />
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-teal"></div>
                <p className="text-gray-600 mt-2">Loading users...</p>
              </div>
            ) : activeTab === 'super-admin' ? (
              /* Super Admins Table */
              filteredSuperAdmins.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No super admins found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Role
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Created Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredSuperAdmins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {admin.first_name} {admin.last_name}
                            </div>
                            {admin.contact_number && (
                              <div className="text-sm text-gray-500">{admin.contact_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {admin.email}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                              Super Admin
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              admin.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(admin.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingUserId(admin.id);
                                setIsEditSuperAdminModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(admin.id, `${admin.first_name} ${admin.last_name}`, 'super-admin')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : activeTab === 'healthcare-admin' ? (
              /* Healthcare Admins Table */
              filteredHealthcareAdmins.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No healthcare admins found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Assigned Service
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Created Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredHealthcareAdmins.map((admin) => (
                        <tr key={admin.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {admin.first_name} {admin.last_name}
                            </div>
                            {admin.contact_number && (
                              <div className="text-sm text-gray-500">{admin.contact_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {admin.email}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            {admin.assigned_service ? (
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColors(admin.assigned_service.category).bgColor} ${getCategoryColors(admin.assigned_service.category).textColor}`}>
                                {admin.assigned_service.name}
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                Not Assigned
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              admin.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {admin.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(admin.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingUserId(admin.id);
                                setIsEditHealthcareAdminModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(admin.id, `${admin.first_name} ${admin.last_name}`, 'healthcare-admin')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            ) : (
              /* Staff Table */
              filteredStaff.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No staff found</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Email
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Disease Coverage
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Created Date
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredStaff.map((s) => (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {s.first_name} {s.last_name}
                            </div>
                            {s.contact_number && (
                              <div className="text-sm text-gray-500">{s.contact_number}</div>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                            {s.email}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                              All Diseases
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                              s.status === 'active'
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
                            {new Date(s.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => {
                                setEditingUserId(s.id);
                                setIsEditStaffModalOpen(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 mr-4"
                            >
                              <Edit className="w-4 h-4 inline" />
                            </button>
                            <button
                              onClick={() => openDeleteConfirm(s.id, `${s.first_name} ${s.last_name}`, 'staff')}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )
            )}
          </div>
        </div>

        {/* Create Modals */}
        {activeTab === 'super-admin' ? (
          <CreateSuperAdminForm
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => loadUsers()}
          />
        ) : activeTab === 'healthcare-admin' ? (
          <CreateHealthcareAdminForm
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => loadUsers()}
          />
        ) : (
          <CreateStaffForm
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => loadUsers()}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isDeleteConfirmOpen}
          onClose={() => {
            setIsDeleteConfirmOpen(false);
            setUserToDelete(null);
          }}
          onConfirm={confirmDelete}
          title="Delete User"
          message={`Are you sure you want to delete ${userToDelete?.name || 'this user'}? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          isLoading={deleteLoading}
        />

        {/* Edit Modals */}
        <EditSuperAdminForm
          userId={editingUserId}
          isOpen={isEditSuperAdminModalOpen}
          onClose={() => {
            setIsEditSuperAdminModalOpen(false);
            setEditingUserId('');
          }}
          onSuccess={() => loadUsers()}
        />

        <EditHealthcareAdminForm
          userId={editingUserId}
          isOpen={isEditHealthcareAdminModalOpen}
          onClose={() => {
            setIsEditHealthcareAdminModalOpen(false);
            setEditingUserId('');
          }}
          onSuccess={() => loadUsers()}
        />

        <EditStaffForm
          userId={editingUserId}
          isOpen={isEditStaffModalOpen}
          onClose={() => {
            setIsEditStaffModalOpen(false);
            setEditingUserId('');
          }}
          onSuccess={() => loadUsers()}
        />
      </Container>
    </DashboardLayout>
  );
}
