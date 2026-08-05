"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageList } from "./message-list";
import { MessageInput } from "./message-input";
import { TypingIndicator } from "./typing-indicator";
import type { MessageReaction } from "@/types/database";
import type { Message, Profile } from "@/types/database";

interface ChatChannelProps {
  channelId: string;
  profile: Profile | null;
}

export function ChatChannel({ channelId, profile }: ChatChannelProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [reactions, setReactions] = useState<Record<string, MessageReaction[]>>({});
  const [error, setError] = useState<string | null>(null);
  const typingTimeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const reactionsChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Fetch initial messages
  useEffect(() => {
    let isMounted = true;

    async function fetchMessages() {
      setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*, profiles:user_id(id, username, avatar_url)")
        .eq("channel_id", channelId)
        .order("created_at", { ascending: true })
        .limit(200);

      if (isMounted) {
        if (error) {
          setError(error.message);
        } else {
          setMessages((data as Message[]) || []);
        }
        setLoading(false);
      }
    }

    fetchMessages();

    return () => {
      isMounted = false;
    };
  }, [channelId, supabase]);

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        async (payload) => {
          const newMessage = payload.new as Message;

          // Fetch the profile for the new message
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, username, avatar_url")
            .eq("id", newMessage.user_id)
            .single();

          setMessages((prev) => [
            ...prev,
            { ...newMessage, profiles: profileData || undefined },
          ]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const updated = payload.new as Message;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "messages",
          filter: `channel_id=eq.${channelId}`,
        },
        (payload) => {
          const deleted = payload.old as Message;
          setMessages((prev) => prev.filter((m) => m.id !== deleted.id));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  // Load reactions for messages
  useEffect(() => {
    if (messages.length === 0) return;

    const messageIds = messages.map((m) => m.id);
    const channel = supabase
      .channel(`reactions-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        async () => {
          const { data } = await supabase
            .from("message_reactions")
            .select("*")
            .in("message_id", messageIds);
          const grouped: Record<string, MessageReaction[]> = {};
          (data || []).forEach((r) => {
            const reaction = r as MessageReaction;
            if (!grouped[reaction.message_id]) grouped[reaction.message_id] = [];
            grouped[reaction.message_id].push(reaction);
          });
          setReactions(grouped);
        }
      )
      .subscribe();

    reactionsChannelRef.current = channel;

    // Initial load
    supabase
      .from("message_reactions")
      .select("*")
      .in("message_id", messageIds)
      .then(({ data }) => {
        const grouped: Record<string, MessageReaction[]> = {};
        (data || []).forEach((r) => {
          const reaction = r as MessageReaction;
          if (!grouped[reaction.message_id]) grouped[reaction.message_id] = [];
          grouped[reaction.message_id].push(reaction);
        });
        setReactions(grouped);
      });

    return () => {
      supabase.removeChannel(channel);
      reactionsChannelRef.current = null;
    };
  }, [messages, channelId, supabase]);

  // Toggle reaction on a message
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!profile) return;

      // Check if user already reacted
      const existing = reactions[messageId]?.find(
        (r) => r.user_id === profile.id && r.emoji === emoji
      );

      if (existing) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("message_id", messageId)
          .eq("user_id", profile.id)
          .eq("emoji", emoji);
      } else {
        await supabase.from("message_reactions").insert({
          message_id: messageId,
          user_id: profile.id,
          emoji,
        });
      }
    },
    [profile, reactions, supabase]
  );

  // Subscribe to typing presence
  useEffect(() => {
    const channel = supabase.channel(`typing-${channelId}`);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const typing: Record<string, string> = {};
        for (const [key, presences] of Object.entries(state)) {
          const presence = presences[0] as unknown as {
            user_id: string;
            username: string;
          };
          if (presence && presence.user_id !== profile?.id) {
            typing[presence.user_id] = presence.username;
          }
        }
        setTypingUsers(typing);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, profile?.id, supabase]);

  // Broadcast typing indicator
  const broadcastTyping = useCallback(() => {
    if (!profile) return;

    const channel = supabase.channel(`typing-${channelId}`);
    channel.send({
      type: "presence",
      event: "track",
      payload: {
        user_id: profile.id,
        username: profile.username,
      },
    });

    // Clear typing after 3 seconds
    if (typingTimeoutRef.current[profile.id]) {
      clearTimeout(typingTimeoutRef.current[profile.id]);
    }
    typingTimeoutRef.current[profile.id] = setTimeout(() => {
      channel.send({
        type: "presence",
        event: "untrack",
        payload: { user_id: profile.id },
      });
    }, 3000);
  }, [channelId, profile, supabase]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!profile || !content.trim()) return;

      const { error } = await supabase.from("messages").insert({
        channel_id: channelId,
        user_id: profile.id,
        content: content.trim(),
      });

      if (error) {
        setError(error.message);
      }
    },
    [channelId, profile, supabase]
  );

  // Delete a message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      const { error } = await supabase
        .from("messages")
        .delete()
        .eq("id", messageId);

      if (error) {
        setError(error.message);
      }
    },
    [supabase]
  );

  // Edit a message
  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      const { error } = await supabase
        .from("messages")
        .update({ content, edited_at: new Date().toISOString() })
        .eq("id", messageId);

      if (error) {
        setError(error.message);
      }
    },
    [supabase]
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList
        messages={messages}
        reactions={reactions}
        loading={loading}
        currentUserId={profile?.id}
        onDelete={deleteMessage}
        onEdit={editMessage}
        onToggleReaction={toggleReaction}
      />
      <TypingIndicator typingUsers={Object.values(typingUsers)} />
      <MessageInput
        onSend={sendMessage}
        onTyping={broadcastTyping}
        disabled={!profile}
      />
      {error && (
        <div className="px-4 py-2 bg-error/10 border-t border-error/20">
          <p className="text-[12px] text-error">{error}</p>
        </div>
      )}
    </div>
  );
}