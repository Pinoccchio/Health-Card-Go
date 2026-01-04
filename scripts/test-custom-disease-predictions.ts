/**
 * Custom Disease Predictions Integration Test
 *
 * Tests that custom diseases (disease_type = 'other') are included
 * when generating predictions for "all" diseases
 *
 * Usage: npx tsx scripts/test-custom-disease-predictions.ts
 *
 * Prerequisites:
 * - Development server must be running: npm run dev
 * - User must be logged in as Staff or Super Admin
 */

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

const API_BASE_URL = 'http://localhost:3000';
const GENERATE_PREDICTIONS_ENDPOINT = `${API_BASE_URL}/api/diseases/generate-predictions`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function testGeneratePredictionsAll() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: Generate Predictions for "all" Diseases`);
  console.log(`${'='.repeat(80)}`);

  try {
    console.log(`\nCalling API: POST ${GENERATE_PREDICTIONS_ENDPOINT}`);
    console.log(`Body: { diseaseType: 'all', daysForecast: 30 }`);

    const response = await fetch(GENERATE_PREDICTIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        diseaseType: 'all',
        daysForecast: 30,
      }),
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Response: ${errorText}`);
      return;
    }

    const data = await response.json();

    console.log(`\n✓ API Response received`);
    console.log(`  Success: ${data.success}`);
    console.log(`  Results count: ${data.results?.length || 0}`);

    if (!data.results || data.results.length === 0) {
      console.error(`\n❌ NO RESULTS RETURNED`);
      return;
    }

    // Extract disease types
    const diseaseTypes = data.results.map((r: any) => r.disease_type);
    const uniqueDiseaseTypes = [...new Set(diseaseTypes)];

    console.log(`\n📊 DISEASE TYPES GENERATED:`);
    uniqueDiseaseTypes.forEach((type, index) => {
      const count = diseaseTypes.filter((t) => t === type).length;
      console.log(`  ${index + 1}. ${type} (${count} entries)`);
    });

    // Check for 'other' diseases
    const hasOther = diseaseTypes.includes('other');

    console.log(`\n🔍 CUSTOM DISEASE CHECK:`);
    if (hasOther) {
      console.log(`  ✅ Custom diseases ('other') ARE included in results`);

      // Show details
      const otherResults = data.results.filter((r: any) => r.disease_type === 'other');
      console.log(`\n  Custom Disease Details:`);
      otherResults.forEach((result: any, index: number) => {
        console.log(`    ${index + 1}. Barangay: ${result.barangay_name || 'System-Wide'}`);
        console.log(`       Predictions: ${result.predictions_count}`);
        console.log(`       R²: ${result.r_squared ?? 'N/A'}`);
        console.log(`       Quality: ${result.data_quality}`);
      });
    } else {
      console.log(`  ❌ Custom diseases ('other') NOT included in results`);
      console.log(`\n  Expected disease types: dengue, hiv_aids, malaria, measles, rabies, pregnancy_complications, other`);
      console.log(`  Actual disease types: ${uniqueDiseaseTypes.join(', ')}`);
      console.log(`\n  🐛 BUG CONFIRMED: 'other' is missing from diseasesToGenerate array`);
      console.log(`     Location: src/app/api/diseases/generate-predictions/route.ts lines 92-95`);
    }

    // Check R² values
    console.log(`\n📈 R² SCORES CHECK:`);
    const r2Values = data.results.map((r: any) => ({
      disease: r.disease_type,
      r2: r.r_squared,
    }));

    r2Values.forEach((entry: any) => {
      const r2Display = entry.r2 === null || entry.r2 === undefined ? 'N/A' : entry.r2.toFixed(2);
      const status = entry.r2 === 0 || entry.r2 === null ? '❌' : entry.r2 > 0.7 ? '✅' : '⚠️';
      console.log(`  ${status} ${entry.disease}: R² = ${r2Display}`);
    });

    const allZero = r2Values.every((e: any) => e.r2 === 0 || e.r2 === null);
    if (allZero) {
      console.log(`\n  🐛 BUG CONFIRMED: All R² scores are 0 or N/A`);
      console.log(`     This indicates back-testing validation issue`);
    }

  } catch (error) {
    console.error(`\n❌ TEST FAILED:`, error);
    console.log(`\n💡 TROUBLESHOOTING:`);
    console.log(`  1. Make sure development server is running: npm run dev`);
    console.log(`  2. Check that you're logged in as Staff or Super Admin`);
    console.log(`  3. Verify API endpoint is accessible: ${GENERATE_PREDICTIONS_ENDPOINT}`);
  }
}

