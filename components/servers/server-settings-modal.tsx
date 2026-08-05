"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Copy, Trash2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ServerSettingsModalProps {
  open: boolean;
  onClose: () => void;
  serverId: string;
  serverName: string;
  inviteCode: string;
  isOwner: boolean;
}

export function ServerSettingsModal({
  open,
  onClose,
  serverId,
  serverName,
  inviteCode,
  isOwner,
}: ServerSettingsModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(serverName);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    setName(serverName);
  }, [serverName]);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || name === serverName) return;
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from("servers")
        .update({ name: name.trim() })
        .eq("id", serverId);

      if (error) throw error;
      onClose();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rename server");
    } finally {
      setLoading(false);
    }
  }

  function copyInvite() {
    navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete() {
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase
        .from("servers")
        .delete()
        .eq("id", serverId);
      if (error) throw error;
      onClose();
      router.push("/servers");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Server Settings">
      <div className="flex flex-col gap-6">
        {/* Invite code */}
        <div>
          <label className="text-[13px] font-medium text-label-secondary px-1">
            Invite Code
          </label>
          <div className="flex gap-2 mt-1.5">
            <div className="flex-1 h-10 rounded-xl bg-bg-secondary px-4 flex items-center font-mono text-[15px] text-label tracking-wider">
              {inviteCode}
            </div>
            <button
              onClick={copyInvite}
              className="h-10 w-10 rounded-xl bg-fill text-label hover:bg-fill-hover flex items-center justify-center transition-colors"
              title="Copy invite code"
            >
              {copied ? (
                <Check size={16} className="text-success" />
              ) : (
                <Copy size={16} />
              )}
            </button>
          </div>
          <p className="text-[12px] text-label-tertiary mt-1.5 px-1">
            Share this code with friends so they can join your server.
          </p>
        </div>

        {/* Rename */}
        <form onSubmit={handleRename} className="flex flex-col gap-2">
          <Input
            label="Server Name"
            name="serverName"
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
            disabled={!name.trim() || name === serverName}
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

        {/* Danger zone */}
        {isOwner && (
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
                Delete Server
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
        )}
      </div>
    </Modal>
  );
}