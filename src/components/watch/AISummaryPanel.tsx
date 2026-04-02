"use client";

import { Sparkles, Zap, BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AIData } from "@/hooks/useWatchAI";

type AISummaryPanelProps = {
  activeTab: string;
  summaryMode: "lightning" | "deep";
  onModeChange: (mode: "lightning" | "deep") => void;
  currentAIData: AIData | null;
  aiLoading: boolean;
  aiError: string;
  aiStatus: string;
  onGenerate: () => void;
};

export function AISummaryPanel({
  activeTab,
  summaryMode,
  onModeChange,
  currentAIData,
  aiLoading,
  aiError,
  aiStatus,
  onGenerate,
}: AISummaryPanelProps) {
  if (activeTab !== "summary") return null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Mode Selector */}
      {!aiLoading && !aiError && (
        <div className="flex bg-black/20 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <button
            onClick={() => onModeChange("lightning")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              summaryMode === "lightning"
                ? "bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border border-yellow-500/30 shadow-lg shadow-yellow-500/10 scale-100"
                : "text-muted-foreground hover:text-white hover:bg-white/5 scale-95 hover:scale-100"
            }`}
          >
            <Zap
              className={`w-4 h-4 ${summaryMode === "lightning" ? "fill-yellow-500/40 text-yellow-400" : ""}`}
            />
            <span>Lightning</span>
          </button>
          <button
            onClick={() => onModeChange("deep")}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
              summaryMode === "deep"
                ? "bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 border border-indigo-500/30 shadow-lg shadow-indigo-500/10 scale-100"
                : "text-muted-foreground hover:text-white hover:bg-white/5 scale-95 hover:scale-100"
            }`}
          >
            <BrainCircuit
              className={`w-4 h-4 ${summaryMode === "deep" ? "fill-indigo-400/40 text-indigo-400" : ""}`}
            />
            <span>Deep</span>
          </button>
        </div>
      )}

      {/* Loading State */}
      {aiLoading && (
        <div className="py-12 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
            <Sparkles className="absolute inset-0 m-auto w-4 h-4 text-indigo-400 animate-pulse" />
          </div>
          <p className="text-sm font-medium animate-pulse text-indigo-400">
            {aiStatus || "AI分析中..."}
          </p>
        </div>
      )}

      {/* Error State */}
      {aiError && (
        <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center space-y-4">
          <p className="text-sm text-red-400 font-medium">{aiError}</p>
          <Button
            onClick={onGenerate}
            variant="outline"
            className="border-red-500/30 text-red-400 hover:bg-red-500/20 h-9 rounded-xl"
          >
            再試行する
          </Button>
        </div>
      )}

      {/* Initial State / No Data */}
      {!currentAIData && !aiLoading && !aiError && (
        <div className="py-16 mt-4 text-center space-y-8 px-6 bg-gradient-to-b from-indigo-500/5 to-transparent rounded-[2rem] border border-indigo-500/10 backdrop-blur-sm">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-white/5 transform rotate-3">
            <Sparkles className="w-10 h-10 text-indigo-400 drop-shadow-lg" />
          </div>
          <div className="space-y-3">
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-purple-400">
              学習のポイントを要約
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
              AIが動画の内容を分析し、重要なポイントやコード、アクションアイテムを抽出します。
            </p>
          </div>
          <Button
            onClick={onGenerate}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold h-12 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(99,102,241,0.5)] border border-white/10"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            要約を生成する
          </Button>
        </div>
      )}

      {/* Summary Content */}
      {currentAIData && !aiLoading && (
        <div className="space-y-7 pb-4">
          <div className="p-5 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl">
            <p className="text-[11px] font-black uppercase tracking-widest text-indigo-400/80 mb-2">
              この動画の要点
            </p>
            <h3 className="text-[17px] font-bold text-foreground leading-7 tracking-tight">
              {currentAIData.summary.headline}
            </h3>
          </div>

          <div className="space-y-4">
            {currentAIData.summary.sections.map((section, idx) => (
              <div
                key={idx}
                className="p-5 bg-card/45 backdrop-blur-md border border-white/10 rounded-2xl shadow-sm space-y-4"
              >
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 mt-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-[11px] font-black flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <h4 className="text-[15px] font-black tracking-tight text-foreground leading-6">
                    {section.title}
                  </h4>
                </div>
                <p className="text-[15px] leading-7 text-foreground/95 whitespace-pre-line break-words">
                  {section.content}
                </p>

                {section.importance && (
                  <div className="p-4 bg-indigo-500/8 border border-indigo-500/20 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-indigo-300">
                      <Zap className="w-4 h-4 text-yellow-400 shrink-0" />
                      <p className="text-[11px] font-black uppercase tracking-widest">
                        重要ポイント
                      </p>
                    </div>
                    <p className="text-sm text-foreground/90 leading-7 break-words">
                      {section.importance}
                    </p>
                  </div>
                )}

                {section.codeSnippet && (
                  <pre className="p-4 bg-black/65 rounded-xl overflow-x-auto border border-white/10 shadow-inner">
                    <code className="text-[13px] leading-6 font-mono text-indigo-200/95 tracking-normal whitespace-pre-wrap break-words">
                      {section.codeSnippet}
                    </code>
                  </pre>
                )}
              </div>
            ))}
          </div>

          {currentAIData.summary.takeaways && (
            <div className="space-y-3 pt-1">
              <h4 className="text-xs font-black uppercase tracking-wider text-muted-foreground px-1">
                まとめとアクション
              </h4>
              <ul className="space-y-2.5">
                {currentAIData.summary.takeaways.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 p-3.5 bg-card border border-border rounded-xl"
                  >
                    <span className="w-6 h-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-[10px] font-black text-indigo-300 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-[14px] leading-7 text-foreground/95 whitespace-pre-line break-words">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
