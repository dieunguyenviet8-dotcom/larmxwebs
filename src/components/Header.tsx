import { Bell, CheckCheck, Clock3, Heart, Menu, Music2, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useState } from 'react';
import { AuthModal, type UserProfile } from './AuthModal';

const notices = [
  { id: 'release', icon: Sparkles, title: 'Album mới dành cho bạn', text: 'Liquid Soul vừa được thêm vào tuyển chọn.', time: '2 phút' },
  { id: 'favorite', icon: Heart, title: 'Bài hát yêu thích', text: 'Neon Afterglow đang thịnh hành hôm nay.', time: '1 giờ' },
  { id: 'mix', icon: Music2, title: 'Daily Mix đã sẵn sàng', text: 'Một playlist mới dựa trên gu của bạn.', time: '3 giờ' },
];

export function Header({ query, setQuery, onMenu, onUserChange }: { query: string; setQuery: (value: string) => void; onMenu: () => void; onUserChange?: (user: UserProfile | null) => void }) {
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(() => { try { return JSON.parse(localStorage.getItem('larmx-user') || 'null'); } catch { return null; } });
  const [read, setRead] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('larmx-notifications-read') || '[]'); } catch { return []; } });
  const [toast, setToast] = useState('');
  const showToast = useCallback((message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2400); }, []);
  const authenticated = useCallback((profile: UserProfile) => { setUser(profile); onUserChange?.(profile); }, [onUserChange]);
  const unread = notices.filter(notice => !read.includes(notice.id)).length;
  const markRead = (id: string) => { const next = read.includes(id) ? read : [...read, id]; setRead(next); localStorage.setItem('larmx-notifications-read', JSON.stringify(next)); showToast('Đã đánh dấu thông báo là đã đọc'); };
  const markAll = () => { const next = notices.map(notice => notice.id); setRead(next); localStorage.setItem('larmx-notifications-read', JSON.stringify(next)); showToast('Đã đọc tất cả thông báo'); };

  return <>
    <motion.header className="header" initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55, ease: [0.22, 1, 0.36, 1] }}>
      <motion.button whileTap={{ scale: .82 }} className="menu-button" aria-label="Mở menu" onClick={onMenu}><Menu /></motion.button>
      <motion.label whileFocus={{ scale: 1.008 }} className="search glass"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm bài hát, nghệ sĩ, album..." aria-label="Tìm kiếm" /><motion.button whileHover={{ rotate: 90 }} aria-label="Bộ lọc"><SlidersHorizontal /></motion.button></motion.label>
      <div className="header-action-wrap">
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: .86 }} className={`round glass ${notificationOpen ? 'active' : ''}`} aria-label="Thông báo" onClick={() => { setNotificationOpen(value => !value); setAuthOpen(false); }}><Bell />{unread > 0 && <motion.i key={unread} initial={{ scale: 0 }} animate={{ scale: 1 }}>{unread}</motion.i>}</motion.button>
        <AnimatePresence>{notificationOpen && <motion.section className="notification-panel glass" initial={{ opacity: 0, y: -12, scale: .96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: .97 }}>
          <div className="notification-head"><div><small>TRUNG TÂM</small><h3>Thông báo</h3></div><button onClick={markAll}><CheckCheck /> Đọc tất cả</button></div>
          <div className="notification-list">{notices.map(({ id, icon: Icon, title, text, time }) => <button className={read.includes(id) ? 'read' : ''} onClick={() => markRead(id)} key={id}><span><Icon /></span><div><b>{title}</b><p>{text}</p><small><Clock3 /> {time} trước</small></div>{!read.includes(id) && <i />}</button>)}</div>
          <div className="notification-foot">Bạn đã xem hết thông báo mới</div>
        </motion.section>}</AnimatePresence>
      </div>
      <motion.button whileHover={{ y: -2 }} className="profile" onClick={() => { setAuthOpen(true); setNotificationOpen(false); }}>
        {user?.avatar ? <img src={user.avatar} alt="Avatar" /> : <span className="profile-avatar">{user ? user.name.charAt(0).toUpperCase() : 'L'}</span>}
        <span><b>{user?.name || 'Đăng nhập'}</b><small>{user ? '@' + user.username : 'Lưu thư viện của bạn'}</small></span>
      </motion.button>
    </motion.header>
    <AuthModal open={authOpen} user={user} onClose={() => setAuthOpen(false)} onAuthenticated={authenticated} onLogout={() => { setUser(null); onUserChange?.(null); }} onToast={showToast} />
    <AnimatePresence>{toast && <motion.div className="header-toast glass" initial={{ opacity: 0, y: -12, x: '-50%' }} animate={{ opacity: 1, y: 0, x: '-50%' }} exit={{ opacity: 0, y: -8, x: '-50%' }}><CheckCheck />{toast}</motion.div>}</AnimatePresence>
  </>;
}
