"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  savePlaybackProgress,
  getPlaybackProgress,
  savePlaylistIndex,
  getPlaylistIndex,
  savePlaylistCurrentVideo,
  getPlaylistCurrentVideo,
  savePlaylistResume,
  getPlaylistResume,
} from "@/lib/storage";

type UseVideoPlayerProps = {
  videoId: string;
  playerElementId: string;
  isPlaylist: boolean;
  onStudyLogReady: (seconds: number) => Promise<boolean>;
};

type PlayerLike = {
  getVideoUrl?: () => string;
  getPlaylistIndex?: () => number;
  getCurrentTime?: () => number;
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void;
  pauseVideo?: () => void;
  playVideo?: () => void;
  isMuted?: () => boolean;
  unMute?: () => void;
  destroy?: () => void;
};

type PlayerEvent = {
  data: number;
  target: PlayerLike;
};

type YTNamespace = {
  Player: new (
    elementId: string,
    config: {
      events: {
        onReady: (event: PlayerEvent) => void;
        onStateChange: (event: PlayerEvent) => void;
      };
    },
  ) => PlayerLike;
};

type WindowWithYT = Window & {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
};

type InitialPlaylistState = {
  savedPlaylistIdx: number;
  isPlaylistJumping: boolean;
  resumeTarget: { videoId: string; time: number } | null;
  currentVideoId: string | null;
};

const RESUME_THRESHOLD_SECONDS = 5;
const PLAYBACK_SAVE_INTERVAL_MS = 5000;

function resolveInitialPlaylistState(
  videoId: string,
  isPlaylist: boolean,
): InitialPlaylistState {
  if (!isPlaylist) {
    return {
      savedPlaylistIdx: 0,
      isPlaylistJumping: false,
      resumeTarget: null,
      currentVideoId: null,
    };
  }

  const savedResume = getPlaylistResume(videoId);
  if (savedResume) {
    return {
      savedPlaylistIdx: savedResume.index,
      isPlaylistJumping: savedResume.time > RESUME_THRESHOLD_SECONDS,
      resumeTarget:
        savedResume.time > RESUME_THRESHOLD_SECONDS
          ? { videoId: savedResume.videoId, time: savedResume.time }
          : null,
      currentVideoId: savedResume.videoId,
    };
  }

  const savedCurrent = getPlaylistCurrentVideo(videoId);
  if (savedCurrent) {
    const savedTime = getPlaybackProgress(savedCurrent.videoId);
    return {
      savedPlaylistIdx: savedCurrent.index,
      isPlaylistJumping: savedTime > RESUME_THRESHOLD_SECONDS,
      resumeTarget:
        savedTime > RESUME_THRESHOLD_SECONDS
          ? { videoId: savedCurrent.videoId, time: savedTime }
          : null,
      currentVideoId: savedCurrent.videoId,
    };
  }

  return {
    savedPlaylistIdx: getPlaylistIndex(videoId),
    isPlaylistJumping: false,
    resumeTarget: null,
    currentVideoId: null,
  };
}

