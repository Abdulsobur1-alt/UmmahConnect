import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/server";

const BUCKET = "uploads";

export async function uploadFile(
  key: string,
  file: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(key, file, {
      contentType,
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(key);

  return urlData.publicUrl;
}

export async function deleteFile(key: string): Promise<void> {
  const supabase = createAdminClient();
  
  const { error } = await supabase.storage
    .from(BUCKET)
    .remove([key]);

  if (error) throw new Error(`Delete failed: ${error.message}`);
}

export async function getUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300,
): Promise<string> {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(key);

  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  
  return data.signedUrl;
}

export function getPublicUrl(key: string): string {
  const supabase = createAdminClient();
  
  const { data } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(key);

  return data.publicUrl;
}
