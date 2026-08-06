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

      // Ensure profile exists before creating server
      console.log("Creating server for user:", user.id);
      
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: user.id,
          username: user.user_metadata?.username || user.email?.split("@")[0] || `user_${user.id.slice(0, 8)}`,
        })
        .select()
        .single();

      if (profileError) {
        console.error("Profile creation error:", profileError);
        if (profileError.code !== "23505") {
          // Only throw if it's not a duplicate key error
          throw new Error(`Failed to create profile: ${profileError.message}`);
        }
      }

      console.log("Inserting server:", { name, owner_id: user.id });
      const { data, error } = await supabase
        .from("servers")
        .insert({ name, owner_id: user.id })
        .select("id")
        .single();

      if (error) {
        console.error("Server creation error:", error);
        console.error("Error details:", JSON.stringify(error, null, 2));
        throw error;
      }

      console.log("Server created successfully:", data);

      // Trigger auto-creates server_members + default #general channel
      setName("");
      onClose();
      router.refresh();
      router.push(`/servers/${data.id}/channels`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create server";
      console.error("Create server error:", err);
      console.error("Error stack:", err instanceof Error ? err.stack : "No stack trace");
      alert("Error: " + message + "\n\nCheck console for details (F12)");
      setError(message);
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