'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Search, Loader2, Settings2, Ban, Heart, Clock, X, Plus, FolderOpen, Trash2, BookOpen, BarChart3, Calendar, PenLine, Settings as SettingsIcon, LogOut, LogIn, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import Link from 'next/link';
import { 
  BarChart as ReBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { format, subDays, startOfToday, isWithinInterval } from 'date-fns';
import { v4 as generateUUID } from 'uuid';
import { getFavorites, getHistory, removeFavorite, removeFromHistory, addFavorite, isFavorite, getCategories, addCategory, removeCategory, addSubfolder, getSubfolders, getTopLevelCategories, getFavoritesInPath, updateFavoriteCategory, DEFAULT_CATEGORY, type SavedVideo } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'];

import { getLogs, getTodos, getSettings, saveLog, saveTodo, updateTodo } from '@/lib/stacklog-store';
import { calculateStreak, getLocalDateString, getTodaysTotalMinutes } from '@/lib/stacklog-logic';
import type { Log, Todo, Settings } from '@/types/stacklog';
import { TaskActionModal, type TaskActionData } from '@/components/TaskActionModal';
import { Badge } from '@/components/ui/badge';
import { Flame, CalendarCheck, CheckSquare, Clock as ClockIcon, ArrowRight, TrendingUp } from 'lucide-react';

type SearchResultItem = {
  id: { kind: string; videoId?: string; playlistId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: { url: string };
    };
  };
};

