import { motion } from 'framer-motion';
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Home, Save, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Song } from '../types/music';
import { fetchCuratedSongs, getCuratedSongs, isCurrentUserAdmin, saveHomeRecommendations } from '../services/curatedMusic';

export function AdminRecommendations() {
  const [songs, setSongs] = useState<Song[]>(getCuratedSongs);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const admin = isCurrentUserAdmin();
  useEffect(() => { void fetchCuratedSongs().then(setSongs).catch(() => undefined); }, []);
  const move = (index: number, direction: -1 | 1) => setSongs(current => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next;
  });
  const toggle = (id: string) => setSongs(current => current.map(song => song.id === id ? { ...song, featured: song.featured === false } : song));
  const save = async () => {
    setSaving(true); setMessage('');
    try { setSongs(await saveHomeRecommendations(songs)); setMessage('Đã cập nhật đề xuất trên Trang chủ.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể lưu thứ tự.'); }
    finally { setSaving(false); }
  };
  if (!admin) return <div className="admin-locked glass"><Home /><h1>Chỉ dành cho Admin</h1></div>;
  return <motion.div className="recommend-admin" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
    <header className="recommend-hero glass"><div><span><Sparkles /> ADMIN CURATION</span><h1>Sắp xếp <i>đề xuất.</i></h1><p>Quản lý bài hát và thứ tự xuất hiện trên Trang chủ LARMX.</p></div><button onClick={() => void save()} disabled={saving}><Save /> {saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button></header>
    {message && <div className="recommend-message glass">{message}</div>}
    <section className="recommend-list glass">
      <div className="recommend-list-head"><span>THỨ TỰ</span><span>BÀI HÁT</span><span>HIỂN THỊ</span><span>DI CHUYỂN</span></div>
      {songs.map((song, index) => <motion.article layout key={song.id} className={song.featured === false ? 'hidden-song' : ''}>
        <b>{String(index + 1).padStart(2, '0')}</b><GripVertical className="recommend-grip" /><img src={song.cover} alt="" /><div><h3>{song.title}</h3><p>{song.artist} · {song.album}</p></div>
        <button className="recommend-visibility" onClick={() => toggle(song.id)}>{song.featured === false ? <><EyeOff /> Đang ẩn</> : <><Eye /> Đề xuất</>}</button>
        <div className="recommend-arrows"><button disabled={index === 0} onClick={() => move(index, -1)} aria-label="Đưa lên"><ArrowUp /></button><button disabled={index === songs.length - 1} onClick={() => move(index, 1)} aria-label="Đưa xuống"><ArrowDown /></button></div>
      </motion.article>)}
    </section>
  </motion.div>;
}
