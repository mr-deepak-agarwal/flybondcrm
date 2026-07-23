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

  // Address
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
] as const;

export const SEGMENT_OPTIONS = [
  'Healthcare', 'Hospitality', 'Hotel', 'Financial Institute',
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
}

// Derived helper
export function contactDisplayName(c: Pick<Contact, 'title' | 'first_name' | 'middle_name' | 'last_name'>): string {
  return [c.title, c.first_name, c.middle_name, c.last_name]
    .filter(Boolean)
    .join(' ');
}

export interface ContactActivity {
  id: string;
  contact_id: string;
  note: string;
  created_at: string;
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