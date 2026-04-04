import { GoogleGenerativeAI } from "@google/generative-ai";
import { google } from "googleapis";
import { NextResponse } from "next/server";
import {
  consumeDailyQuota,
  getDailyQuotaSnapshot,
  type AIQuota,
} from "@/lib/ai-quota";
import {
  createClient as createServerClient,
  getServerSupabaseConfigError,
} from "@/lib/supabase/server";
import {
  createAdminClient,
  getAdminSupabaseConfigError,
} from "@/lib/supabase/admin";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const startedAt = Date.now();
  const { videoId, title, mode = "deep", checkOnly = false } =
    await request.json();
  const summaryMode = mode === "lightning" ? "lightning" : "deep";

  if (!videoId) {
    return NextResponse.json({ error: "videoId is required" }, { status: 400 });
  }

  const configError = getAISupabaseConfigError();
  if (configError) {
    logAiRequest({
      endpoint: "/api/ai",
      userId: null,
      status: 500,
      startedAt,
    });
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    logAiRequest({
      endpoint: "/api/ai",
      userId: null,
      status: 401,
      startedAt,
    });
    return NextResponse.json(
      { error: "AI機能はログイン後に利用できます。" },
      { status: 401 },
    );
  }

  const dataClient = getDataClient(supabase);
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeKey) {
    return NextResponse.json({ error: "YouTube API Key is not configured (ENV)" }, { status: 500 });
  }

  try {
    const cacheId = `${videoId}_${summaryMode}`;
    const quotaSnapshot = await getDailyQuotaSnapshot(user.id);

    console.log(`Checking cache for: ${cacheId}`);
    const { data: cachedData, error: cacheError } = await dataClient
      .from("videos")
      .select("summary, quiz")
      .eq("id", cacheId)
      .single();

    if (cachedData && !cacheError) {
      const isOldFormat =
        summaryMode === "deep" &&
        (Array.isArray(cachedData.summary) || !cachedData.summary?.takeaways);

      if (isOldFormat) {
        if (checkOnly) {
          logAiRequest({
            endpoint: "/api/ai",
            userId: user.id,
            status: 200,
            startedAt,
            quotaRemaining: quotaSnapshot.remaining,
          });
          return NextResponse.json({
            data: null,
            summary: null,
            quiz: null,
            quota: quotaSnapshot,
          });
        }
        console.log(
          "Old cache format detected. Bypassing cache to generate a new detailed summary with learning focus.",
        );
      } else {
        const payload = {
          summary: cachedData.summary,
          quiz: cachedData.quiz,
          model: "Cache (Supabase DB)",
        };
        console.log("Cache hit! Returning DB results.");
        logAiRequest({
          endpoint: "/api/ai",
          userId: user.id,
          status: 200,
          startedAt,
          quotaRemaining: quotaSnapshot.remaining,
        });
        return jsonWithQuota(payload, quotaSnapshot);
      }
    }

    if (cacheError && cacheError.code !== "PGRST116") {
      console.error("Supabase Cache Error:", cacheError);
    }

    if (checkOnly) {
      logAiRequest({
        endpoint: "/api/ai",
        userId: user.id,
        status: 200,
        startedAt,
        quotaRemaining: quotaSnapshot.remaining,
      });
      return NextResponse.json({
        data: null,
        summary: null,
        quiz: null,
        quota: quotaSnapshot,
      });
    }

    const quota = await consumeDailyQuota(user.id);
    if (!quota.allowed) {
      logAiRequest({
        endpoint: "/api/ai",
        userId: user.id,
        status: 429,
        startedAt,
        quotaRemaining: quota.remaining,
      });
      return quotaExceededResponse(quota);
    }

    let videoTitle = title || "不明";
    let description = "";
    let tags = "";
    let channelTitle = "";
    let duration = "";

    try {
      const youtube = google.youtube({ version: "v3", auth: youtubeKey });
      const videoRes = await youtube.videos.list({
        part: ["snippet", "contentDetails"],
        id: [videoId],
      });

      const videoInfo = videoRes.data.items?.[0];
      if (videoInfo) {
        const snippet = videoInfo.snippet;
        videoTitle = title || snippet?.title || "不明";
        description = snippet?.description || "";
        tags = snippet?.tags?.join(", ") || "";
        channelTitle = snippet?.channelTitle || "";
        duration = formatDuration(videoInfo.contentDetails?.duration || "");
      }
    } catch (ytError) {
      console.warn("YouTube Data API skipped or failed (likely quota):", ytError);
    }

    const prompt = buildPrompt(
      videoTitle,
      channelTitle,
      duration,
      tags,
      description,
      summaryMode,
    );

    const geminiKey = process.env.GEMINI_API_KEY;
    console.log(`[AI-ROUTE] Key loaded: ${geminiKey ? "YES" : "NO"}`);

    if (!geminiKey) {
      return NextResponse.json({ error: "Gemini APIキーが設定されていません。" }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(geminiKey);
    let lastError = "";

    const testModels = [
      "gemini-2.0-flash",
      "gemini-flash-latest",
      "gemini-pro-latest",
    ];

    for (const modelName of testModels) {
      try {
        console.log(`[AI-ROUTE] Trying model: ${modelName}`);
        const model = genAI.getGenerativeModel({ model: modelName });

        const result = await model.generateContent(prompt);
        console.log(`[AI-ROUTE] Success with ${modelName}`);

        const responseText = result.response.text();
        const parsed = parseAIResponse(responseText);

        if (parsed) {
          dataClient
            .from("videos")
            .upsert({
              id: cacheId,
              title: videoTitle,
              summary: parsed.summary,
              quiz: parsed.quiz,
              updated_at: new Date().toISOString(),
            })
            .then(({ error }) => {
              if (error) console.error("[AI-ROUTE] DB Save Error:", error);
              else console.log("[AI-ROUTE] DB Saved success");
            });

          const payload = { ...parsed, model: modelName };
          logAiRequest({
            endpoint: "/api/ai",
            userId: user.id,
            status: 200,
            startedAt,
            quotaRemaining: quota.remaining,
          });
          return jsonWithQuota(payload, quota);
        }
      } catch (error: any) {
        lastError = error?.message || String(error);
        console.error(`[AI-ROUTE] ${modelName} failed:`, lastError);
        continue;
      }
    }

    logAiRequest({
      endpoint: "/api/ai",
      userId: user.id,
      status: 500,
      startedAt,
      quotaRemaining: quota.remaining,
    });
    return NextResponse.json({
      error: formatErrorMessage(lastError),
    }, { status: 500 });

  } catch (error: any) {
    console.error("AI API CRITICAL ERROR:", error);
    if (error.stack) console.error("Stack Trace:", error.stack);
    const message = error?.message || "AI処理中に予期せぬエラーが発生しました";
    logAiRequest({
      endpoint: "/api/ai",
      userId: user.id,
      status: 500,
      startedAt,
    });
    return NextResponse.json({ error: formatErrorMessage(message) }, { status: 500 });
  }
}

function getDataClient(
  fallbackClient: Awaited<ReturnType<typeof createServerClient>>,
) {
  try {
    return createAdminClient();
  } catch {
    return fallbackClient;
  }
}

function jsonWithQuota(
  data: Record<string, unknown>,
  quota: AIQuota,
) {
  return NextResponse.json({
    data,
    quota,
    ...data,
  });
}

function quotaExceededResponse(quota: AIQuota) {
  return NextResponse.json(
    {
      error:
        `本日の無料枠（${quota.limit}回）に到達しました。リセット後に再度お試しください。`,
      quota,
      upgradeHint: "有料プランで上限を拡張予定です。",
    },
    { status: 429 },
  );
}

function getAISupabaseConfigError() {
  return getServerSupabaseConfigError() ?? getAdminSupabaseConfigError();
}

function logAiRequest({
  endpoint,
  userId,
  status,
  startedAt,
  quotaRemaining,
}: {
  endpoint: string;
  userId: string | null;
  status: number;
  startedAt: number;
  quotaRemaining?: number;
}) {
  console.info(
    "[AI-REQUEST]",
    JSON.stringify({
      endpoint,
      userId,
      status,
      latency: Date.now() - startedAt,
      quotaRemaining,
    }),
  );
}

function buildPrompt(title: string, channel: string, duration: string, tags: string, description: string, mode: 'lightning' | 'deep'): string {
  if (mode === 'lightning') {
    return `あなたは優秀なAIアシスタントです。以下のYouTube動画の情報を基に、可能な限り素早く要約を作成してください。

動画タイトル: ${title}
チャンネル: ${channel}
説明文:
${description.slice(0, 2000)}

以下のJSON形式で回答してください。JSON以外のマークダウンやテキストは含めないでください。

{
  "summary": {
    "headline": "動画の内容を一言で表すキャッチーな一文",
    "sections": [
      {
        "title": "ポイント1",
        "content": "結論となる最も重要な事実（短く簡潔に）",
        "importance": null,
        "codeSnippet": null
      },
      {
        "title": "ポイント2",
        "content": "次に重要な事実（短く簡潔に）",
        "importance": null,
        "codeSnippet": null
      },
      {
        "title": "ポイント3",
        "content": "補足的な重要な事実（短く簡潔に）",
        "importance": null,
        "codeSnippet": null
      }
    ],
    "takeaways": []
  },
  "quiz": [
    {
      "question": "動画の内容に関する簡単な問題1",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 0,
      "explanation": "解説文"
    }
  ]
}`;
  }

  // Deep mode (default)
  return `あなたは優秀な教育アシスタントです。以下のYouTube動画の情報を分析し、できる限り詳細で質の高い要約と学習クイズを作成してください。動画が長い場合でも、重要なポイントや専門用語を漏らさず丁寧に構造化してください。単なる「説明まとめ」ではなく、より「学習・勉強向き」な内容（重要性、具体例、本質まとめ）を含めることが求められます。

動画タイトル: ${title}
チャンネル: ${channel}
動画の長さ: ${duration}
タグ: ${tags}
説明文:
${description.slice(0, 4000)}

上記の情報から、動画の内容を深く推測して、以下のJSON形式で回答してください。

{
  "summary": {
    "headline": "この動画の内容を一言で表すキャッチコピー（簡潔に）",
    "sections": [
      {
        "title": "第1章、または最初のトピックの見出し",
        "content": "この部分で解説されている具体的な内容、手順などを記述してください。",
        "importance": "【重要】なぜそれが重要なのか、どのような課題を解決するのかを解説してください。（例: 各要素に一意の「key」プロパティが必要なのは、Reactが差分検出を効率的に行い、不要な再レンダリングを防ぐためである。）",
        "codeSnippet": "【実践イメージ】この章を象徴する「具体的な例」を1〜2行で提供してください。プログラミングならコード例、歴史なら重要な年表や台詞、数学なら公式、料理ならコツなど、ジャンルは問いません。ない場合はnullにしてください。"
      },
      {
        "title": "第2章の見出し",
        "content": "具体的な内容...",
        "importance": "なぜ重要か...",
        "codeSnippet": "具体例、公式、台詞、またはnull"
      }
      // 動画のボリュームに合わせて、必要なだけ章(section)を生成してください。
    ],
    "takeaways": [
      "🔑 この動画の本質まとめ1。短い文章で本質を突くようなまとめ（例: Reactは「コンポーネントの集合体」）",
      "🔑 この動画の本質まとめ2",
      "🔑 この動画の本質まとめ3"
    ]
  },
  "quiz": [
    {
      "question": "動画内の重要なポイントを確認する問題文1",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 0,
      "explanation": "正解の詳しい解説"
    },
    {
      "question": "問題文2",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 1,
      "explanation": "解説"
    },
    {
      "question": "問題文3",
      "options": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 2,
      "explanation": "解説"
    }
  ]
}

重要: 必ず有効なJSONのみを返してください。マークダウンのコードブロック (\`\`\`) や説明文は一切含めないでください。`;
}

function parseAIResponse(text: string): { summary: any; quiz: any[] } | null {
  const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/); // JSON部分をより柔軟に抽出
  if (!jsonMatch) {
    console.error("No JSON matched in response:", text.substring(0, 100));
    return null;
  }
  
  try {
    const data = JSON.parse(jsonMatch[0].trim());
    
    // Validate the new structure
    if (data.summary && data.summary.headline && Array.isArray(data.summary.sections) && data.quiz && Array.isArray(data.quiz)) {
      return data;
    }
    
    // Fallback for old structure if it happens to be generated
    if (Array.isArray(data.summary)) {
      return {
        summary: {
          headline: "動画の要約",
          sections: data.summary.map((text: string, i: number) => ({ title: `ポイント ${i+1}`, content: text })),
          takeaways: []
        },
        quiz: data.quiz || []
      };
    }

    console.error("Validation failed for parsed JSON structure");
    return null;
  } catch (e: any) {
    console.error("JSON parse error:", e.message, text.substring(0, 50));
    return null;
  }
}

function formatDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return iso;
  const h = match[1] ? `${match[1]}時間` : "";
  const m = match[2] ? `${match[2]}分` : "";
  const s = match[3] ? `${match[3]}秒` : "";
  return `${h}${m}${s}` || "不明";
}

function formatErrorMessage(msg: string): string {
  const lowMsg = msg.toLowerCase();
  
  if (lowMsg.includes("429") || lowMsg.includes("quota") || lowMsg.includes("too many requests")) {
    return "Gemini APIの無料枠の利用制限に達しました。1分ほど置いてから再試行するか、別のGoogle AI StudioプロジェクトのAPIキーを試してください。";
  }
  if (lowMsg.includes("404") || lowMsg.includes("not found")) {
    return `AIモデルが見つかりませんでした (404)。指定したモデルが現在のAPIキーで利用可能か確認してください。 (詳細: ${msg.substring(0, 100)})`;
  }
  if (lowMsg.includes("api key") || lowMsg.includes("incorrect api key") || lowMsg.includes("invalid")) {
    return "APIキーが無効、または期限切れです。Google AI Studioで有効なキーを確認してください。";
  }
  
  // 開発中はエラーの詳細を表示する
  return `AI処理中にエラーが発生しました: ${msg.substring(0, 150)}...`;
}
