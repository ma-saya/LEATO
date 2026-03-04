// Shared types and localStorage helpers for favorites & history
// Category paths use "/" separator for hierarchy, e.g. "React/Hooks"

export type SavedVideo = {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string;
  isPlaylist: boolean;
  savedAt: number; // timestamp
  category?: string; // path like "React" or "React/Hooks"
};

const FAVORITES_KEY = 'leato_favorites';
const HISTORY_KEY = 'leato_history';
const CATEGORIES_KEY = 'leato_categories';
const MAX_HISTORY = 30;
const DEFAULT_CATEGORY = '未分類';

// --- Categories (stored as flat path strings, hierarchy derived from "/") ---

export function getCategories(): string[] {
  if (typeof window === 'undefined') return [DEFAULT_CATEGORY];
  const raw = localStorage.getItem(CATEGORIES_KEY);
  const cats: string[] = raw ? JSON.parse(raw) : [];
  if (!cats.includes(DEFAULT_CATEGORY)) cats.unshift(DEFAULT_CATEGORY);
  return cats;
}

/** Get only top-level categories */
export function getTopLevelCategories(): string[] {
  return getCategories().filter(c => !c.includes('/'));
}

/** Get direct children folders of a parent path */
export function getSubfolders(parentPath: string): string[] {
  const prefix = parentPath + '/';
  return getCategories()
    .filter(c => c.startsWith(prefix))
    .map(c => c.slice(prefix.length))
    .filter(c => !c.includes('/')) // only direct children
    .filter(c => c.length > 0);
}

export function addCategory(name: string): string[] {
  const cats = getCategories();
  const trimmed = name.trim();
  if (!trimmed || cats.includes(trimmed)) return cats;
  const updated = [...cats, trimmed];
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
  return updated;
}

/** Add a subfolder under a parent category */
export function addSubfolder(parentPath: string, folderName: string): string[] {
  const fullPath = parentPath + '/' + folderName.trim();
  return addCategory(fullPath);
}

export function removeCategory(name: string): string[] {
  if (name === DEFAULT_CATEGORY) return getCategories();
  // Remove this category AND all its children
  const updated = getCategories().filter(c => c !== name && !c.startsWith(name + '/'));
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
  // Move orphaned favorites to default
  const favs = getFavorites().map(v => {
    if (v.category === name || (v.category && v.category.startsWith(name + '/'))) {
      return { ...v, category: DEFAULT_CATEGORY };
    }
    return v;
  });
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return updated;
}

export function renameCategory(oldName: string, newName: string): string[] {
  if (oldName === DEFAULT_CATEGORY) return getCategories();
  const trimmed = newName.trim();
  if (!trimmed) return getCategories();
  // Rename this and all children
  const cats = getCategories().map(c => {
    if (c === oldName) return trimmed;
    if (c.startsWith(oldName + '/')) return trimmed + c.slice(oldName.length);
    return c;
  });
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  const favs = getFavorites().map(v => {
    if (v.category === oldName) return { ...v, category: trimmed };
    if (v.category && v.category.startsWith(oldName + '/')) return { ...v, category: trimmed + v.category.slice(oldName.length) };
    return v;
  });
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return cats;
}

export { DEFAULT_CATEGORY };

// --- Favorites ---

export function getFavorites(): SavedVideo[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(FAVORITES_KEY);
  const items: SavedVideo[] = raw ? JSON.parse(raw) : [];
  return items.map(v => ({ ...v, category: v.category || DEFAULT_CATEGORY }));
}

export function getFavoritesByCategory(category: string): SavedVideo[] {
  return getFavorites().filter(v => (v.category || DEFAULT_CATEGORY) === category);
}

/** Get favorites in a category INCLUDING all subfolders */
export function getFavoritesInPath(path: string): SavedVideo[] {
  return getFavorites().filter(v => {
    const cat = v.category || DEFAULT_CATEGORY;
    return cat === path || cat.startsWith(path + '/');
  });
}

