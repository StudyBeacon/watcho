"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ChannelSettingsModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  channel: {
    id: string;
    name: string;
    type: string;
  };
}

export function ChannelSettingsModal({
  open,
  onClose,
  serverId,
  channel,
}: ChannelSettingsModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(channel.name);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(channel.name);
  }, [channel.name]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === channel.name) return;
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from("channels")
        .update({
          name: name.toLowerCase().replace(/\s+/g, "-"),
        })
        .eq("id", channel.id);

      if (error) throw error;
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename channel");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from("channels")
        .delete()
        .eq("id", channel.id);

      if (error) throw error;
      onClose();
      router.push(`/servers/${serverId}/channels`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete channel");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={`#${channel.name} Settings`}>
      <div className="flex flex-col gap-6">
        <form onSubmit={handleRename} className="flex flex-col gap-2">
          <Input
            label="Channel Name"
            name="channelName"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={50}
          />
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            loading={loading}
            disabled={!name.trim() || name === channel.name}
            className="self-end"
          >
            Rename
          </Button>
        </form>

        {error && (
          <div className="rounded-xl bg-error/10 border border-error/20 px-4 py-3">
            <p className="text-[13px] text-error">{error}</p>
          </div>
        )}

        <div className="border-t border-separator pt-4">
          <p className="text-[13px] font-medium text-error mb-2">
            Danger Zone
          </p>
          {!deleteConfirm ? (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirm(true)}
            >
              <Trash2 size={14} className="mr-1.5" />
              Delete Channel
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <p className="text-[13px] text-label-secondary flex-1">
                Are you sure? This cannot be undone.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                loading={loading}
                onClick={handleDelete}
              >
                <Trash2 size={14} className="mr-1.5" />
                Delete
              </Button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}