import { AnimatePresence, motion } from 'framer-motion';
import { Album, Compass, Crown, Disc3, Heart, Home, Library, ListOrdered, Mic2, Music2, PanelLeftClose, ShieldCheck, X } from 'lucide-react';

const navigation = [{ icon: Home, label: 'Trang chủ', id: 'home' }, { icon: Compass, label: 'Khám phá', id: 'discover' }, { icon: Crown, label: 'LARMX MUSIC', id: 'select' }, { icon: Library, label: 'Thư viện', id: 'library' }, { icon: ShieldCheck, label: 'Studio Admin', id: 'admin', adminOnly: true }, { icon: ListOrdered, label: 'Sắp xếp đề xuất', id: 'recommendations', adminOnly: true }];
const collection = [{ icon: Heart, label: 'Bài hát yêu thích', id: 'favorites' }, { icon: Album, label: 'Album', id: 'albums' }, { icon: Mic2, label: 'Nghệ sĩ', id: 'artists' }, { icon: Music2, label: 'Playlist', id: 'playlists' }];

export function Sidebar({ open, onClose, activeView, onNavigate, showAdmin }: { open: boolean; onClose: () => void; activeView: string; onNavigate: (view: string) => void; showAdmin: boolean }) {
  const navigate = (view: string) => { onNavigate(view); onClose(); };
  return <AnimatePresence><motion.aside initial={false} animate={{ x: open ? 0 : undefined }} className={`sidebar glass ${open ? 'open' : ''}`}>
    <div className="brand"><span className="logo"><Disc3 /></span><div><b>LARMX</b><small>MUSIC</small></div><button type="button" className="mobile-only sidebar-close" aria-label="Đóng menu" onPointerDown={event => { event.preventDefault(); event.stopPropagation(); onClose(); }} onClick={onClose}><X /></button></div>
    <nav>{navigation.filter(item => !item.adminOnly || showAdmin).map(({ icon: Icon, label, id }) => <button className={activeView === id ? 'selected' : ''} onClick={() => navigate(id)} key={id}><Icon /><span>{label}</span>{id === 'select' && <i className="nav-new">NEW</i>}{id === 'admin' && <i className="nav-admin">ADMIN</i>}</button>)}<p>Bộ sưu tập</p>{collection.map(({ icon: Icon, label, id }) => <button className={id && activeView === id ? 'selected' : ''} onClick={() => id && navigate(id)} key={label}><Icon /><span>{label}</span></button>)}</nav>
    <button className="collapse"><PanelLeftClose /> Thu gọn</button>
  </motion.aside></AnimatePresence>;
}
