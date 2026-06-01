export interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: string;

  // Identity
  title?: string;
  first_name: string;
  middle_name?: string;
  last_name?: string;
  company?: string;
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
}

// Derived helper
export function contactDisplayName(c: Contact): string {
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
  stage_production?: string;
  stage_billing?: string;
  stage_delivery?: string;
  stage_proof?: string;
  stage_followup?: string;
  stage_feedback?: string;
  stage_review?: string;

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

export const PIPELINE_STAGES = [
  { key: 'stage_artwork',    label: 'Artwork' },
  { key: 'stage_production', label: 'Production' },
  { key: 'stage_billing',    label: 'Billing' },
  { key: 'stage_delivery',   label: 'Delivery' },
  { key: 'stage_proof',      label: 'Proof' },
  { key: 'stage_followup',   label: 'Follow-up' },
  { key: 'stage_feedback',   label: 'Feedback' },
  { key: 'stage_review',     label: 'Review' },
] as const;

export type PipelineStageKey = typeof PIPELINE_STAGES[number]['key'];
