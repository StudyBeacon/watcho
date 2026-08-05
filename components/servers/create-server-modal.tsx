"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface CreateServerModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateServerModal({ open, onClose }: CreateServerModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("servers")
        .insert({ name, owner_id: user.id })
        .select("id")
        .single();

      if (error) throw error;

      // Trigger auto-creates server_members + default #general channel
      setName("");
      onClose();
      router.refresh();
      router.push(`/servers/${data.id}/channels`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create server"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create a Server"
      description="Give your new server a name. You can change it later."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Server Name"
          name="name"
          type="text"
          placeholder="Movie Night Club"
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