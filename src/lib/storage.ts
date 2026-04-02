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

const FAVORITES_KEY = "leato_favorites";
const HISTORY_KEY = "leato_history";
const CATEGORIES_KEY = "leato_categories";
const MAX_HISTORY = 30;
const DEFAULT_CATEGORY = "未分類";

// --- Categories (stored as flat path strings, hierarchy derived from "/") ---

export function getCategories(): string[] {
  if (typeof window === "undefined") return [DEFAULT_CATEGORY];
  const raw = localStorage.getItem(CATEGORIES_KEY);
  const cats: string[] = raw ? JSON.parse(raw) : [];
  if (!cats.includes(DEFAULT_CATEGORY)) cats.unshift(DEFAULT_CATEGORY);
  return cats;
}

/** Get only top-level categories */
export function getTopLevelCategories(): string[] {
  return getCategories().filter((c) => !c.includes("/"));
}

/** Get direct children folders of a parent path */
export function getSubfolders(parentPath: string): string[] {
  const prefix = parentPath + "/";
  return getCategories()
    .filter((c) => c.startsWith(prefix))
    .map((c) => c.slice(prefix.length))
    .filter((c) => !c.includes("/")) // only direct children
    .filter((c) => c.length > 0);
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
  const fullPath = parentPath + "/" + folderName.trim();
  return addCategory(fullPath);
}

