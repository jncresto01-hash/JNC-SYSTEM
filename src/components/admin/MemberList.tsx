import React, { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc, onSnapshot, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Member } from '../../types';
import { format, isAfter, isBefore, addDays, startOfDay, endOfDay, isWithinInterval, subDays } from 'date-fns';
import { Search, Smartphone, Trash2, Send, Calendar, CheckCircle2, AlertCircle, ExternalLink, User, CreditCard, FileText, FileJson, Filter, X, Table, FileSpreadsheet, Cake, Edit2, Eye, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { generateMemberCard } from '../../lib/memberCard';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import MembershipCard from '../loyalty/MembershipCard';
import { toPng } from 'html-to-image';
import { handleFirestoreError, OperationType } from '../../lib/firebase';

export default function MemberList() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('all');
  
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [previewMember, setPreviewMember] = useState<Member | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    email: '',
    memberType: 'Umum' as 'Umum' | 'Corporate',
    companyName: '',
    birthday: '',
    expiresAt: ''
  });
  
  // Date range for export/filter
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  useEffect(() => {
    const q = query(collection(db, 'members'), orderBy('registeredAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMembers(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
      setLoading(false);
    }, (err) => {
      console.error("Error listening to members:", err);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchMembers = async () => {
    // This function is now mostly for fallback or initial manual triggers if needed
    // but onSnapshot will handle the main sync
  };

  const deleteMember = async (id: string) => {
    setIsUpdating(true);
    try {
      const memberToDelete = members.find(m => m.id === id);
      if (memberToDelete) {
        await deleteDoc(doc(db, 'members', id));
        await addDoc(collection(db, 'activityLogs'), {
          adminEmail: auth.currentUser?.email || 'Unknown Admin',
          type: 'ADMIN_ACTION',
          action: 'DELETE_MEMBER',
          timestamp: serverTimestamp(),
          details: `Menghapus member: ${memberToDelete.name} (${memberToDelete.memberId})`
        });
      }
      setDeleteId(null);
    } catch (err: any) {
      console.error("Error deleting member:", err);
      handleFirestoreError(err, OperationType.DELETE, 'members');
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredMembers = members.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         m.phone.includes(searchTerm) || 
                         m.memberId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Status filter
    const isExpired = isAfter(new Date(), new Date(m.expiresAt));
    const matchesStatus = filter === 'all' || (filter === 'active' ? !isExpired : isExpired);

    // Date range filter (Registration date)
    const regDate = new Date(m.registeredAt);
    const matchesDate = isWithinInterval(regDate, {
      start: startOfDay(new Date(dateRange.start)),
      end: endOfDay(new Date(dateRange.end))
    });

    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportToExcel = () => {
    if (filteredMembers.length === 0) return;
    const data = filteredMembers.map(m => ({
      'Member ID': m.memberId,
      'Name': m.name,
      'Type': m.memberType || 'Umum',
      'Company': m.companyName || '-',
      'Phone': m.phone,
      'Email': m.email,
      'Joined Date': format(new Date(m.registeredAt), 'yyyy-MM-dd'),
      'Expiry Date': format(new Date(m.expiresAt), 'yyyy-MM-dd'),
      'Status': isAfter(new Date(), new Date(m.expiresAt)) ? 'Expired' : 'Active'
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Members');
    XLSX.writeFile(wb, `Loyal_Members_${dateRange.start}_to_${dateRange.end}.xlsx`);
  };

  const exportToPDF = () => {
    if (filteredMembers.length === 0) return;
    const doc = new jsPDF('l', 'mm', 'a4');
    
    doc.setFontSize(20);
    doc.text('JNC Loyal Members Report', 14, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, 30);
    doc.text(`Generated at: ${format(new Date(), 'PPpp')}`, 14, 35);

    const tableData = filteredMembers.map(m => [
      m.memberId,
      m.name,
      m.memberType || 'Umum',
      m.companyName || '-',
      m.phone,
      m.email,
      format(new Date(m.registeredAt), 'dd/MM/yyyy'),
      format(new Date(m.expiresAt), 'dd/MM/yyyy'),
      isAfter(new Date(), new Date(m.expiresAt)) ? 'Expired' : 'Active'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['ID', 'Name', 'Type', 'Company', 'Phone', 'Email', 'Joined', 'Expiry', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 0, 0] },
      styles: { fontSize: 8 }
    });

    doc.save(`JNC_Members_${dateRange.start}_${dateRange.end}.pdf`);
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(filteredMembers, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', `JNC_Members_${dateRange.start}_${dateRange.end}.json`);
    linkElement.click();
  };

  const getStatus = (expiry: string) => {
    const isExpired = isAfter(new Date(), new Date(expiry));
    if (isExpired) return { label: 'EXPIRED', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertCircle };
    return { label: 'ACTIVE', color: 'bg-green-50 text-green-600 border-green-100', icon: CheckCircle2 };
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    const message = `Halo ${name}, salam dari JNC RESTO & POOL! Kami ingin menyapa Anda dan menanyakan kabar. Apakah ada yang bisa kami bantu hari ini?`;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const sendBirthdayGreeting = async (member: Member) => {
    // Fetch template from settings
    let currentTemplate = `Halo {name}, Selamat Ulang Tahun! 🎂\n\nKami dari JNC RESTO & POOL turut berbahagia. Sebagai apresiasi, kami memiliki penawaran khusus untuk Anda hari ini. Silakan kunjungi resto kami untuk kejutan spesial! 🥳`;
    
    try {
      const settingsSnap = await getDoc(doc(db, 'settings', 'loyalty'));
      if (settingsSnap.exists() && settingsSnap.data().birthdayTemplate) {
        currentTemplate = settingsSnap.data().birthdayTemplate;
      }
    } catch (err) {
      console.error("Error fetching template:", err);
    }

    const message = currentTemplate.includes('{name}') 
      ? currentTemplate.replace('{name}', member.name)
      : `Halo ${member.name}, ${currentTemplate}`;

    // Format phone
    const cleanPhone = member.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0') ? '62' + cleanPhone.substring(1) : cleanPhone;
    
    // Open WhatsApp IMMEDIATELY
    window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`, '_blank');
    
    // Optimistic local update
    setMembers(prev => prev.map(m => 
      m.id === member.id ? { ...m, lastBirthdayGreetedYear: new Date().getFullYear() } : m
    ));

    try {
      await updateDoc(doc(db, 'members', member.id), {
        lastBirthdayGreetedYear: new Date().getFullYear()
      });

      // Record Activity Log
      await addDoc(collection(db, 'activityLogs'), {
        memberPhone: member.phone,
        type: 'BIRTHDAY_GREETING',
        timestamp: serverTimestamp(),
        details: `Mengirim ucapan selamat ulang tahun via WhatsApp`
      });
    } catch (err: any) {
      console.error("Error updating birthday greeting:", err);
      handleFirestoreError(err, OperationType.UPDATE, 'members');
    }
  };

  const handleEditClick = (member: Member) => {
    setEditingMember(member);
    setEditFormData({
      name: member.name,
      phone: member.phone,
      email: member.email,
      memberType: member.memberType || 'Umum',
      companyName: member.companyName || '',
      birthday: member.birthday || '',
      expiresAt: format(new Date(member.expiresAt), 'yyyy-MM-dd')
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    setIsUpdating(true);

    try {
      await updateDoc(doc(db, 'members', editingMember.id), {
        ...editFormData,
        updatedAt: serverTimestamp()
      });

      await addDoc(collection(db, 'activityLogs'), {
        adminEmail: auth.currentUser?.email || 'Unknown Admin',
        type: 'ADMIN_ACTION',
        action: 'UPDATE_MEMBER',
        timestamp: serverTimestamp(),
        details: `Memperbarui data member: ${editingMember.name} (${editingMember.memberId})`
      });

      setIsEditModalOpen(false);
      setEditingMember(null);
    } catch (err: any) {
      console.error("Error updating member:", err);
      handleFirestoreError(err, OperationType.UPDATE, 'members');
    } finally {
      setIsUpdating(false);
    }
  };

  const downloadDigitalCard = async (memberId: string, name: string) => {
    const element = document.getElementById(`membership-card-${memberId}`);
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
      link.download = `JNC-CARD-${name.replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download card', err);
      alert("Gagal mengunduh kartu digital.");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Loyal Members</h2>
          <p className="text-gray-500 mt-1">Database pendaftaran member loyalitas JNC RESTO & POOL.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search name, phone, or ID..." 
              className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl outline-none focus:border-blue-500 shadow-sm transition-all text-sm font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm self-start">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400'}`}
            >
              <CreditCard className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400'}`}
            >
              <Table className="w-4 h-4" />
            </button>
          </div>

          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm self-start">
            {['all', 'active', 'expired'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white/50 p-4 rounded-[2rem] border border-gray-100">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-gray-400" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={dateRange.start} 
                onChange={e => setDateRange({ ...dateRange, start: e.target.value })}
                className="text-xs font-bold outline-none bg-transparent"
              />
              <span className="text-gray-300 font-bold">→</span>
              <input 
                type="date" 
                value={dateRange.end} 
                onChange={e => setDateRange({ ...dateRange, end: e.target.value })}
                className="text-xs font-bold outline-none bg-transparent"
              />
            </div>
          </div>
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">
            {loading ? 'Refreshing...' : `${filteredMembers.length} Members Found`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={exportToExcel}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-700 hover:bg-green-50 hover:text-green-600 hover:border-green-100 shadow-sm transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-gray-100 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-700 hover:bg-red-50 hover:text-red-600 hover:border-red-100 shadow-sm transition-all"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button 
            onClick={exportToJSON}
            className="hidden sm:flex items-center justify-center p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-100 shadow-sm transition-all"
            title="Export JSON"
          >
            <FileJson className="w-4 h-4" />
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm transition-all hover:shadow-xl relative group"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center relative">
                  <User className="w-6 h-6" />
                  {(() => {
                    if (!member.birthday) return null;
                    const today = new Date();
                    try {
                      const [y, m, d] = member.birthday.split('-');
                      const isToday = parseInt(m) === (today.getMonth() + 1) && parseInt(d) === today.getDate();
                      if (isToday) return <div className="absolute -top-2 -right-2 w-6 h-6 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white shadow-sm"><Cake className="w-3 h-3 text-white" /></div>;
                    } catch (e) {}
                    return null;
                  })()}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => setPreviewMember(member)} className="p-3 bg-gray-50 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all"><Eye className="w-4 h-4" /></button>
                  <button onClick={() => handleEditClick(member)} className="p-3 bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDeleteId(member.id)} className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between font-black text-[10px] text-blue-600 uppercase tracking-widest mb-1">
                    <span>{member.memberId}</span>
                    <span className={`px-2 py-0.5 rounded-md ${member.memberType === 'Corporate' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                      {member.memberType || 'Umum'}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight line-clamp-1">{member.name}</h3>
                </div>

                <div className="pt-4 border-t border-gray-50 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Contacts</label>
                    <p className="text-xs font-bold text-gray-700 truncate">{member.phone}</p>
                    <p className="text-[9px] text-gray-400 truncate">{member.email}</p>
                  </div>
                  <div>
                    <label className="block text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</label>
                    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black border ${getStatus(member.expiresAt).color}`}>
                      {getStatus(member.expiresAt).label}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                  <div className="flex gap-2">
                    <button onClick={() => openWhatsApp(member.phone, member.name)} className="p-3 bg-green-50 text-green-600 hover:bg-green-100 rounded-xl transition-all"><Send className="w-4 h-4" /></button>
                    {(() => {
                        const today = new Date();
                        try {
                          const [y, m, d] = member.birthday.split('-');
                          const isToday = parseInt(m) === (today.getMonth() + 1) && parseInt(d) === today.getDate();
                          const greeted = Number(member.lastBirthdayGreetedYear) === today.getFullYear();
                          if (isToday && !greeted) return <button onClick={() => sendBirthdayGreeting(member)} className="p-3 bg-pink-50 text-pink-600 hover:bg-pink-100 rounded-xl transition-all lg:animate-pulse"><Cake className="w-4 h-4" /></button>;
                        } catch (e) {}
                        return null;
                    })()}
                  </div>
                  <button onClick={() => generateMemberCard(member)} className="p-3 bg-gray-50 text-gray-400 hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all"><CreditCard className="w-4 h-4" /></button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-50 uppercase text-[10px] font-black text-gray-400 tracking-widest">
                <th className="px-8 py-5">Member Details</th>
                <th className="px-8 py-5">Type / Company</th>
                <th className="px-8 py-5">Contacts</th>
                <th className="px-8 py-5">Status</th>
                <th className="px-8 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMembers.map((member) => {
                const status = getStatus(member.expiresAt);
                return (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center text-white font-black text-xs">
                            {member.name.charAt(0) || '?'}
                          </div>
                          {(() => {
                            if (!member.birthday) return null;
                            const today = new Date();
                            const currentYear = today.getFullYear();
                            try {
                              const [y, m, d] = member.birthday.split('-');
                              const isToday = parseInt(m) === (today.getMonth() + 1) && parseInt(d) === today.getDate();
                              
                              if (isToday) {
                                return (
                                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full flex items-center justify-center border-2 border-white lg:animate-bounce shadow-sm ring-2 ring-pink-100">
                                    <Cake className="w-2.5 h-2.5 text-white" />
                                  </div>
                                );
                              }
                            } catch (e) {}
                            return null;
                          })()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-900">{member.name}</span>
                          <span className="text-[10px] text-blue-600 font-black">{member.memberId}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md inline-block w-fit ${member.memberType === 'Corporate' ? 'bg-purple-50 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                          {member.memberType || 'Umum'}
                        </span>
                        {member.memberType === 'Corporate' && (
                          <span className="text-xs font-bold text-gray-900 mt-1">{member.companyName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                          <Smartphone className="w-3 h-3 text-gray-400" />
                          {member.phone}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          {member.email}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black border ${status.color}`}>
                          <status.icon className="w-3 h-3" />
                          {status.label}
                        </div>
                        <span className="text-[9px] text-gray-400 uppercase font-bold">Expires: {format(new Date(member.expiresAt), 'dd/MM/yyyy')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex justify-end gap-2">
                        {(() => {
                          if (!member.birthday) return null;
                          const today = new Date();
                          const currentYear = today.getFullYear();
                          try {
                            const [y, m, d] = member.birthday.split('-');
                            const isToday = parseInt(m) === (today.getMonth() + 1) && parseInt(d) === today.getDate();
                            const greeted = Number(member.lastBirthdayGreetedYear) === currentYear;
                            
                            if (isToday && !greeted) {
                              return (
                                <button 
                                  onClick={() => sendBirthdayGreeting(member)}
                                  className="p-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-all shadow-md flex items-center gap-2 pr-4 scale-105"
                                  title="Send Birthday Wish"
                                >
                                  <Cake className="w-4 h-4" />
                                  <span className="text-[10px] font-black uppercase tracking-widest">Send Birthday Wish</span>
                                </button>
                              );
                            }
                          } catch (e) {}
                          return null;
                        })()}
                        <button 
                          onClick={() => setPreviewMember(member)}
                          className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm border border-indigo-100"
                          title="View Card"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleEditClick(member)}
                          className="p-2.5 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-200 transition-all shadow-sm border border-gray-200"
                          title="Edit Member"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => generateMemberCard(member)}
                          className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-blue-100"
                          title="Download PDF Card"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openWhatsApp(member.phone, member.name)}
                          className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm border border-green-100"
                          title="WhatsApp Direct"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteMember(member.id)}
                          className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm border border-red-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredMembers.length === 0 && !loading && (
            <div className="text-center py-20">
              <p className="text-gray-400">No members found.</p>
            </div>
          )}
        </div>
      </div>
      )}

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
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight mb-2">Hapus Member?</h3>
              <p className="text-sm text-gray-500 mb-8">Data member akan dihapus permanen dari sistem.</p>
              
              <div className="flex gap-4">
                <button
                  onClick={() => setDeleteId(null)}
                  className="flex-1 py-4 rounded-2xl text-gray-400 font-black uppercase tracking-widest text-[10px] hover:bg-gray-50 transition-all"
                >
                  Batal
                </button>
                <button
                  onClick={() => deleteId && deleteMember(deleteId)}
                  disabled={isUpdating}
                  className="flex-1 bg-red-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-700 transition-all shadow-xl shadow-red-100 disabled:opacity-50"
                >
                  {isUpdating ? 'Hapus...' : 'Ya, Hapus'}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {previewMember && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewMember(null)}
              className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-sm"
            >
              <div className="mb-6 flex justify-center">
                <MembershipCard member={previewMember} />
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => downloadDigitalCard(previewMember.memberId, previewMember.name)}
                  className="flex-1 bg-white text-gray-900 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl"
                >
                  <Download className="w-4 h-4" /> Download Digital
                </button>
                <button
                  onClick={() => setPreviewMember(null)}
                  className="w-14 h-14 bg-gray-800 text-white rounded-2xl flex items-center justify-center shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditModalOpen(false)}
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl p-8 md:p-10 my-8"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 tracking-tight uppercase">Edit Member</h3>
                  <p className="text-gray-400 text-sm mt-1">Perbarui informasi member loyalitas.</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpdateMember} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nama Lengkap</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        required
                        value={editFormData.name}
                        onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nomor HP</label>
                    <div className="relative">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        required
                        value={editFormData.phone}
                        onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Alamat Email</label>
                    <div className="relative">
                      <Send className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="email"
                        required
                        value={editFormData.email}
                        onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tipe Member</label>
                    <div className="flex bg-gray-50 p-1 rounded-2xl">
                      {['Umum', 'Corporate'].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setEditFormData({ ...editFormData, memberType: t as any })}
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            editFormData.memberType === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {editFormData.memberType === 'Corporate' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Nama Perusahaan</label>
                      <input
                        type="text"
                        required
                        value={editFormData.companyName}
                        onChange={e => setEditFormData({ ...editFormData, companyName: e.target.value })}
                        className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Tanggal Lahir</label>
                    <div className="relative">
                      <Cake className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        value={editFormData.birthday}
                        onChange={e => setEditFormData({ ...editFormData, birthday: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Berlaku Sampai</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        required
                        value={editFormData.expiresAt}
                        onChange={e => setEditFormData({ ...editFormData, expiresAt: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-xl shadow-gray-200 disabled:opacity-50"
                  >
                    {isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
