"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface JoinServerModalProps {
  open: boolean;
  onClose: () => void;
}

export function JoinServerModal({ open, onClose }: JoinServerModalProps) {
  const router = useRouter();
  const supabase = createClient();

  const [inviteCode, setInviteCode] = useState("");
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

      // Find the server by invite code
      const { data: server, error: serverError } = await supabase
        .from("servers")
        .select("id")
        .eq("invite_code", inviteCode.toUpperCase().trim())
        .single();

      if (serverError || !server) {
        throw new Error("Invalid invite code. Please check and try again.");
      }

      // Join the server
      const { error: joinError } = await supabase
        .from("server_members")
        .insert({
          server_id: server.id,
          user_id: user.id,
          role: "member",
        });

      if (joinError) {
        if (joinError.code === "23505") {
          throw new Error("You're already a member of this server.");
        }
        throw joinError;
      }

      setInviteCode("");
      onClose();
      router.refresh();
      router.push(`/servers/${server.id}/channels`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to join server"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Join a Server"
      description="Enter the invite code shared by your friend."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Invite Code"
          name="inviteCode"
          type="text"
          placeholder="AB12CD34"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          required
          minLength={4}
          autoFocus
          className="uppercase tracking-wider font-mono"
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
            Join
          </Button>
        </div>
      </form>
    </Modal>
  );
}