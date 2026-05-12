import { createServerSupabaseClient } from '@/lib/supabase-server';
import { Users, FolderOpen, Package, TrendingUp } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  const [{ count: contactCount }, { count: projectCount }, { count: productCount }] = await Promise.all([
    supabase.from('contacts').select('*', { count: 'exact', head: true }),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('products').select('*', { count: 'exact', head: true }),
  ]);

  const { data: recentProjects } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const { data: recentContacts } = await supabase
    .from('contacts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const stats = [
    { label: 'Total Contacts', value: contactCount ?? 0, icon: Users, color: '#6c63ff' },
    { label: 'Active Projects', value: projectCount ?? 0, icon: FolderOpen, color: '#ff6584' },
    { label: 'Products', value: productCount ?? 0, icon: Package, color: '#4ade80' },
    { label: 'This Month', value: recentProjects?.length ?? 0, icon: TrendingUp, color: '#fbbf24' },
  ];

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Welcome back. Here&apos;s what&apos;s happening.
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="stat-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, margin: 0 }}>{label}</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', margin: '0.4rem 0 0 0', fontFamily: 'Syne, sans-serif' }}>
                  {value}
                </p>
              </div>
              <div style={{
                width: '40px',
                height: '40px',
                background: `${color}18`,
                border: `1px solid ${color}30`,
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tables */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Recent Projects */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1.25rem 0', color: 'var(--text)' }}>
            Recent Projects
          </h3>
          {recentProjects && recentProjects.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentProjects.map((p: { id: string; client_name: string; status: string; product_name?: string }) => (
                <div key={p.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.75rem',
                  background: 'var(--surface-2)',
                  borderRadius: '8px',
                }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{p.client_name}</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{p.product_name || 'No product'}</p>
                  </div>
                  <span className={`badge badge-${p.status}`}>{p.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No projects yet</p>
          )}
        </div>

        {/* Recent Contacts */}
        <div className="glass" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 1.25rem 0', color: 'var(--text)' }}>
            Recent Contacts
          </h3>
          {recentContacts && recentContacts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {recentContacts.map((c: { id: string; name: string; company?: string; email?: string }) => (
                <div key={c.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  background: 'var(--surface-2)',
                  borderRadius: '8px',
                }}>
                  <div style={{
                    width: '34px',
                    height: '34px',
                    background: 'rgba(108,99,255,0.15)',
                    border: '1px solid rgba(108,99,255,0.2)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    color: 'var(--accent)',
                    flexShrink: 0,
                  }}>
                    {c.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)' }}>{c.name}</p>
                    <p style={{ margin: '0.1rem 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {c.company || c.email || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>No contacts yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
