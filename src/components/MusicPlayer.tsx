import { Expand, Heart, ListMusic, Mic2, MonitorSpeaker, Volume2, VolumeX } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/time';
import { Controls } from './Controls';
import { SmoothRange } from './SmoothRange';

export function MusicPlayer({ onFullscreen }: { onFullscreen: () => void }) {
  const player = usePlayer();
  const [hidden, setHidden] = useState(() => window.innerWidth > 900);
  const hideTimer = useRef<number | null>(null);
  const showPlayer = () => { if (hideTimer.current !== null) window.clearTimeout(hideTimer.current); hideTimer.current = null; setHidden(false); };
  const scheduleHide = () => {
    if (window.innerWidth <= 900) return;
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => { setHidden(true); hideTimer.current = null; }, 320);
  };

  useEffect(() => {
    const onResize = () => setHidden(window.innerWidth > 900);
    window.addEventListener('resize', onResize, { passive: true });
    return () => { window.removeEventListener('resize', onResize); if (hideTimer.current !== null) window.clearTimeout(hideTimer.current); };
  }, []);

  if (player.current.id === 'larmx-empty') return null;

  return <><div className={`player-reveal-zone ${hidden ? 'active' : ''}`} aria-hidden="true" onPointerEnter={showPlayer} onPointerMove={showPlayer} /><motion.footer className={`player glass ${hidden ? 'player-hidden' : ''}`} initial={{ opacity: 0, y: 36 }} animate={hidden ? { opacity: 0, y: 118, scale: .985 } : { opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 42, scale: .98 }} transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }} onMouseEnter={showPlayer} onMouseLeave={scheduleHide}>
    <div className="player-track-group">
      <button className="track" onClick={onFullscreen}>
        <AnimatePresence mode="popLayout" initial={false}><motion.img key={player.current.id} initial={{ opacity: 0, scale: .75, rotate: -8 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: .75, rotate: 8 }} transition={{ duration: .34 }} src={player.current.cover} alt={player.current.album} /></AnimatePresence>
        <AnimatePresence mode="wait" initial={false}><motion.div key={player.current.id} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -9 }} transition={{ duration: .24 }}><b>{player.current.title}</b><small>{player.current.artist}</small></motion.div></AnimatePresence>
      </button>
    </div>
    <div className="player-center"><Controls /><div className="timeline"><span>{formatTime(player.time)}</span><SmoothRange value={player.time} max={player.duration || 1} playing={player.isPlaying} onChange={player.seek} label="Tiến trình bài hát" /><span>{formatTime(player.duration)}</span></div></div>
    <div className="player-right">
      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .8 }} aria-label="Hàng chờ"><ListMusic /></motion.button>
      <motion.button whileHover={{ scale: 1.14 }} whileTap={{ scale: .78 }} className="like" aria-label="Yêu thích" onClick={() => player.toggleFavorite(player.current.id)}><Heart fill={player.favorites.includes(player.current.id) ? 'currentColor' : 'none'} /></motion.button>
      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .8 }} aria-label="Lời bài hát" onClick={onFullscreen}><Mic2 /></motion.button>
      <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .8 }} aria-label="Thiết bị"><MonitorSpeaker /></motion.button>
      <motion.button whileTap={{ scale: .8 }} aria-label="Tắt tiếng" onClick={player.toggleMute}>{player.muted ? <VolumeX /> : <Volume2 />}</motion.button>
      <SmoothRange value={player.muted ? 0 : player.volume} max={1} step={.01} onChange={player.setVolume} label="Âm lượng" />
      <motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: .78 }} aria-label="Toàn màn hình" onClick={onFullscreen}><Expand /></motion.button>
    </div>
  </motion.footer></>;
}
