import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { 
  Users, Ticket, ClipboardCheck, 
  ArrowRight, Utensils, Target, 
  Star, ShieldCheck, Sparkles,
  ChevronRight, Instagram, Phone,
  Image as ImageIcon
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Promotion } from '../../types';

export default function LandingPage() {
  const [promos, setPromos] = useState<Promotion[]>([]);

  useEffect(() => {
    const fetchPromos = async () => {
      const q = query(
        collection(db, 'promotions'), 
        where('active', '==', true),
        orderBy('createdAt', 'desc'),
        limit(3)
      );
      const snap = await getDocs(q);
      setPromos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Promotion)));
    };
    fetchPromos();
  }, []);

  return (
    <div className="bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-blue-50/50 to-transparent -z-10 blur-3xl opacity-50" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-indigo-50/50 rounded-full -z-10 blur-3xl opacity-50" />

        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="space-y-8"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full border border-blue-100/50">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Eksklusivitas dalam Genggaman</span>
            </div>

            <h1 className="text-7xl md:text-8xl font-black text-gray-900 tracking-tighter leading-[0.85] uppercase">
              Bukan Sekadar <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Restoran.</span>
            </h1>

            <p className="text-xl text-gray-500 font-medium max-w-lg leading-relaxed">
              Nikmati perpaduan sempurna antara kuliner autentik dan suasana area biliard yang premium. Bergabunglah dengan keanggotaan eksklusif kami untuk pengalaman tak terlupakan.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link 
                to="/register" 
                className="group flex items-center justify-center gap-3 px-8 py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-2xl shadow-gray-200"
              >
                Daftar Member Loyal <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/member" 
                className="flex items-center justify-center gap-3 px-8 py-5 bg-white text-gray-900 border border-gray-100 rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-gray-50 transition-all shadow-xl shadow-gray-100"
              >
                Akses Portal Saya
              </Link>
            </div>

            <div className="flex items-center gap-8 pt-8">
              <div className="space-y-1">
                <div className="text-2xl font-black text-gray-900 uppercase tracking-tighter">5K+</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Members</div>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="space-y-1">
                <div className="text-2xl font-black text-gray-900 uppercase tracking-tighter">4.8</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Google Rating</div>
              </div>
              <div className="w-px h-10 bg-gray-100" />
              <div className="space-y-1">
                <div className="text-2xl font-black text-gray-900 uppercase tracking-tighter">12+</div>
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Years of Service</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="relative"
          >
            {/* Visual Elements */}
            <div className="relative aspect-[4/5] bg-gray-900 rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-indigo-600/20" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-white flex flex-col items-center gap-4 animate-pulse">
                  <Utensils className="w-16 h-16 opacity-20" />
                  <div className="w-24 h-px bg-white/20" />
                  <Target className="w-16 h-16 opacity-20" />
                </div>
              </div>

              {/* Float Cards */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-12 left-12 bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-2xl shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                    <Star className="w-5 h-5 text-indigo-600 fill-indigo-600" />
                  </div>
                  <div>
                    <div className="text-[8px] font-black text-white/60 uppercase tracking-widest mb-0.5">Rating</div>
                    <div className="text-sm font-black text-white uppercase tabular-nums">High Quality</div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute bottom-12 right-12 bg-white p-6 rounded-3xl shadow-2xl border border-gray-100"
              >
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Member Status</div>
                      <div className="text-sm font-black text-gray-900 uppercase">Verified JNC</div>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="w-3/4 h-full bg-blue-600" />
                  </div>
                </div>
              </motion.div>
            </div>
            
            {/* Background elements */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl -z-10" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 rounded-full blur-3xl -z-10" />
          </motion.div>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Fasilitas Utama</h2>
            <p className="text-gray-500 font-medium max-w-sm mx-auto uppercase text-[10px] tracking-widest">Designed for your comfort and joy</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { 
                icon: Utensils, 
                title: "Fine Dining", 
                desc: "Koleksi menu Nusantara dan Internasional hasil karya chef berpengalaman.",
                color: "bg-blue-600"
              },
              { 
                icon: Target, 
                title: "Billiard Lounge", 
                desc: "Area biliard dengan meja standar internasional untuk relaksasi dan kompetisi.",
                color: "bg-indigo-600"
              },
              { 
                icon: Star, 
                title: "Events Venue", 
                desc: "Area terbuka yang luas untuk pesta ulang tahun, gathering, atau pernikahan.",
                color: "bg-gray-900"
              }
            ].map((item, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -5 }}
                className="p-10 bg-gray-50 rounded-[2.5rem] border border-gray-100 space-y-6 hover:bg-white hover:shadow-2xl hover:shadow-gray-200 transition-all group"
              >
                <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 shadow-lg`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">{item.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed font-medium">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Dynamic Promotion Section */}
      {promos.length > 0 && (
        <section className="py-20 px-6 bg-gray-50">
          <div className="max-w-7xl mx-auto space-y-16">
            <div className="flex flex-col md:row md:items-end justify-between gap-8 text-center md:text-left">
              <div className="space-y-4">
                <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Promo Terkini</h2>
                <p className="text-gray-500 font-medium max-w-sm uppercase text-[10px] tracking-widest">Exclusive offers for our loyal members</p>
              </div>
              <Link to="/register" className="text-sm font-black text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center gap-2 uppercase tracking-[0.2em]">
                Lihat Semua Promo <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {promos.map((promo) => (
                <motion.div
                  key={promo.id}
                  whileHover={{ y: -5 }}
                  className="bg-white rounded-[2.5rem] overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all group"
                >
                  <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                    {promo.imageUrl ? (
                      <img 
                        src={promo.imageUrl} 
                        alt={promo.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=800&auto=format&fit=crop';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <ImageIcon className="w-12 h-12" />
                      </div>
                    )}
                    {promo.originalPrice && promo.discountedPrice && (
                      <div className="absolute top-6 left-6 px-4 py-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg ring-4 ring-white/20">
                        Save {Math.round(((promo.originalPrice - promo.discountedPrice) / promo.originalPrice) * 100)}%
                      </div>
                    )}
                  </div>
                  <div className="p-8 space-y-4 text-center">
                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight line-clamp-1">{promo.title}</h3>
                    <p className="text-sm text-gray-500 font-medium line-clamp-2 italic leading-relaxed">{promo.description}</p>
                    <div className="pt-4 flex flex-col items-center">
                      {promo.discountedPrice ? (
                        <>
                          <div className="text-sm font-bold text-gray-400 line-through mb-1">Rp {promo.originalPrice?.toLocaleString('id-ID')}</div>
                          <div className="text-2xl font-black text-indigo-600">Rp {promo.discountedPrice.toLocaleString('id-ID')}</div>
                        </>
                      ) : (
                        promo.originalPrice && <div className="text-2xl font-black text-gray-900">Rp {promo.originalPrice.toLocaleString('id-ID')}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Membership Banner */}
      <section className="py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-gray-900 rounded-[4rem] overflow-hidden p-12 md:p-20 text-center space-y-8">
            <div className="absolute inset-0 bg-blue-600/10 skew-y-12 translate-y-32" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
            
            <div className="relative space-y-4">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Special Invitation</span>
              <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9]">
                Bergabunglah dengan <br />
                Keluarga Besar Kami
              </h2>
              <p className="text-white/50 font-medium max-w-xl mx-auto leading-relaxed">
                Dapatkan kartu member digital eksklusif, diskon spesial 15% setiap transaksi, dan akses prioritas ke seluruh fasilitas JNC Resto & Pool.
              </p>
            </div>

            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-6">
              <Link 
                to="/register"
                className="w-full sm:w-auto px-12 py-5 bg-white text-gray-900 rounded-full font-black uppercase tracking-widest text-xs hover:bg-blue-50 transition-all shadow-xl"
              >
                Daftar Member Sekarang
              </Link>
              <div className="flex items-center gap-4 text-white/40">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-10 h-10 rounded-full border-2 border-gray-900 bg-gray-800 flex items-center justify-center text-[10px] font-black text-white/40">
                      U{i}
                    </div>
                  ))}
                  <div className="w-10 h-10 rounded-full border-2 border-gray-900 bg-blue-600 flex items-center justify-center text-[10px] font-black text-white">
                    +1k
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest">Join 1,200+ users this month</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
