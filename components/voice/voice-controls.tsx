"use client";

import { Mic, MicOff, Headphones, HeadphoneOff, Video, VideoOff, MonitorPlay, MonitorOff, PhoneOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceControlsProps {
  isMuted: boolean;
  isDeafened: boolean;
  isScreenSharing: boolean;
  isCameraOn: boolean;
  onToggleMute: () => void;
  onToggleDeafen: () => void;
  onToggleScreenShare: () => void;
  onToggleCamera: () => void;
  onLeave: () => void;
}

export function VoiceControls({
  isMuted,
  isDeafened,
  isScreenSharing,
  isCameraOn,
  onToggleMute,
  onToggleDeafen,
  onToggleScreenShare,
  onToggleCamera,
  onLeave,
}: VoiceControlsProps) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-2 px-4 py-3 border-t border-separator glass">
      {/* Mute */}
      <button
        onClick={onToggleMute}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
          isMuted
            ? "bg-error text-white"
            : "bg-fill text-label hover:bg-fill-hover"
        )}
        title={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {/* Deafen */}
      <button
        onClick={onToggleDeafen}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
          isDeafened
            ? "bg-error text-white"
            : "bg-fill text-label hover:bg-fill-hover"
        )}
        title={isDeafened ? "Undeafen" : "Deafen"}
      >
        {isDeafened ? <HeadphoneOff size={18} /> : <Headphones size={18} />}
      </button>

      {/* Camera */}
      <button
        onClick={onToggleCamera}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
          isCameraOn
            ? "bg-accent text-white"
            : "bg-fill text-label hover:bg-fill-hover"
        )}
        title={isCameraOn ? "Turn off camera" : "Turn on camera"}
      >
        {isCameraOn ? <Video size={18} /> : <VideoOff size={18} />}
      </button>

      {/* Screen share */}
      <button
        onClick={onToggleScreenShare}
        className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center transition-all",
          isScreenSharing
            ? "bg-accent text-white"
            : "bg-fill text-label hover:bg-fill-hover"
        )}
        title={isScreenSharing ? "Stop sharing" : "Share screen"}
      >
        {isScreenSharing ? <MonitorOff size={18} /> : <MonitorPlay size={18} />}
      </button>

      {/* Leave */}
      <button
        onClick={onLeave}
        className="h-10 w-10 rounded-xl flex items-center justify-center bg-error text-white hover:brightness-110 active:brightness-95 transition-all"
        title="Leave voice channel"
      >
        <PhoneOff size={18} />
      </button>
    </div>
  );
}