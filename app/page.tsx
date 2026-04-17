'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

export default function SentinelQA() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [activeEnv, setActiveEnv] = useState('QA');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Pagination State
  const [statusFilter, setStatusFilter] = useState('all'); 
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Form State - Now starts with an empty status
  const [newTestName, setNewTestName] = useState('');
  const [newStatus, setNewStatus] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: results, error } = await supabase
        .from('test_results')
        .select(`
          id, status, duration_ms, created_at,
          test_runs ( run_name, environments!env_id ( name ) ),
          test_cases ( title, suite_name )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setData(results || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, []);

  // Filter Logic
  const filteredData = data.filter(res => {
    const envMatch = (res.test_runs?.environments?.name || "").trim().toUpperCase() === activeEnv.toUpperCase();
    const statusMatch = statusFilter === 'all' || res.status === statusFilter;
    return envMatch && statusMatch;
  });

  // KPI Calculations
  const stats = {
    total: data.filter(r => (r.test_runs?.environments?.name || "").trim().toUpperCase() === activeEnv.toUpperCase()).length,
    passed: data.filter(r => (r.test_runs?.environments?.name || "").trim().toUpperCase() === activeEnv.toUpperCase() && r.status === 'passed').length,
    failed: data.filter(r => (r.test_runs?.environments?.name || "").trim().toUpperCase() === activeEnv.toUpperCase() && r.status === 'failed').length,
  };

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = filteredData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    // Safety Check: Name and Status must exist
    if (!newTestName || !newStatus || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const { data: env } = await supabase.from('environments').select('id').eq('name', activeEnv).single();
      let { data: run } = await supabase.from('test_runs').select('id').eq('run_name', 'Manual Execution').eq('env_id', env?.id).maybeSingle();
      if (!run) {
        const { data: newRun } = await supabase.from('test_runs').insert([{ run_name: 'Manual Execution', env_id: env?.id }]).select().single();
        run = newRun;
      }
      const { data: tCase } = await supabase.from('test_cases').insert([{ title: newTestName, suite_name: 'Manual' }]).select().single();
      await supabase.from('test_results').insert([{ run_id: run?.id, test_case_id: tCase?.id, status: newStatus, duration_ms: 500 }]);
      
      // Reset form
      setNewTestName('');
      setNewStatus('');
      fetchData();
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-slate-200">
      {/* HEADER */}
      <nav className="bg-[#0B0F1A] px-8 py-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-lg text-[#0B0F1A] font-black text-xl w-10 h-10 flex items-center justify-center">S</div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic text-white">Sentinel <span className="text-amber-500">QA</span></h1>
        </div>
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">W2S Solutions • Internal Tools</div>
      </nav>

      {/* TABS */}
      <div className="bg-[#111827] px-8 border-b border-slate-800/50 flex gap-6 overflow-x-auto">
        {['Dashboard', 'Execution Logs'].map(tab => (
          <button key={tab} onClick={() => { setActiveTab(tab); setStatusFilter('all'); setCurrentPage(1); }} 
            className={`py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-slate-500'}`}>
            {tab}
          </button>
        ))}
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        {activeTab === 'Dashboard' && (
          <div className="animate-in fade-in duration-500">
            
            {/* STAGE SELECTOR */}
            <div className="flex gap-3 mb-6">
              {['DEV', 'QA', 'PROD'].map(env => (
                <button key={env} onClick={() => { setActiveEnv(env); setCurrentPage(1); }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${activeEnv === env ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'border-slate-800 text-slate-600'}`}>{env} Stage</button>
              ))}
            </div>

            {/* MANUAL FORM - UPDATED WITH PLACEHOLDER */}
            <form onSubmit={handleManualAdd} className="mb-10 flex gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800 shadow-xl shadow-black/20">
              <input 
                type="text" 
                value={newTestName} 
                onChange={(e) => setNewTestName(e.target.value)} 
                placeholder="Enter test case name..." 
                className="flex-1 bg-[#0F172A] border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-amber-500 transition-all" 
              />
              <select 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)} 
                className={`bg-[#0F172A] border rounded-lg px-4 py-2 text-sm outline-none transition-all ${newStatus === '' ? 'border-slate-700 text-slate-500' : 'border-amber-500 text-white'}`}
              >
                <option value="" disabled>Select Status</option>
                <option value="passed" className="text-emerald-400">✅ Passed</option>
                <option value="failed" className="text-rose-400">❌ Failed</option>
              </select>
              <button 
                type="submit"
                disabled={!newTestName || !newStatus || isSubmitting}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${(!newTestName || !newStatus) ? 'bg-slate-800 text-slate-600 cursor-not-allowed' : 'bg-amber-600 text-white hover:bg-amber-500 hover:scale-105 active:scale-95'}`}
              >
                {isSubmitting ? 'Syncing...' : 'Add Execution'}
              </button>
            </form>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <button onClick={() => { setStatusFilter('all'); setCurrentPage(1); }} className={`p-6 rounded-xl border transition-all text-center ${statusFilter === 'all' ? 'bg-slate-800 border-slate-400' : 'bg-slate-900/40 border-slate-800 hover:border-slate-600'}`}>
                <p className="text-[9px] font-black text-slate-500 uppercase mb-2">Total Executed</p>
                <p className="text-3xl font-black text-white">{stats.total}</p>
              </button>
              <button onClick={() => { setStatusFilter('passed'); setCurrentPage(1); }} className={`p-6 rounded-xl border transition-all text-center ${statusFilter === 'passed' ? 'bg-emerald-900/20 border-emerald-500' : 'bg-slate-900/40 border-slate-800 hover:border-emerald-900/50'}`}>
                <p className="text-[9px] font-black text-emerald-500 uppercase mb-2">Passed</p>
                <p className="text-3xl font-black text-emerald-400">{stats.passed}</p>
              </button>
              <button onClick={() => { setStatusFilter('failed'); setCurrentPage(1); }} className={`p-6 rounded-xl border transition-all text-center ${statusFilter === 'failed' ? 'bg-rose-900/20 border-rose-500' : 'bg-slate-900/40 border-slate-800 hover:border-rose-900/50'}`}>
                <p className="text-[9px] font-black text-rose-500 uppercase mb-2">Failed</p>
                <p className="text-3xl font-black text-rose-400">{stats.failed}</p>
              </button>
            </div>

            {/* PAGINATION HEADER */}
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                {statusFilter === 'all' ? 'All Results' : `${statusFilter} results`} for {activeEnv}
              </h3>
              <div className="flex items-center gap-4">
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="bg-transparent text-[10px] font-bold uppercase text-slate-500 outline-none">
                  <option value={5}>Show 5</option>
                  <option value={10}>Show 10</option>
                  <option value={20}>Show 20</option>
                </select>
                <div className="flex gap-2">
                  <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="w-8 h-8 rounded bg-slate-800 text-[10px] disabled:opacity-20 hover:bg-slate-700 transition-all">←</button>
                  <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="w-8 h-8 rounded bg-slate-800 text-[10px] disabled:opacity-20 hover:bg-slate-700 transition-all">→</button>
                </div>
              </div>
            </div>

            {/* LIST STREAM */}
            <div className="bg-slate-900/20 rounded-2xl border border-slate-800 overflow-hidden divide-y divide-slate-800/50 shadow-2xl shadow-black/40">
              {loading ? <div className="p-10 text-center animate-pulse text-[10px] uppercase tracking-widest text-slate-600">Syncing Sentinel Core...</div> :
                paginatedData.map((res: any) => (
                  <div key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-all group">
                    <div className="flex gap-4 items-center">
                      <div className={`w-2 h-2 rounded-full ${res.status === 'passed' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'}`} />
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm group-hover:text-white transition-all">{res.test_cases?.title}</h4>
                        <p className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">{res.test_runs?.run_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-mono text-slate-500">{new Date(res.created_at).toLocaleTimeString()}</p>
                      {res.duration_ms && <p className="text-[8px] text-slate-700 font-mono mt-1">{res.duration_ms}ms</p>}
                    </div>
                  </div>
                ))}
              {paginatedData.length === 0 && !loading && <div className="p-20 text-center text-slate-700 text-[10px] uppercase tracking-widest italic">No matching results in {activeEnv} environment</div>}
            </div>
          </div>
        )}

        {/* EXECUTION LOGS TAB */}
        {activeTab === 'Execution Logs' && (
          <div className="animate-in slide-in-from-bottom-4 duration-500">
             <div className="bg-slate-900/20 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
               <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-800/50">
                    <tr className="border-b border-slate-700">
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Status</th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Case</th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Env</th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Duration</th>
                      <th className="p-4 text-[9px] font-black uppercase text-slate-500 tracking-widest">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {filteredData.map((res: any) => (
                      <tr key={res.id} className="hover:bg-slate-800/20 transition-all">
                        <td className="p-4"><span className={`px-2 py-1 rounded-[4px] text-[8px] font-black uppercase ${res.status === 'passed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{res.status}</span></td>
                        <td className="p-4"><p className="text-sm font-bold text-slate-300">{res.test_cases?.title}</p></td>
                        <td className="p-4 text-[10px] font-mono text-slate-500 uppercase">{res.test_runs?.environments?.name}</td>
                        <td className="p-4 text-[10px] font-mono text-slate-600">{res.duration_ms}ms</td>
                        <td className="p-4 text-[10px] text-slate-600">{new Date(res.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
               </table>
             </div>
          </div>
        )}
      </div>
    </main>
  );
}