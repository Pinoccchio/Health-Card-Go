/**
 * Test Supabase Connection
 * Run: npx tsx scripts/test-supabase-connection.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase Connection...\n');
console.log('Supabase URL:', supabaseUrl);
console.log('API Key:', supabaseKey ? `${supabaseKey.slice(0, 20)}...` : 'NOT SET');

if (!supabaseUrl || !supabaseKey) {
  console.error('\n❌ Error: Supabase credentials not found in .env.local');
  process.exit(1);
}

async function testConnection() {
  try {
    console.log('\n📡 Creating Supabase client...');
    const supabase = createClient(supabaseUrl!, supabaseKey!, {
      global: {
        fetch: (url, options = {}) => {
          console.log(`  → Fetching: ${url}`);
          return fetch(url, {
            ...options,
            signal: AbortSignal.timeout(30000),
          });
        },
      },
    });

    console.log('✅ Client created\n');

    // Test 1: Check disease_statistics table
    console.log('🧪 Test 1: Counting disease_statistics records...');
    const startTime1 = Date.now();
    const { data: stats, error: error1, count } = await supabase
      .from('disease_statistics')
      .select('*', { count: 'exact', head: true });

    const duration1 = Date.now() - startTime1;

    if (error1) {
      console.error(`❌ Error: ${error1.message}`);
      console.error('   Details:', error1);
      return;
    }

    console.log(`✅ Success! Found ${count} records (${duration1}ms)\n`);

    // Test 2: Check barangays table
    console.log('🧪 Test 2: Fetching barangays...');
    const startTime2 = Date.now();
    const { data: barangays, error: error2 } = await supabase
      .from('barangays')
      .select('id, name, code')
      .limit(5);

    const duration2 = Date.now() - startTime2;

    if (error2) {
      console.error(`❌ Error: ${error2.message}`);
      console.error('   Details:', error2);
      return;
    }

    console.log(`✅ Success! Fetched ${barangays?.length || 0} barangays (${duration2}ms)`);
    console.log('   Sample:', barangays?.[0]);

    console.log('\n🎉 All tests passed!');
  } catch (error: any) {
    console.error('\n❌ Connection failed:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

testConnection();
