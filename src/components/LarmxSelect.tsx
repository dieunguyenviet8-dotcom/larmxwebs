import { motion } from 'framer-motion';
import { Crown, Music2, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CURATED_EVENT, fetchCuratedSongs, getCuratedSongs } from '../services/curatedMusic';
import { MusicCard } from './MusicCard';

export function LarmxSelect() {
  const [songs, setSongs] = useState(getCuratedSongs); const [toast, setToast] = useState('');
  useEffect(() => { const sync = () => setSongs(getCuratedSongs()); void fetchCuratedSongs().then(setSongs).catch(() => undefined); window.addEventListener(CURATED_EVENT, sync); window.addEventListener('storage', sync); return () => { window.removeEventListener(CURATED_EVENT, sync); window.removeEventListener('storage', sync); }; }, []);
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  return <motion.div className="select-page" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
    <header className="select-hero glass"><div><span><Crown /> MUSIC BY LARMX</span><h1>LARMX <i>MUSIC</i></h1><p>Những bản nhạc vinahouse nghe cuốn đét</p></div><Sparkles /></header>
    <section className="content-section"><div className="section-head"><div><span>Nhạc Vinahouse Bay Phòng</span><h2>Nhạc Vinahouse</h2></div><small>{songs.length} bài hát</small></div>{songs.length ? <div className="card-grid select-grid">{songs.map(song => <MusicCard song={song} onToast={notify} key={song.id} />)}</div> : <div className="select-empty glass"><span><Music2 /></span><h2>Âm nhạc đang được chuẩn bị.</h2><p>Admin chưa xuất bản bài hát nào vào LARMX MUSIC</p></div>}</section>
    {toast && <motion.div className="toast glass" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}>{toast}</motion.div>}
  </motion.div>;
}