export function addFavorite(video: SavedVideo, category?: string): SavedVideo[] {
  const list = getFavorites().filter(v => v.id !== video.id);
  const updated = [{ ...video, category: category || DEFAULT_CATEGORY, savedAt: Date.now() }, ...list];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

export function updateFavoriteCategory(id: string, category: string): SavedVideo[] {
  const updated = getFavorites().map(v => v.id === id ? { ...v, category } : v);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFavorite(id: string): SavedVideo[] {
  const updated = getFavorites().filter(v => v.id !== id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

export function isFavorite(id: string): boolean {
  return getFavorites().some(v => v.id === id);
}

// --- History ---

export function getHistory(): SavedVideo[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addToHistory(video: SavedVideo): SavedVideo[] {
  const list = getHistory().filter(v => v.id !== video.id);
  const updated = [{ ...video, savedAt: Date.now() }, ...list].slice(0, MAX_HISTORY);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFromHistory(id: string): SavedVideo[] {
  const updated = getHistory().filter(v => v.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

// --- Playback Progress ---

const PROGRESS_KEY = 'leato_playback_progress';

/**
 * 動画ごとの再生位置（秒数）を保存します
 * @param videoId 保存対象の動画ID
 * @param time 再生位置（秒）
 */
export function savePlaybackProgress(videoId: string, time: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    const progressMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    
    // 5秒未満、または無効な時間の場合は記録しない（最初からになるように）
    if (time < 5 || isNaN(time)) {
      delete progressMap[videoId];
    } else {
      progressMap[videoId] = Math.floor(time);
    }
    
    // 最大保存件数を制限（例：直近100件）して肥大化を防ぐ
    const keys = Object.keys(progressMap);
    if (keys.length > 100) {
      delete progressMap[keys[0]];
    }

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressMap));
  } catch (e) {
    console.error('Failed to save playback progress', e);
  }
}

/**
 * 動画の保存された再生位置（秒数）を取得します
 * @param videoId 取得対象の動画ID
 * @returns 保存された再生位置（秒）。保存されていない場合は0
 */
export function getPlaybackProgress(videoId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return 0;
    const progressMap: Record<string, number> = JSON.parse(raw);
    return progressMap[videoId] || 0;
  } catch (e) {
    console.error('Failed to get playback progress', e);
    return 0;
  }
}

// --- Playlist Index Progress ---

const PLAYLIST_INDEX_KEY = 'leato_playlist_index';

/**
 * 再生リストごとの現在再生中のインデックスを保存します
 * @param playlistId プレイリストのID
 * @param index 現在のインデックス番号
 */
export function savePlaylistIndex(playlistId: string, index: number): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(PLAYLIST_INDEX_KEY);
    const indexMap: Record<string, number> = raw ? JSON.parse(raw) : {};
    
    // インデックスが0（最初）の場合や途中の場合も保存
    indexMap[playlistId] = index;
    
    // 最大保存件数を制限して肥大化を防ぐ
    const keys = Object.keys(indexMap);
    if (keys.length > 100) {
      delete indexMap[keys[0]];
    }

    localStorage.setItem(PLAYLIST_INDEX_KEY, JSON.stringify(indexMap));
  } catch (e) {
    console.error('Failed to save playlist index', e);
  }
}

/**
 * プレイリストの保存されたインデックスを取得します
 * @param playlistId プレイリストのID
 * @returns 保存されたインデックス（未保存なら0）
 */
export function getPlaylistIndex(playlistId: string): number {
  if (typeof window === 'undefined') return 0;
  try {
    const raw = localStorage.getItem(PLAYLIST_INDEX_KEY);
    if (!raw) return 0;
    const indexMap: Record<string, number> = JSON.parse(raw);
    return indexMap[playlistId] || 0;
  } catch (e) {
    return 0;
  }
}
