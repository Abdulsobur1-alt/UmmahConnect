import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAuth();
    if ("error" in auth) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    // Upload to Supabase Storage
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();
    
    const ext = file.name.split(".").pop() ?? "jpg";
    const fileName = `banners/${auth.userId}/${Date.now()}.${ext}`;
    
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    
    const { data, error } = await supabase.storage
      .from("uploads")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: "upload_failed" }, { status: 500 });
    }

    const { data: urlData } = supabase.storage
      .from("uploads")
      .getPublicUrl(fileName);

    return NextResponse.json({ url: urlData.publicUrl });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