export function removeCategory(name: string): string[] {
  if (name === DEFAULT_CATEGORY) return getCategories();
  // Remove this category AND all its children
  const updated = getCategories().filter(
    (c) => c !== name && !c.startsWith(name + "/"),
  );
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(updated));
  // Move orphaned favorites to default
  const favs = getFavorites().map((v) => {
    if (
      v.category === name ||
      (v.category && v.category.startsWith(name + "/"))
    ) {
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
  const cats = getCategories().map((c) => {
    if (c === oldName) return trimmed;
    if (c.startsWith(oldName + "/")) return trimmed + c.slice(oldName.length);
    return c;
  });
  localStorage.setItem(CATEGORIES_KEY, JSON.stringify(cats));
  const favs = getFavorites().map((v) => {
    if (v.category === oldName) return { ...v, category: trimmed };
    if (v.category && v.category.startsWith(oldName + "/"))
      return { ...v, category: trimmed + v.category.slice(oldName.length) };
    return v;
  });
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
  return cats;
}

export { DEFAULT_CATEGORY };

// --- Favorites ---

export function getFavorites(): SavedVideo[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(FAVORITES_KEY);
  const items: SavedVideo[] = raw ? JSON.parse(raw) : [];
  return items.map((v) => ({ ...v, category: v.category || DEFAULT_CATEGORY }));
}

export function getFavoritesByCategory(category: string): SavedVideo[] {
  return getFavorites().filter(
    (v) => (v.category || DEFAULT_CATEGORY) === category,
  );
}

/** Get favorites in a category INCLUDING all subfolders */
export function getFavoritesInPath(path: string): SavedVideo[] {
  return getFavorites().filter((v) => {
    const cat = v.category || DEFAULT_CATEGORY;
    return cat === path || cat.startsWith(path + "/");
  });
}

export function addFavorite(
  video: SavedVideo,
  category?: string,
): SavedVideo[] {
  const list = getFavorites().filter((v) => v.id !== video.id);
  const updated = [
    { ...video, category: category || DEFAULT_CATEGORY, savedAt: Date.now() },
    ...list,
  ];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

export function updateFavoriteCategory(
  id: string,
  category: string,
): SavedVideo[] {
  const updated = getFavorites().map((v) =>
    v.id === id ? { ...v, category } : v,
  );
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFavorite(id: string): SavedVideo[] {
  const updated = getFavorites().filter((v) => v.id !== id);
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return updated;
}

export function isFavorite(id: string): boolean {
  return getFavorites().some((v) => v.id === id);
}

// --- History ---

export function getHistory(): SavedVideo[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function addToHistory(video: SavedVideo): SavedVideo[] {
  const list = getHistory().filter((v) => v.id !== video.id);
  const updated = [{ ...video, savedAt: Date.now() }, ...list].slice(
    0,
    MAX_HISTORY,
  );
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFromHistory(id: string): SavedVideo[] {
  const updated = getHistory().filter((v) => v.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}

// --- Notes Snapshot for Home ---

export type HomeQuickNote = {
  id: string;
  videoId: string;
  content: string;
  timestamp: number;
  createdAt: string;
  folder?: string;
  linkLabel?: string;
  videoTitle?: string;
  channelTitle?: string;
  thumbnailUrl?: string;
  isPlaylist?: boolean;
};

export type UnifiedNote = {
  id: string;
  video_id: string;
  content: string;
  timestamp: number;
  created_at: string;
  folder?: string;
  link_label?: string;
  video_title?: string;
  channel_title?: string;
  thumbnail_url?: string;
  is_playlist?: boolean;
};

const GLOBAL_NOTES_KEY = "leato_notes_global";

function readLegacyNotes(): UnifiedNote[] {
  const keys = Object.keys(localStorage).filter(
    (k) => k.startsWith("leato_notes_") && k !== GLOBAL_NOTES_KEY,
  );

  const merged: UnifiedNote[] = [];
  keys.forEach((key) => {
    const fallbackVideoId = key.replace("leato_notes_", "");
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      parsed.forEach((item) => {
        if (!item || typeof item !== "object") return;
        merged.push({
          id: String(item.id || ""),
          video_id: String(item.video_id || fallbackVideoId),
          content: String(item.content || ""),
          timestamp: Number(item.timestamp || 0),
          created_at: String(item.created_at || new Date(0).toISOString()),
          folder: item.folder ? String(item.folder) : undefined,
        });
      });
    } catch {
      // noop
    }
  });

  const byId = new Map<string, UnifiedNote>();
  merged.forEach((note) => {
    if (!note.id) return;
    byId.set(note.id, note);
  });
  return Array.from(byId.values());
}

export function getUnifiedNotes(): UnifiedNote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(GLOBAL_NOTES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as UnifiedNote[];
    }

    const legacy = readLegacyNotes();
    if (legacy.length > 0) {
      localStorage.setItem(GLOBAL_NOTES_KEY, JSON.stringify(legacy));
    }
    return legacy;
  } catch {
    return [];
  }
}

export function saveUnifiedNotes(notes: UnifiedNote[]): UnifiedNote[] {
  if (typeof window === "undefined") return notes;
  localStorage.setItem(GLOBAL_NOTES_KEY, JSON.stringify(notes));
  return notes;
}

export function updateUnifiedNote(
  noteId: string,
  patch: Partial<Pick<UnifiedNote, "content" | "folder" | "link_label">>,
): UnifiedNote[] {
  const updated = getUnifiedNotes().map((note) =>
    note.id === noteId ? { ...note, ...patch } : note,
  );
  return saveUnifiedNotes(updated);
}

export function removeUnifiedNote(noteId: string): UnifiedNote[] {
  const updated = getUnifiedNotes().filter((note) => note.id !== noteId);
  return saveUnifiedNotes(updated);
}

// --- Note Folder Management ---

const NOTE_FOLDERS_KEY = "leato_note_folders_global";

export function getNoteFolders(): string[] {
  if (typeof window === "undefined") return ["\u672a\u5206\u985e"];
  try {
    const raw = localStorage.getItem(NOTE_FOLDERS_KEY);
    if (!raw) return ["\u672a\u5206\u985e"];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return ["\u672a\u5206\u985e"];
    const merged = Array.from(
      new Set(["\u672a\u5206\u985e", ...parsed.filter(Boolean)]),
    ) as string[];
    return merged;
  } catch {
    return ["\u672a\u5206\u985e"];
  }
}

export function saveNoteFolders(folders: string[]): void {
  if (typeof window === "undefined") return;
  const merged = Array.from(
    new Set(["\u672a\u5206\u985e", ...folders.filter(Boolean)]),
  );
  localStorage.setItem(NOTE_FOLDERS_KEY, JSON.stringify(merged));
}

export function addNoteFolder(name: string): string[] {
  const trimmed = name.trim();
  if (!trimmed) return getNoteFolders();
  const folders = getNoteFolders();
  if (folders.includes(trimmed)) return folders;
  const next = [...folders, trimmed];
  saveNoteFolders(next);
  return next;
}

export function renameNoteFolder(oldName: string, newName: string): string[] {
  const trimmed = newName.trim();
  if (!trimmed || oldName === "\u672a\u5206\u985e") return getNoteFolders();
  // rename in folder list
  const folders = getNoteFolders().map((f) => (f === oldName ? trimmed : f));
  saveNoteFolders(folders);
  // rename in all notes
  const notes = getUnifiedNotes().map((note) =>
    (note.folder || "\u672a\u5206\u985e") === oldName
      ? { ...note, folder: trimmed }
      : note,
  );
  saveUnifiedNotes(notes);
  return folders;
}

export function deleteNoteFolder(name: string): string[] {
  if (name === "\u672a\u5206\u985e") return getNoteFolders();
  const folders = getNoteFolders().filter((f) => f !== name);
  saveNoteFolders(folders);
  // move notes to \u672a\u5206\u985e
  const notes = getUnifiedNotes().map((note) =>
    (note.folder || "\u672a\u5206\u985e") === name
      ? { ...note, folder: "\u672a\u5206\u985e" }
      : note,
  );
  saveUnifiedNotes(notes);
  return folders;
}

export function getAllNotesForHome(limit = 12): HomeQuickNote[] {
  if (typeof window === "undefined") return [];

  try {
    const GLOBAL_NOTES_KEY = "leato_notes_global";
    const keys = Object.keys(localStorage).filter((k) =>
      k.startsWith("leato_notes_"),
    );

    const videoMetaMap = new Map<string, SavedVideo>();
    [...getFavorites(), ...getHistory()].forEach((video) => {
      if (!videoMetaMap.has(video.id)) {
        videoMetaMap.set(video.id, video);
      }
    });

    const allNotes: HomeQuickNote[] = [];

    keys.forEach((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) return;

      let parsed: any[] = [];
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = [];
      }
      if (!Array.isArray(parsed)) return;

      if (key === GLOBAL_NOTES_KEY) {
        parsed.forEach((note) => {
          if (!note || typeof note !== "object") return;
          const videoId = String(note.video_id || "");
          if (!videoId) return;
          const meta = videoMetaMap.get(videoId);
          allNotes.push({
            id: String(note.id || ""),
            videoId,
            content: String(note.content || ""),
            timestamp: Number(note.timestamp || 0),
            createdAt: String(note.created_at || new Date(0).toISOString()),
            folder: note.folder ? String(note.folder) : undefined,
            linkLabel: note.link_label ? String(note.link_label) : undefined,
            videoTitle: note.video_title
              ? String(note.video_title)
              : meta?.title,
            channelTitle: note.channel_title
              ? String(note.channel_title)
              : meta?.channelTitle,
            thumbnailUrl: note.thumbnail_url
              ? String(note.thumbnail_url)
              : meta?.thumbnailUrl,
            isPlaylist:
              typeof note.is_playlist === "boolean"
                ? note.is_playlist
                : meta?.isPlaylist,
          });
        });
      } else {
        const videoId = key.replace("leato_notes_", "");
        const meta = videoMetaMap.get(videoId);
        parsed.forEach((note) => {
          if (!note || typeof note !== "object") return;
          allNotes.push({
            id: String(note.id || ""),
            videoId,
            content: String(note.content || ""),
            timestamp: Number(note.timestamp || 0),
            createdAt: String(note.created_at || new Date(0).toISOString()),
            folder: note.folder ? String(note.folder) : undefined,
            linkLabel: note.link_label ? String(note.link_label) : undefined,
            videoTitle: meta?.title,
            channelTitle: meta?.channelTitle,
            thumbnailUrl: meta?.thumbnailUrl,
            isPlaylist: meta?.isPlaylist,
          });
        });
      }
    });

    return allNotes
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .slice(0, Math.max(1, limit));
  } catch {
    return [];
  }
}

// --- Playback Progress ---

const PROGRESS_KEY = "leato_playback_progress";

/**
 * 動画ごとの再生位置（秒数）を保存します
 * @param videoId 保存対象の動画ID
 * @param time 再生位置（秒）
 */
export function savePlaybackProgress(videoId: string, time: number): void {
  if (typeof window === "undefined") return;
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
    console.error("Failed to save playback progress", e);
  }
}

/**
 * 動画の保存された再生位置（秒数）を取得します
 * @param videoId 取得対象の動画ID
 * @returns 保存された再生位置（秒）。保存されていない場合は0
 */
export function getPlaybackProgress(videoId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return 0;
    const progressMap: Record<string, number> = JSON.parse(raw);
    return progressMap[videoId] || 0;
  } catch (e) {
    console.error("Failed to get playback progress", e);
    return 0;
  }
}

