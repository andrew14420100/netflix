import { useState, useEffect } from 'react';

export interface ContinueWatchingItem {
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  title: string;
  backdrop_path: string;
  poster_path: string;
  progress?: number; // 0-100 for UI
  currentTime?: number; // seconds for video player
  duration?: number; // total duration in seconds
  timestamp: number;
  episode?: number;
  season?: number;
}

const STORAGE_KEY = 'netflix_continue_watching';
const USERNAME_KEY = 'netflix_username';

export function useContinueWatching() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([]);
  const [username, setUsername] = useState<string>('Utente');

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
      
      const storedUsername = localStorage.getItem(USERNAME_KEY);
      if (storedUsername) {
        setUsername(storedUsername);
      }
    } catch (e) {
      console.error('Error loading continue watching data:', e);
    }
  }, []);

  // Add or update item
  const addItem = (item: Omit<ContinueWatchingItem, 'timestamp'>) => {
    const newItem: ContinueWatchingItem = {
      ...item,
      timestamp: Date.now(),
    };

    setItems(prevItems => {
      // Remove if exists, then add to beginning
      const filtered = prevItems.filter(i => !(i.tmdbId === item.tmdbId && i.mediaType === item.mediaType));
      const updated = [newItem, ...filtered].slice(0, 20); // Keep max 20 items
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving continue watching data:', e);
      }
      
      return updated;
    });
  };

  // Get item (for resume playback)
  const getItem = (tmdbId: number, mediaType: 'movie' | 'tv'): ContinueWatchingItem | undefined => {
    return items.find(i => i.tmdbId === tmdbId && i.mediaType === mediaType);
  };

  // Remove item
  const removeItem = (tmdbId: number, mediaType: 'movie' | 'tv') => {
    setItems(prevItems => {
      const updated = prevItems.filter(i => !(i.tmdbId === tmdbId && i.mediaType === mediaType));
      
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Error saving continue watching data:', e);
      }
      
      return updated;
    });
  };

  // Update username
  const updateUsername = (newUsername: string) => {
    setUsername(newUsername);
    try {
      localStorage.setItem(USERNAME_KEY, newUsername);
    } catch (e) {
      console.error('Error saving username:', e);
    }
  };

  // Clear all
  const clearAll = () => {
    setItems([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Error clearing continue watching data:', e);
    }
  };

  return {
    items,
    username,
    addItem,
    getItem,
    removeItem,
    updateUsername,
    clearAll,
  };
}
