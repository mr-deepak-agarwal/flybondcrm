'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, User, MapPin, Users, MessageSquare, Megaphone, Trash2, Plus, Star,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type {
  Branch, Contact, ContactActivity, ContactPhone,
} from '@/types';
import {
  contactDisplayName,
  CONTACT_TYPE_OPTIONS, CATEGORY_OPTIONS, SEGMENT_OPTIONS,
  BRANCH_STATUS_OPTIONS, DESIGNATION_OPTIONS, TITLE_OPTIONS, ADDRESS_TYPE_OPTIONS,
} from '@/types';

// A person row being edited. `id` is a real uuid for existing people,
// or a temporary client-side id (prefixed "new-") for people not yet saved.
interface PersonDraft extends Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'phones'> {
  id: string;
  isNew: boolean;
  phones: ContactPhone[];
}

const EMPTY_BRANCH: Omit<Branch, 'id' | 'customer_id' | 'created_at' | 'updated_at' | 'contacts'> = {
  name: '',
  branch_code: '',
  contact_type: '',
  category: '',
  segment: '',
  status: 'Suspect',
  assigned_to: '',
  about: '',
  default_calling: '',
  address_type: 'Billing',
  shop_no: '',
  building_name: '',
  lane_street: '',
  landmark: '',
  area: '',
  town: '',
  pin: '',
  taluka: '',
  district: '',
  state: '',
};

function blankPerson(): PersonDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
    isNew: true,
    company_id: undefined,
    is_primary: false,
    designation: '',
    title: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    company: '',
    job_title: '',
    contact_type: '',
    category: '',
    segment: '',
    status: '',
    frequency_type: '',
    star_rating: 0,
    assigned_to: '',
    address_line: '',
    area: '',
    taluka: '',
    district: '',
    state: '',
    pin: '',
    phone: '',
    phone_2: '',
    mobile: '',
    whatsapp: '',
    email: '',
    email_2: '',
    website: '',
    instagram: '',
    facebook: '',
    google_review: '',
    gst_no: '',
    pan_no: '',
    aadhar_no: '',
    driving_license: '',
    owner_name: '',
    owner_mobile: '',
    owner_whatsapp: '',
    next_call_date: '',
    call_significance: '',
    notes: '',
    pending_status: '',
    phones: [],
  };
}

const TABS = [
  { key: 'identity',  label: 'Identity',      icon: User },
  { key: 'address',   label: 'Address',       icon: MapPin },
  { key: 'people',    label: 'More Contacts', icon: Users },
  { key: 'activity',  label: 'Activity',      icon: MessageSquare },
  { key: 'campaigns', label: 'Campaigns',     icon: Megaphone },
];

interface Campaign { id: string; name: string; description?: string; }

interface Props {
  branch: Branch | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function BranchModal({ branch, onClose, onSaved }: Props) {
  const [tab, setTab]       = useState('identity');
  const [form, setForm]     = useState<typeof EMPTY_BRANCH>(EMPTY_BRANCH);
  const [people, setPeople] = useState<PersonDraft[]>([]);
  const [removedPeopleIds, setRemovedPeopleIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Activity log — attached to the primary person, since activities/campaigns
  // are still per-contact in the schema (not per-branch). Worth revisiting
  // once it's clear whether activity history should be at the branch level.
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [actNote, setActNote]       = useState('');
  const [actSaving, setActSaving]   = useState(false);
  const actEndRef = useRef<HTMLDivElement>(null);

  const [allCampaigns, setAllCampaigns]       = useState<Campaign[]>([]);
  const [linkedCampaigns, setLinkedCampaigns] = useState<Set<string>>(new Set());
  const [campToggling, setCampToggling]       = useState<string | null>(null);

  const supabase = createClient();
  const primaryId = people.find(p => p.is_primary)?.id;

  useEffect(() => {
    if (branch) {
      const src = branch as unknown as Record<string, unknown>;
      const f: typeof EMPTY_BRANCH = { ...EMPTY_BRANCH };
      (Object.keys(EMPTY_BRANCH) as (keyof typeof EMPTY_BRANCH)[]).forEach(k => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f as any)[k] = src[k] ?? '';
      });
      setForm(f);
      setPeople((branch.contacts || []).map(c => ({
        ...c,
        isNew: false,
        phones: c.phones || [],
      })) as PersonDraft[]);
    } else {
      setForm({ ...EMPTY_BRANCH });
      const first = blankPerson();
      first.is_primary = true;
      setPeople([first]);
    }
    setRemovedPeopleIds([]);
    setTab('identity');
    setActivities([]);
    setLinkedCampaigns(new Set());
  }, [branch]);

