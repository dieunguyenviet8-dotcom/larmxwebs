import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, ExternalLink, KeyRound, LoaderCircle, Music2, Play, PlaySquare, Search, Sparkles, TrendingUp } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getDailyHotMusic, searchYouTube, type YouTubeVideo } from '../services/youtube';
import { YouTubeEmbed } from './YouTubeEmbed';

const suggestions = ['Nhạc chill Việt Nam', 'Vietnamese Indie', 'Lofi để học', 'EDM thịnh hành', 'Acoustic live'];

export function YouTubeDiscover({ onBack }: { onBack: () => void }) {
  const audio = usePlayer();
  const [query, setQuery] = useState('Nhạc hot Việt Nam');
  const [dailyChart, setDailyChart] = useState(true);
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selected, setSelected] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const hasKey = Boolean(import.meta.env.VITE_YOUTUBE_API_KEY);

  const runSearch = async (value: string) => {
    if (!value.trim()) return;
    setQuery(value); setLoading(true); setError(''); setDailyChart(false);
    try { setVideos(await searchYouTube(value.trim())); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Đã xảy ra lỗi'); }
    finally { setLoading(false); }
  };

  const showTrending = async () => {
    if (!hasKey) return;
    setLoading(true); setError(''); setSelected(null);
    try { setVideos(await getDailyHotMusic()); setDailyChart(true); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Không tải được bảng thịnh hành'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!hasKey) return;
    const controller = new AbortController();
    setLoading(true);
    getDailyHotMusic(controller.signal).then(results => { setVideos(results); setDailyChart(true); }).catch(reason => {
      if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [hasKey]);

  const submit = (event: FormEvent) => { event.preventDefault(); void runSearch(query); };
  const playVideo = (video: YouTubeVideo) => { audio.pause(); setSelected(video); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const unavailable = useCallback((videoId: string, code: number) => {
    setVideos(current => {
      const filtered = current.filter(video => video.id !== videoId);
      setSelected(active => active?.id === videoId ? (filtered[0] || null) : active);
      return filtered;
    });
    const reason = code === 153 ? 'YouTube từ chối player do chính sách nguồn phát' : 'Video bị giới hạn nhúng hoặc không còn khả dụng';
    setError(`${reason}. LARMX đã loại video này và chuyển sang kết quả tiếp theo.`);
    window.setTimeout(() => setError(''), 5000);
  }, []);

  return <motion.div className="youtube-discover" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }}>
    <div className="youtube-top">
      <div><button className="discover-back" onClick={onBack}><ArrowLeft /> Trang chủ</button><span className="youtube-badge"><PlaySquare /> YOUTUBE MUSIC </span><h1>Thưởng thức mọi<br /><i>âm thanh.</i></h1><p>Tìm kiếm và thưởng thức video âm nhạc trực tiếp từ YouTube.</p></div>
      <div className="youtube-orb"><PlaySquare /><span /></div>
    </div>

    <form className="youtube-search glass" onSubmit={submit}><span className="youtube-search-icon"><Search /></span><label><small>TÌM KIẾM TRÊN YOUTUBE</small><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Bài hát, MV hoặc nghệ sĩ..." aria-label="Tìm kiếm YouTube" /></label><button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <><Search /> Tìm kiếm</>}</button></form>
    <div className="youtube-suggestions"><button className={`youtube-trending-button ${dailyChart ? 'active' : ''}`} onClick={() => void showTrending()} disabled={loading}><TrendingUp /> Thịnh hành</button><span className="youtube-music-filter"><Music2 /> CHỈ HIỂN THỊ MUSIC</span>{suggestions.map(item => <button onClick={() => void runSearch(item)} key={item}>{item}</button>)}</div>

    {!hasKey && <section className="api-setup glass"><span><KeyRound /></span><div><small>CẦN THIẾT LẬP MỘT LẦN</small><h2>Kết nối YouTube Data API</h2><p>Tạo file <code>.env</code> ở thư mục dự án, thêm API key rồi khởi động lại dev server:</p><pre>VITE_YOUTUBE_API_KEY=YOUR_API_KEY_HERE</pre><p className="api-note"><AlertCircle /> Không commit hoặc chia sẻ file <code>.env</code>.</p></div></section>}

    <AnimatePresence mode="wait">{selected && <motion.section className="youtube-player glass" key={selected.id} initial={{ opacity: 0, y: 30, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}>
      <div className="youtube-frame"><YouTubeEmbed videoId={selected.id} title={selected.title} onUnavailable={unavailable} /></div>
      <div className="youtube-now"><span>ĐANG PHÁT TỪ YOUTUBE</span><h2>{selected.title}</h2><p>{selected.channel}</p><a href={`https://www.youtube.com/watch?v=${selected.id}`} target="_blank" rel="noreferrer">Mở trên YouTube <ExternalLink /></a></div>
    </motion.section>}</AnimatePresence>

    {error && hasKey && <div className="youtube-error glass"><AlertCircle /><div><b>Không tải được kết quả</b><p>{error}</p></div></div>}
    {!loading && hasKey && !error && videos.length === 0 && <div className="youtube-error glass"><AlertCircle /><div><b>Không tìm thấy video có thể phát nhúng</b><p>Hãy thử từ khóa khác hoặc nội dung từ một kênh chính thức.</p></div></div>}
    {loading && <div className="youtube-loading">{Array.from({ length: 8 }, (_, index) => <div className="youtube-skeleton glass" key={index}><i /><span /><small /></div>)}</div>}
    {!loading && videos.length > 0 && <section className="youtube-results"><div className="section-head"><div><span><Sparkles /> {dailyChart ? 'TOP 50 NHẠC HOT · CẬP NHẬT MỖI NGÀY' : 'KẾT QUẢ TỪ YOUTUBE'}</span><h2>{dailyChart ? 'Thịnh hành tại Việt Nam' : 'Âm nhạc dành cho bạn'}</h2></div><small>{dailyChart ? `Hôm nay · ${videos.length}/50 video` : `${videos.length} video`}</small></div><div className="youtube-grid">{videos.map((video, index) => <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .025, .35) }} whileHover={{ y: -7 }} className="youtube-card glass" key={video.id}><button className="youtube-thumb" onClick={() => playVideo(video)}><img src={video.thumbnail} alt="" /><span><Play fill="currentColor" /></span><i>{dailyChart ? `TOP ${index + 1}` : 'YOUTUBE'}</i></button><div><h3>{video.title}</h3><p>{video.channel}</p></div></motion.article>)}</div></section>}
  </motion.div>;
}
