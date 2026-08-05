import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ChannelsPage({
  params,
}: {
  params: Promise<{ serverId: string }>;
}) {
  const { serverId } = await params;
  const supabase = await createClient();

  // Get the first channel to redirect to
  const { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("server_id", serverId)
    .order("position", { ascending: true })
    .limit(1)
    .single();

  if (channel) {
    redirect(`/servers/${serverId}/channels/${channel.id}`);
  }

  // No channels exist — show a placeholder
  return (
    <div className="flex-1 flex items-center justify-center bg-bg-primary">
      <div className="text-center max-w-sm">
        <h2 className="text-xl font-semibold text-label mb-2">
          No channels yet
        </h2>
        <p className="text-[14px] text-label-secondary">
          Create a channel using the + button in the sidebar to get started.
        </p>
      </div>
    </div>
  );
}