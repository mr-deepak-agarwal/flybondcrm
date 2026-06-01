'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Users, FolderOpen, Package, Megaphone, LogOut, Zap } from 'lucide-react';
import { createClient } from '@/lib/supabase';

const links = [
  { href: '/dashboard',           label: 'Dashboard',  icon: LayoutDashboard },
  { href: '/dashboard/contacts',  label: 'Contacts',   icon: Users },
  { href: '/dashboard/projects',  label: 'Orders',     icon: FolderOpen },
  { href: '/dashboard/products',  label: 'Products',   icon: Package },
  { href: '/dashboard/campaigns', label: 'Campaigns',  icon: Megaphone },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside style={{
      width: '220px',
      minHeight: '100vh',
      background: 'var(--surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '1.5rem 1rem',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '2rem', padding: '0 0.25rem' }}>
        <div style={{
          width: '32px', height: '32px',
          background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
          borderRadius: '9px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Zap size={16} color="#fff" />
        </div>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>
          CRM Pro
        </span>
      </div>

      {/* Nav */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', flex: 1 }}>
        <p style={{
          fontSize: '0.65rem', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.12em',
          color: 'var(--text-muted)', padding: '0 0.6rem', marginBottom: '0.5rem',
        }}>
          Menu
        </p>
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`sidebar-link${isActive ? ' active' : ''}`}>
              <Icon size={15} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button onClick={handleLogout} className="sidebar-link" style={{ marginTop: '0.5rem' }}>
        <LogOut size={15} />
        Sign out
      </button>
    </aside>
  );
}
