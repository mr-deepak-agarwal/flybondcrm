'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Eye, Pencil, Trash2, X, Star, Phone, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import ContactModal from '@/components/ContactModal';
import type { Contact } from '@/types';
import { contactDisplayName } from '@/types';

const STATUS_OPTIONS = ['all', 'suspect', 'prospect', 'active', 'loyal', 'blacklisted'];

function StarDisplay({ rating }: { rating?: number }) {
  const r = rating ?? 0;
  return (
    <span style={{ display: 'flex', gap: '1px' }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={11} fill={i <= r ? 'var(--warning)' : 'none'} color={i <= r ? 'var(--warning)' : 'var(--border-2)'} />
      ))}
    </span>
  );
}

export default function ContactsPage() {
  const [contacts, setContacts]   = useState<Contact[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Contact | null>(null);
  const [viewing, setViewing]     = useState<Contact | null>(null);
  const [toast, setToast]         = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contacts').select('*').order('created_at', { ascending: false });
    setContacts(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const filtered = contacts.filter(c => {
    const name = contactDisplayName(c).toLowerCase();
    const matchSearch = !search ||
      name.includes(search.toLowerCase()) ||
      (c.company || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.mobile || '').includes(search) ||
      (c.email || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || c.status === filter;
    return matchSearch && matchFilter;
  });

  async function del(id: string) {
    if (!confirm('Delete this contact?')) return;
    const { error } = await supabase.from('contacts').delete().eq('id', id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Contact deleted', type: 'success' }); load(); }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Contacts</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>
            {contacts.length} total &nbsp;·&nbsp; {filtered.length} shown
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>
          <Plus size={15} /> New Contact
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ flex: '1', minWidth: '220px', maxWidth: '360px' }}>
          <Search size={14} />
          <input
            className="input"
            placeholder="Search name, company, phone…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              style={{
                padding: '0.35rem 0.8rem',
                border: `1px solid ${filter === s ? 'var(--accent)' : 'var(--border)'}`,
                borderRadius: '20px',
                background: filter === s ? 'rgba(108,99,255,0.14)' : 'transparent',
                color: filter === s ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '0.775rem',
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Contact</th>
                <th>Company</th>
                <th>Mobile</th>
                <th>Status</th>
                <th>Rating</th>
                <th>Assigned</th>
                <th style={{ width: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>Loading…</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '3rem' }}>
                  {search || filter !== 'all' ? 'No contacts match your filters.' : 'No contacts yet. Add your first one!'}
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{
                        width: '32px', height: '32px',
                        background: 'rgba(108,99,255,0.14)',
                        border: '1px solid rgba(108,99,255,0.2)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent)', flexShrink: 0,
                      }}>
                        {c.first_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, margin: 0, fontSize: '0.875rem' }}>{contactDisplayName(c)}</p>
                        {c.email && (
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{c.email}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-dim)' }}>{c.company || '—'}</td>
                  <td style={{ color: 'var(--text-dim)', fontFamily: 'monospace', fontSize: '0.82rem' }}>{c.mobile || c.phone || '—'}</td>
                  <td>
                    {c.status ? <span className={`badge badge-${c.status}`}>{c.status}</span> : '—'}
                  </td>
                  <td><StarDisplay rating={c.star_rating} /></td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>{c.assigned_to || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button className="btn-icon accent" title="View" onClick={() => setViewing(c)}><Eye size={13} /></button>
                      <button className="btn-icon" title="Edit" onClick={() => { setEditing(c); setShowModal(true); }}><Pencil size={13} /></button>
                      <button className="btn-icon danger" title="Delete" onClick={() => del(c.id)}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <ContactModal
          contact={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); setToast({ msg: editing ? 'Contact updated' : 'Contact added', type: 'success' }); }}
        />
      )}

      {/* View / Detail Modal */}
      {viewing && (
        <ContactDetailModal
          contact={viewing}
          onClose={() => setViewing(null)}
          onEdit={() => { setEditing(viewing); setViewing(null); setShowModal(true); }}
        />
      )}
    </div>
  );
}

