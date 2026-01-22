import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log('Testing healthcard predictions query for food_handler...');

  const serviceIds = [12, 13]; // food_handler
  const startDate = '2023-01-01';
  const endDate = '2024-12-31';

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id,
      completed_at,
      service_id,
      card_type,
      patient_id,
      patients!inner(
        user_id,
        profiles!inner(
          barangay_id,
          barangays(
            id,
            name,
            code
          )
        )
      )
    `)
    .eq('status', 'completed')
    .in('service_id', serviceIds)
    .not('completed_at', 'is', null)
    .gte('completed_at', `${startDate}T00:00:00`)
    .lte('completed_at', `${endDate}T23:59:59`);

  if (error) {
    console.error('Query error:', error);
  } else {
    console.log(`Found ${data?.length || 0} appointments`);
    if (data && data.length > 0) {
      console.log('Sample record:', JSON.stringify(data[0], null, 2));
    }
  }
}

testQuery();
