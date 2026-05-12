'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, User } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import type { Contact } from '@/types';

const empty = { name: '', email: '', phone: '', company: '', address: '', notes: '' };

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setForm(empty); setShowModal(true); }
  function openEdit(c: Contact) { setEditing(c); setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', address: c.address || '', notes: c.notes || '' }); setShowModal(true); }
  function close() { setShowModal(false); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, updated_at: new Date().toISOString() };

    if (editing) {
      const { error } = await supabase.from('contacts').update(payload).eq('id', editing.id);
      if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Contact updated', type: 'success' }); }
    } else {
      const { error } = await supabase.from('contacts').insert(payload);
      if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Contact added', type: 'success' }); }
    }

    setSaving(false);
    close();
    load();
  }

  async function del(id: string) {
    if (!confirm('Delete this contact?')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Contact deleted', type: 'success' }); load(); }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Contacts</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>{contacts.length} total</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Contact</button>
      </div>

      <div className="glass">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading...</td></tr>
              ) : contacts.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>No contacts yet. Add your first one!</td></tr>
              ) : contacts.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: '30px', height: '30px', background: 'rgba(108,99,255,0.15)', border: '1px solid rgba(108,99,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                        {c.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.email || '—'}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{c.phone || '—'}</td>
                  <td>{c.company || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn-ghost" style={{ padding: '0.4rem 0.7rem' }} onClick={() => openEdit(c)}><Pencil size={13} /></button>
                      <button className="btn-danger" style={{ padding: '0.4rem 0.7rem' }} onClick={() => del(c.id)}><Trash2 size={13} /></button>
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
                <User size={18} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--accent)' }} />
                {editing ? 'Edit Contact' : 'New Contact'}
              </h2>
              <button className="btn-ghost" style={{ padding: '0.4rem' }} onClick={close}><X size={16} /></button>
            </div>
            <form onSubmit={save} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Full Name *</label>
                  <input className="input" required placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label>Company</label>
                  <input className="input" placeholder="Acme Ltd." value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label>Email</label>
                  <input className="input" type="email" placeholder="john@acme.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div>
                  <label>Phone</label>
                  <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>
              <div>
                <label>Address</label>
                <input className="input" placeholder="123 Main St, City" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
              </div>
              <div>
                <label>Notes</label>
                <textarea className="input" placeholder="Any additional notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Contact'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
