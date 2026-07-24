import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import crypto from "crypto";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "file_required" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const ext = file.name.split(".").pop() ?? "jpg";
    const filename = `${crypto.randomUUID()}.${ext}`;
    const dir = join(process.cwd(), "public", "uploads", "banners", userId);
    await mkdir(dir, { recursive: true });
    const filepath = join(dir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/banners/${userId}/${filename}`;
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
