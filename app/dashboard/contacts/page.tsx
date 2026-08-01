'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, Phone, Users, Filter, X } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import BranchModal from '@/components/BranchModal';
import type { Branch } from '@/types';
import {
  primaryContact, contactDisplayName, formatMobile, defaultAddress, callDelayDays,
  CATEGORY_OPTIONS, SEGMENT_OPTIONS, BRANCH_STATUS_OPTIONS,
} from '@/types';

export default function ContactsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading]    = useState(true);
  const [search, setSearch]      = useState('');
  const [primaryOnly, setPrimaryOnly] = useState(false); // "Filter of primary contact" — match search only against the primary person
  const [showAll, setShowAll]    = useState(true); // "Show All" button from the wireframe — toggles filtered/full list
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSegment, setFilterSegment]   = useState('');
  const [filterStatus, setFilterStatus]     = useState('');
  const [filterTown, setFilterTown]         = useState('');
  const [filterBranchCode, setFilterBranchCode] = useState('');
  const [editing, setEditing]    = useState<Branch | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast]        = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    // Pull each branch together with its linked people (phones/emails) and
    // addresses in one round trip, rather than N+1 queries per row.
    const { data, error } = await supabase
      .from('branches')
      .select('*, addresses:branch_addresses(*), contacts(*, phones:contact_phones(*), emails:contact_emails(*), activities:contact_activities(reschedule_at))')
      .order('created_at', { ascending: false });
    if (error) setToast({ msg: error.message, type: 'error' });
    setBranches(data || []);
    setLoading(false);
    return data || [];
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd()            { setEditing(null); setShowModal(true); }
  function openEdit(b: Branch)  { setEditing(b); setShowModal(true); }
  function close()              { setShowModal(false); }

  // Modal no longer closes itself on Save — it stays open so the user can
  // keep adding people/activity/etc. Just refresh the list behind it and
  // point `editing` at the freshly-saved row (matters for a brand-new
  // branch, which needs to flip from "New Contact" into edit mode).
  async function onSaved(branchId: string) {
    setToast({ msg: editing ? 'Contact updated' : 'Contact added', type: 'success' });
    const fresh = await load();
    const saved = fresh.find(b => b.id === branchId);
    if (saved) setEditing(saved);
  }

  async function del(id: string) {
    if (!confirm('Delete this contact and everyone linked to it?')) return;
    const { error } = await supabase.from('branches').delete().eq('id', id);
    if (error) setToast({ msg: error.message, type: 'error' });
    else { setToast({ msg: 'Contact deleted', type: 'success' }); load(); }
  }

  function clearFilters() {
    setFilterCategory(''); setFilterSegment(''); setFilterStatus('');
    setFilterTown(''); setFilterBranchCode('');
  }

  const townOptions = useMemo(
    () => Array.from(new Set(branches.map(b => defaultAddress(b)?.town).filter(Boolean))).sort() as string[],
    [branches]
  );

  const SEARCHABLE_BRANCH_FIELDS: (keyof Branch)[] = ['name', 'branch_code', 'category', 'segment', 'assigned_to'];

  const filtered = branches.filter(b => {
    // "Show All" (wireframe button) vs. the default filtered view — for now, the
    // default view hides branches marked Dump; Show All removes that filter.
    if (!showAll && b.status === 'Dump') return false;

    if (filterCategory && b.category !== filterCategory) return false;
    if (filterSegment && b.segment !== filterSegment) return false;
    if (filterStatus && b.status !== filterStatus) return false;
    if (filterTown && defaultAddress(b)?.town !== filterTown) return false;
    if (filterBranchCode && !(b.branch_code || '').toLowerCase().includes(filterBranchCode.toLowerCase())) return false;

    if (!search) return true;
    const q = search.toLowerCase();

    if (SEARCHABLE_BRANCH_FIELDS.some(field => {
      const value = b[field];
      return typeof value === 'string' && value.toLowerCase().includes(q);
    })) return true;
    const addr = defaultAddress(b);
    if (addr && [addr.town, addr.taluka, addr.district, addr.state, addr.pin].some(v => v?.toLowerCase().includes(q))) return true;

    // Search across linked people's name/mobile/email — either every
    // person, or only the primary contact if that filter is on.
    const people = primaryOnly
      ? [primaryContact(b)].filter(Boolean) as NonNullable<ReturnType<typeof primaryContact>>[]
      : (b.contacts || []);
    return people.some(c => {
      const name = contactDisplayName(c).toLowerCase();
      const phones = (c.phones || []).map(p => p.number.toLowerCase());
      const emails = (c.emails || []).map(e => e.email.toLowerCase());
      return name.includes(q) || phones.some(p => p.includes(q)) || emails.some(e => e.includes(q));
    });
  });

  const activeFilterCount = [filterCategory, filterSegment, filterStatus, filterTown, filterBranchCode].filter(Boolean).length;

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

      {/* Search + Show All + Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ maxWidth: '340px', flex: 1 }}>
          <Search size={14} />
          <input
            className="input"
            placeholder="Search name, company, phone, email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={primaryOnly} onChange={e => setPrimaryOnly(e.target.checked)} />
          Primary contact only
        </label>
        <button
          className="btn-secondary"
          onClick={() => setShowAll(v => !v)}
          style={{ fontSize: '0.8rem' }}
        >
          {showAll ? 'Hide dumped' : 'Show All'}
        </button>
        <button
          className="btn-secondary"
          onClick={() => setShowFilters(v => !v)}
          style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
        >
          <Filter size={13} /> Filters
          {activeFilterCount > 0 && (
            <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {showFilters && (
        <div className="glass" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.85rem 1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <select className="input" style={{ width: '160px' }} value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="input" style={{ width: '160px' }} value={filterSegment} onChange={e => setFilterSegment(e.target.value)}>
            <option value="">All segments</option>
            {SEGMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="input" style={{ width: '150px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All statuses</option>
            {BRANCH_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select className="input" style={{ width: '150px' }} value={filterTown} onChange={e => setFilterTown(e.target.value)}>
            <option value="">All towns</option>
            {townOptions.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <input
            className="input" style={{ width: '140px' }}
            placeholder="Branch code" value={filterBranchCode}
            onChange={e => setFilterBranchCode(e.target.value)}
          />
          {activeFilterCount > 0 && (
            <button className="btn-icon" onClick={clearFilters} title="Clear filters"><X size={13} /></button>
          )}
        </div>
      )}

      {/* List */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        {/* Column header — matches the client's wireframe columns */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '90px 1.2fr 1.05fr 0.95fr 0.85fr 0.7fr 0.9fr 70px',
          padding: '0.6rem 1rem',
          background: 'var(--surface-2)',
          borderBottom: '1px solid var(--border)',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {['Customer ID', 'Company Name', 'Name Person', 'Mobile', 'Place / Town', 'Pin Code', 'Call Status', ''].map(h => (
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
          const addr = defaultAddress(b);
          const delay = callDelayDays(person?.activities || []);
          return (
            <div
              key={b.id}
              onClick={() => openEdit(b)}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1.2fr 1.05fr 0.95fr 0.85fr 0.7fr 0.9fr 70px',
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
                {mobile ? formatMobile(mobile) : '—'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {addr?.town || '—'}
              </span>

              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {addr?.pin || '—'}
              </span>

              <span style={{ fontSize: '0.75rem' }}>
                {delay === undefined ? (
                  <span style={{ color: 'var(--text-dim)' }}>—</span>
                ) : delay === 0 ? (
                  <span style={{ color: 'var(--success, #10b981)' }}>On track</span>
                ) : (
                  <span style={{ color: 'var(--danger, #ef4444)', fontWeight: 600 }}>{delay}d delayed</span>
                )}
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
