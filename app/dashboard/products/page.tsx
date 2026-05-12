'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, X, Package } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import Toast from '@/components/Toast';
import type { Product } from '@/types';

const empty = { name: '', description: '', price: '' };

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('products').select('*').order('name');
    setProducts(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  function openAdd() { setEditing(null); setForm(empty); setShowModal(true); }
  function openEdit(p: Product) {
    setEditing(p);
    setForm({ name: p.name, description: p.description || '', price: p.price?.toString() || '' });
    setShowModal(true);
  }
  function close() { setShowModal(false); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      price: form.price ? parseFloat(form.price) : null,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      const { error } = await supabase.from('products').update(payload).eq('id', editing.id);
      if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Product updated', type: 'success' }); }
    } else {
      const { error } = await supabase.from('products').insert(payload);
      if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Product added', type: 'success' }); }
    }

    setSaving(false); close(); load();
  }

  async function del(id: string) {
    if (!confirm('Delete this product? Projects using it will lose their product link.')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) { setToast({ msg: error.message, type: 'error' }); } else { setToast({ msg: 'Product deleted', type: 'success' }); load(); }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '900px' }}>
      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>Products</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.3rem', fontSize: '0.875rem' }}>{products.length} in catalog</p>
        </div>
        <button className="btn-primary" onClick={openAdd}><Plus size={16} /> Add Product</button>
      </div>

      {/* Product cards grid */}
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
      ) : products.length === 0 ? (
        <div className="glass" style={{ padding: '3rem', textAlign: 'center' }}>
          <Package size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
          <p style={{ color: 'var(--text-muted)', margin: 0 }}>No products yet. Add your first product.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {products.map(p => (
            <div key={p.id} className="glass" style={{ padding: '1.25rem', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div style={{ width: '38px', height: '38px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Package size={17} color="var(--success)" />
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button className="btn-ghost" style={{ padding: '0.35rem 0.6rem' }} onClick={() => openEdit(p)}><Pencil size={12} /></button>
                  <button className="btn-danger" style={{ padding: '0.35rem 0.6rem' }} onClick={() => del(p.id)}><Trash2 size={12} /></button>
                </div>
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: '0 0 0.4rem 0', color: 'var(--text)' }}>{p.name}</h3>
              {p.description && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>{p.description}</p>}
              {p.price != null && (
                <div style={{ marginTop: 'auto' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--success)', fontFamily: 'Syne, sans-serif' }}>
                    ₹{p.price.toLocaleString('en-IN')}
                  </span>
                </div>
              )}
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.75rem', marginBottom: 0 }}>
                Added {new Date(p.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && close()}>
          <div className="modal">
            <div style={{ padding: '1.5rem 1.5rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                <Package size={18} style={{ display: 'inline', marginRight: '0.5rem', color: 'var(--success)' }} />
                {editing ? 'Edit Product' : 'New Product'}
              </h2>
              <button className="btn-ghost" style={{ padding: '0.4rem' }} onClick={close}><X size={16} /></button>
            </div>
            <form onSubmit={save} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label>Product Name *</label>
                <input className="input" required placeholder="Solar Panel 500W" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label>Description</label>
                <textarea className="input" placeholder="Brief description of the product..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label>Price (₹)</label>
                <input className="input" type="number" step="0.01" min="0" placeholder="25000" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Product'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
