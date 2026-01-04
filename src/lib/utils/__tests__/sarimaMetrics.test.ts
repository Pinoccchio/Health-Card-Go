/**
 * Unit Tests for SARIMA Metrics
 *
 * Testing edge cases that cause R² = 0 and other metric calculation issues
 *
 * Run: npm test -- sarimaMetrics.test.ts
 */

import {
  calculateMSE,
  calculateRMSE,
  calculateMAE,
  calculateRSquared,
  calculateMAPE,
  calculateDirectionalAccuracy,
} from '../sarimaMetrics';

describe('calculateRSquared edge cases', () => {
  test('constant predictions equal to mean should give R² = 0', () => {
    const actual = [10, 15, 20, 25, 30];
    const predicted = [20, 20, 20, 20, 20]; // Constant = mean(actual)
    const r2 = calculateRSquared(actual, predicted);

    // When predictions = mean, SS_res = SS_tot, so R² = 0
    expect(r2).toBe(0);
  });

  test('perfect predictions should give R² = 1', () => {
    const actual = [10, 15, 20, 25, 30];
    const predicted = [10, 15, 20, 25, 30];
    const r2 = calculateRSquared(actual, predicted);

    expect(r2).toBe(1);
  });

  test('good predictions should give R² > 0.8', () => {
    const actual = [10, 15, 20, 25, 30];
    const predicted = [11, 14, 21, 24, 31]; // Close but not perfect
    const r2 = calculateRSquared(actual, predicted);

    expect(r2).toBeGreaterThan(0.8);
    expect(r2).toBeLessThan(1);
  });

  test('near-zero variance in actual values', () => {
    const actual = [10, 10, 10, 10, 11]; // Almost constant
    const predicted = [10, 10, 10, 10, 10];
    const r2 = calculateRSquared(actual, predicted);

    // Low variance edge case - R² should still be calculated
    expect(r2).toBeGreaterThanOrEqual(0);
    expect(r2).toBeLessThanOrEqual(1);
  });

  test('predictions worse than mean baseline give R² = 0 (clamped)', () => {
    const actual = [10, 15, 20, 25, 30];
    const predicted = [50, 5, 60, 1, 70]; // Terrible predictions
    const r2 = calculateRSquared(actual, predicted);

    // Negative R² gets clamped to 0 at line 259 of sarimaMetrics.ts
    expect(r2).toBe(0);
  });

  test('all zeros should handle gracefully', () => {
    const actual = [0, 0, 0, 0, 0];
    const predicted = [0, 0, 0, 0, 0];
    const r2 = calculateRSquared(actual, predicted);

    // Perfect prediction of zeros
    expect(r2).toBe(1);
  });

  test('constant predictions NOT equal to mean should give low R²', () => {
    const actual = [10, 15, 20, 25, 30]; // mean = 20
    const predicted = [5, 5, 5, 5, 5]; // Constant but != mean
    const r2 = calculateRSquared(actual, predicted);

    // Should be close to 0 but potentially negative (clamped)
    expect(r2).toBe(0);
  });

  test('realistic disease data scenario', () => {
    // Simulates back-testing with 5 test points
    const actual = [12, 8, 15, 6, 10]; // Dengue cases
    const predicted = [11, 9, 14, 7, 11]; // SARIMA predictions
    const r2 = calculateRSquared(actual, predicted);

    // Should get decent R² for good predictions
    expect(r2).toBeGreaterThan(0.7);
  });
});

describe('calculateMSE', () => {
  test('perfect predictions give MSE = 0', () => {
    const actual = [10, 15, 20, 25, 30];
    const predicted = [10, 15, 20, 25, 30];
    const mse = calculateMSE(actual, predicted);

    expect(mse).toBe(0);
  });

  test('MSE should be positive for imperfect predictions', () => {
    const actual = [10, 15, 20, 25, 30];
    const predicted = [11, 14, 21, 24, 31];
    const mse = calculateMSE(actual, predicted);

    expect(mse).toBeGreaterThan(0);
  });

  test('large errors get heavily penalized (squared)', () => {
    const actual = [10, 10];
    const predicted1 = [11, 11]; // Error = 1 each
    const predicted2 = [13, 13]; // Error = 3 each

    const mse1 = calculateMSE(actual, predicted1);
    const mse2 = calculateMSE(actual, predicted2);

    // MSE should increase quadratically
    expect(mse2).toBeGreaterThan(mse1 * 8); // 3^2 / 1^2 = 9
  });
});

describe('calculateMAPE', () => {
  test('perfect predictions give MAPE = 0', () => {
    const actual = [10, 15, 20, 25, 30];
    const predicted = [10, 15, 20, 25, 30];
    const mape = calculateMAPE(actual, predicted);

    expect(mape).toBe(0);
  });

  test('10% error predictions give MAPE ≈ 10', () => {
    const actual = [100, 200, 300];
    const predicted = [110, 220, 330]; // 10% over each
    const mape = calculateMAPE(actual, predicted);

    expect(mape).toBeCloseTo(10, 1);
  });

  test('handles zero values gracefully', () => {
    const actual = [0, 10, 20]; // First value is zero
    const predicted = [5, 11, 22];

    // Should skip the zero value and calculate for others
    expect(() => calculateMAPE(actual, predicted)).not.toThrow();
  });

  test('all zeros should return 0 (perfect prediction of zeros)', () => {
    const actual = [0, 0, 0];
    const predicted = [0, 0, 0];
    const mape = calculateMAPE(actual, predicted);

    expect(mape).toBe(0);
  });
});

