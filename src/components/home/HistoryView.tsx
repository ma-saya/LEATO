'use client';

import { Clock, Trash2 } from 'lucide-react';
import { SavedVideo } from '@/lib/storage';
import { SearchResultItem } from '@/hooks/useNGFilter';
import { VideoGrid } from './VideoGrid';

type HistoryViewProps = {
  history: SavedVideo[];
  // Handlers needed for VideoGrid
  isFavorite: (id: string) => boolean;
  favPickerOpenFor: string | null;
  setFavPickerOpenFor: (id: string | null) => void;
  categories: string[];
  handleSelectCategory: (video: SearchResultItem, cat: string) => void;
  handleRemoveFavorite: (id: string) => void;
  handleRemoveFromHistory: (id: string) => void;
  handleBlockChannelInline: (e: React.MouseEvent, channel: string) => void;
};

export function HistoryView({
  history,
  isFavorite,
  favPickerOpenFor,
  setFavPickerOpenFor,
  categories,
  handleSelectCategory,
  handleRemoveFavorite,
  handleRemoveFromHistory,
  handleBlockChannelInline,
}: HistoryViewProps) {
  // Convert SavedVideo to SearchResultItem for VideoGrid
  const resultItems: SearchResultItem[] = history.map(f => ({
    id: { kind: 'youtube#video', videoId: f.isPlaylist ? undefined : f.id, playlistId: f.isPlaylist ? f.id : undefined },
    snippet: {
      title: f.title,
      channelTitle: f.channelTitle,
      thumbnails: {
        medium: { url: f.thumbnailUrl }
      }
    }
  }));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-2 px-1">
        <Clock className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">視聴履歴 ({history.length})</h2>
      </div>

      <VideoGrid 
        videos={resultItems}
        searchType="history"
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
        handleRemoveFromHistory={handleRemoveFromHistory}
      />
    </div>
  );
}
