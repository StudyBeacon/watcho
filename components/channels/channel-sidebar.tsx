"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Hash,
  Volume2,
  MonitorPlay,
  Plus,
  ChevronDown,
  Settings,
  LogOut,
  User,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CreateChannelModal } from "./create-channel-modal";
import { createClient } from "@/lib/supabase/client";
import { ServerSettingsModal } from "@/components/servers/server-settings-modal";
import { MemberListModal } from "@/components/servers/member-list-modal";
import { ChannelSettingsModal } from "./channel-settings-modal";
import type { Channel, Server, Profile, UserRole } from "@/types/database";

interface ChannelSidebarProps {
  server: Server;
  channels: Channel[];
  profile: Profile | null;
  userRole: UserRole;
}

export function ChannelSidebar({
  server,
  channels,
  profile,
  userRole,
}: ChannelSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(false);
  const [channelSettings, setChannelSettings] = useState<Channel | null>(null);

  const canManage = userRole === "owner" || userRole === "admin";
  const isOwner = userRole === "owner";

  const textChannels = channels.filter((c) => c.type === "text");
  const voiceChannels = channels.filter((c) => c.type === "voice");
  const watchChannels = channels.filter((c) => c.type === "watch");

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function getChannelIcon(type: Channel["type"]) {
    switch (type) {
      case "text":
        return Hash;
      case "voice":
        return Volume2;
      case "watch":
        return MonitorPlay;
    }
  }

  function renderChannelGroup(
    label: string,
    channels: Channel[]
  ) {
    if (channels.length === 0) return null;

    return (
      <div className="mb-2">
        <div className="flex items-center justify-between px-2 py-1 group">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-label-tertiary">
            {label}
          </span>
          {canManage && (
            <button
              onClick={() => setCreateOpen(true)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-fill text-label-secondary transition-all"
            >
              <Plus size={14} />
            </button>
          )}
        </div>
        <div className="flex flex-col gap-0.5">
          {channels.map((channel) => {
            const Icon = getChannelIcon(channel.type);
            const isActive = pathname.includes(`/channels/${channel.id}`);
            return (
              <Link
                key={channel.id}
                href={`/servers/${server.id}/channels/${channel.id}`}
                className={cn(
                  "group flex items-center gap-2 px-2 py-1.5 rounded-lg text-[14px] transition-colors",
                  isActive
                    ? "bg-fill text-label font-medium"
                    : "text-label-secondary hover:bg-fill hover:text-label"
                )}
              >
                <Icon size={18} className="shrink-0 opacity-70" />
                <span className="truncate flex-1">{channel.name}</span>
                {canManage && isActive && (
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setChannelSettings(channel);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-label-tertiary hover:text-label hover:bg-fill-active transition-all"
                    title="Channel settings"
                  >
                    <Settings size={13} />
                  </button>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <>
      <aside className="w-60 shrink-0 h-full flex flex-col bg-bg-secondary border-r border-separator">
        {/* Server header */}
        <div className="h-12 flex items-center justify-between px-4 border-b border-separator glass gap-2">
          <span className="font-semibold text-[15px] text-label truncate">
            {server.name}
          </span>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setMembersOpen(true)}
              className="p-1 rounded-md hover:bg-fill text-label-secondary transition-colors"
              title="View members"
            >
              <Users size={16} />
            </button>
            {canManage && (
              <button
                onClick={() => setSettingsOpen(true)}
                className="p-1 rounded-md hover:bg-fill text-label-secondary transition-colors"
                title="Server settings"
              >
                <Settings size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Channel list */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {renderChannelGroup("Text Channels", textChannels)}
          {renderChannelGroup("Voice Channels", voiceChannels)}
          {renderChannelGroup("Watch Parties", watchChannels)}

          {canManage && channels.length === 0 && (
            <button
              onClick={() => setCreateOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[14px] text-accent hover:bg-accent-fill transition-colors"
            >
              <Plus size={16} />
              Create Channel
            </button>
          )}
        </div>

        {/* User panel */}
        <div className="relative border-t border-separator">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center gap-2 p-2.5 hover:bg-fill transition-colors"
          >
            <Avatar
              src={profile?.avatar_url}
              name={profile?.username || "User"}
              size="sm"
              status="online"
            />
            <div className="flex-1 text-left min-w-0">
              <p className="text-[13px] font-medium text-label truncate">
                {profile?.username || "User"}
              </p>
              <p className="text-[11px] text-label-tertiary">
                {userRole === "owner" ? "Owner" : userRole}
              </p>
            </div>
            <ChevronDown
              size={16}
              className="text-label-secondary shrink-0"
            />
          </button>

          {/* Dropdown menu */}
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute bottom-full left-2 right-2 mb-1 rounded-xl bg-bg-tertiary border border-separator shadow-lg overflow-hidden z-20 animate-scale-in">
                <button
                  onClick={() => setMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-label hover:bg-fill transition-colors"
                >
                  <User size={16} className="text-label-secondary" />
                  Profile
                </button>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[14px] text-error hover:bg-fill transition-colors"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </aside>

      <CreateChannelModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        serverId={server.id}
      />
      <ServerSettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        serverId={server.id}
        serverName={server.name}
        inviteCode={server.invite_code}
        isOwner={isOwner}
      />
      <MemberListModal
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        serverId={server.id}
        isAdmin={canManage}
      />
      {channelSettings && (
        <ChannelSettingsModal
          open={!!channelSettings}
          onClose={() => setChannelSettings(null)}
          serverId={server.id}
          channel={channelSettings}
        />
      )}
    </>
  );
}
