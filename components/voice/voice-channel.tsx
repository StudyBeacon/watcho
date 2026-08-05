"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, LocalParticipant, Participant, TrackPublication, Track } from "livekit-client";
import { createClient } from "@/lib/supabase/client";
import { ParticipantTile } from "./participant-tile";
import { VoiceControls } from "./voice-controls";
import { getScreenShareTrack, getScreenSharePublishingOptions } from "@/lib/livekit/screen-share";
import type { Profile } from "@/types/database";

interface VoiceChannelProps {
  channelId: string;
  serverId: string;
  profile: Profile | null;
}

interface ParticipantInfo {
  identity: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isScreenSharing: boolean;
  videoTrack?: TrackPublication;
  audioTrack?: TrackPublication;
  screenShareTrack?: TrackPublication;
}

export function VoiceChannel({ channelId, serverId, profile }: VoiceChannelProps) {
  const supabase = createClient();
  const roomRef = useRef<Room | null>(null);
  const [participants, setParticipants] = useState<Record<string, ParticipantInfo>>({});
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);

  const roomName = `server-${serverId}-channel-${channelId}`;

  // Update participant info helper
  const updateParticipant = useCallback((participant: Participant) => {
    const isLocal = participant instanceof LocalParticipant;

    setParticipants((prev) => {
      const existing = prev[participant.identity] || {
        identity: participant.identity,
        name: participant.name || participant.identity,
        isSpeaking: false,
        isMuted: false,
        isScreenSharing: false,
      };

      // Find tracks
      let videoTrack: TrackPublication | undefined;
      let audioTrack: TrackPublication | undefined;
      let screenShareTrack: TrackPublication | undefined;

      participant.trackPublications.forEach((pub) => {
        if (pub.track?.kind === Track.Kind.Video) {
          if (pub.source === Track.Source.ScreenShare || pub.source === Track.Source.ScreenShareAudio) {
            screenShareTrack = pub;
          } else {
            videoTrack = pub;
          }
        } else if (pub.track?.kind === Track.Kind.Audio) {
          audioTrack = pub;
        }
      });

      return {
        ...prev,
        [participant.identity]: {
          ...existing,
          videoTrack,
          audioTrack,
          screenShareTrack,
          isMuted: audioTrack?.isMuted ?? existing.isMuted,
          isScreenSharing: !!screenShareTrack,
        },
      };
    });
  }, []);

  // Remove participant
  const removeParticipant = useCallback((identity: string) => {
    setParticipants((prev) => {
      const next = { ...prev };
      delete next[identity];
      return next;
    });
  }, []);

  // Connect to room
  const connect = useCallback(async () => {
    if (connecting || connected) return;
    setConnecting(true);
    setError(null);

    try {
      // Get token
      const res = await fetch(
        `/api/livekit/token?room=${encodeURIComponent(roomName)}&serverId=${encodeURIComponent(serverId)}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get LiveKit token");
      }

      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        videoCaptureDefaults: {
          resolution: { width: 1280, height: 720 },
        },
      });

      roomRef.current = room;

      // Event handlers
      room
        .on(RoomEvent.ParticipantConnected, (participant) => {
          updateParticipant(participant);
        })
        .on(RoomEvent.ParticipantDisconnected, (participant) => {
          removeParticipant(participant.identity);
        })
        .on(RoomEvent.TrackPublished, (pub, participant) => {
          updateParticipant(participant);
        })
        .on(RoomEvent.TrackUnpublished, (pub, participant) => {
          updateParticipant(participant);
        })
        .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
          updateParticipant(participant);
        })
        .on(RoomEvent.TrackUnsubscribed, (track, pub, participant) => {
          updateParticipant(participant);
        })
        .on(RoomEvent.TrackMuted, (pub, participant) => {
          updateParticipant(participant);
        })
        .on(RoomEvent.TrackUnmuted, (pub, participant) => {
          updateParticipant(participant);
        })
        .on(RoomEvent.ActiveSpeakersChanged, (speakers: Participant[]) => {
          const speakingIds = new Set(speakers.map((s) => s.identity));
          setParticipants((prev) => {
            const next = { ...prev };
            for (const [id, info] of Object.entries(next)) {
              next[id] = { ...info, isSpeaking: speakingIds.has(id) };
            }
            return next;
          });
        })
        .on(RoomEvent.LocalTrackPublished, (pub) => {
          if (pub.source === Track.Source.ScreenShare) {
            setIsScreenSharing(true);
          }
        })
        .on(RoomEvent.LocalTrackUnpublished, (pub) => {
          if (pub.source === Track.Source.ScreenShare) {
            setIsScreenSharing(false);
          }
        })
        .on(RoomEvent.Disconnected, () => {
          setConnected(false);
          setParticipants({});
          setIsScreenSharing(false);
        })
        .on(RoomEvent.ConnectionStateChanged, (state) => {
          setConnected(state === "connected");
        });

      // Connect to room
      await room.connect(process.env.NEXT_PUBLIC_LIVEKIT_URL!, data.token);

      // Add local participant
      updateParticipant(room.localParticipant);

      // Insert into voice_participants
      if (profile) {
        await supabase.from("voice_participants").insert({
          channel_id: channelId,
          user_id: profile.id,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to voice channel");
    } finally {
      setConnecting(false);
    }
  }, [channelId, serverId, profile, connecting, connected, roomName, supabase, updateParticipant, removeParticipant]);

  // Disconnect
  const disconnect = useCallback(async () => {
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    setConnected(false);
    setParticipants({});
    setIsMuted(false);
    setIsDeafened(false);
    setIsScreenSharing(false);
    setIsCameraOn(false);

    // Remove from voice_participants
    if (profile) {
      await supabase
        .from("voice_participants")
        .delete()
        .eq("channel_id", channelId)
        .eq("user_id", profile.id);
    }
  }, [channelId, profile, supabase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        roomRef.current.disconnect();
      }
      if (profile) {
        supabase
          .from("voice_participants")
          .delete()
          .eq("channel_id", channelId)
          .eq("user_id", profile.id);
      }
    };
  }, [channelId, profile, supabase]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (!roomRef.current) return;
    const local = roomRef.current.localParticipant;
    const newMuted = !isMuted;
    local.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  // Toggle deafen
  const toggleDeafen = useCallback(() => {
    if (!roomRef.current) return;
    const newDeafened = !isDeafened;
    roomRef.current.localParticipant.setMicrophoneEnabled(!newDeafened && !isMuted);
    setIsDeafened(newDeafened);
  }, [isDeafened, isMuted]);

  // Toggle camera
  const toggleCamera = useCallback(async () => {
    if (!roomRef.current) return;
    const local = roomRef.current.localParticipant;
    if (isCameraOn) {
      await local.setCameraEnabled(false);
      setIsCameraOn(false);
    } else {
      await local.setCameraEnabled(true);
      setIsCameraOn(true);
    }
  }, [isCameraOn]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    if (!roomRef.current) return;
    const local = roomRef.current.localParticipant;

    if (isScreenSharing) {
      await local.setScreenShareEnabled(false);
      setIsScreenSharing(false);
    } else {
      try {
        const { track } = await getScreenShareTrack();
        const options = getScreenSharePublishingOptions();

        await local.publishTrack(track, {
          source: Track.Source.ScreenShare,
          ...options,
        });

        // Update voice_participants
        if (profile) {
          await supabase
            .from("voice_participants")
            .update({ is_screen_sharing: true })
            .eq("channel_id", channelId)
            .eq("user_id", profile.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to start screen share");
      }
    }
  }, [isScreenSharing, channelId, profile, supabase]);

  const participantList = Object.values(participants);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Participant grid */}
      <div className="flex-1 overflow-y-auto p-4">
        {!connected && !connecting && (
          <div className="h-full flex flex-col items-center justify-center gap-4">
            <div className="inline-flex h-16 w-16 rounded-2xl bg-bg-secondary items-center justify-center">
              <Volume2Icon />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-semibold text-label mb-1">
                Voice Channel
              </h2>
              <p className="text-[14px] text-label-secondary">
                Join to start talking with your friends.
              </p>
            </div>
            <button
              onClick={connect}
              className="px-6 py-2.5 rounded-xl bg-success text-white font-medium hover:brightness-110 active:brightness-95 transition-all"
            >
              Join Voice
            </button>
            {error && (
              <p className="text-[13px] text-error">{error}</p>
            )}
          </div>
        )}

        {connecting && (
          <div className="h-full flex flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <p className="text-[13px] text-label-tertiary">Connecting…</p>
          </div>
        )}

        {connected && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {participantList.map((p) => (
              <ParticipantTile
                key={p.identity}
                participant={p}
                isLocal={p.identity === profile?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      {connected && (
        <VoiceControls
          isMuted={isMuted}
          isDeafened={isDeafened}
          isScreenSharing={isScreenSharing}
          isCameraOn={isCameraOn}
          onToggleMute={toggleMute}
          onToggleDeafen={toggleDeafen}
          onToggleScreenShare={toggleScreenShare}
          onToggleCamera={toggleCamera}
          onLeave={disconnect}
        />
      )}
    </div>
  );
}

function Volume2Icon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
  );
}