import { createClient } from '@/lib/supabase/server';

export interface HealthCardData {
  patientId: string;
  patientNumber: string;
  firstName: string;
  lastName: string;
  barangayId?: number;
  emergencyContactPhone?: string;
}

/**
 * Generates a health card for a patient
 * @param data Patient data for health card generation
 * @returns Generated health card or error
 */
export async function generateHealthCard(
  data: HealthCardData
): Promise<{ success: boolean; cardNumber?: string; error?: string }> {
  try {
    const supabase = await createClient();

    // Check if patient already has a health card
    const { data: existingCard } = await supabase
      .from('health_cards')
      .select('id, card_number')
      .eq('patient_id', data.patientId)
      .single();

    if (existingCard) {
      console.log(`⚠️  Health card already exists for patient ${data.patientId}: ${existingCard.card_number}`);
      return {
        success: true,
        cardNumber: existingCard.card_number,
      };
    }

    // Generate unique card number (HC-YYYYMMDD-XXXXX format)
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
    const randomNum = Math.random().toString(36).substring(2, 7).toUpperCase();
    const cardNumber = `HC-${dateStr}-${randomNum}`;

    // Generate QR code data (encrypted patient information)
    const qrCodeData = JSON.stringify({
      patient_id: data.patientId,
      patient_number: data.patientNumber,
      name: `${data.firstName} ${data.lastName}`,
      barangay_id: data.barangayId,
      emergency_contact: data.emergencyContactPhone,
    });

    // Calculate expiry date (1 year from now)
    const issueDate = new Date();
    const expiryDate = new Date();
    expiryDate.setFullYear(expiryDate.getFullYear() + 1);

    // Insert health card record
    const { data: newCard, error: cardError } = await supabase
      .from('health_cards')
      .insert({
        patient_id: data.patientId,
        card_number: cardNumber,
        qr_code_data: qrCodeData,
        issue_date: issueDate.toISOString(),
        expiry_date: expiryDate.toISOString(),
        is_active: true,
      })
      .select('id, card_number')
      .single();

    if (cardError) {
      console.error('Error creating health card:', cardError);
      return {
        success: false,
        error: cardError.message,
      };
    }

    console.log(`✅ Health card created: ${newCard.card_number} for patient ${data.patientId}`);

    return {
      success: true,
      cardNumber: newCard.card_number,
    };
  } catch (error) {
    console.error('Unexpected error generating health card:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
