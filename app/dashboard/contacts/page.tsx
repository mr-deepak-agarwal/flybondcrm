'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Phone, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import BranchModal from '@/components/BranchModal';
import type { Branch } from '@/types';
import { primaryContact, contactDisplayName } from '@/types';

export default function ContactsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading]    = useState(true);
  const [search, setSearch]      = useState('');
  const [showAll, setShowAll]    = useState(true); // "Show All" button from the wireframe — toggles filtered/full list
  const [editing, setEditing]    = useState<Branch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    // Pull each branch together with its linked people (and each person's phones)
    // in one round trip, rather than N+1 queries per row.
    const { data, error } = await supabase
      .from('branches')
      .select('*, contacts(*, contact_phones(*))')
      .order('created_at', { ascending: false });
    if (error) setToast({ msg: error.message, type: 'error' });
    setBranches(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd()            { setEditing(null); setShowModal(true); }
  function openEdit(b: Branch)  { setEditing(b); setShowModal(true); }
  function close()              { setShowModal(false); }

  function onSaved() {
    close();
    setToast({ msg: editing ? 'Contact updated' : 'Contact added', type: 'success' });
    load();
  }

  async function del(id: string) {
    if (!confirm('Delete this contact and everyone linked to it?')) return;
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Contact deleted', type: 'success' }); load(); }
  }

  const SEARCHABLE_BRANCH_FIELDS: (keyof Branch)[] = [
    'name', 'branch_code', 'category', 'segment', 'assigned_to',
    'area', 'town', 'taluka', 'district', 'state', 'pin',
  ];

  const filtered = branches.filter(b => {
    // "Show All" (wireframe button) vs. the default filtered view — for now, the
    // default view hides branches marked Dump; Show All removes that filter.
    if (!showAll && b.status === 'Dump') return false;

    if (!search) return true;
    const q = search.toLowerCase();

    if (SEARCHABLE_BRANCH_FIELDS.some(field => {
      const value = b[field];
      return typeof value === 'string' && value.toLowerCase().includes(q);
    })) return true;

    // Also search across every linked person's name/mobile.
    return (b.contacts || []).some(c => {
      const name = contactDisplayName(c).toLowerCase();
      const phones = (c.phones || []).map(p => p.number.toLowerCase());
      return name.includes(q) || phones.some(p => p.includes(q));
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
            {branches.length} total
          </p>
        </div>
        <button className="btn-primary" onClick={openAdd}>
          <Plus size={15} /> Add Contact
        </button>
      </div>

      {/* Search + Show All */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ maxWidth: '340px', flex: 1 }}>
          <Search size={14} />
          <input
            className="input"
            placeholder="Search name, company, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          className="btn-secondary"
          onClick={() => setShowAll(v => !v)}
          style={{ fontSize: '0.8rem' }}
        >
          {showAll ? 'Hide dumped' : 'Show All'}
        </button>
      </div>

      {/* List */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        {/* Column header — matches the client's wireframe columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1.3fr 1.1fr 1fr 0.9fr 0.9fr 0.8fr 0.7fr 70px',
          padding: '0.6rem 1rem',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {['Customer ID', 'Company Name', 'Name Person', 'Mobile', 'Locality', 'Place / Town', 'Branch Code', 'Pin Code', ''].map(h => (
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
        ) : filtered.map(b => {
          const person = primaryContact(b);
          const mobile = person?.phones?.[0]?.number;
          return (
            <div
              key={b.id}
              onClick={() => openEdit(b)}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1.3fr 1.1fr 1fr 0.9fr 0.9fr 0.8fr 0.7fr 70px',
                padding: '0.75rem 1rem',
                borderBottom: '1px solid rgba(39,44,61,0.5)',
                alignItems: 'center',
                gap: '0.5rem',
                cursor: 'pointer',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {b.customer_id}
              </span>

              <div style={{ minWidth: 0 }}>
                <p style={{ fontWeight: 600, fontSize: '0.8125rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name || '—'}
                </p>
                {b.status && <span className={`badge badge-${b.status.toLowerCase().replace(/\s+/g, '-')}`} style={{ fontSize: '0.65rem', marginTop: '0.15rem' }}>{b.status}</span>}
              </div>

              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {person ? contactDisplayName(person) : '—'}
                </p>
                {person?.designation && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>{person.designation}</p>
                )}
              </div>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.35rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {mobile && <Phone size={11} style={{ flexShrink: 0 }} />}
                {mobile || '—'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.area || '—'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {b.town || '—'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {b.branch_code || '—'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {b.pin || '—'}
              </span>

              <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end' }}>
                <button className="btn-icon" onClick={e => { e.stopPropagation(); openEdit(b); }}><Pencil size={12} /></button>
                <button className="btn-icon danger" onClick={e => { e.stopPropagation(); del(b.id); }}><Trash2 size={12} /></button>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <BranchModal
          branch={editing}
          onClose={close}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
