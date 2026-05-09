import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { Survey, SurveyIndicator } from '../../types';
import { Plus, Trash2, Edit2, ExternalLink, Activity, ToggleLeft, ToggleRight, X, Link as LinkIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Link } from 'react-router-dom';

export default function SurveyManagement() {
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [newSurvey, setNewSurvey] = useState({
    title: '',
    description: '',
    indicators: [] as SurveyIndicator[]
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const DEFAULT_INDICATORS = [
    'Kebersihan Area',
    'Kenyamanan',
    'Suasana',
    'Keramahan Staff',
    'Kesigapan Staff',
    'Kecepatan Pelayanan',
    'Kualitas Makanan',
    'Keragaman Menu',
    'Harga vs Kualitas'
  ];

  const loadDefaults = () => {
    const indicators = DEFAULT_INDICATORS.map(label => ({
      id: Math.random().toString(36).substring(7),
      label,
      type: 'rating' as const,
      required: true
    }));
    setNewSurvey({ ...newSurvey, indicators });
  };

  useEffect(() => {
    fetchSurveys();
  }, []);

  const fetchSurveys = async () => {
    const snap = await getDocs(collection(db, 'surveys'));
    setSurveys(snap.docs.map(d => ({ id: d.id, ...d.data() } as Survey)));
  };

  const handleOpenEdit = (survey: Survey) => {
    setEditingId(survey.id);
    setNewSurvey({
      title: survey.title,
      description: survey.description,
      indicators: survey.indicators
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setNewSurvey({ title: '', description: '', indicators: [] });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSurvey.title || newSurvey.indicators.length === 0) return;
    
    setIsLoading(true);
    try {
      const adminEmail = auth.currentUser?.email || 'Unknown Admin';
      if (editingId) {
        await updateDoc(doc(db, 'surveys', editingId), {
          ...newSurvey,
          updatedAt: serverTimestamp(),
        });
        // Log Update
        await addDoc(collection(db, 'activityLogs'), {
          adminEmail,
          type: 'ADMIN_ACTION',
          action: 'UPDATE_SURVEY',
          timestamp: serverTimestamp(),
          details: `Memperbarui survey: ${newSurvey.title}`,
          surveyId: editingId
        });
      } else {
        const docRef = await addDoc(collection(db, 'surveys'), {
          ...newSurvey,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        // Log Create
        await addDoc(collection(db, 'activityLogs'), {
          adminEmail,
          type: 'ADMIN_ACTION',
          action: 'CREATE_SURVEY',
          timestamp: serverTimestamp(),
          details: `Membuat survey baru: ${newSurvey.title}`,
          surveyId: docRef.id
        });
      }
      handleCloseModal();
      fetchSurveys();
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const surveyToDelete = surveys.find(s => s.id === id);
    if (!surveyToDelete) return;
    if (!window.confirm(`Are you sure you want to delete survey "${surveyToDelete.title}"?`)) return;
    
    try {
      await deleteDoc(doc(db, 'surveys', id));
      // Log Delete
      await addDoc(collection(db, 'activityLogs'), {
        adminEmail: auth.currentUser?.email || 'Unknown Admin',
        type: 'ADMIN_ACTION',
        action: 'DELETE_SURVEY',
        timestamp: serverTimestamp(),
        details: `Menghapus survey: ${surveyToDelete.title}`,
        surveyId: id
      });
      fetchSurveys();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleStatus = async (id: string, current: boolean) => {
    const survey = surveys.find(s => s.id === id);
    if (!survey) return;
    
    try {
      await updateDoc(doc(db, 'surveys', id), { active: !current });
      // Log Toggle
      await addDoc(collection(db, 'activityLogs'), {
        adminEmail: auth.currentUser?.email || 'Unknown Admin',
        type: 'ADMIN_ACTION',
        action: 'TOGGLE_SURVEY',
        timestamp: serverTimestamp(),
        details: `${!current ? 'Mengaktifkan' : 'Menonaktifkan'} survey: ${survey.title}`,
        surveyId: id
      });
      fetchSurveys();
    } catch (error) {
      console.error(error);
    }
  };

  const addIndicator = () => {
    const id = Math.random().toString(36).substring(7);
    setNewSurvey({
      ...newSurvey,
      indicators: [...newSurvey.indicators, { id, label: '', type: 'rating', required: true }]
    });
  };

  const updateIndicator = (id: string, field: keyof SurveyIndicator, value: any) => {
    setNewSurvey({
      ...newSurvey,
      indicators: newSurvey.indicators.map(ind => ind.id === id ? { ...ind, [field]: value } : ind)
    });
  };

  const removeIndicator = (id: string) => {
    setNewSurvey({
      ...newSurvey,
      indicators: newSurvey.indicators.filter(ind => ind.id !== id)
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Manage Surveys</h2>
          <p className="text-gray-500 mt-1">Create and configure your customer feedback forms.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <Plus className="w-5 h-5" />
          Create Survey
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {surveys.map((survey) => (
          <div key={survey.id} className="bg-white rounded-3xl border border-gray-100 p-6 flex flex-col shadow-sm">
            <div className="flex items-start justify-between mb-4">
              <div className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                survey.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {survey.active ? 'Active' : 'Inactive'}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleOpenEdit(survey)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  title="Edit Questions"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => toggleStatus(survey.id, survey.active)}
                  className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  {survey.active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button 
                  onClick={() => handleDelete(survey.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">{survey.title}</h3>
            <p className="text-sm text-gray-500 mb-6 flex-1 line-clamp-3 leading-relaxed">
              {survey.description || 'No description provided.'}
            </p>

            <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-50">
              <Link 
                to={`/admin/reports/${survey.id}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gray-50 text-gray-700 font-semibold hover:bg-gray-100 transition-all"
              >
                <Activity className="w-4 h-4" />
                Results
              </Link>
              <button 
                onClick={() => {
                  const url = `${window.location.origin}/survey/${survey.id}`;
                  navigator.clipboard.writeText(url);
                  alert(`Copied survey link: ${url}`);
                }}
                className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-all"
                title="Copy Shareable Link"
              >
                <LinkIcon className="w-5 h-5" />
              </button>
              <a 
                href={`/survey/${survey.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-2.5 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 transition-all"
                title="Open Live Preview"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] p-8 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-gray-900">{editingId ? 'Edit Survey Structure' : 'New Survey Structure'}</h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6 overflow-y-auto pr-2">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Survey Title</label>
                  <input
                    required
                    type="text"
                    value={newSurvey.title}
                    onChange={e => setNewSurvey({ ...newSurvey, title: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    placeholder="e.g., Monthly Service Satisfaction"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 ml-1">Description (Internal)</label>
                  <textarea
                    value={newSurvey.description}
                    onChange={e => setNewSurvey({ ...newSurvey, description: e.target.value })}
                    className="w-full px-5 py-3 rounded-2xl bg-gray-50 border border-gray-100 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none h-24"
                    placeholder="Describe the purpose of this survey..."
                  />
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <label className="text-sm font-bold text-gray-700">Indicators / Questions</label>
                      <button 
                        type="button" 
                        onClick={loadDefaults}
                        className="text-[10px] font-bold text-blue-500 hover:underline uppercase tracking-tight text-left"
                      >
                        Load Standard Indicators
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={addIndicator}
                      className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Question
                    </button>
                  </div>

                  <div className="space-y-4">
                    {newSurvey.indicators.map((ind, index) => (
                      <motion.div 
                        key={ind.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="bg-gray-50 p-6 rounded-3xl space-y-4 border border-gray-100"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <input
                              required
                              type="text"
                              value={ind.label}
                              onChange={e => updateIndicator(ind.id, 'label', e.target.value)}
                              className="w-full px-4 py-2 bg-white rounded-xl border border-gray-100 text-sm focus:border-blue-500 outline-none"
                              placeholder={`Question ${index + 1}`}
                            />
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeIndicator(ind.id)}
                            className="p-2 text-gray-400 hover:text-red-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex gap-4">
                          <select
                            value={ind.type}
                            onChange={e => updateIndicator(ind.id, 'type', e.target.value)}
                            className="text-xs px-3 py-1.5 bg-white border border-gray-100 rounded-lg outline-none"
                          >
                            <option value="rating">Rating (Sangat Baik/Baik/Buruk)</option>
                            <option value="text">Open Text</option>
                          </select>
                          <label className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                            <input
                              type="checkbox"
                              checked={ind.required}
                              onChange={e => updateIndicator(ind.id, 'required', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-200 text-blue-600 focus:ring-blue-500"
                            />
                            Required
                          </label>
                        </div>
                      </motion.div>
                    ))}
                    {newSurvey.indicators.length === 0 && (
                      <div className="text-center py-12 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                        <Plus className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">At least one indicator is required.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-8">
                  <button
                    disabled={isLoading || newSurvey.indicators.length === 0}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 disabled:grayscale"
                  >
                    {isLoading ? 'Creating...' : 'Launch Survey'}
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
