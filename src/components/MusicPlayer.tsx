import { Expand, Heart, ListMusic, Mic2, MonitorSpeaker, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/time';
import { Controls } from './Controls';

export function MusicPlayer({ onFullscreen }: { onFullscreen: () => void }) {
  const player = usePlayer();
  const [hidden, setHidden] = useState(false);
  const lastScroll = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      if (window.innerWidth <= 900) return;
      const current = window.scrollY;
      const difference = current - lastScroll.current;
      if (difference > 8 && current > 140) setHidden(true);
      if (difference < -8 || current < 80) setHidden(false);
      lastScroll.current = current;
    };
    const onPointerMove = (event: PointerEvent) => {
      if (window.innerWidth > 900 && event.clientY > window.innerHeight - 115) setHidden(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('pointermove', onPointerMove); };
  }, []);

  if (player.current.id === 'larmx-empty') return null;

  return <motion.footer className={`player glass ${hidden ? 'player-hidden' : ''}`} initial={{ opacity: 0, y: 36 }} animate={hidden ? { opacity: 0, y: 110, scale: .985 } : { opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 42, scale: .98 }} transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }} onMouseEnter={() => setHidden(false)}>
    <div className="player-track-group">
      <button className="track" onClick={onFullscreen}>
        <AnimatePresence mode="popLayout" initial={false}><motion.img key={player.current.id} initial={{ opacity: 0, scale: .75, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: .75, rotate: 8 }} transition={{ duration: .34 }} src={player.current.cover} alt={player.current.album} /></AnimatePresence>
        <AnimatePresence mode="wait" initial={false}><motion.div key={player.current.id} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -9 }} transition={{ duration: .24 }}><b>{player.current.title}</b><small>{player.current.artist}</small></motion.div></AnimatePresence>
      </button>
      <motion.button whileHover={{ scale: 1.14 }} whileTap={{ scale: .78 }} className="like" aria-label="Yêu thích" onClick={() => player.toggleFavorite(player.current.id)}><Heart fill={player.favorites.includes(player.current.id) ? 'currentColor' : 'none'} /></motion.button>
    </div>
    <div className="player-center"><Controls /><div className="timeline"><span>{formatTime(player.time)}</span><input className="range" type="range" min="0" max={player.duration || 1} value={player.time} onChange={event => player.seek(+event.target.value)} aria-label="Tiến trình bài hát" /><span>{formatTime(player.duration)}</span></div></div>
    <div className="player-right">
      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .8 }} aria-label="Hàng chờ"><ListMusic /></motion.button>
      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .8 }} aria-label="Lời bài hát" onClick={onFullscreen}><Mic2 /></motion.button>
      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .8 }} aria-label="Thiết bị"><MonitorSpeaker /></motion.button>
      <motion.button whileTap={{ scale: .8 }} aria-label="Tắt tiếng" onClick={player.toggleMute}>{player.muted ? <VolumeX /> : <Volume2 />}</motion.button>
      <input className="range" type="range" min="0" max="1" step=".01" value={player.muted ? 0 : player.volume} onChange={event => player.setVolume(+event.target.value)} aria-label="Âm lượng" />
      <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: .78 }} aria-label="Toàn màn hình" onClick={onFullscreen}><Expand /></motion.button>
    </div>
  </motion.footer>;
}
