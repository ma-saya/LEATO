'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSettings, saveLog } from '@/lib/stacklog-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { v4 as generateUUID } from 'uuid';
import { getLocalDateString } from '@/lib/stacklog-logic';

export default function NewLogPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Form State
  const [date] = useState(getLocalDateString());
  const [did, setDid] = useState('');
  // const [minutes, setMinutes] = useState('60'); // Default -> converted to hours/minutes
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('0');
  
  const [category, setCategory] = useState('');

  useEffect(() => {
    getSettings().then(settings => {
      setCategories(settings.categories);
      if (settings.categories.length > 0) {
        setCategory(settings.categories[0]);
      }
    });
  }, []);
  const [learned, setLearned] = useState('');
  const [next, setNext] = useState('');
  const [tags, setTags] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Create new log object
    const totalMinutes = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);

    const newLog = {
      id: generateUUID(),
      date: date,
      did: did,
      learned: learned,
      next: next,
      minutes: totalMinutes,
      category: category,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };

    // Save to local storage mock
    saveLog(newLog);

    // Simulate network delay for effect
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setIsLoading(false);
    router.push('/');
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Link href="/" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ArrowLeft className="mr-2 h-4 w-4" />
        ダッシュボードに戻る
      </Link>
      
      <Card>
        <CardHeader>
          <CardTitle>学習を記録する</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Did */}
            <div className="space-y-2">
              <Label htmlFor="did">やったこと <span className="text-red-500">*</span></Label>
              <Input 
                id="did" 
                placeholder="例: React Hooksの復習、英単語50個" 
                required 
                value={did}
                onChange={e => setDid(e.target.value)}
              />
            </div>

            {/* Minutes & Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>学習時間</Label>
                <div className="flex gap-2 items-center">
                    <div className="flex-1 relative">
                        <Input 
                            type="number" 
                            min="0"
                            value={hours}
                            onChange={e => setHours(e.target.value)}
                            className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">時間</span>
                    </div>
                    <div className="flex-1 relative">
                        <Input 
                            type="number" 
                            min="0"
                            max="59"
                            step="5"
                            value={minutes}
                            onChange={e => setMinutes(e.target.value)}
                            className="pr-8"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">分</span>
                    </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>カテゴリ</Label>
                <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      category === cat
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              </div>
            </div>

            {/* Learned */}
            <div className="space-y-2">
              <Label htmlFor="learned">学んだこと (任意)</Label>
              <Textarea 
                id="learned" 
                placeholder="例: optional chainingの意味を理解した" 
                value={learned}
                onChange={e => setLearned(e.target.value)}
              />
            </div>

            {/* Next */}
             <div className="space-y-2">
              <Label htmlFor="next">次やること (任意)</Label>
              <Input 
                id="next" 
                placeholder="例: 明日map/filter復習" 
                value={next}
                onChange={e => setNext(e.target.value)}
              />
            </div>
            
            {/* Tags */}
             <div className="space-y-2">
              <Label htmlFor="tags">タグ (任意)</Label>
              <Input 
                id="tags" 
                placeholder="カンマ区切り (例: hooks, 基礎)" 
                value={tags}
                onChange={e => setTags(e.target.value)}
              />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isLoading}>
              保存する
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
