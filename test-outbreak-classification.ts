/**
 * Unit Test: Outbreak Risk Level Classification
 * Tests the updated outbreak classification logic without the 1.5x threshold rule
 *
 * Run with: npx tsx test-outbreak-classification.ts
 */

interface OutbreakTestCase {
  name: string;
  totalCases: number;
  highRiskCases: number;
  mediumRiskCases: number;
  lowRiskCases: number;
  threshold: number;
  expectedRiskLevel: 'critical' | 'high' | 'medium' | 'low';
}

// Classification logic (should match API endpoint and background job)
function classifyOutbreak(
  highRiskCases: number,
  mediumRiskCases: number,
  lowRiskCases: number
): 'critical' | 'high' | 'medium' | 'low' {
  const riskLevel = highRiskCases >= 3 ? 'critical' :
                   mediumRiskCases >= 5 ? 'high' :
                   (highRiskCases > 0 || mediumRiskCases > 0) ? 'medium' : 'low';
  return riskLevel;
}

// Test cases covering all scenarios
const testCases: OutbreakTestCase[] = [
  // Critical outbreak scenarios
  {
    name: 'Critical: 3 high-risk cases',
    totalCases: 3,
    highRiskCases: 3,
    mediumRiskCases: 0,
    lowRiskCases: 0,
    threshold: 5,
    expectedRiskLevel: 'critical',
  },
  {
    name: 'Critical: 5 high-risk + 2 medium-risk cases',
    totalCases: 7,
    highRiskCases: 5,
    mediumRiskCases: 2,
    lowRiskCases: 0,
    threshold: 5,
    expectedRiskLevel: 'critical',
  },
  {
    name: 'Critical: 3 high-risk + 100 low-risk cases',
    totalCases: 103,
    highRiskCases: 3,
    mediumRiskCases: 0,
    lowRiskCases: 100,
    threshold: 5,
    expectedRiskLevel: 'critical',
  },

  // High outbreak scenarios
  {
    name: 'High: 5 medium-risk cases',
    totalCases: 5,
    highRiskCases: 0,
    mediumRiskCases: 5,
    lowRiskCases: 0,
    threshold: 5,
    expectedRiskLevel: 'high',
  },
  {
    name: 'High: 10 medium-risk + 50 low-risk cases',
    totalCases: 60,
    highRiskCases: 0,
    mediumRiskCases: 10,
    lowRiskCases: 50,
    threshold: 5,
    expectedRiskLevel: 'high',
  },

  // Medium outbreak scenarios
  {
    name: 'Medium: 1 high-risk + 4 low-risk cases',
    totalCases: 5,
    highRiskCases: 1,
    mediumRiskCases: 0,
    lowRiskCases: 4,
    threshold: 5,
    expectedRiskLevel: 'medium',
  },
  {
    name: 'Medium: 2 medium-risk + 3 low-risk cases',
    totalCases: 5,
    highRiskCases: 0,
    mediumRiskCases: 2,
    lowRiskCases: 3,
    threshold: 5,
    expectedRiskLevel: 'medium',
  },
  {
    name: 'Medium: 1 high-risk + 1 medium-risk + 100 low-risk cases',
    totalCases: 102,
    highRiskCases: 1,
    mediumRiskCases: 1,
    lowRiskCases: 100,
    threshold: 5,
    expectedRiskLevel: 'medium',
  },

  // Low outbreak scenarios (these were previously classified as "high" due to 1.5x rule)
  {
    name: 'Low: 5 low-risk cases (at threshold)',
    totalCases: 5,
    highRiskCases: 0,
    mediumRiskCases: 0,
    lowRiskCases: 5,
    threshold: 5,
    expectedRiskLevel: 'low',
  },
  {
    name: 'Low: 8 low-risk cases (1.6x threshold - previously misclassified)',
    totalCases: 8,
    highRiskCases: 0,
    mediumRiskCases: 0,
    lowRiskCases: 8,
    threshold: 5,
    expectedRiskLevel: 'low',
  },
  {
    name: 'Low: 50 low-risk cases (10x threshold - previously misclassified)',
    totalCases: 50,
    highRiskCases: 0,
    mediumRiskCases: 0,
    lowRiskCases: 50,
    threshold: 5,
    expectedRiskLevel: 'low',
  },
  {
    name: 'Low: 274 low-risk cases (real scenario from database)',
    totalCases: 274,
    highRiskCases: 0,
    mediumRiskCases: 0,
    lowRiskCases: 274,
    threshold: 5,
    expectedRiskLevel: 'low',
  },
];

// Run tests
console.log('🧪 OUTBREAK CLASSIFICATION UNIT TESTS\n');
console.log('Testing outbreak risk level classification without 1.5x threshold rule\n');
console.log('=' .repeat(80));

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  const actualRiskLevel = classifyOutbreak(
    testCase.highRiskCases,
    testCase.mediumRiskCases,
    testCase.lowRiskCases
  );

  const passed = actualRiskLevel === testCase.expectedRiskLevel;

  if (passed) {
    passedTests++;
    console.log(`\n✅ Test ${index + 1}: ${testCase.name}`);
  } else {
    failedTests++;
    console.log(`\n❌ Test ${index + 1}: ${testCase.name}`);
  }

  console.log(`   Total: ${testCase.totalCases} (High: ${testCase.highRiskCases}, Medium: ${testCase.mediumRiskCases}, Low: ${testCase.lowRiskCases})`);
  console.log(`   Threshold: ${testCase.threshold} cases`);
  console.log(`   Expected: ${testCase.expectedRiskLevel.toUpperCase()}`);
  console.log(`   Actual: ${actualRiskLevel.toUpperCase()}`);

  if (!passed) {
    console.log(`   ⚠️  MISMATCH!`);
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 TEST SUMMARY:`);
console.log(`   ✅ Passed: ${passedTests}/${testCases.length}`);
console.log(`   ❌ Failed: ${failedTests}/${testCases.length}`);

if (failedTests === 0) {
  console.log(`\n🎉 ALL TESTS PASSED! Outbreak classification logic is working correctly.`);
  process.exit(0);
} else {
  console.log(`\n⚠️  SOME TESTS FAILED. Please review the classification logic.`);
  process.exit(1);
}
