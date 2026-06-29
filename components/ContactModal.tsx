'use client';

import { useState, useEffect, useRef } from 'react';
import { X, User, MapPin, Phone, Globe, FileText, Users, Star, Building2, MessageSquare, Megaphone, Send, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Contact, ContactActivity } from '@/types';

const EMPTY: Omit<Contact, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  first_name: '',
  middle_name: '',
  last_name: '',
  company: '',
  job_title: '',
  contact_type: 'customer',
  category: '',
  segment: '',
  status: 'prospect',
  frequency_type: 'unassigned',
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
  call_significance: 'significant',
  notes: '',
  pending_status: '',
};

const TABS = [
  { key: 'identity',   label: 'Identity',   icon: User },
  { key: 'address',    label: 'Address',    icon: MapPin },
  { key: 'contact',    label: 'Contact',    icon: Phone },
  { key: 'online',     label: 'Online',     icon: Globe },
  { key: 'legal',      label: 'Legal',      icon: FileText },
  { key: 'owner',      label: 'Owner',      icon: Building2 },
  { key: 'crm',        label: 'CRM',        icon: Users },
  { key: 'activity',   label: 'Activity',   icon: MessageSquare },
  { key: 'campaigns',  label: 'Campaigns',  icon: Megaphone },
];

interface Campaign { id: string; name: string; description?: string; }

interface Props {
  contact: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}

// ── field components (defined OUTSIDE ContactModal so they keep a ──
// ── stable identity across renders — this is what preserves focus) ──
interface FProps {
  label: string;
  field: keyof typeof EMPTY;
  type?: string;
  placeholder?: string;
  span?: number;
  value: string;
  onChange: (field: keyof typeof EMPTY, value: string) => void;
}
function F({ label, field, type = 'text', placeholder = '', span = 1, value, onChange }: FProps) {
  return (
    <div style={{ gridColumn: `span ${span}` }}>
      <label>{label}</label>
      <input
        className="input"
        type={type}
        placeholder={placeholder}
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
      />
    </div>
  );
}

