'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Phone, Star, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import ContactModal from '@/components/ContactModal';
import type { Contact } from '@/types';
import { contactDisplayName } from '@/types';

function daysUntilCall(dateStr?: string): { label: string; color: string } | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)   return { label: `${Math.abs(diff)}d overdue`, color: 'var(--error, #ef4444)' };
  if (diff === 0) return { label: 'Today',                      color: 'var(--warning, #f59e0b)' };
  if (diff <= 3)  return { label: `in ${diff}d`,                color: 'var(--warning, #f59e0b)' };
  return            { label: `in ${diff}d`,                      color: 'var(--success, #10b981)' };
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [editing, setEditing]   = useState<Contact | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]       = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('contacts')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setToast({ msg: error.message, type: 'error' });
    setContacts(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd()           { setEditing(null); setShowModal(true); }
  function openEdit(c: Contact) { setEditing(c); setShowModal(true); }
  function close()             { setShowModal(false); }

  function onSaved() {
    close();
    setToast({ msg: editing ? 'Contact updated' : 'Contact added', type: 'success' });
    load();
  }

  async function del(id: string) {
    if (!confirm('Delete this contact?')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Contact deleted', type: 'success' }); load(); }
  }

  // Every text-ish field a person might plausibly search by.
  // (Status/contact_type/etc. are technically text too, but searching
  // those by typing "prospect" is unlikely — kept to fields with
  // free-form, person-entered values.)
  const SEARCHABLE_FIELDS: (keyof Contact)[] = [
    'title', 'first_name', 'middle_name', 'last_name', 'company', 'job_title',
    'category', 'segment', 'assigned_to',
    'address_line', 'area', 'taluka', 'district', 'state', 'pin',
    'phone', 'phone_2', 'mobile', 'whatsapp', 'email', 'email_2',
    'website', 'instagram', 'facebook', 'google_review',
    'gst_no', 'pan_no', 'aadhar_no', 'driving_license',
    'owner_name', 'owner_mobile', 'owner_whatsapp',
    'notes', 'pending_status',
  ];

  const filtered = contacts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return SEARCHABLE_FIELDS.some(field => {
      const value = c[field];
      return typeof value === 'string' && value.toLowerCase().includes(q);
    });
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Contacts</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>
            {contacts.length} total
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={15} /> Add Contact
        </button>
      </div>

      {/* Search */}
      <div className="search-wrap" style={{ marginBottom: '1.25rem', maxWidth: '340px' }}>
        <Search size={14} />
        <input
          className="input"
          placeholder="Search name, company, phone, email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* List */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        {/* Column header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr 1fr 0.9fr 0.9fr 0.8fr 70px',
          padding: '0.6rem 1rem',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {['Name', 'Company', 'Phone / WhatsApp', 'Status', 'Next Call', 'Rating', ''].map(h => (
            <span key={h} style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
              {h}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            {search ? (
              'No contacts match your search.'
            ) : (
              <>
                <Users size={32} style={{ opacity: 0.4, marginBottom: '0.75rem' }} />
                <div>No contacts yet. Add your first one.</div>
              </>
            )}
          </div>
        ) : filtered.map(c => {
          const callBadge = daysUntilCall(c.next_call_date);
          return (
            <div
              key={c.id}
              onClick={() => openEdit(c)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.4fr 1fr 1fr 0.9fr 0.9fr 0.8fr 70px',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(39,44,61,0.5)',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contactDisplayName(c) || '—'}
                </p>
                {c.job_title && (
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: '0.1rem 0 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.job_title}
                  </p>
                )}
              </div>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.company || '—'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {(c.mobile || c.phone) && <Phone size={11} style={{ flexShrink: 0 }} />}
                {c.mobile || c.phone || '—'}
              </span>

              <div>
                {c.status && <span className={`badge badge-${c.status}`} style={{ fontSize: '0.7rem' }}>{c.status}</span>}
              </div>

              <div>
                {callBadge ? (
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700, color: callBadge.color,
                    background: `${callBadge.color}18`, border: `1px solid ${callBadge.color}40`,
                    padding: '0.15rem 0.5rem', borderRadius: '20px', whiteSpace: 'nowrap',
                  }}>
                    {callBadge.label}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                {c.star_rating ? (
                  <>
                    <Star size={12} fill="var(--warning)" color="var(--warning)" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.star_rating}</span>
                  </>
                ) : <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>—</span>}
              </div>

              <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(c); }}><Pencil size={12} /></button>
                <button className="btn-icon danger" onClick={e => { e.stopPropagation(); del(c.id); }}><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <ContactModal
          contact={editing}
          onClose={close}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}