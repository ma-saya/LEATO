import { google } from "googleapis";
import { NextResponse } from "next/server";
import yts from "yt-search";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const type = searchParams.get("type") || "video";

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 },
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;

  try {
    // 1. 検索自体はクォータ制限のない yt-search で行う (100pt節約)
    const r = await yts({ query, hl: 'ja', gl: 'JP' });

    if (type === "video") {
      // ショート動画（60秒以下）を除外し、通常の動画のみを取得
      const videos = r.videos.filter(v => v.type === 'video' && v.seconds > 60).slice(0, 15);
      const videoIds = videos.map(v => v.videoId);

      let items: any[] = [];

      // 2. タイトルを日本語で正確に取得するため、クォータ消費の少ない(1pt) videos.list を使用する
      if (apiKey && videoIds.length > 0) {
        try {
          const youtube = google.youtube({ version: "v3", auth: apiKey });
          const detailRes = await youtube.videos.list({
            part: ["snippet"],
            id: videoIds,
            hl: "ja", // 日本語を強制
          });

          items = (detailRes.data.items || []).map((v: any) => ({
            id: { kind: "youtube#video", videoId: v.id },
            snippet: v.snippet
          }));
        } catch (e) {
          console.warn("YouTube Details API failed, falling back to yt-search data:", e);
        }
      }

      // APIが失敗した場合のフォールバック
      if (items.length === 0) {
        items = videos.map((v) => ({
          id: { kind: "youtube#video", videoId: v.videoId },
          snippet: {
            publishedAt: v.ago || new Date().toISOString(),
            title: v.title,
            description: v.description || "",
            thumbnails: { medium: { url: v.thumbnail }, high: { url: v.thumbnail } },
            channelTitle: v.author?.name || "Unknown Channel",
          }
        }));
      }

      return NextResponse.json({ items });

    } else if (type === "playlist") {
      let items: any[] = [];
      
      // 1. まずは公式APIでの取得を試みる（正確なメタデータのため）
      if (apiKey) {
        try {
          const youtube = google.youtube({ version: "v3", auth: apiKey });
          const searchRes = await youtube.search.list({
            part: ["snippet"],
            q: query,
            type: ["playlist"],
            maxResults: 20,
          });

          items = (searchRes.data.items || []).map((v: any) => ({
            id: { kind: "youtube#playlist", playlistId: v.id.playlistId },
            snippet: {
              publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
              title: v.snippet?.title || "Unknown Playlist",
              description: v.snippet?.description || "",
              thumbnails: { 
                medium: { url: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url }, 
                high: { url: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url } 
              },
              channelTitle: v.snippet?.channelTitle || "Unknown Channel",
            }
          }));
        } catch (e: any) {
          console.warn("YouTube Playlist API failed (likely quota), falling back to yt-search:", e.message);
        }
      }

      // 2. API制限(Quota Exceeded)等で取得できなかった場合のフォールバック
      if (items.length === 0) {
        // 'EgIQAw%3D%3D' は YouTube の「再生リスト(Playlist)」絞り込みパラメータ
        const fallbackRes = await yts({ query: query, sp: 'EgIQAw%3D%3D', hl: 'ja', gl: 'JP' });
        const playlists = fallbackRes.playlists || fallbackRes.lists || [];
        
        items = playlists.slice(0, 20).map((p: any) => ({
          id: { kind: "youtube#playlist", playlistId: p.listId || p.playlistId },
          snippet: {
            publishedAt: new Date().toISOString(),
            title: p.title,
            description: `動画数: ${p.videoCount}`,
            thumbnails: { 
              medium: { url: p.thumbnail || p.image }, 
              high: { url: p.thumbnail || p.image } 
            },
            channelTitle: p.author?.name || "Unknown Channel",
          }
        }));
      }

      return NextResponse.json({ items });
    }

  } catch (error) {
    console.error("Search API Hybrid Error:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
