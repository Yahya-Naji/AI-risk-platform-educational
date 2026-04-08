'use client';

import { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import {
  Users,
  Search,
  UserPlus,
  Edit3,
  Trash2,
  X,
  Shield,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Download,
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  company: string;
  group: string;
  avatar: string;
  createdAt: string;
  _count: {
    reportedRisks: number;
    assignedRisks: number;
    tasks: number;
    comments: number;
  };
}

const ROLE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  ADMIN: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.25)' },
  RISK_MANAGER: { bg: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: 'rgba(139,92,246,0.25)' },
  BUSINESS_OWNER: { bg: 'rgba(74,176,222,0.12)', color: '#4ab0de', border: 'rgba(74,176,222,0.25)' },
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrator',
  RISK_MANAGER: 'Risk Manager',
  BUSINESS_OWNER: 'Business Owner',
};

const ROLE_DESCRIPTIONS: Record<string, { desc: string; perms: string }> = {
  ADMIN: {
    desc: 'Full system access including user management',
    perms: 'All permissions + Admin Panel',
  },
  RISK_MANAGER: {
    desc: 'Manage, validate and assign risks',
    perms: 'Risk Registry, Validate, Review',
  },
  BUSINESS_OWNER: {
    desc: 'Report risks for their department',
    perms: 'Report Risk, View Tasks',
  },
};

