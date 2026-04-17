'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TechFlowIndia() {
  const [activeSection, setActiveSection] = useState('Dashboard'); // Main Sections
  const [activeEnv, setActiveEnv] = useState('QA'); // Sub-sections
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: results } = await supabase
        .from('test_results')
        .select(`
          id, status, duration_ms,
          test_runs ( run_name, environments ( name ) ),
          test_cases ( title, suite_name )
        `)
        .order('created_at', { ascending: false });
      
      if (results) setData(results);
      setLoading(false);
    }
    fetchData();
  }, []);

  const filteredData = data.filter(res => 
    res.test_runs?.environments?.name === activeEnv
  );

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
      {/* 1. TOP BRANDING BAR */}
      <nav className="bg-[#1E293B] px-8 py-3 flex justify-between items-center border-b border-slate-800">
        <div className="flex items-center gap-4">
          <div className="bg-orange-600 p-2 rounded text-white font-black text-xl">T</div>
          <h1 className="text-xl font-bold tracking-tight text-white italic">TechFlow <span className="text-orange-500 font-normal not-italic">India</span></h1>
        </div>
        <button className="bg-orange-500 hover:bg-orange-600 text-white px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg shadow-orange-900/20">
          Export CSV
        </button>
      </nav>

      {/* 2. PRIMARY SECTION NAVIGATION (Dashboard, Reports, etc) */}
      <div className="bg-[#111827] px-8 border-b border-slate-800">
        <div className="flex gap-10">
          {['Dashboard', 'Execution Logs', 'Reports', 'Settings'].map((section) => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`py-4 text-xs font-black uppercase tracking-widest transition-all relative ${
                activeSection === section ? 'text-orange-500' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {section}
              {activeSection === section && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-500 rounded-t-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 3. CONDITIONAL CONTENT */}
      {activeSection === 'Dashboard' ? (
        <div className="p-8 max-w-7xl mx-auto">
          
          {/* ENVIRONMENT SUB-NAV */}
          <div className="flex gap-4 mb-8">
            {['DEV', 'QA', 'Production'].map((env) => (
              <button
                key={env}
                onClick={() => setActiveEnv(env)}
                className={`px-6 py-2 rounded-full text-xs font-bold border transition-all ${
                  activeEnv === env 
                  ? 'bg-orange-500/10 border-orange-500 text-orange-500' 
                  : 'bg-transparent border-slate-700 text-slate-500 hover:border-slate-500'
                }`}
              >
                {env} Environment
              </button>
            ))}
          </div>

          {/* KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <KPICard title="Total Tests" value={stats.total} accent="border-blue-500" />
            <KPICard title="Passed" value={stats.passed} color="text-emerald-400" accent="border-emerald-500" />
            <KPICard title="Failed" value={stats.failed} color="text-rose-400" accent="border-rose-500" />
            <KPICard title="Avg Duration" value={`${stats.avgTime}ms`} accent="border-orange-500" />
          </div>

          {/* ACTIVITY TABLE */}
          <div className="bg-[#1E293B] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-800 bg-slate-800/40">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Recent Activity: {activeEnv}
              </h2>
            </div>
            <div className="divide-y divide-slate-800">
              {loading ? (
                <div className="p-20 text-center animate-pulse text-slate-600">Syncing with Supabase...</div>
              ) : filteredData.map((res: any) => (
                <div key={res.id} className="p-6 flex items-center justify-between hover:bg-slate-800/40 transition-all group">
                  <div className="flex gap-5 items-center">
                    <div className={`w-1 h-10 rounded-full ${res.status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div>
                      <h4 className="font-bold text-slate-100 group-hover:text-orange-400 transition-colors">{res.test_cases?.title}</h4>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter mt-1">
                        {res.test_cases?.suite_name} • {res.test_runs?.run_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-[10px] font-black uppercase ${res.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {res.status}
                    </div>
                    <div className="text-xs font-mono text-slate-600 mt-1">{res.duration_ms}ms</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-[60vh] text-slate-600">
          <p className="text-xl font-bold uppercase tracking-[0.3em]">Section: {activeSection}</p>
          <p className="text-sm mt-2 italic">Module under development at W2S Solutions</p>
        </div>
      )}
    </main>
  );
}

function KPICard({ title, value, color = "text-white", accent }: { title: string, value: string | number, color?: string, accent: string }) {
  return (
    <div className={`bg-[#1E293B] p-6 rounded-2xl border-l-4 ${accent} shadow-xl hover:translate-y-[-4px] transition-all`}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">{title}</p>
      <p className={`text-4xl font-black ${color}`}>{value}</p>
    </div>
  );
}