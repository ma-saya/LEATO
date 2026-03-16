'use client';

import { use, useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Heart, FolderOpen, Sparkles, BookOpen, CheckCircle, XCircle, Loader2, Zap, BrainCircuit, MessageCircle, Send, PencilLine, History, Trash2, PlusCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { addToHistory, addFavorite, removeFavorite, isFavorite, getCategories, savePlaybackProgress, getPlaybackProgress, savePlaylistIndex, getPlaylistIndex } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type AIData = {
  summary: {
    headline: string;
    sections: { 
      title: string; 
      content: string;
      importance?: string;
      codeSnippet?: string;
    }[];
    takeaways?: string[];
  };
  quiz: QuizQuestion[];
};

type Note = {
  id: string;
  video_id: string;
  content: string;
  timestamp: number;
  created_at: string;
};

type StudyLog = {
  id?: string;
  video_id: string;
  video_title: string;
  minutes: number;
  category: string;
  date: string;
};

export default function WatchPage({ 
  params,
  searchParams
}: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const searchProps = use(searchParams);
  const router = useRouter();
  
  const isPlaylist = searchProps.isPlaylist === 'true';
  const title = typeof searchProps.title === 'string' ? decodeURIComponent(searchProps.title) : '';
  const channel = typeof searchProps.channel === 'string' ? decodeURIComponent(searchProps.channel) : '';
  const thumb = typeof searchProps.thumb === 'string' ? decodeURIComponent(searchProps.thumb) : '';

  const [playlistIndex, setPlaylistIndex] = useState(0);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (isPlaylist) {
      const idx = getPlaylistIndex(id);
      setPlaylistIndex(idx);
      setSavedPlaylistIdx(idx);
    }
    setIsReady(true);
  }, [id, isPlaylist]);

  const embedSrc = isPlaylist
    ? `https://www.youtube-nocookie.com/embed/videoseries?list=${id}&rel=0&modestbranding=1&fs=1${playlistIndex > 0 ? `&index=${playlistIndex}` : ''}`
    : `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&fs=1`;

  const [isFav, setIsFav] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // AI State
  const [activeTab, setActiveTab] = useState<'summary' | 'quiz' | 'chat' | 'notes'>('summary');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<number, boolean>>({});
  
  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // Mulei-mode AI Data
  const [summaryMode, setSummaryMode] = useState<'lightning' | 'deep'>('deep');
  const [lightningData, setLightningData] = useState<AIData | null>(null);
  const [deepData, setDeepData] = useState<AIData | null>(null);

  // Notes State
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState('');
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [player, setPlayer] = useState<any>(null);
  const [playerState, setPlayerState] = useState<number>(-1);

  // Seudy Tracking State
  const playStartTimeRef = useRef<number | null>(null);
  const [totalPlaySegmentTime, setTotalPlaySegmentTime] = useState(0); // seconds in current session
  const lastLoggedTimeRef = useRef<number>(0);
  const playTimerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [savedPlaylistIdx, setSavedPlaylistIdx] = useState<number>(0);
  const [isPlaylistJumping, setIsPlaylistJumping] = useState(false);
  const isPlaylistJumpingRef = useRef(false);
  const hasUserPlayedRef = useRef(false);

  // Load saved summary mode on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('leato_summary_mode');
    if (savedMode === 'lightning' || savedMode === 'deep') {
      setSummaryMode(savedMode);
    }
  }, []);

  const handleModeChange = (mode: 'lightning' | 'deep') => {
    setSummaryMode(mode);
    localStorage.setItem('leato_summary_mode', mode);
  };

  // Current visible data based on mode
  const currentAIData = summaryMode === 'lightning' ? lightningData : deepData;

  // Save to history on mount & check favorite status
  useEffect(() => {
    if (title) {
      addToHistory({
        id,
        title,
        channelTitle: channel,
        thumbnailUrl: thumb,
        isPlaylist,
        savedAt: Date.now(),
      });
    }
    setIsFav(isFavorite(id));
    setCategories(getCategories());
  }, [id, title, channel, thumb, isPlaylist]);

  const handleFavClick = () => {
    if (isFav) {
      removeFavorite(id);
      setIsFav(false);
      setShowCategoryPicker(false);
    } else {
      setShowCategoryPicker(!showCategoryPicker);
    }
  };

  const handleSelectCategory = (cat: string) => {
    addFavorite({
      id,
      title,
      channelTitle: channel,
      thumbnailUrl: thumb,
      isPlaylist,
      savedAt: Date.now(),
    }, cat);
    setIsFav(true);
    setShowCategoryPicker(false);
  };

  const generateAI = async (overrideMode?: 'lightning' | 'deep') => {
    const targetMode = overrideMode || summaryMode;
    if (isPlaylist) {
      setAiError('再生リストではAI要約は利用できません。個別の動画でお試しください。');
      return;
    }
    setAiLoading(true);
    setAiError('');
    if (targetMode === 'lightning') setLightningData(null);
    else setDeepData(null);
    
    setQuizAnswers({});
    setQuizRevealed({});
    setAiStatus(`${targetMode === 'lightning' ? 'Lightning' : 'Deep'}モードで分析中...`);

    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: id, title, mode: targetMode }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI処理に失敗しました');
      }
      if (targetMode === 'lightning') setLightningData(data);
      else setDeepData(data);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI処理中にエラーが発生しました');
    } finally {
      setAiLoading(false);
      setAiStatus('');
    }
  };

  // Auto-load cached summaries
  useEffect(() => {
    if (!id || !title || isPlaylist) return;

    const fetchCache = async (mode: 'lightning' | 'deep') => {
      try {
        const res = await fetch('/api/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: id, title, mode, checkOnly: true }),
        });
        const data = await res.json();
        if (res.ok && data.summary) {
          if (mode === 'lightning') setLightningData(data);
          else setDeepData(data);
        }
      } catch (err) {
        console.error(`Failed to auto-load ${mode} cache:`, err);
      }
    };

    fetchCache('lightning');
    fetchCache('deep');
  }, [id, title, isPlaylist]);

  // YouTube IFrame API Seeup
  useEffect(() => {
    if (!isReady) return;

    // Only if not already loaded
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      // Ensure the container exists
      if (!document.getElementById('youtube-player')) return;

      new (window as any).YT.Player('youtube-player', {
        events: {
          'onReady': (event: any) => {
            setPlayer(event.target);
            
            if (isPlaylist) {
              const savedIndex = getPlaylistIndex(id);
              if (savedIndex > 0) {
                isPlaylistJumpingRef.current = true;
                setIsPlaylistJumping(true);
                event.target.mute();
                event.target.playVideoAt(savedIndex);
              }
            } else {
              const savedTime = getPlaybackProgress(id);
              if (savedTime > 0) {
                event.target.seekTo(savedTime, true);
                setTimeout(() => {
                  event.target.pauseVideo();
                }, 100);
              }
            }
          },
          'onStateChange': (event: any) => {
            const state = event.data;
            setPlayerState(state);

            // Seudy Tracking Logic
            if (state === 1) { // PLAYING
              playStartTimeRef.current = Date.now();
              if (playTimerIntervalRef.current) clearInterval(playTimerIntervalRef.current);
              playTimerIntervalRef.current = setInterval(() => {
                if (playStartTimeRef.current) {
                  const elapsed = Math.floor((Date.now() - playStartTimeRef.current) / 1000);
                  setTotalPlaySegmentTime(prev => prev + 1); // increment every second
                }
              }, 1000);
            } else { // PAUSED, ENDED, etc.
              if (playTimerIntervalRef.current) {
                clearInterval(playTimerIntervalRef.current);
                playTimerIntervalRef.current = null;
              }
              playStartTimeRef.current = null;
            }

            // 再生リストのジャンプ完了待ち: 再生が始まったら一時停止してフラグ解除
            if (isPlaylistJumpingRef.current && state === 1) {
              // 現在再生中の動画IDで保存済みの秒数を取得してシーク
              let didSeek = false;
              try {
                const videoUrl = event.target.getVideoUrl() || '';
                const match = videoUrl.match(/[?&]v=([^&]+)/);
                if (match) {
                  const currentVideoId = match[1];
                  const savedTime = getPlaybackProgress(currentVideoId);
                  if (savedTime > 0) {
                    event.target.seekTo(savedTime, true);
                    didSeek = true;
                  }
                }
              } catch (e) {
                // ignore
              }
              // シーク処理が完了するのを待ってから一時停止し、その後にフラグ解除
              setTimeout(() => {
                event.target.pauseVideo();
                isPlaylistJumpingRef.current = false;
                setIsPlaylistJumping(false);
              }, didSeek ? 500 : 100);
            }
            // 再生リストの場合、動画が切り替わったら即座にインデックスを保存
            if (isPlaylist && event.target && event.target.getPlaylistIndex) {
              const currentIdx = event.target.getPlaylistIndex();
              if (currentIdx >= 0) {
                savePlaylistIndex(id, currentIdx);
              }
            }
            // 一時停止やシーク時にも即座に再生位置を保存
            if (state === 2 && event.target && event.target.getCurrentTime) {
              if (isPlaylist) {
                try {
                  const videoUrl = event.target.getVideoUrl() || '';
                  const match = videoUrl.match(/[?&]v=([^&]+)/);
                  if (match) {
                    savePlaybackProgress(match[1], event.target.getCurrentTime());
                  }
                } catch (e) { /* ignore */ }
              } else {
                savePlaybackProgress(id, event.target.getCurrentTime());
              }
            }
          }
        }
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }, [id, isReady, isPlaylist]);

  // Save playback progress periodically while playing
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (playerState === 1 && player && player.getCurrentTime) {
      interval = setInterval(() => {
        if (isPlaylist && player.getPlaylistIndex) {
          savePlaylistIndex(id, player.getPlaylistIndex());
          // 再生リスト内の各動画の秒数も保存
          try {
            const videoUrl = player.getVideoUrl() || '';
            const match = videoUrl.match(/[?&]v=([^&]+)/);
            if (match) {
              savePlaybackProgress(match[1], player.getCurrentTime());
            }
          } catch (e) { /* ignore */ }
        } else {
          savePlaybackProgress(id, player.getCurrentTime());
        }

        // Periodic Seudy Log Save (every 5 mins / 300 seconds of segment)
        if (totalPlaySegmentTime >= 60) {
          saveStudyLog(totalPlaySegmentTime).then(success => {
            if (success) setTotalPlaySegmentTime(0);
          });
        }
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [playerState, player, id, isPlaylist, totalPlaySegmentTime, categories, isFav]);

  // ページ離脱時に再生位置を保存
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (player && player.getCurrentTime) {
        try {
          if (isPlaylist) {
            if (player.getPlaylistIndex) {
              savePlaylistIndex(id, player.getPlaylistIndex());
            }
            const videoUrl = player.getVideoUrl() || '';
            const match = videoUrl.match(/[?&]v=([^&]+)/);
            if (match) {
              savePlaybackProgress(match[1], player.getCurrentTime());
            }
          } else {
            savePlaybackProgress(id, player.getCurrentTime());
          }
        } catch (e) { /* ignore */ }
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [player, id, isPlaylist]);

  // Notes Managemene (Supabase)
  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('video_id', id)
        .order('timestamp', { ascending: true });
      
      if (error) throw error;
      if (data) setNotes(data);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      // Fallback to local storage if DB fails
      const savedNotes = localStorage.getItem(`leato_notes_${id}`);
      if (savedNotes) setNotes(JSON.parse(savedNotes));
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [id]);

  // Seudy Log Persiseence
  const saveStudyLog = async (seconds: number) => {
    if (seconds < 30) return; // Ignore very shore views

    const minutes = Math.round(seconds / 60);
    if (minutes === 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const { error } = await supabase
        .from('study_logs')
        .insert({
          video_id: id,
          video_title: title || 'Untitled Video',
          minutes: minutes,
          category: (isFav && categories.length > 0) ? categories[0] : 'その他',
          date: today
        });
      
      if (error) throw error;
      console.log(`Saved seudy log: ${minutes} mins`);
      return true;
    } catch (err) {
      console.error('Failed to save seudy log:', err);
      return false;
    }
  };

  // Save seudy log on beforeunload
  useEffect(() => {
    const handleUnloadSave = () => {
      if (totalPlaySegmentTime >= 30) {
        // We use navigator.sendBeacon or similar if we were using a cuseom endpoint,
        // but with Supabase client, we just ery our bese.
        saveStudyLog(totalPlaySegmentTime);
      }
    };
    window.addEventListener('beforeunload', handleUnloadSave);
    return () => {
      window.removeEventListener('beforeunload', handleUnloadSave);
      if (totalPlaySegmentTime >= 30) {
        saveStudyLog(totalPlaySegmentTime);
      }
    };
  }, [totalPlaySegmentTime]);

  const handleSaveNote = async (cuseomContent?: string, cuseomTime?: number) => {
    const content = cuseomContent || noteInput.trim();
    if (!content || isSavingNote) return;

    setIsSavingNote(true);
    let time = 0;
    if (cuseomTime !== undefined) {
      time = cuseomTime;
    } else if (player && player.getCurrentTime) {
      time = Math.floor(player.getCurrentTime());
    }

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          video_id: id,
          content,
          timestamp: time
        }])
        .select();

      if (error) throw error;
      
      if (data) {
        setNotes(prev => [...prev, data[0]].sort((a, b) => a.timestamp - b.timestamp));
        if (!cuseomContent) setNoteInput('');
      }
    } catch (err) {
      console.error('Failed to save note to Supabase:', err);
      // Fallback to local storage
      const newNote: Note = {
        id: Math.random().toString(36).substring(2, 9),
        video_id: id,
        content,
        timestamp: time,
        created_at: new Date().toISOString()
      };
      const updated = [...notes, newNote].sort((a, b) => a.timestamp - b.timestamp);
      localStorage.setItem(`leato_notes_${id}`, JSON.stringify(updated));
      setNotes(updated);
      if (!cuseomContent) setNoteInput('');
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;
      setNotes(prev => prev.filter(n => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note from Supabase:', err);
      // Juse update local state
      setNotes(prev => prev.filter(n => n.id !== noteId));
      localStorage.setItem(`leato_notes_${id}`, JSON.stringify(notes.filter(n => n.id !== noteId)));
    }
  };

  const handleSeekTo = (seconds: number) => {
    if (player && player.seekTo) {
      player.seekTo(seconds, true);
      // Optional: auto-play if needed
      // player.playVideo();
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleQuizAnswer = (qIndex: number, opeIndex: number) => {
    if (quizRevealed[qIndex]) return;
    setQuizAnswers(prev => ({ ...prev, [qIndex]: opeIndex }));
    setQuizRevealed(prev => ({ ...prev, [qIndex]: true }));
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatLoading) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setChatError('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: id, message: userMessage, history: messages }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '通信エラーが発生しました');
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (err: any) {
      setChatError(err.message);
      setMessages(prev => [...prev, { role: 'assistant', content: `エラー: ${err.message}` }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Scroll to bottom of chae
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isChatLoading]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header Bar */}
      <header className="h-16 border-b border-border flex items-center px-4 md:px-6">
        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          検索へ戻る
        </Button>

        {/* Favorite Button + Category Picker */}
        <div className="relative ml-4">
          <Button 
            variant="ghost" 
            onClick={handleFavClick}
            className={`${isFav ? 'text-pink-500 hover:text-pink-400' : 'text-muted-foreground hover:text-pink-400'}`}
            title={isFav ? 'お気に入りから削除' : 'お気に入りに追加'}
          >
            <Heart className={`w-5 h-5 mr-1 ${isFav ? 'fill-current' : ''}`} />
            {isFav ? 'お気に入り済み' : 'お気に入り'}
          </Button>

          {showCategoryPicker && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-card border border-border rounded-lg shadow-xl p-2 min-w-[180px] max-h-60 overflow-y-auto">
              <p className="text-xs text-muted-foreground mb-2 px-1">カテゴリーを選択:</p>
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => handleSelectCategory(cat)}
                  className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-indigo-600/50 text-foreground flex items-center gap-2"
                >
                  <FolderOpen className="w-3 h-3 text-foreground/80" /> {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ml-auto font-bold tracking-tight bg-gradiene-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
          LEATO
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row p-4 md:p-6 gap-6 max-w-7xl mx-auto w-full">
        
        {/* Left: Focus Player */}
        <div className="flex-1 w-full bg-card rounded-2xl overflow-hidden border border-border shadow-2xl relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-500/20" />
          <div className="w-full aspect-video bg-card rounded-lg overflow-hidden flex items-center justify-center relative group">
            {/* When overlay is aceive, disable pointer events on the iframe to prevent clicking through to related videos */}
            <div className={`w-full h-full ${playerState !== 1 && playerState !== 3 ? 'pointer-events-none' : ''}`}>
              {isReady && (
                <iframe
                  id="youtube-player"
                  className="w-full h-full"
                  src={embedSrc + "&enablejsapi=1"}
                  title="YouTube video player"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              )}
            </div>
            {/* Custom Overlay to hide related videos on pause/end */}
            {(playerState !== 1 && playerState !== 3 || isPlaylistJumping) && (
              <div 
                className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10 cursor-pointer animate-in fade-in duration-200"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  hasUserPlayedRef.current = true;
                  if (player && player.playVideo) {
                    if (player.isMuted && player.isMuted()) {
                      player.unMute();
                    }
                    player.playVideo();
                  }
                }}
              >
                <div className="w-20 h-20 rounded-full bg-indigo-500/90 hover:bg-indigo-500 flex items-center justify-center text-primary-foreground transition-all transform hover:scale-110 shadow-[0_0_40px_rgba(99,102,241,0.6)]">
                  <Play className="w-10 h-10 ml-2 text-white fill-current" />
                </div>
                <p className="text-foreground/80 mt-6 font-bold tracking-wider">
                  {playerState === 0 ? "動画が終了しました" : (playerState === 2 && hasUserPlayedRef.current) ? "再生を再開する" : "再生を開始する"}
                </p>
                {isPlaylist && savedPlaylistIdx > 0 && !hasUserPlayedRef.current && (
                  <p className="text-indigo-400 text-xs mt-2 font-medium">📋 {savedPlaylistIdx + 1}本目の動画から再開します</p>
                )}
                {playerState === 2 && hasUserPlayedRef.current && (
                  <p className="text-foreground/80 text-xs mt-2 font-medium">ノートを取るのに最適な時間です ✍️</p>
                )}
              </div>
            )}
          </div>
          {title && (
            <div className="p-4 border-t border-border">
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              {channel && <p className="text-sm text-foreground/80 mt-1">{channel}</p>}
            </div>
          )}
        </div>

        {/* Right: AI Learning Tools */}
        <div className="w-full lg:w-[420px] bg-card rounded-2xl border border-border flex flex-col overflow-hidden shadow-2xl">
          
          {/* Branded Header (Monica style) */}
          <div className="px-4 py-3 bg-muted/80 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-500 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold text-foreground tracking-tight">Leato AI</span>
            </div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
              <div className="w-1.5 h-1.5 rounded-full bg-neutral-700" />
            </div>
          </div>

          {/* Tab Headers */}
          <div className="flex border-b border-border bg-muted/40">
            <button
              onClick={() => setActiveTab('summary')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'summary'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-500/5'
                  : 'text-foreground/80 hover:text-foreground/80'
              }`}
            >
              <Sparkles className="w-4 h-4" /> AI 要約
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'quiz'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-500/5'
                  : 'text-foreground/80 hover:text-foreground/80'
              }`}
            >
              <BookOpen className="w-4 h-4" /> 確認クイズ
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'chat'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-500/5'
                  : 'text-foreground/80 hover:text-foreground/80'
              }`}
            >
              <MessageCircle className="w-4 h-4" /> 質問チャット
            </button>
            <button
              onClick={() => setActiveTab('notes')}
              className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'notes'
                  ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-indigo-500/5'
                  : 'text-foreground/80 hover:text-foreground/80'
              }`}
            >
              <PencilLine className="w-4 h-4" /> 学習ノート
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            
            {/* Mode Selector (Always visible when aceive summarization is possible) */}
            {!aiLoading && !aiError && activeTab === 'summary' && (
              <div className="mb-4">
                <div className="flex bg-muted/20 p-1 rounded-xl border border-border">
                  <button
                    onClick={() => handleModeChange("lightning")}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      summaryMode === "lightning" 
                        ? "bg-muted text-yellow-600 dark:text-yellow-500 border border-border shadow-sm" 
                        : "text-foreground/80 hover:text-foreground/80 hover:bg-muted/50"
                    }`}
                  >
                    <Zap className={`w-3.5 h-3.5 ${summaryMode === "lightning" ? "fill-yellow-500/20" : ""}`} />
                    <span>Lightning</span>
                  </button>
                  <button
                    onClick={() => handleModeChange("deep")}
                    className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                      summaryMode === "deep" 
                        ? "bg-muted text-indigo-600 dark:text-indigo-400 border border-border shadow-sm" 
                        : "text-foreground/80 hover:text-foreground/80 hover:bg-muted/50"
                    }`}
                  >
                    <BrainCircuit className={`w-3.5 h-3.5 ${summaryMode === "deep" ? "fill-indigo-400/20" : ""}`} />
                    <span>Deep</span>
                  </button>
                </div>
              </div>
            )}

            {/* Initial State or when a mode is not yee generated */}
            {!currentAIData && !aiLoading && !aiError && activeTab === 'summary' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-6 px-4">
                <div className="relative">
                  <div className="absolute -insee-4 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
                  {summaryMode === 'lightning' ? (
                    <Zap className="w-12 h-12 text-yellow-500 relative z-10 animate-in zoom-in duration-300" />
                  ) : (
                    <BrainCircuit className="w-12 h-12 text-indigo-400 relative z-10 animate-in zoom-in duration-300" />
                  )}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-primary-foreground tracking-tight">
                    {summaryMode === 'lightning' ? 'Lightning 要約' : 'Deep 徹底要約'}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-[240px] mx-auto">
                    {summaryMode === 'lightning' 
                      ? '数秒で全体のポイントをサクッと把握します。' 
                      : '時間をかけて理由や具体例を含めた完璧な解説を作成します。'}
                  </p>
                </div>

                <div className="w-full pt-2">
                  <Button
                    onClick={() => generateAI()}
                    disabled={isPlaylist}
                    className="w-full bg-neutral-100 hover:bg-white text-foreground font-bold py-3.5 rounded-xl shadow-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {isPlaylist ? '再生リストでは利用不可' : `${summaryMode === 'lightning' ? 'Lightning' : 'Deep'}を実行`}
                  </Button>
                  
                  <Button
                    disabled
                    className="w-full bg-muted/50 text-foreground/80 font-medium py-3 rounded-xl border border-border/50 cursor-noe-allowed flex items-center justify-center gap-2 mt-3"
                  >
                    <BookOpen className="w-4 h-4 opacity-50" />
                    クイズのみ生成 (Coming Soon)
                  </Button>
                </div>
                
                <p className="text-[10px] text-muted-foreground uppercase tracking-widese font-semibold pt-4">Supporeed by Gemini 2.0 Flash</p>
              </div>
            )}


            {/* Loading State (Monica style) */}
            {aiLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 py-12 px-6">
                <div className="relative w-20 h-20">
                  <div className="absolute insee-0 border-4 border-indigo-500/20 rounded-full" />
                  <div className="absolute insee-0 border-4 border-t-indigo-500 rounded-full animate-spin" />
                  <Sparkles className="absolute insee-0 m-auto w-8 h-8 text-indigo-400 animate-pulse" />
                </div>
                
                <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
                  <h3 className="text-lg font-semibold text-foreground">AIを呼び出しています...</h3>
                  <p className="text-sm text-foreground/80">{aiStatus || '動画の内容を分析し、最適な要約を構成中'}</p>
                </div>
                
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" />
                </div>
              </div>
            )}

            {/* Error State */}
            {aiError && (
              <div className="space-y-4 py-8">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center">
                  <p className="text-red-400 text-sm font-medium">{aiError}</p>
                </div>
                <div className="text-center">
                  <Button
                    onClick={() => generateAI()}
                    variant="outline"
                    className="border-border text-foreground/80 hover:bg-muted"
                  >
                    再試行
                  </Button>
                </div>
              </div>
            )}

            {/* Summary Tab (Premium Monica Style) */}
            {currentAIData && activeTab === 'summary' && (
              <div className="space-y-6 pb-8">
                {/* Headline Section */}
                {currentAIData.summary?.headline && (
                  <div className="bg-gradiene-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 pointer-events-none text-muted-foreground" style={{ opacity: 0.04 }}>
                      {summaryMode === 'lightning' ? <Zap className="w-24 h-24" strokeWidth={1} /> : <Sparkles className="w-24 h-24" strokeWidth={1} />}
                    </div>
                    <div className="relative z-10 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-4 rounded-full ${summaryMode === 'lightning' ? 'bg-yellow-500' : 'bg-indigo-500'}`} />
                        <h3 className={`text-xs font-bold tracking-wider uppercase ${summaryMode === 'lightning' ? 'text-yellow-500' : 'text-indigo-400'}`}>
                          {summaryMode === 'lightning' ? 'Lightning Summary' : 'Deep Analysis'}
                        </h3>
                      </div>
                      <p className="text-foreground font-semibold text-lg leading-snug tracking-tight">
                        {currentAIData.summary.headline}
                      </p>
                    </div>
                  </div>
                )}

                {/* Sections Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 px-1">
                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center border border-border">
                      <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">詳細チャプター</h3>
                  </div>
                  
                  <div className="space-y-3 pl-2 border-l border-border ml-3">
                    {currentAIData.summary?.sections?.map((section: any, i: number) => (
                      <div key={i} className="relative pl-6 pb-2 group">
                        {/* Timeline dot */}
                        <div className={`absolute left-[-5px] top-1.5 w-2.5 h-2.5 rounded-full border-2 border-[#1a1a1a] transition-colors ${
                          summaryMode === 'lightning' ? 'bg-neutral-700 group-hover:bg-yellow-500' : 'bg-neutral-700 group-hover:bg-indigo-500'
                        }`} />
                        
                        <div className="bg-muted/30 hover:bg-muted/60 transition-colors border border-border/50 rounded-xl p-4 space-y-3">
                          <h4 className="text-foreground font-bold text-sm flex items-center gap-2 pr-8 relative">
                            <span className={`${summaryMode === 'lightning' ? 'text-yellow-500' : 'text-indigo-400'} text-xs font-black opacity-80`}>{i + 1}.</span> 
                            {section.title}
                            <button 
                              onClick={() => handleSaveNote(`要約の引用: ${section.title}\n${section.content.substring(0, 100)}...`)}
                              className="absolute right-0 top-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity text-foreground/80 hover:text-indigo-400"
                              title="ノートに保存"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          </h4>
                          <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
                            {section.content}
                          </p>

                          {/* Importance Section */}
                          {section.importance && (
                            <div className="mt-3 bg-indigo-500/10 border-l-2 border-indigo-400 p-3 rounded-r-lg">
                              <p className="text-indigo-300 text-xs leading-relaxed font-medium">
                                <span className="font-bold">💡 重要な理由:</span> {section.importance.replace(/^【重要】/, '')}
                              </p>
                            </div>
                          )}

                          {/* Practical Example / Concrete Section */}
                          {section.codeSnippet && section.codeSnippet !== "null" && (
                            <div className="mt-3 bg-muted/20 border border-border rounded-lg p-3 font-mono text-[11px] text-green-400 overflow-x-auto">
                              <span className="text-foreground/80 block mb-1 font-sans font-bold uppercase tracking-wider text-[9px] flex items-center gap-1.5">
                                <Sparkles className="w-2.5 h-2.5" /> 実践イメージ / 具体例
                              </span>
                              <code>{section.codeSnippet.replace(/^【実践イメージ】/, '').replace(/^【実装イメージ】/, '')}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Takeaways Section */}
                {currentAIData.summary?.takeaways && currentAIData.summary.takeaways.length > 0 && (
                  <div className="mt-6 p-5 bg-gradient-to-br from-muted to-card border border-border rounded-2xl relative overflow-hidden">
                    <div className="absolute -right-4 -top-4 pointer-events-none text-muted-foreground" style={{ opacity: 0.04 }}>
                      <Sparkles className="w-32 h-32" strokeWidth={1} />
                    </div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-4">
                      <div className="w-1 h-4 bg-purple-500 rounded-full" />
                      この動画の「本質」まとめ
                    </h3>
                    <ul className="space-y-3 relative z-10">
                      {currentAIData.summary.takeaways.map((takeaway: string, i: number) => (
                        <li key={i} className="flex gap-3 text-foreground/80 text-sm">
                          <span className="text-purple-400 flex-shrink-0">🔑</span>
                          <span className="leading-snug">{takeaway.replace(/^🔑/, '').trim()}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Re-generate and Mode Switcher in Summary View */}
                <div className="pt-8 border-e border-border/50 space-y-4">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">要約の再分析</span>
                    <div className="h-px flex-1 bg-muted/50 mx-4" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      onClick={() => generateAI('lightning')} 
                      disabled={aiLoading}
                      variant="outline" 
                      className="border-border text-muted-foreground hover:text-yellow-500 hover:bg-yellow-500/5 h-10 text-xs"
                    >
                      <Zap className="w-3 h-3 mr-1.5" /> Lightningで更新
                    </Button>
                    <Button 
                      onClick={() => generateAI('deep')} 
                      disabled={aiLoading}
                      variant="outline" 
                      className="border-border text-muted-foreground hover:text-indigo-400 hover:bg-indigo-400/5 h-10 text-xs"
                    >
                      <BrainCircuit className="w-3 h-3 mr-1.5" /> Deepで徹底更新
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Quiz Tab */}
            {currentAIData && activeTab === 'quiz' && (
              <div className="space-y-6">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-semibold text-foreground">確認クイズ</h3>
                  <span className="ml-auto text-xs text-foreground/80">
                    {Object.keys(quizRevealed).length} / {currentAIData.quiz.length} 回答済み
                  </span>
                </div>
                {currentAIData.quiz.map((q, qIndex) => (
                  <div key={qIndex} className="bg-muted/50 border border-border/50 rounded-xl p-4 space-y-3">
                    <p className="text-foreground font-medium text-sm">Q{qIndex + 1}. {q.question}</p>
                    <div className="space-y-2">
                      {q.options.map((ope, opeIndex) => {
                        const isSelected = quizAnswers[qIndex] === opeIndex;
                        const isRevealed = quizRevealed[qIndex];
                        const isCorrect = opeIndex === q.correctIndex;

                        let cls = 'w-full text-left text-sm px-3 py-2.5 rounded-lg border transition-all flex items-center gap-2 ';
                        if (!isRevealed) {
                          cls += 'border-border text-foreground/80 hover:bg-neutral-700/50 hover:border-neutral-600 cursor-pointer';
                        } else if (isCorrect) {
                          cls += 'border-green-500/50 bg-green-500/10 text-green-300';
                        } else if (isSelected && !isCorrect) {
                          cls += 'border-red-500/50 bg-red-500/10 text-red-300';
                        } else {
                          cls += 'border-border text-muted-foreground';
                        }

                        return (
                          <button key={opeIndex} onClick={() => handleQuizAnswer(qIndex, opeIndex)} className={cls} disabled={isRevealed}>
                            <span className="w-5 h-5 rounded-full border border-current flex items-center justify-center text-xs flex-shrink-0">
                              {isRevealed && isCorrect ? <CheckCircle className="w-4 h-4 text-green-400" /> :
                               isRevealed && isSelected ? <XCircle className="w-4 h-4 text-red-400" /> :
                               String.fromCharCode(65 + opeIndex)}
                            </span>
                            {ope}
                          </button>
                        );
                      })}
                    </div>
                    {quizRevealed[qIndex] && (
                      <div className={`text-xs p-3 rounded-lg mt-2 ${
                        quizAnswers[qIndex] === q.correctIndex
                          ? 'bg-green-500/10 text-green-300 border border-green-500/20'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                      }`}>
                        <p className="font-medium mb-1">{quizAnswers[qIndex] === q.correctIndex ? '🎉 正解！' : '❌ 不正解'}</p>
                        <p>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}

                {Object.keys(quizRevealed).length === currentAIData.quiz.length && (
                  <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-4 text-center space-y-2">
                    <p className="text-indigo-300 font-bold text-lg">
                      {currentAIData.quiz.filter((q, i) => quizAnswers[i] === q.correctIndex).length} / {currentAIData.quiz.length} 正解
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {currentAIData.quiz.filter((q, i) => quizAnswers[i] === q.correctIndex).length === currentAIData.quiz.length
                        ? '🏆 パーフェクト！素晴らしい理解力です！'
                        : '復習してもう一度挑戦してみましょう！'}
                    </p>
                    <Button
                      onClick={() => { setQuizAnswers({}); setQuizRevealed({}); }}
                      variant="outline" size="sm"
                      className="border-indigo-500/50 text-indigo-300 hover:bg-indigo-500/20 mt-2"
                    >
                      もう一度挑戦
                    </Button>
                  </div>
                )}

                <div className="pt-2 text-center">
                  <Button onClick={() => generateAI()} variant="ghost" size="sm" className="text-foreground/80 hover:text-foreground/80">
                    新しいクイズを生成
                  </Button>
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-full space-y-4">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[300px]">
                  {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-70">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
                        <Sparkles className="w-6 h-6 text-indigo-400" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground/80">AIに質問してみましょう</p>
                        <p className="text-xs text-foreground/80">この動画の内容について分からないことや、もっと詳しく知りたいことを聞いてください。</p>
                      </div>
                    </div>
                  )}
                  {messages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm relative group ${
                        m.role === 'user' 
                          ? 'bg-indigo-600 text-primary-foreground rounded-er-none' 
                          : 'bg-muted text-foreground border border-border rounded-el-none'
                      }`}>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        {m.role === 'assistant' && (
                          <button 
                            onClick={() => handleSaveNote(`AIの回答: ${m.content.substring(0, 100)}...`)}
                            className="absolute -right-8 top-0 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-foreground/80 hover:text-indigo-400"
                            title="ノートに保存"
                          >
                            <PlusCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted text-foreground border border-border rounded-2xl rounded-el-none px-4 py-3">
                        <div className="flex gap-1">
                          <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                          <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                          <div className="w-1.5 h-1.5 bg-neutral-500 rounded-full animate-bounce" />
                        </div>
                      </div>
                    </div>
                  )}
                  {chatError && (
                    <p className="text-[10px] text-red-500 text-center">{chatError}</p>
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="pt-2 relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="質問を入力..."
                    className="w-full bg-muted/20 border border-border rounded-xl pl-4 pr-12 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="absolute right-2 top-[calc(50%+4px)] -translate-y-1/2 w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-primary-foreground disabled:opacity-30 transition-all hover:bg-indigo-400"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            )}

            {/* Notes Tab */}
            {activeTab === 'notes' && (
              <div className="flex flex-col h-full space-y-4">
                {/* Note Input */}
                <div className="space-y-3">
                  <div className="relative">
                    <textarea
                      value={noteInput}
                      onChange={(e) => setNoteInput(e.target.value)}
                      placeholder="今のシーンについてメモを残す..."
                      className="w-full bg-muted/20 border border-border rounded-xl p-4 pr-12 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all min-h-[100px] resize-none shadow-inner"
                    />
                    <button
                      onClick={() => handleSaveNote()}
                      disabled={!noteInput.trim() || isSavingNote}
                      className="absolute right-3 bottom-3 w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-primary-foreground disabled:opacity-30 transition-all hover:bg-indigo-400 shadow-lg"
                    >
                      {isSavingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-5 h-5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2 text-[10px] text-foreground/80">
                      <History className="w-3 h-3" />
                      <span>現在の再生位置: {player ? formatTime(Math.floor(player.getCurrentTime())) : '--:--'}</span>
                    </div>
                  </div>
                </div>

                {/* Notes Lise */}
                <div className="flex-1 overflow-y-auto space-y-3 pr-1 min-h-[250px]">
                  {notes.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4 opacity-70">
                      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border border-border">
                        <PencilLine className="w-6 h-6 text-foreground/80" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-foreground/80">メモはまだありません</p>
                        <p className="text-xs text-foreground/80">学習中に気付いたことや、後で見返したいシーンのメモを残しましょう。</p>
                      </div>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div key={note.id} className="group bg-muted/40 border border-border/50 rounded-xl p-3 hover:bg-muted/60 transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <button 
                            onClick={() => handleSeekTo(note.timestamp)}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 transition-colors text-xs font-mono font-bold"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            {formatTime(note.timestamp)}
                          </button>
                          <button 
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1 text-muted-foreground hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="mt-2 text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                        <p className="mt-1 text-[9px] text-muted-foreground text-right">{new Date(note.created_at).toLocaleString()}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
