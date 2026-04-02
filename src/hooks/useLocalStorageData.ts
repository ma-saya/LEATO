'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  getFavorites, getHistory, removeFavorite as removeFavoriteFromStore, 
  removeFromHistory as removeFromHistoryStore, addFavorite as addFavoriteToStore, 
  isFavorite as checkIsFavorite, getCategories, addCategory as addCategoryToStore, 
  removeCategory as removeCategoryFromStore, DEFAULT_CATEGORY, type SavedVideo 
} from '@/lib/storage';
import { SearchResultItem } from './useNGFilter';

export function useLocalStorageData() {
  const [favorites, setFavorites] = useState<SavedVideo[]>([]);
  const [history, setHistory] = useState<SavedVideo[]>([]);
  const [categories, setCategories] = useState<string[]>([DEFAULT_CATEGORY]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [favPickerOpenFor, setFavPickerOpenFor] = useState<string | null>(null);

  const loadLocalData = useCallback(() => {
    setFavorites(getFavorites());
    setHistory(getHistory());
    setCategories(getCategories());
  }, []);

  useEffect(() => {
    loadLocalData();
  }, [loadLocalData]);

  const handleAddCategory = useCallback(() => {
    if (!newCategoryName.trim()) return;
    addCategoryToStore(newCategoryName.trim());
    setCategories(getCategories());
    setNewCategoryName('');
  }, [newCategoryName]);

  const handleRemoveCategory = useCallback((cat: string) => {
    if (window.confirm(`カテゴリー「${cat}」を削除しますか？`)) {
      removeCategoryFromStore(cat);
      setCategories(getCategories());
      if (selectedCategory === cat) setSelectedCategory('all');
    }
  }, [selectedCategory]);

  const handleSelectCategory = useCallback((video: SearchResultItem, cat: string) => {
    addFavoriteToStore({
      id: video.id.videoId || video.id.playlistId || '',
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
      thumbnailUrl: video.snippet.thumbnails.medium.url,
      isPlaylist: !!video.id.playlistId,
      savedAt: Date.now()
    }, cat);
    setFavorites(getFavorites());
  }, []);

  const handleRemoveFavorite = useCallback((id: string) => {
    removeFavoriteFromStore(id);
    setFavorites(getFavorites());
  }, []);

  const handleRemoveFromHistory = useCallback((id: string) => {
    removeFromHistoryStore(id);
    setHistory(getHistory());
  }, []);

  const isFavorite = useCallback((id: string) => {
    return checkIsFavorite(id);
  }, []);

  return {
    favorites, setFavorites,
    history, setHistory,
    categories, setCategories,
    selectedCategory, setSelectedCategory,
    newCategoryName, setNewCategoryName,
    favPickerOpenFor, setFavPickerOpenFor,
    loadLocalData,
    handleAddCategory,
    handleRemoveCategory,
    handleSelectCategory,
    handleRemoveFavorite,
    handleRemoveFromHistory,
    isFavorite,
  };
}
