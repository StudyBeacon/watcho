"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { formatRelativeTime, formatFullDate, cn } from "@/lib/utils";
import { Pencil, Trash2, ChevronDown, SmilePlus } from "lucide-react";
import type { Message, MessageReaction } from "@/types/database";

interface MessageListProps {
  messages: Message[];
  reactions?: Record<string, MessageReaction[]>;
  loading: boolean;
  currentUserId?: string;
  onDelete: (messageId: string) => void;
  onEdit: (messageId: string, content: string) => void;
  onToggleReaction?: (messageId: string, emoji: string) => void;
}

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🎉"];

export function MessageList({
  messages,
  reactions = {},
  loading,
  currentUserId,
  onDelete,
  onEdit,
  onToggleReaction,
}: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showJumpButton, setShowJumpButton] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
      if (isNearBottom) {
        el.scrollTop = el.scrollHeight;
      } else {
        setShowJumpButton(true);
      }
    }
  }, [messages]);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200;
    setShowJumpButton(!isNearBottom);
  }

  function scrollToBottom() {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
      setShowJumpButton(false);
    }
  }

  function startEdit(message: Message) {
    setEditingId(message.id);
    setEditContent(message.content);
  }

  function submitEdit(messageId: string) {
    if (editContent.trim() && editContent !== messages.find((m) => m.id === messageId)?.content) {
      onEdit(messageId, editContent.trim());
    }
    setEditingId(null);
    setEditContent("");
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <p className="text-[13px] text-label-tertiary">Loading messages…</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-sm px-8">
          <h3 className="text-lg font-semibold text-label mb-1">
            No messages yet
          </h3>
          <p className="text-[14px] text-label-secondary">
            Be the first to say something! Messages appear here in real time.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto px-4 py-4"
      >
        <div className="flex flex-col">
          {messages.map((message, index) => {
            const prev = messages[index - 1];
            const isGrouped =
              prev &&
              prev.user_id === message.user_id &&
              new Date(message.created_at).getTime() -
                new Date(prev.created_at).getTime() <
                5 * 60 * 1000;

            const isOwn = message.user_id === currentUserId;
            const isEditing = editingId === message.id;

            return (
              <div
                key={message.id}
                className={cn(
                  "group relative flex gap-3 px-2 py-1 rounded-lg hover:bg-fill transition-colors",
                  isGrouped ? "mt-0.5" : "mt-4"
                )}
                onMouseEnter={() => setHoveredId(message.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Avatar (only for first message in group) */}
                {!isGrouped ? (
                  <Avatar
                    src={message.profiles?.avatar_url}
                    name={message.profiles?.username || "User"}
                    size="md"
                    className="mt-0.5"
                  />
                ) : (
                  <div className="w-10 shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  {/* Header (only for first message in group) */}
                  {!isGrouped && (
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <span className="text-[14px] font-semibold text-label">
                        {message.profiles?.username || "Unknown"}
                      </span>
                      <span
                        className="text-[11px] text-label-tertiary"
                        title={formatFullDate(message.created_at)}
                      >
                        {formatRelativeTime(message.created_at)}
                      </span>
                      {message.edited_at && (
                        <span className="text-[11px] text-label-tertiary">
                          (edited)
                        </span>
                      )}
                    </div>
                  )}

                  {/* Message content */}
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") submitEdit(message.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        className="flex-1 h-9 rounded-lg bg-bg-tertiary px-3 text-[14px] text-label border border-accent focus:outline-none"
                      />
                      <button
                        onClick={() => submitEdit(message.id)}
                        className="text-[12px] text-accent font-medium hover:underline"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-[12px] text-label-tertiary hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-[14px] text-label leading-relaxed whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                  )}

                  {/* Reactions */}
                  {reactions[message.id]?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {Object.entries(
                        reactions[message.id].reduce<Record<string, string[]>>(
                          (acc, r) => {
                            if (!acc[r.emoji]) acc[r.emoji] = [];
                            acc[r.emoji].push(r.user_id);
                            return acc;
                          },
                          {}
                        )
                      ).map(([emoji, users]) => (
                        <button
                          key={emoji}
                          onClick={() => onToggleReaction?.(message.id, emoji)}
                          className={cn(
                            "flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] font-medium transition-colors",
                            users.includes(currentUserId || "")
                              ? "bg-accent-fill text-accent"
                              : "bg-fill text-label-secondary hover:bg-fill-hover"
                          )}
                          title={`${users.length} reaction${users.length > 1 ? "s" : ""}`}
                        >
                          <span>{emoji}</span>
                          <span>{users.length}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover actions */}
                {hoveredId === message.id && !isEditing && (
                  <div className="absolute -top-3 right-2 flex items-center gap-0.5 rounded-lg bg-bg-tertiary border border-separator shadow-sm px-1 py-0.5 animate-fade-in">
                    {onToggleReaction && (
                      <div className="relative group/emoji">
                        <button
                          className="p-1.5 rounded-md hover:bg-fill text-label-secondary hover:text-label transition-colors"
                          title="Add reaction"
                        >
                          <SmilePlus size={14} />
                        </button>
                        <div className="absolute bottom-full right-0 mb-1 hidden group-hover/emoji:flex items-center gap-0.5 rounded-xl bg-bg-tertiary border border-separator shadow-md px-1.5 py-1 z-30">
                          {QUICK_EMOJIS.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => onToggleReaction?.(message.id, emoji)}
                              className="p-1 rounded-md hover:bg-fill text-base transition-colors"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {isOwn && (
                      <>
                        <button
                          onClick={() => startEdit(message)}
                          className="p-1.5 rounded-md hover:bg-fill text-label-secondary hover:text-label transition-colors"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => onDelete(message.id)}
                          className="p-1.5 rounded-md hover:bg-fill text-label-secondary hover:text-error transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Jump to latest button */}
      {showJumpButton && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-bg-tertiary border border-separator shadow-md text-[12px] font-medium text-label hover:bg-fill transition-all animate-slide-up"
        >
          <ChevronDown size={14} />
          Jump to latest
        </button>
      )}
    </div>
  );
}