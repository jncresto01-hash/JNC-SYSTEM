import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, ClipboardList, LogOut, BarChart3, UserCircle, Bell, Users, Settings as SettingsIcon, Gift, Lock, Delete, CheckCircle2, Send, Percent, ShieldCheck, Loader2 } from 'lucide-react';
import { useAuth } from '../../App';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useState, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, getDoc, getDocs, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Member } from '../../types';

export default function AdminLayout() {
  const { logout, adminData, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notification, setNotification] = useState<{ 
    message: string; 
    isBirthday?: boolean; 
    isSuccess?: boolean; 
    id?: number;
    member?: Member;
  } | null>(null);
  const [birthdayCount, setBirthdayCount] = useState(0);
  const countRef = useRef(0);
  const [pinVerified, setPinVerified] = useState(() => sessionStorage.getItem('admin_pin_verified') === 'true');
  const [requiredPin, setRequiredPin] = useState<string | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [isCheckingSecurity, setIsCheckingSecurity] = useState(true);

  useEffect(() => {
    const checkSecurity = async () => {
      if (!user?.email) {
        setIsCheckingSecurity(false);
        return;
      }
      
      try {
        const adminId = user.email.toLowerCase();
        const docSnap = await getDoc(doc(db, 'admins', adminId));
        
        if (docSnap.exists() && docSnap.data().pin) {
          const pin = String(docSnap.data().pin);
          setRequiredPin(pin);
          
          // If already verified in session storage, check if it matches the current admin
          const storedVerification = sessionStorage.getItem('admin_pin_verified') === 'true';
          const storedEmail = sessionStorage.getItem('admin_email');
          
          if (storedVerification && storedEmail === adminId) {
            setPinVerified(true);
          } else {
            setPinVerified(false);
            sessionStorage.setItem('admin_pin_verified', 'false');
            sessionStorage.setItem('admin_email', adminId);
          }
        } else {
          setRequiredPin(null);
          setPinVerified(true);
          sessionStorage.setItem('admin_pin_verified', 'true');
          sessionStorage.setItem('admin_email', adminId || '');
        }
      } catch (err) {
        console.error("Security check failed:", err);
      } finally {
        setIsCheckingSecurity(false);
      }
    };
    checkSecurity();
  }, [user]);

  useEffect(() => {
    if (requiredPin && enteredPin.length >= requiredPin.length) {
      if (enteredPin === requiredPin) {
        setPinVerified(true);
        sessionStorage.setItem('admin_pin_verified', 'true');
        setPinError(false);
      } else {
        setPinError(true);
        setTimeout(() => {
          setEnteredPin('');
          setPinError(false);
        }, 1000);
      }
    }
  }, [enteredPin, requiredPin]);

  useEffect(() => {
    if (!pinVerified) return;

    const unsubscribe = onSnapshot(collection(db, 'members'), (snapshot) => {
      try {
        const members = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        const today = new Date();
        const currentYear = today.getFullYear();
        
        const birthdayMembers = members.filter((m) => {
          const member = m as Member;
          if (!member.birthday) return false;
          
          try {
            const [y, m_str, d] = member.birthday.split('-');
            const isToday = parseInt(m_str) === (today.getMonth() + 1) && parseInt(d) === today.getDate();
            // Use Number() to ensure type safety in comparison
            const alreadyGreeted = Number(member.lastBirthdayGreetedYear) === currentYear;
            return isToday && !alreadyGreeted;
          } catch (e) {
            return false;
          }
        });
        
        const newCount = birthdayMembers.length;
        const prevCount = countRef.current;
        
        // If count decreased, someone was greeted! 
        if (newCount < prevCount && prevCount > 0) {
          setNotification({ 
            message: 'Ucapan ulang tahun berhasil dikirim! 💌', 
            isSuccess: true, 
            id: Date.now() 
          });
          
          // Clear success after 3s
          setTimeout(() => {
            setNotification(prev => {
              if (prev?.isSuccess) {
                if (newCount > 0) {
                  const firstMember = birthdayMembers[0] as Member;
                  return { 
                    message: newCount === 1 
                      ? `${firstMember.name} berulang tahun hari ini! 🎂`
                      : `Ada ${newCount} Member sedang berulang tahun hari ini! 🎂`, 
                    isBirthday: true, 
                    id: Date.now(),
                    member: newCount === 1 ? firstMember : undefined
                  };
                }
                return null;
              }
              return prev;
            });
          }, 3000);
        } else if (newCount > 0) {
          // If count increased or stayed the same (> 0), show count
          const firstMember = birthdayMembers[0] as Member;
          const newMsg = newCount === 1 
            ? `${firstMember.name} berulang tahun hari ini! 🎂`
            : `Ada ${newCount} Member sedang berulang tahun hari ini! 🎂`;
            
          setNotification(prev => {
            // Don't override a success message or a response notification
            if (prev?.isSuccess || (!prev?.isBirthday && prev?.message.includes('Survey'))) {
              return prev;
            }
            if (prev?.message !== newMsg) {
              return { 
                message: newMsg, 
                isBirthday: true, 
                id: Date.now(),
                member: newCount === 1 ? firstMember : undefined
              };
            }
            return prev;
          });
        } else if (newCount === 0) {
          // If newCount is 0, clear any birthday notification
          setNotification(prev => {
            if (prev?.isBirthday) return null;
            return prev;
          });
        }
        
        setBirthdayCount(newCount);
        countRef.current = newCount;
      } catch (err: any) {
        console.error("Birthday check error:", err);
        handleFirestoreError(err, OperationType.LIST, 'members');
      }
    });

    return () => unsubscribe();
  }, [pinVerified]);

  useEffect(() => {
    // Clear notification after 10s if it's a birthday one
    if (notification?.isBirthday) {
      const timer = setTimeout(() => setNotification(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    // Listen for new responses
    if (!pinVerified) return;
    const q = query(collection(db, 'responses'), orderBy('submittedAt', 'desc'), limit(1));
    let initialLoad = true;
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialLoad) {
        initialLoad = false;
        return;
      }
      if (!snapshot.empty) {
        setNotification({ message: 'Survey baru telah diterima! 📝', id: Date.now() });
        setTimeout(() => setNotification(null), 5000);
      }
    }, (error) => {
      console.error("Snapshot error:", error);
      handleFirestoreError(error, OperationType.LIST, 'responses');
    });

    return () => unsubscribe();
  }, [pinVerified]);

  const sendGreeting = async (member: Member) => {
    // Fetch template from settings directly for one-off check
    let currentTemplate = `Halo {name}, Selamat Ulang Tahun! 🎂\n\nKami dari JNC RESTO & POOL turut berbahagia. Sebagai apresiasi, kami memiliki penawaran khusus untuk Anda hari ini. Silakan kunjungi resto kami untuk kejutan spesial! 🥳`;
    
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'loyalty'));
      if (settingsSnap.exists() && settingsSnap.data().birthdayTemplate) {
        currentTemplate = settingsSnap.data().birthdayTemplate;
      }
    } catch (e) {
      console.error("Settings fetch error:", e);
    }

    const message = currentTemplate.includes('{name}') 
      ? currentTemplate.replace('{name}', member.name)
      : `Halo ${member.name}, ${currentTemplate}`;

    // Format phone
    const cleanPhone = member.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    
    // Open WhatsApp IMMEDIATELY
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    try {
      // Update Firestore
      await updateDoc(doc(db, 'members', member.id), {
        lastBirthdayGreetedYear: new Date().getFullYear()
      });

      // Record Activity Log
      await addDoc(collection(db, 'activityLogs'), {
        memberPhone: member.phone,
        type: 'BIRTHDAY_GREETING',
        timestamp: serverTimestamp(),
        details: `Mengirim ucapan selamat ulang tahun via WhatsApp (Notifikasi Langsung)`
      });
    } catch (err) {
      console.error("Error sending greeting:", err);
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Surveys', path: '/admin/surveys', icon: ClipboardList },
    { name: 'Customers', path: '/admin/customers', icon: Users },
    { name: 'Loyal Members', path: '/admin/members', icon: Gift, badge: birthdayCount > 0 ? birthdayCount : null },
    { name: 'Employee FOC', path: '/admin/foc', icon: ShieldCheck },
    { name: 'Promotions', path: '/admin/promotions', icon: Percent },
    { name: 'Settings', path: '/admin/settings', icon: SettingsIcon },
  ];

  if (isCheckingSecurity) {
    return (
      <div className="fixed inset-0 bg-[#F5F5F5] flex items-center justify-center font-sans z-[300]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-gray-900 animate-spin" />
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Verifying Security...</p>
        </div>
      </div>
    );
  }

  if (requiredPin && !pinVerified) {
    return (
      <div className="fixed inset-0 z-[200] bg-[#F5F5F5] flex items-center justify-center font-sans">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-sm p-8 flex flex-col items-center"
        >
          <div className="w-20 h-20 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-10 border border-gray-100">
            <Lock className="w-10 h-10 text-red-500" />
          </div>

          <div className="text-center mb-12">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Admin Verification</h2>
            <p className="text-gray-500 text-sm font-medium mt-2">Enter your security PIN to continue</p>
          </div>

          <div className="flex gap-4 mb-12">
            {Array.from({ length: requiredPin.length }).map((_, i) => (
              <div 
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-300 ${
                  i < enteredPin.length 
                    ? 'bg-gray-900 scale-125' 
                    : pinError ? 'bg-red-500 animate-shake' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>

          <div className="grid grid-cols-3 gap-4 w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <motion.button
                key={num}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (requiredPin && enteredPin.length < requiredPin.length) {
                    setEnteredPin(prev => prev + String(num));
                  }
                }}
                className="h-16 bg-white rounded-2xl shadow-sm border border-gray-100 text-xl font-bold text-gray-900 hover:bg-gray-50 transition-all outline-none active:bg-gray-100 flex items-center justify-center p-0"
              >
                {num}
              </motion.button>
            ))}
            <div />
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (requiredPin && enteredPin.length < requiredPin.length) {
                  setEnteredPin(prev => prev + '0');
                }
              }}
              className="h-16 bg-white rounded-2xl shadow-sm border border-gray-100 text-xl font-bold text-gray-900 hover:bg-gray-50 transition-all outline-none flex items-center justify-center p-0"
            >
              0
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setEnteredPin(prev => prev.slice(0, -1))}
              className="h-16 bg-transparent rounded-2xl flex items-center justify-center text-gray-400 hover:text-red-500 transition-colors outline-none p-0"
            >
              <Delete className="w-6 h-6" />
            </motion.button>
          </div>

          <button 
            onClick={logout}
            className="mt-12 text-sm font-black text-gray-400 uppercase tracking-widest hover:text-red-500 transition-colors"
          >
            Logout
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#F5F5F5] font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6">
          <div className="mb-10 px-1">
            <span className="font-black text-xl tracking-tighter text-gray-900 block leading-tight">JNC RESTO & POOL</span>
          </div>
          
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-4 py-2.5 rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-blue-50 text-blue-600 font-medium shadow-sm' 
                      : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </div>
                  {(item as any).badge && (
                    <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full inline-flex items-center justify-center min-w-[18px]">
                      {(item as any).badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-6 px-4">
            <UserCircle className="w-8 h-8 text-gray-400" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-semibold text-gray-900 truncate">Admin</span>
              <span className="text-xs text-gray-500 truncate">{adminData?.email}</span>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition-colors font-medium"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <AnimatePresence>
          {notification && (
            <motion.div
              key={notification.id || notification.message}
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 20, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className={`fixed top-4 left-1/2 z-[100] px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3 border backdrop-blur-md ${
                notification.isSuccess
                  ? 'bg-emerald-600 border-emerald-400 text-white'
                  : notification.isBirthday 
                  ? 'bg-pink-600 border-pink-400 text-white' 
                  : 'bg-gray-900 border-white/10 text-white'
              }`}
            >
              {notification.isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-white" />
              ) : (
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  notification.isBirthday ? 'bg-white' : 'bg-blue-500'
                }`} />
              )}
              <span className="text-sm font-bold tracking-tight">{notification.message}</span>
              
              {notification.isBirthday && (
                notification.member ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      sendGreeting(notification.member!);
                    }}
                    className="ml-2 px-3 py-1 bg-white text-pink-600 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-pink-50 transition-colors shadow-sm"
                  >
                    <Send className="w-3 h-3" />
                    Send Birthday Wish
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate('/admin/members');
                    }}
                    className="ml-2 px-3 py-1 bg-white text-pink-600 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 hover:bg-pink-50 transition-colors shadow-sm"
                  >
                    Lihat Semua
                  </button>
                )
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-8 max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <Outlet />
          </motion.div>
        </div>
      </main>
    </div>
  );
}
