"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Loader2,
  Plus,
  LogIn,
  User,
  LogOut,
  BookOpen,
  Flame,
  Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

// Hooks
import { useAuth } from "@/hooks/useAuth";
import { useNGFilter } from "@/hooks/useNGFilter";
import { useYouTubeSearch } from "@/hooks/useYouTubeSearch";
import { useStackLog } from "@/hooks/useStackLog";
import { useLocalStorageData } from "@/hooks/useLocalStorageData";

// Components
import { SearchBar } from "@/components/home/SearchBar";
import { VideoGrid } from "@/components/home/VideoGrid";
import { NGSettingsDialog } from "@/components/home/NGSettingsDialog";
import { StackLogDrawer } from "@/components/home/StackLogDrawer";
import { FavoritesView } from "@/components/home/FavoritesView";
import { HistoryView } from "@/components/home/HistoryView";
import { NotesView } from "@/components/home/NotesView";
import { TaskActionModal } from "@/components/TaskActionModal";

// Storage Lib
import { DEFAULT_CATEGORY, addFavorite, getFavorites } from "@/lib/storage";

function HomeContent() {
  const urlParams = useSearchParams();
  const { currentUser, handleLogout } = useAuth();
  const {
    ngWords,
    setNgWords,
    ngChannels,
    setNgChannels,
    ngPassword,
    setNgPassword,
    isLocked,
    setIsLocked,
    unlockAttempt,
    setUnlockAttempt,
    newWord,
    setNewWord,
    newChannel,
    setNewChannel,
    isDialogOpen,
    setIsDialogOpen,
    lastBlockedChannel,
    filterVideos,
    handleOpenChange,
    saveSettings,
    handleAddWord,
    handleAddChannel,
    handleBlockChannelInline,
    handleUndoBlock,
    handleDismissUndo,
    handleUnlock,
    generateRandomPassword,
  } = useNGFilter();

  const {
    query,
    setQuery,
    searchType,
    setSearchType,
    loading,
    error,
    setError,
    videos,
    setVideos,
    rawVideos,
    executeSearch,
    handleSearch,
    handleTypeChange,
  } = useYouTubeSearch(ngWords, ngChannels, filterVideos);

  const {
    slLogs,
    slTodos,
    slSettings,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    setModalMode,
    selectedTodo,
    setSelectedTodo,
    loadSlData,
    handleTaskAction,
    handleOpenCompleteModal,
    slStreak,
    slTodayMinutes,
    slDailyGoal,
    slTotalMinutes,
    slSortedLogs,
    slIncompleteTodos,
  } = useStackLog();

  const {
    favorites,
    setFavorites,
    history,
    categories,
    selectedCategory,
    setSelectedCategory,
    newCategoryName,
    setNewCategoryName,
    favPickerOpenFor,
    setFavPickerOpenFor,
    handleAddCategory,
    handleRemoveCategory,
    handleSelectCategory,
    handleRemoveFavorite,
    handleRemoveFromHistory,
    isFavorite,
  } = useLocalStorageData();

  const [isSlDrawerOpen, setIsSlDrawerOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  // URL Import State (kept in page for now as it's small)
  const [urlInput, setUrlInput] = useState("");
  const [urlCategory, setUrlCategory] = useState("auto");
  const [isUrlAdding, setIsUrlAdding] = useState(false);

  useEffect(() => {
    loadSlData();
    setHasMounted(true);

    // Initial search from URL
    const urlQ = urlParams.get("q");
    const urlType = (urlParams.get("type") as any) || "video";
    if (urlQ && (urlType === "video" || urlType === "playlist")) {
      setQuery(urlQ);
      setSearchType(urlType);
      executeSearch(urlType, urlQ);
    } else if (urlType === "favorites" || urlType === "history") {
      setSearchType(urlType);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasMounted) return;
    if (isSlDrawerOpen) {
      loadSlData();
    }
  }, [isSlDrawerOpen, hasMounted, loadSlData]);

  useEffect(() => {
    if (!hasMounted) return;

    const handleFocus = () => loadSlData();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadSlData();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [hasMounted, loadSlData]);

  const handleAddFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isUrlAdding) return;

    setIsUrlAdding(true);
    try {
      let id = "";
      let type: "video" | "playlist" | null = null;
      const urlObj = new URL(urlInput.trim());
      const hostname = urlObj.hostname.toLowerCase();

      if (hostname.includes("youtu.be")) {
        id = urlObj.pathname.slice(1).split("?")[0];
        type = "video";
      } else if (hostname.includes("youtube.com")) {
        const params = new URLSearchParams(urlObj.search);
        if (params.has("list")) {
          id = params.get("list")!;
          type = "playlist";
        } else if (params.has("v")) {
          id = params.get("v")!;
          type = "video";
        } else if (urlObj.pathname.startsWith("/shorts/")) {
          id = urlObj.pathname.split("/shorts/")[1].split("?")[0];
          type = "video";
        }
      }

      if (!id || !type)
        throw new Error(
          "有効なYouTubeの動画または再生リストのURLではありません。",
        );

      const res = await fetch(`/api/youtube/details?id=${id}&type=${type}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "情報の取得に失敗しました。");

      const categoryToSave =
        urlCategory === "auto"
          ? selectedCategory === "all"
            ? DEFAULT_CATEGORY
            : selectedCategory
          : urlCategory;

      addFavorite(
        {
          id: data.id,
          title: data.title,
          channelTitle: data.channelTitle,
          thumbnailUrl: data.thumbnailUrl,
          isPlaylist: data.isPlaylist,
          savedAt: Date.now(),
        },
        categoryToSave,
      );

      setFavorites(getFavorites());
      setUrlInput("");
    } catch (err: any) {
      window.alert(err.message || "エラーが発生しました");
    } finally {
      setIsUrlAdding(false);
    }
  };

  if (!hasMounted) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8">
          <div className="space-y-4 text-center md:text-left">
            <h1 className="text-6xl md:text-8xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-600 pb-1 drop-shadow-sm">
              LEATO
            </h1>
            <p className="text-muted-foreground text-xs font-black uppercase tracking-[0.4em] opacity-70">
              YouTube Learning Experience Accelerator
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-end gap-3 pb-2">
            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-muted-foreground bg-card/40 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span className="max-w-[150px] truncate">
                    {currentUser.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 h-10 w-10 rounded-xl transition-all"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 h-10 px-4 rounded-xl border border-white/10 bg-card/40 backdrop-blur-md hover:bg-indigo-500/10 text-muted-foreground hover:text-white text-sm font-bold transition-all"
              >
                <LogIn className="w-4 h-4" />
                <span>ログイン</span>
              </Link>
            )}

            <Button
              variant="outline"
              onClick={() => setIsSlDrawerOpen(true)}
              className="bg-indigo-600/10 border-indigo-500/30 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 gap-2 h-10 px-4 rounded-xl shadow-lg shadow-indigo-500/10 transition-all font-bold"
            >
              <BookOpen className="w-4 h-4" />
              <span className="text-sm">StackLog</span>
              {slStreak > 0 && (
                <span className="text-[10px] bg-orange-500 text-white rounded-full px-2 py-0.5 font-black flex items-center gap-1">
                  <Flame className="h-3 w-3" />
                  {slStreak}
                </span>
              )}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDialogOpen(true)}
              className="bg-card/40 backdrop-blur-md border-white/10 hover:bg-white/5 text-muted-foreground h-10 w-10 rounded-xl transition-all"
            >
              <Settings2 className="w-4 h-4" />
            </Button>
          </div>
        </header>

        {/* Search Bar Component */}
        <SearchBar
          query={query}
          setQuery={setQuery}
          searchType={searchType}
          handleSearch={handleSearch}
          handleTypeChange={handleTypeChange}
          loading={loading}
        />

        {/* Main Content Area */}
        <div className="space-y-12">
          {searchType === "favorites" ? (
            <FavoritesView
              favorites={favorites}
              categories={categories}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              newCategoryName={newCategoryName}
              setNewCategoryName={setNewCategoryName}
              handleAddCategory={handleAddCategory}
              handleRemoveCategory={handleRemoveCategory}
              isFavorite={isFavorite}
              favPickerOpenFor={favPickerOpenFor}
              setFavPickerOpenFor={setFavPickerOpenFor}
              handleSelectCategory={handleSelectCategory}
              handleRemoveFavorite={handleRemoveFavorite}
              handleBlockChannelInline={(e, channel) =>
                handleBlockChannelInline(channel, rawVideos, setVideos)
              }
              urlInput={urlInput}
              setUrlInput={setUrlInput}
              urlCategory={urlCategory}
              setUrlCategory={setUrlCategory}
              isUrlAdding={isUrlAdding}
              handleAddFromUrl={handleAddFromUrl}
            />
          ) : searchType === "notes" ? (
            <NotesView categories={categories} />
          ) : searchType === "history" ? (
            <HistoryView
              history={history}
              isFavorite={isFavorite}
              favPickerOpenFor={favPickerOpenFor}
              setFavPickerOpenFor={setFavPickerOpenFor}
              categories={categories}
              handleSelectCategory={handleSelectCategory}
              handleRemoveFavorite={handleRemoveFavorite}
              handleRemoveFromHistory={handleRemoveFromHistory}
              handleBlockChannelInline={(e, channel) =>
                handleBlockChannelInline(channel, rawVideos, setVideos)
              }
            />
          ) : (
            <>
              <VideoGrid
                videos={videos}
                searchType={searchType}
                loading={loading}
                error={error}
                lastBlockedChannel={lastBlockedChannel}
                handleUndoBlock={() => handleUndoBlock(rawVideos, setVideos)}
                handleDismissUndo={() =>
                  handleDismissUndo(rawVideos, setVideos)
                }
                handleBlockChannelInline={(e, channel) =>
                  handleBlockChannelInline(channel, rawVideos, setVideos)
                }
                isFavorite={isFavorite}
                favPickerOpenFor={favPickerOpenFor}
                setFavPickerOpenFor={setFavPickerOpenFor}
                categories={categories}
                handleSelectCategory={handleSelectCategory}
                handleRemoveFavorite={handleRemoveFavorite}
                handleRemoveFromHistory={handleRemoveFromHistory}
              />
            </>
          )}
        </div>
      </div>

      {/* Modals & Dialogs */}
      <NGSettingsDialog
        isDialogOpen={isDialogOpen}
        setIsDialogOpen={setIsDialogOpen}
        handleOpenChange={handleOpenChange}
        isLocked={isLocked}
        unlockAttempt={unlockAttempt}
        setUnlockAttempt={setUnlockAttempt}
        handleUnlock={handleUnlock}
        ngWords={ngWords}
        setNgWords={setNgWords}
        newWord={newWord}
        setNewWord={setNewWord}
        handleAddWord={handleAddWord}
        ngChannels={ngChannels}
        setNgChannels={setNgChannels}
        newChannel={newChannel}
        setNewChannel={setNewChannel}
        handleAddChannel={handleAddChannel}
        ngPassword={ngPassword}
        setNgPassword={setNgPassword}
        generateRandomPassword={generateRandomPassword}
        saveSettings={() => saveSettings(rawVideos, setVideos)}
      />

      <StackLogDrawer
        isOpen={isSlDrawerOpen}
        setIsOpen={setIsSlDrawerOpen}
        streak={slStreak}
        todayMinutes={slTodayMinutes}
        dailyGoal={slDailyGoal}
        totalMinutes={slTotalMinutes}
        sortedLogs={slSortedLogs}
        incompleteTodos={slIncompleteTodos}
        handleOpenCompleteModal={handleOpenCompleteModal}
        setIsModalOpen={setIsModalOpen}
        setModalMode={setModalMode}
        setSelectedTodo={setSelectedTodo}
      />

      <TaskActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleTaskAction}
        mode={modalMode}
        todo={selectedTodo || undefined}
        categories={categories}
      />
    </main>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
