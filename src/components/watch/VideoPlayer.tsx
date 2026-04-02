"use client";

import { Play, Clock } from "lucide-react";
import { useState, useEffect } from "react";

type VideoPlayerProps = {
  playerElementId: string;
  isPlaylist: boolean;
  embedSrc: string;
  isReady: boolean;
  playerState: number;
  isPlaylistJumping: boolean;
  savedPlaylistIdx: number;
  hasUserPlayed: boolean;
  onOverlayClick: () => void;
  title: string;
  channel: string;
};

export function VideoPlayer({
  playerElementId,
  isPlaylist,
  embedSrc,
  isReady,
  playerState,
  isPlaylistJumping,
  savedPlaylistIdx,
  hasUserPlayed,
  onOverlayClick,
  title,
  channel,
}: VideoPlayerProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  return (
    <div className="w-full bg-card/40 backdrop-blur-2xl rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_8px_40px_rgb(0,0,0,0.12)] relative group/player transition-all duration-300 hover:shadow-[0_8px_50px_rgb(99,102,241,0.15)]">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 opacity-70" />
      <div className="w-full aspect-video bg-black/90 flex items-center justify-center relative overflow-hidden">
        {/* Iframe container */}
        <div
          className={`w-full h-full ${!isFullscreen && playerState !== 1 && playerState !== 3 ? "pointer-events-none" : ""}`}
        >
          {isReady && (
            <iframe
              id={playerElementId}
              className="w-full h-full scale-[1.01]"
              src={embedSrc + "&enablejsapi=1"}
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}
        </div>

        {/* Custom Overlay to hide related videos on pause/end */}
        {!isFullscreen &&
          ((playerState !== 1 && playerState !== 3) || isPlaylistJumping) && (
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 cursor-pointer animate-in fade-in duration-300"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onOverlayClick();
              }}
            >
              <div className="w-24 h-24 rounded-full bg-indigo-500/90 border-4 border-white/10 hover:bg-indigo-400 hover:border-white/20 flex items-center justify-center text-primary-foreground transition-all duration-300 transform hover:scale-110 shadow-[0_0_50px_rgba(99,102,241,0.6)] group">
                <Play className="w-12 h-12 ml-2 text-white fill-white transition-transform group-hover:scale-110" />
              </div>
              <p className="text-white mt-8 text-lg font-bold tracking-widest drop-shadow-md">
                {playerState === 0
                  ? "動画が終了しました"
                  : playerState === 2 && hasUserPlayed
                    ? "再生を再開する"
                    : "学習を開始する"}
              </p>
              {isPlaylist && savedPlaylistIdx > 0 && !hasUserPlayed && (
                <div className="mt-4 px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 text-sm font-medium backdrop-blur-md flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{savedPlaylistIdx + 1}本目の動画から再開</span>
                </div>
              )}
              {playerState === 2 && hasUserPlayed && (
                <p className="text-white/70 text-sm mt-3 font-medium tracking-wide">
                  ノートを取るのに最適な速度です
                </p>
              )}
            </div>
          )}
      </div>
      {title && (
        <div className="px-4 py-3 md:px-5 md:py-4">
          <h2 className="text-base md:text-lg font-bold text-foreground line-clamp-2 leading-snug">
            {title}
          </h2>
          {channel && (
            <div className="mt-2 flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">
                  {channel.charAt(0).toUpperCase()}
                </span>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                {channel}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