async function testGeneratePredictionsOther() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TEST: Generate Predictions for "other" Disease Type Only`);
  console.log(`${'='.repeat(80)}`);

  try {
    console.log(`\nCalling API: POST ${GENERATE_PREDICTIONS_ENDPOINT}`);
    console.log(`Body: { diseaseType: 'other', daysForecast: 30 }`);

    const response = await fetch(GENERATE_PREDICTIONS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        diseaseType: 'other',
        daysForecast: 30,
      }),
    });

    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error(`   Response: ${errorText}`);
      return;
    }

    const data = await response.json();

    console.log(`\n✓ API Response received`);
    console.log(`  Success: ${data.success}`);
    console.log(`  Results count: ${data.results?.length || 0}`);

    if (data.results && data.results.length > 0) {
      console.log(`\n✅ Predictions generated for 'other' disease type`);
      data.results.forEach((result: any, index: number) => {
        console.log(`  ${index + 1}. Barangay: ${result.barangay_name || 'System-Wide'}`);
        console.log(`     Predictions: ${result.predictions_count}`);
        console.log(`     R²: ${result.r_squared ?? 'N/A'}`);
      });
    } else {
      console.log(`\n⚠️  No predictions for 'other' disease type`);
      console.log(`   This might mean no historical data for custom diseases`);
    }

  } catch (error) {
    console.error(`\n❌ TEST FAILED:`, error);
  }
}

async function checkDatabaseForCustomDiseases() {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`DATABASE CHECK: Custom Diseases in Database`);
  console.log(`${'='.repeat(80)}`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/diseases?limit=100`);

    if (!response.ok) {
      console.error(`❌ Failed to fetch diseases from database`);
      return;
    }

    const data = await response.json();

    const customDiseases = data.filter((d: any) => d.disease_type === 'other');

    console.log(`\n📊 DATABASE STATISTICS:`);
    console.log(`  Total diseases: ${data.length}`);
    console.log(`  Custom diseases (type='other'): ${customDiseases.length}`);

    if (customDiseases.length > 0) {
      // Group by custom_disease_name
      const diseaseNames = customDiseases.map((d: any) => d.custom_disease_name || d.diagnosis || 'Unknown');
      const uniqueNames = [...new Set(diseaseNames)];

      console.log(`\n  Unique custom disease names:`);
      uniqueNames.forEach((name: string) => {
        const count = diseaseNames.filter((n) => n === name).length;
        console.log(`    - ${name}: ${count} cases`);
      });

      console.log(`\n✅ Custom diseases found in database`);
      console.log(`   These should be included in predictions when diseaseType='all'`);
    } else {
      console.log(`\n⚠️  No custom diseases found in database`);
      console.log(`   This might explain why 'other' isn't in predictions`);
    }

  } catch (error) {
    console.error(`\n❌ DATABASE CHECK FAILED:`, error);
  }
}

// ============================================================================
// MAIN TEST EXECUTION
// ============================================================================

async function runAllTests() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║             CUSTOM DISEASE PREDICTIONS INTEGRATION TEST                    ║
║                                                                            ║
║  Purpose: Verify custom diseases are included in prediction generation    ║
║  Bug: 'other' is missing from diseasesToGenerate array                    ║
╚════════════════════════════════════════════════════════════════════════════╝
  `);

  // Test 1: Check database for custom diseases
  await checkDatabaseForCustomDiseases();

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Generate predictions for 'all'
  await testGeneratePredictionsAll();

  // Wait 1 second
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Generate predictions for 'other' only
  await testGeneratePredictionsOther();

  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log(`TEST SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`
✅ IF PASSING:
  - 'other' diseases appear in "all" predictions
  - Custom disease names (Leptospirosis, etc.) are visible
  - R² scores display correctly (not all 0.00/N/A)

❌ IF FAILING:
  - 'other' diseases NOT in "all" predictions
  - Need to add 'other' to diseasesToGenerate array (route.ts line 95)
  - R² scores show 0.00/N/A (back-testing validation issue)

🔧 FIXES NEEDED:
  1. Add 'other' to diseasesToGenerate array when diseaseType === 'all'
  2. Fix back-testing validation to prevent R² = 0
  `);
}

// Run tests
runAllTests().catch(error => {
  console.error(`\n❌ FATAL ERROR:`, error);
  process.exit(1);
});