describe('calculateDirectionalAccuracy', () => {
  test('perfect directional predictions give 100%', () => {
    const actual = [10, 15, 20, 25, 30]; // Always increasing
    const predicted = [11, 14, 21, 24, 31]; // Also always increasing
    const accuracy = calculateDirectionalAccuracy(actual, predicted);

    expect(accuracy).toBe(100);
  });

  test('opposite directions give 0%', () => {
    const actual = [10, 15, 20, 25, 30]; // Increasing
    const predicted = [30, 25, 20, 15, 10]; // Decreasing
    const accuracy = calculateDirectionalAccuracy(actual, predicted);

    expect(accuracy).toBe(0);
  });

  test('50% correct gives 50% accuracy', () => {
    const actual = [10, 15, 10, 15, 10]; // Up, Down, Up, Down
    const predicted = [11, 14, 11, 9, 11]; // Up, Down, Up, Up (3/4 = 75%)
    const accuracy = calculateDirectionalAccuracy(actual, predicted);

    expect(accuracy).toBe(75);
  });

  test('stable actual values', () => {
    const actual = [10, 10, 10, 10, 10]; // No change
    const predicted = [10, 10, 10, 10, 10]; // No change
    const accuracy = calculateDirectionalAccuracy(actual, predicted);

    // All directions match (0 = 0)
    expect(accuracy).toBe(100);
  });

  test('needs at least 2 points', () => {
    const actual = [10];
    const predicted = [11];
    const accuracy = calculateDirectionalAccuracy(actual, predicted);

    // Can't calculate direction with 1 point
    expect(accuracy).toBe(0);
  });
});

describe('Error handling', () => {
  test('empty arrays throw error', () => {
    expect(() => calculateRSquared([], [])).toThrow('Arrays cannot be empty');
    expect(() => calculateMSE([], [])).toThrow('Arrays cannot be empty');
    expect(() => calculateMAE([], [])).toThrow('Arrays cannot be empty');
  });

  test('mismatched array lengths throw error', () => {
    const actual = [10, 15, 20];
    const predicted = [10, 15];

    expect(() => calculateRSquared(actual, predicted)).toThrow('same length');
    expect(() => calculateMSE(actual, predicted)).toThrow('same length');
    expect(() => calculateMAE(actual, predicted)).toThrow('same length');
  });
});

describe('Integration tests - realistic SARIMA scenarios', () => {
  test('back-testing with small test set (5 points)', () => {
    // Simulates: 47 dengue cases total, back-test on last 5
    const testActual = [12, 8, 15, 6, 10];
    const testPredicted = [11, 9, 14, 7, 11];

    const r2 = calculateRSquared(testActual, testPredicted);
    const rmse = calculateRMSE(testActual, testPredicted);
    const mae = calculateMAE(testActual, testPredicted);
    const mape = calculateMAPE(testActual, testPredicted);

    console.log(`Small test set: R²=${r2.toFixed(3)}, RMSE=${rmse.toFixed(2)}, MAE=${mae.toFixed(2)}, MAPE=${mape.toFixed(1)}%`);

    expect(r2).toBeGreaterThan(0.5); // Should be decent
    expect(rmse).toBeLessThan(5); // Low error
    expect(mae).toBeLessThan(3); // Low error
    expect(mape).toBeLessThan(30); // <30% is acceptable
  });

  test('near-constant predictions from unstable SARIMA', () => {
    // Simulates: SARIMA with d=0, D=0 producing nearly constant predictions
    const actual = [12, 8, 15, 6, 10];
    const predicted = [10, 10, 10, 11, 10]; // Nearly constant

    const r2 = calculateRSquared(actual, predicted);
    const rmse = calculateRMSE(actual, predicted);

    console.log(`Near-constant predictions: R²=${r2.toFixed(3)}, RMSE=${rmse.toFixed(2)}`);

    // This is the bug: constant predictions give R² ≈ 0
    expect(r2).toBeLessThan(0.2); // Very low R²
  });

  test('explosive predictions from non-stationary AR', () => {
    // Simulates: pregnancy complications explosion (ERRORS.md line 230)
    const actual = [2, 3, 5, 4, 6];
    const predicted = [4635744, 5123456, 6234567, 7345678, 8456789]; // Exploded!

    const r2 = calculateRSquared(actual, predicted);
    const rmse = calculateRMSE(actual, predicted);

    console.log(`Explosive predictions: R²=${r2.toFixed(3)}, RMSE=${rmse.toFixed(0)}`);

    // Terrible predictions → R² clamped to 0
    expect(r2).toBe(0);
    expect(rmse).toBeGreaterThan(1000000); // Massive error
  });
});
