import { ChevronRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import type { Song } from '../types/music';
import { MusicCard } from './MusicCard';

export function SongSection({ title, items, onToast }: { title: string; items: Song[]; onToast: (message: string) => void }) {
  return <section className="content-section">
    <div className="section-head"><div><span>FOR YOU</span><h2>{title}</h2></div><motion.button whileHover={{ x: 4 }}>Xem tất cả<ChevronRight /></motion.button></div>
    {items.length ? <div className="card-grid">{items.map(song => <div key={song.id}><MusicCard song={song} queue={items} onToast={onToast} /></div>)}</div> : <div className="song-filter-empty glass"><span>Không tìm thấy bài hát phù hợp.</span><small>Hãy chọn thể loại khác hoặc xóa nội dung tìm kiếm.</small></div>}
  </section>;
}

export function AlbumSection({ items }: { items: Song[] }) {
  const player = usePlayer();
  const albums = Array.from(items.reduce((map, song) => {
    const key = `${song.album}|${song.artist}`.toLowerCase(); const current = map.get(key);
    if (current) { current.count += 1; current.songs.push(song); }
    else map.set(key, { id: key, title: song.album || 'LARMX MUSIC', artist: song.artist, cover: song.cover, count: 1, songs: [song] });
    return map;
  }, new Map<string, { id: string; title: string; artist: string; cover: string; count: number; songs: Song[] }>()).values()).slice(0, 6);
  return <section className="content-section">
    <div className="section-head"><div><span>TUYỂN CHỌN</span><h2>Album phổ biến</h2></div><motion.button whileHover={{ x: 4 }}>Xem tất cả<ChevronRight /></motion.button></div>
    <div className="album-grid">{albums.map(album => <motion.article className="album-card glass" initial={false} whileHover={{ y: -7 }} transition={{ type: 'spring', stiffness: 240, damping: 23 }} key={album.id}><div><motion.img whileHover={{ scale: 1.06 }} transition={{ duration: .5 }} src={album.cover} alt={album.title} decoding="async" /><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: .86 }} aria-label={`Phát ${album.title}`} onClick={() => player.play(album.songs[0], album.songs)}><Play fill="currentColor" /></motion.button></div><h3>{album.title}</h3><p>{album.artist} · {album.count} bài hát</p></motion.article>)}</div>
  </section>;
}

export function ArtistSection({ items }: { items: Song[] }) {
  const player = usePlayer();
  const artists = Array.from(items.reduce((map, song) => {
    const current = map.get(song.artist);
    if (current) { current.count += 1; current.songs.push(song); }
    else map.set(song.artist, { id: song.artist.toLowerCase().replace(/\s+/g, '-'), name: song.artist, image: song.cover, listeners: `${1} bài hát`, count: 1, featured: song.featured_artist !== false, songs: [song] });
    return map;
  }, new Map<string, { id: string; name: string; image: string; listeners: string; count: number; featured: boolean; songs: Song[] }>()).values()).filter(artist => artist.featured).map(artist => ({ ...artist, listeners: `${artist.count} bài hát trên LARMX` }));
  if (!artists.length) return null;
  return <section className="content-section">
    <div className="section-head"><div><span>ĐANG ĐƯỢC YÊU THÍCH</span><h2>Nghệ sĩ nổi bật</h2></div><motion.button whileHover={{ x: 4 }}>Xem tất cả<ChevronRight /></motion.button></div>
    <div className="card-grid featured-artist-grid">{artists.map(artist => <motion.article initial={false} whileHover={{ y: -6 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }} className="featured-artist-card glass" key={artist.id} role="button" tabIndex={0} onClick={() => player.play(artist.songs[0], artist.songs)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); player.play(artist.songs[0], artist.songs); } }}><div className="featured-artist-cover"><motion.img whileHover={{ scale: 1.055 }} src={artist.image} alt={artist.name} /><motion.button aria-label={`Phát nhạc của ${artist.name}`} whileTap={{ scale: .86 }} onClick={event => { event.stopPropagation(); player.play(artist.songs[0], artist.songs); }}><Play fill="currentColor" /></motion.button></div><div className="featured-artist-info"><h3>{artist.name}</h3><p>{artist.listeners}</p></div></motion.article>)}</div>
  </section>;
}
