import { Pause, Play, Repeat2, Shuffle, SkipBack, SkipForward } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { usePlayer } from '../context/PlayerContext';

export function Controls({ large = false }: { large?: boolean }) {
  const player = usePlayer();
  const tap = { scale: .84 };
  return <div className="controls">
    <motion.button whileHover={{ scale: 1.12 }} whileTap={tap} aria-label="Phát ngẫu nhiên" className={player.shuffle ? 'active' : ''} onClick={player.toggleShuffle}><Shuffle /></motion.button>
    <motion.button whileHover={{ x: -3, scale: 1.08 }} whileTap={tap} aria-label="Bài trước" onClick={player.previous}><SkipBack /></motion.button>
    <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: .88 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }} aria-label={player.isPlaying ? 'Tạm dừng' : 'Phát'} className={`play ${large ? 'large' : ''}`} onClick={() => player.isPlaying ? player.pause() : player.play()}>
      <AnimatePresence mode="wait" initial={false}>{player.isPlaying
        ? <motion.span key="pause" initial={{ scale: .55, opacity: 0, rotate: -25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: .55, opacity: 0, rotate: 25 }} transition={{ duration: .16 }}><Pause fill="currentColor" /></motion.span>
        : <motion.span key="play" initial={{ scale: .55, opacity: 0, rotate: 25 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} exit={{ scale: .55, opacity: 0, rotate: -25 }} transition={{ duration: .16 }}><Play fill="currentColor" /></motion.span>}
      </AnimatePresence>
    </motion.button>
    <motion.button whileHover={{ x: 3, scale: 1.08 }} whileTap={tap} aria-label="Bài tiếp theo" onClick={player.next}><SkipForward /></motion.button>
    <motion.button whileHover={{ rotate: 18, scale: 1.1 }} whileTap={tap} aria-label="Lặp lại" className={player.repeat ? 'active' : ''} onClick={player.toggleRepeat}><Repeat2 /></motion.button>
  </div>;
}