type TabKey = 'all' | 'admin' | 'risk-manager' | 'business-owner';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All Departments');
  const [selected, setSelected] = useState<string[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<User | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'BUSINESS_OWNER',
    department: '',
    company: 'Bloom Holding',
    group: 'National Holding Group',
  });

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
      showToastMsg('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Derived data
  const departments = ['All Departments', ...Array.from(new Set(users.map((u) => u.department))).sort()];

  const tabCounts = {
    all: users.length,
    admin: users.filter((u) => u.role === 'ADMIN').length,
    'risk-manager': users.filter((u) => u.role === 'RISK_MANAGER').length,
    'business-owner': users.filter((u) => u.role === 'BUSINESS_OWNER').length,
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'admin', label: 'Administrators' },
    { key: 'risk-manager', label: 'Risk Managers' },
    { key: 'business-owner', label: 'Business Owners' },
  ];

  const filteredUsers = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchDept = deptFilter === 'All Departments' || u.department === deptFilter;
    const matchTab =
      activeTab === 'all' ||
      (activeTab === 'admin' && u.role === 'ADMIN') ||
      (activeTab === 'risk-manager' && u.role === 'RISK_MANAGER') ||
      (activeTab === 'business-owner' && u.role === 'BUSINESS_OWNER');
    return matchSearch && matchDept && matchTab;
  });

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selected.length === filteredUsers.length) setSelected([]);
    else setSelected(filteredUsers.map((u) => u.id));
  };

  // CRUD handlers
  const handleCreate = async () => {
    if (!formData.name || !formData.email || !formData.department) {
      showToastMsg('Name, email, and department are required');
      return;
    }
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        showToastMsg(`User ${formData.name} created successfully`);
        setShowModal(false);
        setFormData({ name: '', email: '', role: 'BUSINESS_OWNER', department: '', company: 'Bloom Holding', group: 'National Holding Group' });
        fetchUsers();
      } else {
        const err = await res.json();
        showToastMsg(err.error || 'Failed to create user');
      }
    } catch {
      showToastMsg('Failed to create user');
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingUser.id, ...formData }),
      });
      if (res.ok) {
        showToastMsg(`User ${formData.name} updated successfully`);
        setEditingUser(null);
        fetchUsers();
      } else {
        const err = await res.json();
        showToastMsg(err.error || 'Failed to update user');
      }
    } catch {
      showToastMsg('Failed to update user');
    }
  };

  const handleDelete = async (user: User) => {
    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, { method: 'DELETE' });
      if (res.ok) {
        showToastMsg(`User ${user.name} deleted`);
        setDeleteConfirm(null);
        setSelected((prev) => prev.filter((id) => id !== user.id));
        fetchUsers();
      } else {
        showToastMsg('Failed to delete user');
      }
    } catch {
      showToastMsg('Failed to delete user');
    }
  };

  const handleBulkRoleChange = async (newRole: string) => {
    let success = 0;
    for (const id of selected) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, role: newRole }),
        });
        if (res.ok) success++;
      } catch {
        // skip
      }
    }
    showToastMsg(`Role updated for ${success} user(s)`);
    setSelected([]);
    fetchUsers();
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      company: user.company,
      group: user.group,
    });
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ name: '', email: '', role: 'BUSINESS_OWNER', department: '', company: 'Bloom Holding', group: 'National Holding Group' });
    setShowModal(true);
  };

  const isModalOpen = showModal || editingUser !== null;
  const isEditing = editingUser !== null;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar role="chief-risk-manager" activePage="users" />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Toast */}
        {toast && (
          <div
            style={{
              position: 'fixed',
              top: '24px',
              right: '24px',
              zIndex: 2000,
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              padding: '14px 22px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '14px',
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
              animation: 'fadeUp 0.3s ease',
            }}
          >
            <CheckCircle size={14} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            {toast}
          </div>
        )}

        {/* Delete Confirmation */}
        {deleteConfirm && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              className="animate-fade-up"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '18px',
                padding: '32px',
                width: '420px',
                maxWidth: '95vw',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(239,68,68,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <AlertTriangle size={24} color="#ef4444" />
              </div>
              <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700 }}>Delete User</h3>
              <p style={{ margin: '0 0 24px', fontSize: '14px', color: 'var(--text-muted)' }}>
                Are you sure you want to delete <strong style={{ color: 'var(--text-primary)' }}>{deleteConfirm.name}</strong>?
                This will remove all their data and cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#ef4444',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Modal */}
        {isModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              className="animate-fade-up"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '18px',
                padding: '32px',
                width: '520px',
                maxWidth: '95vw',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                  {isEditing ? 'Edit User' : 'Add New User'}
                </h3>
                <button
                  onClick={() => { setShowModal(false); setEditingUser(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={labelStyle}>Full Name</label>
                  <input
                    value={formData.name}
                    onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Ahmed Al-Rashid"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                    placeholder="ahmed@bloomholding.com"
                    style={inputStyle}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Department</label>
                    <input
                      value={formData.department}
                      onChange={(e) => setFormData((p) => ({ ...p, department: e.target.value }))}
                      placeholder="e.g. Finance"
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Company</label>
                    <input
                      value={formData.company}
                      onChange={(e) => setFormData((p) => ({ ...p, company: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ ...labelStyle, marginBottom: '10px' }}>Role</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(['ADMIN', 'RISK_MANAGER', 'BUSINESS_OWNER'] as const).map((r) => {
                      const rc = ROLE_COLORS[r];
                      return (
                        <label
                          key={r}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            padding: '12px',
                            borderRadius: '10px',
                            border: `1px solid ${formData.role === r ? rc.border : 'var(--border-color)'}`,
                            background: formData.role === r ? rc.bg : 'var(--bg-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                          }}
                        >
                          <input
                            type="radio"
                            name="role"
                            checked={formData.role === r}
                            onChange={() => setFormData((p) => ({ ...p, role: r }))}
                            style={{ marginTop: '3px', accentColor: rc.color }}
                          />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: formData.role === r ? rc.color : 'var(--text-primary)', marginBottom: '2px' }}>
                              {ROLE_LABELS[r]}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                              {ROLE_DESCRIPTIONS[r].desc}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                              Permissions: {ROLE_DESCRIPTIONS[r].perms}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button
                  onClick={() => { setShowModal(false); setEditingUser(null); }}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-color)',
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={isEditing ? handleUpdate : handleCreate}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '10px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isEditing ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ padding: '32px' }}>
          {/* Header */}
          <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 6px' }}>
                <span className="gradient-text">User Management</span>
              </h1>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                {users.length} users across all departments
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  import('@/lib/export-pdf').then(({ exportUsersPDF }) => exportUsersPDF(users));
                }}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <Download size={14} /> Export PDF
              </button>
              <button
                onClick={fetchUsers}
                style={{
                  padding: '9px 16px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <RefreshCw size={14} /> Refresh
              </button>
              <button
                onClick={openCreateModal}
                style={{
                  padding: '9px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #4ab0de, #8b5cf6)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <UserPlus size={14} /> Add User
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '28px' }}>
            {[
              { label: 'Total Users', value: tabCounts.all, color: '#4ab0de', icon: Users },
              { label: 'Administrators', value: tabCounts.admin, color: '#ef4444', icon: Shield },
              { label: 'Risk Managers', value: tabCounts['risk-manager'], color: '#8b5cf6', icon: AlertTriangle },
              { label: 'Business Owners', value: tabCounts['business-owner'], color: '#4ab0de', icon: CheckCircle },
            ].map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${s.color}25`,
                    borderRadius: '14px',
                    padding: '18px 20px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</span>
                    <Icon size={16} color={s.color} style={{ opacity: 0.7 }} />
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              );
            })}
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '1px solid var(--border-color)', paddingBottom: '0' }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '10px 16px',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  color: activeTab === tab.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  borderBottom: `2px solid ${activeTab === tab.key ? 'var(--accent-cyan)' : 'transparent'}`,
                  marginBottom: '-1px',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {tab.label}
                <span
                  style={{
                    background: activeTab === tab.key ? 'rgba(74,176,222,0.15)' : 'var(--bg-card)',
                    color: activeTab === tab.key ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    borderRadius: '10px',
                    padding: '1px 7px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  {tabCounts[tab.key]}
                </span>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users by name or email..."
                style={{ ...inputStyle, paddingLeft: '36px', width: '100%' }}
              />
            </div>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              style={{ ...inputStyle, minWidth: '160px' }}
            >
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Bulk actions */}
          {selected.length > 0 && (
            <div
              className="animate-fade-up"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 16px',
                background: 'rgba(74,176,222,0.06)',
                border: '1px solid rgba(74,176,222,0.2)',
                borderRadius: '10px',
                marginBottom: '16px',
                flexWrap: 'wrap',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--accent-cyan)', fontWeight: 700 }}>
                {selected.length} user{selected.length > 1 ? 's' : ''} selected
              </span>
              {(['ADMIN', 'RISK_MANAGER', 'BUSINESS_OWNER'] as const).map((role) => (
                <button
                  key={role}
                  onClick={() => handleBulkRoleChange(role)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '7px',
                    border: `1px solid ${ROLE_COLORS[role].border}`,
                    background: ROLE_COLORS[role].bg,
                    color: ROLE_COLORS[role].color,
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Set {ROLE_LABELS[role]}
                </button>
              ))}
              <button
                onClick={() => setSelected([])}
                style={{
                  marginLeft: 'auto',
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-color)',
                  background: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                Clear
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
              <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', marginBottom: '12px' }} />
              <p>Loading users...</p>
            </div>
          ) : (
            <>
              {/* Table */}
              <div
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                }}
              >
                <div style={{ overflowX: 'auto' }}>
                  <table className="risk-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>
                          <input
                            type="checkbox"
                            checked={selected.length === filteredUsers.length && filteredUsers.length > 0}
                            onChange={toggleAll}
                            style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                          />
                        </th>
                        <th>User</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Company</th>
                        <th>Risks</th>
                        <th>Tasks</th>
                        <th>Joined</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                            {search || deptFilter !== 'All Departments' ? 'No users match your filters' : 'No users found'}
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => {
                          const roleStyle = ROLE_COLORS[user.role] || ROLE_COLORS.BUSINESS_OWNER;
                          const isSelected = selected.includes(user.id);
                          return (
                            <tr
                              key={user.id}
                              style={{
                                background: isSelected ? 'rgba(74,176,222,0.04)' : 'transparent',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected)
                                  (e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)';
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected)
                                  (e.currentTarget as HTMLTableRowElement).style.background = 'transparent';
                              }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelect(user.id)}
                                  style={{ accentColor: 'var(--accent-cyan)', cursor: 'pointer' }}
                                />
                              </td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                  <div
                                    style={{
                                      width: '34px',
                                      height: '34px',
                                      borderRadius: '50%',
                                      background: `linear-gradient(135deg, ${roleStyle.color}88, ${roleStyle.color}44)`,
                                      border: `1px solid ${roleStyle.border}`,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '11px',
                                      fontWeight: 800,
                                      color: roleStyle.color,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {user.avatar}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                                      {user.name}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{user.email}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span
                                  style={{
                                    background: roleStyle.bg,
                                    color: roleStyle.color,
                                    border: `1px solid ${roleStyle.border}`,
                                    borderRadius: '6px',
                                    padding: '3px 10px',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {ROLE_LABELS[user.role] || user.role}
                                </span>
                              </td>
                              <td style={{ fontSize: '13px' }}>{user.department}</td>
                              <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{user.company}</td>
                              <td style={{ fontSize: '13px', textAlign: 'center' }}>
                                <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>{user._count.reportedRisks}</span>
                              </td>
                              <td style={{ fontSize: '13px', textAlign: 'center' }}>
                                <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{user._count.tasks}</span>
                              </td>
                              <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                {new Date(user.createdAt).toLocaleDateString()}
                              </td>
                              <td>
                                <div style={{ display: 'flex', gap: '4px' }}>
                                  <button
                                    onClick={() => openEditModal(user)}
                                    title="Edit user"
                                    style={actionBtnStyle}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent-cyan)';
                                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(74,176,222,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
                                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)';
                                    }}
                                  >
                                    <Edit3 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(user)}
                                    title="Delete user"
                                    style={{ ...actionBtnStyle, color: '#ef4444' }}
                                    onMouseEnter={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(239,68,68,0.3)';
                                      (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)';
                                    }}
                                    onMouseLeave={(e) => {
                                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-color)';
                                      (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-secondary)';
                                    }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Showing {filteredUsers.length} of {users.length} users
                </span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  border: '1px solid var(--border-color)',
  borderRadius: '8px',
  padding: '9px 12px',
  color: 'var(--text-primary)',
  fontSize: '13px',
  outline: 'none',
  fontFamily: 'inherit',
  width: '100%',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '6px',
};

const actionBtnStyle: React.CSSProperties = {
  padding: '6px 8px',
  borderRadius: '6px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-secondary)',
  cursor: 'pointer',
  color: 'var(--text-secondary)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s',
};