/* ─── Contact Detail (View) Modal ──────────────────────── */
function ContactDetailModal({ contact: c, onClose, onEdit }: { contact: Contact; onClose: () => void; onEdit: () => void }) {
  const [activities, setActivities] = useState<{ id: string; note: string; created_at: string }[]>([]);
  const [newNote, setNewNote] = useState('');
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('contact_activities')
      .select('*')
      .eq('contact_id', c.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setActivities(data || []));
  }, [c.id]);

  async function addNote() {
    if (!newNote.trim()) return;
    setSaving(true);
    await supabase.from('contact_activities').insert({ contact_id: c.id, note: newNote.trim() });
    const { data } = await supabase.from('contact_activities').select('*').eq('contact_id', c.id).order('created_at', { ascending: false });
    setActivities(data || []);
    setNewNote('');
    setSaving(false);
  }

  const Row = ({ label, value }: { label: string; value?: string | number | null }) =>
    value ? (
      <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8125rem', padding: '0.3rem 0', borderBottom: '1px solid rgba(39,44,61,0.4)' }}>
        <span style={{ color: 'var(--text-muted)', minWidth: '130px', flexShrink: 0 }}>{label}</span>
        <span style={{ color: 'var(--text)' }}>{value}</span>
      </div>
    ) : null;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide">
        {/* Header */}
        <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              width: '52px', height: '52px',
              background: 'linear-gradient(135deg, rgba(108,99,255,0.3), rgba(139,92,246,0.2))',
              border: '1px solid rgba(108,99,255,0.3)',
              borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent)',
            }}>
              {c.first_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>{contactDisplayName(c)}</h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                {c.company && <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{c.company}</span>}
                {c.status && <span className={`badge badge-${c.status}`}>{c.status}</span>}
                {c.frequency_type && c.frequency_type !== 'unassigned' && (
                  <span className="badge badge-prospect">{c.frequency_type}</span>
                )}
                {(c.star_rating ?? 0) > 0 && (
                  <span style={{ display: 'flex', gap: '1px' }}>
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} size={12} fill={i <= (c.star_rating ?? 0) ? 'var(--warning)' : 'none'} color={i <= (c.star_rating ?? 0) ? 'var(--warning)' : 'var(--border-2)'} />
                    ))}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn-ghost" onClick={onEdit}><Pencil size={13} /> Edit</button>
            <button className="btn-icon" onClick={onClose}><X size={15} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, maxHeight: '70vh', overflow: 'hidden' }}>
          {/* Left: Details */}
          <div style={{ padding: '1.25rem 1.5rem', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>
            {/* Contact */}
            <div className="section-label">Contact</div>
            <Row label="Mobile / WhatsApp" value={c.mobile} />
            <Row label="Phone" value={c.phone} />
            <Row label="Email" value={c.email} />
            <Row label="WhatsApp (alt)" value={c.whatsapp} />
            <Row label="Email 2" value={c.email_2} />

            {/* Address */}
            <div className="section-label" style={{ marginTop: '1rem' }}>Address</div>
            <Row label="Address" value={c.address_line} />
            <Row label="Area / Village" value={c.area} />
            <Row label="Taluka" value={c.taluka} />
            <Row label="District" value={c.district} />
            <Row label="State" value={c.state} />
            <Row label="PIN" value={c.pin} />

            {/* Owner / Proprietor */}
            {(c.owner_name || c.owner_mobile) && <>
              <div className="section-label" style={{ marginTop: '1rem' }}>Owner / Proprietor</div>
              <Row label="Name" value={c.owner_name} />
              <Row label="Mobile" value={c.owner_mobile} />
              <Row label="WhatsApp" value={c.owner_whatsapp} />
            </>}

            {/* Legal */}
            {(c.gst_no || c.pan_no || c.aadhar_no || c.driving_license) && <>
              <div className="section-label" style={{ marginTop: '1rem' }}>Legal / IDs</div>
              <Row label="GST No." value={c.gst_no} />
              <Row label="PAN" value={c.pan_no} />
              <Row label="Aadhar" value={c.aadhar_no} />
              <Row label="Driving License" value={c.driving_license} />
            </>}

            {/* Online */}
            {(c.website || c.instagram || c.facebook || c.google_review) && <>
              <div className="section-label" style={{ marginTop: '1rem' }}>Online</div>
              <Row label="Website" value={c.website} />
              <Row label="Instagram" value={c.instagram} />
              <Row label="Facebook" value={c.facebook} />
              <Row label="Google Review" value={c.google_review} />
            </>}

            {/* CRM */}
            <div className="section-label" style={{ marginTop: '1rem' }}>CRM Info</div>
            <Row label="Assigned To" value={c.assigned_to} />
            <Row label="Type" value={c.contact_type} />
            <Row label="Category" value={c.category} />
            <Row label="Segment" value={c.segment} />
            <Row label="Next Call" value={c.next_call_date} />
            <Row label="Significance" value={c.call_significance} />
            <Row label="Pending" value={c.pending_status} />
            {c.notes && <>
              <div className="section-label" style={{ marginTop: '1rem' }}>Notes</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-dim)', lineHeight: 1.6, padding: '0.5rem 0' }}>{c.notes}</p>
            </>}
          </div>

          {/* Right: Activity Log */}
          <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div className="section-label">Activity Log</div>

            {/* Add note */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                className="input"
                placeholder="Add a note or call log…"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addNote()}
                style={{ flex: 1 }}
              />
              <button className="btn-primary" style={{ padding: '0.6rem 0.9rem', flexShrink: 0 }} onClick={addNote} disabled={saving}>
                <Plus size={14} />
              </button>
            </div>

            {/* Log entries */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activities.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>No activity yet. Add a note above.</p>
              ) : activities.map((a, i) => (
                <div key={a.id} className="activity-item">
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', paddingTop: '3px' }}>
                    <div className="activity-dot" />
                    {i < activities.length - 1 && <div style={{ width: '1px', flex: 1, background: 'var(--border)', minHeight: '12px' }} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, lineHeight: 1.5, color: 'var(--text)' }}>{a.note}</p>
                    <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {new Date(a.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Next call reminder */}
            {c.next_call_date && (
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem 1rem',
                background: 'rgba(108,99,255,0.08)',
                border: '1px solid rgba(108,99,255,0.18)',
                borderRadius: '9px',
              }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '0 0 0.2rem 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Next Call Scheduled
                </p>
                <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent)', margin: 0 }}>
                  {new Date(c.next_call_date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
