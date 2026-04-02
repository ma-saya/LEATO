import {
  Search,
  Loader2,
  Play,
  List,
  Star,
  History as HistoryIcon,
  NotebookPen,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type SearchBarProps = {
  query: string;
  setQuery: (q: string) => void;
  searchType: "video" | "playlist" | "favorites" | "notes" | "history";
  handleSearch: (e: React.FormEvent) => void;
  handleTypeChange: (
    type: "video" | "playlist" | "favorites" | "notes" | "history",
  ) => void;
  loading: boolean;
};

export function SearchBar({
  query,
  setQuery,
  searchType,
  handleSearch,
  handleTypeChange,
  loading,
}: SearchBarProps) {
  return (
    <div className="space-y-12 max-w-5xl mx-auto w-full px-6">
      <form
        onSubmit={handleSearch}
        className="group relative flex items-center bg-card/30 backdrop-blur-3xl border-2 border-white/10 dark:border-white/5 rounded-full h-[72px] transition-all duration-300 focus-within:ring-[6px] focus-within:ring-indigo-500/10 focus-within:border-indigo-500/40 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]"
      >
        <div className="pl-7 flex-shrink-0">
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          ) : (
            <Search className="w-6 h-6 text-muted-foreground/40 group-focus-within:text-indigo-400 transition-all duration-300 stroke-[2.5]" />
          )}
        </div>

        <input
          type="text"
          placeholder="YouTubeで学習したいトピックを検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none px-5 text-lg font-medium placeholder:text-muted-foreground/25 text-foreground selection:bg-indigo-500/30"
        />

        <div className="pr-2 flex-shrink-0">
          <Button
            type="submit"
            disabled={loading || !query.trim()}
            className="h-[52px] bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-full px-10 font-black text-base shadow-[0_8px_30px_-8px_rgba(79,70,229,0.6)] disabled:opacity-40 transition-all duration-300 hover:scale-[1.04] active:scale-95 border border-white/15"
          >
            <Search className="w-4 h-4 mr-2 -ml-1" />
            検索
          </Button>
        </div>
      </form>

      {/* Tabs / Filter Types */}
      <div className="flex items-center justify-center">
        <div className="flex items-center bg-card/20 backdrop-blur-xl border border-white/8 rounded-2xl p-1.5 gap-1">
          {[
            { id: "video", label: "動画", icon: Play },
            { id: "playlist", label: "再生リスト", icon: List },
            { id: "favorites", label: "お気に入り", icon: Star },
            { id: "notes", label: "メモ", icon: NotebookPen },
            { id: "history", label: "履歴", icon: HistoryIcon },
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => handleTypeChange(type.id as any)}
              className={`relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-sm font-bold transition-all duration-300 ${
                searchType === type.id
                  ? "bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-lg shadow-indigo-500/30"
                  : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
              }`}
            >
              <type.icon
                className={`w-4 h-4 flex-shrink-0 ${searchType === type.id ? "text-white" : ""}`}
              />
              <span className="whitespace-nowrap">{type.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
