import { motion } from 'framer-motion';
import { AlertTriangle, Check, Disc3, ExternalLink, FileAudio, Image, Link2, LockKeyhole, Music2, Plus, ShieldCheck, Trash2, Upload, UserRound, X } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import type { Song } from '../types/music';
import { deleteCuratedSong, fetchCuratedSongs, getCuratedSongs, isCurrentUserAdmin, publishCuratedSong } from '../services/curatedMusic';

const empty = { title: '', artist: '', album: '', genre: 'LARMX MUSIC', cover: '', audio: '', duration: '240' };
export function AdminStudio() {
  const [form, setForm] = useState(empty); const [items, setItems] = useState(getCuratedSongs); const [message, setMessage] = useState(''); const [audioFile, setAudioFile] = useState<File | null>(null); const [publishing, setPublishing] = useState(false);
  const admin = isCurrentUserAdmin();
  useEffect(() => { void fetchCuratedSongs().then(setItems).catch(error => setMessage(`Chưa kết nối được kho nhạc: ${error.message}`)); }, []);
  const update = (key: keyof typeof form, value: string) => setForm(current => ({ ...current, [key]: value }));
  const chooseAudio = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/')) { setMessage('Vui lòng chọn đúng file âm thanh.'); return; }
    if (file.size > 200 * 1024 * 1024) { setMessage('File nhạc không được vượt quá 200 MB.'); return; }
    const preview = URL.createObjectURL(file); setAudioFile(file); update('audio', preview);
    const probe = new Audio(preview); probe.onloadedmetadata = () => { update('duration', String(Math.round(probe.duration || 240))); URL.revokeObjectURL(preview); };
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const id = `admin-${Date.now()}`; const audio = audioFile ? '' : form.audio.trim();
    if (!audio && !audioFile) { setMessage('Hãy chọn file hoặc nhập URL audio.'); return; }
    const song: Song = { id, title: form.title.trim(), artist: form.artist.trim(), album: form.album.trim() || 'LARMX MUSIC', genre: form.genre.trim() || 'LARMX MUSIC', cover: form.cover.trim(), audio, duration: Math.max(1, Number(form.duration) || 240), accent: '#c45cff' };
    setPublishing(true); try { const published = await publishCuratedSong(song, audioFile); setItems(current => [published, ...current]); setForm(empty); setAudioFile(null); setMessage('Đã xuất bản online — mọi người có thể nghe ngay'); } catch (error) { setMessage(`Không thể xuất bản: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`); } finally { setPublishing(false); } window.setTimeout(() => setMessage(''), 5200);
  };
  const remove = async (id: string) => { const removed = items.find(item => item.id === id); if (!removed) return; try { await deleteCuratedSong(removed); setItems(current => current.filter(item => item.id !== id)); setMessage('Đã xóa bài hát khỏi kho online'); } catch (error) { setMessage(`Không thể xóa: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`); } window.setTimeout(() => setMessage(''), 3200); };

  if (!admin) return <motion.div className="admin-locked glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><span><LockKeyhole /></span><small>RESTRICTED AREA</small><h1>Chỉ dành cho quản trị viên.</h1><p>Đăng nhập bằng username đã khai báo trong <code>VITE_ADMIN_USERNAMES</code>.</p><pre>VITE_ADMIN_USERNAMES=admin</pre><div><AlertTriangle /> Sau khi sửa `.env`, hãy khởi động lại dev server.</div></motion.div>;

  return <motion.div className="admin-studio" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}>
    <header className="admin-hero glass"><div><span><ShieldCheck /> ADMIN CONSOLE</span><h1>LARMX <i>Studio.</i></h1><p>Xuất bản những âm thanh tuyển chọn cho cộng đồng LARMX.</p></div><div className="admin-status"><i /><b>Admin access</b><small>Quyền xuất bản đang hoạt động</small></div></header>
    <div className="admin-layout">
      <form className="admin-form glass" onSubmit={submit}><div className="admin-form-head"><span><Plus /></span><div><small>NEW RELEASE</small><h2>Thêm bài hát</h2></div></div>
        <div className="admin-fields">
          <label><span><Music2 /> Tên bài hát</span><input required value={form.title} onChange={e => update('title', e.target.value)} placeholder="Nhập tên bài hát" /></label><label><span><UserRound /> Nghệ sĩ</span><input required value={form.artist} onChange={e => update('artist', e.target.value)} placeholder="Tên nghệ sĩ" /></label><label><span><Disc3 /> Album</span><input value={form.album} onChange={e => update('album', e.target.value)} placeholder="LARMX MUSIC" /></label><label><span><Music2 /> Thể loại</span><input value={form.genre} onChange={e => update('genre', e.target.value)} placeholder='Thể loại' /></label><label className="full"><span><Image /> URL ảnh bìa</span><input type="url" required value={form.cover} onChange={e => update('cover', e.target.value)} placeholder="https://.../cover.jpg" /></label>
          <label className="full"><span><Link2 /> URL file audio</span><input type="url" value={audioFile ? '' : form.audio} onChange={e => { update('audio', e.target.value); setAudioFile(null); }} placeholder="https://.../music.mp3" /></label>
          <div className="admin-upload full"><span className="admin-upload-or">HOẶC</span><label className="admin-file-button"><Upload /><span><b>Upload nhạc từ file</b><small>MP3, WAV, M4A · tối đa 200 MB</small></span><input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" onChange={e => chooseAudio(e.target.files?.[0])} /></label>{audioFile && <div className="admin-file-picked"><FileAudio /><span><b>{audioFile.name}</b><small>{(audioFile.size / 1024 / 1024).toFixed(1)} MB · Sẵn sàng xuất bản</small></span><button type="button" aria-label="Bỏ file" onClick={() => { update('audio', ''); setAudioFile(null); }}><X /></button></div>}</div>
          <label><span>Thời lượng (giây)</span><input type="number" min="1" value={form.duration} onChange={e => update('duration', e.target.value)} /></label>
        </div>
        <button className="admin-publish" disabled={publishing}>{publishing ? <><Upload /> Đang tải lên kho online...</> : <><Plus /> Xuất bản lên LARMX Select</>}</button><p className="admin-hint"><AlertTriangle /> Chỉ sử dụng nội dung bạn có quyền phân phối.</p>
      </form>
      <aside className="admin-preview glass"><small>LIVE PREVIEW</small><div className="preview-cover">{form.cover ? <img src={form.cover} alt="Xem trước" /> : <Image />}</div><h3>{form.title || 'Tên bài hát'}</h3><p>{form.artist || 'Tên nghệ sĩ'}</p><span>{form.genre || 'Thể loại'}</span></aside>
    </div>
    <section className="admin-library"><div className="section-head"><div><span>ĐÃ XUẤT BẢN</span><h2>Thư viện LARMX Select</h2></div><small>{items.length} bài hát</small></div>{items.length ? <div className="admin-list">{items.map((item, index) => <motion.article layout className="glass" key={item.id}><b>{String(index + 1).padStart(2, '0')}</b><img src={item.cover} alt="" /><div><h3>{item.title}</h3><p>{item.artist} · {item.album}</p></div><a href={item.audio} target="_blank" rel="noreferrer" aria-label="Mở audio"><ExternalLink /></a><button aria-label="Xóa" onClick={() => remove(item.id)}><Trash2 /></button></motion.article>)}</div> : <div className="admin-empty"><Music2 /><p>Chưa có bài hát nào được xuất bản.</p></div>}</section>
    {message && <motion.div className="admin-toast glass" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }}><Check />{message}</motion.div>}
  </motion.div>;
}
