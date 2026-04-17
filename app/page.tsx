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
  
  // Form State
  const [newTestName, setNewTestName] = useState('');
  const [newStatus, setNewStatus] = useState('passed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

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

  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const { data: env } = await supabase.from('environments').select('id').eq('name', activeEnv).single();
      let { data: run } = await supabase.from('test_runs').select('id').eq('run_name', 'Manual Execution').eq('env_id', env?.id).maybeSingle();

      if (!run) {
        const { data: newRun } = await supabase.from('test_runs').insert([{ run_name: 'Manual Execution', env_id: env?.id }]).select().single();
        run = newRun;
      }

      const { data: tCase } = await supabase.from('test_cases').insert([{ title: newTestName, suite_name: 'Manual' }]).select().single();

      await supabase.from('test_results').insert([{
        run_id: run?.id,
        test_case_id: tCase?.id,
        status: newStatus,
        duration_ms: Math.floor(Math.random() * 1000) + 500
      }]);

      setNewTestName('');
      fetchData(); 
    } catch (err) { console.error(err); } finally { setIsSubmitting(false); }
  };

  // Logic: Filtering & Pagination
  const filteredData = data.filter(res => {
    const envName = res.test_runs?.environments?.name || "";
    return envName.trim().toUpperCase() === activeEnv.toUpperCase();
  });

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = filteredData.slice(startIndex, startIndex + pageSize);

  const stats = {
    total: filteredData.length,
    passed: filteredData.filter(r => r.status === 'passed').length,
    failed: filteredData.filter(r => r.status === 'failed').length,
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

      {/* TECHFLOW TABS */}
      <div className="bg-[#111827] px-8 border-b border-slate-800/50 flex gap-6 overflow-x-auto">
        {['Dashboard', 'Execution Logs', 'Test Suites', 'Settings'].map(tab => (
          <button 
            key={tab} 
            onClick={() => { setActiveTab(tab); setCurrentPage(1); }} 
            className={`py-4 text-[10px] whitespace-nowrap font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {tab === 'Dashboard' ? '📊 ' : tab === 'Execution Logs' ? '📜 ' : tab === 'Test Suites' ? '📁 ' : '⚙️ '}{tab}
          </button>
        ))}
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        
        {activeTab === 'Dashboard' && (
          <div className="animate-in fade-in duration-500">
            {/* MANUAL ADD FORM */}
            <section className="mb-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Manual Test Entry</h3>
              <form onSubmit={handleAddTest} className="flex flex-wrap gap-4 items-end">
                <input type="text" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} placeholder="Test Case Name..." className="flex-1 min-w-[250px] bg-[#0F172A] border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-amber-500" />
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="bg-[#0F172A] border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none">
                  <option value="passed">✅ Passed</option>
                  <option value="failed">❌ Failed</option>
                </select>
                <button type="submit" disabled={isSubmitting} className="bg-amber-600 px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all hover:bg-amber-500">
                  {isSubmitting ? 'Syncing...' : '+ Add Result'}
                </button>
              </form>
            </section>

            {/* STAGE SELECTOR */}
            <div className="flex gap-3 mb-8">
              {['DEV', 'QA', 'PROD'].map(env => (
                <button key={env} onClick={() => { setActiveEnv(env); setCurrentPage(1); }} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${activeEnv === env ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'border-slate-800 text-slate-600'}`}>{env} Stage</button>
              ))}
            </div>

            {/* KPI STATS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
              <StatCard title="Total Executed" value={stats.total} />
              <StatCard title="Passed" value={stats.passed} color="text-emerald-400" />
              <StatCard title="Failed" value={stats.failed} color="text-rose-400" />
            </div>

            {/* PAGINATION CONTROLS */}
            <div className="flex flex-wrap justify-between items-center mb-6 gap-4 bg-slate-900/20 p-4 rounded-xl border border-slate-800/50">
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black text-slate-500 uppercase">View:</span>
                {[5, 10, 20].map((size) => (
                  <button key={size} onClick={() => { setPageSize(size); setCurrentPage(1); }} className={`w-8 h-8 rounded-lg text-[10px] font-black border ${pageSize === size ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-800 text-slate-500'}`}>{size}</button>
                ))}
              </div>
              <div className="flex items-center gap-4">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 bg-slate-800 rounded-lg text-[10px] font-bold uppercase disabled:opacity-20">Prev</button>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Page {currentPage} / {totalPages || 1}</span>
                <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 bg-slate-800 rounded-lg text-[10px] font-bold uppercase disabled:opacity-20">Next</button>
              </div>
            </div>

            {/* TEST STREAM */}
            <div className="bg-[#1E293B]/20 rounded-2xl border border-slate-800/50 overflow-hidden">
              <div className="divide-y divide-slate-800/30">
                {loading ? (
                  <div className="p-10 text-center text-slate-600 text-[10px] uppercase animate-pulse">Syncing Database...</div>
                ) : paginatedData.map((res: any) => (
                  <div key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-800/10">
                    <div className="flex gap-4 items-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${res.status === 'passed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">{res.test_cases?.title}</h4>
                        <p className="text-[9px] text-slate-600 uppercase font-bold tracking-wider">{res.test_runs?.run_name}</p>
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-slate-500">{new Date(res.created_at).toLocaleTimeString()}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* --- PLACEHOLDERS FOR OTHER TABS --- */}
        {activeTab !== 'Dashboard' && (
          <div className="p-20 text-center border-2 border-dashed border-slate-800 rounded-3xl opacity-30">
            <p className="text-xl font-black uppercase tracking-[0.4em]">{activeTab}</p>
            <p className="text-[10px] mt-2 font-mono uppercase tracking-widest">Data available in Dashboard Stream</p>
          </div>
        )}
      </div>
    </main>
  );
}

function StatCard({ title, value, color = "text-white" }: any) {
  return (
    <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800 text-center">
      <p className="text-[9px] font-black text-slate-500 uppercase mb-2">{title}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}