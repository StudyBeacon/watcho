"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus, Compass, Play } from "lucide-react";
import { cn, getAvatarGradient } from "@/lib/utils";
import { CreateServerModal } from "./create-server-modal";
import { JoinServerModal } from "./join-server-modal";
import type { Server, Profile } from "@/types/database";

interface ServerSidebarProps {
  servers: Server[];
  profile: Profile | null;
}

export function ServerSidebar({ servers, profile }: ServerSidebarProps) {
  const pathname = usePathname();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <>
      {/* Server icon rail */}
      <nav className="w-[72px] shrink-0 h-full flex flex-col items-center gap-2 py-3 bg-bg-secondary border-r border-separator">
        {/* Home / Logo button */}
        <Link
          href="/servers"
          className={cn(
            "h-12 w-12 rounded-2xl flex items-center justify-center transition-all duration-200",
            "bg-accent text-white shadow-sm hover:rounded-xl",
            pathname === "/servers" && "rounded-xl"
          )}
        >
          <Play size={22} className="fill-white ml-0.5" />
        </Link>

        <div className="w-8 h-px bg-separator my-1" />

        {/* Server list */}
        <div className="flex-1 flex flex-col items-center gap-2 overflow-y-auto no-scrollbar">
          {servers.map((server) => {
            const isActive = pathname.startsWith(`/servers/${server.id}`);
            return (
              <Link
                key={server.id}
                href={`/servers/${server.id}/channels`}
                className="group relative flex items-center justify-center"
              >
                {/* Active pill indicator */}
                <span
                  className={cn(
                    "absolute left-0 w-1 rounded-full bg-label transition-all duration-200",
                    isActive ? "h-8" : "h-0 group-hover:h-4"
                  )}
                />
                {/* Server icon */}
                <div
                  className={cn(
                    "h-12 w-12 flex items-center justify-center text-white font-semibold text-base",
                    "transition-all duration-200",
                    isActive
                      ? "rounded-xl"
                      : "rounded-2xl group-hover:rounded-xl group-hover:bg-fill"
                  )}
                  style={{ background: getAvatarGradient(server.name) }}
                >
                  {server.name.charAt(0).toUpperCase()}
                </div>
              </Link>
            );
          })}

          {/* Create server button */}
          <button
            onClick={() => setCreateOpen(true)}
            className="group h-12 w-12 rounded-2xl flex items-center justify-center bg-bg-tertiary text-success hover:bg-success hover:text-white hover:rounded-xl transition-all duration-200"
            title="Create a server"
          >
            <Plus size={24} />
          </button>

          {/* Join server button */}
          <button
            onClick={() => setJoinOpen(true)}
            className="group h-12 w-12 rounded-2xl flex items-center justify-center bg-bg-tertiary text-accent hover:bg-accent hover:text-white hover:rounded-xl transition-all duration-200"
            title="Join a server"
          >
            <Compass size={22} />
          </button>
        </div>
      </nav>

      {/* Modals */}
      <CreateServerModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <JoinServerModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </>
  );
}