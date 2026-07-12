import { motion } from 'framer-motion';
import { Disc3, Radio, Sparkles } from 'lucide-react';
import { useMemo } from 'react';
import { usePlayer } from '../context/PlayerContext';

const BAR_COUNT = 32;

export function VibePanel() {
  const player = usePlayer();
  const progress = player.duration ? Math.min(100, player.time / player.duration * 100) : 0;
  const bars = useMemo(() => Array.from({ length: BAR_COUNT }, (_, index) => ({
    id: index,
    height: 24 + ((index * 29 + player.current.id.length * 7) % 68),
    duration: .65 + (index % 7) * .11,
    delay: -(index % 9) * .09,
  })), [player.current.id]);

  return <motion.section className="vibe-panel glass" initial={{ opacity: 0, x: 70 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 90 }} transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }}>
    <div className="vibe-glow" style={{ background: player.current.accent }} aria-hidden="true" />
    <header className="vibe-head">
      <div><span><Radio /></span><div><b>ĐANG PHÁT NHẠC</b><small>Chúc AE Nghe Vui Vẻ</small></div></div>
      <em className={player.isPlaying ? 'live' : ''}><i />{player.isPlaying ? 'LIVE' : 'PAUSED'}</em>
    </header>

    <div className={`vibe-visualizer ${player.isPlaying ? 'playing' : ''}`} aria-label="Hiệu ứng âm thanh đang phát">
      <div className="vibe-orbit"><span><Disc3 /></span></div>
      <div className="vibe-bars" aria-hidden="true">{bars.map(bar => <motion.i key={bar.id} style={{ height: `${bar.height}%` }} animate={player.isPlaying ? { scaleY: [.28, 1, .48, .82, .28] } : { scaleY: .18 }} transition={{ duration: bar.duration, delay: bar.delay, repeat: player.isPlaying ? Infinity : 0, ease: 'easeInOut' }} />)}</div>
    </div>

    <div className="vibe-meta">
      <div><small>THỂ LOẠI</small><b>{player.current.genre || 'LARMX MUSIC'}</b></div>
      <div><small>ALBUM</small><b>{player.current.album}</b></div>
      <span><Sparkles /> {Math.round(progress)}%</span>
    </div>
    <div className="vibe-progress"><motion.i animate={{ width: `${progress}%` }} transition={{ duration: .2, ease: 'linear' }} /></div>
  </motion.section>;
}
