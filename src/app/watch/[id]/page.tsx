"use client";

import { use, useState, useEffect, useCallback, Suspense } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Heart,
  FolderOpen,
  Sparkles,
  BookOpen,
  MessageCircle,
  PencilLine,
  Loader2,
} from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Hooks
import { useVideoPlayer } from "@/hooks/useVideoPlayer";
import { useWatchAI } from "@/hooks/useWatchAI";
import { useWatchNotes } from "@/hooks/useWatchNotes";

// Components
import { VideoPlayer } from "@/components/watch/VideoPlayer";
import { AISummaryPanel } from "@/components/watch/AISummaryPanel";
import { QuizTab } from "@/components/watch/QuizTab";
import { ChatTab } from "@/components/watch/ChatTab";
import { NotesTab } from "@/components/watch/NotesTab";

// Lib
import {
  addToHistory,
  addFavorite,
  removeFavorite,
  isFavorite,
  getCategories,
} from "@/lib/storage";
import { saveLog } from "@/lib/stacklog-store";

function WatchContent({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = use(params);
  const searchProps = use(searchParams);
  const router = useRouter();

  const isPlaylist = searchProps.isPlaylist === "true";
  const title =
    typeof searchProps.title === "string"
      ? decodeURIComponent(searchProps.title)
      : "";
  const channel =
    typeof searchProps.channel === "string"
      ? decodeURIComponent(searchProps.channel)
      : "";
  const thumb =
    typeof searchProps.thumb === "string"
      ? decodeURIComponent(searchProps.thumb)
      : "";
  const playerElementId = `youtube-player-${id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const [isFav, setIsFav] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  // 1. Study Logging Logic (callback for hook)
  const saveStudyLog = useCallback(
    async (seconds: number) => {
      if (seconds < 30) return false;
      const minutes = Math.round(seconds / 60);
      if (minutes === 0) return false;

      try {
        const now = new Date();
        await saveLog({
          id: crypto.randomUUID(),
          date: now.toISOString().split("T")[0],
          did: `動画視聴: ${title || "Untitled Video"}`,
          learned: isPlaylist ? "再生リスト視聴ログ" : "動画視聴ログ",
          minutes,
          category: isFav && categories.length > 0 ? categories[0] : "その他",
          tags: ["YouTube", isPlaylist ? "playlist" : "video"],
          createdAt: now.toISOString(),
        });
        return true;
      } catch (err) {
        const details =
          err && typeof err === "object"
            ? JSON.parse(JSON.stringify(err))
            : err;
        console.error("Failed to save study log:", details);
        return false;
      }
    },
    [title, isFav, categories, isPlaylist],
  );

  // 2. Custom Hooks
  const {
    playerState,
    isReady,
    isPlaylistJumping,
    savedPlaylistIdx,
    currentPlaylistVideoId,
    hasUserPlayed,
    seekTo,
    playVideo,
    getCurrentTime,
  } = useVideoPlayer({
    videoId: id,
    playerElementId,
    isPlaylist,
    onStudyLogReady: saveStudyLog,
  });

  const aiTargetVideoId = isPlaylist ? (currentPlaylistVideoId ?? "") : id;

  const {
    activeTab,
    setActiveTab,
    aiLoading,
    aiError,
    aiStatus,
    summaryMode,
    currentAIData,
    aiQuota,
    quotaNotice,
    isQuotaDialogOpen,
    setIsQuotaDialogOpen,
    quizAnswers,
    quizRevealed,
    messages,
    chatInput,
    setChatInput,
    isChatLoading,
    chatError,
    chatEndRef,
    handleModeChange,
    generateAI,
    handleQuizAnswer,
    handleSendMessage,
  } = useWatchAI({ videoId: aiTargetVideoId, title, isPlaylist });

  const {
    notes,
    folders,
    selectedFolder,
    setSelectedFolder,
    newFolderName,
    setNewFolderName,
    noteInput,
    setNoteInput,
    linkLabelInput,
    setLinkLabelInput,
    isSavingNote,
    handleSaveNote,
    handleDeleteNote,
    handleAddFolder,
    handleMoveNoteToFolder,
    handleUpdateNote,
  } = useWatchNotes({ videoId: id });

  // 3. Effects & State Sync
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

  const handleFavToggle = () => {
    if (isFav) {
      removeFavorite(id);
      setIsFav(false);
      setShowCategoryPicker(false);
    } else {
      setShowCategoryPicker(!showCategoryPicker);
    }
  };

  const handleSelectCategory = (cat: string) => {
    addFavorite(
      {
        id,
        title,
        channelTitle: channel,
        thumbnailUrl: thumb,
        isPlaylist,
        savedAt: Date.now(),
      },
      cat,
    );
    setIsFav(true);
    setShowCategoryPicker(false);
  };

  const handleBackToPrevious = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0)
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const embedSrc = isPlaylist
    ? `https://www.youtube-nocookie.com/embed?listType=playlist&list=${id}&rel=0&modestbranding=1&fs=1${savedPlaylistIdx > 0 ? `&index=${savedPlaylistIdx + 1}` : ""}`
    : `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&fs=1`;

  const formattedResetAt =
    quotaNotice?.quota?.resetAt &&
    new Intl.DateTimeFormat("ja-JP", {
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(new Date(quotaNotice.quota.resetAt));

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header Bar */}
      <header className="h-16 border-b border-white/5 bg-background/60 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-white hover:bg-white/5 h-10 rounded-xl px-3 group transition-all"
            onClick={handleBackToPrevious}
          >
            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline font-bold text-sm">
              ホームに戻る
            </span>
          </Button>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          <div className="font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 text-xl drop-shadow-sm select-none">
            LEATO
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Button
              variant="ghost"
              onClick={handleFavToggle}
              className={`h-10 rounded-xl transition-all font-bold px-4 ${isFav ? "bg-pink-500/10 text-pink-500 hover:text-pink-400 hover:bg-pink-500/20" : "text-muted-foreground hover:text-pink-400 hover:bg-pink-500/10"}`}
            >
              <Heart
                className={`w-4 h-4 mr-2 transition-transform duration-300 ${isFav ? "fill-current scale-110" : "scale-100"}`}
              />
              <span className="text-sm">
                {isFav ? "お気に入り済み" : "お気に入り"}
              </span>
            </Button>

            {showCategoryPicker && (
              <div className="absolute top-full right-0 mt-3 z-50 bg-card/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-2 min-w-[220px] max-h-[70vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-2 px-3 py-1">
                  保存先カテゴリー
                </p>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleSelectCategory(cat)}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-xl hover:bg-indigo-500/10 hover:text-indigo-400 text-foreground flex items-center gap-2.5 transition-colors font-medium border border-transparent hover:border-indigo-500/20"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span className="truncate">{cat}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col lg:flex-row gap-6 lg:gap-8 overflow-hidden items-start">
        {/* Left: Player Section */}
        <div className="flex-1 min-w-0 w-full space-y-4">
          <VideoPlayer
            playerElementId={playerElementId}
            isPlaylist={isPlaylist}
            embedSrc={embedSrc}
            isReady={isReady}
            playerState={playerState}
            isPlaylistJumping={isPlaylistJumping}
            savedPlaylistIdx={savedPlaylistIdx}
            hasUserPlayed={hasUserPlayed}
            onOverlayClick={playVideo}
            title={title}
            channel={channel}
          />
        </div>

        {/* Right: AI & Tools Section */}
        <div className="w-full lg:w-[420px] xl:w-[460px] shrink-0">
          <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-white/10 flex flex-col overflow-hidden shadow-[0_8px_40px_rgb(0,0,0,0.12)] h-[calc(100vh-120px)] min-h-[600px] sticky top-24 relative">
            {/* Branded Tab Header */}
            <div className="px-6 py-4 bg-transparent border-b border-white/5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-black uppercase tracking-widest text-foreground drop-shadow-sm">
                  Learning Space
                </span>
              </div>
            </div>

            {/* Tab Navigation */}
            <nav className="flex border-b border-white/5 bg-black/20 shrink-0 p-1.5 gap-1 mx-3 mt-3 rounded-2xl">
              {(
                [
                  { id: "summary", icon: Sparkles, label: "要約" },
                  { id: "quiz", icon: BookOpen, label: "クイズ" },
                  { id: "chat", icon: MessageCircle, label: "チャット" },
                  { id: "notes", icon: PencilLine, label: "メモ" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 py-3 px-2 text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all rounded-xl relative overflow-hidden ${
                    activeTab === tab.id
                      ? "text-white bg-indigo-500 shadow-md shadow-indigo-500/20 scale-100"
                      : "text-muted-foreground hover:text-white hover:bg-white/5 scale-95 hover:scale-100"
                  }`}
                >
                  {activeTab === tab.id && (
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500 to-purple-500 opacity-80" />
                  )}
                  <tab.icon className="w-4 h-4 relative z-10" />
                  <span className="text-[10px] sm:text-xs relative z-10">
                    {tab.label}
                  </span>
                </button>
              ))}
            </nav>

            {/* Scrollable Content Area */}
            <div
              className={`flex-1 min-h-0 flex flex-col p-5 scrollbar-hide ${activeTab === "notes" ? "overflow-hidden" : "overflow-y-auto"}`}
            >
              <AISummaryPanel
                activeTab={activeTab}
                summaryMode={summaryMode}
                onModeChange={handleModeChange}
                currentAIData={currentAIData}
                aiLoading={aiLoading}
                aiError={aiError}
                aiStatus={aiStatus}
                onGenerate={() => generateAI()}
              />
              <QuizTab
                activeTab={activeTab}
                currentAIData={currentAIData}
                quizAnswers={quizAnswers}
                quizRevealed={quizRevealed}
                onAnswer={handleQuizAnswer}
              />
              <ChatTab
                activeTab={activeTab}
                messages={messages}
                chatInput={chatInput}
                setChatInput={setChatInput}
                isChatLoading={isChatLoading}
                chatError={chatError}
                chatEndRef={chatEndRef}
                onSendMessage={handleSendMessage}
              />
              <NotesTab
                activeTab={activeTab}
                notes={notes}
                folders={folders}
                selectedFolder={selectedFolder}
                setSelectedFolder={setSelectedFolder}
                newFolderName={newFolderName}
                setNewFolderName={setNewFolderName}
                noteInput={noteInput}
                setNoteInput={setNoteInput}
                linkLabelInput={linkLabelInput}
                setLinkLabelInput={setLinkLabelInput}
                isSavingNote={isSavingNote}
                onSaveNote={handleSaveNote}
                onDeleteNote={handleDeleteNote}
                onUpdateNote={handleUpdateNote}
                onAddFolder={handleAddFolder}
                onMoveFolder={handleMoveNoteToFolder}
                onSeekTo={seekTo}
                currentVideoId={id}
                onOpenVideo={(targetVideoId) =>
                  router.push(`/watch/${targetVideoId}`)
                }
                getCurrentTime={getCurrentTime}
                formatTime={formatTime}
              />
            </div>
          </div>
        </div>
      </main>

      <Dialog open={isQuotaDialogOpen} onOpenChange={setIsQuotaDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border border-indigo-500/20 bg-background/95 backdrop-blur-xl">
          <DialogHeader className="text-left">
            <DialogTitle className="text-xl font-black tracking-tight">
              本日の無料枠に達しました
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-muted-foreground">
              {quotaNotice?.error || "AI利用回数の上限に達しました。"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-card/50 p-4 text-sm">
            <p className="font-semibold text-foreground">
              今日の利用状況: {quotaNotice?.quota?.used ?? aiQuota?.used ?? 0}/
              {quotaNotice?.quota?.limit ?? aiQuota?.limit ?? 10}
            </p>
            <p className="text-muted-foreground">
              残り回数: {quotaNotice?.quota?.remaining ?? aiQuota?.remaining ?? 0}
            </p>
            <p className="text-muted-foreground">
              次回リセット: {formattedResetAt || "UTC 00:00"}
            </p>
            <p className="text-xs text-muted-foreground/80">
              {quotaNotice?.upgradeHint ||
                "将来ここにプラン案内リンクを表示できるようにしています。"}
            </p>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="outline" disabled>
              プランを見る
            </Button>
            <Button onClick={() => setIsQuotaDialogOpen(false)}>
              閉じる
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <WatchContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
