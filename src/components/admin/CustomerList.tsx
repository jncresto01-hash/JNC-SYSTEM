import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import { Search, Smartphone, Monitor, ChevronRight, User, Calendar, FileSpreadsheet, FileText, Star, Trophy, MessageCircle, Eye, X, MessageSquare, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Response, Survey } from '../../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  lastSeen: any;
  totalSurveys: number;
  isMember: boolean;
}

export default function CustomerList() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerRecord | null>(null);
  const [customerResponses, setCustomerResponses] = useState<Response[]>([]);
  const [surveys, setSurveys] = useState<Record<string, Survey>>({});
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch full survey data for mapping
      const sSnap = await getDocs(collection(db, 'surveys'));
      const sMap: Record<string, Survey> = {};
      sSnap.docs.forEach(d => sMap[d.id] = { id: d.id, ...d.data() } as Survey);
      setSurveys(sMap);

      const q = query(collection(db, 'customers'), orderBy('lastSeen', 'desc'));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerRecord));
      
      const filteredByDate = list.filter(c => {
        const date = new Date(c.lastSeen?.seconds * 1000 || Date.now());
        return isWithinInterval(date, {
          start: startOfDay(new Date(dateRange.start)),
          end: endOfDay(new Date(dateRange.end))
        });
      });

      setCustomers(filteredByDate);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.includes(searchTerm)
  );

  const exportToExcel = () => {
    if (customers.length === 0) return;
    const data = filteredCustomers.map(c => ({
      'Name': c.name,
      'Phone': c.phone,
      'Last Interaction': format(new Date(c.lastSeen?.seconds * 1000), 'yyyy-MM-dd HH:mm'),
      'Total Surveys': c.totalSurveys,
      'Member Status': c.isMember ? 'Loyal Member' : 'General Customer'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Customers');
    XLSX.writeFile(wb, `Customer_Activity_${dateRange.start}.xlsx`);
  };

  const exportToPDF = () => {
    if (customers.length === 0) return;
    const doc = new jsPDF('p', 'mm', 'a4');
    doc.setFontSize(16);
    doc.text('Customer Activity Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, 28);

    const body = filteredCustomers.map(c => [
      c.name,
      c.phone,
      format(new Date(c.lastSeen?.seconds * 1000), 'yyyy-MM-dd HH:mm'),
      c.totalSurveys,
      c.isMember ? 'Member' : '-'
    ]);

    (doc as any).autoTable({
      head: [['Name', 'Phone', 'Last Seen', 'Surveys', 'Status']],
      body: body,
      startY: 35,
      theme: 'grid'
    });

    doc.save(`Customer_Activity_${dateRange.start}.pdf`);
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const message = encodeURIComponent(`Halo ${name}, kami dari tim layanan pelanggan. Terima kasih telah memberikan masukan melalui survey kami baru-baru ini...`);
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  const viewCustomerDetail = async (customer: CustomerRecord) => {
    setSelectedCustomer(customer);
    setLoadingDetails(true);
    try {
      const rSnap = await getDocs(query(collection(db, 'responses'), orderBy('submittedAt', 'desc')));
      const allResponses = rSnap.docs.map(d => ({ id: d.id, ...d.data() } as Response));
      const customerHistory = allResponses.filter(r => r.customerPhone === customer.phone);
      setCustomerResponses(customerHistory);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDetails(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Customer Activity</h2>
          <p className="text-gray-500 mt-1">Detailed log of survey participants and their engagement.</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
            <Calendar className="w-4 h-4 text-gray-400 ml-2" />
            <input 
              type="date" 
              value={dateRange.start} 
              onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
              className="text-xs font-semibold outline-none bg-transparent"
            />
            <span className="text-gray-300">|</span>
            <input 
              type="date" 
              value={dateRange.end} 
              onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
              className="text-xs font-semibold outline-none bg-transparent mr-2"
            />
          </div>

          <div className="flex gap-2">
            <button 
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600" />
              <span className="hidden sm:inline">Excel</span>
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
            >
              <FileText className="w-4 h-4 text-red-600" />
              <span className="hidden sm:inline">PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by name or phone..." 
            className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:border-blue-500 shadow-sm transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">
            {loading ? 'Refreshing...' : `${filteredCustomers.length} Customers`}
          </span>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                <th className="px-8 py-5">Customer Info</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5">Engagement</th>
                <th className="px-8 py-5">Last Interaction</th>
                <th className="px-8 py-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredCustomers.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 font-black text-xs">
                        {res.name.charAt(0)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{res.name}</span>
                        <span className="text-[10px] text-gray-400 font-medium font-mono">{res.phone}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    {res.isMember ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">
                        <Trophy className="w-3 h-3" />
                        Loyal Member
                      </span>
                    ) : (
                      <span className="inline-flex px-3 py-1 bg-gray-50 text-gray-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-gray-100">
                        General
                      </span>
                    )}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center text-orange-600">
                        <Star className="w-4 h-4 fill-orange-600" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-gray-900">{res.totalSurveys}</span>
                        <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Surveys Filled</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-sm text-gray-500 whitespace-nowrap">
                    {res.lastSeen?.seconds 
                      ? format(new Date(res.lastSeen.seconds * 1000), 'MMM dd, yyyy · HH:mm') 
                      : 'N/A'}
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => openWhatsApp(res.phone, res.name)}
                        className="p-2 text-green-500 hover:bg-green-50 rounded-xl transition-colors"
                        title="Direct WhatsApp"
                      >
                        <MessageCircle className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => viewCustomerDetail(res)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredCustomers.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-gray-400">No activity data available for this range.</p>
            </div>
          )}
        </div>
      </div>

      {/* Customer Detail Modal */}
      <AnimatePresence>
        {selectedCustomer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCustomer(null)}
              className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-8 pt-8 pb-6 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-[2rem] flex items-center justify-center text-blue-600">
                    <User className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 leading-tight">{selectedCustomer.name}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-mono font-bold text-gray-400">{selectedCustomer.phone}</span>
                      {selectedCustomer.isMember && (
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-blue-100">Member</span>
                      )}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:text-gray-900 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-8 pb-10 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Survey History</h4>
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-xs font-bold text-gray-500">
                      {customerResponses.length} Responses
                    </span>
                  </div>

                  {loadingDetails ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-sm font-bold text-gray-400">Loading history...</p>
                    </div>
                  ) : customerResponses.length > 0 ? (
                    <div className="space-y-4">
                      {customerResponses.map((res) => (
                        <div key={res.id} className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100/50 hover:border-blue-100 transition-all group">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-xl shadow-sm">
                                <MessageSquare className="w-4 h-4 text-blue-600" />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{surveys[res.surveyId]?.title || 'Survey Response'}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <Clock className="w-3 h-3 text-gray-300" />
                                  <p className="text-[10px] font-bold text-gray-400 uppercase">
                                    {format(new Date(res.submittedAt?.seconds * 1000), 'MMM dd, yyyy · HH:mm')}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(s => {
                                const scores = Object.values(res.answers).filter(v => typeof v === 'number') as number[];
                                const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
                                return <Star key={s} className={`w-3 h-3 ${s <= Math.round(avg) ? 'text-blue-600 fill-blue-600' : 'text-gray-200'}`} />;
                              })}
                            </div>
                          </div>
                          
                          {res.suggestions && (
                            <div className="mt-4 p-4 bg-white rounded-2xl border border-gray-100">
                              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Feedback/Saran</p>
                              <p className="text-sm text-gray-600 italic leading-relaxed">"{res.suggestions}"</p>
                            </div>
                          )}

                          <div className="mt-4 flex flex-col gap-2">
                            {Object.entries(res.answers).map(([key, val]) => {
                              const survey = surveys[res.surveyId];
                              const indicator = survey?.indicators.find(i => i.id === key);
                              const label = indicator?.label || `Q: ${key.substring(0, 8)}`;
                              
                              return (
                                <div key={key} className="flex flex-col gap-1 p-3 bg-white/50 rounded-2xl border border-gray-100/50">
                                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">{label}</span>
                                  <span className={`text-sm font-bold ${typeof val === 'number' ? 'text-blue-600' : 'text-gray-900'}`}>
                                    {typeof val === 'number' ? `${val} / 5` : val}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                      <p className="text-gray-400 font-medium">No survey data found for this customer.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3">
                <button 
                  onClick={() => openWhatsApp(selectedCustomer.phone, selectedCustomer.name)}
                  className="flex-1 h-14 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-green-100 transition-all active:scale-[0.98]"
                >
                  <MessageCircle className="w-5 h-5 fill-white/20" />
                  Hubungi via WhatsApp
                </button>
                <button 
                  onClick={() => setSelectedCustomer(null)}
                  className="px-8 h-14 bg-white border border-gray-200 text-gray-600 rounded-2xl font-bold hover:bg-gray-50 transition-all"
                >
                  Tutup
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
