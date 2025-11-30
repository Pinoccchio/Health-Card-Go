export interface ProfileFormData {
  first_name: string;
  last_name: string;
  contact_number: string;
  date_of_birth: string;
  gender: string;
  barangay_id: number | null;
  emergency_contact: {
    name: string;
    phone: string;
    email: string;
  };
  philhealth_number?: string;
  medical_history?: {
    blood_type?: string;
  };
  allergies?: string[];
  current_medications?: string;
  accessibility_requirements?: string;
}

export interface ValidationErrors {
  first_name?: string;
  last_name?: string;
  contact_number?: string;
  date_of_birth?: string;
  gender?: string;
  barangay_id?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_email?: string;
}

export function validateProfileForm(data: Partial<ProfileFormData>): ValidationErrors {
  const errors: ValidationErrors = {};

  // First name validation
  if (!data.first_name || data.first_name.trim() === '') {
    errors.first_name = 'First name is required';
  } else if (data.first_name.trim().length < 2) {
    errors.first_name = 'First name must be at least 2 characters';
  }

  // Last name validation
  if (!data.last_name || data.last_name.trim() === '') {
    errors.last_name = 'Last name is required';
  } else if (data.last_name.trim().length < 2) {
    errors.last_name = 'Last name must be at least 2 characters';
  }

  // Contact number validation (Philippine format)
  if (!data.contact_number || data.contact_number.trim() === '') {
    errors.contact_number = 'Contact number is required';
  } else {
    const phoneRegex = /^(\+639|09)\d{9}$/;
    if (!phoneRegex.test(data.contact_number.trim())) {
      errors.contact_number = 'Invalid phone format. Use +639XXXXXXXXX or 09XXXXXXXXX';
    }
  }

  // Date of birth validation
  if (!data.date_of_birth) {
    errors.date_of_birth = 'Date of birth is required';
  } else {
    const birthDate = new Date(data.date_of_birth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();

    if (birthDate > today) {
      errors.date_of_birth = 'Date of birth cannot be in the future';
    } else if (age > 120) {
      errors.date_of_birth = 'Invalid date of birth';
    } else if (age < 0) {
      errors.date_of_birth = 'Invalid date of birth';
    }
  }

  // Gender validation
  if (!data.gender || data.gender.trim() === '') {
    errors.gender = 'Gender is required';
  } else if (!['male', 'female', 'other'].includes(data.gender)) {
    errors.gender = 'Invalid gender selection';
  }

  // Barangay validation
  if (!data.barangay_id) {
    errors.barangay_id = 'Barangay is required';
  }

  // Emergency contact validation
  if (data.emergency_contact) {
    if (!data.emergency_contact.name || data.emergency_contact.name.trim() === '') {
      errors.emergency_contact_name = 'Emergency contact name is required';
    }

    if (!data.emergency_contact.phone || data.emergency_contact.phone.trim() === '') {
      errors.emergency_contact_phone = 'Emergency contact phone is required';
    } else {
      const phoneRegex = /^(\+639|09)\d{9}$/;
      if (!phoneRegex.test(data.emergency_contact.phone.trim())) {
        errors.emergency_contact_phone = 'Invalid phone format. Use +639XXXXXXXXX or 09XXXXXXXXX';
      }
    }

    // Email is optional, but if provided, must be valid
    if (data.emergency_contact.email && data.emergency_contact.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.emergency_contact.email.trim())) {
        errors.emergency_contact_email = 'Invalid email format';
      }
    }
  }

  return errors;
}

export function hasValidationErrors(errors: ValidationErrors): boolean {
  return Object.keys(errors).length > 0;
}
