/**
 * High-quality screen share configuration.
 * - 1080p at 30-60fps
 * - VP9/AV1 codec preference over H.264
 * - Boosted bitrate (8 Mbps for 1080p)
 * - Simulcast for adaptive quality
 */

export const SCREEN_SHARE_CONSTRAINTS: DisplayMediaStreamOptions = {
  video: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 60, max: 60 },
  },
  audio: true,
};

export const SCREEN_SHARE_BITRATE = 8_000_000; // 8 Mbps for 1080p
export const SCREEN_SHARE_FRAMERATE = 60;

/**
 * Detect the best available video codec.
 * Prefers VP9 > AV1 > H.264 (VP9/AV1 are sharper at same bitrate for screen content).
 */
export function getPreferredVideoCodec(): "vp9" | "av1" | "h264" {
  if (typeof window === "undefined") return "vp9";

  try {
    const capabilities = RTCRtpSender.getCapabilities("video");

    if (!capabilities) return "vp9";

    const codecs = capabilities.codecs.map((c) => c.mimeType.toLowerCase());

    if (codecs.some((c) => c.includes("vp9"))) return "vp9";
    if (codecs.some((c) => c.includes("av1"))) return "av1";
    return "h264";
  } catch {
    return "vp9";
  }
}

/**
 * Get screen share track with optimal settings.
 * Returns the MediaStreamTrack and the codec used.
 */
export async function getScreenShareTrack(): Promise<{
  track: MediaStreamTrack;
  codec: "vp9" | "av1" | "h264";
}> {
  const stream = await navigator.mediaDevices.getDisplayMedia(
    SCREEN_SHARE_CONSTRAINTS
  );

  const videoTrack = stream.getVideoTracks()[0];
  if (!videoTrack) {
    throw new Error("No video track in screen share stream");
  }

  const codec = getPreferredVideoCodec();

  return { track: videoTrack, codec };
}

/**
 * Apply LiveKit publishing options for screen share.
 * Boosts bitrate and enables simulcast for adaptive quality.
 */
export function getScreenSharePublishingOptions() {
  return {
    videoEncoding: {
      maxBitrate: SCREEN_SHARE_BITRATE,
      maxFramerate: SCREEN_SHARE_FRAMERATE,
    },
    videoCodec: getPreferredVideoCodec(),
    simulcast: true,
    dtx: true,
  };
}