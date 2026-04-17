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

  const filteredData = data.filter(res => {
    const envName = res.test_runs?.environments?.name || "";
    return envName.trim().toUpperCase() === activeEnv.toUpperCase();
  });

  const stats = {
    total: filteredData.length,
    passed: filteredData.filter(r => r.status === 'passed').length,
    failed: filteredData.filter(r => r.status === 'failed').length,
    avgTime: filteredData.length > 0 ? Math.round(filteredData.reduce((acc, r) => acc + r.duration_ms, 0) / filteredData.length) : 0
  };

  return (
    <main className="min-h-screen bg-[#0B0F1A] text-slate-200">
      {/* HEADER */}
      <nav className="bg-[#0B0F1A] px-8 py-4 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-lg text-[#0B0F1A] font-black text-xl w-10 h-10 flex items-center justify-center">S</div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">Sentinel <span className="text-amber-500">QA</span></h1>
        </div>
        <div className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">W2S Solutions • Watchtower</div>
      </nav>

      {/* TECHFLOW STYLE TABS */}
      <div className="bg-[#111827] px-8 border-b border-slate-800/50 flex gap-6 overflow-x-auto">
        {['Dashboard', 'Execution Logs', 'Test Suites', 'Settings'].map(tab => (
          <button 
            key={tab} 
            onClick={() => setActiveTab(tab)} 
            className={`py-4 text-[10px] whitespace-nowrap font-bold uppercase tracking-widest border-b-2 transition-all ${activeTab === tab ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-slate-500 hover:text-slate-300'}`}
          >
            {tab === 'Dashboard' ? '📊 ' : tab === 'Execution Logs' ? '📜 ' : tab === 'Test Suites' ? '📁 ' : '⚙️ '}
            {tab}
          </button>
        ))}
      </div>

      <div className="p-8 max-w-7xl mx-auto">
        
        {/* DASHBOARD VIEW */}
        {activeTab === 'Dashboard' && (
          <div className="animate-in fade-in duration-500">
            <section className="mb-10 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
              <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-4">Quick Add Test Result</h3>
              <form onSubmit={handleAddTest} className="flex flex-wrap gap-4 items-end">
                <input type="text" value={newTestName} onChange={(e) => setNewTestName(e.target.value)} placeholder="Enter Test Case Title..." className="flex-1 min-w-[250px] bg-[#0F172A] border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:border-amber-500" />
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className="bg-[#0F172A] border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none">
                  <option value="passed">✅ Passed</option>
                  <option value="failed">❌ Failed</option>
                </select>
                <button type="submit" disabled={isSubmitting} className="bg-amber-600 px-8 py-2 rounded-lg text-[10px] font-black uppercase transition-all hover:bg-amber-500">
                  {isSubmitting ? 'Syncing...' : '+ Add Execution'}
                </button>
              </form>
            </section>

            <div className="flex gap-3 mb-8">
              {['DEV', 'QA', 'PROD'].map(env => (
                <button key={env} onClick={() => setActiveEnv(env)} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${activeEnv === env ? 'bg-amber-500/10 border-amber-500 text-amber-500' : 'border-slate-800 text-slate-600'}`}>{env} Stage</button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              <StatBox title="Total" value={stats.total} />
              <StatBox title="Passed" value={stats.passed} color="text-emerald-400" />
              <StatBox title="Failed" value={stats.failed} color="text-rose-400" />
              <StatBox title="Success Rate" value={`${stats.total > 0 ? Math.round((stats.passed/stats.total)*100) : 0}%`} />
            </div>
            
            <div className="bg-[#1E293B]/20 rounded-2xl border border-slate-800/50 overflow-hidden">
               <div className="p-4 border-b border-slate-800 bg-slate-800/10 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Test Stream</div>
               <div className="divide-y divide-slate-800/30">
                  {filteredData.slice(0, 5).map((res: any) => (
                    <div key={res.id} className="p-4 flex items-center justify-between hover:bg-slate-800/20">
                      <div className="flex gap-4 items-center">
                        <div className={`w-1.5 h-1.5 rounded-full ${res.status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div>
                          <p className="font-bold text-sm">{res.test_cases?.title}</p>
                          <p className="text-[9px] text-slate-600 uppercase font-bold">{res.test_runs?.run_name}</p>
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono">{new Date(res.created_at).toLocaleTimeString()}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        )}

        {/* EXECUTION LOGS VIEW */}
        {activeTab === 'Execution Logs' && (
          <div className="bg-[#1E293B]/20 rounded-2xl border border-slate-800 overflow-hidden animate-in slide-in-from-right-4 duration-300">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-800/50 text-[10px] uppercase text-slate-500 font-black">
                <tr>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4">Test Case</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-xs">
                {filteredData.map((res: any) => (
                  <tr key={res.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="p-4 text-slate-500 font-mono">{new Date(res.created_at).toLocaleString()}</td>
                    <td className="p-4 font-bold">{res.test_cases?.title}</td>
                    <td className={`p-4 font-black uppercase ${res.status === 'passed' ? 'text-emerald-500' : 'text-rose-500'}`}>{res.status}</td>
                    <td className="p-4 text-right font-mono text-slate-600">{res.duration_ms}ms</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TEST SUITES VIEW */}
        {activeTab === 'Test Suites' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in zoom-in-95 duration-300">
            {Array.from(new Set(filteredData.map(r => r.test_cases?.title))).map((title: any) => (
              <div key={title} className="bg-slate-900/40 p-5 rounded-xl border border-slate-800 flex justify-between items-center">
                <div>
                  <p className="text-sm font-bold">{title}</p>
                  <p className="text-[9px] text-slate-500 uppercase mt-1">Status: Active</p>
                </div>
                <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-lg">📄</div>
              </div>
            ))}
          </div>
        )}

        {/* SETTINGS VIEW */}
        {activeTab === 'Settings' && (
          <div className="max-w-2xl bg-slate-900/40 p-8 rounded-2xl border border-slate-800">
            <h2 className="text-xl font-black mb-6 italic uppercase">System Configuration</h2>
            <div className="space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <div>
                  <p className="font-bold">Auto-Refresh Stream</p>
                  <p className="text-[10px] text-slate-500">Update telemetry every 30 seconds</p>
                </div>
                <div className="w-10 h-5 bg-emerald-500 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" /></div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-bold">Database Instance</p>
                  <p className="text-[10px] text-slate-500">Connected to: mdfovmakdluotpoahopu</p>
                </div>
                <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded font-bold uppercase">Healthy</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function StatBox({ title, value, color = "text-white" }: any) {
  return (
    <div className="bg-slate-900/40 p-6 rounded-xl border border-slate-800">
      <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">{title}</p>
      <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}