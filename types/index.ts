export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  created_at: string;
  updated_at: string;
}

// ─── Branch/account record ──────────────────────────────────────
// The primary record in the new (post-restructure) data model.
// NOTE: called "Branch" rather than "Company" because the same
// company name can have multiple branches (e.g. two Canara Bank
// branches with different branch codes) — each is its own row here.
export interface Branch {
  id: string;
  customer_id: number; // auto-numbered, display-only

  // Identity
  name: string;
  branch_code?: string;

  // Classification
  contact_type?: string;   // see CONTACT_TYPE_OPTIONS
  category?: string;       // see CATEGORY_OPTIONS
  segment?: string;        // see SEGMENT_OPTIONS
  status?: string;         // see BRANCH_STATUS_OPTIONS
  assigned_to?: string;

  about?: string;
  default_calling?: string; // placeholder field — exact meaning TBC with client

  // Legal / company details (branch-level — distinct from a person's own
  // gst_no/pan_no/aadhar_no on Contact)
  legal_gst_no?: string;
  legal_pan_no?: string;
  legal_aadhar_no?: string;
  company_reg_no?: string;
  company_legal_name?: string;

  // Legacy single-address columns — superseded by the `branch_addresses`
  // table below (multiple addresses per branch). Left in place so old
  // data isn't lost; no longer edited directly in the UI.
  address_type?: string; // Billing | Mailing | Other
  shop_no?: string;
  building_name?: string;
  lane_street?: string;
  landmark?: string;
  area?: string;
  town?: string;
  pin?: string;
  taluka?: string;
  district?: string;
  state?: string;

  created_at: string;
  updated_at: string;

  // Populated client-side via a join, not a real column.
  contacts?: Contact[];
  addresses?: BranchAddress[];
}

// ─── Multiple addresses per branch ──────────────────────────────
// Note: no separate "Locality/Area" field — Town is kept as the one
// place/locality field per the client's request to simplify this.
export interface BranchAddress {
  id: string;
  branch_id: string;
  address_type?: string; // Billing | Mailing | Other
  is_default?: boolean;
  shop_no?: string;
  building_name?: string;
  lane_street?: string;
  landmark?: string;
  town?: string;
  pin?: string;
  taluka?: string;
  district?: string;
  state?: string;
  position?: number;
  created_at: string;
}

export function defaultAddress(branch: Pick<Branch, 'addresses'>): BranchAddress | undefined {
  return branch.addresses?.find(a => a.is_default) ?? branch.addresses?.[0];
}

// "Primary Contact" shown in the UI isn't its own field — it's whichever
// linked Contact has is_primary = true. Convenience getter for that.
export function primaryContact(branch: Pick<Branch, 'contacts'>): Contact | undefined {
  return branch.contacts?.find(c => c.is_primary) ?? branch.contacts?.[0];
}

export const CONTACT_TYPE_OPTIONS = [
  'Manufacturer', 'Trader', 'Wholesaler', 'Company', 'Free Lancer', 'Service Provider',
] as const;

export const CATEGORY_OPTIONS = [
  'Civil Engineer', 'Hospital', 'Healthcare', 'Individual', 'Clinic',
  'Resort', 'Lodge', 'Restaurant', 'Bank', 'Financial Institute',
  'Industry', 'General Store', 'Pharmacy', 'Advocate', 'Notary',
  'Hardware', 'Electrical', 'Developer', 'Pre school', 'School',
  'College', 'Coaching Center', 'Bakery', 'Printing press',
  'Advertising Agency', 'Digital Printer', 'Stationery', 'Flex Printers',
  'Travel Agency', 'Cab Rentals', 'Auto Garage',
] as const;

export const SEGMENT_OPTIONS = [
  'Healthcare', 'Hospitality', 'Hotel', 'Financial Institute',
  'Educational Institute', 'Food Industry', 'Insurace Ind', 'Legal',
  'Civil Developer', 'Construction', 'Automobile Industry', 'Printing Industry',
] as const;

export const BRANCH_STATUS_OPTIONS = [
  'Dump', 'Suspect', 'Prospect', 'Customer 1', 'Customer 2', 'Customer+', 'Regular', 'Loyal', '5 Star',
] as const;

export const DESIGNATION_OPTIONS = [
  'Owner', 'Partner', 'Assistant', 'Officer', 'Manager', 'Senior Manager', 'Director', 'Authorised',
] as const;

export const TITLE_OPTIONS = ['Mr', 'Ms', 'Mrs', 'Dr', 'Adv.'] as const;

export const ADDRESS_TYPE_OPTIONS = ['Billing', 'Mailing', 'Other'] as const;

