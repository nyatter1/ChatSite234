// Cloudinary Unsigned Upload Service
// Cloud Name: oc8buhae, Preset: cloudd

const CLOUDINARY_CLOUD_NAME = 'oc8buhae';
const CLOUDINARY_UPLOAD_PRESET = 'cloudd';

export interface CloudinaryUploadResult {
  url: string;
  secure_url: string;
  public_id: string;
  bytes: number;
  format: string;
  resource_type: string;
}

/**
 * Uploads a file directly to Cloudinary using the unsigned preset "cloudd".
 * Does NOT post any message to chat or expose internal logs.
 */
export async function uploadToCloudinary(
  file: File,
  resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto'
): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

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
  return data.secure_url || data.url;
}
