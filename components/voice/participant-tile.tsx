"use client";

import { useEffect, useRef } from "react";
import { TrackPublication } from "livekit-client";
import { cn } from "@/lib/utils";
import { Mic, MicOff, MonitorPlay } from "lucide-react";

interface ParticipantTileProps {
  participant: {
    identity: string;
    name: string;
    isSpeaking: boolean;
    isMuted: boolean;
    isScreenSharing: boolean;
    videoTrack?: TrackPublication;
    audioTrack?: TrackPublication;
    screenShareTrack?: TrackPublication;
  };
  isLocal?: boolean;
}

export function ParticipantTile({ participant, isLocal }: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Attach video track
  useEffect(() => {
    if (videoRef.current && participant.videoTrack?.track) {
      participant.videoTrack.track.attach(videoRef.current);
    }
    return () => {
      if (participant.videoTrack?.track) {
        participant.videoTrack.track.detach();
      }
    };
  }, [participant.videoTrack]);

  // Attach screen share track
  useEffect(() => {
    if (screenShareRef.current && participant.screenShareTrack?.track) {
      participant.screenShareTrack.track.attach(screenShareRef.current);
    }
    return () => {
      if (participant.screenShareTrack?.track) {
        participant.screenShareTrack.track.detach();
      }
    };
  }, [participant.screenShareTrack]);

  // Attach audio track
  useEffect(() => {
    if (audioRef.current && participant.audioTrack?.track) {
      participant.audioTrack.track.attach(audioRef.current);
    }
    return () => {
      if (participant.audioTrack?.track) {
        participant.audioTrack.track.detach();
      }
    };
  }, [participant.audioTrack]);

  const hasVideo = !!participant.videoTrack?.track;
  const hasScreenShare = !!participant.screenShareTrack?.track;

  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden bg-bg-secondary aspect-video",
        "border-2 transition-all duration-200",
        participant.isSpeaking
          ? "border-success"
          : "border-transparent"
      )}
    >
      {/* Screen share takes priority */}
      {hasScreenShare ? (
        <video
          ref={screenShareRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-contain"
        />
      ) : hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 rounded-full bg-accent-fill flex items-center justify-center">
            <span className="text-xl font-semibold text-accent">
              {participant.name.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      )}

      {/* Audio */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Name label */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm">
        <span className="text-[12px] font-medium text-white">
          {participant.name}
          {isLocal ? " (You)" : ""}
        </span>
        {participant.isMuted ? (
          <MicOff size={12} className="text-error" />
        ) : (
          <Mic size={12} className="text-success" />
        )}
      </div>

      {/* Screen share badge */}
      {hasScreenShare && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent text-white text-[10px] font-medium">
          <MonitorPlay size={10} />
          Screen Share
        </div>
      )}
    </div>
  );
}