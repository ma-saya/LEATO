'use client';

import { BookOpen, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { AIData } from '@/hooks/useWatchAI';
import { cn } from '@/lib/utils';

type QuizTabProps = {
  activeTab: string;
  currentAIData: AIData | null;
  quizAnswers: Record<number, number>;
  quizRevealed: Record<number, boolean>;
  onAnswer: (qIdx: number, optIdx: number) => void;
};

export function QuizTab({
  activeTab,
  currentAIData,
  quizAnswers,
  quizRevealed,
  onAnswer,
}: QuizTabProps) {
  if (activeTab !== 'quiz') return null;

  if (!currentAIData || !currentAIData.quiz || currentAIData.quiz.length === 0) {
    return (
      <div className="py-20 text-center space-y-6 px-4 animate-in fade-in duration-500">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
          <BookOpen className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold opacity-50">クイズはまだ生成されていません</h3>
          <p className="text-sm text-muted-foreground">
            まずは「AI要約」タブから要約を生成してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          理解度チェック ({currentAIData.quiz.length}問)
        </h3>
        {Object.keys(quizRevealed).length > 0 && (
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-black">
            進行中: {Object.keys(quizRevealed).length} / {currentAIData.quiz.length}
          </span>
        )}
      </div>

      <div className="space-y-10">
        {currentAIData.quiz.map((q, qIdx) => {
          const isRevealed = quizRevealed[qIdx];
          const selectedIdx = quizAnswers[qIdx];
          const isCorrect = selectedIdx === q.correctIndex;

          return (
            <div key={qIdx} className="space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">Question {qIdx + 1}</span>
                <p className="text-sm font-bold leading-relaxed">{q.question}</p>
              </div>

              <div className="grid gap-2">
                {q.options.map((opt, optIdx) => {
                  const isThisSelected = selectedIdx === optIdx;
                  const isThisCorrect = optIdx === q.correctIndex;

                  let buttonClass = "w-full text-left p-3.5 rounded-xl text-sm transition-all border-2 ";
                  let icon = null;

                  if (isRevealed) {
                    if (isThisCorrect) {
                      buttonClass += "bg-emerald-500/10 border-emerald-500/50 text-emerald-400 font-bold";
                      icon = <CheckCircle className="w-4 h-4 shrink-0" />;
                    } else if (isThisSelected) {
                      buttonClass += "bg-red-500/10 border-red-500/50 text-red-400 font-bold";
                      icon = <XCircle className="w-4 h-4 shrink-0" />;
                    } else {
                      buttonClass += "bg-muted/30 border-border/50 opacity-40";
                    }
                  } else {
                    buttonClass += "bg-card border-border hover:border-indigo-500/50 hover:bg-muted/50";
                  }

                  return (
                    <button
                      key={optIdx}
                      disabled={isRevealed}
                      onClick={() => onAnswer(qIdx, optIdx)}
                      className={cn(buttonClass, "flex items-center justify-between gap-3")}
                    >
                      <span>{opt}</span>
                      {icon}
                    </button>
                  );
                })}
              </div>

              {isRevealed && (
                <div className={cn(
                  "p-4 rounded-2xl border animate-in slide-in-from-top-2 duration-300",
                  isCorrect ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
                )}>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className={cn("w-3.5 h-3.5", isCorrect ? "text-emerald-400" : "text-amber-400")} />
                    <span className="text-xs font-black uppercase tracking-widest">
                      {isCorrect ? "正解！" : "惜しい！"} 解説
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/80 font-medium">{q.explanation}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
