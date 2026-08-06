import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Server name is required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Ensure profile exists
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        username: user.user_metadata?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`,
      })
      .select()
      .single();

    if (profileError && profileError.code !== "23505") {
      console.error("Profile creation error:", profileError);
      return NextResponse.json({ error: `Failed to create profile: ${profileError.message}` }, { status: 500 });
    }

    // Create server using service role (bypasses RLS)
    const { data: server, error: serverError } = await supabase
      .from("servers")
      .insert({ name, owner_id: user.id })
      .select("id")
      .single();

    if (serverError) {
      console.error("Server creation error:", serverError);
      return NextResponse.json({ error: serverError.message }, { status: 500 });
    }

    // Add owner as server member
    const { error: memberError } = await supabase
      .from("server_members")
      .insert({
        server_id: server.id,
        user_id: user.id,
        role: "owner",
      });

    if (memberError) {
      console.error("Failed to add owner to server:", memberError);
      return NextResponse.json({ error: memberError.message }, { status: 500 });
    }

    // Create default #general channel
    const { error: channelError } = await supabase
      .from("channels")
      .insert({
        server_id: server.id,
        name: "general",
        type: "text",
        position: 0,
      });

    if (channelError) {
      console.error("Failed to create default channel:", channelError);
      return NextResponse.json({ error: channelError.message }, { status: 500 });
    }

    return NextResponse.json({ server });
  } catch (err) {
    console.error("Create server error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create server" },
      { status: 500 }
    );
  }
}