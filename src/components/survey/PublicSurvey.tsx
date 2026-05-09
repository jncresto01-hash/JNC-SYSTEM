import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp, setDoc, updateDoc, increment, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Survey } from '../../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, ArrowRight, Star, Send, User, Phone } from 'lucide-react';

export default function PublicSurvey() {
  const { surveyId } = useParams();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [suggestions, setSuggestions] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchSurvey = async () => {
      if (!surveyId) return;
      
      let ref;
      if (surveyId === 'latest') {
        const q = query(
          collection(db, 'surveys'),
          where('active', '==', true),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const data = snap.docs[0].data();
          setSurvey({ id: snap.docs[0].id, ...data } as Survey);
        } else {
          setError('No active surveys found.');
        }
      } else {
        ref = doc(db, 'surveys', surveyId);
        const snap = await getDoc(ref);
        if (snap.exists() && snap.data().active) {
          setSurvey({ id: snap.id, ...snap.data() } as Survey);
        } else {
          setError('Survey not found or inactive.');
        }
      }
      setLoading(false);
    };
    fetchSurvey();
  }, [surveyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!survey) return;

    // Validation
    if (!customerName.trim()) {
      alert('Mohon isi nama lengkap Anda.');
      return;
    }

    if (!customerPhone.trim() || !/^\d+$/.test(customerPhone)) {
      alert('Mohon isi nomor HP dengan angka saja.');
      return;
    }

    const missing = survey.indicators.find(ind => ind.required && !answers[ind.id]);
    if (missing) {
      alert(`Mohon isi semua kolom penilaian yang wajib diisi.`);
      return;
    }

    setLoading(true);
    try {
      const sanitizedPhone = customerPhone.trim().replace(/[^0-9]/g, '');
      
      // 1. Save response
      await addDoc(collection(db, 'responses'), {
        surveyId,
        customerName: customerName.trim(),
        customerPhone: sanitizedPhone,
        answers,
        suggestions: suggestions.trim(),
        submittedAt: serverTimestamp(),
        metadata: {
          userAgent: navigator.userAgent,
          device: /Mobile|Android|iPhone/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop',
          browser: navigator.vendor || 'Unknown'
        }
      });

      // 2. Upsert customer profile
      const customerRef = doc(db, 'customers', sanitizedPhone);
      const customerSnap = await getDoc(customerRef);

      if (customerSnap.exists()) {
        await updateDoc(customerRef, {
          name: customerName.trim(),
          lastSeen: serverTimestamp(),
          totalSurveys: increment(1)
        });
      } else {
        await setDoc(customerRef, {
          name: customerName.trim(),
          phone: sanitizedPhone,
          lastSeen: serverTimestamp(),
          totalSurveys: 1,
          isMember: false
        });
      }

      // 3. Record Activity Log
      await addDoc(collection(db, 'activityLogs'), {
        memberPhone: sanitizedPhone,
        type: 'SURVEY_SUBMISSION',
        timestamp: serverTimestamp(),
        details: `Mengisi survey: ${survey.title}`,
        surveyId: surveyId
      });

      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan saat mengirim survey. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const updateAnswer = (id: string, val: string | number) => {
    setAnswers({ ...answers, [id]: val });
  };

  if (loading && !submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="text-red-500 text-6xl mb-4 font-bold">!</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Unavailable</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-[3.5rem] p-12 shadow-2xl shadow-blue-50/50 border border-gray-100 flex flex-col items-center"
        >
          <div className="w-24 h-24 bg-green-50 rounded-[2rem] flex items-center justify-center mb-10 relative">
            <div className="absolute inset-0 bg-green-500 rounded-[2rem] opacity-20 animate-ping" />
            <CheckCircle className="w-12 h-12 text-green-500 relative z-10" />
          </div>
          <h2 className="text-4xl font-black text-gray-900 mb-6 tracking-tight">Sukses!</h2>
          <p className="text-gray-600 leading-relaxed font-semibold text-lg mb-4">
            Terima Kasih, {customerName}!
          </p>
          <p className="text-gray-500 leading-relaxed font-medium">
            Masukan Anda telah kami terima dengan selamat. Feedback dari pelanggan seperti Anda membantu kami untuk terus berkembang.
          </p>
          
          <div className="w-full h-px bg-gray-100 my-10" />

          <div className="w-full flex flex-col gap-3">
            <button 
              onClick={() => window.location.reload()} 
              className="w-full px-8 py-5 bg-gray-900 text-white rounded-2xl font-bold text-sm hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-xl active:scale-[0.98]"
            >
              Isi Lagi <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2">
              Terima kasih atas partisipasinya
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const ratingOptions = [
    { label: 'Sangat Baik', val: 5 },
    { label: 'Baik', val: 3 },
    { label: 'Buruk', val: 1 }
  ];

  return (
    <div className="bg-[#F9FAFB] pt-32 pb-20 px-4 sm:px-6 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="mb-12 text-center">
          <div className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest mb-6 border border-blue-100 shadow-sm">
            Customer Satisfaction Survey
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-4">
            {survey?.title}
          </h1>
          <p className="text-lg text-gray-500 max-w-xl mx-auto leading-relaxed font-medium opacity-80">
            {survey?.description || 'Bantu kami meningkatkan layanan dengan memberikan penilaian Anda.'}
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden"
          >
            {/* Header Columns for Ratings - PC Only Desktop */}
            <div className="hidden sm:flex items-center bg-gray-50/50 border-b border-gray-100 px-8 py-4">
              <div className="flex-1 text-[11px] font-black text-gray-400 uppercase tracking-widest">Penilaian Indikator</div>
              <div className="flex gap-4">
                {ratingOptions.map(opt => (
                  <div key={opt.val} className="w-20 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    {opt.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-50">
              {survey?.indicators.filter(ind => ind.type === 'rating').map((indicator, idx) => (
                <div 
                  key={indicator.id}
                  className="px-8 py-6 sm:py-8 flex flex-col sm:flex-row sm:items-center gap-6"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-gray-300 w-5">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <label className="text-base font-bold text-gray-900 leading-tight">
                        {indicator.label}
                        {indicator.required && <span className="text-red-400 ml-1 italic font-medium text-xs">*</span>}
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-between sm:justify-start gap-4 sm:gap-4 px-2 sm:px-0">
                    {ratingOptions.map((opt) => {
                      const isSelected = answers[indicator.id] === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => updateAnswer(indicator.id, opt.val)}
                          className="flex flex-col items-center gap-2 group w-20 sm:w-20"
                        >
                          <div className={`
                            w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-300
                            ${isSelected 
                              ? 'border-gray-900 bg-white ring-4 ring-gray-50' 
                              : 'border-gray-100 bg-gray-50 group-hover:border-gray-300'}
                          `}>
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="w-3.5 h-3.5 rounded-full bg-gray-900 shadow-sm"
                                />
                              )}
                            </AnimatePresence>
                          </div>
                          <span className={`sm:hidden text-[9px] font-black uppercase tracking-widest transition-colors ${isSelected ? 'text-gray-900' : 'text-gray-400'}`}>
                            {opt.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Render Other Questions (Text) */}
            {survey?.indicators.filter(ind => ind.type !== 'rating').length > 0 && (
              <div className="p-8 space-y-6 bg-gray-50/30 border-t border-gray-100">
                {survey?.indicators.filter(ind => ind.type !== 'rating').map((indicator) => (
                  <div key={indicator.id} className="space-y-3">
                    <label className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                       {indicator.label}
                       {indicator.required && <span className="text-red-400 font-medium text-[10px]">* WAJIB</span>}
                    </label>
                    <textarea
                      placeholder="Ketik jawaban Anda di sini..."
                      value={answers[indicator.id] as string || ''}
                      onChange={(e) => updateAnswer(indicator.id, e.target.value)}
                      className="w-full min-h-[100px] bg-white border border-gray-100 rounded-3xl p-5 focus:border-blue-500 outline-none transition-all text-gray-700 resize-none font-medium text-sm"
                    />
                  </div>
                ))}
              </div>
            )}
          </motion.div>

          {/* Customer Info Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-gray-100/50 space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-green-50 rounded-2xl">
                <User className="w-5 h-5 text-green-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">Data Diri</h3>
                <p className="text-sm text-gray-500 font-medium opacity-80 leading-relaxed">
                  Isi data diri Anda agar kami dapat menghubungi Anda kembali untuk masukan yang diberikan.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nama Lengkap</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="text"
                    required
                    placeholder="Masukkan nama Anda"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nomor WhatsApp / HP</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type="tel"
                    required
                    placeholder="Contoh: 08123456xxx"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full pl-12 pr-6 py-4 bg-gray-50 border border-gray-100 rounded-3xl focus:bg-white focus:border-blue-500 outline-none transition-all font-medium text-gray-900"
                  />
                </div>
              </div>
            </div>
          </motion.div>

          {/* Suggestions Field */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-sm border border-gray-100/50 space-y-6"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 bg-blue-50 rounded-2xl">
                <Star className="w-5 h-5 text-blue-600" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold text-gray-900">Saran & Masukan</h3>
                <p className="text-sm text-gray-500 font-medium opacity-80 leading-relaxed">
                  Punya kritik atau saran lain untuk kami? Tuliskan di sini untuk membantu kami menjadi lebih baik.
                </p>
              </div>
            </div>

            <textarea
              placeholder="Tuliskan saran atau masukan Anda di sini..."
              value={suggestions}
              onChange={(e) => setSuggestions(e.target.value)}
              className="w-full min-h-[140px] bg-gray-50 rounded-3xl p-6 border border-gray-100 focus:bg-white focus:border-blue-500 outline-none transition-all text-gray-700 resize-none leading-relaxed font-medium"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-10 flex flex-col items-center gap-6"
          >
            <button
              disabled={loading}
              className="group relative w-full sm:w-[320px] h-16 bg-gray-900 text-white rounded-[2rem] font-bold text-lg flex items-center justify-center gap-3 overflow-hidden shadow-2xl transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-600/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-5 h-5 text-blue-400 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  Kirim Feedback
                </>
              )}
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-100/50 rounded-full">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">
                Koneksi Aman & Terlindungi
              </p>
            </div>
          </motion.div>
        </form>
      </div>
    </div>
  );
}

function Lock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
      <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
    </svg>
  );
}
