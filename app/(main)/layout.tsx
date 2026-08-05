import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ServerSidebar } from "@/components/servers/server-sidebar";
import type { Profile, Server } from "@/types/database";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Get user's servers
  const { data: memberships } = await supabase
    .from("server_members")
    .select("server_id")
    .eq("user_id", user.id);

  const serverIds = memberships?.map((m) => m.server_id) || [];

  let servers: Server[] = [];
  if (serverIds.length > 0) {
    const { data } = await supabase
      .from("servers")
      .select("*")
      .in("id", serverIds)
      .order("created_at", { ascending: true });
    servers = (data as Server[]) || [];
  }

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ServerSidebar servers={servers} profile={profile as Profile | null} />
      <div className="flex-1 flex overflow-hidden">{children}</div>
    </div>
  );
}