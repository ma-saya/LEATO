"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  NotebookPen,
  Pencil,
  Save,
  Trash2,
  X,
  FolderPlus,
  FolderPen,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getUnifiedNotes,
  updateUnifiedNote,
  removeUnifiedNote,
  getNoteFolders,
  addNoteFolder,
  renameNoteFolder,
  deleteNoteFolder,
  type UnifiedNote,
} from "@/lib/storage";
import { supabase } from "@/lib/supabase";

type NotesViewProps = {
  categories: string[];
};

type EditableState = {
  id: string;
  content: string;
  folder: string;
  linkLabel: string;
} | null;

export function NotesView({ categories }: NotesViewProps) {
  const [notes, setNotes] = useState<UnifiedNote[]>([]);
  const [folderFilter, setFolderFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<EditableState>(null);

  const [storedFolders, setStoredFolders] = useState<string[]>([]);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingFolder, setRenamingFolder] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const refresh = () => {
    const all = getUnifiedNotes().sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
    setNotes(all);
    setStoredFolders(getNoteFolders());
  };

  useEffect(() => {
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const folders = useMemo(() => {
    const fromNotes = notes.map((n) => n.folder || "未分類");
    return Array.from(
      new Set(["未分類", ...categories, ...storedFolders, ...fromNotes]),
    );
  }, [notes, categories, storedFolders]);

  const filtered = useMemo(() => {
    return notes.filter((note) => {
      const byFolder =
        folderFilter === "all" || (note.folder || "未分類") === folderFilter;
      const q = query.trim().toLowerCase();
      if (!q) return byFolder;
      return (
        byFolder &&
        `${note.content} ${note.video_title || ""}`.toLowerCase().includes(q)
      );
    });
  }, [notes, folderFilter, query]);

  const handleAddFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    setStoredFolders(addNoteFolder(trimmed));
    setNewFolderName("");
  };

  const startRenameFolder = (name: string) => {
    setRenamingFolder(name);
    setRenameValue(name);
  };

  const commitRenameFolder = () => {
    if (!renamingFolder || !renameValue.trim()) {
      setRenamingFolder(null);
      return;
    }
    const nextName = renameValue.trim();
    setStoredFolders(renameNoteFolder(renamingFolder, nextName));
    if (folderFilter === renamingFolder) setFolderFilter(nextName);
    refresh();
    setRenamingFolder(null);
  };

  const handleDeleteFolder = (name: string) => {
    setStoredFolders(deleteNoteFolder(name));
    if (folderFilter === name) setFolderFilter("all");
    refresh();
  };

  const startEdit = (note: UnifiedNote) => {
    setEditing({
      id: note.id,
      content: note.content,
      folder: note.folder || "未分類",
      linkLabel: note.link_label || "",
    });
  };

  const cancelEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;

    const content = editing.content.trim();
    if (!content) return;

    try {
      await supabase.from("notes").update({ content }).eq("id", editing.id);
    } catch {
      // noop
    }

    updateUnifiedNote(editing.id, {
      content,
      folder: editing.folder || "未分類",
      link_label: editing.linkLabel.trim() || undefined,
    });
    refresh();
    setEditing(null);
  };

  const deleteNote = async (noteId: string) => {
    try {
      await supabase.from("notes").delete().eq("id", noteId);
    } catch {
      // noop
    }

    removeUnifiedNote(noteId);
    refresh();
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      saveEdit();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelEdit();
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-2">
        <NotebookPen className="w-4 h-4 text-indigo-400" />
        <h2 className="text-sm font-black uppercase tracking-widest text-muted-foreground">
          メモ一覧
        </h2>
      </div>

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="メモを検索"
        className="h-9 text-sm"
      />

      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setFolderFilter("all")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition-colors ${
              folderFilter === "all"
                ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            すべて ({notes.length})
          </button>

          {folders.map((folder) => {
            const count = notes.filter(
              (n) => (n.folder || "未分類") === folder,
            ).length;
            const isRenaming = renamingFolder === folder;

            return (
              <div key={folder} className="flex items-center gap-1">
                {isRenaming ? (
                  <div className="flex items-center gap-1">
                    <Input
                      autoFocus
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRenameFolder();
                        if (e.key === "Escape") setRenamingFolder(null);
                      }}
                      className="h-7 w-28 text-xs px-2"
                    />
                    <button
                      onClick={commitRenameFolder}
                      className="h-7 px-2 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-bold"
                    >
                      <Save className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => setRenamingFolder(null)}
                      className="h-7 px-2 rounded-lg border border-border text-muted-foreground text-xs"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 group">
                    <button
                      onClick={() => setFolderFilter(folder)}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition-colors ${
                        folderFilter === folder
                          ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300"
                          : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {folder} ({count})
                    </button>
                    {folder !== "未分類" && (
                      <>
                        <button
                          onClick={() => startRenameFolder(folder)}
                          title="フォルダー名を変更"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
                        >
                          <FolderPen className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDeleteFolder(folder)}
                          title="フォルダーを削除"
                          className="opacity-0 group-hover:opacity-100 h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddFolder();
              }
            }}
            placeholder="新しいフォルダー名"
            className="h-9 text-xs"
          />
          <button
            type="button"
            onClick={handleAddFolder}
            className="h-9 px-3 rounded-xl bg-muted/60 border border-border text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-bold shrink-0"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            追加
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="p-10 text-center text-muted-foreground border border-dashed border-border rounded-2xl">
            表示できるメモがありません。
          </div>
        )}

        {filtered.map((note) => {
          const isEditing = editing?.id === note.id;

          return (
            <div
              key={note.id}
              className="p-4 rounded-2xl border border-border bg-card/50 space-y-2"
              onDoubleClick={() => {
                if (!isEditing) startEdit(note);
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/watch/${note.video_id}`}
                  className="text-sm font-bold text-indigo-300 hover:underline truncate"
                >
                  {note.link_label || "動画へ移動"}
                </Link>
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 shrink-0">
                  {note.folder || "未分類"}
                </span>
              </div>

              {isEditing ? (
                <>
                  <Textarea
                    autoFocus
                    value={editing.content}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, content: e.target.value } : prev,
                      )
                    }
                    onKeyDown={handleEditKeyDown}
                    className="min-h-[90px]"
                  />
                  <Input
                    value={editing.linkLabel}
                    onChange={(e) =>
                      setEditing((prev) =>
                        prev ? { ...prev, linkLabel: e.target.value } : prev,
                      )
                    }
                    placeholder="動画へ移動の名前"
                    className="h-9 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <select
                      value={editing.folder}
                      onChange={(e) =>
                        setEditing((prev) =>
                          prev ? { ...prev, folder: e.target.value } : prev,
                        )
                      }
                      className="h-8 w-40 bg-card border border-border rounded-lg text-xs px-2"
                    >
                      {folders.map((folder) => (
                        <option key={folder} value={folder}>
                          {folder}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={saveEdit}
                      className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      保存
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="h-8 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      キャンセル
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {note.content}
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.created_at).toLocaleString("ja-JP")}
                    </span>
                    <span className="text-[10px] text-muted-foreground/70">
                      ダブルクリックで編集
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(note)}
                        className="h-8 px-2.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        編集
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="h-8 px-2.5 rounded-lg border border-red-500/20 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        削除
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
