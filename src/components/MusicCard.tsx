import { Heart, MoreHorizontal, Pause, Play } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { Song } from '../types/music';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/time';

export function MusicCard({ song, queue, onToast }: { song: Song; queue?: Song[]; onToast: (message: string) => void }) {
  const player = usePlayer();
  const active = player.current.id === song.id && player.isPlaying;
  const favorite = player.favorites.includes(song.id);
  const togglePlayback = () => active ? player.pause() : player.play(song, queue);

  return <motion.article
    layout
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: .32, ease: [0.22, 1, 0.36, 1] }}
    className={`music-card glass music-card-clickable ${active ? 'is-playing' : ''}`}
    role="button"
    tabIndex={-1}
    aria-label={active ? `Tạm dừng ${song.title}` : `Phát ${song.title}`}
    onClick={togglePlayback}
    onKeyDown={event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        togglePlayback();
      }
    }}
  >
    <div className="cover">
      <img src={song.cover} alt={`Bìa ${song.album}`} />
      {active && <motion.i className="playing-glow" initial={{ opacity: 0 }} animate={{ opacity: [.2, .7, .2] }} transition={{ duration: 2.4, repeat: Infinity }} />}
      <motion.button whileTap={{ scale: .88 }} aria-label={active ? 'Tạm dừng' : 'Phát bài hát'} onClick={event => { event.stopPropagation(); togglePlayback(); }}>
        <AnimatePresence mode="wait" initial={false}>{active
          ? <motion.span key="pause" initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .6, opacity: 0 }}><Pause fill="currentColor" /></motion.span>
          : <motion.span key="play" initial={{ scale: .6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .6, opacity: 0 }}><Play fill="currentColor" /></motion.span>}
        </AnimatePresence>
      </motion.button>
      <span>{song.genre}</span>
    </div>
    <div className="card-info">
      <div><h3>{song.title}</h3><p>{song.artist}</p></div>
      <div className="card-tools">
        <small>{formatTime(song.duration)}</small>
        <motion.button whileTap={{ scale: .7 }} aria-label={favorite ? 'Bỏ yêu thích' : 'Yêu thích'} onClick={event => { event.stopPropagation(); const added = player.toggleFavorite(song.id); onToast(added ? 'Đã thêm vào bài hát yêu thích' : 'Đã bỏ khỏi yêu thích'); }}>
          <motion.span animate={favorite ? { scale: [1, 1.35, 1] } : { scale: 1 }}><Heart fill={favorite ? 'currentColor' : 'none'} className={favorite ? 'pink' : ''} /></motion.span>
        </motion.button>
        <button aria-label="Tùy chọn" onClick={event => event.stopPropagation()}><MoreHorizontal /></button>
      </div>
    </div>
  </motion.article>;
}
