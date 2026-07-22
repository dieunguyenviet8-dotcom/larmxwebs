import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Flame, Headphones, SlidersHorizontal, Sparkles, X } from 'lucide-react';
import { usePlayer } from './context/PlayerContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { HeroBanner } from './components/HeroBanner';
import { AlbumSection, ArtistSection, SongSection } from './components/Sections';
import { MusicPlayer } from './components/MusicPlayer';
import { FullscreenPlayer } from './components/FullscreenPlayer';
import { MobileNavigation } from './components/MobileNavigation';
import { YouTubeDiscover } from './components/YouTubeDiscover';
import { AdminStudio } from './components/AdminStudio';
import { AdminRecommendations } from './components/AdminRecommendations';
import { LarmxSelect } from './components/LarmxSelect';
import { Favorites } from './components/Favorites';
import { CollectionPage } from './components/CollectionPage';
import { LibraryPage } from './components/LibraryPage';
import type { UserProfile } from './components/AuthModal';
import { CURATED_EVENT, fetchCuratedSongs, getCuratedSongs, isAdminUsername, subscribeCuratedSongs } from './services/curatedMusic';
import type { Song } from './types/music';

const genres = ['Tất cả', 'Electronic', 'Indie Pop', 'R&B', 'Ambient'];

export default function App() {
  const [view, setView] = useState('home');
  const [discoverMode, setDiscoverMode] = useState<'trending' | 'lofi'>('trending');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState('Tất cả');
  const [menu, setMenu] = useState(false);
  const [full, setFull] = useState(false);
  const [toast, setToast] = useState('');
  const [catalog, setCatalog] = useState<Song[]>(getCuratedSongs);
  const [account, setAccount] = useState<UserProfile | null>(() => { try { return JSON.parse(localStorage.getItem('larmx-user') || 'null'); } catch { return null; } });
  const [now, setNow] = useState(() => new Date());
  const player = usePlayer();
  const hour = now.getHours();
  const greeting = hour >= 5 && hour < 12 ? 'CHÀO BUỔI SÁNG' : hour >= 12 && hour < 18 ? 'CHÀO BUỔI CHIỀU' : 'CHÀO BUỔI TỐI';
  const greetingName = (account?.name || account?.username || 'BẠN').toLocaleUpperCase('vi-VN');
  const handleUserChange = useCallback((user: UserProfile | null) => { setAccount(user); if (!isAdminUsername(user?.username)) setView(current => current === 'admin' || current === 'recommendations' ? 'home' : current); }, []);
  const filtered = useMemo(() => catalog.filter(song => song.featured !== false && (genre === 'Tất cả' || song.genre === genre) && `${song.title} ${song.artist} ${song.album}`.toLowerCase().includes(query.toLowerCase())), [catalog, query, genre]);
  const homeCatalog = useMemo(() => catalog.filter(song => song.featured !== false).sort((a, b) => (a.home_order ?? Number.MAX_SAFE_INTEGER) - (b.home_order ?? Number.MAX_SAFE_INTEGER)), [catalog]);
  const recent = player.recent.map(id => catalog.find(song => song.id === id)).filter(Boolean) as Song[];
  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2200); };
  const openHomeCollection = (nextGenre: string, message: string) => {
    setView('home'); setQuery(''); setGenre(nextGenre); showToast(message);
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => document.querySelector('.content-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })));
  };
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!menu) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', closeOnEscape); };
  }, [menu]);
  useEffect(() => {
    const syncLocal = () => setCatalog(getCuratedSongs());
    void fetchCuratedSongs().then(setCatalog).catch(() => syncLocal());
    const unsubscribeRealtime = subscribeCuratedSongs(setCatalog);
    window.addEventListener(CURATED_EVENT, syncLocal);
    window.addEventListener('storage', syncLocal);
    return () => {
      unsubscribeRealtime();
      window.removeEventListener(CURATED_EVENT, syncLocal);
      window.removeEventListener('storage', syncLocal);
    };
  }, []);
  useEffect(() => {
    const onKeyboard = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.matches('input, textarea, select, [contenteditable="true"]');
      if (event.key === 'Tab') {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
        return;
      }
      if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
      const hasSong = player.current.id !== 'larmx-empty';
      if (event.code === 'Space' && hasSong) { event.preventDefault(); player.isPlaying ? player.pause() : player.play(); }
      else if (event.key === 'ArrowLeft' && hasSong) { event.preventDefault(); player.seek(Math.max(0, player.time - 10)); }
      else if (event.key === 'ArrowRight' && hasSong) { event.preventDefault(); player.seek(Math.min(player.duration || 0, player.time + 10)); }
      else if (event.key === 'ArrowUp') { event.preventDefault(); player.setVolume(Math.min(1, player.volume + .05)); }
      else if (event.key === 'ArrowDown') { event.preventDefault(); player.setVolume(Math.max(0, player.volume - .05)); }
      else if (event.key.toLowerCase() === 'm') player.toggleMute();
      else if (event.key.toLowerCase() === 'n' && hasSong) player.next();
      else if (event.key.toLowerCase() === 'p' && hasSong) player.previous();
      else if (event.key.toLowerCase() === 'f' && hasSong) setFull(value => !value);
      else if (event.key.toLowerCase() === 'l' && hasSong) {
        const added = player.toggleFavorite(player.current.id);
        showToast(added ? 'Đã thêm vào bài hát yêu thích' : 'Đã bỏ khỏi yêu thích');
      } else if (event.key === 'Escape') {
        setMenu(false); setFull(false);
      }
    };
    window.addEventListener('keydown', onKeyboard);
    return () => window.removeEventListener('keydown', onKeyboard);
  }, [player]);

  const withoutPlayer = view === 'discover' || view === 'admin' || view === 'recommendations';
  return <div className={`app app-wide ${withoutPlayer ? 'no-local-player' : ''}`}>
    <div className="aurora a1" /><div className="aurora a2" /><div className="aurora a3" />
    <Sidebar open={menu} onClose={() => setMenu(false)} activeView={view} onNavigate={nextView => { setMenu(false); window.requestAnimationFrame(() => setView(nextView)); }} showAdmin={isAdminUsername(account?.username)} />
    {menu && <button className="scrim" aria-label="Đóng menu" onPointerDown={() => setMenu(false)} onClick={() => setMenu(false)} />}
    <div className="workspace workspace-wide"><main className="main main-wide">
      <Header query={query} setQuery={setQuery} onMenu={() => setMenu(true)} onUserChange={handleUserChange} />
      <AnimatePresence mode="sync" initial={false}>
        {view === 'discover' ? <YouTubeDiscover key={`discover-${discoverMode}`} initialMode={discoverMode} onBack={() => setView('home')} /> : view === 'admin' ? <AdminStudio key="admin" /> : view === 'recommendations' ? <AdminRecommendations key="recommendations" /> : view === 'select' ? <LarmxSelect key="select" /> : view === 'library' ? <LibraryPage key="library" /> : view === 'favorites' ? <Favorites key="favorites" /> : view === 'albums' || view === 'artists' || view === 'playlists' ? <CollectionPage key={view} view={view} /> :
        <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -18 }}>
          <div className="welcome welcome-upgraded"><div><p>{greeting}, {greetingName}</p><h1>Bảng Xếp Hạng Âm Nhạc<br />cho <i>Việt Nam</i></h1></div><div className="filters"><SlidersHorizontal />{genres.map(item => <button className={genre === item ? 'active' : ''} onClick={event => { setGenre(item); event.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }); }} key={item}>{item}</button>)}</div></div>
          {!query && <HeroBanner song={homeCatalog[0]} queue={homeCatalog} />}
          {!query && <section className="quick-strip" aria-label="Lối tắt âm nhạc"><button type="button" className="quick-item glass" onClick={() => openHomeCollection('Tất cả', 'Đã mở tuyển chọn dành cho bạn')}><span className="quick-icon violet"><Sparkles /></span><span><b>Made for You</b><small>Tuyển chọn mỗi ngày</small></span></button><button type="button" className="quick-item glass" onClick={() => { setQuery(''); setDiscoverMode('trending'); setView('discover'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span className="quick-icon pink"><Flame /></span><span><b>Top 50 Việt Nam</b><small>Những ca khúc dẫn đầu</small></span></button><button type="button" className="quick-item glass" onClick={() => { setQuery(''); setDiscoverMode('lofi'); setView('discover'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}><span className="quick-icon blue"><Headphones /></span><span><b>Chill Station</b><small>Lofi để học</small></span></button></section>}
          <SongSection key={`songs-${genre}-${query}`} title={query ? `Kết quả cho “${query}”` : 'Đề xuất cho bạn'} items={filtered} onToast={showToast} />
          {!query && <><AlbumSection items={homeCatalog} /><SongSection title="Mới cập nhật" items={homeCatalog.slice(0, 12)} onToast={showToast} /><ArtistSection items={homeCatalog} />{recent.length > 0 && <SongSection key={`recent-${player.recent.join('-')}`} title="Gần đây đã nghe" items={recent} onToast={showToast} />}</>}
        </motion.div>}
      </AnimatePresence>
    </main></div>
    <AnimatePresence>{!withoutPlayer && <MusicPlayer onFullscreen={() => setFull(true)} />}</AnimatePresence><MobileNavigation activeView={view} onNavigate={setView} /><FullscreenPlayer open={full} onClose={() => setFull(false)} />
    <AnimatePresence>{toast && <motion.div className="toast glass" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}><span>✓</span>{toast}<button aria-label="Đóng" onClick={() => setToast('')}><X /></button></motion.div>}</AnimatePresence>
  </div>;
}
