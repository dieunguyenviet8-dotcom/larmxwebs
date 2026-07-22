import { ArrowUpRight, Check, Library, Play, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';
import type { Song } from '../types/music';

export function HeroBanner({ song, queue }: { song?: Song; queue?: Song[] }) {
  const player = usePlayer();
  return <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }} className={`hero hero-upgraded glass ${song ? 'has-featured-song' : ''}`}>
    <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
    <div className="hero-copy">
      <span className="eyebrow"><Sparkles /> {song ? 'NHẠC CẬP NHẬT TỪ LARMX' : 'LARMX MUSIC 2026'}</span>
      <h2>{song ? song.title : <>Liquid<br /><i>Soul</i></>}</h2>
      <p className="artist">{song?.artist || 'Luna Vale'} <Check /></p>
      <p>{song ? `${song.album} · ${song.genre}` : 'Đắm mình trong một thế giới nơi từng nhịp đập hóa thành ánh sáng.'}</p>
      <div className="hero-actions">
        <button className="primary" disabled={!song} onClick={() => song && player.play(song, queue)}><Play fill="currentColor" /> Phát ngay</button>
        <button className="secondary"><Library /> Thêm vào thư viện</button>
      </div>
    </div>
    <div className="hero-art"><motion.img key={song?.id || 'default'} animate={{ y: [-3, 3, -3] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }} src={song?.cover || '/assets/liquid-soul.webp'} alt={song ? `Bìa ${song.album}` : 'Bìa album Liquid Soul'} /><button aria-label="Xem album"><ArrowUpRight /></button></div>
  </motion.section>;
}
