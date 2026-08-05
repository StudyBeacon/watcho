"use client";

import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type SyncEventType = "play" | "pause" | "seek" | "load" | "sync-request" | "sync-response";

export interface SyncEvent {
  type: SyncEventType;
  time: number;
  videoUrl?: string;
  timestamp: number;
  senderId: string;
}

export interface SyncEngineCallbacks {
  onPlay: (time: number) => void;
  onPause: (time: number) => void;
  onSeek: (time: number) => void;
  onLoad: (videoUrl: string, time: number) => void;
  onSyncRequest: (senderId: string) => void;
  onSyncResponse: (event: SyncEvent) => void;
}

/**
 * Sync engine for watch parties.
 * Uses Supabase Realtime Broadcast to send play/pause/seek events.
 */
export class SyncEngine {
  private channel: RealtimeChannel | null = null;
  private callbacks: SyncEngineCallbacks;
  private userId: string;

  constructor(userId: string, callbacks: SyncEngineCallbacks) {
    this.userId = userId;
    this.callbacks = callbacks;
  }

  /**
   * Subscribe to a watch channel.
   */
  async connect(channelId: string) {
    const supabase = createClient();

    this.channel = supabase.channel(`watch-${channelId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    this.channel
      .on("broadcast", { event: "sync" }, (payload) => {
        const event = payload.payload as SyncEvent;
        if (event.senderId === this.userId) return;

        switch (event.type) {
          case "play":
            this.callbacks.onPlay(event.time);
            break;
          case "pause":
            this.callbacks.onPause(event.time);
            break;
          case "seek":
            this.callbacks.onSeek(event.time);
            break;
          case "load":
            if (event.videoUrl) {
              this.callbacks.onLoad(event.videoUrl, event.time);
            }
            break;
          case "sync-request":
            this.callbacks.onSyncRequest(event.senderId);
            break;
          case "sync-response":
            this.callbacks.onSyncResponse(event);
            break;
        }
      })
      .subscribe();
  }

  /**
   * Disconnect from the watch channel.
   */
  async disconnect() {
    if (this.channel) {
      const supabase = createClient();
      await supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  /**
   * Send a play event.
   */
  sendPlay(time: number) {
    this.send({ type: "play", time });
  }

  /**
   * Send a pause event.
   */
  sendPause(time: number) {
    this.send({ type: "pause", time });
  }

  /**
   * Send a seek event.
   */
  sendSeek(time: number) {
    this.send({ type: "seek", time });
  }

  /**
   * Send a load event (new video).
   */
  sendLoad(videoUrl: string, time: number = 0) {
    this.send({ type: "load", time, videoUrl });
  }

  /**
   * Request a sync from the host.
   */
  sendSyncRequest() {
    this.send({ type: "sync-request", time: 0 });
  }

  /**
   * Send a sync response with current state.
   */
  sendSyncResponse(time: number, videoUrl?: string) {
    this.send({ type: "sync-response", time, videoUrl });
  }

  private send(event: Omit<SyncEvent, "timestamp" | "senderId">) {
    if (!this.channel) return;

    this.channel.send({
      type: "broadcast",
      event: "sync",
      payload: {
        ...event,
        timestamp: Date.now(),
        senderId: this.userId,
      } as SyncEvent,
    });
  }
}