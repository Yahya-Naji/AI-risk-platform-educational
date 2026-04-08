'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Shield,
  Home,
  CheckSquare,
  MessageSquare,
  ClipboardList,
  Bot,
  HelpCircle,
  BarChart3,
  Search,
  Users,
  FolderOpen,
  Sun,
  Moon,
  Upload,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import NotificationBell from '@/components/NotificationBell';

type Role = 'business-owner' | 'risk-manager' | 'admin' | 'chief-risk-manager' | 'executive';

interface NavItem {
  icon: LucideIcon;
  label: string;
  href: string;
  badge?: number;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  role: Role;
  activePage?: string;
}

interface UserData {
  id: string;
  name: string;
  department: string;
  company: string;
  group: string;
  avatar: string;
  role: string;
}

const userEmail: Record<Role, string> = {
  'business-owner': 'ahmed.mansouri@hei-adpu.ae',
  'risk-manager': 'sara.khalil@adek.gov.ae',
  'admin': 'admin@adek.gov.ae',
  'chief-risk-manager': 'khalid.rahman@adek.gov.ae',
  'executive': 'noura.almazrouei@adek.gov.ae',
};

const roleLabel: Record<string, string> = {
  BUSINESS_OWNER: 'HEI Representative',
  RISK_MANAGER: 'ADEK Risk Analyst',
  CHIEF_RISK_MANAGER: 'ADEK Senior Manager',
  EXECUTIVE: 'ADEK Leadership',
  ADMIN: 'System Administrator',
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState<UserData | null>(null);
  const [taskCount, setTaskCount] = useState(0);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch(`/api/users?email=${userEmail[role]}`);
        if (res.ok) {
          const data = await res.json();
          setUser(data);
          if (role === 'business-owner' && data.id) {
            const taskRes = await fetch(`/api/business-owner/tasks?userId=${data.id}`);
            if (taskRes.ok) {
              const tasks = await taskRes.json();
              setTaskCount(tasks.length);
            }
          }
        }
      } catch {
        // Fallback
      }
    }
    loadUser();
  }, [role]);

  const navConfig: Record<Role, NavSection[]> = {
    'business-owner': [
      {
        title: 'MY INSTITUTION',
        items: [
          { icon: Home, label: 'My Dashboard', href: '/business-owner/dashboard' },
          { icon: CheckSquare, label: 'My Tasks', href: '/business-owner/tasks', badge: taskCount || undefined },
          { icon: MessageSquare, label: 'Report Anomaly Risk', href: '/business-owner/report-risk' },
          { icon: ClipboardList, label: 'Submitted Responses', href: '/business-owner/submitted-risks' },
        ],
      },
      {
        title: 'SUPPORT',
        items: [
          { icon: Bot, label: 'AI Copilot', href: '/business-owner/assistant' },
          { icon: HelpCircle, label: 'ADEK Guidelines', href: '/business-owner/guidelines' },
        ],
      },
    ],
    'risk-manager': [
      {
        title: 'ADEK OVERSIGHT',
        items: [
          { icon: Home, label: 'HEI Dashboard', href: '/risk-manager/dashboard' },
          { icon: ClipboardList, label: 'Risk Registry', href: '/risk-manager/registry' },
          { icon: Search, label: 'Pending Review', href: '/risk-manager/review' },
          { icon: CheckSquare, label: 'Task Review', href: '/risk-manager/tasks' },
        ],
      },
      {
        title: 'ACTIONS',
        items: [
          { icon: MessageSquare, label: 'Flag Institution Risk', href: '/business-owner/report-risk' },
          { icon: Bot, label: 'AI Risk Assistant', href: '/risk-manager/assistant' },
        ],
      },
    ],
    'admin': [
      {
        title: 'SYSTEM',
        items: [
          { icon: Users, label: 'HEI & User Management', href: '/admin/users' },
          { icon: ClipboardList, label: 'Workflows', href: '/admin/workflows' },
          { icon: Upload, label: 'Bulk Import', href: '/admin/import' },
          { icon: ClipboardList, label: 'Form Builder', href: '/admin/form-builder' },
          { icon: FolderOpen, label: 'Repositories', href: '/admin/repositories' },
        ],
      },
    ],
    'chief-risk-manager': [
      {
        title: 'SECTOR OVERSIGHT',
        items: [
          { icon: Home, label: 'Sector Dashboard', href: '/chief-risk-manager/dashboard' },
          { icon: ClipboardList, label: 'HEI Risk Registry', href: '/chief-risk-manager/registry' },
          { icon: Search, label: 'Pending Review', href: '/risk-manager/review' },
        ],
      },
      {
        title: 'TOOLS',
        items: [
          { icon: MessageSquare, label: 'Flag Institution Risk', href: '/business-owner/report-risk' },
          { icon: Bot, label: 'AI Risk Assistant', href: '/risk-manager/assistant' },
        ],
      },
    ],
    'executive': [
      {
        title: 'ADEK LEADERSHIP',
        items: [
          { icon: Home, label: 'Sector Intelligence', href: '/executive/dashboard' },
          { icon: BarChart3, label: 'HEI Risk Portfolio', href: '/executive/registry' },
          { icon: MessageSquare, label: 'Flag Institution Risk', href: '/business-owner/report-risk' },
        ],
      },
    ],
  };

  const sections = navConfig[role];

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        height: '100vh',
        overflowY: 'auto',
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ padding: '20px 16px 14px', borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Shield size={18} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 700, lineHeight: 1.1 }}>
                <span className="gradient-text">EduRisk</span>{' '}
                <span style={{ color: 'var(--text-secondary)', fontWeight: 400, fontSize: '14px' }}>AI</span>
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {user?.group || 'ADEK — Abu Dhabi'}
              </div>
            </div>
          </div>
        </div>
      </Link>

      {/* Notification Bell */}
      {user?.id && (
        <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>Alerts</span>
          <NotificationBell userId={user.id} />
        </div>
      )}

      {/* Department Badge */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: '10px',
            background: 'rgba(74,176,222,0.06)',
            border: '1px solid transparent',
            backgroundImage:
              'linear-gradient(var(--bg-secondary), var(--bg-secondary)), linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
            backgroundOrigin: 'border-box',
            backgroundClip: 'padding-box, border-box',
          }}
        >
          <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>
            YOUR INSTITUTION
          </div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FolderOpen size={14} style={{ opacity: 0.7 }} />
            {user?.department || 'Loading...'}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '10px 10px' }}>
        {sections.map((section) => (
          <div key={section.title} style={{ marginBottom: '18px' }}>
            <div
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text-muted)',
                letterSpacing: '0.8px',
                textTransform: 'uppercase',
                padding: '4px 8px 6px',
              }}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              const Icon = item.icon;

              return (
                <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                  <div
                    className={isActive ? 'nav-active' : ''}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 8px 8px 10px',
                      borderRadius: '8px',
                      marginBottom: '2px',
                      cursor: 'pointer',
                      color: isActive ? undefined : 'var(--text-secondary)',
                      fontSize: '13px',
                      fontWeight: isActive ? 600 : 400,
                      transition: 'background 0.2s, color 0.2s',
                      borderLeft: isActive ? undefined : '3px solid transparent',
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(74,176,222,0.07)';
                        (e.currentTarget as HTMLDivElement).style.color = 'var(--text-primary)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive) {
                        (e.currentTarget as HTMLDivElement).style.background = 'transparent';
                        (e.currentTarget as HTMLDivElement).style.color = 'var(--text-secondary)';
                      }
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0, opacity: 0.85 }} />
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge !== undefined && (
                      <span
                        style={{
                          background: 'var(--danger)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '10px',
                          lineHeight: 1.4,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Theme Toggle + User Footer */}
      <div style={{ borderTop: '1px solid var(--border-color)' }}>
        <div
          style={{
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 600 }}>
            {theme === 'dark' ? 'Dark' : 'Light'} Mode
          </span>
          <button
            onClick={toggleTheme}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              border: 'none',
              background: theme === 'dark'
                ? 'linear-gradient(135deg, #4ab0de, #8b5cf6)'
                : 'linear-gradient(135deg, #f59e0b, #ef4444)',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.3s',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                background: '#fff',
                position: 'absolute',
                top: '3px',
                left: theme === 'dark' ? '3px' : '23px',
                transition: 'left 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {theme === 'dark'
                ? <Moon size={10} style={{ color: '#8b5cf6' }} />
                : <Sun size={10} style={{ color: '#f59e0b' }} />
              }
            </div>
          </button>
        </div>
        <div
          style={{
            padding: '10px 14px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #4ab0de 0%, #8b5cf6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
              color: '#fff',
              flexShrink: 0,
            }}
          >
            {user?.avatar || '..'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Loading...'}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
              {user?.role ? roleLabel[user.role] || user.role : ''}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
