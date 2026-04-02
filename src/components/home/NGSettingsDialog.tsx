'use client';

import { Settings2, Ban, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type NGSettingsDialogProps = {
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  handleOpenChange: (open: boolean) => void;
  isLocked: boolean;
  unlockAttempt: string;
  setUnlockAttempt: (v: string) => void;
  handleUnlock: () => void;
  ngWords: string;
  setNgWords: (v: string) => void;
  newWord: string;
  setNewWord: (v: string) => void;
  handleAddWord: () => void;
  ngChannels: string;
  setNgChannels: (v: string) => void;
  newChannel: string;
  setNewChannel: (v: string) => void;
  handleAddChannel: () => void;
  ngPassword: string;
  setNgPassword: (v: string) => void;
  generateRandomPassword: (type: 'pin' | 'alpha') => void;
  saveSettings: () => void;
};

export function NGSettingsDialog({
  isDialogOpen,
  setIsDialogOpen,
  handleOpenChange,
  isLocked,
  unlockAttempt,
  setUnlockAttempt,
  handleUnlock,
  ngWords,
  setNgWords,
  newWord,
  setNewWord,
  handleAddWord,
  ngChannels,
  setNgChannels,
  newChannel,
  setNewChannel,
  handleAddChannel,
  ngPassword,
  setNgPassword,
  generateRandomPassword,
  saveSettings,
}: NGSettingsDialogProps) {
  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md bg-background border-border text-foreground max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-indigo-400" />
            NG検索除外設定
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            学習に関係ない動画を検索結果から非表示にします。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {isLocked ? (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="bg-muted/30 border border-border rounded-2xl p-4 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NGワード (ロック中)</Label>
                  <p className="text-sm bg-card border border-border p-3 rounded-xl min-h-[60px] break-words text-foreground/60">
                    {ngWords || "未設定"}
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="NGワードを追加..." 
                      value={newWord} 
                      onChange={e => setNewWord(e.target.value)}
                      className="h-10 bg-card border-border rounded-xl text-sm"
                    />
                    <Button size="sm" onClick={handleAddWord} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl">追加</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NGチャンネル (ロック中)</Label>
                  <p className="text-sm bg-card border border-border p-3 rounded-xl min-h-[60px] break-words text-foreground/60">
                    {ngChannels || "未設定"}
                  </p>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="チャンネル名を追加..." 
                      value={newChannel} 
                      onChange={e => setNewChannel(e.target.value)}
                      className="h-10 bg-card border-border rounded-xl text-sm"
                    />
                    <Button size="sm" onClick={handleAddChannel} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl">追加</Button>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-indigo-400">設定の変更・解除</Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    placeholder="パスワードを入力..." 
                    value={unlockAttempt} 
                    onChange={e => setUnlockAttempt(e.target.value)}
                    className="h-10 bg-card border-indigo-500/30 rounded-xl"
                  />
                  <Button onClick={handleUnlock} className="bg-indigo-600 hover:bg-indigo-500 rounded-xl">解除</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NGワード (カンマ区切り)</Label>
                <textarea
                  className="w-full h-24 bg-card border border-border rounded-2xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  value={ngWords}
                  onChange={(e) => setNgWords(e.target.value)}
                  placeholder="例: ゲーム, アニメ, 漫画, バラエティ..."
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">NGチャンネル名 (カンマ区切り)</Label>
                <textarea
                  className="w-full h-24 bg-card border border-border rounded-2xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all resize-none"
                  value={ngChannels}
                  onChange={(e) => setNgChannels(e.target.value)}
                  placeholder="例: YouTubeチャンネルA, チャンネルB..."
                />
              </div>

              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">ロックパスワード (任意)</Label>
                  <Input
                    type="text"
                    placeholder="解除用のパスワード（設定すると強固にガードします）"
                    value={ngPassword}
                    onChange={(e) => setNgPassword(e.target.value)}
                    className="h-11 bg-card border-border rounded-xl"
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => generateRandomPassword('pin')} className="rounded-xl border-border hover:bg-muted text-[10px] font-bold uppercase tracking-widest">
                    数字4桁生成
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => generateRandomPassword('alpha')} className="rounded-xl border-border hover:bg-muted text-[10px] font-bold uppercase tracking-widest">
                    英数8桁生成
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end pt-4 border-t border-border">
          <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="rounded-xl">キャンセル</Button>
          <Button 
            disabled={isLocked}
            onClick={saveSettings}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl px-8 shadow-lg shadow-indigo-500/20"
          >
            保存する
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
