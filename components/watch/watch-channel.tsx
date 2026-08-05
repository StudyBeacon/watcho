"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SyncEngine, type SyncEvent } from "./sync-engine";
import { extractYouTubeId, isYouTubeUrl, isDirectVideoUrl, loadYouTubeAPI } from "@/lib/youtube";
import { Play, Pause, SkipBack, SkipForward, Link2, Crown, Users } from "lucide-react";
import type { Profile } from "@/types/database";

interface WatchChannelProps {
  channelId: string;
  serverId: string;
  profile: Profile | null;
}

interface WatchState {
  videoUrl: string | null;
  isPlaying: boolean;
  currentTime: number;
  updatedBy: string | null;
}

export function WatchChannel({ channelId, serverId, profile }: WatchChannelProps) {
  const supabase = createClient();
  const [watchState, setWatchState] = useState<WatchState>({
    videoUrl: null,
    isPlaying: false,
    currentTime: 0,
    updatedBy: null,
  });
  const [isHost, setIsHost] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [participantCount, setParticipantCount] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const youtubePlayerRef = useRef<any>(null);
  const syncEngineRef = useRef<SyncEngine | null>(null);
  const isYouTubeRef = useRef(false);
  const lastSyncTimeRef = useRef(0);
  const driftCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isYouTube = watchState.videoUrl ? isYouTubeUrl(watchState.videoUrl) : false;
  const isDirect = watchState.videoUrl ? isDirectVideoUrl(watchState.videoUrl) : false;

  // Load initial watch session state
  useEffect(() => {
    let isMounted = true;

    async function loadState() {
      const { data } = await supabase
        .from("watch_sessions")
        .select("*")
        .eq("channel_id", channelId)
        .maybeSingle();

      if (isMounted && data) {
        setWatchState({
          videoUrl: data.video_url,
          isPlaying: data.is_playing,
          currentTime: Number(data.current_time_seconds) || 0,
          updatedBy: data.updated_by,
        });
        setIsHost(data.updated_by === profile?.id);
      }
    }

    loadState();

    return () => {
      isMounted = false;
    };
  }, [channelId, profile?.id, supabase]);

  // Set up sync engine
  useEffect(() => {
    if (!profile) return;

    const engine = new SyncEngine(profile.id, {
      onPlay: (time) => {
        if (isYouTubeRef.current && youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(time, true);
          youtubePlayerRef.current.playVideo();
        } else if (videoRef.current) {
          videoRef.current.currentTime = time;
          videoRef.current.play();
        }
        setWatchState((prev) => ({ ...prev, isPlaying: true, currentTime: time }));
      },
      onPause: (time) => {
        if (isYouTubeRef.current && youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(time, true);
          youtubePlayerRef.current.pauseVideo();
        } else if (videoRef.current) {
          videoRef.current.currentTime = time;
          videoRef.current.pause();
        }
        setWatchState((prev) => ({ ...prev, isPlaying: false, currentTime: time }));
      },
      onSeek: (time) => {
        if (isYouTubeRef.current && youtubePlayerRef.current) {
          youtubePlayerRef.current.seekTo(time, true);
        } else if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
        setWatchState((prev) => ({ ...prev, currentTime: time }));
      },
      onLoad: (videoUrl, time) => {
        setWatchState((prev) => ({
          ...prev,
          videoUrl: videoUrl || null,
          currentTime: time,
          isPlaying: false,
        }));
        setVideoUrlInput(videoUrl || "");
      },
      onSyncRequest: (senderId) => {
        // Respond with current state
        if (isHost && watchState.videoUrl) {
          const currentTime = getCurrentTime();
          engine.sendSyncResponse(currentTime, watchState.videoUrl);
        }
      },
      onSyncResponse: (event: SyncEvent) => {
        // Apply host's state
        if (event.videoUrl && event.videoUrl !== watchState.videoUrl) {
          setWatchState((prev) => ({
            ...prev,
            videoUrl: event.videoUrl || null,
            currentTime: event.time,
          }));
          setVideoUrlInput(event.videoUrl || "");
        }
      },
    });

    syncEngineRef.current = engine;
    engine.connect(channelId);

    return () => {
      engine.disconnect();
      syncEngineRef.current = null;
    };
  }, [channelId, profile, isHost, watchState.videoUrl]);

  // Subscribe to voice_participants for count
  useEffect(() => {
    const channel = supabase
      .channel(`watch-participants-${channelId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "voice_participants",
          filter: `channel_id=eq.${channelId}`,
        },
        async () => {
          const { count } = await supabase
            .from("voice_participants")
            .select("user_id", { count: "exact", head: true })
            .eq("channel_id", channelId);
          setParticipantCount(count || 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId, supabase]);

  // Drift correction: every 10s, check if we're out of sync
  useEffect(() => {
    if (!isHost) return;

    driftCheckIntervalRef.current = setInterval(() => {
      const currentTime = getCurrentTime();
      const drift = Math.abs(currentTime - watchState.currentTime);
      if (drift > 1.5) {
        setWatchState((prev) => ({ ...prev, currentTime }));
      }
    }, 10000);

    return () => {
      if (driftCheckIntervalRef.current) {
        clearInterval(driftCheckIntervalRef.current);
      }
    };
  }, [isHost, watchState.currentTime]);

  function getCurrentTime(): number {
    if (isYouTubeRef.current && youtubePlayerRef.current) {
      return youtubePlayerRef.current.getCurrentTime() || 0;
    }
    return videoRef.current?.currentTime || 0;
  }

  // Load a video
  const loadVideo = useCallback(
    async (url: string) => {
      setError(null);

      if (!isYouTubeUrl(url) && !isDirectVideoUrl(url)) {
        setError("Please enter a valid YouTube URL or direct video file URL");
        return;
      }

      setWatchState((prev) => ({ ...prev, videoUrl: url, currentTime: 0, isPlaying: false }));
      setVideoUrlInput(url);
      setShowUrlInput(false);

      // Save to watch_sessions
      const { data: existing } = await supabase
        .from("watch_sessions")
        .select("id")
        .eq("channel_id", channelId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("watch_sessions")
          .update({
            video_url: url,
            is_playing: false,
            current_time_seconds: 0,
            updated_by: profile?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("watch_sessions").insert({
          channel_id: channelId,
          video_url: url,
          is_playing: false,
          current_time_seconds: 0,
          updated_by: profile?.id,
        });
      }

      // Broadcast load event
      syncEngineRef.current?.sendLoad(url, 0);
    },
    [channelId, profile?.id, supabase]
  );

  // Toggle play/pause
  const togglePlay = useCallback(async () => {
    if (!watchState.videoUrl) return;

    const currentTime = getCurrentTime();
    const newPlaying = !watchState.isPlaying;

    if (isYouTubeRef.current && youtubePlayerRef.current) {
      if (newPlaying) {
        youtubePlayerRef.current.playVideo();
      } else {
        youtubePlayerRef.current.pauseVideo();
      }
    } else if (videoRef.current) {
      if (newPlaying) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }

    setWatchState((prev) => ({ ...prev, isPlaying: newPlaying, currentTime }));

    // Broadcast
    if (newPlaying) {
      syncEngineRef.current?.sendPlay(currentTime);
    } else {
      syncEngineRef.current?.sendPause(currentTime);
    }

    // Update DB
    const { data: existing } = await supabase
      .from("watch_sessions")
      .select("id")
      .eq("channel_id", channelId)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("watch_sessions")
        .update({
          is_playing: newPlaying,
          current_time_seconds: currentTime,
          updated_by: profile?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    }
  }, [watchState.videoUrl, watchState.isPlaying, channelId, profile?.id, supabase]);

  // Seek
  const seek = useCallback(
    async (time: number) => {
      if (!watchState.videoUrl) return;

      if (isYouTubeRef.current && youtubePlayerRef.current) {
        youtubePlayerRef.current.seekTo(time, true);
      } else if (videoRef.current) {
        videoRef.current.currentTime = time;
      }

      setWatchState((prev) => ({ ...prev, currentTime: time }));
      syncEngineRef.current?.sendSeek(time);

      const { data: existing } = await supabase
        .from("watch_sessions")
        .select("id")
        .eq("channel_id", channelId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("watch_sessions")
          .update({
            current_time_seconds: time,
            updated_by: profile?.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    },
    [watchState.videoUrl, channelId, profile?.id, supabase]
  );

  // Format time
  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  // Render video player
  function renderPlayer() {
    if (!watchState.videoUrl) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
          <div className="inline-flex h-16 w-16 rounded-2xl bg-bg-secondary items-center justify-center">
            <Play size={28} className="text-accent ml-0.5" />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-semibold text-label mb-1">Watch Party</h2>
            <p className="text-[14px] text-label-secondary">
              {isHost
                ? "Paste a YouTube link or video URL to start watching together."
                : "Waiting for the host to start a video…"}
            </p>
          </div>
          {isHost && (
            <button
              onClick={() => setShowUrlInput(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-[14px] font-medium hover:bg-accent-hover transition-colors"
            >
              <Link2 size={16} />
              Add Video
            </button>
          )}
        </div>
      );
    }

    if (isYouTube) {
      const videoId = extractYouTubeId(watchState.videoUrl);
      if (!videoId) return null;

      return (
        <div className="flex-1 flex items-center justify-center bg-black p-4">
          <div className="w-full max-w-4xl aspect-video">
            <YouTubePlayer
              videoId={videoId}
              onReady={(player) => {
                youtubePlayerRef.current = player;
                isYouTubeRef.current = true;
                if (watchState.currentTime > 0) {
                  player.seekTo(watchState.currentTime, true);
                }
                if (watchState.isPlaying) {
                  player.playVideo();
                }
              }}
              onStateChange={(state) => {
                // 1 = playing, 2 = paused
                if (state === 1 && !watchState.isPlaying) {
                  setWatchState((prev) => ({ ...prev, isPlaying: true }));
                } else if (state === 2 && watchState.isPlaying) {
                  setWatchState((prev) => ({ ...prev, isPlaying: false }));
                }
              }}
            />
          </div>
        </div>
      );
    }

    if (isDirect) {
      return (
        <div className="flex-1 flex items-center justify-center bg-black p-4">
          <video
            ref={videoRef}
            src={watchState.videoUrl}
            className="w-full max-w-4xl aspect-video"
            controls={false}
            autoPlay={watchState.isPlaying}
            onPlay={() => setWatchState((prev) => ({ ...prev, isPlaying: true }))}
            onPause={() => setWatchState((prev) => ({ ...prev, isPlaying: false }))}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setWatchState((prev) => ({ ...prev, currentTime: videoRef.current!.currentTime }));
              }
            }}
          />
        </div>
      );
    }

    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Video area */}
      {renderPlayer()}

      {/* URL input */}
      {showUrlInput && isHost && (
        <div className="px-4 py-3 border-t border-separator bg-bg-secondary">
          <div className="flex gap-2">
            <input
              type="text"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") loadVideo(videoUrlInput);
              }}
              placeholder="Paste YouTube URL or video file URL…"
              autoFocus
              className="flex-1 h-10 rounded-xl bg-bg-primary px-4 text-[14px] text-label placeholder:text-label-tertiary border border-transparent focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => loadVideo(videoUrlInput)}
              className="px-4 rounded-xl bg-accent text-white text-[14px] font-medium hover:bg-accent-hover transition-colors"
            >
              Load
            </button>
            <button
              onClick={() => setShowUrlInput(false)}
              className="px-3 rounded-xl bg-fill text-label text-[14px] hover:bg-fill-hover transition-colors"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-[12px] text-error mt-1.5 px-1">{error}</p>}
        </div>
      )}

      {/* Controls */}
      {watchState.videoUrl && (
        <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-t border-separator glass">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            disabled={!isHost}
            className="h-10 w-10 rounded-full bg-accent text-white flex items-center justify-center hover:bg-accent-hover disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            {watchState.isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>

          {/* Seek back 10s */}
          <button
            onClick={() => seek(Math.max(0, watchState.currentTime - 10))}
            disabled={!isHost}
            className="h-9 w-9 rounded-lg bg-fill text-label flex items-center justify-center hover:bg-fill-hover disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <SkipBack size={16} />
          </button>

          {/* Seek forward 10s */}
          <button
            onClick={() => seek(watchState.currentTime + 10)}
            disabled={!isHost}
            className="h-9 w-9 rounded-lg bg-fill text-label flex items-center justify-center hover:bg-fill-hover disabled:opacity-40 disabled:pointer-events-none transition-all"
          >
            <SkipForward size={16} />
          </button>

          {/* Time display */}
          <span className="text-[13px] font-medium text-label-secondary tabular-nums">
            {formatTime(watchState.currentTime)}
          </span>

          {/* Host badge */}
          {isHost && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-md bg-accent-fill text-accent text-[11px] font-medium">
              <Crown size={12} />
              Host
            </span>
          )}

          {/* Participant count */}
          <span className="ml-auto flex items-center gap-1.5 text-[12px] text-label-tertiary">
            <Users size={14} />
            {participantCount}
          </span>
        </div>
      )}
    </div>
  );
}

// YouTube Player wrapper component
function YouTubePlayer({
  videoId,
  onReady,
  onStateChange,
}: {
  videoId: string;
  onReady: (player: any) => void;
  onStateChange: (state: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      await loadYouTubeAPI();

      if (!isMounted || !containerRef.current || !window.YT) return;

      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          rel: 0,
          modestbranding: 1,
        },
        events: {
          onReady: (event: any) => {
            onReady(event.target);
          },
          onStateChange: (event: any) => {
            onStateChange(event.data);
          },
        },
      });
    }

    init();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId, onReady, onStateChange]);

  return <div ref={containerRef} className="w-full h-full" />;
}