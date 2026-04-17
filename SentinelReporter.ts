import { Reporter, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mdfovmakdluotpoahopu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZm92bWFrZGx1b3Rwb2Fob3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTI1MjQsImV4cCI6MjA5MTk2ODUyNH0.Y237fKokU1uRbCplbDgXGZM9Sl0ibz2LP38_DCRJlqM' 
);

class SentinelReporter implements Reporter {
  private resultsBuffer: any[] = [];

  async onTestEnd(test: TestCase, result: TestResult) {
    this.resultsBuffer.push({
      title: test.title,
      status: result.status === 'passed' ? 'passed' : 'failed',
      duration: result.duration
    });
    console.log(`📦 Buffered: ${test.title}`);
  }

  async onEnd(result: FullResult) {
    console.log("🚀 Starting Final Sync...");
    
    try {
      // 1. Get the Environment (specifically looking for QA)
      let { data: env } = await supabase.from('environments')
        .select('id, name')
        .eq('name', 'QA')
        .single();

      if (!env) {
        console.log("📝 QA room not found, creating it now...");
        const { data: newEnv } = await supabase.from('environments').insert([{ name: 'QA' }]).select().single();
        env = newEnv;
      }

      console.log(`📡 Connected to Room: ${env?.name} (ID: ${env?.id})`);

      // 2. Get or Create the "MacBook Run"
      let { data: run } = await supabase.from('test_runs')
        .select('id')
        .eq('run_name', 'MacBook Run')
        .eq('env_id', env?.id)
        .maybeSingle();

      if (!run) {
        const { data: newRun } = await supabase.from('test_runs')
          .insert([{ run_name: 'MacBook Run', env_id: env?.id }])
          .select().single();
        run = newRun;
      }

      // 3. Upload all results one by one
      for (const item of this.resultsBuffer) {
        let { data: tCase } = await supabase.from('test_cases').select('id').eq('title', item.title).maybeSingle();
        if (!tCase) {
          const { data: newCase } = await supabase.from('test_cases').insert([{ title: item.title, suite_name: 'Playwright' }]).select().single();
          tCase = newCase;
        }

        const { error: uploadError } = await supabase.from('test_results').insert([{
          run_id: run?.id,
          test_case_id: tCase?.id,
          status: item.status,
          duration_ms: item.duration
        }]);
        
        if (uploadError) console.error("❌ Error uploading test:", item.title, uploadError);
      }

      console.log(`✅ ALL SYSTEMS GO: ${this.resultsBuffer.length} results safely in the room!`);
    } catch (err) {
      console.error("❌ Sentinel Sync Error:", err);
    }
  }
}

export default SentinelReporter;