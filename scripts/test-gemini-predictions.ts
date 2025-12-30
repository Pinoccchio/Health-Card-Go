/**
 * Test Gemini AI SARIMA Predictions
 *
 * This script tests the Gemini AI integration for generating health card predictions.
 *
 * Usage:
 * npx tsx scripts/test-gemini-predictions.ts
 */

async function testGeminiPredictions() {
  console.log('🧪 Testing Gemini AI SARIMA Predictions\n');

  const baseUrl = 'http://localhost:3000'; // Update if needed

  // Test credentials (Super Admin)
  const email = 'super.admin@gmail.com';
  const password = 'super.admin@gmail.com';

  try {
    // Step 1: Login as Super Admin
    console.log('1️⃣ Logging in as Super Admin...');
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json();
    const accessToken = loginData.session?.access_token;

    if (!accessToken) {
      throw new Error('No access token received');
    }

    console.log('✅ Logged in successfully\n');

    // Step 2: Generate predictions for Food Handler
    console.log('2️⃣ Generating Food Handler predictions with Gemini AI...');
    const generateResponse = await fetch(`${baseUrl}/api/healthcards/generate-predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        healthcard_type: 'food_handler',
        barangay_id: null, // System-wide
        days_forecast: 30,
        auto_save: true,
      }),
    });

    if (!generateResponse.ok) {
      const errorData = await generateResponse.json();
      throw new Error(`Generation failed: ${errorData.error || generateResponse.statusText}`);
    }

    const result = await generateResponse.json();

    console.log('✅ Predictions generated successfully!\n');
    console.log('📊 Results:');
    console.log(`   - Healthcard Type: ${result.data.healthcard_type}`);
    console.log(`   - Predictions Generated: ${result.data.predictions.length}`);
    console.log(`   - Historical Data Points: ${result.data.historical_data_points}`);
    console.log(`   - Model Version: ${result.data.model_metadata.version}`);
    console.log(`   - R² Score: ${result.data.model_metadata.accuracy_metrics.r_squared.toFixed(3)}`);
    console.log(`   - RMSE: ${result.data.model_metadata.accuracy_metrics.rmse.toFixed(2)}`);
    console.log(`   - Trend: ${result.data.model_metadata.trend}`);
    console.log(`   - Seasonality: ${result.data.model_metadata.seasonality_detected ? 'Yes' : 'No'}`);
    console.log(`   - Saved to Database: ${result.data.saved_to_database ? 'Yes' : 'No'}`);
    console.log(`   - Saved Count: ${result.data.saved_count}\n`);

    // Show sample predictions
    console.log('📈 Sample Predictions (first 5 days):');
    result.data.predictions.slice(0, 5).forEach((pred: any, index: number) => {
      console.log(
        `   ${index + 1}. ${pred.date}: ${pred.predicted_cards} cards (±${Math.round((pred.upper_bound - pred.lower_bound) / 2)}, confidence: ${Math.round(pred.confidence_level * 100)}%)`
      );
    });

    console.log('\n🎉 Test completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Login as healthcard.admin@test.com');
    console.log('   2. Go to Reports & Analytics → HealthCard Forecasts');
    console.log('   3. View the AI-generated predictions!');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testGeminiPredictions();
