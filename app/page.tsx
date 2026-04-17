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

  // Define your professional QA modules
  const navItems = [
    { name: 'Dashboard', icon: '📊' },
    { name: 'Execution Logs', icon: '📜' },
    { name: 'Test Suites', icon: '📁' },
    { name: 'Historical Trends', icon: '📈' },
    { name: 'Settings', icon: '⚙️' },
    { name: 'Documentation', icon: '📑' }
  ];

  useEffect(() => {
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
    fetchData();
  }, []);

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
      {/* 1. TOP BRANDING BAR */}
      <nav className="bg-[#0B0F1A] px-8 py-4 flex justify-between items-center border-b border-slate-800 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="bg-amber-500 p-2 rounded-lg text-[#0B0F1A] font-black text-xl w-10 h-10 flex items-center justify-center">S</div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white uppercase italic">Sentinel <span className="text-amber-500">QA</span></h1>
            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">W2S Solutions • Internal Tools</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-full border border-slate-800">API Status: Online</span>
          <button className="bg-amber-600 hover:bg-amber-500 text-white px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-lg">Export Report</button>
        </div>
      </nav>

      {/* 2. SECONDARY NAVIGATION (TechFlow Style) */}
      <div className="bg-[#111827] px-8 border-b border-slate-800/50 overflow-x-auto">
        <div className="flex gap-2">
          {navItems.map((item) => (
            <button
              key={item.name}
              onClick={() => setActiveTab(item.name)}
              className={`py-4 px-4 text-[10px] font-bold uppercase tracking-[0.15em] transition-all flex items-center gap-2 whitespace-nowrap border-b-2 ${
                activeTab === item.name 
                ? 'text-amber-500 border-amber-500 bg-amber-500/5' 
                : 'text-slate-500 border-transparent hover:text-slate-300 hover:bg-slate-800/30'
              }`}
            >
              <span>{item.icon}</span>
              {item.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. DYNAMIC CONTENT AREA */}
      <div className="p-8 max-w-7xl mx-auto">
        
        {activeTab === 'Dashboard' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* SUB-HEADER DESCRIPTION */}
            <div className="mb-8 border-l-2 border-amber-500/30 pl-4 py-1">
              <h2 className="text-sm font-bold text-slate-300">{activeTab}</h2>
              <p className="text-[10px] text-slate-500 mt-1 italic">Real-time telemetry stream from Playwright automated regression suites.</p>
            </div>

            {/* STAGE SELECTOR */}
            <div className="flex gap-3 mb-8">
              {['DEV', 'QA', 'PROD'].map((env) => (
                <button
                  key={env}
                  onClick={() => setActiveEnv(env)}
                  className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all ${
                    activeEnv === env 
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                    : 'bg-transparent border-slate-800 text-slate-600 hover:border-slate-700'
                  }`}
                >
                  {env} Stage
                </button>
              ))}
            </div>

            {/* KPI METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
              <KPICard title="Total Executed" value={stats.total} />
              <KPICard title="Passed" value={stats.passed} color="text-emerald-400" />
              <KPICard title="Failed" value={stats.failed} color="text-rose-400" />
              <KPICard title="Success Rate" value={`${stats.total > 0 ? Math.round((stats.passed/stats.total)*100) : 0}%`} />
            </div>

            {/* MAIN TABLE */}
            <div className="bg-[#1E293B]/20 rounded-2xl border border-slate-800/50 overflow-hidden">
              <div className="p-4 border-b border-slate-800 bg-slate-800/20">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Recent Test Activity</h3>
              </div>
              <div className="divide-y divide-slate-800/30">
                {loading ? (
                  <div className="p-20 text-center text-slate-600 animate-pulse text-[10px] uppercase tracking-widest">Scanning Stream...</div>
                ) : filteredData.map((res: any) => (
                  <div key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-800/20 transition-all group">
                    <div className="flex gap-4 items-center">
                      <div className={`w-1.5 h-1.5 rounded-full ${res.status === 'passed' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]'}`} />
                      <div>
                        <h4 className="font-bold text-slate-200 text-sm">{res.test_cases?.title}</h4>
                        <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mt-1">{res.test_cases?.suite_name} • {res.test_runs?.run_name}</p>
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
        ) : (
          /* PLACEHOLDER FOR OTHER MODULES */
          <div className="flex flex-col items-center justify-center h-[50vh] border-2 border-dashed border-slate-800 rounded-3xl opacity-30">
            <span className="text-4xl mb-4">{navItems.find(i => i.name === activeTab)?.icon}</span>
            <p className="text-xl font-black uppercase tracking-[0.4em]">{activeTab} Module</p>
            <p className="text-[10px] mt-2 font-mono uppercase">Initialization Pending for {activeTab}</p>
          </div>
        )}
      </div>
    </main>
  );
}

function KPICard({ title, value, color = "text-white" }: any) {
  return (
    <div className="bg-[#1E293B]/10 p-6 rounded-2xl border border-slate-800 hover:border-slate-700 transition-all">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-3">{title}</p>
      <p className={`text-3xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}