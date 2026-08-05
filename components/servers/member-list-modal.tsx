"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserX, Shield, ShieldCheck, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Profile, UserRole } from "@/types/database";

interface MemberListModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  isAdmin: boolean;
}

interface MemberWithProfile {
  user_id: string;
  role: UserRole;
  joined_at: string;
  profiles: Pick<Profile, "id" | "username" | "avatar_url">;
}

export function MemberListModal({
  open,
  onClose,
  serverId,
  isAdmin,
}: MemberListModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [members, setMembers] = useState<MemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    async function loadMembers() {
      setLoading(true);
      const { data, error } = await supabase
        .from("server_members")
        .select("user_id, role, joined_at, profiles:user_id(id, username, avatar_url)")
        .eq("server_id", serverId);

      if (error) {
        setError(error.message);
      } else {
        // Supabase returns profiles as an array for foreign key joins
        const formatted = (data || []).map((m: any) => ({
          ...m,
          profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles,
        }));
        setMembers(formatted as MemberWithProfile[]);
      }
      setLoading(false);
    }

    loadMembers();

    const channel = supabase
      .channel(`members-${serverId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "server_members",
          filter: `server_id=eq.${serverId}`,
        },
        loadMembers
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [open, serverId, supabase]);

  async function updateRole(userId: string, role: UserRole) {
    setError(null);
    const { error } = await supabase
      .from("server_members")
      .update({ role })
      .eq("server_id", serverId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
    } else {
      router.refresh();
    }
  }

  async function removeMember(userId: string) {
    setError(null);
    const { error } = await supabase
      .from("server_members")
      .delete()
      .eq("server_id", serverId)
      .eq("user_id", userId);

    if (error) {
      setError(error.message);
    } else {
      router.refresh();
    }
  }

  const roleIcons: Record<UserRole, typeof Shield> = {
    owner: ShieldAlert,
    admin: ShieldCheck,
    member: Shield,
  };

  return (
    <Modal open={open} onClose={onClose} title="Members">
      <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          </div>
        ) : members.length === 0 ? (
          <p className="text-center text-[14px] text-label-secondary py-8">
            No members found.
          </p>
        ) : (
          members.map((member) => {
            const RoleIcon = roleIcons[member.role];
            const isSelf = false; // We don't track current user here
            const isOwner = member.role === "owner";

            return (
              <div
                key={member.user_id}
                className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-fill transition-colors"
              >
                <Avatar
                  src={member.profiles?.avatar_url}
                  name={member.profiles?.username || "User"}
                  size="sm"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-label truncate">
                    {member.profiles?.username || "Unknown"}
                  </p>
                  <p className="text-[12px] text-label-tertiary flex items-center gap-1">
                    <RoleIcon
                      size={12}
                      className={cn(
                        member.role === "owner" && "text-warning",
                        member.role === "admin" && "text-accent",
                        member.role === "member" && "text-label-tertiary"
                      )}
                    />
                    {member.role}
                  </p>
                </div>

                {isAdmin && !isOwner && isSelf === false && (
                  <div className="flex items-center gap-1">
                    {member.role === "member" ? (
                      <button
                        onClick={() => updateRole(member.user_id, "admin")}
                        className="p-1.5 rounded-lg text-label-secondary hover:text-accent hover:bg-fill transition-colors"
                        title="Make admin"
                      >
                        <ShieldCheck size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => updateRole(member.user_id, "member")}
                        className="p-1.5 rounded-lg text-label-secondary hover:text-warning hover:bg-fill transition-colors"
                        title="Remove admin"
                      >
                        <Shield size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(member.user_id)}
                      className="p-1.5 rounded-lg text-label-secondary hover:text-error hover:bg-fill transition-colors"
                      title="Kick member"
                    >
                      <UserX size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}

        {error && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3 mt-2">
            <p className="text-[13px] text-error">{error}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}