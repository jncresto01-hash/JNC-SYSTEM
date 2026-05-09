/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChanged, User, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { AdminUser } from './types';
import Dashboard from './components/admin/Dashboard';
import SurveyManagement from './components/admin/SurveyManagement';
import SurveyReport from './components/admin/SurveyReport';
import CustomerList from './components/admin/CustomerList';
import MemberList from './components/admin/MemberList';
import Settings from './components/admin/Settings';
import PublicSurvey from './components/survey/PublicSurvey';
import MemberRegistration from './components/loyalty/MemberRegistration';
import MemberPortal from './components/loyalty/MemberPortal';
import LandingPage from './components/public/LandingPage';
import PromotionManager from './components/loyalty/PromotionManager';
import EmployeeFOCManager from './components/loyalty/EmployeeFOCManager';
import AdminLayout from './components/admin/AdminLayout';
import Login from './components/auth/Login';
import PublicLayout from './components/public/PublicLayout';
import { Loader2 } from 'lucide-react';

interface AuthContextType {
  user: User | null;
  adminData: AdminUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [adminData, setAdminData] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u && u.email) {
        const adminId = u.email.toLowerCase();
        const adminDoc = await getDoc(doc(db, 'admins', adminId));
        if (adminDoc.exists()) {
          setAdminData({ id: adminId, ...adminDoc.data() } as AdminUser);
        } else if (u.email.toLowerCase() === 'jncresto01@gmail.com') {
          // Bootstrap admin logic
          setAdminData({ id: adminId, email: u.email.toLowerCase(), role: 'admin' });
        } else {
          setAdminData(null);
        }
      } else {
        setAdminData(null);
      }
      setLoading(false);
    });
  }, []);

  const signIn = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const logout = async () => {
    sessionStorage.removeItem('admin_pin_verified');
    sessionStorage.removeItem('admin_email');
    await signOut(auth);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, adminData, loading, signIn, logout }}>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<PublicLayout><LandingPage /></PublicLayout>} />
          <Route path="/survey/:surveyId" element={<PublicLayout><PublicSurvey /></PublicLayout>} />
          <Route path="/register" element={<PublicLayout><MemberRegistration /></PublicLayout>} />
          <Route path="/member" element={<PublicLayout><MemberPortal /></PublicLayout>} />
          
          {/* Admin Routes */}
          <Route path="/admin" element={adminData ? <AdminLayout /> : <Navigate to="/login" />}>
            <Route index element={<Dashboard />} />
            <Route path="surveys" element={<SurveyManagement />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="members" element={<MemberList />} />
            <Route path="foc" element={<EmployeeFOCManager />} />
            <Route path="promotions" element={<PromotionManager />} />
            <Route path="reports/:surveyId" element={<SurveyReport />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          {/* Auth */}
          <Route path="/login" element={!adminData ? <Login /> : <Navigate to="/admin" />} />
          
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}

