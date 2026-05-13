'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Pencil, Trash2, X, FolderOpen, Search, ChevronDown } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import type { Project, Product } from '@/types';

const empty = {
  client_name: '',
  address: '',
  work_description: '',
  product_id: '',
  product_name: '',
  status: 'active' as const,
};

// ─── Portal Dropdown ────────────────────────────────────────────────────────
// Renders at document.body level so modal overflow:hidden never clips it
function PortalDropdown({
  anchorRef,
  open,
  children,
}: {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  open: boolean;
  children: React.ReactNode;
}) {
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + window.scrollY + 4,
      left: rect.left + window.scrollX,
      width: rect.width,
    });
  }, [open, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      style={{
        position: 'absolute',
        top: coords.top,
        left: coords.left,
        width: coords.width,
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        zIndex: 9999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        maxHeight: '220px',
        overflowY: 'auto',
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// ─── Generic Autocomplete ───────────────────────────────────────────────────
interface AutoItem { id: string; label: string; sub?: string; }

function AutocompleteInput({
  items,
  value,
  placeholder,
  onChange,
  onClear,
}: {
  items: AutoItem[];
  value: { id: string; name: string };
  placeholder: string;
  onChange: (item: AutoItem) => void;
  onClear: () => void;
}) {
  const [query, setQuery] = useState(value.name);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value.name); }, [value.name]);

  const filtered = items.filter(i =>
    i.label.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 8);

  function select(item: AutoItem) {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    onChange(item);
    setQuery(item.label);
    setOpen(false);
  }

  function clear() {
    onClear();
    setQuery('');
    setOpen(false);
  }

  function handleBlur() {
    // Delay close so onMouseDown on a dropdown item fires first
    closeTimer.current = setTimeout(() => setOpen(false), 200);
  }

  function handleFocus() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search size={14} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        <input
          className="input"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem' }}
        />
        {value.id ? (
          <button type="button" onClick={clear} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: 0 }}>
            <X size={14} />
          </button>
        ) : (
          <ChevronDown size={14} style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
        )}
      </div>

      <PortalDropdown anchorRef={wrapRef} open={open && filtered.length > 0}>
        {filtered.map(item => (
          <div
            key={item.id}
            onMouseDown={() => select(item)}
            style={{
              padding: '0.65rem 1rem',
              cursor: 'pointer',
              fontSize: '0.875rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: value.id === item.id ? 'rgba(108,99,255,0.12)' : 'transparent',
              color: value.id === item.id ? 'var(--accent)' : 'var(--text)',
              borderLeft: value.id === item.id ? '2px solid var(--accent)' : '2px solid transparent',
            }}
            onMouseEnter={e => { if (value.id !== item.id) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)'; }}
            onMouseLeave={e => { if (value.id !== item.id) (e.currentTarget as HTMLDivElement).style.background = 'transparent'; }}
          >
            <span style={{ fontWeight: value.id === item.id ? 600 : 400 }}>{item.label}</span>
            {item.sub && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.sub}</span>}
          </div>
        ))}
      </PortalDropdown>
    </div>
  );
}

// ─── Contact Autocomplete ───────────────────────────────────────────────────
interface Contact { id: string; name: string; company?: string; }

function ContactAutocomplete({ contacts, value, onChange }: {
  contacts: Contact[];
  value: { id: string; name: string };
  onChange: (id: string, name: string) => void;
}) {
  return (
    <AutocompleteInput
      items={contacts.map(c => ({ id: c.id, label: c.name, sub: c.company }))}
      value={value}
      placeholder="Search contacts..."
      onChange={item => onChange(item.id, item.label)}
      onClear={() => onChange('', '')}
    />
  );
}

// ─── Product Autocomplete ───────────────────────────────────────────────────
function ProductAutocomplete({ products, value, onChange }: {
  products: Product[];
  value: { id: string; name: string };
  onChange: (id: string, name: string) => void;
}) {
  return (
    <AutocompleteInput
      items={products.map(p => ({ id: p.id, label: p.name, sub: p.price != null ? `₹${p.price.toLocaleString('en-IN')}` : undefined }))}
      value={value}
      placeholder="Search product..."
      onChange={item => onChange(item.id, item.label)}
      onClear={() => onChange('', '')}
    />
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(empty);
  const [selectedContactId, setSelectedContactId] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: proj }, { data: prod }, { data: cont }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('products').select('*').order('name'),
      supabase.from('contacts').select('id, name, company').order('name'),
    ]);
    setProjects(proj || []);
    setProducts(prod || []);
    setContacts(cont || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setForm(empty); setSelectedContactId(''); setShowModal(true); }
  function openEdit(p: Project) {
    setEditing(p);
    setForm({ client_name: p.client_name, address: p.address || '', work_description: p.work_description || '', product_id: p.product_id || '', product_name: p.product_name || '', status: p.status as 'active' });
    setSelectedContactId('');
    setShowModal(true);
  }
  function close() { setShowModal(false); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };
    if (editing) {
      const { error } = await supabase.from('projects').update(payload).eq('id', editing.id);
      if (error) setToast({ msg: error.message, type: 'error' });
      else setToast({ msg: 'Project updated', type: 'success' });
    } else {
      const { error } = await supabase.from('projects').insert(payload);
      if (error) setToast({ msg: error.message, type: 'error' });
      else setToast({ msg: 'Project added', type: 'success' });
    }
    setSaving(false); close(); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this project?')) return;
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Project deleted', type: 'success' }); load(); }
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
                    <div style={{ fontWeight: 600 }}>{p.client_name}</div>
                    {p.work_description && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.work_description}</div>}
                  </td>
                  <td style={{ color: 'var(--text-muted)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.address || '—'}</td>
                  <td>
                    {p.product_name ? (
                      <span style={{ background: 'rgba(108,99,255,0.1)', color: 'var(--accent)', padding: '0.2rem 0.65rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>{p.product_name}</span>
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
                <ContactAutocomplete
                  contacts={contacts}
                  value={{ id: selectedContactId, name: form.client_name }}
                  onChange={(id, name) => { setSelectedContactId(id); setForm(f => ({ ...f, client_name: name })); }}
                />
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
                  <ProductAutocomplete
                    products={products}
                    value={{ id: form.product_id, name: form.product_name }}
                    onChange={(id, name) => setForm(f => ({ ...f, product_id: id, product_name: name }))}
                  />
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