'use client';

import { useState, useEffect, useRef } from 'react';
import {
  X, User, MapPin, Users, MessageSquare, Megaphone, FileText, Trash2, Plus, Star, Share,
} from 'lucide-react';
import { createClient } from '@/lib/supabase';
import type {
  Branch, Contact, ContactActivity, ContactPhone, ContactEmail, BranchAddress,
  BranchLegalDoc, BranchSocial,
} from '@/types';
import {
  contactDisplayName, formatMobile,
  CONTACT_TYPE_OPTIONS, CATEGORY_OPTIONS, SEGMENT_OPTIONS,
  BRANCH_STATUS_OPTIONS, DESIGNATION_OPTIONS, TITLE_OPTIONS, ADDRESS_TYPE_OPTIONS,
  CALL_SIGNIFICANCE_OPTIONS, LEGAL_DOC_TYPE_OPTIONS, SOCIAL_PLATFORM_OPTIONS,
} from '@/types';

// A person row being edited. `id` is a real uuid for existing people,
// or a temporary client-side id (prefixed "new-") for people not yet saved.
interface PersonDraft extends Omit<Contact, 'id' | 'created_at' | 'updated_at' | 'phones' | 'emails'> {
  id: string;
  isNew: boolean;
  phones: ContactPhone[];
  emails: ContactEmail[];
}

interface AddressDraft extends Omit<BranchAddress, 'id' | 'branch_id' | 'created_at'> {
  id: string;
  isNew: boolean;
}

interface LegalDocDraft extends Omit<BranchLegalDoc, 'id' | 'branch_id' | 'created_at'> {
  id: string;
  isNew: boolean;
}

interface SocialDraft extends Omit<BranchSocial, 'id' | 'branch_id' | 'created_at'> {
  id: string;
  isNew: boolean;
}

function blankLegalDoc(): LegalDocDraft {
  return { id: `new-${crypto.randomUUID()}`, isNew: true, doc_type: 'PAN', label: '', value: '', position: 0 };
}

function blankSocial(): SocialDraft {
  return { id: `new-${crypto.randomUUID()}`, isNew: true, platform: 'Instagram', label: '', value: '', position: 0 };
}

const EMPTY_BRANCH: Omit<Branch, 'id' | 'customer_id' | 'created_at' | 'updated_at' | 'contacts' | 'addresses'> = {
  name: '',
  branch_code: '',
  contact_type: '',
  category: '',
  segment: '',
  status: 'Suspect',
  assigned_to: '',
  about: '',
  default_calling: '',
  legal_gst_no: '',
  legal_pan_no: '',
  legal_aadhar_no: '',
  company_reg_no: '',
  company_legal_name: '',
};

function blankAddress(isDefault: boolean): AddressDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
    isNew: true,
    address_type: 'Billing',
    is_default: isDefault,
    shop_no: '',
    building_name: '',
    lane_street: '',
    landmark: '',
    town: '',
    pin: '',
    taluka: '',
    district: '',
    state: '',
    position: 0,
  };
}

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
    emails: [],
  };
}

const TABS = [
  { key: 'identity',  label: 'Identity',      icon: User },
  { key: 'address',   label: 'Address',       icon: MapPin },
  { key: 'legal',     label: 'Legal',         icon: FileText },
  { key: 'social',    label: 'Social',        icon: Share },
  { key: 'people',    label: 'More Contacts', icon: Users },
  { key: 'activity',  label: 'Activity',      icon: MessageSquare },
  { key: 'campaigns', label: 'Campaigns',     icon: Megaphone },
];

function supabaseErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === 'object') {
    const e = err as { message?: string; details?: string; hint?: string; code?: string };
    const parts = [e.message, e.details, e.hint].filter(Boolean);
    if (parts.length) return `${parts.join(' — ')}${e.code ? ` (code ${e.code})` : ''}`;
    try { return JSON.stringify(err); } catch { /* fall through */ }
  }
  return String(err);
}

