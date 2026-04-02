'use client';

import { Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { RefObject } from 'react';

type ChatTabProps = {
  activeTab: string;
  messages: { role: 'user' | 'assistant'; content: string }[];
  chatInput: string;
  setChatInput: (val: string) => void;
  isChatLoading: boolean;
  chatError: string;
  chatEndRef: RefObject<HTMLDivElement | null>;
  onSendMessage: (e?: React.FormEvent) => void;
};

export function ChatTab({
  activeTab,
  messages,
  chatInput,
  setChatInput,
  isChatLoading,
  chatError,
  chatEndRef,
  onSendMessage,
}: ChatTabProps) {
  if (activeTab !== 'chat') return null;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      <div className="flex-1 overflow-y-auto space-y-6 pb-4 scrollbar-hide">
        {messages.length === 0 && (
          <div className="py-12 text-center space-y-4 px-6">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto">
              <MessageCircle className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              動画の内容について、何でも質問してください。AIがあなたの学習をサポートします。
            </p>
          </div>
        )}

        {messages.map((m, idx) => (
          <div 
            key={idx} 
            className={cn(
              "flex flex-col space-y-2 max-w-[90%]",
              m.role === 'user' ? "ml-auto items-end" : "mr-auto items-start"
            )}
          >
            <div className={cn(
              "p-3.5 rounded-2xl text-sm leading-relaxed",
              m.role === 'user' 
                ? "bg-indigo-600 text-white rounded-tr-none shadow-md shadow-indigo-600/10" 
                : "bg-muted border border-border rounded-tl-none text-foreground/90 shadow-sm"
            )}>
              {m.content}
            </div>
            <span className="text-[10px] font-black uppercase text-muted-foreground/60 px-1">
              {m.role === 'user' ? 'YOU' : 'AI ASSISTANT'}
            </span>
          </div>
        ))}
        {isChatLoading && (
          <div className="mr-auto items-start space-y-2 animate-pulse">
            <div className="bg-muted border border-border p-3 rounded-2xl rounded-tl-none">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            </div>
          </div>
        )}
        {chatError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[10px] text-red-400 font-bold">
            エラー: {chatError}
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      <div className="pt-4 border-t border-border mt-auto">
        <form onSubmit={onSendMessage} className="relative group">
          <Input
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="AIに質問する..."
            className="pr-12 bg-muted/50 border-border focus:bg-muted h-12 rounded-2xl text-sm transition-all"
            disabled={isChatLoading}
          />
          <button
            type="submit"
            disabled={!chatInput.trim() || isChatLoading}
            className="absolute right-2 top-[calc(50%-18px)] h-9 w-9 bg-indigo-600 hover:bg-indigo-500 disabled:bg-muted disabled:text-muted-foreground text-white rounded-xl flex items-center justify-center transition-all shadow-lg shadow-indigo-600/20 active:scale-90"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
