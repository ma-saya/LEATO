import { google } from "googleapis";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const type = searchParams.get("type") as "video" | "playlist" | null;

  if (!id || !type) {
    return NextResponse.json(
      { error: 'Parameters "id" and "type" are required' },
      { status: 400 },
    );
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "YouTube API key is not configured" },
      { status: 500 }
    );
  }

  try {
    const youtube = google.youtube({ version: "v3", auth: apiKey });

    if (type === "video") {
      const res = await youtube.videos.list({
        part: ["snippet"],
        id: [id],
        hl: "ja",
      });

      const items = res.data.items;
      if (!items || items.length === 0) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }

      const snippet = items[0].snippet;
      return NextResponse.json({
        id,
        title: snippet?.title || "Unknown Video",
        channelTitle: snippet?.channelTitle || "Unknown Channel",
        thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || "",
        isPlaylist: false,
      });

    } else if (type === "playlist") {
      const res = await youtube.playlists.list({
        part: ["snippet"],
        id: [id],
        hl: "ja",
      });

      const items = res.data.items;
      if (!items || items.length === 0) {
        return NextResponse.json({ error: "Playlist not found" }, { status: 404 });
      }

      const snippet = items[0].snippet;
      return NextResponse.json({
        id,
        title: snippet?.title || "Unknown Playlist",
        channelTitle: snippet?.channelTitle || "Unknown Channel",
        thumbnailUrl: snippet?.thumbnails?.medium?.url || snippet?.thumbnails?.default?.url || "",
        isPlaylist: true,
      });
    }

    return NextResponse.json({ error: "Invalid type" }, { status: 400 });

  } catch (error) {
    console.error("YouTube Details API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch details from YouTube API" },
      { status: 500 }
    );
  }
}
