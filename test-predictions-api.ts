// Test the predictions API with proper authentication simulation
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testPredictionsAPI() {
  console.log('Testing healthcard predictions API for food_handler...');

  // Make a GET request to the predictions API endpoint
  const url = `http://localhost:3000/api/healthcards/predictions?healthcard_type=food_handler&granularity=monthly&months_back=12&months_forecast=12`;

  console.log('Calling:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.metadata) {
      console.log('\nMetadata Summary:');
      console.log('- Historical data points:', data.metadata.historical_data_points || data.metadata.data_points_count);
      console.log('- Prediction points:', data.metadata.prediction_points);
      console.log('- Data quality:', data.metadata.data_quality);
    }
  } catch (error) {
    console.error('Error calling API:', error);
  }
}

testPredictionsAPI();
