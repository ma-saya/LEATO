"use client";

import { useState, useEffect, useCallback, useRef } from "react";

export type QuizQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type AIData = {
  summary: {
    headline: string;
    sections: {
      title: string;
      content: string;
      importance?: string;
      codeSnippet?: string;
    }[];
    takeaways?: string[];
  };
  quiz: QuizQuestion[];
};

type UseWatchAIProps = {
  videoId: string;
  title: string;
  isPlaylist: boolean;
};

export function useWatchAI({
  videoId,
  title,
  isPlaylist: _isPlaylist,
}: UseWatchAIProps) {
  const [activeTab, setActiveTab] = useState<
    "summary" | "quiz" | "chat" | "notes"
  >("summary");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiStatus, setAiStatus] = useState("");
  const [summaryMode, setSummaryMode] = useState<"lightning" | "deep">("deep");
  const [lightningData, setLightningData] = useState<AIData | null>(null);
  const [deepData, setDeepData] = useState<AIData | null>(null);

  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizRevealed, setQuizRevealed] = useState<Record<number, boolean>>({});

  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: string }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedMode = localStorage.getItem("leato_summary_mode");
    if (savedMode === "lightning" || savedMode === "deep") {
      setSummaryMode(savedMode);
    }
  }, []);

  const handleModeChange = useCallback((mode: "lightning" | "deep") => {
    setSummaryMode(mode);
    localStorage.setItem("leato_summary_mode", mode);
  }, []);

  const currentAIData = summaryMode === "lightning" ? lightningData : deepData;

  const generateAI = useCallback(
    async (overrideMode?: "lightning" | "deep") => {
      const targetMode = overrideMode || summaryMode;
      if (!videoId) {
        setAiError(
          "現在再生中の動画を取得できませんでした。動画の再生後にもう一度お試しください。",
        );
        return;
      }
      setAiLoading(true);
      setAiError("");
      if (targetMode === "lightning") setLightningData(null);
      else setDeepData(null);

      setQuizAnswers({});
      setQuizRevealed({});
      setAiStatus(
        `${targetMode === "lightning" ? "Lightning" : "Deep"}モードで分析中...`,
      );

      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, title, mode: targetMode }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "AI処理に失敗しました");
        if (targetMode === "lightning") setLightningData(data);
        else setDeepData(data);
      } catch (err: any) {
        setAiError(err.message || "AI処理中にエラーが発生しました");
      } finally {
        setAiLoading(false);
        setAiStatus("");
      }
    },
    [videoId, title, summaryMode],
  );

  useEffect(() => {
    if (!videoId) return;

    const fetchCache = async (mode: "lightning" | "deep") => {
      try {
        const res = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoId, title, mode, checkOnly: true }),
        });
        const data = await res.json();
        if (res.ok && data.summary) {
          if (mode === "lightning") setLightningData(data);
          else setDeepData(data);
        }
      } catch (err) {}
    };

    fetchCache("lightning");
    fetchCache("deep");
  }, [videoId, title]);

  const handleQuizAnswer = useCallback(
    (qIndex: number, opeIndex: number) => {
      if (quizRevealed[qIndex]) return;
      setQuizAnswers((prev) => ({ ...prev, [qIndex]: opeIndex }));
      setQuizRevealed((prev) => ({ ...prev, [qIndex]: true }));
    },
    [quizRevealed],
  );

  const handleSendMessage = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!chatInput.trim() || isChatLoading) return;

      const userMessage = chatInput.trim();
      setChatInput("");
      setChatError("");
      setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
      setIsChatLoading(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            videoId,
            message: userMessage,
            history: messages,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "通信エラーが発生しました");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.message },
        ]);
      } catch (err: any) {
        setChatError(err.message);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `エラー: ${err.message}` },
        ]);
      } finally {
        setIsChatLoading(false);
      }
    },
    [chatInput, isChatLoading, videoId, messages],
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isChatLoading]);

  return {
    activeTab,
    setActiveTab,
    aiLoading,
    aiError,
    aiStatus,
    summaryMode,
    currentAIData,
    lightningData,
    deepData,
    quizAnswers,
    setQuizAnswers,
    quizRevealed,
    setQuizRevealed,
    messages,
    chatInput,
    setChatInput,
    isChatLoading,
    chatError,
    chatEndRef,
    handleModeChange,
    generateAI,
    handleQuizAnswer,
    handleSendMessage,
  };
}
