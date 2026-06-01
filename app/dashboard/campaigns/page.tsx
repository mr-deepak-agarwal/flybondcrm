'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Megaphone } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';

interface Campaign { id: string; name: string; description?: string; created_at: string; }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Campaign | null>(null);
  const [form, setForm]           = useState({ name: '', description: '' });
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('campaigns').select('*').order('created_at', { ascending: false });
    setCampaigns(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setForm({ name: '', description: '' }); setShowModal(true); }
  function openEdit(c: Campaign) { setEditing(c); setForm({ name: c.name, description: c.description || '' }); setShowModal(true); }
  function close() { setShowModal(false); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { name: form.name, description: form.description || null };
    if (editing) {
      const { error } = await supabase.from('campaigns').update(payload).eq('id', editing.id);
      if (error) setToast({ msg: error.message, type: 'error' }); else setToast({ msg: 'Campaign updated', type: 'success' });
    } else {
      const { error } = await supabase.from('campaigns').insert(payload);
      if (error) setToast({ msg: error.message, type: 'error' }); else setToast({ msg: 'Campaign created', type: 'success' });
    }
    setSaving(false); close(); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this campaign?')) return;
    await supabase.from('campaigns').delete().eq('id', id);
    setToast({ msg: 'Campaign deleted', type: 'success' }); load();
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Campaigns</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>{campaigns.length} campaigns</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={15} /> New Campaign</button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : campaigns.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <Megaphone size={40} color="var(--text-muted)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ color: 'var(--text-muted)' }}>No campaigns yet. Create your first one.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {campaigns.map(c => (
            <div key={c.id} className="glass" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{
                  width: '38px', height: '38px',
                  background: 'rgba(255,101,132,0.1)',
                  border: '1px solid rgba(255,101,132,0.2)',
                  borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Megaphone size={17} color="var(--accent-2)" />
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn-icon" onClick={() => openEdit(c)}><Pencil size={12} /></button>
                  <button className="btn-icon danger" onClick={() => del(c.id)}><Trash2 size={12} /></button>
                </div>
              </div>
              <h3 style={{ fontSize: '0.975rem', fontWeight: 700, margin: '0 0 0.4rem 0' }}>{c.name}</h3>
              {c.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>{c.description}</p>}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                Created {new Date(c.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                <Megaphone size={17} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--accent-2)' }} />
                {editing ? 'Edit Campaign' : 'New Campaign'}
              </h2>
              <button className="btn-icon" onClick={close}><X size={15} /></button>
            </div>
            <form onSubmit={save} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Campaign Name *</label>
                <input className="input" required placeholder="Summer Promo 2024" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label>Description</label>
                <textarea className="input" placeholder="What is this campaign about?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
