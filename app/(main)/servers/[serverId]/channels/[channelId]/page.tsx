import { redirect } from "next/navigation";
import { Hash, Volume2, MonitorPlay, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ChatChannel } from "@/components/chat/chat-channel";
import { VoiceChannel } from "@/components/voice/voice-channel";
import { WatchChannel } from "@/components/watch/watch-channel";
import type { Channel, Profile } from "@/types/database";

export default async function ChannelPage({
  params,
}: {
  params: Promise<{ serverId: string; channelId: string }>;
}) {
  const { serverId, channelId } = await params;
  const supabase = await createClient();

  // Get channel details
  const { data: channel } = await supabase
    .from("channels")
    .select("*")
    .eq("id", channelId)
    .eq("server_id", serverId)
    .single();

  if (!channel) {
    redirect(`/servers/${serverId}/channels`);
  }

  const typedChannel = channel as Channel;

  // Get current user's profile
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: Profile | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = (data as Profile) || null;
  }

  // Get member count
  const { count } = await supabase
    .from("server_members")
    .select("user_id", { count: "exact", head: true })
    .eq("server_id", serverId);

  const channelIcons = {
    text: Hash,
    voice: Volume2,
    watch: MonitorPlay,
  };

  const Icon = channelIcons[typedChannel.type];

  const channelDescriptions: Record<string, string> = {
    text: "Send messages, share links, and chat with your friends in real time.",
    voice: "Join voice and video calls with high-quality screen sharing.",
    watch: "Watch movies together with synced playback and shared controls.",
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-primary">
      {/* Channel header */}
      <header className="h-12 flex items-center gap-2 px-4 border-b border-separator glass shrink-0">
        <Icon size={20} className="text-label-secondary" />
        <span className="font-semibold text-[15px] text-label">
          {typedChannel.name}
        </span>
        <span className="w-px h-5 bg-separator mx-2" />
        <span className="text-[13px] text-label-tertiary hidden sm:block">
          {channelDescriptions[typedChannel.type]}
        </span>
        <div className="ml-auto flex items-center gap-2 text-[13px] text-label-tertiary">
          <Users size={14} />
          <span>{count || 0}</span>
        </div>
      </header>

      {/* Channel content */}
      {typedChannel.type === "text" ? (
        <ChatChannel channelId={channelId} profile={profile} />
      ) : typedChannel.type === "voice" ? (
        <VoiceChannel
          channelId={channelId}
          serverId={serverId}
          profile={profile}
        />
      ) : (
        <WatchChannel
          channelId={channelId}
          serverId={serverId}
          profile={profile}
        />
      )}
    </div>
  );
}