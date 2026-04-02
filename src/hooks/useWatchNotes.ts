"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { getFavorites, getHistory } from "@/lib/storage";

const DEFAULT_NOTE_FOLDER = "未分類";
const GLOBAL_NOTES_KEY = "leato_notes_global";
const GLOBAL_FOLDER_MAP_KEY = "leato_note_folder_map_global";
const GLOBAL_LINK_LABEL_MAP_KEY = "leato_note_link_label_map_global";
const GLOBAL_FOLDERS_KEY = "leato_note_folders_global";

export type Note = {
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

type UseWatchNotesProps = {
  videoId: string;
};

export function useWatchNotes({ videoId }: UseWatchNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteInput, setNoteInput] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [folders, setFolders] = useState<string[]>([DEFAULT_NOTE_FOLDER]);
  const [selectedFolder, setSelectedFolder] = useState<string>("all");
  const [newFolderName, setNewFolderName] = useState("");
  const [linkLabelInput, setLinkLabelInput] = useState("");

  const folderMapKey = GLOBAL_FOLDER_MAP_KEY;
  const linkLabelMapKey = GLOBAL_LINK_LABEL_MAP_KEY;
  const foldersKey = GLOBAL_FOLDERS_KEY;
  const draftKey = `leato_note_draft_${videoId}`;
  const linkLabelDraftKey = `leato_note_link_label_draft_${videoId}`;
  const notesKey = GLOBAL_NOTES_KEY;

  const normalizeFolder = useCallback((folderName?: string) => {
    const trimmed = folderName?.trim();
    return trimmed || DEFAULT_NOTE_FOLDER;
  }, []);

  const readFolderMap = useCallback((): Record<string, string> => {
    try {
      const raw = localStorage.getItem(folderMapKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }, [folderMapKey]);

  const writeFolderMap = useCallback(
    (map: Record<string, string>) => {
      localStorage.setItem(folderMapKey, JSON.stringify(map));
    },
    [folderMapKey],
  );

  const readLinkLabelMap = useCallback((): Record<string, string> => {
    try {
      const raw = localStorage.getItem(linkLabelMapKey);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }, [linkLabelMapKey]);

  const writeLinkLabelMap = useCallback(
    (map: Record<string, string>) => {
      localStorage.setItem(linkLabelMapKey, JSON.stringify(map));
    },
    [linkLabelMapKey],
  );

  const ensureFolderExists = useCallback(
    (folderName: string) => {
      const target = normalizeFolder(folderName);
      setFolders((prev) => {
        if (prev.includes(target)) return prev;
        const updated = [...prev, target];
        localStorage.setItem(foldersKey, JSON.stringify(updated));
        return updated;
      });
    },
    [foldersKey, normalizeFolder],
  );

  const getVideoMetaMap = useCallback(() => {
    const map = new Map<string, ReturnType<typeof getFavorites>[number]>();
    [...getFavorites(), ...getHistory()].forEach((video) => {
      if (!map.has(video.id)) {
        map.set(video.id, video);
      }
    });
    return map;
  }, []);

  const enrichNotesWithMeta = useCallback(
    (baseNotes: Note[]): Note[] => {
      const videoMetaMap = getVideoMetaMap();
      return baseNotes.map((note) => {
        const meta = videoMetaMap.get(note.video_id);
        return {
          ...note,
          video_title: meta?.title,
          channel_title: meta?.channelTitle,
          thumbnail_url: meta?.thumbnailUrl,
          is_playlist: meta?.isPlaylist,
        };
      });
    },
    [getVideoMetaMap],
  );

  const persistNotes = useCallback(
    (items: Note[]) => {
      localStorage.setItem(notesKey, JSON.stringify(items));
    },
    [notesKey],
  );

  const readLegacyPerVideoNotes = useCallback((): Note[] => {
    const keys = Object.keys(localStorage).filter(
      (k) => k.startsWith("leato_notes_") && k !== GLOBAL_NOTES_KEY,
    );

    const merged: Note[] = [];
    keys.forEach((key) => {
      const legacyVideoId = key.replace("leato_notes_", "");
      const raw = localStorage.getItem(key);
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return;
        parsed.forEach((item) => {
          if (!item || typeof item !== "object") return;
          merged.push({
            id: String(item.id || ""),
            video_id: String(item.video_id || legacyVideoId),
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

    const uniqueById = new Map<string, Note>();
    merged.forEach((note) => {
      if (!note.id) return;
      uniqueById.set(note.id, note);
    });

    return Array.from(uniqueById.values());
  }, []);

  useEffect(() => {
    try {
      const savedFolders = localStorage.getItem(foldersKey);
      if (savedFolders) {
        const parsed = JSON.parse(savedFolders);
        if (Array.isArray(parsed)) {
          const merged = Array.from(
            new Set([DEFAULT_NOTE_FOLDER, ...parsed.filter(Boolean)]),
          );
          setFolders(merged);
        }
      }

      const savedDraft = localStorage.getItem(draftKey);
      if (savedDraft) setNoteInput(savedDraft);

      const savedLinkLabelDraft = localStorage.getItem(linkLabelDraftKey);
      if (savedLinkLabelDraft) setLinkLabelInput(savedLinkLabelDraft);
    } catch {
      setFolders([DEFAULT_NOTE_FOLDER]);
    }
  }, [foldersKey, draftKey, linkLabelDraftKey]);

  useEffect(() => {
    if (noteInput.trim()) {
      localStorage.setItem(draftKey, noteInput);
    } else {
      localStorage.removeItem(draftKey);
    }
  }, [noteInput, draftKey]);

  useEffect(() => {
    if (linkLabelInput.trim()) {
      localStorage.setItem(linkLabelDraftKey, linkLabelInput);
    } else {
      localStorage.removeItem(linkLabelDraftKey);
    }
  }, [linkLabelInput, linkLabelDraftKey]);

  const fetchNotes = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("notes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) {
        const folderMap = readFolderMap();
        const linkLabelMap = readLinkLabelMap();
        const withFolder = data.map((note: Note) => ({
          ...note,
          folder: folderMap[note.id] || DEFAULT_NOTE_FOLDER,
          link_label: note.link_label || linkLabelMap[note.id],
        }));

        const enriched = enrichNotesWithMeta(withFolder);
        setNotes(enriched);
        persistNotes(withFolder);
      }
    } catch (err) {
      console.error("Failed to fetch notes:", err);
      const savedNotes = localStorage.getItem(notesKey);
      if (savedNotes) {
        const parsed = JSON.parse(savedNotes) as Note[];
        const folderMap = readFolderMap();
        const linkLabelMap = readLinkLabelMap();
        const withFolder = parsed.map((note) => ({
          ...note,
          folder: folderMap[note.id] || note.folder || DEFAULT_NOTE_FOLDER,
          link_label: note.link_label || linkLabelMap[note.id],
        }));
        setNotes(enrichNotesWithMeta(withFolder));
      } else {
        const legacy = readLegacyPerVideoNotes();
        if (legacy.length > 0) {
          persistNotes(legacy);
          setNotes(enrichNotesWithMeta(legacy));
        }
      }
    }
  }, [
    notesKey,
    readFolderMap,
    readLinkLabelMap,
    persistNotes,
    enrichNotesWithMeta,
    readLegacyPerVideoNotes,
  ]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSaveNote = useCallback(
    async (
      customContent?: string,
      customTime?: number,
      folderName?: string,
      customLinkLabel?: string,
    ) => {
      const content = customContent || noteInput.trim();
      if (!content || isSavingNote) return;

      setIsSavingNote(true);
      const time = customTime ?? 0;
      const folder = normalizeFolder(folderName);
      const linkLabel = (customLinkLabel ?? linkLabelInput).trim();

      try {
        const { data, error } = await supabase
          .from("notes")
          .insert([
            {
              video_id: videoId,
              content,
              timestamp: time,
            },
          ])
          .select();

        if (error) throw error;

        if (data) {
          const createdNote = {
            ...data[0],
            folder,
            link_label: linkLabel || undefined,
          };
          const folderMap = readFolderMap();
          folderMap[createdNote.id] = folder;
          writeFolderMap(folderMap);
          const linkLabelMap = readLinkLabelMap();
          if (linkLabel) {
            linkLabelMap[createdNote.id] = linkLabel;
          } else {
            delete linkLabelMap[createdNote.id];
          }
          writeLinkLabelMap(linkLabelMap);
          ensureFolderExists(folder);

          setNotes((prev) => {
            const updated = enrichNotesWithMeta(
              [...prev, createdNote].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime(),
              ),
            );
            persistNotes(
              updated.map((note) => ({
                id: note.id,
                video_id: note.video_id,
                content: note.content,
                timestamp: note.timestamp,
                created_at: note.created_at,
                folder: note.folder,
                link_label: note.link_label,
              })),
            );
            return updated;
          });
          if (!customContent) {
            setNoteInput("");
            setLinkLabelInput("");
          }
        }
      } catch (err) {
        console.error("Failed to save note to Supabase:", err);
        const newNote: Note = {
          id: Math.random().toString(36).substring(2, 9),
          video_id: videoId,
          content,
          timestamp: time,
          created_at: new Date().toISOString(),
          folder,
          link_label: linkLabel || undefined,
        };

        const folderMap = readFolderMap();
        folderMap[newNote.id] = folder;
        writeFolderMap(folderMap);
        const linkLabelMap = readLinkLabelMap();
        if (linkLabel) {
          linkLabelMap[newNote.id] = linkLabel;
        } else {
          delete linkLabelMap[newNote.id];
        }
        writeLinkLabelMap(linkLabelMap);
        ensureFolderExists(folder);

        const updated = [...notes, newNote].sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        const enriched = enrichNotesWithMeta(updated);
        persistNotes(updated);
        setNotes(enriched);
        if (!customContent) {
          setNoteInput("");
          setLinkLabelInput("");
        }
      } finally {
        setIsSavingNote(false);
      }
    },
    [
      videoId,
      noteInput,
      isSavingNote,
      notes,
      normalizeFolder,
      linkLabelInput,
      readFolderMap,
      writeFolderMap,
      readLinkLabelMap,
      writeLinkLabelMap,
      ensureFolderExists,
      persistNotes,
      enrichNotesWithMeta,
    ],
  );

  const handleDeleteNote = useCallback(
    async (noteId: string) => {
      try {
        const { error } = await supabase
          .from("notes")
          .delete()
          .eq("id", noteId);

        if (error) throw error;
        setNotes((prev) => {
          const updated = prev.filter((n) => n.id !== noteId);
          persistNotes(
            updated.map((note) => ({
              id: note.id,
              video_id: note.video_id,
              content: note.content,
              timestamp: note.timestamp,
              created_at: note.created_at,
              folder: note.folder,
              link_label: note.link_label,
            })),
          );
          return updated;
        });

        const folderMap = readFolderMap();
        delete folderMap[noteId];
        writeFolderMap(folderMap);
        const linkLabelMap = readLinkLabelMap();
        delete linkLabelMap[noteId];
        writeLinkLabelMap(linkLabelMap);
      } catch (err) {
        console.error("Failed to delete note from Supabase:", err);
        setNotes((prev) => {
          const updated = prev.filter((n) => n.id !== noteId);
          persistNotes(
            updated.map((note) => ({
              id: note.id,
              video_id: note.video_id,
              content: note.content,
              timestamp: note.timestamp,
              created_at: note.created_at,
              folder: note.folder,
              link_label: note.link_label,
            })),
          );
          return updated;
        });

        const folderMap = readFolderMap();
        delete folderMap[noteId];
        writeFolderMap(folderMap);
        const linkLabelMap = readLinkLabelMap();
        delete linkLabelMap[noteId];
        writeLinkLabelMap(linkLabelMap);
      }
    },
    [
      persistNotes,
      readFolderMap,
      writeFolderMap,
      readLinkLabelMap,
      writeLinkLabelMap,
    ],
  );

  const handleAddFolder = useCallback(() => {
    const target = normalizeFolder(newFolderName);
    ensureFolderExists(target);
    setNewFolderName("");
  }, [newFolderName, normalizeFolder, ensureFolderExists]);

  const handleMoveNoteToFolder = useCallback(
    (noteId: string, folderName: string) => {
      const target = normalizeFolder(folderName);
      ensureFolderExists(target);

      setNotes((prev) => {
        const updated = prev.map((note) =>
          note.id === noteId ? { ...note, folder: target } : note,
        );
        persistNotes(
          updated.map((note) => ({
            id: note.id,
            video_id: note.video_id,
            content: note.content,
            timestamp: note.timestamp,
            created_at: note.created_at,
            folder: note.folder,
            link_label: note.link_label,
          })),
        );
        return updated;
      });

      const folderMap = readFolderMap();
      folderMap[noteId] = target;
      writeFolderMap(folderMap);
    },
    [
      normalizeFolder,
      ensureFolderExists,
      readFolderMap,
      writeFolderMap,
      persistNotes,
    ],
  );

  const handleUpdateNote = useCallback(
    async (noteId: string, content: string, customLinkLabel?: string) => {
      const trimmedContent = content.trim();
      if (!trimmedContent) return;

      const trimmedLinkLabel = (customLinkLabel || "").trim();

      try {
        const { error } = await supabase
          .from("notes")
          .update({ content: trimmedContent })
          .eq("id", noteId);

        if (error) throw error;
      } catch (err) {
        console.error("Failed to update note in Supabase:", err);
      }

      setNotes((prev) => {
        const updated = prev.map((note) =>
          note.id === noteId
            ? {
                ...note,
                content: trimmedContent,
                link_label: trimmedLinkLabel || undefined,
              }
            : note,
        );

        persistNotes(
          updated.map((note) => ({
            id: note.id,
            video_id: note.video_id,
            content: note.content,
            timestamp: note.timestamp,
            created_at: note.created_at,
            folder: note.folder,
            link_label: note.link_label,
          })),
        );

        return updated;
      });

      const linkLabelMap = readLinkLabelMap();
      if (trimmedLinkLabel) {
        linkLabelMap[noteId] = trimmedLinkLabel;
      } else {
        delete linkLabelMap[noteId];
      }
      writeLinkLabelMap(linkLabelMap);
    },
    [persistNotes, readLinkLabelMap, writeLinkLabelMap],
  );

  return {
    notes,
    noteInput,
    setNoteInput,
    isSavingNote,
    folders,
    selectedFolder,
    setSelectedFolder,
    newFolderName,
    setNewFolderName,
    linkLabelInput,
    setLinkLabelInput,
    handleSaveNote,
    handleDeleteNote,
    handleAddFolder,
    handleMoveNoteToFolder,
    handleUpdateNote,
  };
}
