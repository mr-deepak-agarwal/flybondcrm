'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, FolderOpen, Package, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';

interface Stats {
  contacts: number;
  projects: number;
  products: number;
  activeProjects: number;
  completedProjects: number;
  recentProjects: { id: string; client_name: string; status: string; created_at: string }[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    contacts: 0, projects: 0, products: 0,
    activeProjects: 0, completedProjects: 0, recentProjects: [],
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { count: contacts },
      { count: products },
      { data: projects },
    ] = await Promise.all([
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('id,client_name,status,created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const proj = projects || [];
    setStats({
      contacts: contacts || 0,
      products: products || 0,
      projects: proj.length,
      activeProjects: proj.filter(p => p.status === 'active').length,
      completedProjects: proj.filter(p => p.status === 'completed').length,
      recentProjects: proj,
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const statCards = [
    { label: 'Total Contacts', value: stats.contacts, icon: Users,      color: 'var(--accent)',   bg: 'rgba(108,99,255,0.08)',  href: '/dashboard/contacts' },
    { label: 'Active Orders',  value: stats.activeProjects, icon: FolderOpen, color: 'var(--success)', bg: 'rgba(16,185,129,0.08)', href: '/dashboard/projects' },
    { label: 'Products',       value: stats.products, icon: Package,    color: '#f59e0b',         bg: 'rgba(245,158,11,0.08)', href: '/dashboard/products' },
    { label: 'Completed',      value: stats.completedProjects, icon: CheckCircle2, color: 'var(--accent-3)', bg: 'rgba(14,165,233,0.08)', href: '/dashboard/projects' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Dashboard</h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>
          Welcome back — here's what's happening
        </p>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(({ label, value, icon: Icon, color, bg, href }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none' }}>
            <div className="stat-card" style={{ cursor: 'pointer', transition: 'transform 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.5rem' }}>{label}</p>
                  <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'Syne, sans-serif', lineHeight: 1 }}>
                    {loading ? '—' : value}
                  </p>
                </div>
                <div style={{ width: '40px', height: '40px', background: bg, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} color={color} />
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="glass" style={{ padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={16} color="var(--text-muted)" /> Recent Orders
          </h2>
          <Link href="/dashboard/projects" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            View all →
          </Link>
        </div>

        {loading ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading...</p>
        ) : stats.recentProjects.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No orders yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {stats.recentProjects.map(p => (
              <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0.75rem', borderRadius: '8px', background: 'var(--surface-2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <TrendingUp size={14} color="var(--text-muted)" />
                  <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text)' }}>{p.client_name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}