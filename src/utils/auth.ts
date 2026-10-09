/**
 * Authentication and credential utilities for Teenverse
 */

// SHA-256 password hashing with application salt
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + '_teenverse_auth_salt_#77');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Sanitize username to be safe as a Firebase Realtime Database path key
export function sanitizeDbKey(key: string): string {
  return key
    .trim()
    .toLowerCase()
    .replace(/[.#$\[\]\/]/g, '_');
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Validate username (3 to 20 chars, allowed characters)
export function isValidUsername(username: string): { valid: boolean; message?: string } {
  const trimmed = username.trim();
  if (trimmed.length < 3) {
    return { valid: false, message: 'Username must be at least 3 characters long.' };
  }
  if (trimmed.length > 20) {
    return { valid: false, message: 'Username cannot be longer than 20 characters.' };
  }
  if (!/^[a-zA-Z0-9_ -]+$/.test(trimmed)) {
    return { valid: false, message: 'Username can only contain letters, numbers, spaces, dashes, or underscores.' };
  }
  return { valid: true };
}
