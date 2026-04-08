import { google } from "googleapis";
import { NextResponse } from "next/server";

// ISO 8601 duration → 秒数に変換 (例: "PT1M30S" → 90)
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return parseInt(match[1] || "0") * 3600
       + parseInt(match[2] || "0") * 60
       + parseInt(match[3] || "0");
}

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
  if (!apiKey) {
    return NextResponse.json({ error: "YOUTUBE_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const youtube = google.youtube({ version: "v3", auth: apiKey });

    if (type === "video") {
      // 1. search.list で動画検索（100pt/call）
      const searchRes = await youtube.search.list({
        part: ["snippet"],
        q: query,
        type: ["video"],
        maxResults: 25,
        hl: "ja",
        regionCode: "JP",
      });

      const videoIds = (searchRes.data.items || [])
        .map((v: any) => v.id?.videoId)
        .filter(Boolean) as string[];

      let items: any[] = [];

      if (videoIds.length > 0) {
        // 2. videos.list で詳細取得＆ショート除外（1pt/call）
        const detailRes = await youtube.videos.list({
          part: ["snippet", "contentDetails"],
          id: videoIds,
          hl: "ja",
        });

        items = (detailRes.data.items || [])
          .filter((v: any) => parseDuration(v.contentDetails?.duration || "PT0S") > 60)
          .slice(0, 15)
          .map((v: any) => ({
            id: { kind: "youtube#video", videoId: v.id },
            snippet: v.snippet,
          }));
      }

      return NextResponse.json({ items });

    } else if (type === "playlist") {
      const searchRes = await youtube.search.list({
        part: ["snippet"],
        q: query,
        type: ["playlist"],
        maxResults: 20,
      });

      const items = (searchRes.data.items || []).map((v: any) => ({
        id: { kind: "youtube#playlist", playlistId: v.id?.playlistId },
        snippet: {
          publishedAt: v.snippet?.publishedAt || new Date().toISOString(),
          title: v.snippet?.title || "Unknown Playlist",
          description: v.snippet?.description || "",
          thumbnails: {
            medium: { url: v.snippet?.thumbnails?.medium?.url || v.snippet?.thumbnails?.default?.url },
            high: { url: v.snippet?.thumbnails?.high?.url || v.snippet?.thumbnails?.medium?.url },
          },
          channelTitle: v.snippet?.channelTitle || "Unknown Channel",
        },
      }));

      return NextResponse.json({ items });
    }

    return NextResponse.json({ items: [] });

  } catch (error: any) {
    console.error("YouTube Search API Error:", error?.message || error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
