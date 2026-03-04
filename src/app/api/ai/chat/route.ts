import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { videoId, message, history = [] } = await request.json();

  if (!videoId || !message) {
    return NextResponse.json({ error: "videoId and message are required" }, { status: 400 });
  }

  const geminiKey = process.env.GEMINI_API_KEY;
  const youtubeKey = process.env.YOUTUBE_API_KEY;

  if (!geminiKey || !youtubeKey) {
    return NextResponse.json({ error: "API keys are not configured" }, { status: 500 });
  }

  try {
    // 1. Get Video Context (Check Cache first, then YT API)
    // Deep summary を優先的にコンテキストとして利用
    const { data: videoData } = await supabase
      .from('videos')
      .select('summary, title')
      .eq('id', `${videoId}_deep`)
      .single();

    // YouTube API からも詳細情報を取得（クォータ制限に配慮しつつ）
    let description = "";
    let title = videoData?.title || "";

    try {
      const youtube = google.youtube({ version: "v3", auth: youtubeKey });
      const videoRes = await youtube.videos.list({
        part: ["snippet"],
        id: [videoId],
      });
      const snippet = videoRes.data.items?.[0]?.snippet;
      if (snippet) {
        description = snippet.description || "";
        title = snippet.title || title;
      }
    } catch (ytError) {
      console.warn("YouTube Data API skipped in Chat:", ytError);
    }

    // 2. Build System Prompt
    const systemPrompt = `
あなたはYouTube動画「${title}」の学習アシスタントです。
以下の動画情報を踏まえて、ユーザーの質問に親切かつ正確に答えてください。
回答は簡潔かつ分かりやすく、学習を助けるようなトーンで行ってください。

【動画の説明文】
${description.slice(0, 5000)}

【動画の要約内容（参考）】
${videoData?.summary ? JSON.stringify(videoData.summary) : "要約データなし"}

回答の指針:
- 動画の内容に基づいた回答を心がけてください。
- 動画に含まれていない内容については「動画内では詳しく説明されていませんが、一般的には〜」という形で補足してください。
- 数式やコードが含まれる場合は、見やすくフォーマットしてください。
- 日本語で回答してください。
`;

    // 3. Call Gemini Chat
    const genAI = new GoogleGenerativeAI(geminiKey);
    let allErrors: string[] = [];
    
    const testModels = [
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-pro-latest"
    ];

    // 履歴の整形（システムプロンプトを冒頭の会話として注入）
    const geminiHistory = [
      { role: "user", parts: [{ text: systemPrompt + "\n\n準備はできましたか？" }] },
      { role: "model", parts: [{ text: "はい、動画「" + title + "」の学習アシスタントとして、どのような質問にもお答えします。準備が整いました。どうぞ質問してください。" }] },
      ...history.map((m: any) => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.content }],
      })),
    ];

    for (const modelName of testModels) {
      try {
        console.log(`[AI-CHAT-ROUTE] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const chat = model.startChat({
          history: geminiHistory,
        });

        const result = await chat.sendMessage(message);
        const responseText = result.response.text();

        return NextResponse.json({ message: responseText, model: modelName });
      } catch (error: any) {
        allErrors.push(`${modelName}: ${error?.message || String(error)}`);
        console.warn(`[AI-CHAT-ROUTE] ${modelName} failed:`, String(error).substring(0, 100));
        continue;
      }
    }


    const errorString = JSON.stringify(allErrors);
    throw new Error(formatErrorMessage(errorString) || `全てのAIモデルで通信に失敗しました。`);

  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message || "チャット処理中にエラーが発生しました" }, { status: 500 });
  }
}

function formatErrorMessage(msg: string): string {
  const lowMsg = msg.toLowerCase();
  
  if (lowMsg.includes("429") || lowMsg.includes("quota") || lowMsg.includes("too many requests")) {
    return "Gemini APIの無料枠の利用制限に達しました。1分ほど置いてから再試行するか、別のGoogle AI StudioプロジェクトのAPIキーを試してください。";
  }
  if (lowMsg.includes("404") || lowMsg.includes("not found")) {
    return `AIモデルが見つかりませんでした (404)。指定したモデルが現在のAPIキーで利用可能か確認してください。`;
  }
  if (lowMsg.includes("api key") || lowMsg.includes("incorrect api key") || lowMsg.includes("invalid")) {
    return "APIキーが無効、または期限切れです。Google AI Studioで有効なキーを確認してください。";
  }
  
  return "";
}