function HomeContent() {
  const router = useRouter();
  const urlParams = useSearchParams();
  const authSupabase = createClient();

  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  
  const [query, setQuery] = useState('');
  const [searchType, setSearchType] = useState<'video' | 'playlist' | 'favorites' | 'history'>('video');
  const [isSlDrawerOpen, setIsSlDrawerOpen] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [rawVideos, setRawVideos] = useState<SearchResultItem[]>([]);
  const [videos, setVideos] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Favorites & History
  const [favorites, setFavorites] = useState<SavedVideo[]>([]);
  const [history, setHistory] = useState<SavedVideo[]>([]);
  const [categories, setCategories] = useState<string[]>([DEFAULT_CATEGORY]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [favPickerOpenFor, setFavPickerOpenFor] = useState<string | null>(null); // video id for which category picker is open

  // URL Import
  const [urlInput, setUrlInput] = useState('');
  const [urlCategory, setUrlCategory] = useState('auto');
  const [isUrlAdding, setIsUrlAdding] = useState(false);


    // NG Settings
    const [ngWords, setNgWords] = useState('');
    const [ngChannels, setNgChannels] = useState('');
    const [ngPassword, setNgPassword] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    
    const [isLocked, setIsLocked] = useState(false);
    const [unlockAttempt, setUnlockAttempt] = useState('');
    const [newWord, setNewWord] = useState('');
    const [newChannel, setNewChannel] = useState('');

    // --- StackLog State ---
    const [slLogs, setSlLogs] = useState<Log[]>([]);
    const [slTodos, setSlTodos] = useState<Todo[]>([]);
    const [slSettings, setSlSettings] = useState<Settings | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'complete' | 'edit' | 'create'>('create');
    const [selectedTodo, setSelectedTodo] = useState<Todo | null>(null);

    const loadSlData = async () => {
      try {
        const [fetchedLogs, fetchedTodos, fetchedSettings] = await Promise.all([
          getLogs(),
          getTodos(),
          getSettings()
        ]);
        setSlLogs(fetchedLogs);
        setSlTodos(fetchedTodos);
        setSlSettings(fetchedSettings);
      } catch (err) {
        console.error("Failed to load StackLog data:", err);
      }
    };

    const handleTaskAction = async (data: TaskActionData) => {
      try {
        if (modalMode === 'complete' && selectedTodo) {
          const logId = generateUUID();
          const log: Log = {
            id: logId,
            date: getLocalDateString(),
            did: data.text,
            learned: data.details || undefined,
            minutes: data.minutes || 0,
            category: data.category || 'その他',
            tags: ['タスク完了'],
            createdAt: new Date().toISOString(),
            startTime: data.startTime,
            endTime: data.endTime,
          };
          await saveLog(log);

          const isRecurring = selectedTodo.scheduleType === 'daily' || selectedTodo.scheduleType === 'weekdays';
          const updated: Todo = {
            ...selectedTodo,
            text: data.text,
            details: data.details,
            minutes: data.minutes,
            category: data.category,
            completed: isRecurring ? false : true,
            completedAt: new Date().toISOString(),
            relatedLogId: logId,
          };
          await updateTodo(updated);
        } else if (modalMode === 'create') {
          const newTodo: Todo = {
            id: generateUUID(),
            text: data.text,
            details: data.details || undefined,
            minutes: data.minutes,
            category: data.category || undefined,
            completed: false,
            createdAt: new Date().toISOString(),
            priority: data.priority,
            scheduleType: data.scheduleType || 'none',
            dueDate: data.dueDate,
            scheduleDays: data.scheduleDays,
            startTime: data.startTime,
            endTime: data.endTime,
          };
          await saveTodo(newTodo);
        }
        await loadSlData();
      } catch (err) {
        console.error("Task action failed:", err);
      }
    };

    const handleOpenCompleteModal = (todo: Todo) => {
      setSelectedTodo(todo);
      setModalMode('complete');
      setIsModalOpen(true);
    };

    const handleLogout = async () => {
      await authSupabase.auth.signOut();
      router.push('/login');
      router.refresh();
    };

    // Load from local storage
    useEffect(() => {
      // ユーザー情報を取得
      authSupabase.auth.getUser().then(({ data: { user } }) => {
        setCurrentUser(user);
      });

      loadSlData();
    const savedWords = localStorage.getItem('leato_ng_words');
    const savedChannels = localStorage.getItem('leato_ng_channels');
    const savedPassword = localStorage.getItem('leato_ng_password');
    if (savedWords) setNgWords(savedWords);
    if (savedChannels) setNgChannels(savedChannels);
    if (savedPassword) {
      setNgPassword(savedPassword);
      setIsLocked(true);
    }
    setFavorites(getFavorites());
    setHistory(getHistory());
    setCategories(getCategories());
    
    // URL Params
    const urlQ = urlParams.get('q');
    const urlType = (urlParams.get('type') as 'video' | 'playlist' | 'favorites' | 'history');
    if (urlQ) setQuery(urlQ);
    if (urlType) setSearchType(urlType);
    
    setHasMounted(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (open) {
      if (localStorage.getItem('leato_ng_password')) {
        setIsLocked(true);
      } else {
        setIsLocked(false);
      }
      setUnlockAttempt('');
      setNewWord('');
      setNewChannel('');
    }
  };

  const saveSettings = () => {
    localStorage.setItem('leato_ng_words', ngWords);
    localStorage.setItem('leato_ng_channels', ngChannels);
    if (ngPassword) {
      localStorage.setItem('leato_ng_password', ngPassword);
    } else {
      localStorage.removeItem('leato_ng_password');
    }
    setIsDialogOpen(false);
    setLastBlockedChannel(null);
    
    if (rawVideos.length > 0) {
      const filteredVideos = filterVideos(rawVideos, ngWords, ngChannels, null);
      setVideos(filteredVideos);
    }
  };

  const handleAddWord = () => {
    if (!newWord.trim()) return;
    const updated = ngWords ? `${ngWords}, ${newWord.trim()}` : newWord.trim();
    setNgWords(updated);
    localStorage.setItem('leato_ng_words', updated);
    setNewWord('');
  };

  const handleAddChannel = () => {
    if (!newChannel.trim()) return;
    const updated = ngChannels ? `${ngChannels}, ${newChannel.trim()}` : newChannel.trim();
    setNgChannels(updated);
    localStorage.setItem('leato_ng_channels', updated);
    setNewChannel('');
  };

  // Block handling
  const [lastBlockedChannel, setLastBlockedChannel] = useState<string | null>(null);

  const handleAddFromUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || isUrlAdding) return;

    setIsUrlAdding(true);
    try {
      let id = '';
      let type: 'video' | 'playlist' | null = null;
      
      const urlStr = urlInput.trim();
      let urlObj: URL;
      try {
        urlObj = new URL(urlStr);
      } catch {
        throw new Error('正しいURLを入力してください（例: https://www.youtube.com/...）');
      }

      const hostname = urlObj.hostname.toLowerCase();
      
      if (hostname.includes('youtu.be')) {
        id = urlObj.pathname.slice(1).split('?')[0];
        type = 'video';
      } else if (hostname.includes('youtube.com')) {
        const params = new URLSearchParams(urlObj.search);
        if (params.has('list')) {
          id = params.get('list')!;
          type = 'playlist';
        } else if (params.has('v')) {
          id = params.get('v')!;
          type = 'video';
        } else if (urlObj.pathname.startsWith('/shorts/')) {
          id = urlObj.pathname.split('/shorts/')[1].split('?')[0];
          type = 'video';
        }
      }

      if (!id || !type) {
        throw new Error('有効なYouTubeの動画または再生リストのURLが見つかりませんでした。');
      }

      const res = await fetch(`/api/youtube/details?id=${id}&type=${type}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || '動画情報の取得に失敗しました。URLが正しいか確認してください。');
      }

      const categoryToSave = urlCategory === 'auto' 
        ? (selectedCategory === 'all' ? DEFAULT_CATEGORY : selectedCategory)
        : urlCategory;
        
      addFavorite({
        id: data.id,
        title: data.title,
        channelTitle: data.channelTitle,
        thumbnailUrl: data.thumbnailUrl,
        isPlaylist: data.isPlaylist,
        savedAt: Date.now()
      }, categoryToSave);
      
      setFavorites(getFavorites());
      setUrlInput('');
    } catch (err: any) {
      window.alert(err.message || 'エラーが発生しました');
    } finally {
      setIsUrlAdding(false);
    }
  };

  const handleBlockChannelInline = (e: React.MouseEvent, channelName: string) => {
    e.preventDefault(); 
    e.stopPropagation();

    const cleanChannelName = channelName.trim();
    // Add to NG channels
    const updated = ngChannels ? `${ngChannels}, ${cleanChannelName}` : cleanChannelName;
    setNgChannels(updated);
    localStorage.setItem('leato_ng_channels', updated);
    
    // Update displayed videos immediately
    setLastBlockedChannel(cleanChannelName);
    const newFilteredVideos = filterVideos(rawVideos, ngWords, updated, cleanChannelName);
    setVideos(newFilteredVideos);
  };

  const handleUndoBlock = () => {
    if (!lastBlockedChannel) return;

    // Remove the last blocked channel from the NG channels string
    const channelsArray = ngChannels.split(',').map(c => c.trim()).filter(c => c !== '');
    const updatedArray = channelsArray.filter(c => c !== lastBlockedChannel);
    const updated = updatedArray.join(', ');

    setNgChannels(updated);
    if (updated) {
      localStorage.setItem('leato_ng_channels', updated);
    } else {
      localStorage.removeItem('leato_ng_channels');
    }

    setLastBlockedChannel(null);
    const newFilteredVideos = filterVideos(rawVideos, ngWords, updated, null);
    setVideos(newFilteredVideos);
  };

  const handleDismissUndo = () => {
    setLastBlockedChannel(null);
    const newFilteredVideos = filterVideos(rawVideos, ngWords, ngChannels, null);
    setVideos(newFilteredVideos);
  };

  const handleUnlock = () => {
    if (unlockAttempt === ngPassword) {
      setIsLocked(false);
      setUnlockAttempt('');
    } else {
      alert('パスワードが間違っています。');
    }
  };

  const generateRandomPassword = (type: 'pin' | 'alpha') => {
    const confirmMsg = "【警告】ランダムパスワードを生成しますか？\nメモを取らない場合、二度とNG設定を解除（削除）できなくなります。";
    if (!window.confirm(confirmMsg)) return;

    let pwd = '';
    if (type === 'pin') {
      pwd = Math.floor(1000 + Math.random() * 9000).toString();
    } else {
      pwd = Math.random().toString(36).substring(2, 10).padEnd(8, 'a');
    }
    
    window.alert(`生成されたパスワードは\n\n「 ${pwd} 」\n\nです。必ずメモしてください！`);
    setNgPassword(pwd);
  };

  const filterVideos = (items: SearchResultItem[], currentWords: string, currentChannels: string, undoChannel?: string | null) => {
    const words = currentWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
    let channels = currentChannels.split(',').map(c => c.trim().toLowerCase()).filter(c => c);

    if (undoChannel) {
      channels = channels.filter(c => c !== undoChannel.toLowerCase());
    }

    return items.filter(video => {
      const title = video.snippet.title.toLowerCase();
      const channel = video.snippet.channelTitle.toLowerCase();

      const hasNgWord = words.some(w => title.includes(w));
      const hasNgChannel = channels.some(c => channel.includes(c));

      return !hasNgWord && !hasNgChannel;
    });
  };

  const executeSearch = useCallback(async (typeToSearch: 'video' | 'playlist', queryToSearch: string) => {
    if (!queryToSearch.trim()) return;

    setLastBlockedChannel(null);

    // ----- Search Query Filtering -----
    const qLower = queryToSearch.toLowerCase();
    const words = ngWords.split(',').map(w => w.trim().toLowerCase()).filter(w => w);
    const channels = ngChannels.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
    
    const isNgQuery = words.some(w => qLower.includes(w)) || channels.some(c => qLower.includes(c));
    
    if (isNgQuery) {
      setError('検索したキーワードにNG設定（ワードまたはチャンネル）が含まれているため、検索できません。');
      setVideos([]);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(queryToSearch)}&type=${typeToSearch}`);
      if (!res.ok) throw new Error('データの検索に失敗しました');

      const data = await res.json();
      setRawVideos(data.items || []);
      
      const filteredVideos = filterVideos(data.items || [], ngWords, ngChannels);
      setVideos(filteredVideos);
      
      if (data.items?.length > 0 && filteredVideos.length === 0) {
        setError('検索結果がありましたが、すべてNG設定により非表示になりました。');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '予期せぬエラーが発生しました');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ngWords, ngChannels]);

    // --- StackLog Drawer ---
  const slStreak = useMemo(() => calculateStreak(slLogs), [slLogs]);
  const slTodayMinutes = useMemo(() => getTodaysTotalMinutes(slLogs), [slLogs]);
  const slDailyGoal = slSettings?.dailyGoal || 120;
  const slTotalMinutes = useMemo(() => slLogs.reduce((acc, l) => acc + l.minutes, 0), [slLogs]);
  const slSortedLogs = useMemo(() => [...slLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [slLogs]);
  const slIncompleteTodos = useMemo(() => slTodos.filter(t => !t.completed), [slTodos]);

  const StackLogDrawer = () => {
    if (!isSlDrawerOpen) return null;

    return (
      <>
        {/* Overlay */}
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsSlDrawerOpen(false)}
        />
        {/* Drawer Panel */}
        <div className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-background border-l border-border z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
          {/* Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-indigo-600/20 rounded-lg">
                <BookOpen className="h-4 w-4 text-indigo-400" />
              </div>
              <h2 className="font-bold text-lg">StackLog</h2>
            </div>
            <button 
              onClick={() => setIsSlDrawerOpen(false)}
              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-foreground0">連続学習</span>
                  <Flame className="h-3.5 w-3.5 text-orange-500" />
                </div>
                <div className="text-xl font-bold">{slStreak} <span className="text-sm font-normal text-foreground0">日</span></div>
              </div>
              <div className={cn(
                "bg-card border border-border rounded-xl p-4 transition-colors",
                slTodayMinutes > 0 && "border-indigo-500/30 bg-indigo-500/5"
              )}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-foreground0">今日の目標</span>
                  <CalendarCheck className={cn("h-3.5 w-3.5", slTodayMinutes > 0 ? "text-indigo-400" : "text-foreground0")} />
                </div>
                <div className="text-xl font-bold">{slDailyGoal > 0 ? `${Math.round((slTodayMinutes / slDailyGoal) * 100)}%` : '—'}</div>
                <div className="mt-1.5 h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-700" style={{ width: `${Math.min((slTodayMinutes / slDailyGoal) * 100, 100)}%` }} />
                </div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-foreground0">今日</span>
                  <ClockIcon className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <div className="text-xl font-bold">{slTodayMinutes} <span className="text-sm font-normal text-foreground0">分</span></div>
              </div>
              <div className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-foreground0">累計</span>
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold">{slTotalMinutes} <span className="text-sm font-normal text-foreground0">分</span></div>
              </div>
            </div>

            {/* Task List */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold flex items-center gap-1.5">
                  <CheckSquare className="h-3.5 w-3.5 text-indigo-400" /> 未完了タスク
                  <span className="text-[10px] font-normal text-foreground0 bg-muted rounded-full px-1.5 py-0.5">{slIncompleteTodos.length}</span>
                </h3>
                <Link href="/tasks" onClick={() => setIsSlDrawerOpen(false)} className="text-[11px] text-indigo-400 hover:underline flex items-center">
                  管理 <ArrowRight className="ml-0.5 h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-1.5">
                {slIncompleteTodos.slice(0, 6).map(todo => (
                  <div key={todo.id} className="p-2.5 bg-card/80 border border-border/50 rounded-lg flex items-center justify-between group hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button 
                        onClick={() => handleOpenCompleteModal(todo)}
                        className="h-4 w-4 rounded border border-border hover:border-indigo-500 flex-shrink-0 flex items-center justify-center bg-card transition-colors"
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">{todo.text}</p>
                        {todo.category && (
                          <span className="text-[10px] text-muted-foreground">{todo.category}</span>
                        )}
                      </div>
                    </div>
                    {todo.minutes && <span className="text-[10px] text-muted-foreground flex-shrink-0 ml-2">{todo.minutes}分</span>}
                  </div>
                ))}
                {slIncompleteTodos.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border/50 rounded-lg">
                    タスクなし
                  </div>
                )}
              </div>
            </div>

            {/* Recent Logs */}
            <div>
              <h3 className="text-sm font-bold mb-3 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-amber-400" /> 最近のログ
              </h3>
              <div className="space-y-1.5">
                {slSortedLogs.slice(0, 5).map(log => (
                  <div key={log.id} className="p-2.5 bg-card/80 border border-border/50 rounded-lg flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium truncate">{log.did}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground">{log.category}</span>
                        <span className="text-[10px] text-border">•</span>
                        <span className="text-[10px] text-muted-foreground">{format(new Date(log.date), 'M/d')}</span>
                      </div>
                    </div>
                    <span className="text-[13px] font-bold text-foreground0 flex-shrink-0 ml-2">{log.minutes}分</span>
                  </div>
                ))}
                {slSortedLogs.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground text-xs border border-dashed border-border/50 rounded-lg">
                    ログなし
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Link
                href="/log/new"
                onClick={() => setIsSlDrawerOpen(false)}
                className="p-3 rounded-xl bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium hover:bg-indigo-600/20 transition-colors flex items-center justify-center gap-1.5"
              >
                <PenLine className="h-3.5 w-3.5" /> ログを記録
              </Link>
              <button
                onClick={() => {
                  setModalMode('create');
                  setSelectedTodo(null);
                  setIsModalOpen(true);
                }}
                className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/80 text-xs font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" /> タスク追加
              </button>
              <Link
                href="/stats"
                onClick={() => setIsSlDrawerOpen(false)}
                className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/80 text-xs font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <BarChart3 className="h-3.5 w-3.5" /> 統計レポート
              </Link>
              <Link
                href="/calendar"
                onClick={() => setIsSlDrawerOpen(false)}
                className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/80 text-xs font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <Calendar className="h-3.5 w-3.5" /> カレンダー
              </Link>
              <Link
                href="/tasks"
                onClick={() => setIsSlDrawerOpen(false)}
                className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/80 text-xs font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckSquare className="h-3.5 w-3.5" /> タスク管理
              </Link>
              <Link
                href="/sl-settings"
                onClick={() => setIsSlDrawerOpen(false)}
                className="p-3 rounded-xl bg-muted/50 border border-border/50 text-foreground/80 text-xs font-medium hover:bg-muted transition-colors flex items-center justify-center gap-1.5"
              >
                <SettingsIcon className="h-3.5 w-3.5" /> SL 設定
              </Link>
            </div>
          </div>
        </div>
      </>
    );
  };
  useEffect(() => {
    const urlQ = urlParams.get('q');
    const urlType = (urlParams.get('type') as 'video' | 'playlist' | 'favorites' | 'history') || 'video';
    // if user had old ?type=dashboard in URL, treat as video
    if (!['video', 'playlist', 'favorites', 'history'].includes(urlType)) {
      // skip
    } else
    if (urlQ && (urlType === 'video' || urlType === 'playlist')) {
      setQuery(urlQ);
      setSearchType(urlType);
      executeSearch(urlType, urlQ);
    } else if (urlType === 'favorites' || urlType === 'history') {
      setSearchType(urlType);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    let targetType: 'video' | 'playlist' = (searchType === 'video' || searchType === 'playlist') ? searchType : 'video';
    if (searchType === 'favorites' || searchType === 'history') {
      targetType = 'video';
      setSearchType('video');
    }

    // Update URL
    router.push(`/?q=${encodeURIComponent(query)}&type=${targetType}`, { scroll: false });
    executeSearch(targetType, query);
  };

  const handleTypeChange = (newType: 'video' | 'playlist' | 'favorites' | 'history') => {
    setSearchType(newType);
    if (newType === 'favorites' || newType === 'history') {
      router.push(`/?type=${newType}`, { scroll: false });
      return;
    }
    if (query.trim()) {
      router.push(`/?q=${encodeURIComponent(query)}&type=${newType}`, { scroll: false });
      executeSearch(newType, query);
    } else {
      router.push(`/?type=${newType}`, { scroll: false });
    }
  };

  if (!hasMounted) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header with Settings */}
        <div className="relative text-center space-y-4">
          <div className="absolute right-0 top-0 flex items-center gap-2">
            {/* User Info & Logout */}
            {currentUser ? (
              <div className="flex items-center gap-1.5">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-foreground0 bg-card border border-border rounded-lg px-2.5 py-1.5">
                  <User className="w-3 h-3" />
                  <span className="max-w-[120px] truncate">{currentUser.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleLogout}
                  className="bg-card border-border hover:bg-red-950 hover:border-red-800 text-muted-foreground hover:text-red-400 h-9 w-9 transition-colors"
                  title="ログアウト"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-card hover:bg-muted text-muted-foreground hover:text-white text-sm transition-colors"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">ログイン</span>
              </Link>
            )}
            {/* StackLog Button */}
            <Button 
              variant="outline" 
              onClick={() => setIsSlDrawerOpen(true)}
              className="bg-indigo-600/10 border-indigo-500/30 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 gap-1.5 h-9 px-3"
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline text-sm">StackLog</span>
              {slStreak > 0 && (
                <span className="text-[10px] bg-orange-500/20 text-orange-400 rounded-full px-1.5 py-0.5 font-bold flex items-center gap-0.5">
                  <Flame className="h-2.5 w-2.5" />{slStreak}
                </span>
              )}
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" className="bg-card border-border hover:bg-muted text-muted-foreground h-9 w-9">
                  <Settings2 className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-background border-border text-foreground max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>検索ノイズの除外設定 (NG設定)</DialogTitle>
                  <DialogDescription className="text-muted-foreground">
                    関係ない動画を隠します。カンマ(,)区切りで指定可能。
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {isLocked ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-foreground/80">NGワード (ロック中)</Label>
                        <div className="bg-card border border-border p-3 rounded-md min-h-[60px] text-sm text-muted-foreground break-words">
                          {ngWords || "（未設定）"}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input placeholder="追加するNGワード..." value={newWord} onChange={e => setNewWord(e.target.value)} className="h-9 bg-card border-border text-sm"/>
                          <Button size="sm" onClick={handleAddWord} className="bg-muted hover:bg-neutral-700">追加</Button>
                        </div>
                      </div>
                      <div className="space-y-2 mt-4">
                        <Label className="text-foreground/80">NGチャンネル名 (ロック中)</Label>
                        <div className="bg-card border border-border p-3 rounded-md min-h-[60px] text-sm text-muted-foreground break-words">
                          {ngChannels || "（未設定）"}
                        </div>
                        <div className="flex gap-2 mt-2">
                          <Input placeholder="追加するNGチャンネル..." value={newChannel} onChange={e => setNewChannel(e.target.value)} className="h-9 bg-card border-border text-sm"/>
                          <Button size="sm" onClick={handleAddChannel} className="bg-muted hover:bg-neutral-700">追加</Button>
                        </div>
                      </div>

                      <div className="mt-8 pt-4 border-t border-border space-y-2">
                         <Label className="text-foreground/80">設定の変更・削除 (ロック解除)</Label>
                         <div className="flex gap-2">
                           <Input type="password" value={unlockAttempt} onChange={e => setUnlockAttempt(e.target.value)} placeholder="パスワードを入力" className="h-9 bg-card border-border"/>
                           <Button size="sm" onClick={handleUnlock} className="bg-indigo-600 hover:bg-indigo-700">解除</Button>
                         </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="ng-words" className="text-foreground/80">NGワード (タイトルに含まれると除外)</Label>
                        <Textarea
                          id="ng-words"
                          placeholder="例: ゲーム実況, 歌ってみた, 切り抜き"
                          value={ngWords}
                          onChange={(e) => setNgWords(e.target.value)}
                          className="bg-card border-border h-24"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ng-channels" className="text-foreground/80">NGチャンネル名 (完全/部分一致で除外)</Label>
                        <Textarea
                          id="ng-channels"
                          placeholder="例: 〇〇エンタメチャンネル, 〇〇Games"
                          value={ngChannels}
                          onChange={(e) => setNgChannels(e.target.value)}
                          className="bg-card border-border h-24"
                        />
                      </div>

                      <div className="space-y-2 mt-4 border-t border-border pt-4">
                        <Label className="text-foreground/80">パスワードロック (NG設定の削除を制限)</Label>
                        <p className="text-xs text-foreground0 mb-2">パスワードを設定すると、次回からテキストの変更・削除ができなくなります（追加はいつでも可能）。空にするとロックが無効になります。</p>
                        <Input
                          type="text"
                          placeholder="カスタムパスワードを入力"
                          value={ngPassword}
                          onChange={(e) => setNgPassword(e.target.value)}
                          className="bg-card border-border"
                        />
                        <div className="flex gap-2 mt-2">
                          <Button variant="outline" size="sm" type="button" onClick={() => generateRandomPassword('pin')} className="text-xs bg-card border-border hover:bg-muted text-foreground/80">
                            数字4桁をランダム生成
                          </Button>
                          <Button variant="outline" size="sm" type="button" onClick={() => generateRandomPassword('alpha')} className="text-xs bg-card border-border hover:bg-muted text-foreground/80">
                            英数字をランダム生成
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button onClick={saveSettings} className="bg-indigo-600 hover:bg-indigo-700">
                    保存して閉じる
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <h1 
            onClick={() => {
              setQuery('');
              setVideos([]);
              setRawVideos([]);
              setError('');
              setLastBlockedChannel(null);
              setSearchType('video');
              router.push('/', { scroll: false });
              // Refresh favorites & history display
              setFavorites(getFavorites());
              setHistory(getHistory());
            }}
            className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent inline-block cursor-pointer hover:opacity-80 transition-opacity"
            title="ホームに戻る"
          >
            LEATO
          </h1>
          <p className="text-muted-foreground text-lg">
            誘惑を断ち切り、集中して学ぶためのYouTubeワークスペース
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex flex-col gap-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground0" />
              <Input 
                type="text"
                placeholder="学びたいテーマを検索（例: Next.js 入門）"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10 h-12 bg-card border-border focus-visible:ring-indigo-500 text-base"
              />
            </div>
            <Button type="submit" disabled={loading} className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : '検索'}
            </Button>
          </div>

          {/* View Mode Toggle */}
          <div className="flex justify-center flex-wrap gap-4">
            <Button 
              type="button"
              variant={searchType === 'video' ? 'default' : 'outline'} 
              onClick={() => handleTypeChange('video')}
              className={searchType === 'video' ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-muted-foreground hover:text-white border-border'}
            >
              🎥 動画を探す
            </Button>
            <Button 
              type="button"
              variant={searchType === 'playlist' ? 'default' : 'outline'} 
              onClick={() => handleTypeChange('playlist')}
              className={searchType === 'playlist' ? 'bg-indigo-600 hover:bg-indigo-700' : 'text-muted-foreground hover:text-white border-border'}
            >
              📁 再生リストを探す
            </Button>
            <Button 
              type="button"
              variant={searchType === 'favorites' ? 'default' : 'outline'} 
              onClick={() => handleTypeChange('favorites')}
              className={searchType === 'favorites' ? 'bg-pink-600 hover:bg-pink-700 text-white' : 'text-muted-foreground hover:text-pink-400 border-border'}
            >
              ❤️ お気に入り
            </Button>
             <Button 
               type="button"
               variant={searchType === 'history' ? 'default' : 'outline'} 
               onClick={() => handleTypeChange('history')}
               className={searchType === 'history' ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'text-muted-foreground hover:text-white border-border'}
             >
               🕑 履歴
             </Button>
           </div>
         </form>

        {/* Error Message */}
        {error && (
          <div className="text-red-400 text-center bg-red-950/30 p-4 rounded-lg border border-red-900/50">
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="h-48 w-full rounded-xl bg-card" />
                <Skeleton className="h-4 w-3/4 bg-card" />
                <Skeleton className="h-4 w-1/2 bg-card" />
              </div>
            ))}
          </div>
        )}

        {/* Video Grid */}
        {!loading && (searchType === 'video' || searchType === 'playlist') && videos.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-8">
            {videos.map((video) => {
              const itemId = video.id.videoId || video.id.playlistId;
              const isPlaylist = video.id.kind === 'youtube#playlist';
              const channelLow = video.snippet.channelTitle.trim().toLowerCase();
              const isJustBlocked = lastBlockedChannel && channelLow === lastBlockedChannel.toLowerCase();

              if (isJustBlocked) {
                return (
                  <div key={itemId} className="h-full relative group">
                    <Card className="bg-card border-border flex flex-col items-center justify-center p-6 text-center h-full min-h-[220px]">
                      <Ban className="w-8 h-8 text-border mb-3" />
                      <p className="text-muted-foreground text-sm mb-4">
                        「{video.snippet.channelTitle}」を<br/>非表示にしました
                      </p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={handleUndoBlock} className="bg-muted border-border hover:bg-neutral-700 text-xs text-neutral-200">
                          元に戻す
                        </Button>
                        <Button variant="ghost" size="sm" onClick={handleDismissUndo} className="text-foreground0 hover:text-muted-foreground text-xs">
                          閉じる
                        </Button>
                      </div>
                    </Card>
                  </div>
                );
              }

              return (
                <div key={itemId} className="h-full relative group">
                <Card className="bg-card border-border hover:border-indigo-500/50 transition-all overflow-hidden h-full flex flex-col">
                  
                  {/* Hover Action Buttons */}
                  <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    {/* Favorite Button */}
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className={`h-8 w-8 shadow-lg relative z-20 ${isFavorite(itemId || '') ? 'bg-pink-600/90 hover:bg-pink-600 text-white' : 'bg-muted/90 hover:bg-pink-600/90 text-foreground/80 hover:text-white'}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!itemId) return;
                        if (isFavorite(itemId)) {
                          removeFavorite(itemId);
                          setFavorites(getFavorites());
                          setFavPickerOpenFor(null);
                        } else {
                          setFavPickerOpenFor(favPickerOpenFor === itemId ? null : itemId);
                        }
                      }}
                      title={isFavorite(itemId || '') ? 'お気に入りから削除' : 'お気に入りに追加'}
                    >
                      <Heart className={`h-4 w-4 ${isFavorite(itemId || '') ? 'fill-current' : ''}`} />
                    </Button>
                    {/* Block Channel Button */}
                    <Button 
                      variant="destructive" 
                      size="icon" 
                      className="h-8 w-8 bg-red-600/90 hover:bg-red-600 shadow-lg relative z-20"
                      onClick={(e) => handleBlockChannelInline(e, video.snippet.channelTitle)}
                      title="このチャンネルをNGに追加（即座にブロック）"
                    >
                      <Ban className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Category Picker Popup */}
                  {favPickerOpenFor === itemId && (
                    <div className="absolute top-12 right-2 z-30 bg-card border border-border rounded-lg shadow-xl p-2 min-w-[160px] max-h-60 overflow-y-auto" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <p className="text-xs text-muted-foreground mb-2 px-1">カテゴリーを選択:</p>
                      {categories.map(cat => (
                        <button
                          key={cat}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!itemId) return;
                            addFavorite({
                              id: itemId,
                              title: video.snippet.title,
                              channelTitle: video.snippet.channelTitle,
                              thumbnailUrl: video.snippet.thumbnails.medium.url,
                              isPlaylist,
                              savedAt: Date.now(),
                            }, cat);
                            setFavorites(getFavorites());
                            setFavPickerOpenFor(null);
                          }}
                          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-indigo-600/50 text-neutral-200 flex items-center gap-2"
                        >
                          <FolderOpen className="w-3 h-3 text-foreground0" /> {cat}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Rest of the card is wrapped in a normal link */}
                  <Link href={`/watch/${itemId}?isPlaylist=${isPlaylist}&title=${encodeURIComponent(video.snippet.title)}&channel=${encodeURIComponent(video.snippet.channelTitle)}&thumb=${encodeURIComponent(video.snippet.thumbnails.medium.url)}`} className="flex-1 flex flex-col z-10">
                    <div className="relative aspect-video overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={video.snippet.thumbnails.medium.url}
                        alt={video.snippet.title}
                        onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${itemId}/mqdefault.jpg`; }}
                        className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                      {isPlaylist && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          📁 再生リスト
                        </div>
                      )}
                    </div>
                    <CardContent className="p-4 space-y-2 flex-1">
                      <h3 className="font-semibold text-neutral-100 line-clamp-2 leading-snug group-hover:text-indigo-400 transition-colors">
                        {video.snippet.title}
                      </h3>
                      <p className="text-sm text-foreground0">
                        {video.snippet.channelTitle}
                      </p>
                    </CardContent>
                  </Link>

                </Card>
              </div>
            );
            })}
          </div>
        )}

        {/* Render List View based on current tab */}
        {!loading && !error && (
          <div className="space-y-10 mt-8">
            
            {/* SEARCH RESULTS TAB EMPTY */}
            {(searchType === 'video' || searchType === 'playlist') && videos.length === 0 && (
              <div className="text-center py-20 text-foreground0">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>キーワードを入力して、学習用の動画を検索してください。</p>
                <p className="text-sm mt-2 opacity-70">※教育カテゴリの動画かつ、NGワードを除外した検索結果が表示されます。</p>
              </div>
            )}

            {/* FAVORITES TAB */}
            {searchType === 'favorites' && (() => {
              const subfolders = selectedCategory === 'all' 
                ? getTopLevelCategories() 
                : getSubfolders(selectedCategory);
              const directFavs = selectedCategory === 'all' 
                ? favorites 
                : favorites.filter(v => (v.category || DEFAULT_CATEGORY) === selectedCategory);
              const pathParts = selectedCategory === 'all' ? [] : selectedCategory.split('/');

              return (
              <section>
                {/* Header with add folder and URL Import */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 flex-wrap">
                  <h2 className="text-xl font-bold text-neutral-200 flex items-center gap-2 whitespace-nowrap">
                    <Heart className="w-5 h-5 text-pink-500 fill-current" /> お気に入り
                  </h2>

                  <div className="flex-1" />

                  {/* URL Import Form */}
                  <form onSubmit={handleAddFromUrl} className="flex gap-1 w-full sm:w-auto">
                    <select
                      value={urlCategory}
                      onChange={(e) => setUrlCategory(e.target.value)}
                      className="h-8 max-w-[150px] bg-card border border-border text-neutral-200 text-sm px-2 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="auto">現在の場所</option>
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <Input
                      type="text"
                      placeholder="YouTube URLを貼り付け..."
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      className="h-8 flex-1 sm:w-64 bg-card border-border text-sm"
                    />
                    <Button 
                      type="submit" 
                      disabled={isUrlAdding || !urlInput.trim()} 
                      className="h-8 px-3 bg-pink-600 hover:bg-pink-500 text-white text-xs shrink-0"
                    >
                      {isUrlAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : "追加"}
                    </Button>
                  </form>

                  {/* Add Folder */}
                  <div className="flex gap-1 w-full sm:w-auto">
                    <Input
                      type="text"
                      placeholder={selectedCategory === 'all' ? '新しいカテゴリー' : '新しいフォルダ'}
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newCategoryName.trim()) {
                            if (selectedCategory === 'all') {
                              setCategories(addCategory(newCategoryName.trim()));
                            } else {
                              setCategories(addSubfolder(selectedCategory, newCategoryName.trim()));
                            }
                            setNewCategoryName('');
                          }
                        }
                      }}
                      className="h-8 w-40 bg-card border-border text-sm"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-green-400"
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          if (selectedCategory === 'all') {
                            setCategories(addCategory(newCategoryName.trim()));
                          } else {
                            setCategories(addSubfolder(selectedCategory, newCategoryName.trim()));
                          }
                          setNewCategoryName('');
                        }
                      }}
                      title={selectedCategory === 'all' ? 'カテゴリーを追加' : 'フォルダを追加'}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Breadcrumb Navigation */}
                <div className="flex items-center gap-1 mb-4 text-sm flex-wrap">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-2 py-1 rounded hover:bg-muted transition-colors ${selectedCategory === 'all' ? 'text-pink-400 font-bold' : 'text-muted-foreground hover:text-white'}`}
                  >
                    📂 すべて
                  </button>
                  {pathParts.map((part, i) => {
                    const path = pathParts.slice(0, i + 1).join('/');
                    const isLast = i === pathParts.length - 1;
                    return (
                      <span key={path} className="flex items-center gap-1">
                        <span className="text-muted-foreground">/</span>
                        <button
                          onClick={() => setSelectedCategory(path)}
                          className={`px-2 py-1 rounded hover:bg-muted transition-colors ${isLast ? 'text-pink-400 font-bold' : 'text-muted-foreground hover:text-white'}`}
                        >
                          {part}
                        </button>
                      </span>
                    );
                  })}
                </div>

                {/* Subfolders Grid */}
                {subfolders.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
                    {subfolders.map((folder: string) => {
                      const fullPath = selectedCategory === 'all' ? folder : `${selectedCategory}/${folder}`;
                      const count = getFavoritesInPath(fullPath).length;
                      return (
                        <div key={folder} className="relative group">
                          <button
                            onClick={() => setSelectedCategory(fullPath)}
                            className="w-full bg-card border border-border hover:border-indigo-500/50 rounded-xl p-4 flex flex-col items-center gap-2 transition-all hover:bg-muted/50"
                          >
                            <FolderOpen className="w-8 h-8 text-indigo-400" />
                            <span className="text-sm text-neutral-200 font-medium truncate w-full text-center">{folder}</span>
                            <span className="text-xs text-foreground0">{count}件</span>
                          </button>
                          {fullPath !== DEFAULT_CATEGORY && (
                            <button
                              onClick={() => {
                                setCategories(removeCategory(fullPath));
                                setFavorites(getFavorites());
                              }}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-1 text-foreground0 hover:text-red-400"
                              title={`「${folder}」を削除`}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Videos in current path */}
                {directFavs.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {directFavs.map((v) => (
                      <div key={v.id} className="relative group">
                        <Card className="bg-card border-border hover:border-indigo-500/50 transition-all overflow-hidden">
                          <button 
                            onClick={() => { removeFavorite(v.id); setFavorites(getFavorites()); }}
                            className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-1 text-muted-foreground hover:text-red-400"
                            title="お気に入りから削除"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <Link href={`/watch/${v.id}?isPlaylist=${v.isPlaylist}&title=${encodeURIComponent(v.title)}&channel=${encodeURIComponent(v.channelTitle)}&thumb=${encodeURIComponent(v.thumbnailUrl)}`}>
                            <div className="relative aspect-video overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={v.thumbnailUrl} 
                                alt={v.title} 
                                onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`; }}
                                className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
                              />
                              {v.isPlaylist && (
                                <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">📁 再生リスト</div>
                              )}
                            </div>
                            <CardContent className="p-3">
                              <h3 className="font-semibold text-neutral-100 text-sm line-clamp-2">{v.title}</h3>
                              <div className="flex items-center justify-between mt-1">
                                <p className="text-xs text-foreground0">{v.channelTitle}</p>
                                <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{(v.category || DEFAULT_CATEGORY).split('/').pop()}</span>
                              </div>
                            </CardContent>
                          </Link>
                          {/* Category move dropdown */}
                          {categories.length > 1 && (
                            <div className="absolute bottom-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                              <select
                                value={v.category || DEFAULT_CATEGORY}
                                onChange={(e) => {
                                  updateFavoriteCategory(v.id, e.target.value);
                                  setFavorites(getFavorites());
                                }}
                                onClick={(e) => e.preventDefault()}
                                className="text-xs bg-black/80 border border-border rounded px-1 py-0.5 text-foreground/80 cursor-pointer max-w-[120px]"
                                title="移動先を変更"
                              >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          )}
                        </Card>
                      </div>
                    ))}
                  </div>
                ) : subfolders.length === 0 && (
                  <div className="text-center py-20 text-foreground0">
                    <Heart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>{selectedCategory === 'all' ? 'お気に入りに登録された動画はありません。' : `ここにはまだ動画がありません。`}</p>
                  </div>
                )}
              </section>
              );
            })()}

            {/* HISTORY TAB */}
            {searchType === 'history' && (
              <section>
                {history.length === 0 ? (
                  <div className="text-center py-20 text-foreground0">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>最近見た動画はありません。</p>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-neutral-200 flex items-center gap-2 mb-4">
                      <Clock className="w-5 h-5 text-indigo-400" /> 最近見た動画
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {history.slice(0, 30).map((v) => (
                        <div key={v.id} className="relative group">
                          <Card className="bg-card border-border hover:border-indigo-500/50 transition-all overflow-hidden">
                            <button 
                              onClick={() => { removeFromHistory(v.id); setHistory(getHistory()); }}
                              className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity bg-black/70 rounded-full p-1 text-muted-foreground hover:text-red-400"
                              title="履歴から削除"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <Link href={`/watch/${v.id}?isPlaylist=${v.isPlaylist}&title=${encodeURIComponent(v.title)}&channel=${encodeURIComponent(v.channelTitle)}&thumb=${encodeURIComponent(v.thumbnailUrl)}`}>
                              <div className="relative aspect-video overflow-hidden">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={v.thumbnailUrl} 
                                  alt={v.title} 
                                  onError={(e) => { e.currentTarget.src = `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`; }}
                                  className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
                                />
                                {v.isPlaylist && (
                                  <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">📁 再生リスト</div>
                                )}
                              </div>
                              <CardContent className="p-3">
                                <h3 className="font-semibold text-neutral-100 text-sm line-clamp-2">{v.title}</h3>
                                <p className="text-xs text-foreground0 mt-1">{v.channelTitle}</p>
                              </CardContent>
                            </Link>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

          </div>
        )}

      </div>

      <StackLogDrawer />

      <TaskActionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        mode={modalMode}
        todo={selectedTodo || undefined}
        categories={slSettings?.categories || ['その他']}
        onSubmit={handleTaskAction}
      />
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <HomeContent />
    </Suspense>
  );
}
