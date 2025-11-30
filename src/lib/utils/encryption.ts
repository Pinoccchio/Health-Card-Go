/**
 * Encryption Utilities for Sensitive Medical Records
 *
 * Used for encrypting HIV and Pregnancy records to ensure patient privacy.
 * Uses AES-256-GCM encryption with Web Crypto API.
 */

/**
 * Generate encryption key from environment variable
 * In production, this should be a secure key stored in environment variables
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyString = process.env.MEDICAL_RECORDS_ENCRYPTION_KEY || 'default-key-change-in-production-32bytes!!';

  // Convert string to key material
  const encoder = new TextEncoder();
  const keyMaterial = encoder.encode(keyString.padEnd(32, '0').substring(0, 32));

  // Import as CryptoKey
  return await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt sensitive data using AES-256-GCM
 * @param data - Plain text data to encrypt
 * @returns Base64-encoded encrypted data with IV prepended
 */
export async function encryptData(data: string): Promise<string> {
  try {
    const key = await getEncryptionKey();
    const encoder = new TextEncoder();
    const plaintext = encoder.encode(data);

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt data
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      plaintext
    );

    // Combine IV and ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Convert to base64
    return Buffer.from(combined).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using AES-256-GCM
 * @param encryptedData - Base64-encoded encrypted data with IV prepended
 * @returns Decrypted plain text data
 */
export async function decryptData(encryptedData: string): Promise<string> {
  try {
    const key = await getEncryptionKey();

    // Convert from base64
    const combined = Buffer.from(encryptedData, 'base64');

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt data
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(plaintext);
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt medical record data (JSONB object)
 * Only encrypts the record_data field
 */
export async function encryptMedicalRecordData(recordData: Record<string, any>): Promise<string> {
  const jsonString = JSON.stringify(recordData);
  return await encryptData(jsonString);
}

/**
 * Decrypt medical record data back to JSONB object
 */
export async function decryptMedicalRecordData(encryptedData: string): Promise<Record<string, any>> {
  const jsonString = await decryptData(encryptedData);
  return JSON.parse(jsonString);
}

/**
 * Check if data appears to be encrypted (base64 format)
 */
export function isEncrypted(data: any): boolean {
  if (typeof data === 'string') {
    // Check if it looks like base64
    return /^[A-Za-z0-9+/]+=*$/.test(data) && data.length > 20;
  }
  return false;
}
