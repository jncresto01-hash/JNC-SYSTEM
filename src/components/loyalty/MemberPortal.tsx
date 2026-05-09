import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Member, Promotion } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User, CreditCard, LogOut, Ticket, 
  MapPin, Phone, Mail, Calendar,
  ChevronRight, Star, Gift, Sparkles,
  Search, Info, Image as ImageIcon, X, Download
} from 'lucide-react';
import MembershipCard from './MembershipCard';
import { toPng } from 'html-to-image';

export default function MemberPortal() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [member, setMember] = useState<Member | null>(null);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [selectedPromo, setSelectedPromo] = useState<Promotion | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Login Form
  const [loginData, setLoginData] = useState({
    name: '',
    memberId: ''
  });

  useEffect(() => {
    const savedMember = sessionStorage.getItem('logged_member');
    if (savedMember) {
      setMember(JSON.parse(savedMember));
      setIsLoggedIn(true);
      fetchPromotions();
    }
  }, []);

  const formatDateValue = (val: any) => {
    if (!val) return null;
    if (val.seconds) return val.seconds * 1000;
    return val;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    let searchId = loginData.memberId.trim().toUpperCase();
    const searchName = loginData.name.trim().toLowerCase();

    // Smart fix for incomplete FOC IDs
    if (searchId.length === 6 && !searchId.startsWith('JNC')) {
      searchId = `JNC-FOC-${searchId}`;
    }

    try {
      // 1. Check Members collection
      const qMember = query(
        collection(db, 'members'),
        where('memberId', '==', searchId)
      );
      
      const snapMember = await getDocs(qMember);
      let memberData: Member | null = null;
      
      if (!snapMember.empty) {
        memberData = { id: snapMember.docs[0].id, ...snapMember.docs[0].data() } as Member;
      } else {
        // 2. Fallback: Check EmployeeFOC collection
        const qFoc = query(
          collection(db, 'employeeFOC'),
          where('focId', '==', searchId)
        );
        const snapFoc = await getDocs(qFoc);
        
        if (!snapFoc.empty) {
          const focData = snapFoc.docs[0].data();
          // Map to Member shape
          memberData = {
            id: snapFoc.docs[0].id,
            name: focData.name,
            phone: focData.phone,
            memberId: focData.focId,
            memberType: 'FOC',
            registeredAt: formatDateValue(focData.createdAt),
            expiresAt: formatDateValue(focData.validUntil),
            email: '',
            address: focData.companyName + ' - ' + focData.position,
          } as Member;
        }
      }
      
      if (!memberData) {
        setError(`ID "${searchId}" tidak ditemukan. Gunakan format lengkap (contoh: JNC-FOC-XXXXXX atau JNCXXXX).`);
        setLoading(false);
        return;
      }

      // Check name (case insensitive-ish)
      const dbName = memberData.name.toLowerCase();
      if (dbName.includes(searchName) || searchName.includes(dbName)) {
        setMember(memberData);
        setIsLoggedIn(true);
        sessionStorage.setItem('logged_member', JSON.stringify(memberData));
        fetchPromotions();
      } else {
        setError('Nama tidak sesuai dengan data ID yang terdaftar.');
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(`Terjadi kesalahan: ${err.message || 'Silakan coba lagi.'}`);
    } finally {
      setLoading(false);
    }
  };

  // Image URL Helper
  const getDirectImageUrl = (url: string) => {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
      const id = url.match(/[-\w]{25,}/);
      return id ? `https://lh3.googleusercontent.com/d/${id[0]}` : url;
    }
    if (url.includes('dropbox.com')) {
      return url.replace('www.dropbox.com', 'dl.dropboxusercontent.com').replace('?dl=0', '');
    }
    return url;
  };

  const fetchPromotions = async () => {
    try {
      const q = query(
        collection(db, 'promotions'),
        where('active', '==', true)
      );
      const snap = await getDocs(q);
      const promos = snap.docs.map(d => ({ id: d.id, ...d.data() } as Promotion));
      // Sort manually to avoid composite index requirement
      promos.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setPromotions(promos);
    } catch (err) {
      console.error("Fetch promotions error:", err);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('logged_member');
    setMember(null);
    setIsLoggedIn(false);
  };

  const downloadCard = async () => {
    if (!member) return;
    const element = document.getElementById(`membership-card-${member.memberId}`);
    if (!element) {
      alert("Elemen kartu tidak ditemukan.");
      return;
    }
    
    try {
      const dataUrl = await toPng(element, { 
        quality: 1, 
        backgroundColor: 'transparent',
        pixelRatio: 3,
        cacheBust: true
      });
      const link = document.createElement('a');
      link.download = `JNC-CARD-${member.name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download card', err);
      alert("Gagal mengunduh kartu. Silakan coba lagi.");
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="bg-[#F8FAFC] pt-32 pb-20 px-6 font-sans">
        {/* Header Section removed as it's redundant with PublicLayout or can be integrated */}
        
        {/* Login Card */}
        <div className="px-6">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-md mx-auto bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 p-8 md:p-10 border border-gray-50"
          >
            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Nama Sesuai Pendaftaran</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    required
                    type="text"
                    value={loginData.name}
                    onChange={(e) => setLoginData({ ...loginData, name: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="Masukkan nama Anda"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Kode Member (ID)</label>
                <div className="relative">
                  <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-300" />
                  <input
                    required
                    type="text"
                    value={loginData.memberId}
                    onChange={(e) => setLoginData({ ...loginData, memberId: e.target.value })}
                    className="w-full bg-gray-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                    placeholder="JNCXXXX"
                  />
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 border border-red-100"
                >
                  <Info className="w-4 h-4 flex-shrink-0" />
                  {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
              >
                {loading ? 'Mengecek...' : 'Masuk Portal'}
                <ChevronRight className="w-5 h-5" />
              </button>
            </form>

            <div className="mt-10 text-center">
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Bermasalah dengan akun?</p>
              <a href="https://wa.me/628123456789" target="_blank" rel="noreferrer" className="inline-block mt-2 text-indigo-600 font-black text-sm hover:underline">
                Hubungi Admin Support
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#F8FAFC] pt-32 pb-20 font-sans">
      <div className="max-w-6xl mx-auto px-6 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Left Column: Welcome & Card */}
          <div className="lg:col-span-7 space-y-8">
            <section>
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <h2 className="text-3xl md:text-4xl font-black text-gray-900 tracking-tighter uppercase mb-1">Halo, {member?.name}!</h2>
                  <p className="text-sm text-gray-500 font-medium italic">Member {member?.memberType} JNC Resto & Pool</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-white text-red-500 border border-gray-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-50 transition-all shadow-sm"
                >
                  <LogOut className="w-4 h-4" /> Keluar
                </button>
              </div>
              
              <div className="max-w-md">
                {member && <MembershipCard member={member} />}
                
                <button
                  onClick={downloadCard}
                  className="w-full mt-6 bg-white text-gray-900 border border-gray-100 py-4 rounded-3xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 shadow-xl shadow-gray-100/50 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                >
                  <Download className="w-4 h-4" /> Download Kartu Digital
                </button>
              </div>
            </section>

            {/* Info Grid - Moved inside left column for desktop */}
            <section className="grid grid-cols-2 gap-4 max-w-md">
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                  <Star className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</div>
                <div className="text-sm font-black text-gray-900 uppercase">{member?.memberType}</div>
              </div>
              <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm transition-all hover:shadow-md">
                <div className="w-10 h-10 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Member Sejak</div>
                <div className="text-sm font-black text-gray-900 uppercase">
                  {member?.registeredAt ? new Date(formatDateValue(member.registeredAt)).getFullYear() : '-'}
                </div>
              </div>
            </section>
          </div>

          {/* Right Column: Featured Alert or Stats */}
          <div className="lg:col-span-5">
            <div className="bg-indigo-600 rounded-[2.5rem] p-8 md:p-10 text-white relative overflow-hidden h-full flex flex-col justify-center">
              <div className="relative z-10">
                <div className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-[0.2em] mb-6">
                  Loyalty Perk
                </div>
                <h4 className="text-2xl font-black uppercase tracking-tight mb-3">Keuntungan Member</h4>
                <p className="text-indigo-100 text-sm font-medium italic mb-8 leading-relaxed">
                  Nikmati diskon eksklusif, prioritas pool bed, dan promo seasonal hanya untuk pemegang kartu {member?.memberType}.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold">
                    <Star className="w-3 h-3" /> Priority Access
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl text-[10px] font-bold">
                    <Gift className="w-3 h-3" /> Birthday Gift
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl opacity-50" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-400/20 rounded-full blur-2xl opacity-50" />
            </div>
          </div>
        </div>

        {/* Promotions Section - Full width grid */}
        <section className="space-y-8">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6">
            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-3">
              <Ticket className="w-6 h-6 text-indigo-600" />
              Promo Spesial
            </h3>
            <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-4 py-2 rounded-full uppercase tracking-widest">
              {promotions.length} Promo Tersedia
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {promotions.map((promo) => (
              <motion.div
                key={promo.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm flex flex-col h-full transition-all hover:shadow-xl hover:-translate-y-1 group"
              >
                <div 
                  onClick={() => promo.imageUrl && setZoomedImage(getDirectImageUrl(promo.imageUrl))}
                  className="w-full aspect-video bg-gray-100 relative cursor-pointer overflow-hidden z-10"
                >
                  {promo.imageUrl ? (
                    <motion.img 
                      whileHover={{ scale: 1.1 }}
                      src={getDirectImageUrl(promo.imageUrl)} 
                      alt={promo.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-500" 
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
                  <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl shadow-lg">
                    HOT NEWS
                  </div>
                  {promo.discountedPrice && promo.originalPrice && (
                    <div className="absolute bottom-4 right-4 bg-red-600 text-white text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg shadow-lg">
                      -{Math.round(((promo.originalPrice - promo.discountedPrice) / promo.originalPrice) * 100)}%
                    </div>
                  )}
                </div>
                
                <div className="p-8 flex-1 flex flex-col">
                  <div className="mb-4">
                    <h4 className="text-xl font-black text-gray-900 uppercase leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3rem]">
                      {promo.title}
                    </h4>
                    {(promo.originalPrice || promo.discountedPrice) && (
                      <div className="mt-3 flex items-baseline gap-2">
                        {promo.discountedPrice ? (
                          <>
                            <span className="text-lg font-black text-indigo-600">Rp {promo.discountedPrice.toLocaleString('id-ID')}</span>
                            {promo.originalPrice && (
                              <span className="text-xs font-medium text-gray-400 line-through">Rp {promo.originalPrice.toLocaleString('id-ID')}</span>
                            )}
                          </>
                        ) : (
                          promo.originalPrice && <span className="text-lg font-black text-gray-900">Rp {promo.originalPrice.toLocaleString('id-ID')}</span>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 leading-relaxed italic mb-8 flex-1 line-clamp-3">
                    {promo.description}
                  </p>
                  
                  <button 
                    onClick={() => setSelectedPromo(promo)}
                    className="w-full bg-gray-50 text-gray-900 border border-transparent hover:border-indigo-600 hover:bg-white hover:text-indigo-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
                  >
                    Detail Promo
                  </button>
                </div>
              </motion.div>
            ))}
            
            {promotions.length === 0 && (
              <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-4 border-dashed border-gray-50">
                <Gift className="w-16 h-16 text-gray-100 mx-auto mb-6" />
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Belum ada promo khusus hari ini</p>
              </div>
            )}
          </div>
        </section>

        {/* Support Section - Moved call concierge here or keep footer style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-12">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all">
            <div>
              <h5 className="font-black text-gray-900 uppercase tracking-tight mb-1">Butuh Bantuan?</h5>
              <p className="text-xs text-gray-500 italic">Hubungi customer service kami via WhatsApp</p>
            </div>
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <Phone className="w-6 h-6" />
            </div>
          </div>
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-indigo-200 transition-all">
            <div>
              <h5 className="font-black text-gray-900 uppercase tracking-tight mb-1">Lokasi Kami</h5>
              <p className="text-xs text-gray-500 italic">Buka di Maps untuk navigasi</p>
            </div>
            <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
              <MapPin className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Promotion Detail Modal */}
      <AnimatePresence>
        {selectedPromo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPromo(null)}
              className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="aspect-video bg-gray-100 relative cursor-pointer" onClick={() => setSelectedPromo(null)}>
                {selectedPromo.imageUrl ? (
                  <img 
                    src={getDirectImageUrl(selectedPromo.imageUrl)} 
                    alt={selectedPromo.title} 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (!target.src.includes('placeholder')) {
                        target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop';
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-200">
                    <ImageIcon className="w-16 h-16" />
                  </div>
                )}
                <button 
                  onClick={() => setSelectedPromo(null)}
                  className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 backdrop-blur-md text-white rounded-full transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-block px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[9px] font-black uppercase tracking-widest">
                    Exclusive Reward
                  </div>
                  {selectedPromo.discountedPrice && selectedPromo.originalPrice && (
                    <span className="text-[10px] font-black bg-red-50 text-red-600 px-3 py-1 rounded-full uppercase tracking-widest">
                      Hemat {Math.round(((selectedPromo.originalPrice - selectedPromo.discountedPrice) / selectedPromo.originalPrice) * 100)}%
                    </span>
                  )}
                </div>
                <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2 leading-tight">
                  {selectedPromo.title}
                </h3>

                {(selectedPromo.originalPrice || selectedPromo.discountedPrice) && (
                  <div className="mb-6 flex items-baseline gap-3">
                    {selectedPromo.discountedPrice ? (
                      <>
                        <span className="text-xl font-black text-indigo-600">Rp {selectedPromo.discountedPrice.toLocaleString('id-ID')}</span>
                        {selectedPromo.originalPrice && (
                          <span className="text-xs font-medium text-gray-400 line-through">Rp {selectedPromo.originalPrice.toLocaleString('id-ID')}</span>
                        )}
                      </>
                    ) : (
                      selectedPromo.originalPrice && <span className="text-xl font-black text-gray-900">Rp {selectedPromo.originalPrice.toLocaleString('id-ID')}</span>
                    )}
                  </div>
                )}
                <div className="prose prose-sm max-h-[30vh] overflow-y-auto mb-8 pr-2 custom-scrollbar">
                  <p className="text-gray-600 font-medium whitespace-pre-wrap leading-relaxed italic">
                    {selectedPromo.description}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedPromo(null)}
                  className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setZoomedImage(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl w-full max-h-[90vh] flex items-center justify-center pointer-events-none"
            >
              <img 
                src={zoomedImage} 
                alt="Zoomed Promo" 
                referrerPolicy="no-referrer"
                className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl pointer-events-auto"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop';
                }}
              />
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute -top-12 right-0 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all pointer-events-auto"
              >
                <X className="w-6 h-6" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
