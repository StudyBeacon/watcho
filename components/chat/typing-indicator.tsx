"use client";

interface TypingIndicatorProps {
  typingUsers: string[];
}

export function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.slice(0, 3);
  const extraCount = typingUsers.length - names.length;

  let text: string;
  if (names.length === 1) {
    text = `${names[0]} is typing`;
  } else if (names.length === 2) {
    text = `${names[0]} and ${names[1]} are typing`;
  } else {
    text = `${names[0]}, ${names[1]}, and ${extraCount > 0 ? `${extraCount} more ` : ""}are typing`;
  }

  return (
    <div className="px-4 pb-1 flex items-center gap-2 text-[12px] text-label-tertiary animate-fade-in">
      <span className="flex items-center gap-0.5">
        <span className="w-1 h-1 rounded-full bg-label-tertiary animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-1 h-1 rounded-full bg-label-tertiary animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-1 h-1 rounded-full bg-label-tertiary animate-bounce" style={{ animationDelay: "300ms" }} />
      </span>
      {text}…
    </div>
  );
}