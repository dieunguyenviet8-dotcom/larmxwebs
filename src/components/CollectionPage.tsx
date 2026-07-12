import { AnimatePresence, motion } from 'framer-motion';
import { Disc3, ListMusic, LockKeyhole, Mic2, Music2, Play, Plus, Trash2, X } from 'lucide-react';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { fetchCuratedSongs, getCuratedSongs } from '../services/curatedMusic';
import type { Playlist } from '../types/music';

type View = 'albums' | 'artists' | 'playlists';
const currentUsername = () => { try { return String(JSON.parse(localStorage.getItem('larmx-user') || 'null')?.username || ''); } catch { return ''; } };
const playlistKey = (username: string) => `larmx-playlists:${username.trim().toLowerCase()}`;

export function CollectionPage({ view }: { view: View }) {
  const player = usePlayer(); const [songs, setSongs] = useState(getCuratedSongs); const username = currentUsername();
  useEffect(() => { void fetchCuratedSongs().then(setSongs).catch(() => undefined); }, []);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => { try { return JSON.parse(localStorage.getItem(playlistKey(username)) || '[]'); } catch { return []; } });
  const [creating, setCreating] = useState(false); const [name, setName] = useState(''); const [description, setDescription] = useState(''); const [selected, setSelected] = useState<string[]>([]);
  const albums = useMemo(() => Array.from(new Map(songs.map(song => [song.album || 'Không tên', { name: song.album || 'Không tên', artist: song.artist, cover: song.cover, songs: songs.filter(item => item.album === song.album) }])).values()), [songs]);
  const artists = useMemo(() => Array.from(new Map(songs.map(song => [song.artist, { name: song.artist, image: song.cover, songs: songs.filter(item => item.artist === song.artist) }])).values()), [songs]);
  const save = (next: Playlist[]) => { setPlaylists(next); localStorage.setItem(playlistKey(username), JSON.stringify(next)); };
  const create = (event: FormEvent) => { event.preventDefault(); const playlist: Playlist = { id: `playlist-${Date.now()}`, name: name.trim(), description: description.trim() || 'Playlist của bạn', songIds: selected, cover: songs.find(song => selected.includes(song.id))?.cover || '/assets/liquid-soul.webp' }; save([playlist, ...playlists]); setName(''); setDescription(''); setSelected([]); setCreating(false); };
  const playFirst = (ids: string[]) => { const song = songs.find(item => ids.includes(item.id)); if (song) player.play(song); };
  const config = view === 'albums' ? { icon: Disc3, eyebrow: 'ALBUM COLLECTION', title: 'Album', accent: 'của bạn.' } : view === 'artists' ? { icon: Mic2, eyebrow: 'ARTIST COLLECTION', title: 'Nghệ sĩ', accent: 'bạn theo dõi.' } : { icon: ListMusic, eyebrow: 'PRIVATE COLLECTION', title: 'Playlist', accent: 'riêng tư.' };
  const Icon = config.icon;

  if (view === 'playlists' && !username) return <motion.div className="collection-login glass" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}><span><LockKeyhole /></span><small>ACCOUNT REQUIRED</small><h1>Đăng nhập để dùng Playlist.</h1><p>Mỗi tài khoản LARMX có thư viện playlist riêng và không chia sẻ với tài khoản khác.</p></motion.div>;

  return <motion.div className="collection-page select-page" initial={{ opacity: 0, x: 22 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 }}>
    <header className={`collection-hero glass ${view}`}><div><span><Icon /> {config.eyebrow}</span><h1>{config.title} <i>{config.accent}</i></h1><p>{view === 'playlists' ? `Không gian riêng của @${username}.` : 'Được tự động sắp xếp từ những bản nhạc trong LARMX MUSIC.'}</p></div>{view === 'playlists' && <button onClick={() => setCreating(true)}><Plus /> Tạo playlist</button>}</header>
    <section className="content-section"><div className="section-head"><div><span>YOUR MUSIC</span><h2>{view === 'albums' ? 'Tất cả album' : view === 'artists' ? 'Tất cả nghệ sĩ' : 'Playlist của bạn'}</h2></div><small>{view === 'albums' ? albums.length : view === 'artists' ? artists.length : playlists.length} mục</small></div>
      {view === 'albums' && (albums.length ? <div className="collection-grid">{albums.map(album => <motion.article whileHover={{ y: -7 }} className="collection-card glass" key={album.name}><img src={album.cover} alt="" /><div><h3>{album.name}</h3><p>{album.artist} · {album.songs.length} bài</p></div><button aria-label="Phát album" onClick={() => playFirst(album.songs.map(song => song.id))}><Play fill="currentColor" /></button></motion.article>)}</div> : <Empty icon={Disc3} text="Chưa có album nào." />)}
      {view === 'artists' && (artists.length ? <div className="collection-grid artists">{artists.map(artist => <motion.article whileHover={{ y: -7 }} className="collection-card glass" key={artist.name}><img src={artist.image} alt="" /><div><h3>{artist.name}</h3><p>{artist.songs.length} bài hát</p></div><button aria-label="Phát nhạc nghệ sĩ" onClick={() => playFirst(artist.songs.map(song => song.id))}><Play fill="currentColor" /></button></motion.article>)}</div> : <Empty icon={Mic2} text="Chưa có nghệ sĩ nào." />)}
      {view === 'playlists' && (playlists.length ? <div className="collection-grid">{playlists.map(list => <motion.article layout whileHover={{ y: -7 }} className="collection-card glass" key={list.id}><img src={list.cover} alt="" /><div><h3>{list.name}</h3><p>{list.songIds.length} bài · {list.description}</p></div><button aria-label="Phát playlist" onClick={() => playFirst(list.songIds)}><Play fill="currentColor" /></button><button className="collection-delete" aria-label="Xóa playlist" onClick={() => save(playlists.filter(item => item.id !== list.id))}><Trash2 /></button></motion.article>)}</div> : <Empty icon={ListMusic} text="Bạn chưa tạo playlist nào." />)}
    </section>
    <AnimatePresence>{creating && <motion.div className="playlist-modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.form className="playlist-modal glass" onSubmit={create} initial={{ opacity: 0, scale: .94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: .96 }}><button type="button" className="playlist-close" aria-label="Đóng" onClick={() => setCreating(false)}><X /></button><span>NEW PLAYLIST</span><h2>Tạo playlist riêng.</h2><label>Tên playlist<input required value={name} onChange={event => setName(event.target.value)} placeholder="Late Night Drive" /></label><label>Mô tả<input value={description} onChange={event => setDescription(event.target.value)} placeholder="Những bài hát cho đêm muộn" /></label><div className="playlist-song-picker"><small>CHỌN BÀI HÁT</small>{songs.length ? songs.map(song => <label key={song.id}><input type="checkbox" checked={selected.includes(song.id)} onChange={() => setSelected(value => value.includes(song.id) ? value.filter(id => id !== song.id) : [...value, song.id])} /><img src={song.cover} alt="" /><span><b>{song.title}</b><small>{song.artist}</small></span></label>) : <p>Chưa có nhạc trong LARMX MUSIC.</p>}</div><button className="playlist-create"><Plus /> Tạo playlist</button></motion.form></motion.div>}</AnimatePresence>
  </motion.div>;
}

function Empty({ icon: Icon, text }: { icon: typeof Music2; text: string }) { return <div className="collection-empty glass"><Icon /><h2>{text}</h2><p>Thêm nhạc trong Studio Admin để bắt đầu xây dựng bộ sưu tập.</p></div>; }
