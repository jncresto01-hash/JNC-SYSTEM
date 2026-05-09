import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, updateDoc, doc, setDoc, getDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Shield, Mail, Plus, Trash2, Save, Info, AlertTriangle, CreditCard, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'motion/react';

export default function Settings() {
  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [memberDuration, setMemberDuration] = useState(365);
  const [birthdayTemplate, setBirthdayTemplate] = useState('Selamat ulang tahun {name} dari JNC RESTO & POOL! 🎂🎉 Kami punya kejutan spesial untuk Anda hari ini! Silakan tunjukkan pesan ini saat berkunjung.');
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [adminPinInput, setAdminPinInput] = useState('');
  const [confirmAdminPinInput, setConfirmAdminPinInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAdmins();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const docSnap = await getDoc(doc(db, 'settings', 'loyalty'));
    if (docSnap.exists()) {
      const data = docSnap.data();
      setMemberDuration(data.durationDays || 365);
      setBirthdayTemplate(data.birthdayTemplate || 'Selamat ulang tahun {name} dari JNC RESTO & POOL! 🎂🎉 Kami punya kejutan spesial untuk Anda hari ini! Silakan tunjukkan pesan ini saat berkunjung.');
    }
  };

  const fetchAdmins = async () => {
    const snap = await getDocs(collection(db, 'admins'));
    setAdmins(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail) return;
    setLoading(true);
    try {
      const adminId = newAdminEmail.toLowerCase();
      await setDoc(doc(db, 'admins', adminId), {
        email: newAdminEmail.toLowerCase(),
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      // Log Action
      await addDoc(collection(db, 'activityLogs'), {
        adminEmail: auth.currentUser?.email || 'Unknown Admin',
        type: 'ADMIN_ACTION',
        action: 'ADD_ADMIN',
        timestamp: serverTimestamp(),
        details: `Menambah admin baru: ${newAdminEmail}`
      });
      setNewAdminEmail('');
      setEditingAdmin(adminId); // Auto-open PIN setup for new admin
      fetchAdmins();
      setMessage('Admin email whitelisted successfully. Please set a security PIN.');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAdminPin = async (adminId: string) => {
    if (!adminPinInput || adminPinInput.length < 4) {
      setMessage('PIN must be at least 4 digits.');
      return;
    }
    if (adminPinInput !== confirmAdminPinInput) {
      setMessage('PINs do not match!');
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'admins', adminId), {
        pin: adminPinInput,
        updatedAt: new Date().toISOString()
      });
      setEditingAdmin(null);
      setAdminPinInput('');
      setConfirmAdminPinInput('');
      fetchAdmins();
      setMessage('Admin PIN updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearAdminPin = async (adminId: string) => {
    if (!confirm('Remove PIN for this admin?')) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'admins', adminId), {
        pin: null
      });
      fetchAdmins();
      setMessage('PIN removed.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'loyalty'), {
        durationDays: memberDuration,
        birthdayTemplate: birthdayTemplate,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      // Log Action
      await addDoc(collection(db, 'activityLogs'), {
        adminEmail: auth.currentUser?.email || 'Unknown Admin',
        type: 'ADMIN_ACTION',
        action: 'UPDATE_SETTINGS',
        timestamp: serverTimestamp(),
        details: `Memperbarui konfigurasi loyalitas (Durasi: ${memberDuration} hari)`
      });
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">System Settings</h2>
          <p className="text-gray-500 mt-1">Manage global configurations and access permissions.</p>
        </div>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="px-4 py-2 bg-green-50 text-green-600 rounded-lg text-sm font-bold border border-green-100"
          >
            {message}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Admin Permissions */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Admin Permissions</h3>
          </div>
          
          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
            <p className="text-sm text-gray-500 leading-relaxed">
              Add email addresses of authorized personnel. They must use these accounts when signing in via Google.
            </p>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Whitelist New Email</label>
                <div className="flex gap-2">
                  <input 
                    required
                    type="email" 
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="teammate@company.com" 
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-blue-500 outline-none transition-all text-sm"
                  />
                  <button 
                    disabled={loading}
                    className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-all disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>

            <div className="space-y-4 pt-4 border-t border-gray-50">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Current Administrators & Security</label>
              <div className="space-y-4">
                {admins.map((admin) => (
                  <div key={admin.id} className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700">{admin.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {admin.pin ? (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-50 text-green-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-green-100">
                            <Shield className="w-3 h-3" />
                            PIN Active
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-amber-100">
                            <AlertTriangle className="w-3 h-3" />
                            No PIN
                          </div>
                        )}
                        <button 
                          onClick={() => {
                            setEditingAdmin(editingAdmin === admin.id ? null : admin.id);
                            setAdminPinInput('');
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors bg-white rounded-lg shadow-sm border border-gray-100"
                        >
                          <SettingsIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {editingAdmin === admin.id && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-4 border-t border-gray-100 space-y-4"
                      >
                        <div className="flex flex-col gap-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{admin.pin ? 'New PIN' : 'Set PIN'}</label>
                              <input 
                                type="password"
                                maxLength={6}
                                placeholder="4-6 digits"
                                value={adminPinInput}
                                onChange={(e) => setAdminPinInput(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold tracking-[0.3em] text-center text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirm PIN</label>
                              <input 
                                type="password"
                                maxLength={6}
                                placeholder="Repeat PIN"
                                value={confirmAdminPinInput}
                                onChange={(e) => setConfirmAdminPinInput(e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-2.5 bg-white border border-gray-100 rounded-xl focus:border-blue-500 outline-none transition-all font-bold tracking-[0.3em] text-center text-sm"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => handleSaveAdminPin(admin.id)}
                              disabled={loading || !adminPinInput || adminPinInput !== confirmAdminPinInput}
                              className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs hover:bg-gray-800 transition-all disabled:opacity-50"
                            >
                              {admin.pin ? 'Update Security PIN' : 'Activate Security PIN'}
                            </button>
                            {admin.pin && (
                              <button 
                                onClick={() => clearAdminPin(admin.id)}
                                className="p-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                                title="Remove PIN"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          
                          {adminPinInput && confirmAdminPinInput && adminPinInput !== confirmAdminPinInput && (
                            <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider text-center italic">PINs do not match!</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Loyalty Program Settings */}
        <div className="space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-50 rounded-lg">
              <CreditCard className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Loyalty Program</h3>
          </div>

          <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-8">
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-gray-900">Membership Duration</h4>
                <p className="text-xs text-gray-500 mt-0.5">Set how long a membership stays active from registration.</p>
              </div>
              <div className="flex items-center gap-4">
                <input 
                  type="number"
                  value={memberDuration}
                  onChange={(e) => setMemberDuration(Number(e.target.value))}
                  className="w-32 px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-bold"
                />
                <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Days</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-gray-900">Birthday Greeting Template</h4>
                <p className="text-xs text-gray-500 mt-0.5">Template message for sending wishes via WhatsApp. Use {'{name}'} as placeholder.</p>
              </div>
              <textarea 
                value={birthdayTemplate}
                onChange={(e) => setBirthdayTemplate(e.target.value)}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:bg-white focus:border-purple-500 outline-none transition-all font-semibold text-sm min-h-[100px]"
                placeholder="Write your birthday template here..."
              />
              <p className="text-[10px] text-gray-400 font-medium italic">Sent to members on their special day via WhatsApp.</p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900">Auto-calculated Expiry</h4>
                <p className="text-xs text-gray-500 mt-0.5">Automatically set expiration date on signup.</p>
              </div>
              <div className="w-12 h-6 bg-green-500 rounded-full relative p-1">
                <div className="w-4 h-4 bg-white rounded-full shadow-sm ml-auto" />
              </div>
            </div>

            <button 
              onClick={handleSaveSettings}
              disabled={loading}
              className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              Save Loyalty Config
            </button>
          </div>
        </div>

        <div className="hidden">
          {/* Removed global PIN setting in favor of per-admin PIN */}
        </div>
      </div>
    </div>
  );
}
