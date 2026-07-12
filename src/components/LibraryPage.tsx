import { motion } from 'framer-motion';
import { Clock3, Disc3, Heart, Library, Music2, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { CURATED_EVENT, fetchCuratedSongs, getCuratedSongs } from '../services/curatedMusic';
import { MusicCard } from './MusicCard';

export function LibraryPage() {
  const player = usePlayer(); const [songs, setSongs] = useState(getCuratedSongs);
  useEffect(() => { const sync = () => setSongs(getCuratedSongs()); void fetchCuratedSongs().then(setSongs).catch(() => undefined); window.addEventListener(CURATED_EVENT, sync); return () => window.removeEventListener(CURATED_EVENT, sync); }, []);
  const favorites = songs.filter(song => player.favorites.includes(song.id));
  const recent = player.recent.map(id => songs.find(song => song.id === id)).filter(Boolean) as typeof songs;
  const albums = useMemo(() => new Set(songs.map(song => `${song.album}|${song.artist}`.toLowerCase())).size, [songs]);
  const playAll = () => songs[0] && player.play(songs[0], songs);
  return <motion.div className="library-page" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
    <header className="library-hero glass"><div><span><Library /> YOUR MUSIC SPACE</span><h1>Thư viện <i>âm nhạc.</i></h1><p>Tất cả bài hát, album và những giai điệu bạn đã lưu trên LARMX.</p><button onClick={playAll} disabled={!songs.length}><Play fill="currentColor" /> Phát tất cả</button></div><div className="library-stats"><article><Music2 /><b>{songs.length}</b><small>BÀI HÁT</small></article><article><Disc3 /><b>{albums}</b><small>ALBUM</small></article><article><Heart /><b>{favorites.length}</b><small>YÊU THÍCH</small></article></div></header>
    {recent.length > 0 && <section className="library-block"><div className="section-head"><div><span><Clock3 /> NGHE GẦN ĐÂY</span><h2>Tiếp tục thưởng thức</h2></div><small>{recent.length} bài</small></div><div className="card-grid">{recent.map(song => <MusicCard key={song.id} song={song} queue={recent} onToast={() => undefined} />)}</div></section>}
    {favorites.length > 0 && <section className="library-block"><div className="section-head"><div><span><Heart /> ĐÃ LƯU</span><h2>Bài hát yêu thích</h2></div><small>{favorites.length} bài</small></div><div className="card-grid">{favorites.slice(0, 8).map(song => <MusicCard key={song.id} song={song} queue={favorites} onToast={() => undefined} />)}</div></section>}
    <section className="library-block"><div className="section-head"><div><span><Music2 /> TOÀN BỘ THƯ VIỆN</span><h2>Tất cả bài hát</h2></div><small>{songs.length} bài</small></div>{songs.length ? <div className="card-grid">{songs.map(song => <MusicCard key={song.id} song={song} queue={songs} onToast={() => undefined} />)}</div> : <div className="collection-empty glass"><Music2 /><h2>Thư viện đang trống.</h2></div>}</section>
  </motion.div>;
}
