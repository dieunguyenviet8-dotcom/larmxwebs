import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Song } from '../types/music';
import { loadAudioFile } from '../services/audioStorage';
import { CURATED_EVENT, fetchCuratedSongs, getCuratedSongs } from '../services/curatedMusic';

interface PlayerState { current: Song; isPlaying: boolean; time: number; duration: number; volume: number; muted: boolean; shuffle: boolean; repeat: boolean; favorites: string[]; recent: string[]; play: (song?: Song, queue?: Song[]) => void; pause: () => void; next: () => void; previous: () => void; seek: (time: number) => void; setVolume: (volume: number) => void; toggleMute: () => void; toggleShuffle: () => void; toggleRepeat: () => void; toggleFavorite: (id: string) => boolean }
const PlayerContext = createContext<PlayerState | null>(null);
const emptySong: Song = { id: 'larmx-empty', title: 'Chưa có bài hát', artist: 'Hãy thêm nhạc trong Studio Admin', album: 'LARMX Music', genre: '', duration: 0, cover: '/assets/liquid-soul.webp', audio: '', accent: '#8b5cf6' };

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Song[]>(getCuratedSongs);
  const last = localStorage.getItem('larmx-last');
  const [current, setCurrent] = useState(() => catalog.find(song => song.id === last) || catalog[0] || emptySong);
  const [queue, setQueue] = useState<Song[]>(catalog);
  const [isPlaying, setPlaying] = useState(false); const [time, setTime] = useState(0); const [duration, setDuration] = useState(current.duration);
  const [volumeState, setVolumeState] = useState(() => Number(localStorage.getItem('larmx-volume') ?? .72)); const [muted, setMuted] = useState(false); const [shuffle, setShuffle] = useState(false); const [repeat, setRepeat] = useState(false);
  const [favorites, setFavorites] = useState<string[]>(() => JSON.parse(localStorage.getItem('larmx-favorites') || '[]')); const [recent, setRecent] = useState<string[]>(() => JSON.parse(localStorage.getItem('larmx-recent') || '[]'));
  const audioRef = useRef<HTMLAudioElement | null>(null); if (!audioRef.current) audioRef.current = new Audio(current.audio); const audio = audioRef.current;

  useEffect(() => {
    const sync = () => { const next = getCuratedSongs(); setCatalog(next); setQueue(active => active.length ? active : next); };
    void fetchCuratedSongs().then(songs => { setCatalog(songs); setQueue(active => active.length ? active : songs); setCurrent(active => active.id === emptySong.id ? songs.find(song => song.id === last) || songs[0] || active : active); }).catch(() => undefined);
    window.addEventListener(CURATED_EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(CURATED_EVENT, sync); window.removeEventListener('storage', sync); };
  }, [last]);

  const go = useCallback((direction: number) => {
    const activeQueue = queue.length ? queue : catalog; if (!activeQueue.length) return;
    const index = activeQueue.findIndex(song => song.id === current.id);
    const nextIndex = shuffle ? Math.floor(Math.random() * activeQueue.length) : ((index < 0 ? 0 : index) + direction + activeQueue.length) % activeQueue.length;
    setCurrent(activeQueue[nextIndex]); setPlaying(true);
  }, [catalog, current.id, queue, shuffle]);

  useEffect(() => {
    let active = true; let objectUrl = ''; audio.pause();
    if (!current.audio) { audio.removeAttribute('src'); setPlaying(false); return; }
    void loadAudioFile(current.audio).then(source => { if (!active) { if (source.startsWith('blob:')) URL.revokeObjectURL(source); return; } objectUrl = source.startsWith('blob:') ? source : ''; audio.src = source; audio.volume = volumeState; audio.muted = muted; if (isPlaying) audio.play().catch(() => setPlaying(false)); }).catch(() => setPlaying(false));
    localStorage.setItem('larmx-last', current.id); setTime(0); setDuration(current.duration);
    setRecent(items => { const next = [current.id, ...items.filter(id => id !== current.id)].slice(0, 6); localStorage.setItem('larmx-recent', JSON.stringify(next)); return next; });
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [current, audio]);
  useEffect(() => { audio.volume = volumeState; audio.muted = muted; localStorage.setItem('larmx-volume', String(volumeState)); }, [volumeState, muted, audio]);
  useEffect(() => { const tick = () => setTime(audio.currentTime); const meta = () => setDuration(audio.duration || current.duration); const ended = () => repeat ? (audio.currentTime = 0, void audio.play()) : go(1); audio.addEventListener('timeupdate', tick); audio.addEventListener('loadedmetadata', meta); audio.addEventListener('ended', ended); return () => { audio.removeEventListener('timeupdate', tick); audio.removeEventListener('loadedmetadata', meta); audio.removeEventListener('ended', ended); }; }, [audio, current.duration, go, repeat]);

  const play = (song?: Song, nextQueue?: Song[]) => { if (nextQueue?.length) setQueue(nextQueue); else if (song && !queue.some(item => item.id === song.id)) setQueue(catalog); if (song && song.id !== current.id) { setCurrent(song); setPlaying(true); return; } if (!current.audio) return; audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); };
  const pause = () => { audio.pause(); setPlaying(false); };
  const toggleFavorite = (id: string) => { const added = !favorites.includes(id); const next = added ? [...favorites, id] : favorites.filter(item => item !== id); setFavorites(next); localStorage.setItem('larmx-favorites', JSON.stringify(next)); return added; };
  const value = useMemo(() => ({ current, isPlaying, time, duration, volume: volumeState, muted, shuffle, repeat, favorites, recent, play, pause, next: () => go(1), previous: () => go(-1), seek: (next: number) => { audio.currentTime = next; setTime(next); }, setVolume: setVolumeState, toggleMute: () => setMuted(value => !value), toggleShuffle: () => setShuffle(value => !value), toggleRepeat: () => setRepeat(value => !value), toggleFavorite }), [current, isPlaying, time, duration, volumeState, muted, shuffle, repeat, favorites, recent, go, queue, catalog]);
  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}
export const usePlayer = () => { const value = useContext(PlayerContext); if (!value) throw new Error('usePlayer requires PlayerProvider'); return value; };