// Real, writable columns on `contacts`. Building the save payload from this
// explicit list (rather than spreading the whole draft object) means any
// joined/computed field accidentally attached to a person — like the
// `contact_phones` join, or a future one — can never leak into an insert/
// update and get rejected by Postgres as an unknown column.
const CONTACT_COLUMNS: (keyof PersonDraft)[] = [
  'company_id', 'is_primary', 'designation',
  'title', 'first_name', 'middle_name', 'last_name', 'company', 'job_title',
  'contact_type', 'category', 'segment', 'status', 'frequency_type', 'star_rating', 'assigned_to',
  'address_line', 'area', 'taluka', 'district', 'state', 'pin',
  'phone', 'phone_2', 'mobile', 'whatsapp', 'email', 'email_2',
  'website', 'instagram', 'facebook', 'google_review',
  'gst_no', 'pan_no', 'aadhar_no', 'driving_license',
  'owner_name', 'owner_mobile', 'owner_whatsapp',
  'next_call_date', 'call_significance', 'notes', 'pending_status',
];

const ADDRESS_COLUMNS: (keyof AddressDraft)[] = [
  'address_type', 'is_default', 'shop_no', 'building_name', 'lane_street',
  'landmark', 'town', 'pin', 'taluka', 'district', 'state', 'position',
];

function toContactPayload(p: PersonDraft, companyId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { company_id: companyId };
  for (const key of CONTACT_COLUMNS) {
    if (key === 'company_id') continue; // set explicitly above
    const value = p[key];
    payload[key] = value === '' ? null : value;
  }
  payload.updated_at = new Date().toISOString();
  return payload;
}

function toAddressPayload(a: AddressDraft, branchId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { branch_id: branchId };
  for (const key of ADDRESS_COLUMNS) {
    const value = a[key];
    payload[key] = value === '' ? null : value;
  }
  return payload;
}

const LEGAL_DOC_COLUMNS: (keyof LegalDocDraft)[] = ['doc_type', 'label', 'value', 'position'];
const SOCIAL_COLUMNS: (keyof SocialDraft)[] = ['platform', 'label', 'value', 'position'];

function toLegalDocPayload(d: LegalDocDraft, branchId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { branch_id: branchId };
  for (const key of LEGAL_DOC_COLUMNS) {
    const value = d[key];
    payload[key] = value === '' ? null : value;
  }
  return payload;
}

function toSocialPayload(s: SocialDraft, branchId: string): Record<string, unknown> {
  const payload: Record<string, unknown> = { branch_id: branchId };
  for (const key of SOCIAL_COLUMNS) {
    const value = s[key];
    payload[key] = value === '' ? null : value;
  }
  return payload;
}

// Pincode lookup (India Post API) — fills Town / District / State when
// they're empty. Returns a status so the caller can show the user what
// happened (rather than failing silently, which just looked broken).
type PincodeResult =
  | { status: 'ok'; town?: string; district?: string; state?: string }
  | { status: 'not_found' }
  | { status: 'error' };

async function lookupPincode(pin: string): Promise<PincodeResult> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    if (!res.ok) return { status: 'error' };
    const data = await res.json();
    const entry = data?.[0];
    if (entry?.Status !== 'Success' || !entry?.PostOffice?.length) return { status: 'not_found' };
    const office = entry.PostOffice[0];
    return { status: 'ok', town: office.Name, district: office.District, state: office.State };
  } catch {
    return { status: 'error' };
  }
}

interface Campaign { id: string; name: string; description?: string; }

interface Props {
  branch: Branch | null;
  onClose: () => void;
  // Called after every successful save with the freshly-saved branch id,
  // so the parent can refresh its list without closing this dialog —
  // the dialog only closes when the user explicitly cancels/closes it.
  onSaved: (branchId: string) => void;
}

