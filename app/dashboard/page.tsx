'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, FolderOpen, Package, TrendingUp, Clock, CheckCircle2, Plus, FileText, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Link from 'next/link';
import { PIPELINE_STAGES } from '@/types';
import type { User } from '@supabase/supabase-js';

interface PipelineOrder {
  id: string;
  client_name: string;
  bill_no?: string;
  status: string;
  stage_artwork?: string;
  stage_production?: string;
  stage_billing?: string;
  stage_delivery?: string;
  stage_proof?: string;
  stage_followup?: string;
  stage_feedback?: string;
  stage_review?: string;
  created_at: string;
}

interface Stats {
  contacts: number;
  products: number;
  activeProjects: number;
  completedProjects: number;
  recentProjects: { id: string; client_name: string; status: string; created_at: string }[];
  pipelineOrders: PipelineOrder[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    contacts: 0, products: 0,
    activeProjects: 0, completedProjects: 0,
    recentProjects: [], pipelineOrders: [],
  });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { data: { user: u } },
      { count: contacts },
      { count: products },
      { data: recentRaw },
      { data: pipelineRaw },
    ] = await Promise.all([
      supabase.auth.getUser(),
      supabase.from('contacts').select('*', { count: 'exact', head: true }),
      supabase.from('products').select('*', { count: 'exact', head: true }),
      supabase.from('projects').select('id,client_name,status,created_at').order('created_at', { ascending: false }).limit(5),
      supabase.from('projects')
        .select('id,client_name,bill_no,status,stage_artwork,stage_production,stage_billing,stage_delivery,stage_proof,stage_followup,stage_feedback,stage_review,created_at')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    setUser(u);
    const recent = recentRaw || [];
    const pipeline = pipelineRaw || [];
    setStats({
      contacts: contacts || 0,
      products: products || 0,
      activeProjects: recent.filter(p => p.status === 'active').length,
      completedProjects: recent.filter(p => p.status === 'completed').length,
      recentProjects: recent,
      pipelineOrders: pipeline as PipelineOrder[],
    });
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // Derive display name from user email
  const userDisplayName = user?.user_metadata?.full_name
    || user?.email?.split('@')[0]?.replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    || 'User';
  const userRole = user?.user_metadata?.role || 'Client Servicing Executive';

  const statCards = [
    { label: 'Total Contacts', value: stats.contacts,         icon: Users,         color: 'var(--accent)',    bg: 'rgba(108,99,255,0.08)',  href: '/dashboard/contacts' },
    { label: 'Active Orders',  value: stats.activeProjects,   icon: FolderOpen,    color: 'var(--success)',   bg: 'rgba(16,185,129,0.08)',  href: '/dashboard/projects' },
    { label: 'Products',       value: stats.products,         icon: Package,       color: '#f59e0b',          bg: 'rgba(245,158,11,0.08)',  href: '/dashboard/products' },
    { label: 'Completed',      value: stats.completedProjects,icon: CheckCircle2,  color: 'var(--accent-3)',  bg: 'rgba(14,165,233,0.08)',  href: '/dashboard/projects' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>

      {/* ── Header: user info + quick actions ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.3rem 0' }}>
            {userRole}
          </p>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
            Welcome, {userDisplayName}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>
            Here's what's happening today
          </p>
        </div>

        {/* Quick action buttons */}
        <div style={{ display: 'flex', gap: '0.65rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard/projects?new=quote" style={{ textDecoration: 'none' }}>
            <button className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <FileText size={14} />
              Create Quote
            </button>
          </Link>
          <Link href="/dashboard/projects?new=order" style={{ textDecoration: 'none' }}>
            <button className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}>
              <Plus size={14} />
              New Order
            </button>
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
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

      {/* ── Two-column bottom section ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* Order Pipeline */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <TrendingUp size={15} color="var(--text-muted)" /> Order Pipeline
            </h2>
            <Link href="/dashboard/projects" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
          ) : stats.pipelineOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No active orders in pipeline.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {stats.pipelineOrders.map(order => {
                const stageKeys = PIPELINE_STAGES.map(s => s.key);
                const completedCount = stageKeys.filter(k => !!(order as Record<string, unknown>)[k]).length;
                const pct = Math.round((completedCount / stageKeys.length) * 100);
                const nextStage = PIPELINE_STAGES.find(s => !(order as Record<string, unknown>)[s.key]);
                return (
                  <Link key={order.id} href={`/dashboard/projects`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      padding: '0.75rem 0.9rem',
                      borderRadius: '9px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      transition: 'border-color 0.15s',
                      cursor: 'pointer',
                    }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(108,99,255,0.4)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <div>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>{order.client_name}</p>
                          {order.bill_no && (
                            <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>#{order.bill_no}</p>
                          )}
                        </div>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: pct === 100 ? 'var(--success)' : 'var(--accent)', background: pct === 100 ? 'rgba(16,185,129,0.1)' : 'rgba(108,99,255,0.1)', padding: '0.2rem 0.5rem', borderRadius: '20px' }}>
                          {pct}%
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div style={{ height: '4px', borderRadius: '4px', background: 'var(--border)', overflow: 'hidden', marginBottom: '0.5rem' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? 'var(--success)' : 'var(--accent)', borderRadius: '4px', transition: 'width 0.3s' }} />
                      </div>

                      {/* Stage dots */}
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {PIPELINE_STAGES.map(s => {
                          const done = !!(order as Record<string, unknown>)[s.key];
                          return (
                            <div key={s.key} title={s.label} style={{
                              width: '7px', height: '7px', borderRadius: '50%',
                              background: done ? 'var(--success)' : 'var(--border-2)',
                              flexShrink: 0,
                            }} />
                          );
                        })}
                        {nextStage && (
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: '4px' }}>
                            Next: {nextStage.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Clock size={15} color="var(--text-muted)" /> Recent Orders
            </h2>
            <Link href="/dashboard/projects" style={{ fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
              View all <ChevronRight size={13} />
            </Link>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Loading…</p>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
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
    </div>
  );
}