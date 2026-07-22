import type { Song } from '../types/music';
import { supabase, supabaseConfigured } from './supabase';
import { deleteManagedAsset, getStoragePreference, uploadManagedAsset, type StoragePreference } from './managedStorage';

const STORAGE_KEY = 'larmx-curated-songs';
export const CURATED_EVENT = 'larmx-curated-updated';
export const getCuratedSongs = (): Song[] => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Song[]; }
  catch { return []; }
};
export const saveCuratedSongs = (songs: Song[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
  window.dispatchEvent(new CustomEvent(CURATED_EVENT));
};
interface SongRow extends Song { storage_path?: string | null; cover_storage_path?: string | null }
const SONG_COLUMNS = 'id,title,artist,album,genre,duration,cover,audio,accent,featured,featured_artist,home_order,deleted_at,storage_path,cover_storage_path,audio_provider,cover_provider';
const cacheSongs = (songs: Song[]) => { saveCuratedSongs(songs); return songs; };
export const fetchCuratedSongs = async (): Promise<Song[]> => {
  if (!supabase || !supabaseConfigured) return getCuratedSongs();
  const { data, error } = await supabase.from('larmx_songs').select(SONG_COLUMNS).is('deleted_at', null).order('home_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return cacheSongs((data || []) as Song[]);
};
export const saveHomeRecommendations = async (songs: Song[]) => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const client = supabase;
  const results = await Promise.all(songs.map((song, index) => client.from('larmx_songs').update({ home_order: index, featured: song.featured !== false }).eq('id', song.id)));
  const failed = results.find(result => result.error);
  if (failed?.error) {
    const missingColumns = /featured|home_order|schema cache/i.test(failed.error.message);
    throw new Error(missingColumns ? 'Supabase chưa có cột đề xuất. Hãy chạy lại file larmx_music_setup.sql trong SQL Editor rồi thử lại.' : failed.error.message);
  }
  return fetchCuratedSongs();
};
export const renameCuratedSong = async (songId: string, title: string) => {
  const nextTitle = title.trim();
  if (!nextTitle) throw new Error('Tên bài hát không được để trống.');
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const { error } = await supabase.from('larmx_songs').update({ title: nextTitle }).eq('id', songId);
  if (error) throw new Error(error.message);
  const songs = getCuratedSongs().map(song => song.id === songId ? { ...song, title: nextTitle } : song);
  cacheSongs(songs);
  return songs;
};
export const subscribeCuratedSongs = (onSongs: (songs: Song[]) => void) => {
  if (!supabase || !supabaseConfigured) return () => undefined;
  const client = supabase;
  const channel = client.channel('larmx-home-songs').on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'larmx_songs' },
    () => { void fetchCuratedSongs().then(onSongs).catch(() => undefined); },
  ).subscribe();
  return () => { void client.removeChannel(channel); };
};
export const publishCuratedSong = async (song: Song, file?: File | null, coverFile?: File | null, preference: StoragePreference = getStoragePreference()): Promise<Song> => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  let audio = song.audio; let storagePath: string | null = null; let audioProvider: Song['audio_provider'] = song.audio_provider || 'external';
  if (file) {
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
    storagePath = `songs/${song.id}-${safeName}`;
    const uploaded = await uploadManagedAsset(file, storagePath, 'larmx-audio', preference);
    audio = uploaded.url; storagePath = uploaded.path; audioProvider = uploaded.provider;
  }
  let cover = song.cover; let coverStoragePath: string | null = null; let coverProvider: Song['cover_provider'] = song.cover_provider || 'external';
  try {
    if (coverFile) {
      const uploaded = await uploadManagedAsset(coverFile, `covers/${song.id}-${Date.now()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, '-')}`, 'larmx-covers', preference);
      cover = uploaded.url; coverStoragePath = uploaded.path; coverProvider = uploaded.provider;
    }
  } catch (error) { await deleteManagedAsset(audioProvider, storagePath, 'larmx-audio').catch(() => undefined); throw error; }
  const published: Song = { ...song, audio, cover, storage_path: storagePath, cover_storage_path: coverStoragePath, audio_provider: audioProvider, cover_provider: coverProvider };
  const row: SongRow = published;
  const { error } = await supabase.from('larmx_songs').insert(row);
  if (error) {
    await Promise.allSettled([deleteManagedAsset(audioProvider, storagePath, 'larmx-audio'), deleteManagedAsset(coverProvider, coverStoragePath, 'larmx-covers')]);
    throw new Error(error.message);
  }
  cacheSongs([published, ...getCuratedSongs().filter(item => item.id !== published.id)]);
  return published;
};

