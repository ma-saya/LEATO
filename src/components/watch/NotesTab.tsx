"use client";

import { useState } from "react";
import {
  PencilLine,
  Clock,
  Plus,
  Trash2,
  FolderPlus,
  ExternalLink,
  Save,
  X,
  Pencil,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Note } from "@/hooks/useWatchNotes";
import { format } from "date-fns";

type NotesTabProps = {
  activeTab: string;
  notes: Note[];
  folders: string[];
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  noteInput: string;
  setNoteInput: (val: string) => void;
  linkLabelInput: string;
  setLinkLabelInput: (val: string) => void;
  isSavingNote: boolean;
  onSaveNote: (
    content?: string,
    time?: number,
    folder?: string,
    linkLabel?: string,
  ) => void;
  onDeleteNote: (id: string) => void;
  onUpdateNote: (id: string, content: string, linkLabel?: string) => void;
  onAddFolder: () => void;
  onMoveFolder: (id: string, folder: string) => void;
  onSeekTo: (seconds: number) => void;
  currentVideoId: string;
  onOpenVideo: (videoId: string) => void;
  getCurrentTime: () => number;
  formatTime: (seconds: number) => string;
};

export function NotesTab({
  activeTab,
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
  onSaveNote,
  onDeleteNote,
  onUpdateNote,
  onAddFolder,
  onMoveFolder,
  onSeekTo,
  currentVideoId,
  onOpenVideo,
  getCurrentTime,
  formatTime,
}: NotesTabProps) {
  if (activeTab !== "notes") return null;

  const filteredNotes =
    selectedFolder === "all"
      ? notes
      : notes.filter((note) => (note.folder || "未分類") === selectedFolder);

  const handleSubmit = () => {
    const currentTime = Math.floor(getCurrentTime());
    onSaveNote(
      undefined,
      currentTime,
      selectedFolder === "all" ? "未分類" : selectedFolder,
      linkLabelInput,
    );
  };

  const handleInsertTimestamp = () => {
    const currentTime = Math.floor(getCurrentTime());
    const stamp = `[${formatTime(currentTime)}] `;
    setNoteInput(`${noteInput}${noteInput ? "\n" : ""}${stamp}`);
  };

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [editingLinkLabel, setEditingLinkLabel] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const COLLAPSE_THRESHOLD = 4; // この行数以上で折りたたむ

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isLong = (content: string) =>
    content.split("\n").length > COLLAPSE_THRESHOLD;

  // 改行を <br /> で明示レンダリング（CSS依存を排除）
  const renderLines = (content: string, collapsed: boolean) => {
    const lines = content.split("\n");
    const display = collapsed ? lines.slice(0, COLLAPSE_THRESHOLD) : lines;
    return display.map((line, i) => (
      <span key={i}>
        {line || "\u00A0"}
        {i < display.length - 1 && <br />}
      </span>
    ));
  };

  const startEdit = (note: Note) => {
    setEditingId(note.id);
    setEditingContent(note.content);
    setEditingLinkLabel(note.link_label || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent("");
    setEditingLinkLabel("");
  };

  const saveEdit = () => {
    if (!editingId) return;
    onUpdateNote(editingId, editingContent, editingLinkLabel);
    cancelEdit();
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col animate-in fade-in duration-500">
      {/* 入力フォーム（上部） */}
      <div className="pb-4 border-b border-border/60 mb-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
          className="space-y-2"
        >
          <Input
            value={linkLabelInput}
            onChange={(e) => setLinkLabelInput(e.target.value)}
            placeholder="動画へ移動リンク名（例: Python入門へ）"
            className="h-10 text-sm"
            disabled={isSavingNote}
          />

          <Textarea
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="メモを書く...（Ctrl/Cmd + Enter ですぐ保存）"
            className="bg-muted/50 border-border focus:bg-muted min-h-[96px] rounded-2xl text-sm transition-all leading-6"
            disabled={isSavingNote}
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleInsertTimestamp}
              className="h-9 px-3 rounded-xl border border-border bg-card/50 text-xs font-bold text-muted-foreground hover:text-foreground"
            >
              現在時刻を挿入
            </button>
            <button
              type="submit"
              disabled={!noteInput.trim() || isSavingNote}
              className="h-9 px-4 bg-primary text-primary-foreground hover:opacity-90 disabled:bg-muted disabled:text-foreground/70 disabled:opacity-100 border border-transparent disabled:border-border rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-90 text-xs font-bold ml-auto"
            >
              <Plus className="w-4 h-4 mr-1" />
              保存
            </button>
          </div>
        </form>
      </div>

      {/* フォルダーフィルター */}
      <div className="space-y-3 pb-4 border-b border-border/60 mb-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => setSelectedFolder("all")}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition-colors ${selectedFolder === "all" ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"}`}
          >
            すべて ({notes.length})
          </button>
          {folders.map((folder) => {
            const count = notes.filter(
              (note) => (note.folder || "未分類") === folder,
            ).length;
            return (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition-colors ${selectedFolder === folder ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"}`}
              >
                {folder} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <Input
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="新しいフォルダー名"
            className="h-9 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddFolder();
              }
            }}
          />
          <button
            type="button"
            onClick={onAddFolder}
            className="h-9 px-3 rounded-xl bg-muted/60 border border-border text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-xs font-bold"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            追加
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 pb-4 scrollbar-hide">
        {filteredNotes.length === 0 && (
          <div className="py-12 text-center space-y-4 px-6 opacity-40">
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto">
              <PencilLine className="w-6 h-6" />
            </div>
            <p className="text-sm">このフォルダーにはメモがありません。</p>
          </div>
        )}

        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-muted/40 border border-border/60 rounded-2xl group hover:bg-muted/70 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                {note.video_id === currentVideoId ? (
                  <button
                    onClick={() => onSeekTo(note.timestamp)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 rounded-lg text-[10px] font-black transition-colors"
                  >
                    <Clock className="w-3 h-3" />
                    {formatTime(note.timestamp)}
                  </button>
                ) : (
                  <button
                    onClick={() => onOpenVideo(note.video_id)}
                    className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-black transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {note.link_label || "動画へ移動"}
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <select
                    value={note.folder || "未分類"}
                    onChange={(e) => onMoveFolder(note.id, e.target.value)}
                    className="h-7 max-w-[120px] bg-card/60 border border-border rounded-md text-[10px] px-2"
                  >
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-muted-foreground/60">
                    {format(new Date(note.created_at), "M/d HH:mm")}
                  </span>
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1 hover:text-foreground transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDeleteNote(note.id)}
                    className="p-1 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground/70 mb-1 truncate">
                {note.video_title || note.video_id}
              </p>
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Input
                    value={editingLinkLabel}
                    onChange={(e) => setEditingLinkLabel(e.target.value)}
                    placeholder="動画へ移動リンク名"
                    className="h-8 text-xs"
                  />
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        saveEdit();
                      }
                      if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                    className="min-h-[88px] text-sm"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="h-8 px-3 rounded-lg border border-border text-xs font-bold text-muted-foreground flex items-center gap-1"
                    >
                      <X className="w-3.5 h-3.5" />
                      キャンセル
                    </button>
                    <button
                      type="button"
                      onClick={saveEdit}
                      disabled={!editingContent.trim()}
                      className="h-8 px-3 rounded-lg bg-primary text-primary-foreground disabled:bg-muted disabled:text-foreground/70 text-xs font-bold flex items-center gap-1"
                    >
                      <Save className="w-3.5 h-3.5" />
                      保存
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    {renderLines(
                      note.content,
                      isLong(note.content) && !expandedIds.has(note.id),
                    )}
                    {isLong(note.content) && !expandedIds.has(note.id) && (
                      <span className="text-muted-foreground/50"> …</span>
                    )}
                  </p>
                  {isLong(note.content) && (
                    <button
                      onClick={() => toggleExpand(note.id)}
                      className="mt-1.5 flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 transition-colors font-bold"
                    >
                      {expandedIds.has(note.id) ? (
                        <>
                          <ChevronUp className="w-3 h-3" />
                          縮める
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-3 h-3" />
                          もっと見る
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
