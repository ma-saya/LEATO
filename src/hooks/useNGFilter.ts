'use client';

import { useState, useEffect, useCallback } from 'react';

export type SearchResultItem = {
  id: { kind: string; videoId?: string; playlistId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      medium: { url: string };
    };
  };
};

export function useNGFilter() {
  const [ngWords, setNgWords] = useState('');
  const [ngChannels, setNgChannels] = useState('');
  const [ngPassword, setNgPassword] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [unlockAttempt, setUnlockAttempt] = useState('');
  const [newWord, setNewWord] = useState('');
  const [newChannel, setNewChannel] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastBlockedChannel, setLastBlockedChannel] = useState<string | null>(null);

  useEffect(() => {
    const savedWords = localStorage.getItem('leato_ng_words');
    const savedChannels = localStorage.getItem('leato_ng_channels');
    const savedPassword = localStorage.getItem('leato_ng_password');
    if (savedWords) setNgWords(savedWords);
    if (savedChannels) setNgChannels(savedChannels);
    if (savedPassword) {
      setNgPassword(savedPassword);
      setIsLocked(true);
    }
  }, []);

  const filterVideos = useCallback((items: SearchResultItem[], currentWords: string, currentChannels: string, undoChannel?: string | null) => {
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

  const saveSettings = (rawVideos: SearchResultItem[], setVideos: (v: SearchResultItem[]) => void) => {
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
    return updated;
  };

  const handleAddChannel = () => {
    if (!newChannel.trim()) return;
    const updated = ngChannels ? `${ngChannels}, ${newChannel.trim()}` : newChannel.trim();
    setNgChannels(updated);
    localStorage.setItem('leato_ng_channels', updated);
    setNewChannel('');
    return updated;
  };

  const handleBlockChannelInline = (channelName: string, rawVideos: SearchResultItem[], setVideos: (v: SearchResultItem[]) => void) => {
    const cleanChannelName = channelName.trim();
    const updated = ngChannels ? `${ngChannels}, ${cleanChannelName}` : cleanChannelName;
    setNgChannels(updated);
    localStorage.setItem('leato_ng_channels', updated);
    
    setLastBlockedChannel(cleanChannelName);
    const newFilteredVideos = filterVideos(rawVideos, ngWords, updated, cleanChannelName);
    setVideos(newFilteredVideos);
  };

  const handleUndoBlock = (rawVideos: SearchResultItem[], setVideos: (v: SearchResultItem[]) => void) => {
    if (!lastBlockedChannel) return;

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

  const handleDismissUndo = (rawVideos: SearchResultItem[], setVideos: (v: SearchResultItem[]) => void) => {
    setLastBlockedChannel(null);
    const newFilteredVideos = filterVideos(rawVideos, ngWords, ngChannels, null);
    setVideos(newFilteredVideos);
  };

  const handleUnlock = () => {
    if (unlockAttempt === ngPassword) {
      setIsLocked(false);
      setUnlockAttempt('');
      return true;
    } else {
      alert('パスワードが間違っています。');
      return false;
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

  return {
    ngWords, setNgWords,
    ngChannels, setNgChannels,
    ngPassword, setNgPassword,
    isLocked, setIsLocked,
    unlockAttempt, setUnlockAttempt,
    newWord, setNewWord,
    newChannel, setNewChannel,
    isDialogOpen, setIsDialogOpen,
    lastBlockedChannel,
    filterVideos,
    handleOpenChange,
    saveSettings,
    handleAddWord,
    handleAddChannel,
    handleBlockChannelInline,
    handleUndoBlock,
    handleDismissUndo,
    handleUnlock,
    generateRandomPassword,
  };
}
