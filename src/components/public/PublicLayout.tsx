import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Instagram, Phone } from 'lucide-react';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export default function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();
  const isLanding = location.pathname === '/';

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors">
              <span className="text-white font-black text-xl">J</span>
            </div>
            <span className="text-xl font-black tracking-tighter uppercase">JNC Resto & Pool</span>
          </Link>
                    <div className="hidden md:flex items-center gap-8">
            <Link to="/member" className={`text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/member' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Portal Member</Link>
            <Link to="/register" className={`text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname === '/register' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Gabung Member</Link>
            <Link to="/survey/latest" className={`text-[10px] font-black uppercase tracking-widest transition-colors ${location.pathname.startsWith('/survey') ? 'text-blue-600' : 'text-gray-500 hover:text-gray-900'}`}>Saran & Feedback</Link>
            <Link to="/register" className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-lg ${location.pathname === '/register' ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-gray-900 text-white hover:bg-blue-600 shadow-gray-200'}`}>Daftar Sekarang</Link>
          </div>

          <div className="md:hidden flex items-center gap-2">
             <Link to="/survey/latest" className="p-2 bg-gray-50 text-gray-900 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest">Saran</span>
             </Link>
             <Link to="/member" className="p-2 bg-gray-50 text-gray-900 rounded-xl border border-gray-100">
                <span className="text-[10px] font-black uppercase tracking-widest">Portal</span>
             </Link>
             <Link to="/register" className="p-2 bg-gray-900 text-white rounded-xl shadow-lg">
                <span className="text-[10px] font-black uppercase tracking-widest">Daftar</span>
             </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main>
        {children}
      </main>

      {/* Footer */}
      <footer className="pt-20 pb-10 px-6 border-t border-gray-100">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2 space-y-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-900 rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-sm">J</span>
              </div>
              <span className="text-lg font-black tracking-tighter uppercase">JNC Resto & Pool</span>
            </div>
            <p className="text-sm text-gray-500 font-medium max-w-xs leading-relaxed">
              Pusat kuliner dan area biliard premium terbaik di Probolinggo. Kualitas rasa dan kenyamanan adalah prioritas kami.
            </p>
            <div className="flex items-center gap-4 pt-4">
              <a href="https://www.instagram.com/jncpool_/" target="_blank" rel="noreferrer" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all shadow-sm"><Instagram className="w-5 h-5" /></a>
              <a href="https://wa.me/6282233240024" target="_blank" rel="noreferrer" className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 hover:text-green-600 hover:bg-green-50 transition-all shadow-sm"><Phone className="w-5 h-5" /></a>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Layanan</h4>
            <div className="flex flex-col gap-3 font-bold text-gray-500 text-xs">
              <Link to="/register" className="hover:text-blue-600 uppercase tracking-widest transition-colors">Daftar Member</Link>
              <Link to="/member" className="hover:text-blue-600 uppercase tracking-widest transition-colors">Portal Dashboard</Link>
              <Link to="/survey/latest" className="hover:text-blue-600 uppercase tracking-widest transition-colors">Saran & Feedback</Link>
              <Link to="/login" className="hover:text-blue-600 uppercase tracking-widest transition-colors opacity-50 hover:opacity-100">Admin Portal</Link>
            </div>
          </div>

          <div className="space-y-6">
            <h4 className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Kontak Kami</h4>
            <div className="flex flex-col gap-3 font-bold text-gray-500 text-xs leading-relaxed uppercase tracking-widest">
              <p>📍 Jl. Hayam Wuruk No. 09, Kec. Mayangan Kota Probolinggo</p>
              <div className="space-y-1">
                <p>⌛ Senin-Kamis: 11.00 - 01.00 WIB</p>
                <p>⌛ Jumat-Minggu: 11.00 - 02.00 WIB</p>
              </div>
              <p>📞 +62 822-3324-0024</p>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-10 border-t border-gray-50 flex flex-col md:row items-center justify-between gap-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">
          <p>© 2024 JNC Resto & Pool. All Rights Reserved.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-gray-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-gray-900 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
