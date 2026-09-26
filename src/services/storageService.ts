/**
 * Supabase Storage service for Poultry Bhai product images.
 * Bucket: 'product-images'
 */
import { requireSupabase } from '../lib/supabase';

export const PRODUCT_IMAGES_BUCKET = 'product-images';

/**
 * Uploads an optimized image blob to the dedicated Supabase Storage bucket.
 * Returns the permanent public CDN URL and internal storage path.
 */
export async function uploadProductImage(
  fileBlob: Blob,
  slugOrPrefix = 'product'
): Promise<{ publicUrl: string; storagePath: string }> {
  const supabase = requireSupabase();

  const cleanSlug = slugOrPrefix
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'product';

  const uniqueId = Math.random().toString(36).substring(2, 9);
  const timestamp = Date.now();
  const storagePath = `${cleanSlug}-${timestamp}-${uniqueId}.webp`;

  const { error: uploadError } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .upload(storagePath, fileBlob, {
      contentType: 'image/webp',
      cacheControl: '31536000', // 1 year cache header
      upsert: true,
    });

  if (uploadError) {
    // Surface user-friendly error details
    if (uploadError.message?.includes('bucket not found') || uploadError.message?.includes('Bucket not found')) {
      throw new Error(
        `Supabase Storage bucket "${PRODUCT_IMAGES_BUCKET}" does not exist. Please run the migration script in your Supabase SQL Editor.`
      );
    }
    if (uploadError.message?.includes('violates row-level security') || uploadError.message?.includes('403')) {
      throw new Error(
        'Upload denied by Row Level Security. Ensure your user is authorized in public.admin_users.'
      );
    }
    throw new Error(`Failed to upload product image to Supabase: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .getPublicUrl(storagePath);

  if (!urlData?.publicUrl) {
    throw new Error('Supabase Storage did not return a public URL for the uploaded image.');
  }

  return {
    publicUrl: urlData.publicUrl,
    storagePath,
  };
}

/**
 * Checks if a given image URL resides within the Supabase Storage product-images bucket.
 */
export function isManagedStorageUrl(url?: string | null): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.includes(`/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`) ||
         url.includes(`/${PRODUCT_IMAGES_BUCKET}/`);
}

/**
 * Extracts the storage file path from a Supabase Storage public URL.
 */
export function extractStoragePath(url: string): string | null {
  if (!url || typeof url !== 'string') return null;

  // Pattern 1: standard Supabase public object URL:
  // .../storage/v1/object/public/product-images/<filePath>
  const match1 = url.match(new RegExp(`/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/([^?#]+)`));
  if (match1 && match1[1]) {
    return decodeURIComponent(match1[1]);
  }

  // Pattern 2: custom domain or direct bucket path:
  // .../product-images/<filePath>
  const match2 = url.match(new RegExp(`/${PRODUCT_IMAGES_BUCKET}/([^?#]+)`));
  if (match2 && match2[1]) {
    return decodeURIComponent(match2[1]);
  }

  return null;
}

/**
 * Deletes a product image from Supabase Storage if it is hosted in our product-images bucket.
 * Used during product updates (replacing old image) or product deletions to prevent orphaned files.
 */
export async function deleteStorageImageIfManaged(imageUrl?: string | null): Promise<void> {
  if (!imageUrl || !isManagedStorageUrl(imageUrl)) {
    return;
  }

  const storagePath = extractStoragePath(imageUrl);
  if (!storagePath) {
    return;
  }

  try {
    const supabase = requireSupabase();
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn(`[Storage] Failed to delete previous image "${storagePath}":`, error.message);
    }
  } catch (err: any) {
    console.warn(`[Storage] Error during image cleanup:`, err?.message);
  }
}
