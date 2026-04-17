'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TechFlowDashboard() {
  const [activeEnv, setActiveEnv] = useState('QA');
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

  // Filter data based on the active tab
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
      {/* Header Area */}
      <nav className="bg-[#1E293B] border-b border-slate-800 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-orange-500 p-2 rounded text-white font-bold">T</div>
          <h1 className="text-xl font-bold tracking-tight text-white italic">TechFlow <span className="text-orange-500 font-normal not-italic">India</span></h1>
        </div>
        <div className="flex gap-2">
          <button className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all">Export CSV</button>
        </div>
      </nav>

      {/* Navigation Tabs (DEV, QA, PROD) */}
      <div className="bg-[#1E293B] border-b border-slate-800 px-8">
        <div className="flex gap-8">
          {['DEV', 'QA', 'Production'].map((env) => (
            <button
              key={env}
              onClick={() => setActiveEnv(env)}
              className={`py-4 text-sm font-bold transition-all border-b-2 ${
                activeEnv === env 
                ? 'border-orange-500 text-orange-500' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {env} Environment
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <KPICard title="Total Tests" value={stats.total} border="border-blue-500" />
          <KPICard title="Passed" value={stats.passed} color="text-emerald-400" border="border-emerald-500" />
          <KPICard title="Failed" value={stats.failed} color="text-rose-400" border="border-rose-500" />
          <KPICard title="Avg Duration" value={`${stats.avgTime}ms`} border="border-orange-500" />
        </div>

        {/* Results Table Section */}
        <div className="bg-[#1E293B] rounded-xl border border-slate-800 overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-slate-800 bg-slate-800/30">
            <h2 className="font-bold text-white uppercase tracking-widest text-sm">Recent Integration Activity: {activeEnv}</h2>
          </div>
          
          <div className="divide-y divide-slate-800">
            {loading ? (
              <div className="p-10 text-center text-slate-500 animate-pulse">Loading Environment Data...</div>
            ) : filteredData.length > 0 ? (
              filteredData.map((res: any) => (
                <div key={res.id} className="p-5 flex items-center justify-between hover:bg-slate-800/50 transition-all">
                  <div className="flex gap-4 items-center">
                    <div className={`w-2 h-10 rounded-full ${res.status === 'passed' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <div>
                      <h4 className="font-bold text-white text-lg">{res.test_cases?.title}</h4>
                      <p className="text-xs text-slate-500 uppercase font-bold tracking-tighter">{res.test_cases?.suite_name} • {res.test_runs?.run_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs font-black uppercase tracking-widest ${res.status === 'passed' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {res.status}
                    </div>
                    <div className="text-xs font-mono text-slate-500 mt-1">{res.duration_ms}ms</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-20 text-center text-slate-600 italic">No data found for the {activeEnv} environment.</div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function KPICard({ title, value, color = "text-white", border }: { title: string, value: string | number, color?: string, border: string }) {
  return (
    <div className={`bg-[#1E293B] p-6 rounded-xl border-t-4 ${border} shadow-lg`}>
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{title}</p>
      <p className={`text-3xl font-black tracking-tight ${color}`}>{value}</p>
    </div>
  );
}