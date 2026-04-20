'use client';
import { useState, useEffect, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// ─── FONT IMPORT (add to your globals.css too) ────────────────────────────────
// @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

// ─── RESOLVE TEST NAME ────────────────────────────────────────────────────────
function resolveTestName(item: any): string {
  const t = item.test_cases?.title?.trim();
  const r = item.test_runs?.run_name?.trim();
  if (t && t.toLowerCase() !== 'manual' && !t.match(/^scenario\s*\d+$/i)) return t;
  if (r && r.toLowerCase() !== 'manual') return r;
  return 'Unnamed Test';
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const SEVERITIES = ['Critical', 'High', 'Medium', 'Low'] as const;
type Severity = typeof SEVERITIES[number];

const SEV_CONFIG: Record<Severity, { bg: string; text: string; dot: string; ring: string; pill: string }> = {
  Critical: { bg: 'bg-red-50',     text: 'text-red-700',    dot: 'bg-red-500',    ring: 'ring-red-200',    pill: 'bg-red-100 text-red-700'    },
  High:     { bg: 'bg-orange-50',  text: 'text-orange-700', dot: 'bg-orange-500', ring: 'ring-orange-200', pill: 'bg-orange-100 text-orange-700'},
  Medium:   { bg: 'bg-yellow-50',  text: 'text-yellow-700', dot: 'bg-yellow-500', ring: 'ring-yellow-200', pill: 'bg-yellow-100 text-yellow-700'},
  Low:      { bg: 'bg-slate-50',   text: 'text-slate-600',  dot: 'bg-slate-400',  ring: 'ring-slate-200',  pill: 'bg-slate-100 text-slate-600' },
};

const STATUS_CONFIG = {
  passed: { pill: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', glow: '#10b981' },
  failed: { pill: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     glow: '#ef4444' },
};

const NAV = [
  { id: 'Dashboard', label: 'Dashboard', icon: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )},
  { id: 'Test Cases', label: 'Test Cases', icon: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M9 12l2 2 4-4"/><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
    </svg>
  )},
  { id: 'Defects', label: 'Defects', icon: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  )},
  { id: 'Vault', label: 'Vault', icon: (
    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 11v4m0-4a2 2 0 100-4 2 2 0 000 4z"/>
    </svg>
  )},
];

// ─── CHART TOOLTIP ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s: number, e: any) => s + e.value, 0);
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="bg-white border border-slate-200 rounded-xl shadow-xl px-4 py-3 text-sm">
      <p className="font-700 text-slate-800 mb-2">{label} Environment</p>
      {payload.map((e: any) => (
        <div key={e.name} className="flex items-center justify-between gap-6 mb-1">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: e.color }} />
            <span className="text-slate-500 text-xs">{e.name}</span>
          </div>
          <span className="font-semibold text-slate-800 tabular-nums">{e.value}</span>
        </div>
      ))}
      <div className="border-t border-slate-100 mt-2 pt-2 flex justify-between">
        <span className="text-xs text-slate-400">Total</span>
        <span className="text-xs font-bold text-slate-700 tabular-nums">{total}</span>
      </div>
    </div>
  );
};