// ─── Contact phones (unlimited, per person) ─────────────────────
export interface ContactPhone {
  id: string;
  contact_id: string;
  label: string;   // e.g. "Mobile-1", "WhatsApp"
  number: string;
  position?: number;
  created_at: string;
}

// ─── Contact emails (unlimited, per person — mirrors ContactPhone) ──
export interface ContactEmail {
  id: string;
  contact_id: string;
  label: string;   // e.g. "Email-1", "Work"
  email: string;
  position?: number;
  created_at: string;
}

// Formats a 10-digit Indian mobile number as "XXX-XXX-XXXX".
// Anything that isn't a plain 10-digit number is returned unchanged
// (so numbers with a country code, landlines, etc. aren't mangled).
export function formatMobile(raw?: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return raw;
}

export interface Contact {
  id: string;

  // Branch link (new)
  company_id?: string;
  is_primary?: boolean;
  designation?: string; // see DESIGNATION_OPTIONS — distinct from legacy job_title

  // Identity
  title?: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  company?: string; // legacy free-text field, kept for backward compat during transition
  job_title?: string;

  // Classification
  contact_type?: string;
  category?: string;
  segment?: string;
  status?: string;
  frequency_type?: string;
  star_rating?: number;
  assigned_to?: string;

  // Address
  address_line?: string;
  area?: string;
  taluka?: string;
  district?: string;
  state?: string;
  pin?: string;

  // Communication
  phone?: string;
  phone_2?: string;
  mobile?: string;
  whatsapp?: string;
  email?: string;
  email_2?: string;

  // Social
  website?: string;
  instagram?: string;
  facebook?: string;
  google_review?: string;

  // Legal
  gst_no?: string;
  pan_no?: string;
  aadhar_no?: string;
  driving_license?: string;

  // Owner
  owner_name?: string;
  owner_mobile?: string;
  owner_whatsapp?: string;

  // Scheduling
  next_call_date?: string;
  call_significance?: string;

  // Misc
  notes?: string;
  pending_status?: string;

  created_at: string;
  updated_at: string;

  // Populated client-side via a join, not a real column.
  phones?: ContactPhone[];
  emails?: ContactEmail[];
  activities?: Pick<ContactActivity, 'id' | 'reschedule_at'>[];
}

// Derived helper
export function contactDisplayName(c: Pick<Contact, 'title' | 'first_name' | 'middle_name' | 'last_name'>): string {
  return [c.title, c.first_name, c.middle_name, c.last_name]
    .filter(Boolean)
    .join(' ');
}

export const CALL_SIGNIFICANCE_OPTIONS = ['significant', 'insignificant'] as const;

export interface ContactActivity {
  id: string;
  contact_id: string;
  note: string;
  call_significance?: string; // significant | insignificant
  reschedule_at?: string;     // ISO datetime — when this call should be followed up
  created_at: string;
}

// How overdue a branch's next follow-up call is, based on the nearest
// reschedule_at across its primary contact's activities. Returns undefined
// if there's no upcoming/overdue reschedule on file.
export function callDelayDays(activities: Pick<ContactActivity, 'reschedule_at'>[]): number | undefined {
  const upcoming = activities
    .map(a => a.reschedule_at)
    .filter((d): d is string => !!d)
    .sort();
  if (!upcoming.length) return undefined;
  const nearest = new Date(upcoming[0]).getTime();
  const days = Math.floor((Date.now() - nearest) / (1000 * 60 * 60 * 24));
  return days > 0 ? days : 0;
}

export interface Project {
  id: string;
  client_name: string;
  contact_id?: string;
  address?: string;
  work_description?: string;
  product_id?: string;
  product_name?: string;
  status: 'active' | 'completed' | 'on-hold';
  bill_no?: string;
  amount?: number;

  // Pipeline stages
  stage_artwork?: string;
  stage_proof?: string;
  stage_followup?: string;
  stage_production?: string;
  stage_billing?: string;
  stage_delivery?: string;
  stage_review?: string;
  stage_feedback?: string;

  created_at: string;
  updated_at: string;
  product?: Product;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

// Order matches the wireframe's left-to-right flow:
// Artwork -> Proof -> Followup -> Production -> Billing -> Delivery -> Review -> Feedback
export const PIPELINE_STAGES = [
  { key: 'stage_artwork',    label: 'Artwork' },
  { key: 'stage_proof',      label: 'Proof' },
  { key: 'stage_followup',   label: 'Follow-up' },
  { key: 'stage_production', label: 'Production' },
  { key: 'stage_billing',    label: 'Billing' },
  { key: 'stage_delivery',   label: 'Delivery' },
  { key: 'stage_review',     label: 'Review' },
  { key: 'stage_feedback',   label: 'Feedback' },
] as const;

export type PipelineStageKey = typeof PIPELINE_STAGES[number]['key'];