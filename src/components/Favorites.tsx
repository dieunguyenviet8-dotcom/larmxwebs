import { motion } from 'framer-motion';
import { Heart, Music2, Sparkles } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { fetchCuratedSongs, getCuratedSongs } from '../services/curatedMusic';
import { MusicCard } from './MusicCard';
import { useEffect, useState } from 'react';

export function Favorites() {
  const player = usePlayer(); const [songs, setSongs] = useState(getCuratedSongs);
  useEffect(() => { void fetchCuratedSongs().then(setSongs).catch(() => undefined); }, []);
  const favorites = songs.filter(song => player.favorites.includes(song.id));
  return <motion.div className="favorites-page select-page" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
    <header className="favorites-hero glass"><div><span><Heart fill="currentColor" /> BỘ SƯU TẬP CỦA BẠN</span><h1>Nhạc <i>yêu thích.</i></h1><p>Những âm thanh bạn muốn giữ lại và nghe thêm nhiều lần nữa.</p></div><div className="favorites-count"><Sparkles /><b>{favorites.length}</b><small>bài hát</small></div></header>
    <section className="content-section"><div className="section-head"><div><span>YOUR LIBRARY</span><h2>Đã thả tim</h2></div><small>{favorites.length} bài hát</small></div>
      {favorites.length ? <div className="card-grid select-grid">{favorites.map(song => <MusicCard song={song} onToast={() => undefined} key={song.id} />)}</div> : <div className="favorites-empty select-empty glass"><span><Heart /></span><h2>Chưa có bài hát yêu thích.</h2><p>Nhấn biểu tượng trái tim trên một bài hát trong LARMX MUSIC để lưu tại đây.</p><Music2 /></div>}
    </section>
  </motion.div>;
}
