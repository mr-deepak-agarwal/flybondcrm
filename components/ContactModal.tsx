'use client';

import { useState, useEffect } from 'react';
import { X, User, MapPin, Phone, Globe, FileText, Users, Star, Building2 } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type { Contact } from '@/types';

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
  { key: 'identity',  label: 'Identity',  icon: User },
  { key: 'address',   label: 'Address',   icon: MapPin },
  { key: 'contact',   label: 'Contact',   icon: Phone },
  { key: 'online',    label: 'Online',    icon: Globe },
  { key: 'legal',     label: 'Legal',     icon: FileText },
  { key: 'owner',     label: 'Owner',     icon: Building2 },
  { key: 'crm',       label: 'CRM',       icon: Users },
];

interface Props {
  contact: Contact | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ContactModal({ contact, onClose, onSaved }: Props) {
  const [tab, setTab]       = useState('identity');
  const [form, setForm]     = useState<typeof EMPTY>(EMPTY);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

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
  }, [contact]);

  function set(field: keyof typeof EMPTY, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function save() {
    if (!form.first_name.trim()) { alert('First name is required'); return; }
    setSaving(true);
    const payload: Record<string, unknown> = {
      ...(form as unknown as Record<string, unknown>),
      updated_at: new Date().toISOString(),
    };
    // Clean empty strings to null for optional fields
    Object.keys(payload).forEach(k => {
      if (payload[k] === '') payload[k] = null;
    });

    if (contact) {
      await supabase.from('contacts').update(payload).eq('id', contact.id);
    } else {
      await supabase.from('contacts').insert(payload);
    }
    setSaving(false);
    onSaved();
  }

  const F = ({ label, field, type = 'text', placeholder = '', span = 1 }: {
    label: string; field: keyof typeof EMPTY; type?: string; placeholder?: string; span?: number;
  }) => (
    <div style={{ gridColumn: `span ${span}` }}>
      <label>{label}</label>
      <input
        className="input"
        type={type}
        placeholder={placeholder}
        value={(form[field] as string) || ''}
        onChange={e => set(field, e.target.value)}
      />
    </div>
  );

  const Sel = ({ label, field, options }: {
    label: string; field: keyof typeof EMPTY; options: { value: string; label: string }[];
  }) => (
    <div>
      <label>{label}</label>
      <select
        className="input"
        value={(form[field] as string) || ''}
        onChange={e => set(field, e.target.value)}
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-wide" style={{ maxWidth: '780px' }}>

        {/* Header */}
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
            {contact ? 'Edit Contact' : 'New Contact'}
          </h2>
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
                ]} />
                <F label="First Name *" field="first_name" placeholder="Sunil" />
                <F label="Middle Name"  field="middle_name" placeholder="Kumar" />
                <F label="Last Name"    field="last_name"   placeholder="Rajoli" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <F label="Company / Organisation" field="company"    placeholder="FlyBond Pvt. Ltd." />
                <F label="Job Title"              field="job_title"  placeholder="Client Servicing Executive" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                <Sel label="Contact Type" field="contact_type" options={[
                  { value: 'customer',  label: 'Customer' },
                  { value: 'vendor',    label: 'Vendor' },
                  { value: 'supplier',  label: 'Supplier' },
                  { value: 'agent',     label: 'Agent' },
                  { value: 'prospect',  label: 'Prospect' },
                ]} />
                <F label="Category" field="category" placeholder="e.g. Hospitality" />
                <F label="Segment"  field="segment"  placeholder="e.g. SMB" />
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
              <F label="Address Line"  field="address_line" placeholder="123, MG Road"  span={2} />
              <F label="Area / Village" field="area"        placeholder="Panjim" />
              <F label="Taluka"         field="taluka"      placeholder="Tiswadi" />
              <F label="District"       field="district"    placeholder="North Goa" />
              <F label="State"          field="state"       placeholder="Goa" />
              <F label="PIN Code"       field="pin"         placeholder="403001" />
            </div>
          )}

          {tab === 'contact' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="Mobile / WhatsApp"     field="mobile"   placeholder="+91 98765 43210" />
              <F label="WhatsApp (if different)" field="whatsapp" placeholder="+91 98765 43210" />
              <F label="Telephone"             field="phone"    placeholder="+91 832 271 2228" />
              <F label="Telephone 2"           field="phone_2"  placeholder="+91 832 271 2229" />
              <F label="Email"                 field="email"    type="email" placeholder="sunil@flybond.in" />
              <F label="Email 2"               field="email_2"  type="email" placeholder="accounts@flybond.in" />
            </div>
          )}

          {tab === 'online' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="Website"          field="website"       placeholder="https://flybond.in" />
              <F label="Google Review URL" field="google_review" placeholder="https://g.page/..." />
              <F label="Instagram Handle" field="instagram"     placeholder="@flybond" />
              <F label="Facebook Page"    field="facebook"      placeholder="fb.com/flybond" />
            </div>
          )}

          {tab === 'legal' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="GST Number"      field="gst_no"           placeholder="27AAPFU0939F1ZV" />
              <F label="PAN Number"      field="pan_no"           placeholder="AAPFU0939F" />
              <F label="Aadhar Number"   field="aadhar_no"        placeholder="XXXX XXXX XXXX" />
              <F label="Driving License" field="driving_license"  placeholder="GA-0120110012345" />
            </div>
          )}

          {tab === 'owner' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <F label="Owner / Proprietor Name" field="owner_name"      placeholder="Ramesh Rajoli" span={2} />
              <F label="Owner Mobile"            field="owner_mobile"    placeholder="+91 98765 43210" />
              <F label="Owner WhatsApp"          field="owner_whatsapp"  placeholder="+91 98765 43210" />
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
              ]} />
              <Sel label="Frequency" field="frequency_type" options={[
                { value: 'unassigned',  label: 'Unassigned' },
                { value: '1time',       label: '1-Time' },
                { value: 'regular',     label: 'Regular' },
                { value: 'loyal',       label: 'Loyal' },
                { value: 'blacklisted', label: 'Blacklisted' },
              ]} />
              <F label="Assigned To" field="assigned_to" placeholder="Deepak Agarwal" />
              <Sel label="Pending Status" field="pending_status" options={[
                { value: '',      label: 'None' },
                { value: 'quote', label: 'Quote' },
                { value: 'order', label: 'Order' },
                { value: 'bill',  label: 'Bill' },
              ]} />
              <F label="Next Call Date"   field="next_call_date"   type="date" />
              <Sel label="Call Significance" field="call_significance" options={[
                { value: 'significant',   label: 'Significant' },
                { value: 'insignificant', label: 'Insignificant' },
              ]} />
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