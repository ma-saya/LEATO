"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { SearchResultItem } from "./useNGFilter";

export function useYouTubeSearch(
  ngWords: string,
  ngChannels: string,
  filterVideos: (
    items: SearchResultItem[],
    words: string,
    channels: string,
  ) => SearchResultItem[],
) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [searchType, setSearchType] = useState<
    "video" | "playlist" | "favorites" | "notes" | "history"
  >("video");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rawVideos, setRawVideos] = useState<SearchResultItem[]>([]);
  const [videos, setVideos] = useState<SearchResultItem[]>([]);

  const executeSearch = useCallback(
    async (typeToSearch: "video" | "playlist", queryToSearch: string) => {
      if (!queryToSearch.trim()) return;

      // Search Query Filtering
      const qLower = queryToSearch.toLowerCase();
      const words = ngWords
        .split(",")
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w);
      const channels = ngChannels
        .split(",")
        .map((c) => c.trim().toLowerCase())
        .filter((c) => c);

      const isNgQuery =
        words.some((w) => qLower.includes(w)) ||
        channels.some((c) => qLower.includes(c));

      if (isNgQuery) {
        setError(
          "検索したキーワードにNG設定（ワードまたはチャンネル）が含まれているため、検索できません。",
        );
        setVideos([]);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          `/api/youtube/search?q=${encodeURIComponent(queryToSearch)}&type=${typeToSearch}`,
        );
        if (!res.ok) throw new Error("データの検索に失敗しました");

        const data = await res.json();
        const items = data.items || [];
        setRawVideos(items);

        const filteredVideos = filterVideos(items, ngWords, ngChannels);
        setVideos(filteredVideos);

        if (items.length > 0 && filteredVideos.length === 0) {
          setError(
            "検索結果がありましたが、すべてNG設定により非表示になりました。",
          );
        }
      } catch (err: unknown) {
        setError(
          err instanceof Error ? err.message : "予期せぬエラーが発生しました",
        );
      } finally {
        setLoading(false);
      }
    },
    [ngWords, ngChannels, filterVideos],
  );

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    let targetType: "video" | "playlist" =
      searchType === "video" || searchType === "playlist"
        ? searchType
        : "video";
    if (
      searchType === "favorites" ||
      searchType === "notes" ||
      searchType === "history"
    ) {
      targetType = "video";
      setSearchType("video");
    }

    // Update URL
    router.push(`/?q=${encodeURIComponent(query)}&type=${targetType}`, {
      scroll: false,
    });
    executeSearch(targetType, query);
  };

  const handleTypeChange = (
    newType: "video" | "playlist" | "favorites" | "notes" | "history",
  ) => {
    setSearchType(newType);
    if (
      newType === "favorites" ||
      newType === "notes" ||
      newType === "history"
    ) {
      router.push(`/?type=${newType}`, { scroll: false });
      return;
    }
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query)}&type=${newType}`, {
        scroll: false,
      });
      executeSearch(newType, query);
    } else {
      router.push(`/?type=${newType}`, { scroll: false });
    }
  };

  return {
    query,
    setQuery,
    searchType,
    setSearchType,
    loading,
    setLoading,
    error,
    setError,
    videos,
    setVideos,
    rawVideos,
    setRawVideos,
    executeSearch,
    handleSearch,
    handleTypeChange,
  };
}