// ─── SMALL REUSABLE COMPONENTS ────────────────────────────────────────────────
const Badge = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${className}`}>
    {children}
  </span>
);

const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ title, subtitle, accent = 'bg-indigo-500' }: { title: string; subtitle: string; accent?: string }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className={`w-1 h-8 rounded-full ${accent}`} />
    <div>
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>
    </div>
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function SentinelQA() {
  const [activeTab, setActiveTab]           = useState('Dashboard');
  const [activeEnv, setActiveEnv]           = useState('ALL');
  const [activeProduct, setActiveProduct]   = useState('');
  const [filterDate, setFilterDate]         = useState('');
  const [data, setData]                     = useState<any[]>([]);
  const [bugs, setBugs]                     = useState<any[]>([]);
  const [products, setProducts]             = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [sidebarOpen, setSidebarOpen]       = useState(true);

  // Forms
  const [newTestName, setNewTestName]       = useState('');
  const [newStatus, setNewStatus]           = useState('');
  const [newBugTitle, setNewBugTitle]       = useState('');
  const [newBugSeverity, setNewBugSeverity] = useState<Severity>('Medium');
  const [isSubmitting, setIsSubmitting]     = useState(false);
  const [testErr, setTestErr]               = useState('');
  const [bugErr, setBugErr]                 = useState('');
  const [submitSuccess, setSubmitSuccess]   = useState('');

  // ─── FETCH ────────────────────────────────────────────────────────────────
  async function fetchData() {
    try {
      setLoading(true);
      const { data: prodList } = await supabase.from('products').select('*').order('name');
      if (prodList?.length) {
        setProducts(prodList);
        if (!activeProduct)
          setActiveProduct(prodList.find((p: any) => p.name === 'ManageTeamz')?.name || prodList[0].name);
      }
      const [{ data: results }, { data: bugData }] = await Promise.all([
        supabase.from('test_results')
          .select(`id, status, duration_ms, created_at,
            test_runs(run_name, environments:env_id(name), products:product_id(name)),
            test_cases(title)`)
          .order('created_at', { ascending: false }).limit(500),
        supabase.from('bugs')
          .select(`id, title, severity, status, created_at,
            environments:env_id(name), products:product_id(name)`)
          .order('created_at', { ascending: false }).limit(500),
      ]);
      setData(results || []);
      setBugs(bugData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchData(); }, []);

  // ─── DERIVED DATA ─────────────────────────────────────────────────────────
  const currentTests = useMemo(() => data.filter(item => {
    const pName = (item.test_runs?.products?.name || '').trim().toUpperCase();
    const eName = (item.test_runs?.environments?.name || '').trim().toUpperCase();
    return (
      pName === activeProduct.trim().toUpperCase() &&
      (!filterDate || item.created_at.substring(0, 10) === filterDate) &&
      (activeEnv === 'ALL' || eName === activeEnv)
    );
  }), [data, activeProduct, filterDate, activeEnv]);

  const currentBugs = useMemo(() => bugs.filter(item => {
    const pName = (item.products?.name || '').trim().toUpperCase();
    const eName = (item.environments?.name || '').trim().toUpperCase();
    return (
      pName === activeProduct.trim().toUpperCase() &&
      (!filterDate || item.created_at.substring(0, 10) === filterDate) &&
      (activeEnv === 'ALL' || eName === activeEnv)
    );
  }), [bugs, activeProduct, filterDate, activeEnv]);

  const activeBugs   = useMemo(() => currentBugs.filter(b => b.status !== 'Closed'), [currentBugs]);
  const passedTests   = useMemo(() => currentTests.filter(t => t.status === 'passed'), [currentTests]);
  const failedTests   = useMemo(() => currentTests.filter(t => t.status === 'failed'), [currentTests]);
  const passRate      = currentTests.length > 0 ? Math.round((passedTests.length / currentTests.length) * 100) : 0;

  // Test case status summary (like defect severity summary)
  const testStatusCounts = useMemo(() => ({
    total:  currentTests.length,
    passed: passedTests.length,
    failed: failedTests.length,
    passRate,
  }), [currentTests, passedTests, failedTests, passRate]);

  // Bar chart — always all 3 envs
  const chartData = useMemo(() => ['DEV', 'QA', 'PROD'].map(stage => {
    const st = data.filter(t =>
      (t.test_runs?.products?.name || '').trim().toUpperCase() === activeProduct.trim().toUpperCase() &&
      (t.test_runs?.environments?.name || '').trim().toUpperCase() === stage
    );
    const sb = bugs.filter(b =>
      (b.products?.name || '').trim().toUpperCase() === activeProduct.trim().toUpperCase() &&
      (b.environments?.name || '').trim().toUpperCase() === stage && b.status !== 'Closed'
    );
    return {
      env: stage,
      Passed: st.filter(t => t.status === 'passed').length,
      Failed: st.filter(t => t.status === 'failed').length + sb.length,
    };
  }), [data, bugs, activeProduct]);

  const yMax = Math.ceil(Math.max(...chartData.flatMap(d => [d.Passed, d.Failed]), 5) / 5) * 5;

  // Defects by severity
  const defectsBySev = useMemo(() =>
    SEVERITIES
      .map(sev => ({ sev, items: activeBugs.filter(b => b.severity === sev) }))
      .filter(g => g.items.length > 0),
    [activeBugs]
  );

  // ─── HANDLERS ─────────────────────────────────────────────────────────────
  const flash = (msg: string) => { setSubmitSuccess(msg); setTimeout(() => setSubmitSuccess(''), 3000); };

  const handleAddExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTestName.trim()) { setTestErr('Please enter a test case name'); return; }
    if (!newStatus) { setTestErr('Please select a result'); return; }
    setTestErr(''); setIsSubmitting(true);
    try {
      const { data: envRes } = await supabase.from('environments').select('id')
        .eq('name', activeEnv === 'ALL' ? 'QA' : activeEnv).single();
      const { data: prodRes } = await supabase.from('products').select('id').eq('name', activeProduct).single();
      const { data: nRun } = await supabase.from('test_runs')
        .insert([{ run_name: 'Manual', env_id: envRes?.id, product_id: prodRes?.id }]).select().single();
      const { data: tCase } = await supabase.from('test_cases')
        .insert([{ title: newTestName.trim(), suite_name: 'Manual' }]).select().single();
      await supabase.from('test_results')
        .insert([{ run_id: nRun?.id, test_case_id: tCase?.id, status: newStatus, duration_ms: 500 }]);
      setNewTestName(''); setNewStatus(''); flash('Test result added successfully!'); fetchData();
    } catch { setTestErr('Failed to submit. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const handleAddBug = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBugTitle.trim()) { setBugErr('Please enter a bug title'); return; }
    setBugErr(''); setIsSubmitting(true);
    try {
      const { data: envRes } = await supabase.from('environments').select('id')
        .eq('name', activeEnv === 'ALL' ? 'QA' : activeEnv).single();
      const { data: prodRes } = await supabase.from('products').select('id').eq('name', activeProduct).single();
      await supabase.from('bugs').insert([{
        title: newBugTitle.trim(), severity: newBugSeverity,
        env_id: envRes?.id, product_id: prodRes?.id, status: 'Open',
      }]);
      setNewBugTitle(''); flash('Bug reported successfully!'); fetchData();
    } catch { setBugErr('Failed to submit. Please try again.'); }
    finally { setIsSubmitting(false); }
  };

  const closeBug = async (id: string) => {
    await supabase.from('bugs').update({ status: 'Closed' }).eq('id', id);
    fetchData();
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
      className="flex h-screen bg-slate-50 text-slate-800 overflow-hidden">

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} transition-all duration-200 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 z-30`}>
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-slate-100">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.5}>
              <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
            </svg>
          </div>
          {sidebarOpen && <span className="font-bold text-slate-800 text-sm">Sentinel QA</span>}
          <button onClick={() => setSidebarOpen(o => !o)} className="ml-auto text-slate-400 hover:text-slate-600 transition-colors">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d={sidebarOpen ? 'M11 19l-7-7 7-7M18 19l-7-7 7-7' : 'M13 5l7 7-7 7M6 5l7 7-7 7'} />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV.map(n => {
            const isActive = activeTab === n.id;
            return (
              <button key={n.id} onClick={() => setActiveTab(n.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}>
                <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>{n.icon}</span>
                {sidebarOpen && <span>{n.label}</span>}
                {sidebarOpen && n.id === 'Defects' && activeBugs.length > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {activeBugs.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sync status */}
        <div className="p-4 border-t border-slate-100">
          <div className={`flex items-center gap-2 ${!sidebarOpen && 'justify-center'}`}>
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
            {sidebarOpen && <span className="text-xs text-slate-400">{loading ? 'Syncing data…' : 'All systems live'}</span>}
          </div>
        </div>
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-4 px-6 flex-shrink-0">
          <div className="flex items-center gap-3 flex-1">
            {/* Product selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-slate-400">
                <path d="M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/>
                <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/>
              </svg>
              <select value={activeProduct} onChange={e => setActiveProduct(e.target.value)}
                className="bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-1">
                {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            {/* Env tabs */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-0.5">
              {['ALL', 'DEV', 'QA', 'PROD'].map(env => (
                <button key={env} onClick={() => setActiveEnv(env)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeEnv === env
                      ? 'bg-white text-slate-800 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}>
                  {env === 'ALL' ? 'All Envs' : env}
                </button>
              ))}
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5">
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} className="text-slate-400">
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="bg-transparent text-sm text-slate-600 outline-none cursor-pointer" />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-slate-400 hover:text-slate-600 transition-colors ml-1">
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M18 6L6 18M6 6l12 12"/>
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Right — refresh button */}
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors disabled:opacity-40">
            <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              className={loading ? 'animate-spin' : ''}>
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            Refresh
          </button>
        </header>

        {/* Success toast */}
        {submitSuccess && (
          <div className="mx-6 mt-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2 shadow-sm">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            {submitSuccess}
          </div>
        )}

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* ════════════════════════════════════════════════════════════
              DASHBOARD
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'Dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div>
                <h1 className="text-2xl font-bold text-slate-800">{activeProduct} Overview</h1>
                <p className="text-slate-400 text-sm mt-1">{activeEnv === 'ALL' ? 'All environments' : `${activeEnv} environment`} · {filterDate || 'All time'}</p>
              </div>

              {/* KPI row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Executions', value: currentTests.length, icon: '🧪', color: 'text-indigo-700', bg: 'bg-indigo-50', border: 'border-indigo-100' },
                  { label: 'Tests Passed',     value: passedTests.length,  icon: '✅', color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100' },
                  { label: 'Tests Failed',     value: failedTests.length,  icon: '❌', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100'     },
                  { label: 'Open Defects',     value: activeBugs.length,   icon: '🐛', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100'   },
                ].map(k => (
                  <Card key={k.label} className={`p-5 border ${k.border} ${k.bg}`}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-xl">{k.icon}</span>
                      <span className={`text-3xl font-bold tabular-nums ${k.color}`}>{k.value}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500">{k.label}</p>
                  </Card>
                ))}
              </div>

              {/* Charts row */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Donut */}
                <Card className="lg:col-span-2 p-6 flex flex-col items-center justify-center">
                  <p className="text-sm font-semibold text-slate-500 mb-6 self-start">Pass Rate</p>
                  <div className="relative w-44 h-44 flex items-center justify-center">
                    <svg viewBox="0 0 200 200" className="absolute w-full h-full -rotate-90">
                      <circle cx="100" cy="100" r="78" fill="transparent" strokeWidth="18"
                        stroke="#fee2e2" />
                      <circle cx="100" cy="100" r="78" fill="transparent" strokeWidth="18"
                        stroke="#10b981" strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 78}
                        style={{
                          strokeDashoffset: 2 * Math.PI * 78 * (1 - passRate / 100),
                          transition: 'stroke-dashoffset 1.2s ease-in-out',
                        }} />
                    </svg>
                    <div className="text-center">
                      <p className="text-4xl font-bold text-slate-800 tabular-nums">{passRate}%</p>
                      <p className="text-xs text-slate-400 mt-1">Pass Rate</p>
                    </div>
                  </div>
                  <div className="flex gap-5 mt-6">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-slate-500">{passedTests.length} passed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="text-xs text-slate-500">{failedTests.length} failed</span>
                    </div>
                  </div>
                </Card>

                {/* Bar chart */}
                <Card className="lg:col-span-3 p-6">
                  <div className="mb-5">
                    <p className="text-sm font-semibold text-slate-500">Environment Breakdown</p>
                    <p className="text-xs text-slate-400 mt-1">Pass & Fail count per stage</p>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barCategoryGap="40%" barGap={3}>
                      <CartesianGrid vertical={false} stroke="#f1f5f9" strokeDasharray="0" />
                      <XAxis dataKey="env" tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} domain={[0, yMax]}
                        tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
                      <Bar dataKey="Passed" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={36} />
                      <Bar dataKey="Failed"  fill="#f87171" radius={[5, 5, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-6 mt-3">
                    {[['#10b981', 'Passed'], ['#f87171', 'Failed']].map(([c, l]) => (
                      <div key={l} className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                        <span className="text-xs text-slate-400">{l}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Bottom — Recent tests + Defects report */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Recent test executions */}
                <Card>
                  <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-700">Recent Executions</p>
                      <p className="text-xs text-slate-400 mt-0.5">{currentTests.length} total results</p>
                    </div>
                    <button onClick={() => setActiveTab('Test Cases')}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors flex items-center gap-1">
                      View all
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {currentTests.slice(0, 7).map((item, i) => {
                      const sc = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.failed;
                      return (
                        <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${sc.dot}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{resolveTestName(item)}</p>
                            <p className="text-xs text-slate-400">{item.test_runs?.environments?.name} · {new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                          </div>
                          <Badge className={sc.pill}>{item.status}</Badge>
                        </div>
                      );
                    })}
                    {currentTests.length === 0 && (
                      <div className="py-12 text-center text-sm text-slate-400">No test results yet</div>
                    )}
                  </div>
                </Card>

                {/* Defects report */}
                <Card>
                  <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
                    <div>
                      <p className="font-semibold text-slate-700">Defects Report</p>
                      <p className="text-xs text-slate-400 mt-0.5">{activeBugs.length} open issues</p>
                    </div>
                    <button onClick={() => setActiveTab('Defects')}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
                      Manage
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </button>
                  </div>
                  {/* Severity pills */}
                  <div className="flex gap-2 px-5 py-3 border-b border-slate-50 flex-wrap">
                    {SEVERITIES.map(sev => {
                      const cnt = activeBugs.filter(b => b.severity === sev).length;
                      const c = SEV_CONFIG[sev];
                      return (
                        <span key={sev} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${c.pill} ${cnt === 0 ? 'opacity-40' : ''}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                          {sev} {cnt}
                        </span>
                      );
                    })}
                  </div>
                  {/* Bug list */}
                  <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
                    {defectsBySev.length > 0 ? defectsBySev.map(({ sev, items }) => (
                      <div key={sev}>
                        <div className={`px-5 py-2 ${SEV_CONFIG[sev].bg}`}>
                          <span className={`text-xs font-bold uppercase tracking-wide ${SEV_CONFIG[sev].text}`}>{sev} · {items.length}</span>
                        </div>
                        {items.map(b => (
                          <div key={b.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors group">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${SEV_CONFIG[sev as Severity].dot} ${sev === 'Critical' ? 'animate-pulse' : ''}`} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{b.title}</p>
                              <p className="text-xs text-slate-400">{b.environments?.name} · {new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                            </div>
                            <button onClick={() => closeBug(b.id)}
                              className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-emerald-600 hover:text-emerald-700 border border-emerald-200 hover:bg-emerald-50 px-3 py-1 rounded-lg transition-all flex-shrink-0">
                              Fixed
                            </button>
                          </div>
                        ))}
                      </div>
                    )) : (
                      <div className="py-12 text-center">
                        <p className="text-2xl mb-2">🎉</p>
                        <p className="text-sm text-slate-400">No open defects!</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              TEST CASES
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'Test Cases' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <SectionHeader title="Test Cases" subtitle={`${currentTests.length} executions for ${activeProduct}`} />

              {/* ── Test case status summary (mirrors defect severity summary) ── */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total',     value: testStatusCounts.total,   color: 'text-indigo-700', bg: 'bg-indigo-50',   border: 'border-indigo-100', dot: 'bg-indigo-400' },
                  { label: 'Passed',    value: testStatusCounts.passed,  color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-100', dot: 'bg-emerald-500' },
                  { label: 'Failed',    value: testStatusCounts.failed,  color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-100',     dot: 'bg-red-500'     },
                  { label: 'Pass Rate', value: `${testStatusCounts.passRate}%`, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-100', dot: 'bg-violet-400' },
                ].map(stat => (
                  <Card key={stat.label} className={`p-5 border ${stat.border} ${stat.bg}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className={`w-2 h-2 rounded-full ${stat.dot}`} />
                      <span className={`text-2xl font-bold tabular-nums ${stat.color}`}>{stat.value}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-500 mt-2">{stat.label}</p>
                    {stat.label !== 'Pass Rate' && stat.label !== 'Total' && testStatusCounts.total > 0 && (
                      <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${stat.label === 'Passed' ? 'bg-emerald-500' : 'bg-red-400'}`}
                          style={{ width: `${Math.round((stat.value as number / testStatusCounts.total) * 100)}%` }}
                        />
                      </div>
                    )}
                  </Card>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Add test form */}
                <Card className="p-6">
                  <p className="font-semibold text-slate-700 mb-1">Add Result</p>
                  <p className="text-xs text-slate-400 mb-5">Manually commit a test execution</p>
                  <form onSubmit={handleAddExecution} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5">Test Case Name</label>
                      <input type="text" value={newTestName}
                        placeholder="e.g. Login with valid credentials"
                        onChange={e => { setNewTestName(e.target.value); setTestErr(''); }}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5">Result</label>
                      <select value={newStatus} onChange={e => { setNewStatus(e.target.value); setTestErr(''); }}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 bg-white text-slate-600 transition-all cursor-pointer">
                        <option value="" disabled>Select result…</option>
                        <option value="passed">✅ Passed</option>
                        <option value="failed">❌ Failed</option>
                      </select>
                    </div>
                    {testErr && (
                      <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                        {testErr}
                      </div>
                    )}
                    <button type="submit" disabled={isSubmitting}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm shadow-indigo-200">
                      {isSubmitting ? 'Submitting…' : 'Submit Result'}
                    </button>
                  </form>
                </Card>

                {/* Test list */}
                <Card className="lg:col-span-2">
                  {/* Column headers */}
                  <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                    <span className="col-span-6 text-xs font-semibold text-slate-400 uppercase tracking-wide">Test Name</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Env</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Date</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide text-right">Result</span>
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                    {currentTests.length > 0 ? currentTests.map((r, i) => {
                      const sc = STATUS_CONFIG[r.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.failed;
                      return (
                        <div key={i} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors group">
                          <div className="col-span-6 flex items-center gap-3 min-w-0 pr-3">
                            <div className={`w-1.5 h-6 rounded-full flex-shrink-0 ${sc.dot}`} />
                            <p className="text-sm font-medium text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                              {resolveTestName(r)}
                            </p>
                          </div>
                          <span className="col-span-2 text-xs text-slate-400 font-medium">{r.test_runs?.environments?.name || '—'}</span>
                          <span className="col-span-2 text-xs text-slate-400 tabular-nums">
                            {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                          <div className="col-span-2 flex justify-end">
                            <Badge className={sc.pill}>{r.status}</Badge>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="py-16 text-center text-sm text-slate-400">No results found for this scope</div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              DEFECTS
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'Defects' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <SectionHeader title="Defects" subtitle={`${activeBugs.length} open issues for ${activeProduct}`} accent="bg-red-500" />

              {/* Severity summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {SEVERITIES.map(sev => {
                  const cnt = activeBugs.filter(b => b.severity === sev).length;
                  const c = SEV_CONFIG[sev];
                  return (
                    <Card key={sev} className={`p-5 border ${c.ring.replace('ring', 'border')} ${c.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className={`w-2 h-2 rounded-full ${c.dot} ${sev === 'Critical' && cnt > 0 ? 'animate-pulse' : ''}`} />
                        <span className={`text-2xl font-bold tabular-nums ${c.text}`}>{cnt}</span>
                      </div>
                      <p className={`text-sm font-semibold mt-2 ${c.text}`}>{sev}</p>
                      {activeBugs.length > 0 && (
                        <div className="mt-3 h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${c.dot} transition-all duration-700`}
                            style={{ width: `${Math.round((cnt / activeBugs.length) * 100)}%` }} />
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Raise bug form */}
                <Card className="p-6">
                  <p className="font-semibold text-slate-700 mb-1">Report a Bug</p>
                  <p className="text-xs text-slate-400 mb-5">Log a new defect to the tracker</p>
                  <form onSubmit={handleAddBug} className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5">Bug Title</label>
                      <input type="text" value={newBugTitle} placeholder="Describe the issue clearly…"
                        onChange={e => { setNewBugTitle(e.target.value); setBugErr(''); }}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50 transition-all placeholder:text-slate-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1.5">Severity</label>
                      <select value={newBugSeverity} onChange={e => setNewBugSeverity(e.target.value as Severity)}
                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-50 bg-white text-slate-600 transition-all cursor-pointer">
                        {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {bugErr && (
                      <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
                        </svg>
                        {bugErr}
                      </div>
                    )}
                    <button type="submit" disabled={isSubmitting}
                      className="w-full bg-red-500 hover:bg-red-600 active:scale-[0.98] text-white py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 shadow-sm shadow-red-100">
                      {isSubmitting ? 'Reporting…' : 'Report Bug'}
                    </button>
                  </form>
                </Card>

                {/* Bug list */}
                <Card className="lg:col-span-2">
                  <div className="grid grid-cols-12 px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-2xl">
                    <span className="col-span-5 text-xs font-semibold text-slate-400 uppercase tracking-wide">Issue</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Severity</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Env</span>
                    <span className="col-span-2 text-xs font-semibold text-slate-400 uppercase tracking-wide">Raised</span>
                    <span className="col-span-1" />
                  </div>
                  <div className="divide-y divide-slate-50 max-h-[480px] overflow-y-auto">
                    {activeBugs.length > 0 ? activeBugs.map(b => {
                      const c = SEV_CONFIG[b.severity as Severity] || SEV_CONFIG.Low;
                      return (
                        <div key={b.id} className="grid grid-cols-12 px-5 py-3.5 items-center hover:bg-slate-50 transition-colors group">
                          <div className="col-span-5 flex items-center gap-3 min-w-0 pr-3">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot} ${b.severity === 'Critical' ? 'animate-pulse' : ''}`} />
                            <p className="text-sm font-medium text-slate-700 truncate">{b.title}</p>
                          </div>
                          <div className="col-span-2">
                            <Badge className={c.pill}>{b.severity}</Badge>
                          </div>
                          <span className="col-span-2 text-xs text-slate-400">{b.environments?.name || '—'}</span>
                          <span className="col-span-2 text-xs text-slate-400 tabular-nums">
                            {new Date(b.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                          <div className="col-span-1 flex justify-end">
                            <button onClick={() => closeBug(b.id)}
                              className="opacity-0 group-hover:opacity-100 text-xs font-semibold text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-2.5 py-1 rounded-lg transition-all">
                              Fixed
                            </button>
                          </div>
                        </div>
                      );
                    }) : (
                      <div className="py-16 text-center">
                        <p className="text-3xl mb-3">🎉</p>
                        <p className="text-sm text-slate-500 font-medium">No open defects!</p>
                        <p className="text-xs text-slate-400 mt-1">Environment is clean</p>
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              VAULT
          ════════════════════════════════════════════════════════════ */}
          {activeTab === 'Vault' && (
            <div className="flex flex-col items-center justify-center h-full py-32 animate-in fade-in duration-300">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mb-6">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth={1.5}>
                  <rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 11v4m0-4a2 2 0 100-4 2 2 0 000 4z"/>
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">Vault</h3>
              <p className="text-sm text-slate-400 text-center max-w-xs">
                Historical snapshots, release archives, and audit logs will live here.
              </p>
              <div className="mt-6 px-5 py-2 rounded-full border border-slate-200 text-xs text-slate-400 font-medium">
                Coming soon
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}