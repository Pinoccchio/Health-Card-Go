/**
 * Barangay Fuzzy Matching Utility
 *
 * Provides intelligent matching for barangay names to handle common variations:
 * - Abbreviations: "Pob." ↔ "Poblacion"
 * - Partial names: "Gredu" → "Gredu (Poblacion)"
 * - Case insensitivity
 * - Extra whitespace
 * - System-wide variants: "Outside Zone", empty string → NULL
 *
 * This allows users to input natural barangay names without requiring
 * exact database spellings in Excel imports.
 */

export interface Barangay {
  id: number;
  name: string;
  code: string;
}

/**
 * Normalizes a barangay name for fuzzy matching
 * - Lowercase
 * - Trim whitespace
 * - Normalize "Pob." ↔ "Poblacion"
 */
function normalizeBarangayName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .replace(/\bpoblacion\b/g, 'pob.') // Normalize "Poblacion" → "Pob."
    .replace(/\bpob\b(?!\.)/g, 'pob.'); // "Pob" → "Pob." (ensure dot)
}

/**
 * Checks if input is a "system-wide" variant (should map to NULL barangay_id)
 */
function isSystemWide(input: string): boolean {
  const normalized = input.toLowerCase().trim();
  const systemWideVariants = [
    '',
    'system-wide',
    'systemwide',
    'outside zone',
    'all',
    'all barangays',
    'n/a',
    'na',
    'none',
  ];
  return systemWideVariants.includes(normalized);
}

/**
 * Finds matching barangay using fuzzy matching strategies
 *
 * @param input - User-provided barangay name (from Excel)
 * @param barangays - Array of valid barangays from database
 * @returns Matched barangay object, or null if no match found
 *
 * Matching strategies (in order of priority):
 * 1. Exact match (case-sensitive)
 * 2. Exact match (case-insensitive)
 * 3. Normalized match (handles "Pob." ↔ "Poblacion")
 * 4. Partial match (input without suffix matches barangay with suffix)
 * 5. Contains match (barangay name contains input as substring)
 */
export function findMatchingBarangay(
  input: string | undefined | null,
  barangays: Barangay[]
): Barangay | null {
  // Handle empty/null input
  if (!input || input.trim() === '') {
    return null;
  }

  const trimmedInput = input.trim();

  // Check if system-wide variant
  if (isSystemWide(trimmedInput)) {
    return null; // NULL barangay_id for system-wide data
  }

  // Strategy 1: Exact match (case-sensitive)
  let match = barangays.find((b) => b.name === trimmedInput);
  if (match) return match;

  // Strategy 2: Exact match (case-insensitive)
  match = barangays.find(
    (b) => b.name.toLowerCase() === trimmedInput.toLowerCase()
  );
  if (match) return match;

  // Strategy 3: Normalized match (handles "Pob." ↔ "Poblacion")
  const normalizedInput = normalizeBarangayName(trimmedInput);
  match = barangays.find(
    (b) => normalizeBarangayName(b.name) === normalizedInput
  );
  if (match) return match;

  // Strategy 4: Partial match (input without suffix matches barangay WITH suffix)
  // Example: "Gredu" → "Gredu (Poblacion)"
  // Example: "New Pandan" → "New Pandan (Pob.)"
  match = barangays.find((b) => {
    // Extract base name (everything before parenthesis)
    const baseName = b.name.split('(')[0].trim();
    return baseName.toLowerCase() === trimmedInput.toLowerCase();
  });
  if (match) return match;

  // Strategy 5: Reverse partial match (barangay base name matches input WITH suffix)
  // Example: "San Francisco (Poblacion)" → "San Francisco (Pob.)"
  const inputBaseName = trimmedInput.split('(')[0].trim();
  match = barangays.find((b) => {
    const baseName = b.name.split('(')[0].trim();
    return baseName.toLowerCase() === inputBaseName.toLowerCase();
  });
  if (match) return match;

  // Strategy 6: Contains match (barangay name contains input as substring)
  // Only if input is at least 4 characters to avoid false positives
  if (trimmedInput.length >= 4) {
    match = barangays.find((b) =>
      b.name.toLowerCase().includes(trimmedInput.toLowerCase())
    );
    if (match) return match;
  }

  // No match found
  return null;
}

/**
 * Validates barangay name and returns match result with helpful feedback
 *
 * @param input - User-provided barangay name
 * @param barangays - Array of valid barangays
 * @returns Object with isValid flag, matched barangay (if found), and error message
 */
export function validateBarangayName(
  input: string | undefined | null,
  barangays: Barangay[]
): {
  isValid: boolean;
  barangay: Barangay | null;
  error: string | null;
} {
  // Empty input is valid (means system-wide data)
  if (!input || input.trim() === '' || isSystemWide(input.trim())) {
    return {
      isValid: true,
      barangay: null,
      error: null,
    };
  }

  const match = findMatchingBarangay(input, barangays);

  if (match) {
    return {
      isValid: true,
      barangay: match,
      error: null,
    };
  }

  // No match found - provide helpful suggestions
  const suggestions = findSimilarBarangays(input, barangays);
  const suggestionText =
    suggestions.length > 0
      ? ` Did you mean: ${suggestions.slice(0, 3).map((b) => `"${b.name}"`).join(', ')}?`
      : ' Check the "Barangay List" sheet in the Excel template for valid names.';

  return {
    isValid: false,
    barangay: null,
    error: `Barangay "${input}" not found.${suggestionText}`,
  };
}

/**
 * Finds similar barangays using Levenshtein-like distance
 * (simple implementation for "Did you mean?" suggestions)
 */
function findSimilarBarangays(
  input: string,
  barangays: Barangay[],
  maxResults: number = 3
): Barangay[] {
  const inputLower = input.toLowerCase().trim();

  // Score each barangay based on similarity
  const scored = barangays.map((barangay) => {
    const nameLower = barangay.name.toLowerCase();
    let score = 0;

    // Starts with input
    if (nameLower.startsWith(inputLower)) {
      score += 100;
    }

    // Contains input
    if (nameLower.includes(inputLower)) {
      score += 50;
    }

    // Base name (before parenthesis) starts with input
    const baseName = nameLower.split('(')[0].trim();
    if (baseName.startsWith(inputLower)) {
      score += 80;
    }

    // Word boundary match (input matches a whole word in the name)
    const words = nameLower.split(/\s+/);
    if (words.some((word) => word.startsWith(inputLower))) {
      score += 70;
    }

    // Levenshtein distance (simple character overlap)
    const overlapCount = inputLower
      .split('')
      .filter((char) => nameLower.includes(char)).length;
    score += overlapCount;

    return { barangay, score };
  });

  // Sort by score (descending) and return top N
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map((item) => item.barangay);
}

/**
 * Helper function to get barangay ID from user input
 *
 * @param input - User-provided barangay name
 * @param barangays - Array of valid barangays
 * @returns Barangay ID (number) or null for system-wide
 */
export function getBarangayId(
  input: string | undefined | null,
  barangays: Barangay[]
): number | null {
  const match = findMatchingBarangay(input, barangays);
  return match ? match.id : null;
}
