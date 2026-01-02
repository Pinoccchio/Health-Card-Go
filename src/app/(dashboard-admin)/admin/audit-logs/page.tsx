'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth';
import { DashboardLayout } from '@/components/dashboard';
import { Container, Button } from '@/components/ui';
import { ProfessionalCard } from '@/components/ui/ProfessionalCard';
import { EnhancedTable, Column } from '@/components/ui/EnhancedTable';
import { Drawer } from '@/components/ui/Drawer';
import {
  Shield,
  Activity,
  Users,
  FileText,
  Download,
  Eye,
  Calendar,
  Filter,
  Search,
  AlertCircle,
} from 'lucide-react';

// Types
interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  } | null;
}

type ActionFilter = 'all' | string;
type EntityFilter = 'all' | string;

export default function AdminAuditLogsPage() {
  const { user } = useAuth();

  // State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<ActionFilter>('all');
  const [entityFilter, setEntityFilter] = useState<EntityFilter>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all'); // all, today, week, month
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Fetch audit logs
  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/admin/audit-logs');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch audit logs');
      }

      const data = await response.json();
      setLogs(data.data || []);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const uniqueActions = useMemo(() => {
    const actions = new Set(logs.map(log => log.action));
    return Array.from(actions).sort();
  }, [logs]);

  const uniqueEntities = useMemo(() => {
    const entities = new Set(logs.map(log => log.entity_type));
    return Array.from(entities).sort();
  }, [logs]);

  const uniqueUsers = useMemo(() => {
    const users = logs
      .filter(log => log.profiles)
      .map(log => ({
        id: log.user_id!,
        name: `${log.profiles!.first_name} ${log.profiles!.last_name}`,
        email: log.profiles!.email,
      }));

    // Remove duplicates by user_id
    const uniqueUsersMap = new Map();
    users.forEach(user => {
      if (!uniqueUsersMap.has(user.id)) {
        uniqueUsersMap.set(user.id, user);
      }
    });

    return Array.from(uniqueUsersMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [logs]);

  // Calculate statistics
  const statistics = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

    const total = logs.length;
    const todayCount = logs.filter(log => new Date(log.created_at) >= today).length;
    const weekCount = logs.filter(log => new Date(log.created_at) >= weekAgo).length;
    const uniqueUsersCount = new Set(logs.map(log => log.user_id).filter(Boolean)).size;

    // Entity type breakdown
    const entityCounts: Record<string, number> = {};
    logs.forEach(log => {
      entityCounts[log.entity_type] = (entityCounts[log.entity_type] || 0) + 1;
    });

    return {
      total,
      todayCount,
      weekCount,
      uniqueUsersCount,
      entityCounts,
    };
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let filtered = logs;

    // Action filter
    if (actionFilter !== 'all') {
      filtered = filtered.filter(log => log.action === actionFilter);
    }

    // Entity filter
    if (entityFilter !== 'all') {
      filtered = filtered.filter(log => log.entity_type === entityFilter);
    }

    // User filter
    if (userFilter !== 'all') {
      filtered = filtered.filter(log => log.user_id === userFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      if (dateFilter === 'today') {
        filtered = filtered.filter(log => new Date(log.created_at) >= today);
      } else if (dateFilter === 'week') {
        const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(log => new Date(log.created_at) >= weekAgo);
      } else if (dateFilter === 'month') {
        const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(log => new Date(log.created_at) >= monthAgo);
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(log => {
        const userName = log.profiles
          ? `${log.profiles.first_name} ${log.profiles.last_name}`.toLowerCase()
          : '';
        const userEmail = log.profiles?.email.toLowerCase() || '';
        const action = log.action.toLowerCase();
        const entityType = log.entity_type.toLowerCase();
        const entityId = log.entity_id?.toLowerCase() || '';

        return (
          userName.includes(query) ||
          userEmail.includes(query) ||
          action.includes(query) ||
          entityType.includes(query) ||
          entityId.includes(query)
        );
      });
    }

    return filtered;
  }, [logs, actionFilter, entityFilter, userFilter, dateFilter, searchQuery]);

  // Table columns
  const columns: Column<AuditLog>[] = [
    {
      accessor: 'created_at',
      header: 'Timestamp',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {new Date(row.created_at).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </div>
          <div className="text-gray-500">
            {new Date(row.created_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </div>
        </div>
      ),
    },
    {
      accessor: 'user_id',
      header: 'User',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          {row.profiles ? (
            <>
              <div className="font-medium text-gray-900">
                {row.profiles.first_name} {row.profiles.last_name}
              </div>
              <div className="text-gray-500">{row.profiles.email}</div>
              <div className="text-xs text-gray-400 mt-0.5">
                Role: {row.profiles.role}
              </div>
            </>
          ) : (
            <div className="text-gray-400 italic">System</div>
          )}
        </div>
      ),
    },
    {
      accessor: 'action',
      header: 'Action',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {row.action}
          </span>
        </div>
      ),
    },
    {
      accessor: 'entity_type',
      header: 'Entity Type',
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {row.entity_type}
          </span>
        </div>
      ),
    },
    {
      accessor: 'entity_id',
      header: 'Entity ID',
      sortable: false,
      render: (value, row) => (
        <div className="text-sm text-gray-500 font-mono">
          {row.entity_id ? row.entity_id.substring(0, 8) + '...' : 'N/A'}
        </div>
      ),
    },
    {
      accessor: 'ip_address',
      header: 'IP Address',
      sortable: false,
      render: (value, row) => (
        <div className="text-sm text-gray-500 font-mono">
          {row.ip_address || 'N/A'}
        </div>
      ),
    },
    {
      accessor: 'actions',
      header: 'Actions',
      sortable: false,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="View Details"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  // Handlers
  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedLog(null);
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      alert('No logs to export');
      return;
    }

    // Prepare CSV data
    const headers = [
      'Timestamp',
      'User',
      'Email',
      'Role',
      'Action',
      'Entity Type',
      'Entity ID',
      'IP Address',
      'User Agent',
    ];

    const rows = filteredLogs.map(log => [
      new Date(log.created_at).toISOString(),
      log.profiles ? `${log.profiles.first_name} ${log.profiles.last_name}` : 'System',
      log.profiles?.email || 'N/A',
      log.profiles?.role || 'N/A',
      log.action,
      log.entity_type,
      log.entity_id || 'N/A',
      log.ip_address || 'N/A',
      log.user_agent || 'N/A',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetFilters = () => {
    setActionFilter('all');
    setEntityFilter('all');
    setUserFilter('all');
    setDateFilter('all');
    setSearchQuery('');
  };

  return (
    <DashboardLayout
      roleId={1}
      pageTitle="Audit Logs"
      pageDescription="View system activity and security audit trail"
    >
      <Container size="full">
        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error Loading Audit Logs</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
          </div>
        )}

        {!loading && (
          <>
            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <ProfessionalCard
                variant="flat"
                className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Logs</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.total}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard
                variant="flat"
                className="bg-gradient-to-br from-green-50 to-green-100 border-l-4 border-green-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Today</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.todayCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Activity className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard
                variant="flat"
                className="bg-gradient-to-br from-purple-50 to-purple-100 border-l-4 border-purple-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Last 7 Days</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.weekCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>

              <ProfessionalCard
                variant="flat"
                className="bg-gradient-to-br from-orange-50 to-orange-100 border-l-4 border-orange-500"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Unique Users</p>
                    <p className="text-3xl font-bold text-gray-900">{statistics.uniqueUsersCount}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                </div>
              </ProfessionalCard>
            </div>

            {/* Filters */}
            <ProfessionalCard variant="bordered" className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Filter className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Action Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Action
                  </label>
                  <select
                    value={actionFilter}
                    onChange={(e) => setActionFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="all">All Actions</option>
                    {uniqueActions.map(action => (
                      <option key={action} value={action}>
                        {action}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Entity Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity Type
                  </label>
                  <select
                    value={entityFilter}
                    onChange={(e) => setEntityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="all">All Entities</option>
                    {uniqueEntities.map(entity => (
                      <option key={entity} value={entity}>
                        {entity}
                      </option>
                    ))}
                  </select>
                </div>

                {/* User Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    User
                  </label>
                  <select
                    value={userFilter}
                    onChange={(e) => setUserFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="all">All Users</option>
                    {uniqueUsers.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                  </select>
                </div>

                {/* Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Search
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search logs..."
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-600">
                  Showing {filteredLogs.length} of {logs.length} logs
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={handleResetFilters}
                    className="flex items-center gap-2"
                  >
                    Reset Filters
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleExportCSV}
                    disabled={filteredLogs.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </ProfessionalCard>

            {/* Audit Logs Table */}
            <ProfessionalCard variant="bordered">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
                </div>
              </div>

              <EnhancedTable
                columns={columns}
                data={filteredLogs}
                emptyMessage="No audit logs found"
              />
            </ProfessionalCard>
          </>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-lg shadow p-8">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        )}

        {/* Details Drawer */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={handleCloseDrawer}
          title="Audit Log Details"
          size="lg"
        >
          {selectedLog && (
            <div className="space-y-6">
              {/* Timestamp Section */}
              <div className="pb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timestamp
                </label>
                <div className="text-sm text-gray-900">
                  {new Date(selectedLog.created_at).toLocaleString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </div>
              </div>

              {/* User Information Section */}
              <div className="border-t border-gray-200 pt-6 pb-4">
                <label className="block text-sm font-medium text-gray-900 mb-3">
                  User Information
                </label>
                {selectedLog.profiles ? (
                  <div className="text-sm space-y-1">
                    <div className="font-medium text-gray-900">
                      {selectedLog.profiles.first_name} {selectedLog.profiles.last_name}
                    </div>
                    <div className="text-gray-500">{selectedLog.profiles.email}</div>
                    <div className="text-gray-500">
                      <span className="font-medium">Role:</span> {selectedLog.profiles.role}
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 italic">System</div>
                )}
              </div>

              {/* Action & Entity Section */}
              <div className="border-t border-gray-200 pt-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Action */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Action
                    </label>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {selectedLog.action}
                    </span>
                  </div>

                  {/* Entity Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Entity Type
                    </label>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                      {selectedLog.entity_type}
                    </span>
                  </div>
                </div>

                {/* Entity ID */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Entity ID
                  </label>
                  <div className="font-mono text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border border-gray-200">
                    {selectedLog.entity_id || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Changes Section */}
              {selectedLog.changes && (
                <div className="border-t border-gray-200 pt-6 pb-4">
                  <label className="block text-sm font-medium text-gray-900 mb-3">
                    Changes
                  </label>
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <pre className="text-xs text-gray-900 overflow-x-auto whitespace-pre-wrap font-mono">
                      {JSON.stringify(selectedLog.changes, null, 2)}
                    </pre>
                  </div>
                </div>
              )}

              {/* Technical Details Section */}
              <div className="border-t border-gray-200 pt-6">
                <label className="block text-sm font-medium text-gray-900 mb-4">
                  Technical Details
                </label>
                <div className="space-y-4">
                  {/* IP Address */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      IP Address
                    </label>
                    <div className="text-sm text-gray-900 font-mono bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {selectedLog.ip_address || 'N/A'}
                    </div>
                  </div>

                  {/* User Agent */}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                      User Agent
                    </label>
                    <div className="text-sm text-gray-900 break-words bg-gray-50 px-3 py-2 rounded border border-gray-200">
                      {selectedLog.user_agent || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Drawer>
      </Container>
    </DashboardLayout>
  );
}
