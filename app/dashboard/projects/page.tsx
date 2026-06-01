'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, FolderOpen, Search, CheckCircle2, Circle } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import type { Project, Contact, Product } from '@/types';
import { PIPELINE_STAGES, contactDisplayName } from '@/types';

type ContactDropdown = Pick<Contact, 'id' | 'first_name' | 'middle_name' | 'last_name' | 'company' | 'title'>;


const emptyForm = {
  client_name: '', contact_id: '', address: '', work_description: '',
  product_id: '', product_name: '', status: 'active' as const, bill_no: '', amount: '',
};

export default function ProjectsPage() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [contacts, setContacts]   = useState<ContactDropdown[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Project | null>(null);
  const [form, setForm]           = useState(emptyForm);
  const [saving, setSaving]       = useState(false);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: proj }, { data: cont }, { data: prod }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('contacts').select('id,first_name,middle_name,last_name,company,title').order('first_name'),
      supabase.from('products').select('*').order('name'),
    ]);
    setProjects(proj || []);
    setContacts(cont || []);
    setProducts(prod || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd()  { setEditing(null); setForm(emptyForm); setShowModal(true); }
  function openEdit(p: Project) {
    setEditing(p);
    setForm({
      client_name: p.client_name,
      contact_id: p.contact_id || '',
      address: p.address || '',
      work_description: p.work_description || '',
      product_id: p.product_id || '',
      product_name: p.product_name || '',
      status: p.status,
      bill_no: p.bill_no || '',
      amount: p.amount?.toString() || '',
    });
    setShowModal(true);
  }
  function close() { setShowModal(false); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      ...form,
      amount: form.amount ? parseFloat(form.amount) : null,
      contact_id: form.contact_id || null,
      product_id: form.product_id || null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editing.id);
      if (error) setToast({ msg: error.message, type: 'error' });
      else setToast({ msg: 'Order updated', type: 'success' });
    } else {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) setToast({ msg: error.message, type: 'error' });
      else setToast({ msg: 'Order created', type: 'success' });
    }
    setSaving(false); close(); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this order?')) return;
    await supabase.from('projects').delete().eq('id', id);
    setToast({ msg: 'Order deleted', type: 'success' }); load();
  }

  async function toggleStage(project: Project, stageKey: string) {
    const current = project[stageKey as keyof Project];
    const update = { [stageKey]: current ? null : new Date().toISOString(), updated_at: new Date().toISOString() };
    await supabase.from('projects').update(update).eq('id', project.id);
    load();
  }

  const filtered = projects.filter(p =>
    !search ||
    p.client_name.toLowerCase().includes(search.toLowerCase()) ||
    (p.bill_no || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.product_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Orders</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>
            {projects.length} total &nbsp;·&nbsp; {projects.filter(p => p.status === 'active').length} active
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={15} /> New Order</button>
      </div>

      {/* Search */}
      <div className="search-wrap" style={{ marginBottom: '1.25rem', maxWidth: '340px' }}>
        <Search size={14} />
        <input className="input" placeholder="Search client, bill no, product…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Pipeline Table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        {/* Stage header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '200px 110px 110px repeat(8, 1fr) 90px 80px',
          padding: '0.6rem 1rem',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          gap: '0.25rem',
        }}>
          {['Client', 'Bill No.', 'Product', ...PIPELINE_STAGES.map(s => s.label), 'Status', 'Actions'].map(h => (
            <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', textAlign: 'center' }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {search ? 'No orders match your search.' : 'No orders yet. Create your first order!'}
          </div>
        ) : filtered.map(p => (
          <div
            key={p.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '200px 110px 110px repeat(8, 1fr) 90px 80px',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid rgba(39,44,61,0.5)',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.client_name}
              </p>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </p>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
              {p.bill_no || '—'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'center' }}>
              {p.product_name || '—'}
            </span>

            {/* Pipeline stage toggles */}
            {PIPELINE_STAGES.map(stage => {
              const done = !!p[stage.key as keyof Project];
              return (
                <div key={stage.key} style={{ display: 'flex', justifyContent: 'center' }}>
                  <button
                    onClick={() => toggleStage(p, stage.key)}
                    title={`${done ? 'Undo' : 'Complete'}: ${stage.label}`}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: done ? 'var(--success)' : 'var(--border-2)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      padding: '3px',
                      transition: 'color 0.15s, transform 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.2)')}
                    onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                  >
                    {done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                  </button>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <span className={`badge badge-${p.status}`}>{p.status}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center' }}>
              <button className="btn-icon" onClick={() => openEdit(p)}><Pencil size={12} /></button>
              <button className="btn-icon danger" onClick={() => del(p.id)}><Trash2 size={12} /></button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                <FolderOpen size={17} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--accent)' }} />
                {editing ? 'Edit Order' : 'New Order'}
              </h2>
              <button className="btn-icon" onClick={close}><X size={15} /></button>
            </div>
            <form onSubmit={save} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Client Name *</label>
                  <input className="input" required placeholder="Ideal Agronomics" value={form.client_name} onChange={e => setForm(f => ({ ...f, client_name: e.target.value }))} />
                </div>
                <div>
                  <label>Contact</label>
                  <select className="input" value={form.contact_id} onChange={e => {
                    const ct = contacts.find(c => c.id === e.target.value);
                    setForm(f => ({
                      ...f,
                      contact_id: e.target.value,
                      client_name: ct ? `${ct.first_name} ${ct.last_name || ''}`.trim() : f.client_name,
                    }));
                  }}>
                    <option value="">— Select contact —</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>
                        {contactDisplayName(c)} {c.company ? `(${c.company})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Product</label>
                  <select className="input" value={form.product_id} onChange={e => {
                    const prod = products.find(p => p.id === e.target.value);
                    setForm(f => ({ ...f, product_id: e.target.value, product_name: prod?.name || '' }));
                  }}>
                    <option value="">— Select product —</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as typeof form.status }))}>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="on-hold">On Hold</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label>Bill No.</label>
                  <input className="input" placeholder="INV-2024-001" value={form.bill_no} onChange={e => setForm(f => ({ ...f, bill_no: e.target.value }))} />
                </div>
                <div>
                  <label>Amount (₹)</label>
                  <input className="input" type="number" step="0.01" min="0" placeholder="25000" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>

              <div>
                <label>Address / Site</label>
                <input className="input" placeholder="Project site address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label>Work Description</label>
                <textarea className="input" placeholder="Describe the scope of work…" value={form.work_description} onChange={e => setForm(f => ({ ...f, work_description: e.target.value }))} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update Order' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}