export default function BranchModal({ branch, onClose, onSaved }: Props) {
  const [tab, setTab]       = useState('identity');
  const [form, setForm]     = useState<typeof EMPTY_BRANCH>(EMPTY_BRANCH);
  const [people, setPeople] = useState<PersonDraft[]>([]);
  const [removedPeopleIds, setRemovedPeopleIds] = useState<string[]>([]);
  const [addresses, setAddresses] = useState<AddressDraft[]>([]);
  const [pinLookup, setPinLookup] = useState<Record<string, 'loading' | 'ok' | 'not_found' | 'error'>>({});
  const [removedAddressIds, setRemovedAddressIds] = useState<string[]>([]);
  const [legalDocs, setLegalDocs] = useState<LegalDocDraft[]>([]);
  const [removedLegalDocIds, setRemovedLegalDocIds] = useState<string[]>([]);
  const [socials, setSocials] = useState<SocialDraft[]>([]);
  const [removedSocialIds, setRemovedSocialIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  // Activity log — attached to the primary person, since activities/campaigns
  // are still per-contact in the schema (not per-branch). Worth revisiting
  // once it's clear whether activity history should be at the branch level.
  const [activities, setActivities] = useState<ContactActivity[]>([]);
  const [actNote, setActNote]       = useState('');
  const [actSignificance, setActSignificance] = useState('significant');
  const [actReschedule, setActReschedule]     = useState('');
  const [actSaving, setActSaving]   = useState(false);
  const actEndRef = useRef<HTMLDivElement>(null);

  const [allCampaigns, setAllCampaigns]       = useState<Campaign[]>([]);
  const [linkedCampaigns, setLinkedCampaigns] = useState<Set<string>>(new Set());
  const [campToggling, setCampToggling]       = useState<string | null>(null);

  // Known companies (for Company Name autocomplete + auto-filling the
  // Address tab when the same company + branch has been entered before).
  const [knownBranches, setKnownBranches] = useState<{
    name: string; branch_code: string | null; addresses: BranchAddress[];
  }[]>([]);
  const [addressAutoFilled, setAddressAutoFilled] = useState(false);

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
        emails: c.emails || [],
      })) as PersonDraft[]);
      const existingAddrs = (branch.addresses || []).map(a => ({ ...a, isNew: false })) as AddressDraft[];
      setAddresses(existingAddrs.length ? existingAddrs : [blankAddress(true)]);
      setLegalDocs((branch.legalDocs || []).map(d => ({ ...d, isNew: false })) as LegalDocDraft[]);
      setSocials((branch.socials || []).map(s => ({ ...s, isNew: false })) as SocialDraft[]);
    } else {
      setForm({ ...EMPTY_BRANCH });
      const first = blankPerson();
      first.is_primary = true;
      setPeople([first]);
      setAddresses([blankAddress(true)]);
      setLegalDocs([]);
      setSocials([]);
    }
    setRemovedPeopleIds([]);
    setRemovedAddressIds([]);
    setRemovedLegalDocIds([]);
    setRemovedSocialIds([]);
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

  // Load existing companies once, for the Company Name autocomplete.
  useEffect(() => {
    supabase
      .from('branches')
      .select('name, branch_code, addresses:branch_addresses(*)')
      .order('name')
      .then(({ data }) => setKnownBranches((data || []) as typeof knownBranches));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If the company name + branch code the user just typed matches an
  // existing branch, auto-fill the Address tab from that record instead
  // of making them re-type an address that's already on file. Only for
  // brand-new branches — never overwrites an address being edited.
  useEffect(() => {
    const name = form.name.trim().toLowerCase();
    const code = (form.branch_code || '').trim().toLowerCase();
    const match = branch || !name || !code
      ? undefined
      : knownBranches.find(b =>
          b.name.trim().toLowerCase() === name &&
          (b.branch_code || '').trim().toLowerCase() === code
        );

    setAddressAutoFilled(!!match); // eslint-disable-line react-hooks/set-state-in-effect
    if (match && match.addresses.length) {
      setAddresses(match.addresses.map(a => ({ ...a, id: `new-${crypto.randomUUID()}`, isNew: true })));
    }
  }, [form.name, form.branch_code, knownBranches, branch]);

  const companyNameOptions = Array.from(new Set(knownBranches.map(b => b.name).filter(Boolean))).sort();
  const branchCodeOptions = Array.from(new Set(
    knownBranches
      .filter(b => b.name.trim().toLowerCase() === form.name.trim().toLowerCase())
      .map(b => b.branch_code)
      .filter(Boolean)
  )) as string[];

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
    if (!confirm('Remove this contact person?')) return;
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

  // Reformats a mobile number into 3-3-4 groups once the user leaves the field.
  function formatPhoneOnBlur(personId: string, phoneId: string, value: string) {
    setPhone(personId, phoneId, 'number', formatMobile(value));
  }

  function removePhone(personId: string, phoneId: string) {
    if (!confirm('Remove this number?')) return;
    setPeople(prev => prev.map(p => p.id === personId
      ? { ...p, phones: p.phones.filter(ph => ph.id !== phoneId) }
      : p));
  }

  function addEmail(personId: string) {
    setPeople(prev => prev.map(p => p.id === personId
      ? { ...p, emails: [...p.emails, { id: `new-${crypto.randomUUID()}`, contact_id: personId, label: `Email-${p.emails.length + 1}`, email: '', created_at: '' }] }
      : p));
  }

  function setEmail(personId: string, emailId: string, field: 'label' | 'email', value: string) {
    setPeople(prev => prev.map(p => p.id === personId
      ? { ...p, emails: p.emails.map(em => em.id === emailId ? { ...em, [field]: value } : em) }
      : p));
  }

  function removeEmail(personId: string, emailId: string) {
    if (!confirm('Remove this email?')) return;
    setPeople(prev => prev.map(p => p.id === personId
      ? { ...p, emails: p.emails.filter(em => em.id !== emailId) }
      : p));
  }

  function addAddress() {
    setAddresses(prev => [...prev, blankAddress(prev.length === 0)]);
  }

  function setAddress(id: string, field: keyof AddressDraft, value: unknown) {
    setAddresses(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  }

  function makeDefaultAddress(id: string) {
    setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
  }

  function removeAddress(id: string) {
    const removing = addresses.find(a => a.id === id);
    if (!removing) return;
    if (addresses.length === 1) { alert('A branch needs at least one address.'); return; }
    if (!confirm('Remove this address?')) return;
    if (!removing.isNew) setRemovedAddressIds(prev => [...prev, id]);
    const rest = addresses.filter(a => a.id !== id);
    if (removing.is_default && rest.length) rest[0].is_default = true;
    setAddresses(rest);
  }

  async function onPinBlur(id: string, pin: string) {
    const addr = addresses.find(a => a.id === id);
    if (!addr) return;
    if (!/^\d{6}$/.test(pin)) {
      setPinLookup(prev => { const next = { ...prev }; delete next[id]; return next; });
      return;
    }
    setPinLookup(prev => ({ ...prev, [id]: 'loading' }));
    const result = await lookupPincode(pin);
    setPinLookup(prev => ({ ...prev, [id]: result.status }));
    if (result.status === 'ok') {
      setAddresses(prev => prev.map(a => a.id === id ? {
        ...a,
        town: a.town || result.town || a.town,
        district: a.district || result.district || a.district,
        state: a.state || result.state || a.state,
      } : a));
    }
  }

  function addLegalDoc() {
    setLegalDocs(prev => [...prev, blankLegalDoc()]);
  }

  function setLegalDocField(id: string, field: keyof LegalDocDraft, value: unknown) {
    setLegalDocs(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
  }

  function removeLegalDoc(id: string) {
    const removing = legalDocs.find(d => d.id === id);
    if (!removing) return;
    if (!confirm('Remove this document?')) return;
    if (!removing.isNew) setRemovedLegalDocIds(prev => [...prev, id]);
    setLegalDocs(prev => prev.filter(d => d.id !== id));
  }

  function addSocial() {
    setSocials(prev => [...prev, blankSocial()]);
  }

  function setSocialField(id: string, field: keyof SocialDraft, value: unknown) {
    setSocials(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));
  }

  function removeSocial(id: string) {
    const removing = socials.find(s => s.id === id);
    if (!removing) return;
    if (!confirm('Remove this social link?')) return;
    if (!removing.isNew) setRemovedSocialIds(prev => [...prev, id]);
    setSocials(prev => prev.filter(s => s.id !== id));
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

      // 2b. Clear is_primary for every existing person on this branch first.
      // Without this, switching who's primary can momentarily try to set
      // TWO rows to is_primary = true (old one still true, new one being set)
      // in the same branch, which violates the one-primary-per-branch unique
      // index depending on which order `people` happens to be in.
      if (branch) {
        await supabase.from('contacts').update({ is_primary: false }).eq('company_id', branchId);
      }

      // 3. Upsert each person, then replace their phones + emails.
      for (const p of people) {
        const { isNew, phones, emails, id } = p;
        const personPayload = toContactPayload(p, branchId);

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

        await supabase.from('contact_emails').delete().eq('contact_id', personId);
        const emailRows = emails.filter(em => em.email.trim()).map((em, i) => ({
          contact_id: personId, label: em.label || `Email-${i + 1}`, email: em.email, position: i,
        }));
        if (emailRows.length) {
          const { error } = await supabase.from('contact_emails').insert(emailRows);
          if (error) throw error;
        }
      }

      // 4. Delete removed addresses, then upsert the rest.
      if (removedAddressIds.length) {
        await supabase.from('branch_addresses').delete().in('id', removedAddressIds);
      }
      for (const [i, a] of addresses.entries()) {
        const { isNew, id } = a;
        const addressPayload = { ...toAddressPayload(a, branchId), position: i };
        if (isNew) {
          const { error } = await supabase.from('branch_addresses').insert(addressPayload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('branch_addresses').update(addressPayload).eq('id', id);
          if (error) throw error;
        }
      }

      // 5. Delete removed legal docs, then upsert the rest.
      if (removedLegalDocIds.length) {
        await supabase.from('branch_legal_docs').delete().in('id', removedLegalDocIds);
      }
      for (const [i, d] of legalDocs.entries()) {
        const { isNew, id } = d;
        const docPayload = { ...toLegalDocPayload(d, branchId), position: i };
        if (isNew) {
          const { error } = await supabase.from('branch_legal_docs').insert(docPayload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('branch_legal_docs').update(docPayload).eq('id', id);
          if (error) throw error;
        }
      }

      // 6. Delete removed social links, then upsert the rest.
      if (removedSocialIds.length) {
        await supabase.from('branch_socials').delete().in('id', removedSocialIds);
      }
      for (const [i, s] of socials.entries()) {
        const { isNew, id } = s;
        const socialPayload = { ...toSocialPayload(s, branchId), position: i };
        if (isNew) {
          const { error } = await supabase.from('branch_socials').insert(socialPayload);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('branch_socials').update(socialPayload).eq('id', id);
          if (error) throw error;
        }
      }

      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
      onSaved(branchId);
    } catch (err) {
      console.error('Save error:', err);
      alert(`Failed to save: ${supabaseErrorMessage(err)}`);
    } finally {
      setSaving(false);
    }
  }

  async function addActivity() {
    const text = actNote.trim();
    if (!text || !primaryId || primaryId.startsWith('new-')) return;
    setActSaving(true);
    const { data, error } = await supabase.from('contact_activities')
      .insert({
        contact_id: primaryId,
        note: text,
        call_significance: actSignificance,
        reschedule_at: actReschedule ? new Date(actReschedule).toISOString() : null,
      }).select().single();
    if (!error && data) {
      setActivities(prev => [...prev, data as ContactActivity]);
      setActNote('');
      setActReschedule('');
      setActSignificance('significant');
    }
    setActSaving(false);
  }

  async function deleteActivity(id: string) {
    if (!confirm('Delete this activity entry?')) return;
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
    <div className="modal-overlay">
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
            {savedFlash && (
              <span style={{ fontSize: '0.75rem', color: 'var(--success, #10b981)', fontWeight: 600 }}>✓ Saved</span>
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
              {t.key === 'address' && addresses.length > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
                  {addresses.length}
                </span>
              )}
              {t.key === 'legal' && legalDocs.length > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
                  {legalDocs.length}
                </span>
              )}
              {t.key === 'social' && socials.length > 0 && (
                <span style={{ background: 'var(--accent)', color: '#fff', borderRadius: '20px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
                  {socials.length}
                </span>
              )}
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
                <input
                  className="input"
                  list="company-name-options"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Start typing to see existing companies…"
                />
                <datalist id="company-name-options">
                  {companyNameOptions.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
              <div>
                <label>Branch Code</label>
                <input
                  className="input"
                  list="branch-code-options"
                  value={form.branch_code}
                  onChange={e => set('branch_code', e.target.value)}
                />
                <datalist id="branch-code-options">
                  {branchCodeOptions.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div>
                <label>Contact Status</label>
                <select className="input" value={form.status} onChange={e => set('status', e.target.value)}>
                  {BRANCH_STATUS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {/* Category (left) / Contact Type (right) */}
              <div>
                <label>Category</label>
                <select className="input" value={form.category} onChange={e => set('category', e.target.value)}>
                  <option value="">—</option>
                  {CATEGORY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label>Contact Type</label>
                <select className="input" value={form.contact_type} onChange={e => set('contact_type', e.target.value)}>
                  <option value="">—</option>
                  {CONTACT_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              {/* Assigned to (left) / Segment (right, below Category) */}
              <div>
                <label>Assigned to / Executive</label>
                <input className="input" value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} placeholder="e.g. Suneel" />
              </div>
              <div>
                <label>Segment</label>
                <select className="input" value={form.segment} onChange={e => set('segment', e.target.value)}>
                  <option value="">—</option>
                  {SEGMENT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <label>About Company</label>
                <textarea className="input" rows={3} value={form.about} onChange={e => set('about', e.target.value)} />
              </div>
            </div>
          )}

          {tab === 'address' && (
            <div>
              {addressAutoFilled && (
                <div style={{
                  marginBottom: '1rem', padding: '0.6rem 0.85rem',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.35)',
                  borderRadius: '8px', fontSize: '0.8rem', color: 'var(--success, #10b981)',
                }}>
                  ✓ Auto-filled from an existing branch with this company name &amp; branch code. Edit any field if it&apos;s changed.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add one row per address type (Billing, Mailing, Other…) and mark one as default.
                </p>
                <button className="btn-secondary" onClick={addAddress} style={{ fontSize: '0.78rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  <Plus size={13} /> Add address
                </button>
              </div>

              {addresses.map(a => (
                <div key={a.id} style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '1rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
                    <button
                      onClick={() => makeDefaultAddress(a.id)}
                      title="Set as default address"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', color: a.is_default ? 'var(--warning, #f59e0b)' : 'var(--text-muted)' }}
                    >
                      <Star size={16} fill={a.is_default ? 'currentColor' : 'none'} />
                    </button>
                    <select
                      className="input"
                      style={{ width: '160px' }}
                      value={a.address_type || 'Billing'}
                      onChange={e => setAddress(a.id, 'address_type', e.target.value)}
                    >
                      {ADDRESS_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {a.is_default ? 'Default address' : ''}
                    </span>
                    <div style={{ flex: 1 }} />
                    <button className="btn-icon danger" onClick={() => removeAddress(a.id)}><Trash2 size={12} /></button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    <div><label>Shop No.</label><input className="input" value={a.shop_no || ''} onChange={e => setAddress(a.id, 'shop_no', e.target.value)} /></div>
                    <div><label>Building Name</label><input className="input" value={a.building_name || ''} onChange={e => setAddress(a.id, 'building_name', e.target.value)} /></div>
                    <div style={{ gridColumn: 'span 3' }}><label>Lane / Street</label><input className="input" value={a.lane_street || ''} onChange={e => setAddress(a.id, 'lane_street', e.target.value)} /></div>
                    <div style={{ gridColumn: 'span 3' }}><label>Landmark</label><input className="input" value={a.landmark || ''} onChange={e => setAddress(a.id, 'landmark', e.target.value)} /></div>
                    <div><label>Town</label><input className="input" value={a.town || ''} onChange={e => setAddress(a.id, 'town', e.target.value)} /></div>
                    <div>
                      <label>Pin Code</label>
                      <input
                        className="input" value={a.pin || ''}
                        onChange={e => setAddress(a.id, 'pin', e.target.value)}
                        onBlur={e => onPinBlur(a.id, e.target.value.trim())}
                        maxLength={6}
                        placeholder="6-digit pin — auto-fills town/district/state"
                      />
                      {pinLookup[a.id] === 'loading' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Looking up pincode…</span>
                      )}
                      {pinLookup[a.id] === 'ok' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--success, #10b981)' }}>✓ Filled from pincode lookup</span>
                      )}
                      {pinLookup[a.id] === 'not_found' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--warning, #f59e0b)' }}>Pincode not recognised — enter town/district/state manually</span>
                      )}
                      {pinLookup[a.id] === 'error' && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--danger, #ef4444)' }}>Couldn&apos;t reach the pincode lookup service — enter manually</span>
                      )}
                    </div>
                    <div><label>Taluka</label><input className="input" value={a.taluka || ''} onChange={e => setAddress(a.id, 'taluka', e.target.value)} /></div>
                    <div><label>District</label><input className="input" value={a.district || ''} onChange={e => setAddress(a.id, 'district', e.target.value)} /></div>
                    <div><label>State</label><input className="input" value={a.state || ''} onChange={e => setAddress(a.id, 'state', e.target.value)} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'legal' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label>Registered / Legal Company Name</label>
                  <input className="input" value={form.company_legal_name} onChange={e => set('company_legal_name', e.target.value)} placeholder="If different from trade name above" />
                </div>
                <div><label>GST No.</label><input className="input" value={form.legal_gst_no} onChange={e => set('legal_gst_no', e.target.value)} /></div>
                <div><label>PAN No.</label><input className="input" value={form.legal_pan_no} onChange={e => set('legal_pan_no', e.target.value)} /></div>
                <div><label>Aadhar No.</label><input className="input" value={form.legal_aadhar_no} onChange={e => set('legal_aadhar_no', e.target.value)} /></div>
                <div><label>Company Registration No.</label><input className="input" value={form.company_reg_no} onChange={e => set('company_reg_no', e.target.value)} /></div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add any further documents — more PAN/Aadhar/GST entries, Driving License, Passport, or anything else.
                </p>
                <button className="btn-secondary" onClick={addLegalDoc} style={{ fontSize: '0.78rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  <Plus size={13} /> Add document
                </button>
              </div>

              {legalDocs.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No documents added yet.</p>
              )}

              {legalDocs.map(d => (
                <div key={d.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'flex-start' }}>
                  <select
                    className="input" style={{ width: '170px', flexShrink: 0 }}
                    value={d.doc_type} onChange={e => setLegalDocField(d.id, 'doc_type', e.target.value)}
                  >
                    {LEGAL_DOC_TYPE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  {d.doc_type === 'Other' && (
                    <input
                      className="input" style={{ width: '150px', flexShrink: 0 }}
                      value={d.label || ''} onChange={e => setLegalDocField(d.id, 'label', e.target.value)}
                      placeholder="Document name"
                    />
                  )}
                  <input
                    className="input" style={{ flex: 1 }}
                    value={d.value || ''} onChange={e => setLegalDocField(d.id, 'value', e.target.value)}
                    placeholder="Number / value"
                  />
                  <button className="btn-icon danger" onClick={() => removeLegalDoc(d.id)}><Trash2 size={12} /></button>
                </div>
              ))}
            </div>
          )}

          {tab === 'social' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Add Instagram, Facebook, WhatsApp, and other links for this company.
                </p>
                <button className="btn-secondary" onClick={addSocial} style={{ fontSize: '0.78rem', display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  <Plus size={13} /> Add link
                </button>
              </div>

              {socials.length === 0 && (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>No social links added yet.</p>
              )}

              {socials.map(s => (
                  <div key={s.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                    <select
                      className="input" style={{ width: '150px', flexShrink: 0 }}
                      value={s.platform} onChange={e => setSocialField(s.id, 'platform', e.target.value)}
                    >
                      {SOCIAL_PLATFORM_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    {s.platform === 'Other' && (
                      <input
                        className="input" style={{ width: '150px', flexShrink: 0 }}
                        value={s.label || ''} onChange={e => setSocialField(s.id, 'label', e.target.value)}
                        placeholder="Platform name"
                      />
                    )}
                    <input
                      className="input" style={{ flex: 1 }}
                      value={s.value || ''} onChange={e => setSocialField(s.id, 'value', e.target.value)}
                      placeholder="Handle, number, or URL"
                    />
                    <button className="btn-icon danger" onClick={() => removeSocial(s.id)}><Trash2 size={12} /></button>
                  </div>
              ))}
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

                  <label style={{ marginBottom: '0.3rem', display: 'block' }}>Email addresses</label>
                  {p.emails.map(em => (
                    <div key={em.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.4rem' }}>
                      <input
                        className="input" style={{ width: '110px' }}
                        value={em.label} onChange={e => setEmail(p.id, em.id, 'label', e.target.value)}
                        placeholder="Label"
                      />
                      <input
                        className="input" style={{ flex: 1 }}
                        value={em.email} onChange={e => setEmail(p.id, em.id, 'email', e.target.value)}
                        placeholder="name@example.com"
                      />
                      <button className="btn-icon danger" onClick={() => removeEmail(p.id, em.id)}><Trash2 size={12} /></button>
                    </div>
                  ))}
                  <button className="btn-secondary" onClick={() => addEmail(p.id)} style={{ fontSize: '0.75rem', display: 'flex', gap: '0.3rem', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <Plus size={12} /> Add email
                  </button>

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
                        onBlur={e => formatPhoneOnBlur(p.id, ph.id, e.target.value)}
                        placeholder="10-digit mobile — formatted as 000-000-0000"
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
              <div style={{ marginBottom: '1rem' }}>
                <label title="Purpose still being confirmed with client">Default calling <span style={{ opacity: 0.5 }}>(placeholder)</span></label>
                <input className="input" value={form.default_calling} onChange={e => set('default_calling', e.target.value)} />
              </div>

              {!primaryId || primaryId.startsWith('new-') ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Save this contact first to log activity.</p>
              ) : (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                    {activities.map(a => (
                      <div key={a.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '0.5rem 0.75rem', background: 'var(--surface-2)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                          <span style={{ fontSize: '0.82rem', whiteSpace: 'pre-wrap' }}>{a.note}</span>
                          <button className="btn-icon danger" onClick={() => deleteActivity(a.id)} style={{ flexShrink: 0 }}><Trash2 size={11} /></button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          {a.call_significance && (
                            <span className={`badge`} style={{
                              fontSize: '0.65rem',
                              color: a.call_significance === 'significant' ? 'var(--warning, #f59e0b)' : 'var(--text-muted)',
                            }}>
                              {a.call_significance === 'significant' ? '★ Significant' : 'Insignificant'}
                            </span>
                          )}
                          {a.reschedule_at && (
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                              Reschedule: {new Date(a.reschedule_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    <div ref={actEndRef} />
                  </div>
                  <textarea
                    className="input" value={actNote} onChange={e => setActNote(e.target.value)}
                    placeholder="Add a note about this call…" rows={3} style={{ marginBottom: '0.5rem', width: '100%' }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <select className="input" style={{ width: '160px' }} value={actSignificance} onChange={e => setActSignificance(e.target.value)}>
                      {CALL_SIGNIFICANCE_OPTIONS.map(o => <option key={o} value={o}>{o === 'significant' ? 'Significant' : 'Insignificant'}</option>)}
                    </select>
                    <input
                      className="input" type="datetime-local" style={{ width: '220px' }}
                      value={actReschedule} onChange={e => setActReschedule(e.target.value)}
                      title="Reschedule call to…"
                    />
                    <div style={{ flex: 1 }} />
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
          <button className="btn-secondary" onClick={onClose}>Close</button>
          <button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}
