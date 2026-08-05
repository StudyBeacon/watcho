/**
 * YouTube URL parsing utilities.
 * Extracts video IDs from various YouTube URL formats.
 */

// YouTube IFrame API type declarations
declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string | HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: Record<string, (event: unknown) => void>;
        }
      ) => {
        playVideo(): void;
        pauseVideo(): void;
        seekTo(seconds: number, allowSeekAhead: boolean): void;
        getCurrentTime(): number;
        getDuration(): number;
        destroy(): void;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const YOUTUBE_URL_PATTERNS = [
  // youtube.com/watch?v=VIDEO_ID
  /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
  // youtu.be/VIDEO_ID
  /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  // youtube.com/embed/VIDEO_ID
  /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  // youtube.com/shorts/VIDEO_ID
  /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  // youtube.com/live/VIDEO_ID
  /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
];

/**
 * Extract a YouTube video ID from a URL.
 * Returns null if the URL is not a valid YouTube URL.
 */
export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Check if a URL is a YouTube URL.
 */
export function isYouTubeUrl(url: string): boolean {
  return extractYouTubeId(url) !== null;
}

/**
 * Check if a URL is a direct video file (mp4, webm, etc.).
 */
export function isDirectVideoUrl(url: string): boolean {
  const trimmed = url.trim().toLowerCase();
  return (
    trimmed.startsWith("http") &&
    /\.(mp4|webm|ogg|ogv|mov|m4v)(\?.*)?$/.test(trimmed)
  );
}

/**
 * Build a YouTube embed URL from a video ID.
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${
    typeof window !== "undefined" ? window.location.origin : ""
  }`;
}

/**
 * Load the YouTube IFrame API script.
 * Returns a promise that resolves when the API is ready.
 */
export function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve();

    if (window.YT?.Player) {
      resolve();
      return;
    }

    const existing = document.getElementById("youtube-iframe-api");
    if (existing) {
      // Wait for the API to be ready
      const checkReady = () => {
        if (window.YT?.Player) {
          resolve();
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
      return;
    }

    const tag = document.createElement("script");
    tag.id = "youtube-iframe-api";
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);

    // The API calls onYouTubeIframeAPIReady when loaded
    window.onYouTubeIframeAPIReady = () => {
      resolve();
    };
  });
}