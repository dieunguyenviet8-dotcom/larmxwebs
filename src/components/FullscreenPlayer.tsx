import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Heart, MoreHorizontal, Volume2 } from 'lucide-react';
import { useEffect } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/time';
import { Controls } from './Controls';
import { VibePanel } from './VibePanel';
import { SmoothRange } from './SmoothRange';

const ease = [0.22, 1, 0.36, 1] as const;

export function FullscreenPlayer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const player = usePlayer();
  useEffect(() => {
    if (!open) return;
    const body = document.body.style.overflow;
    const html = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { document.body.style.overflow = body; document.documentElement.style.overflow = html; };
  }, [open]);

  return <AnimatePresence initial={false} mode="wait">{open &&
    <motion.div className="fullscreen fullscreen-fit"
      initial={{ opacity: 0, scale: 1.035, clipPath: 'inset(100% 0 0 0 round 44px)' }}
      animate={{ opacity: 1, scale: 1, clipPath: 'inset(0% 0 0 0 round 0px)' }}
      exit={{ opacity: 0, scale: .975, clipPath: 'inset(0 0 100% 0 round 44px)' }}
      transition={{ duration: .62, ease }}>
      <motion.div className="full-bg" initial={{ opacity: 0, scale: 1.28 }} animate={{ opacity: .65, scale: 1.15 }} exit={{ opacity: 0, scale: 1.3 }} transition={{ duration: .75, ease }} style={{ backgroundImage: `url(${player.current.cover})` }} />
      <motion.header initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: .42, delay: .18, ease }}>
        <motion.button whileHover={{ y: 3 }} whileTap={{ scale: .86 }} aria-label="Đóng trình phát" onClick={onClose}><ChevronDown /></motion.button>
        <div><small>ĐANG PHÁT TỪ ALBUM</small><b>{player.current.album}</b></div>
        <motion.button whileHover={{ rotate: 90 }} whileTap={{ scale: .86 }} aria-label="Tùy chọn"><MoreHorizontal /></motion.button>
      </motion.header>

      <main className="fullscreen-layout">
        <motion.div className="full-artwork" key={player.current.id} initial={{ scale: .82, y: 55, opacity: 0, rotate: -3 }} animate={{ scale: 1, y: 0, opacity: 1, rotate: 0 }} exit={{ scale: .82, y: 70, opacity: 0, rotate: 3 }} transition={{ duration: .62, delay: .08, ease }}>
          <motion.img animate={player.isPlaying ? { y: [-3, 3, -3] } : { y: 0 }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} src={player.current.cover} alt={player.current.album} />
          <motion.div className="artwork-shine" animate={{ opacity: [.45, .8, .45] }} transition={{ duration: 4, repeat: Infinity }} />
        </motion.div>

        <motion.section className="full-controls glass" initial={{ opacity: 0, x: 70 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 85, scale: .96 }} transition={{ duration: .52, delay: .16, ease }}>
          <div className="full-title"><div><small>ĐANG PHÁT</small><AnimatePresence mode="wait"><motion.div key={player.current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: .3 }}><h1>{player.current.title}</h1><p>{player.current.artist}</p></motion.div></AnimatePresence></div><motion.button whileHover={{ scale: 1.12 }} whileTap={{ scale: .8 }} aria-label="Yêu thích" onClick={() => player.toggleFavorite(player.current.id)}><Heart fill={player.favorites.includes(player.current.id) ? 'currentColor' : 'none'} /></motion.button></div>
          <SmoothRange value={player.time} max={player.duration || 1} playing={player.isPlaying} onChange={player.seek} label="Tiến trình bài hát" />
          <div className="time"><span>{formatTime(player.time)}</span><span>{formatTime(player.duration)}</span></div>
          <Controls large />
          <div className="full-volume"><Volume2 /><SmoothRange value={player.volume} max={1} step={.01} onChange={player.setVolume} label="Âm lượng" /></div>
        </motion.section>

        <VibePanel />
      </main>
    </motion.div>}
  </AnimatePresence>;
}
