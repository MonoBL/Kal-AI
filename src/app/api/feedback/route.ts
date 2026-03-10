import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy-initialized clients (avoid crashing at build time if env vars are missing)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Feedback GET error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "Missing id or status" }, { status: 400 });
    }

    const { data, error } = await getSupabaseAdmin()
      .from("feedback")
      .update({ status })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Feedback update error:", error);
      return NextResponse.json({ error: "Failed to update feedback" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("Feedback PATCH error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const type = formData.get("type") as string;
    const description = formData.get("description") as string;
    const userId = formData.get("user_id") as string | null;
    const email = formData.get("email") as string | null;

    if (!type || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upload screenshots
    const screenshotUrls: string[] = [];
    const files = formData.getAll("screenshots") as File[];

    for (const file of files) {
      if (file.size === 0) continue;
      const ext = file.name.split(".").pop() || "png";
      const path = `${userId || "anonymous"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const sb = getSupabase();
      const { error: uploadError } = await sb.storage
        .from("feedback-screenshots")
        .upload(path, file, { contentType: file.type });

      if (!uploadError) {
        const { data } = sb.storage
          .from("feedback-screenshots")
          .getPublicUrl(path);
        screenshotUrls.push(data.publicUrl);
      }
    }

    // Insert feedback row
    const { data, error } = await getSupabase().from("feedback").insert({
      type,
      description,
      user_id: userId || null,
      email: email || null,
      screenshot_urls: screenshotUrls,
      status: "open",
    }).select().single();

    if (error) {
      console.error("Feedback insert error:", error);
      return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err) {
    console.error("Feedback API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
