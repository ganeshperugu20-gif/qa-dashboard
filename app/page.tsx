'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SentinelQA() {
  const [activeTab, setActiveTab] = useState('Dashboard');
  const [activeEnv, setActiveEnv] = useState('QA');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State for Manual Input
  const [newTestName, setNewTestName] = useState('');
  const [newStatus, setNewStatus] = useState('passed');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch Function
  async function fetchData() {
    setLoading(true);
    const { data: results, error } = await supabase
      .from('test_results')
      .select(`
        id, status, duration_ms, created_at,
        test_runs ( run_name, environments!env_id ( name ) ),
        test_cases ( title, suite_name )
      `)
      .order('created_at', { ascending: false });
    
    if (error) console.error("Supabase Error:", error);
    else setData(results || []);
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, []);

  // HANDLER: Add Manual Test Case
  const handleAddTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName) return;
    setIsSubmitting(true);

    try {
      // 1. Get the Environment ID for the active tab
      const { data: env } = await supabase.from('environments').select('id').eq('name', activeEnv).single();
      
      // 2. Ensure a "Manual Run" exists for this env
      let { data: run } = await supabase.from('test_runs').select('id').eq('run_name', 'Manual Execution').eq('env_id', env?.id).single();
      if (!run) {
        const { data: newRun } = await supabase.from('test_runs').insert([{ run_name: 'Manual Execution', env_id: env?.id }]).select().single();
        run = newRun;
      }

      // 3. Create the Test Case
      const { data: tCase } = await supabase.from('test_cases').insert([{ title: newTestName, suite_name: 'Manual' }]).select().single();

      // 4. Create the Result
      await supabase.from('test_results').insert([{
        run_id: run?.id,
        test_case_id: tCase?.id,
        status: newStatus,
        duration_ms: Math.floor(Math.random() * 2000) + 500
      }]);

      setNewTestName('');
      fetchData(); // Refresh the counts and list!
    } catch (err) {
      console.error("Submission failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredData = data.filter(res => {
    const envName = res.test_runs?.environments?.name || "";
    return envName.trim().toUpperCase() === activeEnv.toUpperCase();
  });

  const stats = {
    total: filteredData.length,
    passed: filteredData.filter(r => r.status === 'passed').length,
    failed: filteredData.filter(r => r.status === 'failed').length,
    avgTime: filteredData.length > 0 
      ? Math.round(filteredData.reduce((acc, r) => acc + r.duration_ms, 0) / filteredData.length) 
      : 0
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-slate-200 font-sans">
      {/* HEADER */}
      <nav className="bg-[#0B0F1A] px-8 py-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-lg text-[#0B0F1A] font-black text-xl w-10 h-10 flex items-center justify-center">S</div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Sentinel <span className="text-amber-500">QA</span></h1>
        </div>
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">W2S Solutions • Watchtower</div>
      </nav>

      {/* PRIMARY NAVIGATION (TechFlow Style) */}
      <div className="bg-[#111827] px-8 border-b border-slate-800/50 flex gap-6">
        {['Dashboard', 'Execution Logs', 'Test Suites', 'Settings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-amber-500 text-amber-500' : 'border-transparent text-slate-500'}`}>{tab}</button>
        ))}
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        
        {/* ADD TEST FORM (TechFlow Style) */}
        <section className="mb-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
          <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Add Manual Execution</h3>
          <form onSubmit={handleAddTest} className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[300px]">
              <label className="text-[9px] text-slate-500 uppercase font-bold mb-2 block">Test Case Title</label>
              <input 
                type="text" 
                value={newTestName} 
                onChange={(e) => setNewTestName(e.target.value)}
                placeholder="e.g. Verify Login Validation"
                className="w-full bg-[#0F172A] border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase font-bold mb-2 block">Status</label>
              <select 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)}
                className="bg-[#0F172A] border border-slate-700 rounded-lg px-4 py-2.5 text-sm focus:border-amber-500 outline-none"
              >
                <option value="passed">✅ Passed</option>
                <option value="failed">❌ Failed</option>
              </select>
            </div>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all"
            >
              {isSubmitting ? 'Recording...' : '+ Add Result'}
            </button>
          </form>
        </section>

        {/* STAGE SELECTOR */}
        <div className="flex gap-3 mb-8">
          {['DEV', 'QA', 'PROD'].map(env => (
            <button key={env} onClick={() => setActiveEnv(env)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${activeEnv === env ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' : 'border-slate-800 text-slate-600'}`}>{env} Stage</button>
          ))}
        </div>

        {/* KPI METRICS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <KPICard title="Total Tests" value={stats.total} />
          <KPICard title="Passed" value={stats.passed} color="text-emerald-400" />
          <KPICard title="Failed" value={stats.failed} color="text-rose-400" />
          <KPICard title="Success Rate" value={`${stats.total > 0 ? Math.round((stats.passed/stats.total)*100) : 0}%`} />
        </div>

        {/* RECENT ACTIVITY TABLE */}
        <div className="bg-[#1E293B]/20 rounded-2xl border border-slate-800/50 overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-slate-800/20">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Test Stream</h3>
          </div>
          <div className="divide-y divide-slate-800/30">
            {loading ? (
              <div className="p-20 text-center text-slate-600 text-[10px] uppercase tracking-widest animate-pulse">Syncing...</div>
            ) : filteredData.map((res: any) => (
              <div key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-all">
                <div className="flex gap-4 items-center">
                  <div className={`w-1.5 h-1.5 rounded-full ${res.status === 'passed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                  <div>
                    <h4 className="font-bold text-slate-200 text-sm">{res.test_cases?.title}</h4>
                    <p className="text-[9px] text-slate-500 uppercase font-bold mt-1 tracking-wider">{res.test_cases?.suite_name} • {res.test_runs?.run_name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-[10px] font-black uppercase ${res.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>{res.status}</div>
                  <p className="text-[9px] font-mono text-slate-600 mt-1">{new Date(res.created_at).toLocaleTimeString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function KPICard({ title, value, color = "text-white" }: any) {
  return (
    <div className="bg