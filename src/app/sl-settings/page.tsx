'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import { getSettings, saveSettings } from '@/lib/stacklog-store';
import type { Settings } from '@/types/stacklog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>({
    dailyGoal: 120,
    weeklyGoal: 840,
    categories: ['React', 'Next.js', 'TypeScript', 'TailwindCSS', '英語', '読書', 'その他'],
    categoryColors: {}
  });
  const [newCategory, setNewCategory] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState('#000000');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  const handleSave = async () => {
    await saveSettings(settings);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const value = newCategory.trim();
    if (!value) return;
    if (settings.categories.includes(value)) return;

    setSettings((prev) => ({
      ...prev,
      categories: [...prev.categories, value],
      categoryColors: {
        ...prev.categoryColors,
        [value]: newCategoryColor
      }
    }));
    setNewCategory('');
    setNewCategoryColor('#000000');
  };

  const handleColorChange = (category: string, color: string) => {
    setSettings((prev) => ({
      ...prev,
      categoryColors: {
        ...prev.categoryColors,
        [category]: color
      }
    }));
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const ok = confirm(
      `カテゴリ「${catToDelete}」を削除しますか？\n※既存ログは削除されません。新規作成時の候補から外れます。`
    );
    if (!ok) return;

    setSettings((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c !== catToDelete),
    }));
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          ダッシュボードに戻る
        </Link>
        <h1 className="text-2xl font-bold">設定</h1>
        <div className="w-20" />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>学習目標</CardTitle>
            <CardDescription>日次・週次の目標時間を設定します（単位: 分）。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label>1日の目標時間</Label>
              <div className="flex gap-2 items-center max-w-sm">
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min="0"
                    value={Math.floor(settings.dailyGoal / 60)}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value, 10) || 0;
                      const mins = settings.dailyGoal % 60;
                      setSettings({ ...settings, dailyGoal: hours * 60 + mins });
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">時間</span>
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={settings.dailyGoal % 60}
                    onChange={(e) => {
                      const hours = Math.floor(settings.dailyGoal / 60);
                      const mins = parseInt(e.target.value, 10) || 0;
                      setSettings({ ...settings, dailyGoal: hours * 60 + mins });
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">分</span>
                </div>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>1週間の目標時間</Label>
              <div className="flex gap-2 items-center max-w-sm">
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min="0"
                    value={Math.floor(settings.weeklyGoal / 60)}
                    onChange={(e) => {
                      const hours = parseInt(e.target.value, 10) || 0;
                      const mins = settings.weeklyGoal % 60;
                      setSettings({ ...settings, weeklyGoal: hours * 60 + mins });
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">時間</span>
                </div>
                <div className="flex-1 relative">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={settings.weeklyGoal % 60}
                    onChange={(e) => {
                      const hours = Math.floor(settings.weeklyGoal / 60);
                      const mins = parseInt(e.target.value, 10) || 0;
                      setSettings({ ...settings, weeklyGoal: hours * 60 + mins });
                    }}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">分</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>カテゴリ管理</CardTitle>
            <CardDescription>ログ入力やタスクで使うカテゴリを管理します。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <form onSubmit={handleAddCategory} className="flex gap-2 items-center">
              <div className="relative">
                <input
                  type="color"
                  value={newCategoryColor}
                  onChange={(e) => setNewCategoryColor(e.target.value)}
                  className="w-10 h-10 p-1 rounded cursor-pointer border border-input bg-background"
                />
              </div>
              <Input
                placeholder="新しいカテゴリを追加 (例: Python)"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="flex-1"
              />
              <Button type="submit" variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                追加
              </Button>
            </form>

            <div className="flex flex-wrap gap-2">
              {settings.categories.map((cat) => (
                <Badge key={cat} variant="outline" className="pl-1 pr-3 py-1 flex items-center gap-2 text-sm font-normal bg-card text-foreground border-border hover:bg-accent/50">
                  <input
                    type="color"
                    value={settings.categoryColors?.[cat] || '#000000'}
                    onChange={(e) => handleColorChange(cat, e.target.value)}
                    className="w-6 h-6 p-0 border-none rounded-full overflow-hidden cursor-pointer"
                    title="色を変更"
                  />
                  {cat}
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat)}
                    className="h-5 w-5 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 z-40">
          <div className="container max-w-2xl mx-auto flex justify-end">
            <Button onClick={handleSave} className="min-w-[120px]" disabled={isSaved}>
              {isSaved ? (
                '保存しました'
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" /> 設定を保存
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
