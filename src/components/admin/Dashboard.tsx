import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, limit, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Survey, Response, Member, ActivityLog } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area, Cell, PieChart, Pie
} from 'recharts';
import { 
  TrendingUp, Users, ClipboardCheck, ArrowUpRight, 
  ArrowDownRight, Star, Clock, Filter, CheckCircle,
  Gift, Cake, User, Send, Shield
} from 'lucide-react';
import { format, subDays, startOfDay, isToday, parseISO } from 'date-fns';

import { motion, AnimatePresence } from 'motion/react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [recentResponses, setRecentResponses] = useState<Response[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [birthdayMembers, setBirthdayMembers] = useState<Member[]>([]);
  const [greetingTemplate, setGreetingTemplate] = useState('Selamat ulang tahun {name} dari JNC RESTO & POOL! 🎂🎉 Kami punya kejutan spesial untuk Anda hari ini!');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalSurveys: 0,
    totalResponses: 0,
    avgScore: 0,
    completionRate: 0,
    totalMembers: 0,
    totalFOC: 0
  });
  const [trendData, setTrendData] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<any[]>([]);
  const [complaintsData, setComplaintsData] = useState<any[]>([]);
  const [surveyBreakdown, setSurveyBreakdown] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
    
    // Real-time listener for birthdays
    const unsubscribeBirthdays = onSnapshot(collection(db, 'members'), (snapshot) => {
      const today = new Date();
      const currentYear = today.getFullYear();
      
      const filtered = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as Member))
        .filter(m => {
          if (!m.birthday) return false;
          try {
            const [y, m_str, d] = m.birthday.split('-');
            const isToday = parseInt(m_str) === (today.getMonth() + 1) && parseInt(d) === today.getDate();
            return isToday && Number(m.lastBirthdayGreetedYear) !== currentYear;
          } catch (e) {
            return false;
          }
        });
      
      setBirthdayMembers(filtered);
    }, (err) => {
      console.error("Birthday listener error:", err);
      handleFirestoreError(err, OperationType.LIST, 'members');
    });

    // Real-time listener for settings
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'loyalty'), (snapshot) => {
      if (snapshot.exists() && snapshot.data().birthdayTemplate) {
        setGreetingTemplate(snapshot.data().birthdayTemplate);
      }
    }, (err) => {
      console.error("Settings listener error:", err);
      handleFirestoreError(err, OperationType.GET, 'settings/loyalty');
    });

    return () => {
      unsubscribeBirthdays();
      unsubscribeSettings();
    };
  }, []);

  const sendGreeting = async (member: Member) => {
    // Determine the message
    const message = greetingTemplate.includes('{name}') 
      ? greetingTemplate.replace('{name}', member.name)
      : `Halo ${member.name}, ${greetingTemplate}`;

    // Format phone
    const cleanPhone = member.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    
    // Open WhatsApp IMMEDIATELY to avoid popup blockers triggered by async delays
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');

    // Optimistic update: remove from local list immediately
    setBirthdayMembers(prev => prev.filter(m => m.id !== member.id));

    try {
      // 1. Update Firestore to mark as greeted this year
      await updateDoc(doc(db, 'members', member.id), {
        lastBirthdayGreetedYear: new Date().getFullYear()
      });

      // 2. Record Activity Log
      await addDoc(collection(db, 'activityLogs'), {
        memberPhone: member.phone,
        type: 'BIRTHDAY_GREETING',
        timestamp: serverTimestamp(),
        details: `Mengirim ucapan selamat ulang tahun via WhatsApp`
      });
    } catch (err) {
      console.error("Error updating greeting status:", err);
      handleFirestoreError(err, OperationType.WRITE, 'members/activityLogs');
    }
  };

  const fetchDashboardData = async () => {
    try {
      const surveyorsSnap = await getDocs(collection(db, 'surveys'));
      const surveysList = surveyorsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Survey));
      setSurveys(surveysList);

      const responsesSnap = await getDocs(
        query(collection(db, 'responses'), orderBy('submittedAt', 'desc'), limit(10))
      );
      const responsesList = responsesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Response));
      setRecentResponses(responsesList);

      const logsSnap = await getDocs(
        query(collection(db, 'activityLogs'), orderBy('timestamp', 'desc'), limit(20))
      );
      setActivityLogs(logsSnap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLog)));

      // Calculate basic stats
      const allResponsesSnap = await getDocs(collection(db, 'responses'));
      const allResponses = allResponsesSnap.docs.map(d => d.data() as Response);
      
      // Member stats
      const membersSnap = await getDocs(collection(db, 'members'));
      const membersList = membersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Member));

      // FOC stats
      const focSnap = await getDocs(collection(db, 'employeeFOC'));
      const focCount = focSnap.size;

      // Fetch template
      const settingsSnap = await getDocs(query(collection(db, 'settings')));
      const loyaltySettings = settingsSnap.docs.find(d => d.id === 'loyalty');
      if (loyaltySettings && loyaltySettings.data().birthdayTemplate) {
        setGreetingTemplate(loyaltySettings.data().birthdayTemplate);
      }
      
      let totalScore = 0;
      let scoreCount = 0;
      let totalPossibleAnswers = 0;
      let totalProvidedAnswers = 0;

      const surveyMap = new Map(surveysList.map(s => [s.id, s]));

      allResponses.forEach(r => {
        const survey = surveyMap.get(r.surveyId);
        if (survey) {
          totalPossibleAnswers += survey.indicators.length;
          totalProvidedAnswers += Object.entries(r.answers).filter(([_, val]) => val !== '').length;
        }

        Object.values(r.answers).forEach(val => {
          if (typeof val === 'number') {
            totalScore += val;
            scoreCount++;
          }
        });
      });

      setStats({
        totalSurveys: surveysList.length,
        totalResponses: allResponses.length,
        avgScore: scoreCount > 0 ? Number((totalScore / scoreCount).toFixed(1)) : 0,
        completionRate: totalPossibleAnswers > 0 
          ? Number(((totalProvidedAnswers / totalPossibleAnswers) * 100).toFixed(1))
          : 0,
        totalMembers: membersList.length,
        totalFOC: focCount
      });

      // Generate trend data for last 7 days
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const date = subDays(new Date(), 6 - i);
        const responsesCount = allResponses.filter(r => {
          const subDate = new Date(r.submittedAt?.seconds * 1000 || Date.now());
          return format(subDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
        }).length;
        return {
          date: format(date, 'MMM dd'),
          responses: responsesCount
        };
      });
      setTrendData(last7Days);

      // Advanced Data Processing
      const indicatorStats: Record<string, { total: number, count: number, label: string, lowCount: number, vGood: number, good: number, bad: number }> = {};
      const breakdowns: any[] = [];

      surveysList.forEach(survey => {
        const surveyResponses = allResponses.filter(r => r.surveyId === survey.id);
        const surveyIndicators: any[] = [];

        survey.indicators.filter(ind => ind.type === 'rating').forEach(indicator => {
          let vGood = 0, good = 0, bad = 0;
          let total = 0, count = 0, lowCount = 0;

          surveyResponses.forEach(res => {
            const val = res.answers[indicator.id];
            if (typeof val === 'number') {
              total += val;
              count++;
              if (val <= 2) lowCount++;
              
              if (val === 5) vGood++;
              else if (val === 4) good++;
              else if (val <= 3) bad++;
            }
          });

          if (count > 0) {
            const avg = Number((total / count).toFixed(1));
            surveyIndicators.push({
              label: indicator.label,
              vGood,
              good,
              bad,
              avg
            });

            // Aggregate for global charts
            if (!indicatorStats[indicator.label]) {
              indicatorStats[indicator.label] = { total: 0, count: 0, label: indicator.label, lowCount: 0, vGood: 0, good: 0, bad: 0 };
            }
            indicatorStats[indicator.label].total += total;
            indicatorStats[indicator.label].count += count;
            indicatorStats[indicator.label].lowCount += lowCount;
            indicatorStats[indicator.label].vGood += vGood;
            indicatorStats[indicator.label].good += good;
            indicatorStats[indicator.label].bad += bad;
          }
        });

        if (surveyIndicators.length > 0) {
          breakdowns.push({
            title: survey.title,
            indicators: surveyIndicators
          });
        }
      });

      setSurveyBreakdown(breakdowns);

      const perfArray = Object.values(indicatorStats)
        .map(s => ({ category: s.label, score: Number((s.total / s.count).toFixed(1)) }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
      
      const complaintArray = Object.values(indicatorStats)
        .map(s => ({ category: s.label, count: s.lowCount }))
        .filter(s => s.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setPerformanceData(perfArray);
      setComplaintsData(complaintArray);
    } catch (err: any) {
      console.error("Dashboard data fetch error:", err);
      setErrorStatus(err.message || String(err));
      // Standardize the error for the system
      handleFirestoreError(err, OperationType.LIST, 'dashboard_data');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Performance Overview</h2>
          <p className="text-gray-500 mt-1">Real-time metrics for your customer surveys.</p>
        </div>
        
        {birthdayMembers.length > 0 && (
          <div className="flex items-center gap-3 bg-pink-50 border border-pink-100 px-4 py-2 rounded-2xl animate-pulse">
            <Cake className="w-5 h-5 text-pink-600" />
            <div>
              <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Birthday Alert</p>
              <p className="text-xs font-bold text-pink-700">{birthdayMembers.length} Members are having birthday today!</p>
            </div>
          </div>
        )}
      </div>

      {/* Birthday Celebration Section (Prominent) */}
      {birthdayMembers.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-pink-500 via-purple-600 to-pink-500 bg-[length:200%_auto] animate-gradient-x p-8 rounded-[3rem] shadow-xl shadow-pink-100 text-white relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mr-10 -mt-10 opacity-10">
            <Cake className="w-64 h-64" />
          </div>
          
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                <Gift className="w-3 h-3" />
                Celebration Today
              </div>
              <h3 className="text-4xl font-black tracking-tighter leading-none italic">IT'S BIRTHDAY TIME!</h3>
              <p className="text-pink-100 font-medium">Ada {birthdayMembers.length} member loyalitas yang berulang tahun hari ini.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-4">
              <AnimatePresence>
                {birthdayMembers.map((member) => (
                  <motion.div 
                    key={member.id} 
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8, x: -20 }}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    className="bg-white/10 backdrop-blur-xl border border-white/20 p-4 rounded-3xl flex items-center gap-4 shadow-lg pr-6"
                  >
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-pink-600 font-black text-xl shadow-md">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight text-white">{member.name.toUpperCase()}</p>
                      <button
                        onClick={() => sendGreeting(member)}
                        className="mt-2 flex items-center gap-1.5 px-3 py-1.5 bg-white text-pink-600 rounded-full text-[10px] font-black uppercase tracking-wider hover:bg-pink-50 active:scale-95 transition-all shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        Send Birthday Wish
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <StatCard 
          label="Total Surveys" 
          value={stats.totalSurveys} 
          icon={ClipboardCheck} 
          trend="+2 this month" 
          trendUp={true}
        />
        <StatCard 
          label="Admin Responses" 
          value={stats.totalResponses} 
          icon={Users} 
          trend="+12% from last week" 
          trendUp={true}
        />
        <StatCard 
          label="Avg. CSAT Score" 
          value={stats.avgScore} 
          icon={Star} 
          trend="+0.2 change" 
          trendUp={true}
        />
        <StatCard 
          label="Loyal Members" 
          value={stats.totalMembers} 
          icon={Gift} 
          trend="Total joined" 
          trendUp={true}
        />
        <StatCard 
          label="Employee FOC" 
          value={stats.totalFOC} 
          icon={Shield} 
          trend="Staff facilities" 
          trendUp={true}
        />
        <StatCard 
          label="Completion" 
          value={`${stats.completionRate}%`} 
          icon={CheckCircle} 
          trend={stats.completionRate >= 90 ? "High" : "Mid"} 
          trendUp={stats.completionRate >= 90}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Performance & Complaints Charts */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Indikator Performa Terbaik</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performanceData} layout="vertical" margin={{ left: 40, right: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                <XAxis type="number" domain={[0, 5]} hide />
                <YAxis 
                  dataKey="category" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  width={100}
                  tick={{ fontSize: 10, fontStyle: 'bold', fill: '#4B5563' }}
                />
                <Tooltip 
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={20}>
                  {performanceData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10B981' : '#34D399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4 text-red-600" />
            </div>
            <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Kategori Keluhan Terbanyak</h3>
          </div>
          <div className="h-64">
            {complaintsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintsData} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                  <XAxis type="number" hide />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    axisLine={false} 
                    tickLine={false} 
                    width={100}
                    tick={{ fontSize: 10, fontStyle: 'bold', fill: '#4B5563' }}
                  />
                  <Tooltip 
                    cursor={{ fill: 'transparent' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={20}>
                    {complaintsData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#EF4444' : '#F87171'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-30 select-none">
                <CheckCircle className="w-12 h-12 mb-2" />
                <p className="text-sm font-bold">Tidak ada keluhan tercatat</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Trend Chart */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Submission Trends</h3>
              <p className="text-sm text-gray-500">Volume over the last 7 days</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorRes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 12, fill: '#9CA3AF' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="responses" 
                  stroke="#2563EB" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorRes)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Responses Activity */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6 font-black uppercase tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Saran & Masukan Terbaru
          </h3>
          <div className="space-y-6 flex-1 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
            {recentResponses
              .filter(r => r.suggestions && r.suggestions.trim() !== '')
              .map((res) => (
                <div key={res.id} className="group flex items-start gap-4 pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                    <User className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs font-black text-gray-900 truncate uppercase tracking-tight">
                        {res.customerName || 'Anonim'}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-0.5 rounded-full">
                        {res.submittedAt?.seconds ? format(new Date(res.submittedAt.seconds * 1000), 'HH:mm') : 'Baru Saja'}
                      </span>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-3 mt-2 relative">
                      <p className="text-xs text-gray-600 leading-relaxed italic">
                        "{res.suggestions}"
                      </p>
                      <div className="absolute -top-2 left-4 w-4 h-4 bg-gray-50 rotate-45" />
                    </div>
                    <p className="text-[9px] font-black text-gray-300 mt-2 uppercase tracking-widest text-right">
                      {res.submittedAt?.seconds ? format(new Date(res.submittedAt.seconds * 1000), 'dd MMM yyyy') : ''}
                    </p>
                  </div>
                </div>
              ))}
            {recentResponses.filter(r => r.suggestions && r.suggestions.trim() !== '').length === 0 && (
              <div className="text-center py-12 opacity-50 flex flex-col items-center">
                <Star className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-loose">Belum ada saran<br/>dari pelanggan</p>
              </div>
            )}
          </div>
          <button 
            onClick={() => navigate('/admin/surveys')}
            className="w-full mt-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 bg-gray-50 hover:bg-gray-100 hover:text-gray-900 rounded-2xl transition-all border border-transparent hover:border-gray-200"
          >
            Review Semua Masukan
          </button>
        </div>
      </div>

      {/* Activity Logs Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Log Aktivitas Terbaru</h3>
            <p className="text-sm text-gray-500 font-medium italic">Riwayat aktivitas member dan operasional admin.</p>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-8">
            <div className="space-y-6">
              {activityLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-4 pb-6 border-b border-gray-50 last:border-0 last:pb-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                    log.type === 'SURVEY_SUBMISSION' ? 'bg-blue-50 text-blue-600' : 
                    log.type === 'BIRTHDAY_GREETING' ? 'bg-pink-50 text-pink-600' : 
                    log.type === 'ADMIN_ACTION' ? 'bg-purple-50 text-purple-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                    {log.type === 'SURVEY_SUBMISSION' ? <ClipboardCheck className="w-5 h-5" /> : 
                     log.type === 'BIRTHDAY_GREETING' ? <Gift className="w-5 h-5" /> : 
                     log.type === 'ADMIN_ACTION' ? <Shield className="w-5 h-5" /> :
                     <User className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-900 truncate">
                        {log.type === 'ADMIN_ACTION' ? log.adminEmail : log.memberPhone}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap bg-gray-50 px-2 py-1 rounded-lg">
                        {log.timestamp?.seconds ? format(new Date(log.timestamp.seconds * 1000), 'dd MMM yyyy, HH:mm') : 'Baru Saja'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 font-medium">
                      {log.details}
                    </p>
                    <div className={`mt-2 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block ${
                      log.type === 'ADMIN_ACTION' ? 'bg-purple-50 text-purple-500' : 'text-gray-400'
                    }`}>
                      {log.type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
              {activityLogs.length === 0 && (
                <div className="text-center py-12 opacity-50 flex flex-col items-center">
                  <Clock className="w-12 h-12 text-gray-200 mb-3" />
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-loose">Belum ada aktivitas<br/>tercatat</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Survey Indicators Summary Breakdown */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Summary Indikator Survey</h3>
            <p className="text-sm text-gray-500 font-medium italic">Breakdown penilaian untuk setiap kriteria survey.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {surveyBreakdown.map((survey, sIdx) => (
            <div key={sIdx} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 px-8 py-5 border-b border-gray-100">
                <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-blue-600" />
                  {survey.title}
                </h4>
              </div>
              <div className="p-4 space-y-3">
                {survey.indicators.map((ind: any, iIdx: number) => (
                  <div key={iIdx} className="p-4 bg-gray-50/50 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-tight">{ind.label}</span>
                      <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-100 rounded-full">
                        <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                        <span className="text-[10px] font-black">{ind.avg}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white p-2.5 rounded-xl border border-gray-50 flex flex-col items-center text-center">
                        <span className="text-[14px] font-black text-green-600 leading-none">{ind.vGood}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">Sangat Baik</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-gray-50 flex flex-col items-center text-center">
                        <span className="text-[14px] font-black text-blue-500 leading-none">{ind.good}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">Baik</span>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-gray-50 flex flex-col items-center text-center">
                        <span className="text-[14px] font-black text-red-500 leading-none">{ind.bad}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter mt-1">Buruk</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {surveyBreakdown.length === 0 && (
            <div className="xl:col-span-2 py-12 bg-white border border-dashed border-gray-200 rounded-[2.5rem] flex flex-col items-center justify-center text-gray-400">
              <Filter className="w-12 h-12 mb-3 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-widest opacity-40">Belum ada data indikator</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, trend, trendUp }: any) {
  return (
    <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
          <Icon className="w-6 h-6 text-gray-700" />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
          trendUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
        }`}>
          {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span className="text-3xl font-bold text-gray-900 mt-1 inline-block">{value}</span>
      </div>
    </div>
  );
}
