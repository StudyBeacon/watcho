"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { SendHorizonal } from "lucide-react";

interface MessageInputProps {
  onSend: (content: string) => void;
  onTyping: () => void;
  disabled?: boolean;
}

export function MessageInput({ onSend, onTyping, disabled }: MessageInputProps) {
  const [content, setContent] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    if (!content.trim()) return;
    onSend(content);
    setContent("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleChange(value: string) {
    setContent(value);
    onTyping();

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }

  return (
    <div className="px-4 pb-4 pt-2 shrink-0">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={disabled ? "Sign in to chat" : "Message #channel"}
          disabled={disabled}
          rows={1}
          className="w-full min-h-[44px] max-h-[200px] resize-none rounded-xl bg-bg-secondary px-4 py-3 pr-12 text-[14px] text-label placeholder:text-label-tertiary border border-transparent focus:border-accent focus:outline-none transition-colors"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !content.trim()}
          className="absolute right-2 bottom-2 p-2 rounded-lg text-accent hover:bg-accent-fill disabled:opacity-40 disabled:pointer-events-none transition-all"
          title="Send message"
        >
          <SendHorizonal size={18} />
        </button>
      </div>
    </div>
  );
}