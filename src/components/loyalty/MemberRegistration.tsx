import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { User, Phone, Mail, MapPin, Cake, CheckCircle, Download, QrCode, ArrowLeft, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { addDays, format } from 'date-fns';
import confetti from 'canvas-confetti';
import { generateMemberCard } from '../../lib/memberCard';
import { Link } from 'react-router-dom';

export default function MemberRegistration() {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birthday: '',
    memberType: 'Umum' as 'Umum' | 'Corporate',
    companyName: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [registeredMember, setRegisteredMember] = useState<any>(null);
  const [duration, setDuration] = useState(365);

  useEffect(() => {
    const fetchDuration = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'loyalty'));
      if (docSnap.exists()) {
        setDuration(docSnap.data().durationDays || 365);
      }
    };
    fetchDuration();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const memberId = `JNC-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const expiresAt = addDays(new Date(), duration);

      const memberData = {
        ...formData,
        memberId,
        registeredAt: new Date().toISOString(),
        expiresAt: expiresAt.toISOString()
      };

      await addDoc(collection(db, 'members'), memberData);
      
      // Upsert into unified customers collection
      const customerRef = doc(db, 'customers', formData.phone);
      const customerSnap = await getDoc(customerRef);
      if (customerSnap.exists()) {
        await updateDoc(customerRef, {
          name: formData.name,
          lastSeen: serverTimestamp(),
          isMember: true
        });
      } else {
        await setDoc(customerRef, {
          name: formData.name,
          phone: formData.phone,
          lastSeen: serverTimestamp(),
          totalSurveys: 0,
          isMember: true
        });
      }

      // Record Activity Log
      await addDoc(collection(db, 'activityLogs'), {
        memberPhone: formData.phone,
        type: 'REGISTRATION',
        timestamp: serverTimestamp(),
        details: `Pendaftaran member baru (${formData.memberType})`
      });

      setRegisteredMember(memberData);
      setSuccess(true);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#000000', '#3b82f6', '#ffffff']
      });
    } catch (error) {
      console.error(error);
      alert('Gagal mendaftar. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const downloadCard = async () => {
    if (!registeredMember) return;
    await generateMemberCard({
      name: registeredMember.name,
      memberId: registeredMember.memberId,
      expiresAt: registeredMember.expiresAt
    });
  };

  if (success && registeredMember) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-lg bg-gray-50 border border-gray-100 rounded-[3rem] p-10 text-center space-y-8"
        >
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter">PENDAFTARAN BERHASIL!</h2>
            <p className="text-gray-500 font-medium">Selamat datang di JNC RESTO & POOL Loyal Member.</p>
          </div>

            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 text-left">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Member ID</p>
                <p className="text-xl font-black text-blue-600">{registeredMember.memberId}</p>
              </div>
              <QRCodeSVG value={registeredMember.memberId} size={64} />
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Lengkap</p>
                <p className="font-bold text-gray-900">{registeredMember.name}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tipe Member</p>
                <p className="font-bold text-gray-900">{registeredMember.memberType}</p>
              </div>
              {registeredMember.memberType === 'Corporate' && (
                <div className="col-span-2">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nama Perusahaan</p>
                  <p className="font-bold text-gray-900">{registeredMember.companyName}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Berlaku Hingga</p>
                <p className="font-bold text-gray-900">{format(new Date(registeredMember.expiresAt), 'dd MMM yyyy')}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={downloadCard}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Member Card (PDF)
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button 
                onClick={() => {
                  setSuccess(false);
                  setFormData({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    birthday: '',
                    memberType: 'Umum',
                    companyName: ''
                  });
                }}
                className="py-4 bg-blue-50 text-blue-600 rounded-2xl font-bold hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Daftar Lagi
              </button>
              <Link 
                to="/"
                className="py-4 bg-white text-gray-900 border border-gray-200 rounded-2xl font-bold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Beranda
              </Link>
            </div>
            <p className="text-[10px] text-gray-400 font-medium">Data pendaftaran juga tersedia di sistem kasir kami.</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-white pt-32 pb-20 px-6">
      <div className="max-w-xl mx-auto space-y-12">
        <div className="text-center space-y-4">
          <span className="px-4 py-1.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-full">Loyalty Program</span>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter leading-none">JOIN OUR LOYAL MEMBER</h1>
          <p className="text-gray-500 font-medium max-w-sm mx-auto">Dapatkan penawaran eksklusif dan poin setiap kunjungan di JNC RESTO & POOL.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipe Member</label>
              <select 
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                value={formData.memberType}
                onChange={e => setFormData({
                  ...formData, 
                  memberType: e.target.value as 'Umum' | 'Corporate',
                  companyName: e.target.value === 'Umum' ? '' : formData.companyName
                })}
              >
                <option value="Umum">Umum (General)</option>
                <option value="Corporate">Corporate</option>
              </select>
            </div>

            <div className={`space-y-2 transition-opacity ${formData.memberType === 'Umum' ? 'opacity-50' : 'opacity-100'}`}>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Perusahaan</label>
              <input 
                required={formData.memberType === 'Corporate'}
                disabled={formData.memberType === 'Umum'}
                type="text"
                placeholder={formData.memberType === 'Umum' ? 'Tidak tersedia untuk tipe Umum' : 'Contoh: PT. Maju Bersama'}
                className="w-full px-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold disabled:cursor-not-allowed"
                value={formData.companyName}
                onChange={e => setFormData({...formData, companyName: e.target.value})}
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  required
                  type="text"
                  placeholder="Contoh: John Doe"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nomor WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  required
                  type="tel"
                  pattern="[0-9]*"
                  placeholder="Contoh: 08123456789"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  required
                  type="email"
                  placeholder="Contoh: john@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-8 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <textarea 
                  required
                  placeholder="Masukkan alamat rumah Anda..."
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold min-h-[100px]"
                  value={formData.address}
                  onChange={e => setFormData({...formData, address: e.target.value})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tanggal Lahir</label>
              <div className="relative">
                <Cake className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                <input 
                  required
                  type="date"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:bg-white focus:border-blue-500 outline-none transition-all font-semibold uppercase text-xs"
                  value={formData.birthday}
                  onChange={e => setFormData({...formData, birthday: e.target.value})}
                />
              </div>
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-lg hover:bg-gray-800 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
          >
            {loading ? 'MEMPROSES...' : 'DAFTAR SEKARANG'}
          </button>
          
          <p className="text-center text-[10px] text-gray-400 font-medium">
            Dengan mendaftar, Anda menyetujui syarat dan ketentuan JNC RESTO & POOL.
          </p>
        </form>
      </div>
    </div>
  );
}