export const updateCuratedSong = async (song: Song, audioFile?: File | null, coverFile?: File | null, preference: StoragePreference = getStoragePreference()) => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const safe = (name: string) => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
  let audio = song.audio; let cover = song.cover;
  let storagePath = song.storage_path || null; let coverStoragePath = song.cover_storage_path || null;
  let audioProvider = song.audio_provider || 'external'; let coverProvider = song.cover_provider || 'external';
  const previous = { storagePath, coverStoragePath, audioProvider, coverProvider };
  if (audioFile) { const uploaded = await uploadManagedAsset(audioFile, `songs/${song.id}-${Date.now()}-${safe(audioFile.name)}`, 'larmx-audio', preference); audio = uploaded.url; storagePath = uploaded.path; audioProvider = uploaded.provider; }
  try {
    if (coverFile) { const uploaded = await uploadManagedAsset(coverFile, `covers/${song.id}-${Date.now()}-${safe(coverFile.name)}`, 'larmx-covers', preference); cover = uploaded.url; coverStoragePath = uploaded.path; coverProvider = uploaded.provider; }
  } catch (error) { if (audioFile) await deleteManagedAsset(audioProvider, storagePath, 'larmx-audio').catch(() => undefined); throw error; }
  const updated: Song = { ...song, audio, cover, storage_path: storagePath, cover_storage_path: coverStoragePath, audio_provider: audioProvider, cover_provider: coverProvider };
  const { error } = await supabase.from('larmx_songs').update({
    title: updated.title, artist: updated.artist, album: updated.album, genre: updated.genre,
    duration: updated.duration, cover: updated.cover, audio: updated.audio, accent: updated.accent,
    featured: updated.featured !== false, featured_artist: updated.featured_artist !== false,
    storage_path: storagePath, cover_storage_path: coverStoragePath, audio_provider: audioProvider, cover_provider: coverProvider,
  }).eq('id', song.id);
  if (error) {
    if (audioFile) await deleteManagedAsset(audioProvider, storagePath, 'larmx-audio').catch(() => undefined);
    if (coverFile) await deleteManagedAsset(coverProvider, coverStoragePath, 'larmx-covers').catch(() => undefined);
    throw new Error(error.message);
  }
  if (audioFile) await deleteManagedAsset(previous.audioProvider, previous.storagePath, 'larmx-audio').catch(() => undefined);
  if (coverFile) await deleteManagedAsset(previous.coverProvider, previous.coverStoragePath, 'larmx-covers').catch(() => undefined);
  cacheSongs(getCuratedSongs().map(item => item.id === song.id ? updated : item));
  return updated;
};

export const updateManyCuratedSongs = async (songs: Song[]) => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const client = supabase;
  const results = await Promise.all(songs.map(song => client.from('larmx_songs').update({ title: song.title, artist: song.artist, album: song.album, genre: song.genre, cover: song.cover, featured: song.featured !== false, featured_artist: song.featured_artist !== false }).eq('id', song.id)));
  const failed = results.find(result => result.error);
  if (failed?.error) throw new Error(failed.error.message);
  const changed = new Map(songs.map(song => [song.id, song]));
  const next = getCuratedSongs().map(song => changed.get(song.id) || song); cacheSongs(next); return next;
};

export const moveCuratedSongToTrash = async (song: Song) => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const deletedAt = new Date().toISOString();
  const { error } = await supabase.from('larmx_songs').update({ deleted_at: deletedAt, featured: false }).eq('id', song.id);
  if (error) throw new Error(error.message);
  cacheSongs(getCuratedSongs().filter(item => item.id !== song.id));
  return { ...song, deleted_at: deletedAt, featured: false };
};

export const fetchTrashedSongs = async (): Promise<Song[]> => {
  if (!supabase || !supabaseConfigured) return [];
  const { data, error } = await supabase.from('larmx_songs').select(SONG_COLUMNS).not('deleted_at', 'is', null).order('deleted_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []) as Song[];
};

export const restoreCuratedSong = async (id: string) => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const { error } = await supabase.from('larmx_songs').update({ deleted_at: null, featured: true }).eq('id', id);
  if (error) throw new Error(error.message);
  return fetchCuratedSongs();
};
export const deleteCuratedSong = async (song: Song) => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.from('larmx_songs').select('storage_path,cover_storage_path,audio_provider,cover_provider').eq('id', song.id).maybeSingle();
  const { error } = await supabase.from('larmx_songs').delete().eq('id', song.id);
  if (error) throw new Error(error.message);
  const stored = data as Pick<Song, 'storage_path' | 'cover_storage_path' | 'audio_provider' | 'cover_provider'> | null;
  await Promise.allSettled([
    deleteManagedAsset(stored?.audio_provider, stored?.storage_path, 'larmx-audio'),
    deleteManagedAsset(stored?.cover_provider, stored?.cover_storage_path, 'larmx-covers'),
  ]);
  cacheSongs(getCuratedSongs().filter(item => item.id !== song.id));
};
export const isCurrentUserAdmin = () => {
  try {
    const user = JSON.parse(localStorage.getItem('larmx-user') || 'null') as { username?: string } | null;
    const admins = String(import.meta.env.VITE_ADMIN_USERNAMES || 'admin').split(',').map(name => name.trim().toLowerCase()).filter(Boolean);
    return Boolean(user?.username && admins.includes(user.username.toLowerCase()));
  } catch { return false; }
};
export const isAdminUsername = (username?: string) => {
  const admins = String(import.meta.env.VITE_ADMIN_USERNAMES || 'admin').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return Boolean(username && admins.includes(username.toLowerCase()));
};
