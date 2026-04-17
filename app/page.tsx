'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SentinelQA() {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [activeEnv, setActiveEnv] = useState('QA');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
    <main className="min-h-screen bg-[#0F172A] text-slate-200 font-sans">
      {/* 1. BRANDING HEADER */}
      <nav className="bg-[#0F172A] px-8 py-5 flex justify-between items-center border-b border-slate-800 shadow-2xl sticky top-0 z-50">
        <div className="flex items-center gap-5">
          <div className="bg-amber-500 p-2 rounded-xl text-[#0F172A] font-black text-2xl w-12 h-12 flex items-center justify-center shadow-[0_0_20px_rgba(245,158,11,0.3)]">S</div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-white leading-none uppercase">Sentinel <span className="text-amber-500">QA</span></h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-[0.3em] mt-1 font-bold">W2S Solutions • Watchtower</p>
          </div>
        </div>
        <button className="bg-amber-600 hover:bg-amber-500 text-white px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">Export Report</button>
      </nav>

      {/* 2. PRIMARY SECTION NAVIGATION (Dashboard, Reports, Settings) */}
      <div className="bg-[#111827] px-8 border-b border-slate-800/50">
        <div className="flex gap-10">
          {['Dashboard', 'Execution Logs', 'Historical Reports', 'Settings'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`py-5 text-[11px] font-black uppercase tracking-[0.2em] transition-all relative ${
                activeSection === section ? 'text-amber-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {section}
              {activeSection === section && (
                <div className="absolute bottom-0 left-0 w-full h-0.5 bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONDITIONAL CONTENT */}
      <div className="p-8 max-w-7xl mx-auto">
        {activeSection === 'Dashboard' ? (
          <div className="animate-in fade-in duration-500">
            {/* STAGE SELECTOR */}
            <div className="flex gap-4 mb-10">
              {['DEV', 'QA', 'Production'].map((env) => (
                <button
                  key={env}
                  onClick={() => setActiveEnv(env)}
                  className={`px-8 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                    activeEnv === env 
                    ? 'bg-amber-500/10 border-amber-500/50 text-amber-500' 
                    : 'bg-transparent border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  {env} Stage
                </button>
              ))}
            </div>

            {/* KPI METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <KPICard title="Total Tests" value={stats.total} accent="border-slate-700" />
              <KPICard title="Passed" value={stats.passed} color="text-emerald-400" accent="border-emerald-500/30" />
              <KPICard title="Failed" value={stats.failed} color="text-rose-400" accent="border-rose-500/30" />
              <KPICard title="Avg Duration" value={`${stats.avgTime}ms`} accent="border-amber-500/30" />
            </div>

            {/* MAIN TABLE */}
            <div className="bg-[#1E293B]/40 rounded-3xl border border-slate-800 overflow-hidden shadow-2xl backdrop-blur-sm">
              <div className="p-6 border-b border-slate-800 bg-slate-800/20">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Execution Stream: {activeEnv}</h2>
              </div>
              <div className="divide-y divide-slate-800/50">
                {loading ? (
                  <div className="p-20 text-center text-slate-600 font-mono text-sm tracking-widest animate-pulse">Establishing Telemetry...</div>
                ) : filteredData.map((res: any) => (
                  <div key={res.id} className="p-6 flex items-center justify-between hover:bg-slate-800/30 transition-all group">
                    <div className="flex gap-6 items-center">
                      <div className={`w-1 h-12 rounded-full ${res.status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <div>
                        <h4 className="font-bold text-slate-100 text-lg group-hover:text-amber-500 transition-colors">{res.test_cases?.title}</h4>
                        <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-1">{res.test_cases?.suite_name} • {res.test_runs?.run_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[11px] font-black uppercase ${res.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>{res.status}</div>
                      <p className="text-[10px] font-mono text-slate-600 mt-1">{new Date(res.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-[50vh] text-slate-700 opacity-50 border-2 border-dashed border-slate-800 rounded-3xl">
            <p className="text-2xl font-black uppercase tracking-[0.5em]">{activeSection}</p>
            <p className="text-xs mt-4 font-mono">Module integration in progress for W2S Solutions</p>
          </div>
        )}
      </div>
    </main>
  );
}

function KPICard({ title, value, color = "text-white", accent }: any) {
  return (
    <div className={`bg-[#1E293B]/30 p-8 rounded-3xl border border-slate-800 border-l-4 ${accent} shadow-xl hover:-translate-y-1 transition-all`}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-4">{title}</p>
      <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
  );
}