// --- Playlist Index Progress ---

const PLAYLIST_INDEX_KEY = "leato_playlist_index";

/**
 * 再生リストごとの現在再生中のインデックスを保存します
 * @param playlistId プレイリストのID
 * @param index 現在のインデックス番号
 */
export function savePlaylistIndex(playlistId: string, index: number): void {
  if (typeof window === "undefined") return;
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
    console.error("Failed to save playlist index", e);
  }
}

/**
 * プレイリストの保存されたインデックスを取得します
 * @param playlistId プレイリストのID
 * @returns 保存されたインデックス（未保存なら0）
 */
export function getPlaylistIndex(playlistId: string): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(PLAYLIST_INDEX_KEY);
    if (!raw) return 0;
    const indexMap: Record<string, number> = JSON.parse(raw);
    return indexMap[playlistId] || 0;
  } catch {
    return 0;
  }
}

// --- Playlist Current Video ID ---
// プレイリスト再生時に、現在視聴中の動画IDを保存することで
// 次回ロード時に正確な動画から再開できるようにする

const PLAYLIST_CURRENT_VIDEO_KEY = "leato_playlist_current_video";

export type PlaylistCurrentVideo = {
  videoId: string; // 現在視聴中の個別動画ID
  playlistId: string; // プレイリストのID
  index: number; // プレイリスト内インデックス
};

