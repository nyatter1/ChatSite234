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

// Generate persistent browser/hardware device fingerprint for moderation enforcement
export function getDeviceFingerprint(): string {
  try {
    const nav = typeof window !== 'undefined' ? window.navigator : ({} as any);
    const screen = typeof window !== 'undefined' ? window.screen : ({} as any);
    const parts = [
      nav.userAgent || '',
      nav.language || '',
      screen.width || '',
      screen.height || '',
      screen.colorDepth || '',
      nav.hardwareConcurrency || '',
      Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    ];
    let hash = 0;
    const str = parts.join('###');
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return 'fp_' + Math.abs(hash).toString(36);
  } catch (_) {
    return 'fp_default';
  }
}
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
