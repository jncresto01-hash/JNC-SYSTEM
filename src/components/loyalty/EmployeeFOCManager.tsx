import React, { useState, useEffect } from 'react';
import { 
  collection, query, getDocs, addDoc, updateDoc, deleteDoc, 
  doc, serverTimestamp, orderBy 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { EmployeeFOC } from '../../types';
import { 
  Plus, Search, Edit2, Trash2, X, Check, 
  User, Building2, Briefcase, Percent, ShieldCheck, Calendar,
  MoreVertical, Phone, AlertCircle, CreditCard, MessageCircle, Download, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import MembershipCard from './MembershipCard';
import { toPng } from 'html-to-image';
import { Member } from '../../types';

export default function EmployeeFOCManager() {
  const [focList, setFocList] = useState<EmployeeFOC[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewFoc, setPreviewFoc] = useState<EmployeeFOC | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    companyName: 'JNC Resto & Pool',
    position: '',
    discountValue: '100',
    approvedBy: '',
    validUntil: '',
    active: true,
    focId: ''
  });

  useEffect(() => {
    fetchFOCList();
  }, []);

  const fetchFOCList = async () => {
    try {
      const q = query(collection(db, 'employeeFOC'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setFocList(snap.docs.map(d => ({ id: d.id, ...d.data() } as EmployeeFOC)));
      setError(null);
    } catch (err: any) {
      console.error("Error fetching FOC list:", err);
      setError(err.message || String(err));
      handleFirestoreError(err, OperationType.LIST, 'employeeFOC');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const data: any = {
        ...formData,
        discountValue: Number(formData.discountValue),
        updatedAt: serverTimestamp(),
      };

      if (!editingId) {
        data.createdAt = serverTimestamp();
      }

      // Generate ID if missing
      if (!data.focId || data.focId.trim() === '') {
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        data.focId = `JNC-FOC-${randomPart}`;
      } else {
        data.focId = data.focId.trim().toUpperCase();
      }

      if (editingId) {
        await updateDoc(doc(db, 'employeeFOC', editingId), data);
      } else {
        await addDoc(collection(db, 'employeeFOC'), data);
      }

      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        name: '',
        phone: '',
        companyName: 'JNC Resto & Pool',
        position: '',
        discountValue: '100',
        approvedBy: '',
        validUntil: '',
        active: true,
        focId: ''
      });
      fetchFOCList();
    } catch (err: any) {
      console.error("Error saving FOC record:", err);
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'employeeFOC');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'employeeFOC', id));
      setDeleteId(null);
      fetchFOCList();
    } catch (err: any) {
      console.error("Error deleting FOC record:", err);
      handleFirestoreError(err, OperationType.DELETE, 'employeeFOC');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWhatsApp = (foc: EmployeeFOC) => {
    const message = `Halo ${foc.name},\n\nBerikut adalah ID FOC JNC Resto & Pool Anda:\nID: *${foc.focId}*\n\nAnda dapat mengakses portal member untuk melihat kartu digital Anda di sini:\n${window.location.origin}/member-portal\n\nSimpan kode ID ini untuk menikmati fasilitas FOC. Terima kasih!`;
    const encodedMessage = encodeURIComponent(message);
    const phone = foc.phone.startsWith('0') ? '62' + foc.phone.slice(1) : foc.phone;
    const waUrl = `https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`;
    window.open(waUrl, '_blank');
  };

  const downloadCard = async (focId: string, name: string) => {
    const element = document.getElementById(`membership-card-${focId}`);
    if (!element) {
      alert("Elemen kartu tidak ditemukan. Pastikan kartu ditampilkan di layar.");
      return;
    }
    
    try {
      const dataUrl = await toPng(element, { quality: 1, backgroundColor: 'transparent', pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `JNC-FOC-${name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download card', err);
      alert("Gagal mengunduh kartu. Silakan coba lagi.");
    }
  };

  const mapFocToMember = (foc: EmployeeFOC): Member => ({
    id: foc.id,
    name: foc.name,
    phone: foc.phone,
    memberId: foc.focId,
    memberType: 'FOC',
    registeredAt: foc.createdAt,
    expiresAt: foc.validUntil,
    email: '',
    address: `${foc.companyName} - ${foc.position}`,
  } as Member);

  const filteredList = focList.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.phone.includes(searchTerm) ||
    item.companyName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tighter mb-2 italic">
            FOC <span className="text-indigo-600">Employee</span>
          </h1>
          <p className="text-sm text-gray-500 font-medium italic">Manajemen Fasilitas Free of Charge Karyawan JNC</p>
        </div>
        
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              phone: '',
              companyName: 'JNC Resto & Pool',
              position: '',
              discountValue: '100',
              approvedBy: '',
              validUntil: '',
              active: true,
              focId: ''
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Tambah FOC
        </button>
      </div>

      <div className="relative mb-8 max-w-md">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Cari nama, hp, atau perusahaan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100 rounded-[2rem] shadow-sm text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredList.map((foc) => (
          <motion.div
            key={foc.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm transition-all hover:shadow-xl relative group ${!foc.active && 'opacity-60'}`}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
                <User className="w-6 h-6" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEditingId(foc.id);
                    setFormData({
                      name: foc.name,
                      phone: foc.phone,
                      companyName: foc.companyName,
                      position: foc.position,
                      discountValue: foc.discountValue.toString(),
                      approvedBy: foc.approvedBy,
                      validUntil: foc.validUntil || '',
                      active: foc.active,
                      focId: foc.focId || ''
                    });
                    setIsModalOpen(true);
                  }}
                  className="p-3 bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPreviewFoc(foc)}
                  className="p-3 bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"
                  title="Lihat Kartu"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleWhatsApp(foc)}
                  className="p-3 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all"
                  title="Kirim WhatsApp"
                >
                  <MessageCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteId(foc.id)}
                  className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                  title="Hapus"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between font-black text-[10px] text-indigo-600 uppercase tracking-widest mb-1">
                  <span>{foc.focId || 'NO ID'}</span>
                  <div className="flex items-center gap-1">
                    <Briefcase className="w-3 h-3" />
                    {foc.position || 'Employee'}
                  </div>
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight line-clamp-1">{foc.name}</h3>
              </div>

              <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Perusahaan</label>
                  <p className="text-xs font-bold text-gray-700">{foc.companyName}</p>
                </div>
                <div>
                  <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Diskon</label>
                  <p className="text-xs font-black text-red-600">{foc.discountValue}% FOC</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50">
                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-0.5">ACC By</label>
                    <p className="text-[10px] font-black text-gray-900 uppercase">{foc.approvedBy}</p>
                  </div>
                </div>
              </div>

              {foc.validUntil && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 italic">
                  <Calendar className="w-3 h-3" />
                  Sampai: {new Date(foc.validUntil).toLocaleDateString()}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {filteredList.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 rounded-[3rem] border-4 border-dashed border-gray-100">
            <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Data FOC Karyawan tidak ditemukan</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteId(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Hapus Data FOC?</h3>
              <p className="text-sm text-gray-500 mb-8">Tindakan ini tidak dapat dibatalkan. Karyawan ini akan kehilangan akses FOC.</p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-4 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => deleteId && handleDelete(deleteId)}
                  disabled={isLoading}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-100 disabled:opacity-50"
                >
                  {isLoading ? 'Menghapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {previewFoc && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewFoc(null)}
              className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm"
            >
              <div className="mb-6 flex justify-center">
                <MembershipCard member={mapFocToMember(previewFoc)} />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => downloadCard(previewFoc.focId, previewFoc.name)}
                  className="flex-1 bg-white text-gray-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl"
                >
                  <Download className="w-4 h-4" /> Download Kartu
                </button>
                <button
                  onClick={() => setPreviewFoc(null)}
                  className="w-14 h-14 bg-gray-800 text-white rounded-2xl flex items-center justify-center shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                  {editingId ? 'Edit Fasilitas FOC' : 'Input FOC Karyawan'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-full transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nama Karyawan</label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          required
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="Masukkan nama lengkap"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">FOC ID (Kode Portal)</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.focId}
                          onChange={(e) => setFormData({ ...formData, focId: e.target.value.toUpperCase() })}
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="JNC-FOC-XXXXXX"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nomor HP</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="08..."
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Diskon FOC (%)</label>
                      <div className="relative">
                        <Percent className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          required
                          type="number"
                          value={formData.discountValue}
                          onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                          className="w-full bg-indigo-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-black text-indigo-600 focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Perusahaan</label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.companyName}
                          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Jabatan</label>
                      <div className="relative">
                        <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.position}
                          onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                          className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                          placeholder="Jabatan"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">ACC By (Pemberi Izin)</label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        required
                        type="text"
                        value={formData.approvedBy}
                        onChange={(e) => setFormData({ ...formData, approvedBy: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                        placeholder="Nama Staff ACC"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Masa Aktif Hingga</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={formData.validUntil}
                        onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
                        className="w-full bg-gray-50 border-none rounded-2xl pl-12 pr-4 py-4 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                    <input
                      type="checkbox"
                      id="active-check"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-5 h-5 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="active-check" className="text-sm font-black text-gray-900 uppercase tracking-widest">
                      Status Aktif
                    </label>
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-gray-50 sticky bottom-0 bg-white">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 px-8 py-4 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-[10px] border border-gray-100 hover:bg-gray-50 transition-all"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="flex-1 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-indigo-700 transition-all disabled:opacity-50 shadow-xl shadow-indigo-100"
                    >
                      {isLoading ? 'Menyimpan...' : (editingId ? 'Simpan Perubahan' : 'Input Data FOC')}
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
