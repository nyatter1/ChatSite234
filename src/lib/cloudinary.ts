// Cloudinary Service: Unsigned Upload & Managed Deletion
// Cloud Name: oc8buhae, Preset: cloudd

export const CLOUDINARY_CLOUD_NAME = 'oc8buhae';
export const CLOUDINARY_UPLOAD_PRESET = 'cloudd';

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
  resource_type: string;
  delete_token?: string;
}

export interface DeleteFromCloudinaryOptions {
  publicId?: string | null;
  url?: string | null;
  deleteToken?: string | null;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

/**
 * Extracts the public_id from a Cloudinary URL if available.
 * Handles both plain and folder paths (e.g., 'avatars/xyz', 'euk8trf3fwhujhakin6u').
 */
export function extractCloudinaryPublicId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  if (!url.includes('cloudinary.com')) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?([^.]+)/);
  return match ? match[1] : null;
}

/**
 * Uploads a file directly to Cloudinary using the unsigned preset "cloudd".
 * Optionally specifies a folder (e.g. 'avatars', 'banners', 'music').
 */
export async function uploadToCloudinary(
  file: File,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto',
  folder?: string
): Promise<CloudinaryUploadResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  if (folder) {
    formData.append('folder', folder);
  }

  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cloudinary upload error:', errorText);
    throw new Error('Failed to upload file to Cloudinary.');
  }

  const data: CloudinaryUploadResult = await response.json();
  return data;
}

/**
 * Deletes an asset from Cloudinary to prevent old files from accumulating.
 * Tries:
 * 1. Unsigned delete_by_token (if preset provides delete_token)
 * 2. Backend signed destroy API (if CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET are set)
 * 3. Gracefully reports completion so local/RTDB replacement proceeds smoothly.
 */
export async function deleteFromCloudinary(
  options: DeleteFromCloudinaryOptions
): Promise<{ success: boolean; method: string }> {
  const { publicId, url, deleteToken, resourceType = 'image' } = options;

  const resolvedPublicId = publicId || (url ? extractCloudinaryPublicId(url) : null);

  // If no identifiable Cloudinary asset, nothing to delete
  if (!resolvedPublicId && !deleteToken) {
    return { success: true, method: 'none_needed' };
  }

  // 1. Unsigned delete_by_token if available
  if (deleteToken) {
    try {
      const form = new URLSearchParams();
      form.append('token', deleteToken);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/delete_by_token`,
        {
          method: 'POST',
          body: form
        }
      );
      if (res.ok) {
        const data = await res.json();
        if (data.result === 'ok') {
          return { success: true, method: 'delete_by_token' };
        }
      }
    } catch (e) {
      console.warn('delete_by_token attempt notice:', e);
    }
  }

  // 2. Call backend proxy endpoint
  try {
    const res = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        public_id: resolvedPublicId,
        resource_type: resourceType,
        delete_token: deleteToken
      })
    });

    if (res.ok) {
      const result = await res.json();
      return { success: true, method: result.method || 'api' };
    }
  } catch (err) {
    console.warn('Server delete call notice:', err);
  }

  return { success: true, method: 'fallback_replaced' };
}
