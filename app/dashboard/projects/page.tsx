'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, FolderOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import type { Project, Product } from '@/types';

const empty = { client_name: '', address: '', work_description: '', product_id: '', product_name: '', status: 'active' as const };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: proj }, { data: prod }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
    ]);
    setProjects(proj || []);
    setProducts(prod || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setForm(empty); setShowModal(true); }
  function openEdit(p: Project) {
    setEditing(p);
    setForm({ client_name: p.client_name, address: p.address || '', work_description: p.work_description || '', product_id: p.product_id || '', product_name: p.product_name || '', status: p.status as 'active' });
    setShowModal(true);
  }
  function close() { setShowModal(false); }

  function handleProductChange(id: string) {
    const prod = products.find(p => p.id === id);
    setForm(f => ({ ...f, product_id: id, product_name: prod?.name || '' }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };

    if (editing) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editing.id);
      if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Project updated', type: 'success' }); }
    } else {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Project added', type: 'success' }); }
    }

    setSaving(false); close(); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Project deleted', type: 'success' }); load(); }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Projects</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>{projects.length} total</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> New Project</button>
      </div>

      <div className="glass">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Client Name</th>
                <th>Address</th>
                <th>Product</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading...</td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No projects yet.</td></tr>
              ) : projects.map(p => (
                <tr key={p.id}>
                  <td>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.client_name}</div>
                      {p.work_description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.work_description}</div>}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address || '—'}</td>
                  <td>
                    {p.product_name ? (
                      <span style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--accent)', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>
                        {p.product_name}
                      </span>
                    ) : '—'}
                  </td>
                  <td><span className={`badge badge-${p.status}`}>{p.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-ghost" style={{ padding: '0.4rem 0.7rem' }} onClick={() => openEdit(p)}><Pencil size={13} /></button>
                      <button className="btn-danger" style={{ padding: '0.4rem 0.7rem' }} onClick={() => del(p.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div style={{ padding: '1.5rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                <FolderOpen size={18} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--accent)' }} />
                {editing ? 'Edit Project' : 'New Project'}
              </h2>
              <button className="btn-ghost" style={{ padding: '0.4rem' }} onClick={close}><X size={16} /></button>
            </div>
            <form onSubmit={save} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Client Name *</label>
                <input className="input" required placeholder="Acme Corporation" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
              </div>
              <div>
                <label>Address</label>
                <input className="input" placeholder="123 Business Park, Jaipur" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label>Work Description</label>
                <textarea className="input" placeholder="Describe the work to be done..." value={form.work_description} onChange={e => setForm(f => ({ ...f, work_description: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Product</label>
                  <select className="input" value={form.product_id} onChange={e => handleProductChange(e.target.value)}>
                    <option value="">Select product...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as 'active' }))}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Project'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
