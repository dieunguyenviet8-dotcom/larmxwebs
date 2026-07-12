import type { Song } from '../types/music';
import { supabase, supabaseConfigured } from './supabase';

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
interface SongRow extends Song { storage_path?: string | null }
const cacheSongs = (songs: Song[]) => { saveCuratedSongs(songs); return songs; };
export const fetchCuratedSongs = async (): Promise<Song[]> => {
  if (!supabase || !supabaseConfigured) return getCuratedSongs();
  const { data, error } = await supabase.from('larmx_songs').select('id,title,artist,album,genre,duration,cover,audio,accent,featured,home_order').order('home_order', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
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
export const publishCuratedSong = async (song: Song, file?: File | null): Promise<Song> => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  let audio = song.audio; let storagePath: string | null = null;
  if (file) {
    const safeName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-');
    storagePath = `songs/${song.id}-${safeName}`;
    const { error: uploadError } = await supabase.storage.from('larmx-audio').upload(storagePath, file, { contentType: file.type || 'audio/mpeg', cacheControl: '3600', upsert: false });
    if (uploadError) throw new Error(uploadError.message);
    audio = supabase.storage.from('larmx-audio').getPublicUrl(storagePath).data.publicUrl;
  }
  const published = { ...song, audio };
  const row: SongRow = { ...published, storage_path: storagePath };
  const { error } = await supabase.from('larmx_songs').insert(row);
  if (error) { if (storagePath) await supabase.storage.from('larmx-audio').remove([storagePath]); throw new Error(error.message); }
  cacheSongs([published, ...getCuratedSongs().filter(item => item.id !== published.id)]);
  return published;
};
export const deleteCuratedSong = async (song: Song) => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const { data } = await supabase.from('larmx_songs').select('storage_path').eq('id', song.id).maybeSingle();
  const { error } = await supabase.from('larmx_songs').delete().eq('id', song.id);
  if (error) throw new Error(error.message);
  const path = (data as { storage_path?: string } | null)?.storage_path;
  if (path) await supabase.storage.from('larmx-audio').remove([path]);
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