interface SelProps {
  label: string;
  field: keyof typeof EMPTY;
  options: { value: string; label: string }[];
  value: string;
  onChange: (field: keyof typeof EMPTY, value: string) => void;
}
function Sel({ label, field, options, value, onChange }: SelProps) {
  return (
    <div>
      <label>{label}</label>
      <select
        className="input"
        value={value || ''}
        onChange={e => onChange(field, e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── helper: days until next call ─────────────────────────
function daysUntilCall(dateStr?: string): { label: string; color: string } | null {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
  if (diff < 0)  return { label: `${Math.abs(diff)}d overdue`, color: 'var(--error, #ef4444)' };
  if (diff === 0) return { label: 'Today',                      color: 'var(--warning, #f59e0b)' };
  if (diff <= 3)  return { label: `in ${diff}d`,                color: 'var(--warning, #f59e0b)' };
  return           { label: `in ${diff}d`,                      color: 'var(--success, #10b981)' };
}

export default function ContactModal({ contact, onClose, onSaved }: Props) {
  const [tab, setTab]             = useState('identity');
  const [form, setForm]           = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving]       = useState(false);

  // Activity log state
  const [activities, setActivities]   = useState<ContactActivity[]>([]);
  const [actNote, setActNote]         = useState('');
  const [actSaving, setActSaving]     = useState(false);
  const actEndRef = useRef<HTMLDivElement>(null);

  // Campaigns state
  const [allCampaigns, setAllCampaigns]       = useState<Campaign[]>([]);
  const [linkedCampaigns, setLinkedCampaigns] = useState<Set<string>>(new Set());
  const [campToggling, setCampToggling]       = useState<string | null>(null);

  const supabase = createClient();

  // ── load form data ───────────────────────────────────────
  useEffect(() => {
    if (contact) {
      const src = contact as unknown as Record<string, unknown>;
      const f: typeof EMPTY = { ...EMPTY };
      (Object.keys(EMPTY) as (keyof typeof EMPTY)[]).forEach(k => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (f as any)[k] = src[k] ?? '';
      });
      setForm(f);
    } else {
      setForm({ ...EMPTY });
    }
    setTab('identity');
    setActivities([]);
    setLinkedCampaigns(new Set());
  }, [contact]);

  // ── load activities when tab is opened ───────────────────
  useEffect(() => {
    if (tab === 'activity' && contact?.id) {
      supabase
        .from('contact_activities')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: true })
        .then(({ data }) => setActivities(data || []));
    }
  }, [tab, contact?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── load campaigns when tab is opened ───────────────────
  useEffect(() => {
    if (tab === 'campaigns') {
      supabase.from('campaigns').select('id,name,description').order('name')
        .then(({ data }) => setAllCampaigns(data || []));

      if (contact?.id) {
        supabase.from('contact_campaigns')
          .select('campaign_id')
          .eq('contact_id', contact.id)
          .then(({ data }) => setLinkedCampaigns(new Set((data || []).map(r => r.campaign_id))));
      }
    }
  }, [tab, contact?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── auto-scroll activity log ─────────────────────────────
  useEffect(() => {
    actEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activities]);

  function set(field: keyof typeof EMPTY, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  // ── save contact ─────────────────────────────────────────
  async function save() {
    if (!form.first_name.trim()) { alert('First name is required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...(form as unknown as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };
    Object.keys(payload).forEach(k => { if (payload[k] === '') payload[k] = null; });

    if (contact) {
      await supabase.from('contacts').update(payload).eq('id', contact.id);
    } else {
      await supabase.from('contacts').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  // ── add activity entry ───────────────────────────────────
  async function addActivity() {
    const text = actNote.trim();
    if (!text || !contact?.id) return;
    setActSaving(true);
    const { data, error } = await supabase
      .from('contact_activities')
      .insert({ contact_id: contact.id, note: text })
      .select()
      .single();
    if (!error && data) {
      setActivities(prev => [...prev, data as ContactActivity]);
      setActNote('');
    }
    setActSaving(false);
  }

  // ── delete activity entry ────────────────────────────────
  async function deleteActivity(id: string) {
    await supabase.from('contact_activities').delete().eq('id', id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  // ── toggle campaign link ─────────────────────────────────
  async function toggleCampaign(campaignId: string) {
    if (!contact?.id) return;
    setCampToggling(campaignId);
    const linked = linkedCampaigns.has(campaignId);
    if (linked) {
      await supabase.from('contact_campaigns')
        .delete()
        .eq('contact_id', contact.id)
        .eq('campaign_id', campaignId);
      setLinkedCampaigns(prev => { const s = new Set(prev); s.delete(campaignId); return s; });
    } else {
      await supabase.from('contact_campaigns')
        .insert({ contact_id: contact.id, campaign_id: campaignId });
      setLinkedCampaigns(prev => new Set([...prev, campaignId]));
    }
    setCampToggling(null);
  }

  const callBadge = daysUntilCall(form.next_call_date as string);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" style={{ maxWidth: '780px' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              {contact ? 'Edit Contact' : 'New Contact'}
            </h2>
            {callBadge && (
              <span style={{
                fontSize: '0.72rem', fontWeight: 700,
                color: callBadge.color,
                background: `${callBadge.color}18`,
                border: `1px solid ${callBadge.color}40`,
                padding: '0.2rem 0.55rem',
                borderRadius: '20px',
              }}>
                📞 {callBadge.label}
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
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s',
              }}
            >
              <t.icon size={13} />
              {t.label}
              {t.key === 'activity' && activities.length > 0 && (
                <span style={{
                  background: 'var(--accent)', color: '#fff',
                  borderRadius: '20px', fontSize: '0.65rem',
                  padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center',
                }}>
                  {activities.length}
                </span>
              )}
              {t.key === 'campaigns' && linkedCampaigns.size > 0 && (
                <span style={{
                  background: 'var(--accent-2, #ff6584)', color: '#fff',
                  borderRadius: '20px', fontSize: '0.65rem',
                  padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center',
                }}>
                  {linkedCampaigns.size}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '1.5rem', overflowY: 'auto', maxHeight: '60vh' }}>

          {tab === 'identity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr 1fr 1fr', gap: '0.75rem' }}>
                <Sel label="Title" field="title" options={[
                  { value: '',      label: '—' },
                  { value: 'Mr.',   label: 'Mr.' },
                  { value: 'Ms.',   label: 'Ms.' },
                  { value: 'Mrs.',  label: 'Mrs.' },
                  { value: 'Dr.',   label: 'Dr.' },
                ]} value={form.title as string} onChange={set} />
                <F label="First Name *" field="first_name" placeholder="Sunil" value={form.first_name as string} onChange={set} />
                <F label="Middle Name"  field="middle_name" placeholder="Kumar" value={form.middle_name as string} onChange={set} />
                <F label="Last Name"    field="last_name"   placeholder="Rajoli" value={form.last_name as string} onChange={set} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <F label="Company / Organisation" field="company"    placeholder="FlyBond Pvt. Ltd." value={form.company as string} onChange={set} />
                <F label="Job Title"              field="job_title"  placeholder="Client Servicing Executive" value={form.job_title as string} onChange={set} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <Sel label="Contact Type" field="contact_type" options={[
                  { value: 'customer',  label: 'Customer' },
                  { value: 'vendor',    label: 'Vendor' },
                  { value: 'supplier',  label: 'Supplier' },
                  { value: 'agent',     label: 'Agent' },
                  { value: 'prospect',  label: 'Prospect' },
                ]} value={form.contact_type as string} onChange={set} />
                <F label="Category" field="category" placeholder="e.g. Hospitality" value={form.category as string} onChange={set} />
                <F label="Segment"  field="segment"  placeholder="e.g. SMB" value={form.segment as string} onChange={set} />
              </div>

              {/* Star Rating */}
              <div>
                <label>Rating</label>
                <div style={{ display: 'flex', gap: '4px', marginTop: '0.25rem' }}>
                  {[1,2,3,4,5].map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => set('star_rating', i === form.star_rating ? 0 : i)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                    >
                      <Star
                        size={22}
                        fill={i  <= (form.star_rating as number) ? 'var(--warning)' : 'none'}
                        color={i <= (form.star_rating as number) ? 'var(--warning)' : 'var(--border-2)'}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label>Notes / About</label>
                <textarea
                  className="input"
                  placeholder="Any background about this contact…"
                  value={form.notes || ''}
                  onChange={e => set('notes', e.target.value)}
                />
              </div>
            </div>
          )}

          {tab === 'address' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="Address Line"  field="address_line" placeholder="123, MG Road"  span={2} value={form.address_line as string} onChange={set} />
              <F label="Area / Village" field="area"        placeholder="Panjim" value={form.area as string} onChange={set} />
              <F label="Taluka"         field="taluka"      placeholder="Tiswadi" value={form.taluka as string} onChange={set} />
              <F label="District"       field="district"    placeholder="North Goa" value={form.district as string} onChange={set} />
              <F label="State"          field="state"       placeholder="Goa" value={form.state as string} onChange={set} />
              <F label="PIN Code"       field="pin"         placeholder="403001" value={form.pin as string} onChange={set} />
            </div>
          )}

          {tab === 'contact' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="Mobile / WhatsApp"      field="mobile"   placeholder="+91 98765 43210" value={form.mobile as string} onChange={set} />
              <F label="WhatsApp (if different)" field="whatsapp" placeholder="+91 98765 43210" value={form.whatsapp as string} onChange={set} />
              <F label="Telephone"              field="phone"    placeholder="+91 832 271 2228" value={form.phone as string} onChange={set} />
              <F label="Telephone 2"            field="phone_2"  placeholder="+91 832 271 2229" value={form.phone_2 as string} onChange={set} />
              <F label="Email"                  field="email"    type="email" placeholder="sunil@flybond.in" value={form.email as string} onChange={set} />
              <F label="Email 2"                field="email_2"  type="email" placeholder="accounts@flybond.in" value={form.email_2 as string} onChange={set} />
            </div>
          )}

          {tab === 'online' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="Website"           field="website"       placeholder="https://flybond.in" value={form.website as string} onChange={set} />
              <F label="Google Review URL" field="google_review" placeholder="https://g.page/..." value={form.google_review as string} onChange={set} />
              <F label="Instagram Handle"  field="instagram"     placeholder="@flybond" value={form.instagram as string} onChange={set} />
              <F label="Facebook Page"     field="facebook"      placeholder="fb.com/flybond" value={form.facebook as string} onChange={set} />
            </div>
          )}

          {tab === 'legal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="GST Number"      field="gst_no"           placeholder="27AAPFU0939F1ZV" value={form.gst_no as string} onChange={set} />
              <F label="PAN Number"      field="pan_no"           placeholder="AAPFU0939F" value={form.pan_no as string} onChange={set} />
              <F label="Aadhar Number"   field="aadhar_no"        placeholder="XXXX XXXX XXXX" value={form.aadhar_no as string} onChange={set} />
              <F label="Driving License" field="driving_license"  placeholder="GA-0120110012345" value={form.driving_license as string} onChange={set} />
            </div>
          )}

          {tab === 'owner' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="Owner / Proprietor Name" field="owner_name"      placeholder="Ramesh Rajoli" span={2} value={form.owner_name as string} onChange={set} />
              <F label="Owner Mobile"            field="owner_mobile"    placeholder="+91 98765 43210" value={form.owner_mobile as string} onChange={set} />
              <F label="Owner WhatsApp"          field="owner_whatsapp"  placeholder="+91 98765 43210" value={form.owner_whatsapp as string} onChange={set} />
            </div>
          )}

          {tab === 'crm' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <Sel label="Status" field="status" options={[
                { value: 'suspect',     label: 'Suspect' },
                { value: 'prospect',    label: 'Prospect' },
                { value: 'unassigned',  label: 'Unassigned' },
                { value: 'active',      label: 'Active' },
                { value: 'loyal',       label: 'Loyal' },
                { value: 'blacklisted', label: 'Blacklisted' },
              ]} value={form.status as string} onChange={set} />
              <Sel label="Frequency" field="frequency_type" options={[
                { value: 'unassigned',  label: 'Unassigned' },
                { value: '1time',       label: '1-Time' },
                { value: 'regular',     label: 'Regular' },
                { value: 'loyal',       label: 'Loyal' },
                { value: 'blacklisted', label: 'Blacklisted' },
              ]} value={form.frequency_type as string} onChange={set} />
              <F label="Assigned To" field="assigned_to" placeholder="Deepak Agarwal" value={form.assigned_to as string} onChange={set} />
              <Sel label="Pending Status" field="pending_status" options={[
                { value: '',      label: 'None' },
                { value: 'quote', label: 'Quote' },
                { value: 'order', label: 'Order' },
                { value: 'bill',  label: 'Bill' },
              ]} value={form.pending_status as string} onChange={set} />
              <F label="Next Call Date"   field="next_call_date"   type="date" value={form.next_call_date as string} onChange={set} />
              <Sel label="Call Significance" field="call_significance" options={[
                { value: 'significant',   label: 'Significant' },
                { value: 'insignificant', label: 'Insignificant' },
              ]} value={form.call_significance as string} onChange={set} />
            </div>
          )}

          {/* ── Activity Log Tab ────────────────────────────── */}
          {tab === 'activity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!contact?.id ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Save this contact first to start logging activity.
                </p>
              ) : (
                <>
                  {/* Log entries */}
                  <div style={{
                    display: 'flex', flexDirection: 'column', gap: '0.5rem',
                    maxHeight: '320px', overflowY: 'auto',
                    padding: '0.25rem 0',
                  }}>
                    {activities.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                        No activity yet. Add your first note below.
                      </p>
                    ) : (
                      activities.map((a, i) => {
                        const d = new Date(a.created_at);
                        const dateStr = d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
                        const timeStr = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
                        return (
                          <div key={a.id} style={{
                            display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                            padding: '0.75rem',
                            background: 'var(--surface-2)',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                          }}>
                            {/* Index bubble */}
                            <div style={{
                              width: '22px', height: '22px', flexShrink: 0,
                              borderRadius: '50%',
                              background: 'rgba(108,99,255,0.12)',
                              color: 'var(--accent)',
                              fontSize: '0.65rem', fontWeight: 700,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                              {i + 1}
                            </div>

                            {/* Note text */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.5 }}>
                                {a.note}
                              </p>
                              <p style={{ margin: '0.3rem 0 0 0', fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                                {timeStr} · {dateStr}
                              </p>
                            </div>

                            {/* Delete */}
                            <button
                              className="btn-icon danger"
                              onClick={() => deleteActivity(a.id)}
                              style={{ flexShrink: 0, opacity: 0.5 }}
                              onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                              onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        );
                      })
                    )}
                    <div ref={actEndRef} />
                  </div>

                  {/* Add note input */}
                  <div style={{
                    display: 'flex', gap: '0.5rem', alignItems: 'flex-end',
                    padding: '0.75rem',
                    background: 'var(--surface-2)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                  }}>
                    <textarea
                      className="input"
                      placeholder="Add a note, call log, or follow-up… (Shift+Enter for new line)"
                      value={actNote}
                      rows={2}
                      onChange={e => setActNote(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          addActivity();
                        }
                      }}
                      style={{ flex: 1, resize: 'vertical', margin: 0 }}
                    />
                    <button
                      className="btn-primary"
                      onClick={addActivity}
                      disabled={actSaving || !actNote.trim()}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 0.85rem', flexShrink: 0 }}
                    >
                      <Send size={13} />
                      {actSaving ? '…' : 'Log'}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Campaigns Tab ───────────────────────────────── */}
          {tab === 'campaigns' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {!contact?.id ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                  Save this contact first to assign campaigns.
                </p>
              ) : allCampaigns.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', padding: '2rem 0' }}>
                  No campaigns found. Create campaigns from the Campaigns page first.
                </p>
              ) : (
                allCampaigns.map(c => {
                  const linked = linkedCampaigns.has(c.id);
                  const toggling = campToggling === c.id;
                  return (
                    <div key={c.id} style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.85rem 1rem',
                      borderRadius: '9px',
                      background: linked ? 'rgba(108,99,255,0.07)' : 'var(--surface-2)',
                      border: `1px solid ${linked ? 'rgba(108,99,255,0.35)' : 'var(--border)'}`,
                      transition: 'all 0.15s',
                    }}>
                      {/* Megaphone icon */}
                      <div style={{
                        width: '34px', height: '34px', flexShrink: 0,
                        borderRadius: '8px',
                        background: linked ? 'rgba(108,99,255,0.15)' : 'rgba(255,255,255,0.05)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <Megaphone size={15} color={linked ? 'var(--accent)' : 'var(--text-muted)'} />
                      </div>

                      {/* Name + description */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 600, fontSize: '0.875rem', color: linked ? 'var(--accent)' : 'var(--text)' }}>
                          {c.name}
                        </p>
                        {c.description && (
                          <p style={{ margin: '0.15rem 0 0 0', fontSize: '0.775rem', color: 'var(--text-muted)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                            {c.description}
                          </p>
                        )}
                      </div>

                      {/* Toggle button */}
                      <button
                        onClick={() => toggleCampaign(c.id)}
                        disabled={toggling}
                        style={{
                          padding: '0.35rem 0.85rem',
                          borderRadius: '6px',
                          border: `1px solid ${linked ? 'rgba(108,99,255,0.4)' : 'var(--border-2)'}`,
                          background: linked ? 'rgba(108,99,255,0.15)' : 'transparent',
                          color: linked ? 'var(--accent)' : 'var(--text-muted)',
                          fontSize: '0.775rem', fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          flexShrink: 0,
                        }}
                      >
                        {toggling ? '…' : linked ? '✓ Enrolled' : '+ Enroll'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : contact ? 'Update Contact' : 'Add Contact'}
          </button>
        </div>

      </div>
    </div>
  );
}