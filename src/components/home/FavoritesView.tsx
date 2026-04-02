"use client";

import { useState } from "react";
import { FolderOpen, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SavedVideo } from "@/lib/storage";
import { SearchResultItem } from "@/hooks/useNGFilter";
import { VideoGrid } from "./VideoGrid";

type FavoritesViewProps = {
  favorites: SavedVideo[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  handleAddCategory: () => void;
  handleRemoveCategory: (cat: string) => void;
  // Handlers needed for VideoGrid
  isFavorite: (id: string) => boolean;
  favPickerOpenFor: string | null;
  setFavPickerOpenFor: (id: string | null) => void;
  handleSelectCategory: (video: SearchResultItem, cat: string) => void;
  handleRemoveFavorite: (id: string) => void;
  handleBlockChannelInline: (e: React.MouseEvent, channel: string) => void;
  urlInput: string;
  setUrlInput: (value: string) => void;
  urlCategory: string;
  setUrlCategory: (value: string) => void;
  isUrlAdding: boolean;
  handleAddFromUrl: (e: React.FormEvent) => void;
};

export function FavoritesView({
  favorites,
  categories,
  selectedCategory,
  setSelectedCategory,
  newCategoryName,
  setNewCategoryName,
  handleAddCategory,
  handleRemoveCategory,
  isFavorite,
  favPickerOpenFor,
  setFavPickerOpenFor,
  handleSelectCategory,
  handleRemoveFavorite,
  handleBlockChannelInline,
  urlInput,
  setUrlInput,
  urlCategory,
  setUrlCategory,
  isUrlAdding,
  handleAddFromUrl,
}: FavoritesViewProps) {
  const filteredFavorites =
    selectedCategory === "all"
      ? favorites
      : favorites.filter((f) => f.category === selectedCategory);

  // Convert SavedVideo to SearchResultItem for VideoGrid
  const resultItems: SearchResultItem[] = filteredFavorites.map((f) => ({
    id: {
      kind: "youtube#video",
      videoId: f.isPlaylist ? undefined : f.id,
      playlistId: f.isPlaylist ? f.id : undefined,
    },
    snippet: {
      title: f.title,
      channelTitle: f.channelTitle,
      thumbnails: {
        medium: { url: f.thumbnailUrl },
      },
    },
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setSelectedCategory("all")}
          className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-2 ${
            selectedCategory === "all"
              ? "bg-indigo-600 border-indigo-500 text-white"
              : "bg-card border-border text-muted-foreground hover:border-indigo-500/50"
          }`}
        >
          すべて ({favorites.length})
        </button>
        {categories.map((cat) => (
          <div key={cat} className="group relative">
            <button
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all border-2 flex items-center gap-2 ${
                selectedCategory === cat
                  ? "bg-indigo-600 border-indigo-500 text-white"
                  : "bg-card border-border text-muted-foreground hover:border-indigo-500/50"
              }`}
            >
              <FolderOpen className="w-3 h-3 opacity-60" />
              {cat} ({favorites.filter((f) => f.category === cat).length})
            </button>
            {cat !== "一般" && (
              <button
                onClick={() => handleRemoveCategory(cat)}
                className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2 h-2" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Add Category */}
      <div className="flex gap-2 max-w-sm">
        <Input
          placeholder="新しいカテゴリー名..."
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          className="h-9 bg-card border-border text-xs rounded-xl"
        />
        <Button
          size="sm"
          onClick={handleAddCategory}
          className="bg-indigo-600 hover:bg-indigo-500 rounded-xl h-9"
        >
          <Plus className="w-4 h-4 mr-1" /> 追加
        </Button>
      </div>

      {/* URL Import (moved from video section) */}
      <div className="max-w-3xl">
        <form
          onSubmit={handleAddFromUrl}
          className="flex flex-col sm:flex-row sm:items-center gap-2 bg-card/30 backdrop-blur-xl border-2 border-white/10 rounded-2xl px-3 py-2"
        >
          <select
            value={urlCategory}
            onChange={(e) => setUrlCategory(e.target.value)}
            className="h-9 sm:w-44 bg-card/60 border border-border rounded-xl text-xs px-2"
          >
            <option value="auto">現在のカテゴリー</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <Input
            placeholder="YouTube URLを貼り付けてお気に入りに追加"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 h-9 bg-transparent border-0 outline-none shadow-none focus-visible:ring-0 text-sm px-1"
          />
          <Button
            type="submit"
            disabled={isUrlAdding}
            className="h-9 px-4 rounded-xl text-xs font-black"
          >
            {isUrlAdding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                URL追加
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Grid */}
      <VideoGrid
        videos={resultItems}
        searchType="favorites"
        loading={false}
        error=""
        lastBlockedChannel={null}
        handleUndoBlock={() => {}}
        handleDismissUndo={() => {}}
        handleBlockChannelInline={handleBlockChannelInline}
        isFavorite={isFavorite}
        favPickerOpenFor={favPickerOpenFor}
        setFavPickerOpenFor={setFavPickerOpenFor}
        categories={categories}
        handleSelectCategory={handleSelectCategory}
        handleRemoveFavorite={handleRemoveFavorite}
        handleRemoveFromHistory={() => {}}
      />
    </div>
  );
}

// Minimal X icon for category delete
function X({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={3}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}
