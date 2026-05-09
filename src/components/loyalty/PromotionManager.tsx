import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Promotion } from '../../types';
import { Plus, Trash2, Edit2, Image as ImageIcon, ToggleLeft, ToggleRight, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    imageUrl: '',
    originalPrice: '',
    discountPercent: '',
    discountNominal: '',
    discountedPrice: '',
    active: true
  });

  useEffect(() => {
    fetchPromotions();
  }, []);

  const fetchPromotions = async () => {
    const q = query(collection(db, 'promotions'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    setPromotions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Promotion)));
  };

  const handlePriceChange = (field: 'original' | 'discount' | 'percent' | 'nominal', value: string) => {
    const newFormData = { ...formData };
    
    if (field === 'original') {
      newFormData.originalPrice = value;
      // Recalculate if we have other values
      if (newFormData.discountPercent && value) {
        const original = Number(value);
        const percent = Number(newFormData.discountPercent);
        newFormData.discountNominal = Math.round(original * percent / 100).toString();
        newFormData.discountedPrice = (original - Number(newFormData.discountNominal)).toString();
      }
    } else if (field === 'percent') {
      newFormData.discountPercent = value;
      if (newFormData.originalPrice && value) {
        const original = Number(newFormData.originalPrice);
        const percent = Number(value);
        const nominal = Math.round(original * percent / 100);
        newFormData.discountNominal = nominal.toString();
        newFormData.discountedPrice = (original - nominal).toString();
      }
    } else if (field === 'nominal') {
      newFormData.discountNominal = value;
      if (newFormData.originalPrice && value) {
        const original = Number(newFormData.originalPrice);
        const nominal = Number(value);
        newFormData.discountedPrice = (original - nominal).toString();
        if (original > 0) {
          newFormData.discountPercent = Math.round((nominal / original) * 100).toString();
        }
      }
    } else if (field === 'discount') {
      newFormData.discountedPrice = value;
      if (newFormData.originalPrice && value) {
        const original = Number(newFormData.originalPrice);
        const discounted = Number(value);
        const nominal = original - discounted;
        newFormData.discountNominal = nominal.toString();
        if (original > 0) {
          newFormData.discountPercent = Math.round((nominal / original) * 100).toString();
        }
      }
    }

    setFormData(newFormData);
  };

  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    // Handle Google Drive
    if (url.includes('drive.google.com')) {
      const id = url.match(/[-\w]{25,}/);
      return id ? `https://lh3.googleusercontent.com/d/${id[0]}` : url;
    }
    // Handle Dropbox
    if (url.includes('dropbox.com')) {
      return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
    }
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const adminEmail = auth.currentUser?.email || 'Unknown Admin';

    try {
      const cleanUrl = getDirectImageUrl(formData.imageUrl);
      if (editingId) {
        await updateDoc(doc(db, 'promotions', editingId), {
          ...formData,
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
          discountedPrice: formData.discountedPrice ? Number(formData.discountedPrice) : null,
          imageUrl: cleanUrl,
          createdAt: serverTimestamp()
        });
        
        await addDoc(collection(db, 'activityLogs'), {
          adminEmail,
          type: 'ADMIN_ACTION',
          action: 'UPDATE_PROMOTION',
          timestamp: serverTimestamp(),
          details: `Memperbarui promo: ${formData.title}`
        });
      } else {
        const docRef = await addDoc(collection(db, 'promotions'), {
          ...formData,
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : null,
          discountedPrice: formData.discountedPrice ? Number(formData.discountedPrice) : null,
          imageUrl: cleanUrl,
          createdAt: serverTimestamp()
        });

        await addDoc(collection(db, 'activityLogs'), {
          adminEmail,
          type: 'ADMIN_ACTION',
          action: 'CREATE_PROMOTION',
          timestamp: serverTimestamp(),
          details: `Membuat promo baru: ${formData.title}`
        });
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ title: '', description: '', imageUrl: '', originalPrice: '', discountPercent: '', discountNominal: '', discountedPrice: '', active: true });
      fetchPromotions();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan promo');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const promo = promotions.find(p => p.id === id);
    if (!promo || !confirm(`Hapus promo "${promo.title}"?`)) return;

    try {
      await deleteDoc(doc(db, 'promotions', id));
      await addDoc(collection(db, 'activityLogs'), {
        adminEmail: auth.currentUser?.email || 'Unknown Admin',
        type: 'ADMIN_ACTION',
        action: 'DELETE_PROMOTION',
        timestamp: serverTimestamp(),
        details: `Menghapus promo: ${promo.title}`
      });
      fetchPromotions();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const promo = promotions.find(p => p.id === id);
    if (!promo) return;

    try {
      await updateDoc(doc(db, 'promotions', id), { active: !current });
      await addDoc(collection(db, 'activityLogs'), {
        adminEmail: auth.currentUser?.email || 'Unknown Admin',
        type: 'ADMIN_ACTION',
        action: 'TOGGLE_PROMOTION',
        timestamp: serverTimestamp(),
        details: `${!current ? 'Mengaktifkan' : 'Menonaktifkan'} promo: ${promo.title}`
      });
      fetchPromotions();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tight">Manajemen Promo</h2>
          <p className="text-sm text-gray-400 font-medium italic">Kelola penawaran eksklusif untuk loyal member.</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ title: '', description: '', imageUrl: '', originalPrice: '', discountPercent: '', discountNominal: '', discountedPrice: '', active: true });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
        >
          <Plus className="w-5 h-5" />
          Promo Baru
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {promotions.map((promo) => (
          <div key={promo.id} className="bg-white rounded-[2rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="aspect-[16/9] bg-gray-100 relative overflow-hidden">
              {promo.imageUrl ? (
                <img 
                  src={promo.imageUrl} 
                  alt={promo.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.includes('placeholder')) {
                      target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop';
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <ImageIcon className="w-12 h-12" />
                </div>
              )}
              <div className="absolute top-4 right-4">
                <button
                  onClick={() => toggleStatus(promo.id, promo.active)}
                  className={`p-2 rounded-xl backdrop-blur-md transition-all ${
                    promo.active ? 'bg-green-500/90 text-white' : 'bg-gray-500/90 text-white'
                  }`}
                >
                  {promo.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
              </div>
            </div>
            
            <div className="p-6 flex-1 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-bold text-gray-900 line-clamp-1">{promo.title}</h3>
                {promo.discountedPrice && promo.originalPrice && (
                  <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-1 rounded-lg uppercase tracking-widest">
                    -{Math.round(((promo.originalPrice - promo.discountedPrice) / promo.originalPrice) * 100)}%
                  </span>
                )}
              </div>

              {(promo.originalPrice || promo.discountedPrice) && (
                <div className="mb-3 flex items-baseline gap-2">
                  {promo.discountedPrice ? (
                    <>
                      <span className="text-sm font-black text-indigo-600">Rp {promo.discountedPrice.toLocaleString('id-ID')}</span>
                      {promo.originalPrice && (
                        <span className="text-[10px] font-medium text-gray-400 line-through">Rp {promo.originalPrice.toLocaleString('id-ID')}</span>
                      )}
                    </>
                  ) : (
                    promo.originalPrice && <span className="text-sm font-black text-gray-900">Rp {promo.originalPrice.toLocaleString('id-ID')}</span>
                  )}
                </div>
              )}

              <p className="text-sm text-gray-500 line-clamp-2 mb-6 flex-1 italic leading-relaxed">
                {promo.description}
              </p>
              
              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-300">
                  PROMO ID: {promo.id.substring(0, 8)}
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      const original = promo.originalPrice || 0;
                      const discounted = promo.discountedPrice || 0;
                      const percent = original > 0 ? Math.round(((original - discounted) / original) * 100).toString() : '';
                      const nominal = original > 0 ? (original - discounted).toString() : '';
                      
                      setEditingId(promo.id);
                      setFormData({
                        title: promo.title,
                        description: promo.description,
                        imageUrl: promo.imageUrl || '',
                        originalPrice: promo.originalPrice?.toString() || '',
                        discountPercent: percent,
                        discountNominal: nominal,
                        discountedPrice: promo.discountedPrice?.toString() || '',
                        active: promo.active
                      });
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(promo.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
        {promotions.length === 0 && (
          <div className="col-span-full py-20 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-200 flex flex-col items-center">
            <ImageIcon className="w-16 h-16 text-gray-200 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Belum ada promo aktif</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  {editingId ? 'Edit Promo' : 'Buat Promo Baru'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-all"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Judul Promo</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Contoh: Diskon 20% Member Ultah"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Deskripsi</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all min-h-[120px]"
                    placeholder="Tulis detail syarat dan ketentuan promo..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Harga Normal (Rp)</label>
                    <input
                      type="number"
                      value={formData.originalPrice}
                      onChange={(e) => handlePriceChange('original', e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Potongan (Rp)</label>
                    <input
                      type="number"
                      value={formData.discountNominal}
                      onChange={(e) => handlePriceChange('nominal', e.target.value)}
                      className="w-full bg-orange-50 border-none rounded-2xl p-4 text-sm font-black text-orange-600 focus:ring-2 focus:ring-orange-500 transition-all text-center"
                      placeholder="Potongan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Diskon (%)</label>
                    <input
                      type="number"
                      value={formData.discountPercent}
                      onChange={(e) => handlePriceChange('percent', e.target.value)}
                      className="w-full bg-indigo-50 border-none rounded-2xl p-4 text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                      placeholder="%"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Harga Promo (Rp)</label>
                    <input
                      type="number"
                      value={formData.discountedPrice}
                      onChange={(e) => handlePriceChange('discount', e.target.value)}
                      className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-center"
                      placeholder="80000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">URL Foto Promo</label>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="url"
                        value={formData.imageUrl}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="https://images.unsplash.com/..."
                      />
                    </div>
                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center overflow-hidden border border-gray-100">
                      {formData.imageUrl ? (
                        <img 
                          src={getDirectImageUrl(formData.imageUrl)} 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover" 
                          onError={(e) => {
                            (e.target as HTMLImageElement).classList.add('hidden');
                          }}
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-gray-300" />
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan Promo'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-gray-200 transition-all"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