export function useVideoPlayer({
  videoId,
  playerElementId,
  isPlaylist,
  onStudyLogReady,
}: UseVideoPlayerProps) {
  const [player, setPlayer] = useState<PlayerLike | null>(null);
  const [playerState, setPlayerState] = useState<number>(-1);
  const [isReady, setIsReady] = useState(false);
  const [savedPlaylistIdx, setSavedPlaylistIdx] = useState<number>(0);
  const [isPlaylistJumping, setIsPlaylistJumping] = useState(false);
  const [currentPlaylistVideoId, setCurrentPlaylistVideoId] = useState<
    string | null
  >(null);
  const [totalPlaySegmentTime, setTotalPlaySegmentTime] = useState(0);
  const [hasUserPlayed, setHasUserPlayed] = useState(false);

  const playTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekedVideoIdRef = useRef<string | null>(null);
  const playerInstanceRef = useRef<PlayerLike | null>(null);
  const playlistResumeTargetRef = useRef<{
    videoId: string;
    time: number;
  } | null>(null);
  const totalPlaySegmentTimeRef = useRef(0);

  useEffect(() => {
    totalPlaySegmentTimeRef.current = totalPlaySegmentTime;
  }, [totalPlaySegmentTime]);

  // Initialize: Read localStorage safely on the client side
  useEffect(() => {
    const initialState = resolveInitialPlaylistState(videoId, isPlaylist);
    setSavedPlaylistIdx(initialState.savedPlaylistIdx);
    setIsPlaylistJumping(initialState.isPlaylistJumping);
    setCurrentPlaylistVideoId(initialState.currentVideoId);
    playlistResumeTargetRef.current = initialState.resumeTarget;
    setIsReady(true);
  }, [videoId, isPlaylist]);

  const getVideoIdFromPlayer = useCallback(
    (target: PlayerLike): string | null => {
      try {
        const videoUrl = target.getVideoUrl?.() || "";
        const match = videoUrl.match(/[?&]v=([^&]+)/);
        return match ? match[1] : null;
      } catch {
        return null;
      }
    },
    [],
  );

  const saveCurrentPlaylistPosition = useCallback(
    (target: PlayerLike, currentTime?: number) => {
      if (!isPlaylist) return;

      try {
        const currentIdx = target.getPlaylistIndex
          ? target.getPlaylistIndex()
          : -1;
        const currentVideoId = getVideoIdFromPlayer(target);
        const time =
          typeof currentTime === "number"
            ? currentTime
            : target.getCurrentTime
              ? target.getCurrentTime()
              : 0;

        if (!currentVideoId || currentIdx < 0) return;

        savePlaylistCurrentVideo(videoId, currentVideoId, currentIdx);
        savePlaylistIndex(videoId, currentIdx);
        savePlaylistResume(videoId, currentVideoId, currentIdx, time);
        setCurrentPlaylistVideoId(currentVideoId);

        if (time > 0) {
          savePlaybackProgress(currentVideoId, time);
        }
      } catch {
        // noop
      }
    },
    [getVideoIdFromPlayer, isPlaylist, videoId],
  );

  useEffect(() => {
    if (!isReady) return;

    const w = window as WindowWithYT;
    const hasIframeApiScript = !!document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    if (!w.YT?.Player && !hasIframeApiScript) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!document.getElementById(playerElementId) || !w.YT?.Player) return;

      if (playerInstanceRef.current?.destroy) {
        try {
          playerInstanceRef.current.destroy();
        } catch {
          // noop
        }
      }

      const instance = new w.YT.Player(playerElementId, {
        events: {
          onReady: (event: PlayerEvent) => {
            setPlayer(event.target);
            playerInstanceRef.current = event.target;

            if (!isPlaylist) {
              const savedTime = getPlaybackProgress(videoId);
              if (savedTime > RESUME_THRESHOLD_SECONDS) {
                event.target.seekTo?.(savedTime, true);
                setTimeout(() => event.target.pauseVideo?.(), 100);
              }
            }
          },
          onStateChange: (event: PlayerEvent) => {
            const state = event.data;
            setPlayerState(state);

            if (state === 1) {
              if (playTimerIntervalRef.current) {
                clearInterval(playTimerIntervalRef.current);
              }
              playTimerIntervalRef.current = setInterval(() => {
                setTotalPlaySegmentTime((prev) => prev + 1);
              }, 1000);
            } else if (playTimerIntervalRef.current) {
              clearInterval(playTimerIntervalRef.current);
              playTimerIntervalRef.current = null;
            }

            if (state === 1) {
              try {
                const currentVideoId = getVideoIdFromPlayer(event.target);
                if (
                  currentVideoId &&
                  currentVideoId !== lastSeekedVideoIdRef.current
                ) {
                  let savedTime = getPlaybackProgress(currentVideoId);
                  const resumeTarget = playlistResumeTargetRef.current;

                  if (resumeTarget && resumeTarget.videoId === currentVideoId) {
                    savedTime = Math.max(savedTime, resumeTarget.time);
                    playlistResumeTargetRef.current = null;
                  }

                  if (savedTime > RESUME_THRESHOLD_SECONDS) {
                    event.target.seekTo?.(savedTime, true);
                  }

                  lastSeekedVideoIdRef.current = currentVideoId;
                }
              } catch {
                // noop
              }

              setIsPlaylistJumping(false);
            }

            if (isPlaylist && (state === 1 || state === 2 || state === 0)) {
              saveCurrentPlaylistPosition(event.target);
            }

            if (
              !isPlaylist &&
              (state === 2 || state === 0) &&
              event.target.getCurrentTime
            ) {
              savePlaybackProgress(videoId, event.target.getCurrentTime());
            }
          },
        },
      });

      playerInstanceRef.current = instance;
    };

    let initTimeout: NodeJS.Timeout | null = null;

    if (w.YT?.Player) {
      initTimeout = setTimeout(initPlayer, 150);
    } else {
      const prevReady = w.onYouTubeIframeAPIReady;
      w.onYouTubeIframeAPIReady = () => {
        prevReady?.();
        initTimeout = setTimeout(initPlayer, 150);
      };
    }

    return () => {
      if (initTimeout) clearTimeout(initTimeout);
      if (playTimerIntervalRef.current) {
        clearInterval(playTimerIntervalRef.current);
        playTimerIntervalRef.current = null;
      }
      if (playerInstanceRef.current?.destroy) {
        try {
          playerInstanceRef.current.destroy();
        } catch {
          // noop
        }
      }
      playerInstanceRef.current = null;
      setPlayer(null);
    };
  }, [
    videoId,
    playerElementId,
    isReady,
    isPlaylist,
    getVideoIdFromPlayer,
    saveCurrentPlaylistPosition,
  ]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (playerState === 1 && player?.getCurrentTime) {
      interval = setInterval(() => {
        const curTime = player.getCurrentTime ? player.getCurrentTime() : 0;

        if (isPlaylist) {
          saveCurrentPlaylistPosition(player, curTime);
        } else {
          savePlaybackProgress(videoId, curTime);
        }

        const currentSegmentSeconds = totalPlaySegmentTimeRef.current;
        if (currentSegmentSeconds >= 60) {
          onStudyLogReady(currentSegmentSeconds).then((success) => {
            if (success) setTotalPlaySegmentTime(0);
          });
        }
      }, PLAYBACK_SAVE_INTERVAL_MS);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [
    playerState,
    player,
    videoId,
    isPlaylist,
    onStudyLogReady,
    saveCurrentPlaylistPosition,
  ]);

  useEffect(() => {
    const handleUnload = () => {
      if (player?.getCurrentTime) {
        const curTime = player.getCurrentTime();
        if (isPlaylist) {
          saveCurrentPlaylistPosition(player, curTime);
        } else {
          savePlaybackProgress(videoId, curTime);
        }
      }

      const currentSegmentSeconds = totalPlaySegmentTimeRef.current;
      if (currentSegmentSeconds >= 30) {
        onStudyLogReady(currentSegmentSeconds);
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      handleUnload();
    };
  }, [
    player,
    videoId,
    isPlaylist,
    onStudyLogReady,
    saveCurrentPlaylistPosition,
  ]);

  const seekTo = useCallback(
    (seconds: number) => {
      player?.seekTo?.(seconds, true);
    },
    [player],
  );

  const playVideo = useCallback(() => {
    if (player?.playVideo) {
      if (player.isMuted?.()) player.unMute?.();
      player.playVideo();
      setHasUserPlayed(true);
    }
  }, [player]);

  const getCurrentTime = useCallback(() => {
    if (!player?.getCurrentTime) return 0;
    return player.getCurrentTime() || 0;
  }, [player]);

  return {
    player,
    playerState,
    isReady,
    isPlaylistJumping,
    savedPlaylistIdx,
    currentPlaylistVideoId,
    hasUserPlayed,
    seekTo,
    playVideo,
    getCurrentTime,
    totalPlaySegmentTime,
  };
}
