'use client';

import Link from 'next/link';
import { Ban, Heart, Clock, Loader2, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { SearchResultItem } from '@/hooks/useNGFilter';
import { SavedVideo } from '@/lib/storage';

type VideoGridProps = {
  videos: SearchResultItem[];
  searchType: 'video' | 'playlist' | 'favorites' | 'history';
  loading: boolean;
  error: string;
  lastBlockedChannel: string | null;
  handleUndoBlock: () => void;
  handleDismissUndo: () => void;
  handleBlockChannelInline: (e: React.MouseEvent, channel: string) => void;
  isFavorite: (id: string) => boolean;
  favPickerOpenFor: string | null;
  setFavPickerOpenFor: (id: string | null) => void;
  categories: string[];
  handleSelectCategory: (video: SearchResultItem, cat: string) => void;
  handleRemoveFavorite: (id: string) => void;
  handleRemoveFromHistory: (id: string) => void;
};

export function VideoGrid({
  videos,
  searchType,
  loading,
  error,
  lastBlockedChannel,
  handleUndoBlock,
  handleDismissUndo,
  handleBlockChannelInline,
  isFavorite,
  favPickerOpenFor,
  setFavPickerOpenFor,
  categories,
  handleSelectCategory,
  handleRemoveFavorite,
  handleRemoveFromHistory,
}: VideoGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="aspect-video w-full rounded-2xl bg-muted/50" />
            <Skeleton className="h-4 w-3/4 bg-muted/50" />
            <Skeleton className="h-4 w-1/2 bg-muted/50" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border/50 animate-in zoom-in duration-300">
        <Ban className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Undo Block Banner */}
      {lastBlockedChannel && (
        <div className="bg-indigo-600/10 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between animate-in slide-in-from-top duration-300">
          <p className="text-sm text-indigo-300 flex items-center gap-2">
            <Ban className="w-4 h-4" /> チャンネル 「<strong>{lastBlockedChannel}</strong>」 を非表示にしました。
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-indigo-400 hover:text-indigo-300" onClick={handleUndoBlock}>元に戻す</Button>
            <Button size="sm" variant="ghost" onClick={handleDismissUndo}>閉じる</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const videoId = video.id.videoId || video.id.playlistId || '';
          const isPlaylist = !!video.id.playlistId;
          const isFav = isFavorite(videoId);

          return (
            <Card key={videoId} className="group overflow-hidden border-border border-2 rounded-2xl bg-card hover:bg-neutral-800/40 hover:border-indigo-500/50 transition-all shadow-lg hover:shadow-indigo-500/10">
              <Link 
                href={`/watch/${videoId}?title=${encodeURIComponent(video.snippet.title)}&channel=${encodeURIComponent(video.snippet.channelTitle)}&thumb=${encodeURIComponent(video.snippet.thumbnails.medium.url)}${isPlaylist ? '&isPlaylist=true' : ''}`}
                className="block"
              >
                <div className="relative aspect-video overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={video.snippet.thumbnails.medium.url}
                    alt={video.snippet.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {isPlaylist && (
                    <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1.5 border border-white/10 uppercase tracking-widest text-white">
                      <Clock className="w-3 h-3" /> Playlist
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <span className="text-white text-xs font-bold tracking-wider uppercase">視聴を開始 <span className="ml-1 inline-block transform translate-x-0 group-hover:translate-x-1 transition-transform">→</span></span>
                  </div>
                </div>
              </Link>
              <CardContent className="p-4 space-y-3 relative">
                <div className="space-y-1 pr-8">
                  <h3 className="font-bold text-sm line-clamp-2 leading-tight group-hover:text-indigo-400 transition-colors">
                    {video.snippet.title}
                  </h3>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-semibold">
                    {video.snippet.channelTitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {/* Block Channel Inline */}
                  <button
                    onClick={(e) => handleBlockChannelInline(e, video.snippet.channelTitle)}
                    className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
                    title="このチャンネルを非表示"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                  
                  {/* Favorite Toggle */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (isFav) {
                          handleRemoveFavorite(videoId);
                        } else {
                          setFavPickerOpenFor(favPickerOpenFor === videoId ? null : videoId);
                        }
                      }}
                      className={`p-2 rounded-xl transition-all border ${
                        isFav 
                          ? 'bg-pink-500/10 text-pink-500 border-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.1)]' 
                          : 'bg-muted/50 text-muted-foreground hover:bg-pink-500/10 hover:text-pink-400 border-transparent hover:border-pink-500/20'
                      }`}
                      title={isFav ? "お気に入り解除" : "お気に入りに追加"}
                    >
                      <Heart className={`w-4 h-4 ${isFav ? 'fill-current' : ''}`} />
                    </button>

                    {favPickerOpenFor === videoId && (
                      <div className="absolute bottom-full left-0 mb-2 z-30 bg-card border border-border rounded-2xl shadow-2xl p-2 min-w-[200px] animate-in slide-in-from-bottom-2 duration-200">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground mb-2 px-2 tracking-widest">保存先を選択</p>
                        <div className="max-h-48 overflow-y-auto space-y-0.5">
                          {categories.map(cat => (
                            <button
                              key={cat}
                              onClick={() => {
                                handleSelectCategory(video, cat);
                                setFavPickerOpenFor(null);
                              }}
                              className="w-full text-left text-xs px-3 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-2"
                            >
                              <FolderOpen className="w-3 h-3 opacity-60" /> {cat}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* History Remove - only show in history mode */}
                  {searchType === 'history' && (
                    <button
                      onClick={(e) => { e.preventDefault(); handleRemoveFromHistory(videoId); }}
                      className="p-2 rounded-xl bg-muted/50 text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20 ml-auto"
                      title="履歴から削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {videos.length === 0 && !loading && !error && (
        <div className="text-center py-20 bg-card rounded-3xl border border-dashed border-border/50">
          <p className="text-muted-foreground">動画が見つかりませんでした。</p>
        </div>
      )}
    </div>
  );
}
