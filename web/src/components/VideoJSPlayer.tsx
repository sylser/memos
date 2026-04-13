import { useEffect, useRef } from "react";
import videojs from "video.js";
import { cn } from "@/lib/utils";

interface VideoJSPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  videoClassName?: string;
  controls?: boolean;
  autoplay?: boolean;
  loop?: boolean;
  muted?: boolean;
  playsInline?: boolean;
  preload?: "none" | "metadata" | "auto";
}

const VideoJSPlayer = ({
  src,
  poster,
  className,
  videoClassName,
  controls = true,
  autoplay = false,
  loop = false,
  muted = false,
  playsInline = true,
  preload = "auto",
}: VideoJSPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<videojs.Player | null>(null);

  useEffect(() => {
    if (!videoRef.current || playerRef.current) {
      return;
    }

    playerRef.current = videojs(videoRef.current, {
      controls,
      autoplay,
      loop,
      muted,
      playsinline: playsInline,
      preload,
      poster,
      sources: [{ src }],
    });

    return () => {
      if (!playerRef.current) {
        return;
      }
      playerRef.current.dispose();
      playerRef.current = null;
    };
  }, [autoplay, controls, loop, muted, playsInline, poster, preload, src]);

  useEffect(() => {
    const player = playerRef.current;
    if (!player) {
      return;
    }

    player.autoplay(autoplay);
    player.loop(loop);
    player.muted(muted);
    player.controls(controls);
    if (poster) {
      player.poster(poster);
    }
    player.src({ src });
  }, [autoplay, controls, loop, muted, poster, src]);

  return (
    <div data-vjs-player className={cn("w-full", className)}>
      <video ref={videoRef} className={cn("video-js vjs-big-play-centered w-full h-full rounded-md", videoClassName)} />
    </div>
  );
};

export default VideoJSPlayer;
