import { ChevronRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { artists } from '../data/music';
import { usePlayer } from '../context/PlayerContext';
import type { Song } from '../types/music';
import { MusicCard } from './MusicCard';

const reveal = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0 } };

export function SongSection({ title, items, onToast }: { title: string; items: Song[]; onToast: (message: string) => void }) {
  return <motion.section className="content-section" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={{ hidden: {}, show: { transition: { staggerChildren: .055 } } }}>
    <motion.div className="section-head" variants={reveal} transition={{ duration: .5 }}><div><span>FOR YOU</span><h2>{title}</h2></div><motion.button whileHover={{ x: 4 }}>Xem tất cả<ChevronRight /></motion.button></motion.div>
    <div className="card-grid">{items.map(song => <motion.div variants={reveal} transition={{ type: 'spring', stiffness: 190, damping: 23 }} key={song.id}><MusicCard song={song} queue={items} onToast={onToast} /></motion.div>)}</div>
  </motion.section>;
}

export function AlbumSection({ items }: { items: Song[] }) {
  const player = usePlayer();
  const albums = Array.from(items.reduce((map, song) => {
    const key = `${song.album}|${song.artist}`.toLowerCase(); const current = map.get(key);
    if (current) { current.count += 1; current.songs.push(song); }
    else map.set(key, { id: key, title: song.album || 'LARMX MUSIC', artist: song.artist, cover: song.cover, count: 1, songs: [song] });
    return map;
  }, new Map<string, { id: string; title: string; artist: string; cover: string; count: number; songs: Song[] }>()).values()).slice(0, 6);
  return <motion.section className="content-section" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-70px' }} variants={{ hidden: {}, show: { transition: { staggerChildren: .07 } } }}>
    <motion.div className="section-head" variants={reveal}><div><span>TUYỂN CHỌN</span><h2>Album phổ biến</h2></div><motion.button whileHover={{ x: 4 }}>Xem tất cả<ChevronRight /></motion.button></motion.div>
    <div className="album-grid">{albums.map(album => <motion.article variants={reveal} whileHover={{ y: -7 }} transition={{ type: 'spring', stiffness: 240, damping: 23 }} key={album.id}><div><motion.img whileHover={{ scale: 1.06 }} transition={{ duration: .5 }} src={album.cover} alt={album.title} /><motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: .86 }} aria-label={`Phát ${album.title}`} onClick={() => player.play(album.songs[0], album.songs)}><Play fill="currentColor" /></motion.button></div><h3>{album.title}</h3><p>{album.artist} · {album.count} bài hát</p></motion.article>)}</div>
  </motion.section>;
}

export function ArtistSection() {
  return <motion.section className="content-section" initial="hidden" whileInView="show" viewport={{ once: true, margin: '-70px' }} variants={{ hidden: {}, show: { transition: { staggerChildren: .08 } } }}>
    <motion.div className="section-head" variants={reveal}><div><span>ĐANG ĐƯỢC YÊU THÍCH</span><h2>Nghệ sĩ nổi bật</h2></div><motion.button whileHover={{ x: 4 }}>Xem tất cả<ChevronRight /></motion.button></motion.div>
    <div className="artist-grid">{artists.map(artist => <motion.article variants={reveal} whileHover={{ y: -5, scale: 1.01 }} transition={{ type: 'spring', stiffness: 240, damping: 22 }} className="glass" key={artist.id}><motion.img whileHover={{ scale: 1.08, rotate: 2 }} src={artist.image} alt={artist.name} /><div><h3>{artist.name}</h3><p>{artist.listeners}</p></div><motion.button whileHover={{ backgroundColor: '#ffffff', color: '#111111' }} whileTap={{ scale: .9 }}>Theo dõi</motion.button></motion.article>)}</div>
  </motion.section>;
}
