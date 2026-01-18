/**
 * Password Validation Utilities
 * Validates password complexity requirements for user registration
 */

export interface PasswordValidationRules {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasDigit: boolean;
  hasSpecialChar: boolean;
}

export interface PasswordRequirement {
  id: keyof PasswordValidationRules;
  label: string;
  regex?: RegExp;
  test: (password: string) => boolean;
}

/**
 * Password complexity requirements
 */
export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    id: 'minLength',
    label: 'At least 8 characters',
    test: (password: string) => password.length >= 8,
  },
  {
    id: 'hasUppercase',
    label: 'At least one uppercase letter (A-Z)',
    regex: /[A-Z]/,
    test: (password: string) => /[A-Z]/.test(password),
  },
  {
    id: 'hasLowercase',
    label: 'At least one lowercase letter (a-z)',
    regex: /[a-z]/,
    test: (password: string) => /[a-z]/.test(password),
  },
  {
    id: 'hasDigit',
    label: 'At least one digit (0-9)',
    regex: /[0-9]/,
    test: (password: string) => /[0-9]/.test(password),
  },
  {
    id: 'hasSpecialChar',
    label: 'At least one special character (!@#$%^&*)',
    regex: /[!@#$%^&*(),.?":{}|<>]/,
    test: (password: string) => /[!@#$%^&*(),.?":{}|<>]/.test(password),
  },
];

/**
 * Validates password against all complexity requirements
 * @param password - Password string to validate
 * @returns Object with boolean values for each requirement
 */
export function validatePasswordComplexity(password: string): PasswordValidationRules {
  if (!password) {
    return {
      minLength: false,
      hasUppercase: false,
      hasLowercase: false,
      hasDigit: false,
      hasSpecialChar: false,
    };
  }

  return {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
}

/**
 * Checks if all password requirements are met
 * @param rules - Password validation rules object
 * @returns True if all requirements are met
 */
export function isPasswordValid(rules: PasswordValidationRules): boolean {
  return Object.values(rules).every((rule) => rule === true);
}

/**
 * Gets array of error messages for failed requirements
 * @param rules - Password validation rules object
 * @returns Array of error messages for failed requirements
 */
export function getPasswordErrorMessages(rules: PasswordValidationRules): string[] {
  const errors: string[] = [];

  if (!rules.minLength) {
    errors.push('Password must be at least 8 characters');
  }
  if (!rules.hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!rules.hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!rules.hasDigit) {
    errors.push('Password must contain at least one digit');
  }
  if (!rules.hasSpecialChar) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return errors;
}

/**
 * Gets a summary error message for display
 * @param rules - Password validation rules object
 * @returns Single error message or empty string if valid
 */
export function getPasswordErrorSummary(rules: PasswordValidationRules): string {
  const errors = getPasswordErrorMessages(rules);
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return `Password must meet ${errors.length} requirements`;
}

/**
 * Calculates password strength as a percentage
 * @param rules - Password validation rules object
 * @returns Password strength percentage (0-100)
 */
export function calculatePasswordStrength(rules: PasswordValidationRules): number {
  const total = Object.keys(rules).length;
  const passed = Object.values(rules).filter((rule) => rule === true).length;
  return Math.round((passed / total) * 100);
}
