import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChannelSidebar } from "@/components/channels/channel-sidebar";
import type { Channel, Server, Profile, UserRole } from "@/types/database";

export default async function ServerLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check membership and get role
  const { data: membership } = await supabase
    .from("server_members")
    .select("role")
    .eq("server_id", serverId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    // User is not a member of this server
    redirect("/servers");
  }

  // Get server details
  const { data: server } = await supabase
    .from("servers")
    .select("*")
    .eq("id", serverId)
    .single();

  if (!server) redirect("/servers");

  // Get channels
  const { data: channelsData } = await supabase
    .from("channels")
    .select("*")
    .eq("server_id", serverId)
    .order("position", { ascending: true });

  // Get profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <>
      <ChannelSidebar
        server={server as Server}
        channels={(channelsData as Channel[]) || []}
        profile={profile as Profile | null}
        userRole={membership.role as UserRole}
      />
      <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
    </>
  );
}