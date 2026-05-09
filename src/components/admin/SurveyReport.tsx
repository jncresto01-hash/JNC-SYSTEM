import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Survey, Response } from '../../types';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { 
  ArrowLeft, Download, FileText, Calendar, 
  MessageSquare, Users, Star, TrendingUp, Filter, FileSpreadsheet, FileJson,
  Image as ImageIcon
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay, subDays } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import 'jspdf-autotable';

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
const RATING_LABELS: Record<number, string> = {
  5: 'Sangat Baik',
  3: 'Baik',
  1: 'Buruk'
};

export default function SurveyReport() {
  const { surveyId } = useParams();
  const navigate = useNavigate();
  const [survey, setSurvey] = useState<Survey | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [loading, setLoading] = useState(true);
  const [analysis, setAnalysis] = useState<any>(null);
  const [dateRange, setDateRange] = useState({
    start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });

  const chartRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    fetchData();
  }, [surveyId, dateRange]);

  const fetchData = async () => {
    if (!surveyId) return;
    const surveySnap = await getDoc(doc(db, 'surveys', surveyId));
    if (!surveySnap.exists()) return;
    const surveyData = { id: surveySnap.id, ...surveySnap.data() } as Survey;
    setSurvey(surveyData);

    const responsesSnap = await getDocs(
      query(collection(db, 'responses'), where('surveyId', '==', surveyId), orderBy('submittedAt', 'desc'))
    );
    const allList = responsesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Response));
    
    // Filter by date
    const list = allList.filter(r => {
      const date = new Date(r.submittedAt?.seconds * 1000 || Date.now());
      return isWithinInterval(date, {
        start: startOfDay(new Date(dateRange.start)),
        end: endOfDay(new Date(dateRange.end))
      });
    });

    setResponses(list);
    
    // Process analysis
    const indicators = surveyData.indicators;
    const report: any = {
      avgScores: [],
      textAnswers: [],
      totalCount: list.length,
      deviceSplit: [
        { name: 'Mobile', value: list.filter(r => r.metadata?.device === 'Mobile').length },
        { name: 'Desktop', value: list.filter(r => r.metadata?.device === 'Desktop').length },
      ].filter(d => d.value > 0)
    };

    indicators?.forEach(ind => {
      if (ind.type === 'rating') {
        const scores = list.map(r => r.answers[ind.id] as number).filter(s => s != null);
        const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        report.avgScores.push({
          id: ind.id,
          label: ind.label,
          avg: Number(avg.toFixed(1)),
          distribution: [3, 2, 1].map(v => ({
            name: RATING_LABELS[v],
            count: scores.filter(s => s === v).length,
            val: v
          }))
        });
      } else {
        const answers = list.map(r => ({ 
          text: r.answers[ind.id] as string, 
          date: r.submittedAt?.seconds ? format(new Date(r.submittedAt.seconds * 1000), 'MMM dd, h:mm a') : 'Now'
        })).filter(a => a.text && a.text.trim().length > 0);
        report.textAnswers.push({ label: ind.label, list: answers });
      }
    });

    setAnalysis(report);
    setLoading(false);
  };

  const exportChartAsImage = async (indId: string, label: string) => {
    const node = chartRefs.current[indId];
    if (!node) return;

    try {
      // Find the specific container for the chart inside the card, 
      // or just capture the whole card for context including labels and average
      const dataUrl = await toPng(node, { 
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: {
          borderRadius: '0px' // for export we might want clean edges
        }
      });
      
      const link = document.createElement('a');
      link.download = `Chart_${label.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error exporting image:', err);
      alert('Gagal mengekspor gambar chart.');
    }
  };

  const exportToExcel = () => {
    if (!survey || responses.length === 0) return;
    
    const data = responses.map(r => {
      const row: any = {
        'Submitted At': format(new Date(r.submittedAt?.seconds * 1000), 'yyyy-MM-dd HH:mm:ss'),
        'Customer Name': r.customerName || 'Anonymous',
        'Customer Phone': r.customerPhone || 'N/A',
        'Suggestions': r.suggestions || '',
        'Device': r.metadata?.device || 'Unknown',
      };
      survey.indicators.forEach(ind => {
        const val = r.answers[ind.id];
        row[ind.label] = ind.type === 'rating' ? RATING_LABELS[val as number] || val : val;
      });
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Responses');
    XLSX.writeFile(wb, `${survey.title.replace(/\s+/g, '_')}_Report.xlsx`);
  };

  const exportToPDF = () => {
    if (!survey || responses.length === 0) return;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text(survey.title, 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Report generated: ${format(new Date(), 'PPP')}`, 14, 30);
    doc.text(`Period: ${dateRange.start} to ${dateRange.end}`, 14, 37);
    doc.text(`Total Responses: ${responses.length}`, 14, 44);

    const headers = ['Date', 'Name', 'Phone', ...survey.indicators.map(i => i.label), 'Suggestions'];
    const body = responses.map(r => [
      format(new Date(r.submittedAt?.seconds * 1000), 'yyyy-MM-dd HH:mm'),
      r.customerName || '-',
      r.customerPhone || '-',
      ...survey.indicators.map(ind => {
        const val = r.answers[ind.id];
        return ind.type === 'rating' ? RATING_LABELS[val as number] || val : val;
      }),
      r.suggestions || '-'
    ]);

    (doc as any).autoTable({
      head: [headers],
      body: body,
      startY: 55,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillStyle: '#2563EB' }
    });

    doc.save(`${survey.title.replace(/\s+/g, '_')}_Report.pdf`);
  };

  const exportToJSON = () => {
    if (!survey || responses.length === 0) return;
    
    const data = {
      survey: {
        id: survey.id,
        title: survey.title,
        indicators: survey.indicators
      },
      period: dateRange,
      totalResponses: responses.length,
      responses: responses.map(r => ({
        id: r.id,
        submittedAt: r.submittedAt?.seconds ? new Date(r.submittedAt.seconds * 1000).toISOString() : null,
        customerName: r.customerName,
        customerPhone: r.customerPhone,
        suggestions: r.suggestions,
        device: r.metadata?.device || 'Unknown',
        answers: r.answers
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${survey.title.replace(/\s+/g, '_')}_Report.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) return <div>Loading report...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button 
          onClick={() => navigate('/admin/surveys')}
          className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-500 hover:text-gray-900 shadow-sm self-start"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-3xl font-bold text-gray-900 truncate">{survey?.title}</h2>
          <p className="text-gray-500">Analytics report for {responses.length} responses</p>
        </div>
        
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
            Excel
          </button>
          <button 
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <FileText className="w-4 h-4 text-red-600" />
            PDF
          </button>
          <button 
            onClick={exportToJSON}
            className="flex items-center gap-2 px-4 py-3 bg-white border border-gray-100 rounded-2xl font-bold text-gray-700 hover:bg-gray-50 shadow-sm"
          >
            <FileJson className="w-4 h-4 text-purple-600" />
            JSON
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Audience Summary</p>
          <div className="space-y-8">
            <div className="flex flex-col">
              <span className="text-4xl font-black text-gray-900">{analysis?.totalCount}</span>
              <span className="text-sm font-medium text-gray-500 mt-1">Total Submissions</span>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analysis?.deviceSplit}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analysis?.deviceSplit.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 text-xs font-bold text-gray-500">
              {analysis?.deviceSplit.map((d: any, i: number) => (
                <div key={d.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  {d.name.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          {analysis?.avgScores.map((score: any) => (
            <div 
              key={score.id} 
              ref={el => chartRefs.current[score.id] = el}
              className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm group"
            >
              <div className="flex items-start justify-between mb-8">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{score.label}</h3>
                    <button 
                      onClick={() => exportChartAsImage(score.id, score.label)}
                      className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="Simpan sebagai gambar"
                    >
                      <ImageIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(score.avg) ? 'text-blue-600 fill-blue-600' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <span className="text-sm font-bold text-blue-600">{score.avg} average</span>
                  </div>
                </div>
                <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black">
                  {score.avg}
                </div>
              </div>

              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={score.distribution}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#FAFAFA" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#9CA3AF' }} />
                    <YAxis hide />
                    <Tooltip cursor={{ fill: '#F9FAFB' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {score.distribution.map((d: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={d.val === 3 ? '#10B981' : d.val === 2 ? '#2563EB' : '#EF4444'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-8">
        <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          Recent Feedback & Customer Data
        </h3>
        <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Phone</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Scores (Avg)</th>
                  <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Suggestions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {responses.map((r) => {
                  const scores = Object.values(r.answers).filter(v => typeof v === 'number') as number[];
                  const avg = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
                  
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-gray-900">
                          {format(new Date(r.submittedAt?.seconds * 1000), 'MMM dd, yyyy')}
                        </div>
                        <div className="text-[10px] font-medium text-gray-400">
                          {format(new Date(r.submittedAt?.seconds * 1000), 'HH:mm')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-black">
                            {r.customerName?.charAt(0) || '?'}
                          </div>
                          <span className="text-sm font-bold text-gray-700">{r.customerName || 'Anonymous'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-gray-50">
                        <span className="text-sm font-mono font-medium text-gray-500">{r.customerPhone || '-'}</span>
                      </td>
                      <td className="px-6 py-4 border-l border-gray-50">
                        <div className="flex items-center gap-2">
                          <div className={`px-2 py-1 rounded-lg text-xs font-black
                            ${Number(avg) >= 4 ? 'bg-green-50 text-green-600' : Number(avg) >= 3 ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}
                          `}>
                            {avg}
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map(s => (
                              <Star key={s} className={`w-2 h-2 ${s <= Math.round(Number(avg)) ? 'text-blue-600 fill-blue-600' : 'text-gray-200'}`} />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 border-l border-gray-50">
                        <p className="text-sm text-gray-600 italic line-clamp-1 max-w-xs">{r.suggestions || '-'}</p>
                      </td>
                    </tr>
                  );
                })}
                {responses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic">No responses found for this period.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {analysis?.textAnswers.length > 0 && (
        <div className="pt-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">Qualitative Feedback</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {analysis?.textAnswers.map((group: any) => (
              <div key={group.label} className="space-y-4">
                <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest pl-2">{group.label}</h4>
                <div className="space-y-3">
                  {group.list.map((ans: any, i: number) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <p className="text-gray-700 leading-relaxed italic">"{ans.text}"</p>
                      <div className="mt-4 flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Anonymous User</span>
                        <span>{ans.date}</span>
                      </div>
                    </div>
                  ))}
                  {group.list.length === 0 && (
                    <p className="text-sm text-gray-400 italic pl-2">No responses for this field yet.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
