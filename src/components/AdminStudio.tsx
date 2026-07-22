import { AnimatePresence, motion } from 'framer-motion';
import { Activity, AlertTriangle, BarChart3, Check, CheckSquare, Cloud, Database, Disc3, Edit3, Eye, EyeOff, FileAudio, FolderOpen, HardDrive, Home, Image, KeyRound, Library, Link2, LockKeyhole, Monitor, Music2, Pause, Play, Plus, RefreshCw, RotateCcw, Search, ShieldCheck, Smartphone, Square, Trash2, Upload, UserRound, Users, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import type { Song } from '../types/music';
import { fetchCuratedSongs, fetchTrashedSongs, getCuratedSongs, isCurrentUserAdmin, moveCuratedSongToTrash, publishCuratedSong, restoreCuratedSong, updateCuratedSong, updateManyCuratedSongs } from '../services/curatedMusic';
import { fetchStorageStatus, getR2AdminToken, getStoragePreference, setR2AdminToken, setStoragePreference as persistStoragePreference, verifyR2Access, type StoragePreference, type StorageStatus } from '../services/managedStorage';

type StudioTab = 'dashboard' | 'editor' | 'library' | 'albums' | 'artists' | 'trash' | 'analytics' | 'homepage' | 'storage';
type FormState = { title: string; artist: string; album: string; genre: string; cover: string; audio: string; duration: string; status: 'published' | 'hidden' | 'draft' };
const empty: FormState = { title: '', artist: '', album: '', genre: 'LARMX MUSIC', cover: '', audio: '', duration: '240', status: 'published' };
const DRAFT_KEY = 'larmx-admin-song-draft';
const optimizeCover = async (file: File) => {
  const bitmap = await createImageBitmap(file); const size = Math.min(1400, Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas'); canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d'); if (!context) return file;
  const scale = Math.max(size / bitmap.width, size / bitmap.height); const width = bitmap.width * scale; const height = bitmap.height * scale;
  context.drawImage(bitmap, (size - width) / 2, (size - height) / 2, width, height); bitmap.close();
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', .86));
  return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' }) : file;
};

export function AdminStudio() {
  const [tab, setTab] = useState<StudioTab>('dashboard');
  const [form, setForm] = useState<FormState>(empty);
  const [items, setItems] = useState(getCuratedSongs);
  const [message, setMessage] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState('');
  const [coverPreview, setCoverPreview] = useState('');
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<string[]>([]);
  const [trash, setTrash] = useState<Song[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draggingUpload, setDraggingUpload] = useState<'cover' | 'audio' | null>(null);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [undoSong, setUndoSong] = useState<Song | null>(null);
  const [storagePreference, setStoragePreference] = useState<StoragePreference>(getStoragePreference);
  const [storageStatus, setStorageStatus] = useState<StorageStatus | null>(null);
  const [r2Token, setR2Token] = useState(getR2AdminToken);
  const [checkingStorage, setCheckingStorage] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const admin = isCurrentUserAdmin();

  useEffect(() => { void fetchCuratedSongs().then(setItems).catch(error => setMessage(`Chưa kết nối được kho nhạc: ${error.message}`)); void fetchTrashedSongs().then(setTrash).catch(() => undefined); void fetchStorageStatus().then(setStorageStatus); }, []);
  useEffect(() => () => { if (audioPreview.startsWith('blob:')) URL.revokeObjectURL(audioPreview); if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview); }, [audioPreview, coverPreview]);

  const update = (key: keyof FormState, value: string) => setForm(current => ({ ...current, [key]: value }));
  const genres = useMemo(() => Array.from(new Set(items.map(song => song.genre).filter(Boolean))).sort(), [items]);
  const filtered = useMemo(() => items.filter(song => {
    const text = `${song.title} ${song.artist} ${song.album}`.toLowerCase();
    const statusMatch = statusFilter === 'all' || (statusFilter === 'hidden' ? song.featured === false : song.featured !== false);
    return text.includes(query.trim().toLowerCase()) && (genre === 'all' || song.genre === genre) && statusMatch;
  }), [items, query, genre, statusFilter]);
  const albums = useMemo(() => new Set(items.map(song => song.album.trim().toLowerCase()).filter(Boolean)).size, [items]);
  const artists = useMemo(() => new Set(items.map(song => song.artist.trim().toLowerCase()).filter(Boolean)).size, [items]);
  const hidden = items.filter(song => song.featured === false).length;
  const albumGroups = useMemo(() => Array.from(new Map(items.map(song => [song.album, items.filter(item => item.album === song.album)])).entries()), [items]);
  const artistGroups = useMemo(() => Array.from(new Map(items.map(song => [song.artist, items.filter(item => item.artist === song.artist)])).entries()), [items]);
  const playCounts = useMemo<Record<string, number>>(() => { try { return JSON.parse(localStorage.getItem('larmx-play-counts') || '{}'); } catch { return {}; } }, [items]);
  const totalPlays = Object.values(playCounts).reduce((sum, value) => sum + value, 0);

  const resetEditor = () => {
    setForm(empty); setEditingId(null); setAudioFile(null); setCoverFile(null); setAudioPreview(''); setCoverPreview(''); setPreviewPlaying(false);
  };
  const chooseAudio = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('audio/')) return setMessage('Vui lòng chọn đúng file âm thanh.');
    if (file.size > 200 * 1024 * 1024) return setMessage('File nhạc không được vượt quá 200 MB.');
    if (audioPreview.startsWith('blob:')) URL.revokeObjectURL(audioPreview);
    const preview = URL.createObjectURL(file); setAudioFile(file); setAudioPreview(preview); update('audio', '');
    const probe = new Audio(preview); probe.onloadedmetadata = () => update('duration', String(Math.max(1, Math.round(probe.duration || 240))));
  };
  const chooseCover = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return setMessage('Vui lòng chọn đúng file ảnh.');
    if (file.size > 10 * 1024 * 1024) return setMessage('Ảnh bìa không được vượt quá 10 MB.');
    if (coverPreview.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setUploadProgress(12); let optimized = file; try { optimized = await optimizeCover(file); } catch { setMessage('Thiết bị không hỗ trợ nén ảnh, Studio sẽ dùng file gốc.'); } setUploadProgress(28);
    setCoverFile(optimized); setCoverPreview(URL.createObjectURL(optimized)); update('cover', '');
  };
  const editSong = (song: Song) => {
    setEditingId(song.id); setForm({ title: song.title, artist: song.artist, album: song.album, genre: song.genre, cover: song.cover, audio: song.audio, duration: String(song.duration), status: song.featured === false ? 'hidden' : 'published' });
    setAudioPreview(song.audio); setCoverPreview(song.cover); setAudioFile(null); setCoverFile(null); setTab('editor'); window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const saveDraft = () => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); setForm(current => ({ ...current, status: 'draft' })); setMessage('Đã lưu bản nháp trên thiết bị.');
  };
  const loadDraft = () => {
    try { const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null') as FormState | null; if (draft) { setForm(draft); setTab('editor'); setMessage('Đã khôi phục bản nháp.'); } } catch { setMessage('Bản nháp không hợp lệ.'); }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setMessage('');
    if (form.status === 'draft') return saveDraft();
    const duplicate = items.find(song => song.id !== editingId && song.title.trim().toLowerCase() === form.title.trim().toLowerCase() && song.artist.trim().toLowerCase() === form.artist.trim().toLowerCase());
    if (duplicate) return setMessage(`Đã tồn tại “${duplicate.title}” của ${duplicate.artist}.`);
    if (!form.cover.trim() && !coverFile) return setMessage('Hãy thêm URL hoặc upload ảnh bìa.');
    if (!form.audio.trim() && !audioFile) return setMessage('Hãy thêm URL hoặc upload file audio.');
    const song: Song = { id: editingId || `admin-${Date.now()}`, title: form.title.trim(), artist: form.artist.trim(), album: form.album.trim() || 'LARMX MUSIC', genre: form.genre.trim() || 'LARMX MUSIC', cover: form.cover.trim(), audio: form.audio.trim(), duration: Math.max(1, Number(form.duration) || 240), accent: '#c45cff', featured: form.status !== 'hidden' };
    setPublishing(true); setUploadProgress(35);
    try {
      setUploadProgress(58);
      if (editingId) {
        const original = items.find(item => item.id === editingId); const updated = await updateCuratedSong({ ...original, ...song }, audioFile, coverFile, storagePreference); setItems(current => current.map(item => item.id === updated.id ? updated : item)); setMessage('Đã cập nhật đầy đủ thông tin bài hát.');
      } else {
        const published = await publishCuratedSong(song, audioFile, coverFile, storagePreference); setItems(current => [published, ...current]); setMessage('Đã xuất bản bài hát lên LARMX.');
      }
      setUploadProgress(100); localStorage.removeItem(DRAFT_KEY); resetEditor(); setTab('library');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể lưu bài hát.'); }
    finally { setPublishing(false); window.setTimeout(() => setUploadProgress(0), 600); }
  };
  const toggleVisibility = async (song: Song) => {
    try { const updated = await updateCuratedSong({ ...song, featured: song.featured === false }); setItems(current => current.map(item => item.id === song.id ? updated : item)); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể đổi trạng thái.'); }
  };
  const bulkVisibility = async (visible: boolean) => {
    const changed = items.filter(song => selected.includes(song.id)).map(song => ({ ...song, featured: visible })); if (!changed.length) return;
    try { setItems(await updateManyCuratedSongs(changed)); setSelected([]); setMessage(`Đã ${visible ? 'hiện' : 'ẩn'} ${changed.length} bài hát.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể cập nhật hàng loạt.'); }
  };
  const renameGroup = async (kind: 'album' | 'artist', current: string) => {
    const next = window.prompt(`Tên ${kind === 'album' ? 'album' : 'nghệ sĩ'} mới`, current)?.trim(); if (!next || next === current) return;
    const changed = items.filter(song => song[kind] === current).map(song => ({ ...song, [kind]: next }));
    try { setItems(await updateManyCuratedSongs(changed)); setMessage(`Đã cập nhật ${changed.length} bài hát.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể cập nhật nhóm.'); }
  };
  const toggleFeaturedArtist = async (name: string, songs: Song[]) => {
    const nextValue = songs.some(song => song.featured_artist === false);
    try { setItems(await updateManyCuratedSongs(songs.map(song => ({ ...song, featured_artist: nextValue })))); setMessage(`${nextValue ? 'Đã thêm' : 'Đã bỏ'} ${name} ${nextValue ? 'vào' : 'khỏi'} Nghệ sĩ nổi bật.`); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể cập nhật nghệ sĩ nổi bật.'); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    const song = deleteTarget; setDeleteTarget(null);
    try { const trashed = await moveCuratedSongToTrash(song); setItems(current => current.filter(item => item.id !== song.id)); setTrash(current => [trashed, ...current]); setUndoSong(trashed); setMessage('Đã chuyển bài hát vào Thùng rác.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể chuyển vào thùng rác.'); }
  };
  const undoDelete = async () => { if (!undoSong) return; try { const restored = await restoreCuratedSong(undoSong.id); setItems(restored); setTrash(current => current.filter(song => song.id !== undoSong.id)); setUndoSong(null); setMessage('Đã khôi phục bài hát.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể khôi phục.'); } };
  const restoreSong = async (song: Song) => { try { setItems(await restoreCuratedSong(song.id)); setTrash(current => current.filter(item => item.id !== song.id)); setMessage(`Đã khôi phục “${song.title}”.`); } catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể khôi phục.'); } };
  const chooseStorage = (value: StoragePreference) => { setStoragePreference(value); persistStoragePreference(value); setMessage(`Đã chọn ${value === 'auto' ? 'Tự động chuyển nguồn' : value === 'r2' ? 'Cloudflare R2' : 'Supabase Storage'} cho các file upload mới.`); };
  const saveR2Token = () => { setR2AdminToken(r2Token); setMessage(r2Token.trim() ? 'Đã lưu mã R2 tạm thời trong phiên Studio này.' : 'Đã xóa mã R2 khỏi phiên Studio.'); };
  const testR2 = async () => {
    setCheckingStorage(true); setMessage(''); setR2AdminToken(r2Token);
    try { await verifyR2Access(); setStorageStatus(await fetchStorageStatus()); setMessage('Kết nối R2 thành công. Studio đã sẵn sàng upload.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Không thể kết nối R2.'); }
    finally { setCheckingStorage(false); }
  };

  if (!admin) return <motion.div className="admin-locked glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><span><LockKeyhole /></span><small>RESTRICTED AREA</small><h1>Chỉ dành cho quản trị viên.</h1><p>Đăng nhập bằng tài khoản Admin đã cấu hình.</p><div><AlertTriangle /> Quyền truy cập hiện chưa hợp lệ.</div></motion.div>;

  return <motion.div className="admin-studio admin-studio-v2" initial={{ opacity: 0, x: 18 }} animate={{ opacity: 1, x: 0 }}>
    <header className="admin-hero glass"><div><span><ShieldCheck /> ADMIN CONSOLE 2.0</span><h1>LARMX <i>Studio.</i></h1><p>Quản lý toàn bộ thư viện, metadata và trạng thái xuất bản.</p></div><div className="admin-status"><i /><b>Hệ thống hoạt động</b><small>{items.length} bài đang đồng bộ</small></div></header>

    <nav className="admin-tabs glass" aria-label="Điều hướng Studio">
      <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}><BarChart3 /> Tổng quan</button>
      <button className={tab === 'editor' ? 'active' : ''} onClick={() => { resetEditor(); setTab('editor'); }}><Plus /> Thêm bài</button>
      <button className={tab === 'library' ? 'active' : ''} onClick={() => setTab('library')}><Library /> Kho nhạc</button>
      <button className={tab === 'albums' ? 'active' : ''} onClick={() => setTab('albums')}><FolderOpen /> Album</button>
      <button className={tab === 'artists' ? 'active' : ''} onClick={() => setTab('artists')}><Users /> Nghệ sĩ</button>
      <button className={tab === 'analytics' ? 'active' : ''} onClick={() => setTab('analytics')}><Activity /> Thống kê</button>
      <button className={tab === 'homepage' ? 'active' : ''} onClick={() => setTab('homepage')}><Home /> Trang chủ</button>
      <button className={tab === 'storage' ? 'active' : ''} onClick={() => setTab('storage')}><Database /> Lưu trữ</button>
      <button className={tab === 'trash' ? 'active' : ''} onClick={() => setTab('trash')}><Trash2 /> Thùng rác {trash.length ? `(${trash.length})` : ''}</button>
    </nav>

    {message && <div className="admin-message glass"><Check /> <span>{message}</span><button onClick={() => setMessage('')}><X /></button></div>}

    {tab === 'dashboard' && <section className="admin-dashboard">
      <div className="admin-metrics"><article className="glass"><Music2 /><span><b>{items.length}</b><small>Bài hát</small></span></article><article className="glass"><Disc3 /><span><b>{albums}</b><small>Album</small></span></article><article className="glass"><UserRound /><span><b>{artists}</b><small>Nghệ sĩ</small></span></article><article className="glass"><EyeOff /><span><b>{hidden}</b><small>Đang ẩn</small></span></article></div>
      <div className="admin-dashboard-grid"><article className="admin-panel glass"><span>THAO TÁC NHANH</span><h2>Quản lý nội dung</h2><div><button onClick={() => { resetEditor(); setTab('editor'); }}><Plus /> Thêm bài mới</button><button onClick={() => setTab('library')}><Library /> Mở kho nhạc</button><button onClick={loadDraft}><RotateCcw /> Khôi phục bản nháp</button></div></article><article className="admin-panel glass"><span>TÌNH TRẠNG KHO</span><h2>Kiểm tra dữ liệu</h2><p>{items.filter(song => !song.cover || !song.audio).length} bài thiếu ảnh hoặc audio.</p><p>{hidden} bài không hiển thị ngoài Trang chủ.</p><p>{genres.length} thể loại đang được sử dụng.</p></article></div>
    </section>}

    {tab === 'editor' && <div className="admin-layout">
      <form className="admin-form glass" onSubmit={submit}><div className="admin-form-head"><span>{editingId ? <Edit3 /> : <Plus />}</span><div><small>{editingId ? 'EDIT RELEASE' : 'NEW RELEASE'}</small><h2>{editingId ? 'Chỉnh sửa bài hát' : 'Thêm bài hát'}</h2></div>{editingId && <button type="button" className="admin-editor-cancel" onClick={resetEditor}><X /> Hủy sửa</button>}</div>
        <div className="admin-storage-inline"><div><Database /><span><b>Nguồn upload</b><small>{storagePreference === 'auto' ? 'Supabase trước, tự chuyển R2 khi lỗi hoặc đầy' : storagePreference === 'r2' ? 'MP3 và ảnh mới được lưu trên Cloudflare R2' : 'MP3 và ảnh mới được lưu trên Supabase'}</small></span></div><select value={storagePreference} onChange={event => chooseStorage(event.target.value as StoragePreference)}><option value="auto">Tự động</option><option value="supabase">Supabase</option><option value="r2">Cloudflare R2</option></select></div>
        <div className="admin-fields"><label><span><Music2 /> Tên bài hát</span><input required value={form.title} onChange={e => update('title', e.target.value)} /></label><label><span><UserRound /> Nghệ sĩ</span><input required value={form.artist} onChange={e => update('artist', e.target.value)} /></label><label><span><Disc3 /> Album</span><input value={form.album} onChange={e => update('album', e.target.value)} /></label><label><span><Music2 /> Thể loại</span><input value={form.genre} onChange={e => update('genre', e.target.value)} /></label>
          <label className="full"><span><Image /> URL ảnh bìa</span><input type="url" value={coverFile ? '' : form.cover} onChange={e => { update('cover', e.target.value); setCoverFile(null); setCoverPreview(e.target.value); }} placeholder="https://.../cover.jpg" /></label>
          <div className={`admin-upload full ${draggingUpload === 'cover' ? 'is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDraggingUpload('cover'); }} onDragLeave={() => setDraggingUpload(null)} onDrop={e => { e.preventDefault(); setDraggingUpload(null); void chooseCover(e.dataTransfer.files[0]); }}><label className="admin-file-button"><Image /><span><b>Kéo-thả hoặc upload ảnh bìa</b><small>Tự cắt vuông và chuyển WebP · tối đa 10 MB</small></span><input type="file" accept="image/*" onChange={e => void chooseCover(e.target.files?.[0])} /></label></div>
          <label className="full"><span><Link2 /> URL file audio</span><input type="url" value={audioFile ? '' : form.audio} onChange={e => { update('audio', e.target.value); setAudioFile(null); setAudioPreview(e.target.value); }} placeholder="https://.../music.mp3" /></label>
          <div className={`admin-upload full ${draggingUpload === 'audio' ? 'is-dragging' : ''}`} onDragOver={e => { e.preventDefault(); setDraggingUpload('audio'); }} onDragLeave={() => setDraggingUpload(null)} onDrop={e => { e.preventDefault(); setDraggingUpload(null); chooseAudio(e.dataTransfer.files[0]); }}><label className="admin-file-button"><Upload /><span><b>Kéo-thả hoặc upload file nhạc</b><small>MP3, WAV, M4A · tối đa 200 MB</small></span><input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg" onChange={e => chooseAudio(e.target.files?.[0])} /></label>{(audioFile || audioPreview) && <div className="admin-audio-preview"><button type="button" onClick={() => { if (!audioRef.current) return; if (previewPlaying) audioRef.current.pause(); else void audioRef.current.play(); setPreviewPlaying(!previewPlaying); }}>{previewPlaying ? <Pause /> : <Play />}</button><FileAudio /><span><b>{audioFile?.name || 'Nghe thử audio'}</b><small>{form.duration} giây</small></span><audio ref={audioRef} src={audioPreview || form.audio} onEnded={() => setPreviewPlaying(false)} /></div>}</div>
          <label><span>Thời lượng (giây)</span><input type="number" min="1" value={form.duration} onChange={e => update('duration', e.target.value)} /></label><label><span>Trạng thái</span><select value={form.status} onChange={e => update('status', e.target.value)}><option value="published">Đã xuất bản</option><option value="hidden">Đang ẩn</option><option value="draft">Bản nháp</option></select></label>
        </div>
        {uploadProgress > 0 && <div className="admin-upload-progress"><i style={{ width: `${uploadProgress}%` }} /><span>{uploadProgress}%</span></div>}
        <div className="admin-form-actions"><button type="button" className="admin-draft" onClick={saveDraft}>Lưu bản nháp</button><button className="admin-publish" disabled={publishing}>{publishing ? <><Upload /> Đang lưu...</> : <><Check /> {editingId ? 'Cập nhật bài hát' : 'Xuất bản lên LARMX'}</>}</button></div>
      </form>
      <aside className="admin-preview glass"><small>LIVE PREVIEW</small><div className="preview-cover">{coverPreview || form.cover ? <img src={coverPreview || form.cover} alt="Xem trước" /> : <Image />}</div><h3>{form.title || 'Tên bài hát'}</h3><p>{form.artist || 'Tên nghệ sĩ'} · {form.album || 'LARMX MUSIC'}</p><span>{form.status === 'hidden' ? 'ĐANG ẨN' : form.status === 'draft' ? 'BẢN NHÁP' : form.genre || 'THỂ LOẠI'}</span></aside>
    </div>}

    {tab === 'library' && <section className="admin-library"><div className="admin-library-toolbar"><div><span>KHO NHẠC</span><h2>Quản lý bài hát</h2></div><label><Search /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Tìm bài hát, nghệ sĩ, album..." /></label><select value={genre} onChange={e => setGenre(e.target.value)}><option value="all">Tất cả thể loại</option>{genres.map(value => <option key={value}>{value}</option>)}</select><select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="all">Mọi trạng thái</option><option value="published">Đang hiện</option><option value="hidden">Đang ẩn</option></select></div>
      <div className="admin-bulk-bar glass"><button onClick={() => setSelected(selected.length === filtered.length ? [] : filtered.map(song => song.id))}>{selected.length === filtered.length && filtered.length ? <CheckSquare /> : <Square />} Chọn tất cả</button><span>{selected.length} bài đã chọn</span><button disabled={!selected.length} onClick={() => void bulkVisibility(true)}><Eye /> Hiện</button><button disabled={!selected.length} onClick={() => void bulkVisibility(false)}><EyeOff /> Ẩn</button></div>
      {filtered.length ? <div className="admin-list admin-list-selectable">{filtered.map((item, index) => <motion.article layout className={`glass ${selected.includes(item.id) ? 'selected' : ''}`} key={item.id}><button className="admin-row-check" onClick={() => setSelected(current => current.includes(item.id) ? current.filter(id => id !== item.id) : [...current, item.id])}>{selected.includes(item.id) ? <CheckSquare /> : <Square />}</button><b>{String(index + 1).padStart(2, '0')}</b><img src={item.cover} alt="" /><div><h3>{item.title}</h3><p>{item.artist} · {item.album} <span className={`admin-provider-badge ${item.audio_provider || 'supabase'}`}>{item.audio_provider === 'r2' ? 'R2' : item.audio_provider === 'external' ? 'URL' : 'SUPABASE'}</span></p></div><button className={item.featured === false ? 'admin-hidden-toggle off' : 'admin-hidden-toggle'} aria-label="Đổi trạng thái" onClick={() => void toggleVisibility(item)}>{item.featured === false ? <EyeOff /> : <Eye />}</button><button aria-label="Chỉnh sửa" onClick={() => editSong(item)}><Edit3 /></button><button aria-label="Xóa" onClick={() => setDeleteTarget(item)}><Trash2 /></button></motion.article>)}</div> : <div className="admin-empty"><Music2 /><p>Không tìm thấy bài hát phù hợp.</p></div>}
    </section>}

    {tab === 'albums' && <section className="admin-manage-page"><div className="section-head"><div><span>ALBUM MANAGER</span><h2>Quản lý Album</h2></div><small>{albumGroups.length} album</small></div><div className="admin-group-grid">{albumGroups.map(([name, songs]) => <article className="admin-group-card glass" key={name}><img src={songs[0]?.cover} alt="" /><div><h3>{name}</h3><p>{songs[0]?.artist} · {songs.length} bài hát</p></div><button onClick={() => void renameGroup('album', name)}><Edit3 /> Đổi tên</button></article>)}</div></section>}

    {tab === 'artists' && <section className="admin-manage-page"><div className="section-head"><div><span>ARTIST MANAGER</span><h2>Quản lý Nghệ sĩ</h2></div><small>{artistGroups.length} nghệ sĩ</small></div><div className="admin-group-grid artists">{artistGroups.map(([name, songs]) => { const featured = songs.every(song => song.featured_artist !== false); return <article className={`admin-group-card glass ${featured ? 'featured-artist' : ''}`} key={name}><img src={songs[0]?.cover} alt="" /><div><h3>{name}</h3><p>{songs.length} bài hát · {featured ? 'Đang nổi bật' : 'Đang ẩn khỏi Trang chủ'}</p></div><div className="admin-group-actions"><button onClick={() => void renameGroup('artist', name)}><Edit3 /> Đổi tên</button><button className={featured ? 'active' : ''} onClick={() => void toggleFeaturedArtist(name, songs)}>{featured ? <EyeOff /> : <Eye />} {featured ? 'Bỏ nổi bật' : 'Thêm nổi bật'}</button></div></article>; })}</div></section>}

    {tab === 'trash' && <section className="admin-manage-page"><div className="section-head"><div><span>RECOVERY CENTER</span><h2>Thùng rác</h2></div><small>{trash.length} bài hát</small></div>{trash.length ? <div className="admin-trash-list">{trash.map(song => <article className="glass" key={song.id}><img src={song.cover} alt="" /><div><h3>{song.title}</h3><p>{song.artist} · Đã xóa {song.deleted_at ? new Date(song.deleted_at).toLocaleDateString('vi-VN') : ''}</p></div><button onClick={() => void restoreSong(song)}><RotateCcw /> Khôi phục</button></article>)}</div> : <div className="admin-empty glass"><Trash2 /><p>Thùng rác đang trống.</p></div>}</section>}

    {tab === 'analytics' && <section className="admin-manage-page"><div className="section-head"><div><span>LOCAL ANALYTICS</span><h2>Thống kê lượt nghe</h2></div><small>Dữ liệu trên thiết bị này</small></div><div className="admin-metrics analytics"><article className="glass"><Play /><span><b>{totalPlays}</b><small>Tổng lượt phát</small></span></article><article className="glass"><Eye /><span><b>{items.length - hidden}</b><small>Bài đang hiện</small></span></article><article className="glass"><Disc3 /><span><b>{albums}</b><small>Album</small></span></article><article className="glass"><Users /><span><b>{artists}</b><small>Nghệ sĩ</small></span></article></div><div className="admin-ranking glass">{[...items].sort((a, b) => (playCounts[b.id] || 0) - (playCounts[a.id] || 0)).slice(0, 10).map((song, index) => <article key={song.id}><b>{index + 1}</b><img src={song.cover} alt="" /><div><h3>{song.title}</h3><p>{song.artist}</p></div><strong>{playCounts[song.id] || 0} lượt</strong></article>)}</div></section>}

    {tab === 'storage' && <section className="admin-storage-page">
      <div className="section-head"><div><span>STORAGE ROUTER</span><h2>Nguồn lưu trữ</h2><p>Supabase giữ dữ liệu bài hát; MP3 và ảnh có thể chuyển sang R2.</p></div><small>{storageStatus?.configured ? 'R2 đã cấu hình' : 'R2 chưa sẵn sàng'}</small></div>
      <div className="admin-storage-providers">
        <button className={`glass ${storagePreference === 'auto' ? 'active' : ''}`} onClick={() => chooseStorage('auto')}><span><RefreshCw /></span><div><b>Tự động</b><small>Ưu tiên Supabase, chuyển sang R2 nếu upload lỗi hoặc hết dung lượng.</small></div><i>{storagePreference === 'auto' && <Check />}</i></button>
        <button className={`glass ${storagePreference === 'supabase' ? 'active' : ''}`} onClick={() => chooseStorage('supabase')}><span><Database /></span><div><b>Supabase Storage</b><small>Giữ nguyên luồng upload hiện tại của LARMX.</small></div><i>{storagePreference === 'supabase' && <Check />}</i></button>
        <button className={`glass ${storagePreference === 'r2' ? 'active' : ''}`} onClick={() => chooseStorage('r2')}><span><Cloud /></span><div><b>Cloudflare R2</b><small>Lưu file mới trên bucket {storageStatus?.bucket || 'larmx-media'}.</small></div><i>{storagePreference === 'r2' && <Check />}</i></button>
      </div>
      <div className="admin-storage-grid">
        <article className="admin-storage-connect glass"><header><span><Cloud /></span><div><small>CLOUDFLARE R2</small><h3>{storageStatus?.configured ? 'Máy chủ đã nhận cấu hình' : 'Chờ cấu hình máy chủ'}</h3></div><i className={storageStatus?.configured ? 'online' : ''} /></header><p>{storageStatus?.reachable ? `API đang hoạt động · ${storageStatus.publicUrl || 'chưa có Public URL'}` : 'Chưa kết nối được API tại /api/storage/status.'}</p><label><span><KeyRound /> Mã quản trị upload</span><input type="password" value={r2Token} onChange={event => setR2Token(event.target.value)} placeholder="Giống R2_ADMIN_TOKEN trên VPS" autoComplete="off" /></label><div><button onClick={saveR2Token}><HardDrive /> Lưu trong phiên</button><button className="primary" disabled={checkingStorage} onClick={() => void testR2()}>{checkingStorage ? <RefreshCw className="spin" /> : <Activity />} Kiểm tra kết nối</button></div><small>Mã chỉ nằm trong sessionStorage và tự mất khi đóng tab; không được đưa vào biến VITE_.</small></article>
        <article className="admin-storage-summary glass"><span>PHÂN BỐ FILE</span><h3>Thư viện hiện tại</h3><div><p><Database /><b>{items.filter(song => (song.audio_provider || 'supabase') === 'supabase').length}</b><small>Audio Supabase</small></p><p><Cloud /><b>{items.filter(song => song.audio_provider === 'r2').length}</b><small>Audio R2</small></p><p><Link2 /><b>{items.filter(song => song.audio_provider === 'external').length}</b><small>URL bên ngoài</small></p></div><em>Việc đổi nguồn chỉ áp dụng cho file upload mới. Các bài cũ vẫn phát từ vị trí hiện tại.</em></article>
      </div>
    </section>}

    {tab === 'homepage' && <section className="admin-manage-page"><div className="admin-home-head"><div><span>HOMEPAGE PREVIEW</span><h2>Xem trước Trang chủ</h2><p>Thứ tự thực tế được quản lý tại mục “Sắp xếp đề xuất”.</p></div><div><button className={previewDevice === 'desktop' ? 'active' : ''} onClick={() => setPreviewDevice('desktop')}><Monitor /> Desktop</button><button className={previewDevice === 'mobile' ? 'active' : ''} onClick={() => setPreviewDevice('mobile')}><Smartphone /> Mobile</button></div></div><div className={`admin-device-preview glass ${previewDevice}`}><header><span>LARMX MUSIC</span><small>{items.filter(song => song.featured !== false).length} bài đang hiển thị</small></header><div className="admin-preview-grid">{items.filter(song => song.featured !== false).slice(0, previewDevice === 'mobile' ? 4 : 6).map(song => <article key={song.id}><img src={song.cover} alt="" /><h3>{song.title}</h3><p>{song.artist}</p></article>)}</div></div></section>}

    <AnimatePresence>{deleteTarget && <motion.div className="admin-confirm-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div className="admin-confirm glass" initial={{ y: 24, scale: .95 }} animate={{ y: 0, scale: 1 }} exit={{ y: 18, scale: .97 }}><span><Trash2 /></span><h2>Xóa “{deleteTarget.title}”?</h2><p>Bạn có 6 giây để hoàn tác trước khi bài bị xóa khỏi kho online.</p><div><button onClick={() => setDeleteTarget(null)}>Hủy</button><button onClick={confirmDelete}>Xóa bài hát</button></div></motion.div></motion.div>}</AnimatePresence>
    <AnimatePresence>{undoSong && <motion.div className="admin-undo glass" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><span>Đang xóa “{undoSong.title}”</span><button onClick={undoDelete}><RotateCcw /> Hoàn tác</button></motion.div>}</AnimatePresence>
  </motion.div>;
}
