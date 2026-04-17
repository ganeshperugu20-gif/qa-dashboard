import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function IntegrationHub() {
  const { data: results } = await supabase
    .from('test_results')
    .select(`
      id, status, duration_ms, created_at,
      test_runs ( run_name, environments ( name ) ),
      test_cases ( title, suite_name )
    `)
    .order('created_at', { ascending: false });

  // Calculate Stats
  const total = results?.length || 0;
  const passed = results?.filter(r => r.status === 'passed').length || 0;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#F1F5F9] font-sans text-slate-900">
      {/* Top Navigation Hub */}
      <nav className="bg-white border-b border-slate-200 px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white font-black text-xl">H</div>
          <h1 className="text-xl font-bold tracking-tight">Integration Hub</h1>
        </div>
        <div className="flex gap-4 items-center">
          <span className="text-sm font-medium text-slate-500">W2S Solutions Automation</span>
          <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
          <StatCard title="Total Executions" value={total} color="text-slate-600" />
          <StatCard title="Passed" value={passed} color="text-emerald-600" />
          <StatCard title="Failed" value={failed} color="text-rose-600" />
          <StatCard title="Success Rate" value={`${passRate}%`} color="text-blue-600" />
        </div>

        {/* Integration List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="font-bold text-slate-700">Recent Test Activity</h2>
            <div className="flex gap-2">
              <button className="px-4 py-1.5 text-xs font-bold bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Filter Env</button>
            </div>
          </div>
          
          <div className="divide-y divide-slate-100">
            {results?.map((res: any) => (
              <div key={res.id} className="p-6 flex items-center justify-between hover:bg-slate-50/80 transition-all group">
                <div className="flex gap-6 items-center">
                  <div className={`p-3 rounded-xl ${res.status === 'passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {res.status === 'passed' ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                    ) : (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg leading-tight group-hover:text-blue-600 transition-colors">{res.test_cases?.title}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-wider">{res.test_runs?.environments?.name}</span>
                      <span className="text-xs text-slate-400 font-medium italic">/ {res.test_runs?.run_name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-black uppercase ${res.status === 'passed' ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {res.status}
                  </div>
                  <div className="text-xs font-mono text-slate-300 mt-1">{res.duration_ms}ms</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ title, value, color }: { title: string, value: string | number, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">{title}</p>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
    </div>
  );
}