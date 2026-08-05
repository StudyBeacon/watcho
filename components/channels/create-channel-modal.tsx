"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Hash, Volume2, MonitorPlay } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ChannelType } from "@/types/database";

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
}

const channelTypes: {
  type: ChannelType;
  label: string;
  icon: typeof Hash;
}[] = [
  { type: "text", label: "Text", icon: Hash },
  { type: "voice", label: "Voice", icon: Volume2 },
  { type: "watch", label: "Watch Party", icon: MonitorPlay },
];

export function CreateChannelModal({
  open,
  onClose,
  serverId,
}: CreateChannelModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [type, setType] = useState<ChannelType>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Get current max position
      const { data: existing } = await supabase
        .from("channels")
        .select("position")
        .eq("server_id", serverId)
        .order("position", { ascending: false })
        .limit(1);

      const nextPosition = (existing?.[0]?.position ?? -1) + 1;

      const { data, error } = await supabase
        .from("channels")
        .insert({
          server_id: serverId,
          name: name.toLowerCase().replace(/\s+/g, "-"),
          type,
          position: nextPosition,
        })
        .select("id")
        .single();

      if (error) throw error;

      setName("");
      setType("text");
      onClose();
      router.refresh();
      router.push(`/servers/${serverId}/channels/${data.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create channel"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Channel"
      description="Choose a type and name for your new channel."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Channel type selector */}
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-medium text-label-secondary px-1">
            Channel Type
          </label>
          <div className="flex flex-col gap-1.5">
            {channelTypes.map(({ type: t, label, icon: Icon }) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-all duration-200",
                  type === t
                    ? "border-accent bg-accent-fill"
                    : "border-separator bg-bg-secondary hover:bg-fill"
                )}
              >
                <Icon
                  size={20}
                  className={type === t ? "text-accent" : "text-label-secondary"}
                />
                <div className="flex-1 text-left">
                  <p
                    className={cn(
                      "text-[14px] font-medium",
                      type === t ? "text-accent" : "text-label"
                    )}
                  >
                    {label}
                  </p>
                  <p className="text-[12px] text-label-tertiary">
                    {t === "text" && "Send messages, images, and links"}
                    {t === "voice" && "Voice and video calls with screen share"}
                    {t === "watch" && "Synced movie playback for everyone"}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Channel Name"
          name="name"
          type="text"
          placeholder="new-channel"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={50}
          autoFocus
        />

        {error && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3">
            <p className="text-[13px] text-error">{error}</p>
          </div>
        )}

        <div className="flex gap-3 mt-2">
          <Button
            type="button"
            variant="secondary"
            className="flex-1"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="flex-1">
            Create
          </Button>
        </div>
      </form>
    </Modal>
  );
}