export function savePlaylistCurrentVideo(
  playlistId: string,
  videoId: string,
  index: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PLAYLIST_CURRENT_VIDEO_KEY);
    const map: Record<string, PlaylistCurrentVideo> = raw
      ? JSON.parse(raw)
      : {};
    map[playlistId] = { videoId, playlistId, index };
    localStorage.setItem(PLAYLIST_CURRENT_VIDEO_KEY, JSON.stringify(map));
  } catch {}
}

export function getPlaylistCurrentVideo(
  playlistId: string,
): PlaylistCurrentVideo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYLIST_CURRENT_VIDEO_KEY);
    if (!raw) return null;
    const map: Record<string, PlaylistCurrentVideo> = JSON.parse(raw);
    return map[playlistId] || null;
  } catch {
    return null;
  }
}

// --- Playlist Resume Progress ---

const PLAYLIST_RESUME_KEY = "leato_playlist_resume";

export type PlaylistResume = {
  playlistId: string;
  videoId: string;
  index: number;
  time: number;
  updatedAt: number;
};

export function savePlaylistResume(
  playlistId: string,
  videoId: string,
  index: number,
  time: number,
): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(PLAYLIST_RESUME_KEY);
    const map: Record<string, PlaylistResume> = raw ? JSON.parse(raw) : {};

    map[playlistId] = {
      playlistId,
      videoId,
      index: Math.max(0, Math.floor(index)),
      time: Math.max(0, Math.floor(time || 0)),
      updatedAt: Date.now(),
    };

    const keys = Object.keys(map);
    if (keys.length > 100) {
      const oldestKey = keys.sort(
        (a, b) => map[a].updatedAt - map[b].updatedAt,
      )[0];
      delete map[oldestKey];
    }

    localStorage.setItem(PLAYLIST_RESUME_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save playlist resume", e);
  }
}

export function getPlaylistResume(playlistId: string): PlaylistResume | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PLAYLIST_RESUME_KEY);
    if (!raw) return null;
    const map: Record<string, PlaylistResume> = JSON.parse(raw);
    return map[playlistId] || null;
  } catch (e) {
    console.error("Failed to get playlist resume", e);
    return null;
  }
}