  useEffect(() => {
    if (tab === 'activity' && primaryId && !primaryId.startsWith('new-')) {
      supabase.from('contact_activities').select('*').eq('contact_id', primaryId)
        .order('created_at', { ascending: true })
        .then(({ data }) => setActivities(data || []));
    }
  }, [tab, primaryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === 'campaigns') {
      supabase.from('campaigns').select('id,name,description').order('name')
        .then(({ data }) => setAllCampaigns(data || []));
      if (primaryId && !primaryId.startsWith('new-')) {
        supabase.from('contact_campaigns').select('campaign_id').eq('contact_id', primaryId)
          .then(({ data }) => setLinkedCampaigns(new Set((data || []).map(r => r.campaign_id))));
      }
    }
  }, [tab, primaryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    actEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  function set(field: keyof typeof EMPTY_BRANCH, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function setPerson(id: string, field: keyof PersonDraft, value: unknown) {
    setPeople(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  function makePrimary(id: string) {
    setPeople(prev => prev.map(p => ({ ...p, is_primary: p.id === id })));
  }

  function addPerson() {
    setPeople(prev => [...prev, blankPerson()]);
  }

  function removePerson(id: string) {
    const removing = people.find(p => p.id === id);
    if (!removing) return;
    if (people.length === 1) { alert('A branch needs at least one contact person.'); return; }
    if (!removing.isNew) setRemovedPeopleIds(prev => [...prev, id]);
    const rest = people.filter(p => p.id !== id);
    if (removing.is_primary && rest.length) rest[0].is_primary = true;
    setPeople(rest);
  }

  function addPhone(personId: string) {
    setPeople(prev => prev.map(p => p.id === personId
      ? { ...p, phones: [...p.phones, { id: `new-${crypto.randomUUID()}`, contact_id: personId, label: `Mobile-${p.phones.length + 1}`, number: '', created_at: '' }] }
      : p));
  }

  function setPhone(personId: string, phoneId: string, field: 'label' | 'number', value: string) {
    setPeople(prev => prev.map(p => p.id === personId
      ? { ...p, phones: p.phones.map(ph => ph.id === phoneId ? { ...ph, [field]: value } : ph) }
      : p));
  }

  function removePhone(personId: string, phoneId: string) {
    setPeople(prev => prev.map(p => p.id === personId
      ? { ...p, phones: p.phones.filter(ph => ph.id !== phoneId) }
      : p));
  }

  async function save() {
    if (!form.name.trim()) { alert('Company name is required'); return; }
    if (people.some(p => !p.first_name.trim())) { alert('Every contact person needs a first name'); return; }
    setSaving(true);

    try {
      // 1. Upsert the branch.
      const branchPayload: Record<string, unknown> = { ...form, updated_at: new Date().toISOString() };
      Object.keys(branchPayload).forEach(k => { if (branchPayload[k] === '') branchPayload[k] = null; });

      let branchId: string;
      if (branch) {
        const { data, error } = await supabase.from('branches').update(branchPayload).eq('id', branch.id).select().single();
        if (error || !data) throw error || new Error('Branch update returned no row (check RLS policies).');
        branchId = data.id;
      } else {
        const { data, error } = await supabase.from('branches').insert(branchPayload).select().single();
        if (error || !data) throw error || new Error('Branch insert returned no row (check RLS policies).');
        branchId = data.id;
      }

      // 2. Delete any people removed from the list during this edit.
      if (removedPeopleIds.length) {
        await supabase.from('contacts').delete().in('id', removedPeopleIds);
      }

      // 3. Upsert each person, then replace their phones.
      for (const p of people) {
        const { isNew, phones, id, ...rest } = p;
        const personPayload: Record<string, unknown> = { ...rest, company_id: branchId, updated_at: new Date().toISOString() };
        Object.keys(personPayload).forEach(k => { if (personPayload[k] === '') personPayload[k] = null; });

        let personId = id;
        if (isNew) {
          const { data, error } = await supabase.from('contacts').insert(personPayload).select().single();
          if (error || !data) throw error || new Error('Contact insert returned no row (check RLS policies).');
          personId = data.id;
        } else {
          const { error } = await supabase.from('contacts').update(personPayload).eq('id', id);
          if (error) throw error;
        }

        // Replace-all is simplest & safest for a short, user-edited list like this.
        await supabase.from('contact_phones').delete().eq('contact_id', personId);
        const phoneRows = phones.filter(ph => ph.number.trim()).map((ph, i) => ({
          contact_id: personId, label: ph.label || `Mobile-${i + 1}`, number: ph.number, position: i,
        }));
        if (phoneRows.length) {
          const { error } = await supabase.from('contact_phones').insert(phoneRows);
          if (error) throw error;
        }
      }

      onSaved();
    } catch (err) {
      console.error('Save error:', err);
      alert(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function addActivity() {
    const text = actNote.trim();
    if (!text || !primaryId || primaryId.startsWith('new-')) return;
    setActSaving(true);
    const { data, error } = await supabase.from('contact_activities')
      .insert({ contact_id: primaryId, note: text }).select().single();
    if (!error && data) { setActivities(prev => [...prev, data as ContactActivity]); setActNote(''); }
    setActSaving(false);
  }

  async function deleteActivity(id: string) {
    await supabase.from('contact_activities').delete().eq('id', id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  async function toggleCampaign(campaignId: string) {
    if (!primaryId || primaryId.startsWith('new-')) return;
    setCampToggling(campaignId);
    const linked = linkedCampaigns.has(campaignId);
    if (linked) {
      await supabase.from('contact_campaigns').delete().eq('contact_id', primaryId).eq('campaign_id', campaignId);
      setLinkedCampaigns(prev => { const s = new Set(prev); s.delete(campaignId); return s; });
    } else {
      await supabase.from('contact_campaigns').insert({ contact_id: primaryId, campaign_id: campaignId });
      setLinkedCampaigns(prev => new Set([...prev, campaignId]));
    }
    setCampToggling(null);
  }

  const displayPrimary = people.find(p => p.is_primary);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" style={{ maxWidth: '860px' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {branch ? 'Edit Contact' : 'New Contact'}
            </h2>
            {displayPrimary && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Primary: {contactDisplayName(displayPrimary) || '—'}
              </span>
            )}
          </div>
          <button className="btn-icon" onClick={onClose}><X size={15} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.25rem', padding: '0.75rem 1.5rem', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.4rem 0.85rem',
                border: `1px solid ${tab === t.key ? 'rgba(108,99,255,0.4)' : 'transparent'}`,
                borderRadius: '7px',
                background: tab === t.key ? 'rgba(108,99,255,0.12)' : 'transparent',
                color: tab === t.key ? 'var(--accent)' : 'var(--text-muted)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                whiteSpace: 'nowrap', transition: 'all 0.15s',
              }}
            >
              <t.icon size={13} />
              {t.label}
              {t.key === 'people' && (
                <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
                  {people.length}
                </span>
              )}
              {t.key === 'activity' && activities.length > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
                  {activities.length}
                </span>
              )}
              {t.key === 'campaigns' && linkedCampaigns.size > 0 && (
                <span style={{ background: 'var(--accent-2, #ff6584)', color: '#fff', borderRadius: '20px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
                  {linkedCampaigns.size}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '62vh' }}>

          {tab === 'identity' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ gridColumn: 'span 2' }}>
                <label>Company Name</label>
                <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
              </div>
              <div>
                <label>Branch Code</label>
                <input className="input" value={form.branch_code} onChange={e => set('branch_code', e.target.value)} />
              </div>
              <div>
                <label>Contact Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {BRANCH_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label>Contact Type</label>
                <select className="input" value={form.contact_type} onChange={e => set('contact_type', e.target.value)}>
                  <option value="">—</option>
                  {CONTACT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label>Category</label>
                <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">—</option>
                  {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label>Segment</label>
                <select className="input" value={form.segment} onChange={e => set('segment', e.target.value)}>
                  <option value="">—</option>
                  {SEGMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label>Assigned to / Executive</label>
                <input className="input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="e.g. Suneel" />
              </div>
              <div>
                <label title="Purpose still being confirmed with client">Default calling <span style={{ opacity: 0.5 }}>(placeholder)</span></label>
                <input className="input" value={form.default_calling} onChange={e => set('default_calling', e.target.value)} />
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>About Company</label>
                <textarea className="input" rows={3} value={form.about} onChange={e => set('about', e.target.value)} />
              </div>
            </div>
          )}

          {tab === 'address' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div>
                <label>Address Type</label>
                <select className="input" value={form.address_type} onChange={e => set('address_type', e.target.value)}>
                  {ADDRESS_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div><label>Shop No.</label><input className="input" value={form.shop_no} onChange={e => set('shop_no', e.target.value)} /></div>
              <div><label>Building Name</label><input className="input" value={form.building_name} onChange={e => set('building_name', e.target.value)} /></div>
              <div style={{ gridColumn: 'span 3' }}><label>Lane / Street</label><input className="input" value={form.lane_street} onChange={e => set('lane_street', e.target.value)} /></div>
              <div style={{ gridColumn: 'span 3' }}><label>Landmark</label><input className="input" value={form.landmark} onChange={e => set('landmark', e.target.value)} /></div>
              <div><label>Locality / Area</label><input className="input" value={form.area} onChange={e => set('area', e.target.value)} /></div>
              <div><label>Place / Town</label><input className="input" value={form.town} onChange={e => set('town', e.target.value)} /></div>
              <div><label>Pin Code</label><input className="input" value={form.pin} onChange={e => set('pin', e.target.value)} /></div>
              <div><label>Taluka</label><input className="input" value={form.taluka} onChange={e => set('taluka', e.target.value)} /></div>
              <div><label>District</label><input className="input" value={form.district} onChange={e => set('district', e.target.value)} /></div>
              <div><label>State</label><input className="input" value={form.state} onChange={e => set('state', e.target.value)} /></div>
            </div>
          )}

          {tab === 'people' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Mark one person as primary — they&apos;ll show as the contact on the list page.
                </p>
                <button className="btn-secondary" onClick={addPerson} style={{ fontSize: '0.78rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  <Plus size={13} /> Add person
                </button>
              </div>

              {people.map((p, idx) => (
                <div key={p.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => makePrimary(p.id)}
                      title="Set as primary contact"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: p.is_primary ? 'var(--warning, #f59e0b)' : 'var(--text-muted)' }}
                    >
                      <Star size={16} fill={p.is_primary ? 'currentColor' : 'none'} />
                    </button>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>
                      {p.is_primary ? 'Primary contact' : `Contact ${idx + 1}`}
                    </span>
                    <div style={{ flex: 1 }} />
                    <button className="btn-icon danger" onClick={() => removePerson(p.id)}><Trash2 size={12} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr 1.2fr 1.2fr 1.4fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <div>
                      <label>Title</label>
                      <select className="input" value={p.title || ''} onChange={e => setPerson(p.id, 'title', e.target.value)}>
                        <option value="">—</option>
                        {TITLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <div><label>First Name</label><input className="input" value={p.first_name} onChange={e => setPerson(p.id, 'first_name', e.target.value)} /></div>
                    <div><label>Middle Name</label><input className="input" value={p.middle_name || ''} onChange={e => setPerson(p.id, 'middle_name', e.target.value)} /></div>
                    <div><label>Last Name</label><input className="input" value={p.last_name || ''} onChange={e => setPerson(p.id, 'last_name', e.target.value)} /></div>
                    <div>
                      <label>Designation</label>
                      <select className="input" value={p.designation || ''} onChange={e => setPerson(p.id, 'designation', e.target.value)}>
                        <option value="">—</option>
                        {DESIGNATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '0.6rem' }}>
                    <div><label>Email</label><input className="input" value={p.email || ''} onChange={e => setPerson(p.id, 'email', e.target.value)} /></div>
                    <div><label>GST No.</label><input className="input" value={p.gst_no || ''} onChange={e => setPerson(p.id, 'gst_no', e.target.value)} /></div>
                    <div><label>PAN No.</label><input className="input" value={p.pan_no || ''} onChange={e => setPerson(p.id, 'pan_no', e.target.value)} /></div>
                  </div>

                  <label style={{ marginBottom: '0.3rem', display: 'block' }}>Mobile numbers</label>
                  {p.phones.map(ph => (
                    <div key={ph.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <input
                        className="input" style={{ width: '110px' }}
                        value={ph.label} onChange={e => setPhone(p.id, ph.id, 'label', e.target.value)}
                        placeholder="Label"
                      />
                      <input
                        className="input" style={{ flex: 1 }}
                        value={ph.number} onChange={e => setPhone(p.id, ph.id, 'number', e.target.value)}
                        placeholder="+91 ..."
                      />
                      <button className="btn-icon danger" onClick={() => removePhone(p.id, ph.id)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button className="btn-secondary" onClick={() => addPhone(p.id)} style={{ fontSize: '0.75rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    <Plus size={12} /> Add number
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === 'activity' && (
            <div>
              {!primaryId || primaryId.startsWith('new-') ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Save this contact first to log activity.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {activities.map(a => (
                      <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', padding: '0.5rem 0.75rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                        <span style={{ fontSize: '0.82rem' }}>{a.note}</span>
                        <button className="btn-icon danger" onClick={() => deleteActivity(a.id)}><Trash2 size={11} /></button>
                      </div>
                    ))}
                    <div ref={actEndRef} />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input className="input" value={actNote} onChange={e => setActNote(e.target.value)} placeholder="Add a note…" style={{ flex: 1 }} />
                    <button className="btn-primary" onClick={addActivity} disabled={actSaving}>Add</button>
                  </div>
                </>
              )}
            </div>
          )}

          {tab === 'campaigns' && (
            <div>
              {!primaryId || primaryId.startsWith('new-') ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Save this contact first to link campaigns.</p>
              ) : (
                allCampaigns.map(c => (
                  <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0' }}>
                    <input
                      type="checkbox"
                      checked={linkedCampaigns.has(c.id)}
                      disabled={campToggling === c.id}
                      onChange={() => toggleCampaign(c.id)}
                    />
                    <span style={{ fontSize: '0.85rem' }}>{c.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
