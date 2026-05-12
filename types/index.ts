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
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  client_name: string;
  address?: string;
  work_description?: string;
  product_id?: string;
  product_name?: string;
  status: 'active' | 'completed' | 'on-hold';
  created_at: string;
  updated_at: string;
  product?: Product;
}
