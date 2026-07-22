import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, ArrowLeft, ExternalLink, Guitar, Headphones, KeyRound, LoaderCircle, Music2, Play, PlaySquare, Radio, Search, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { usePlayer } from '../context/PlayerContext';
import { getDailyHotMusic, markYouTubeVideoUnavailable, searchYouTube, type YouTubeVideo } from '../services/youtube';
import { YouTubeEmbed } from './YouTubeEmbed';

const suggestions = ['Nhạc chill Việt Nam', 'Vietnamese Indie', 'Lofi để học', 'EDM thịnh hành', 'Acoustic live'];
const suggestionIcons = [Headphones, Sparkles, Radio, Zap, Guitar];

export function YouTubeDiscover({ onBack, initialMode = 'trending' }: { onBack: () => void; initialMode?: 'trending' | 'lofi' }) {
  const audio = usePlayer();
  const [query, setQuery] = useState(initialMode === 'lofi' ? 'Lofi để học' : 'Nhạc hot Việt Nam');
  const [dailyChart, setDailyChart] = useState(initialMode === 'trending');
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [selected, setSelected] = useState<YouTubeVideo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const playerSectionRef = useRef<HTMLElement>(null);
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
    const request = initialMode === 'lofi' ? searchYouTube('Lofi để học', controller.signal) : getDailyHotMusic(controller.signal);
    request.then(results => { setVideos(results); setDailyChart(initialMode === 'trending'); }).catch(reason => {
      if (reason instanceof Error && reason.name !== 'AbortError') setError(reason.message);
    }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [hasKey, initialMode]);

  const submit = (event: FormEvent) => { event.preventDefault(); void runSearch(query); };
  const playVideo = (video: YouTubeVideo) => { audio.pause(); setSelected(video); };
  useEffect(() => {
    if (!selected) return;
    const frame = window.requestAnimationFrame(() => playerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }));
    return () => window.cancelAnimationFrame(frame);
  }, [selected]);
  const unavailable = useCallback((videoId: string, code: number) => {
    markYouTubeVideoUnavailable(videoId);
    setVideos(current => {
      const filtered = current.filter(video => video.id !== videoId);
      setSelected(active => {
        if (active?.id !== videoId) return active;
        const removedIndex = current.findIndex(video => video.id === videoId);
        return filtered[Math.min(Math.max(removedIndex, 0), Math.max(filtered.length - 1, 0))] || filtered[0] || null;
      });
      return filtered;
    });
    const reason = code === 153 ? 'YouTube từ chối player do chính sách nguồn phát' : 'Video bị giới hạn nhúng hoặc không còn khả dụng';
    setError(`${reason}. LARMX đã loại video này và chuyển sang kết quả tiếp theo.`);
    window.setTimeout(() => setError(''), 5000);
  }, []);

  return <motion.div className="youtube-discover" initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }}>
    <div className="youtube-top">
      <div><button className="discover-back" onClick={onBack}><ArrowLeft /> Trang chủ</button><span className="youtube-badge"><PlaySquare /> YOUTUBE MUSIC </span><h1>Thưởng thức mọi<br /><i>bài hát</i></h1><p>Tìm kiếm và thưởng thức video âm nhạc trực tiếp từ YouTube.</p></div>
      <div className="youtube-orb"><PlaySquare /><span /></div>
    </div>

    <form className="youtube-search glass" onSubmit={submit}><span className="youtube-search-icon"><Search /></span><label><small>TÌM KIẾM TRÊN YOUTUBE</small><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Bài hát, MV hoặc nghệ sĩ..." aria-label="Tìm kiếm YouTube" /></label><button type="submit" disabled={loading}>{loading ? <LoaderCircle className="spin" /> : <><Search /> Tìm kiếm</>}</button></form>
    <div className="youtube-suggestions"><button className={`youtube-trending-button ${dailyChart ? 'active' : ''}`} aria-label="Thịnh hành" title="Thịnh hành" onClick={() => void showTrending()} disabled={loading}><TrendingUp /><span>Thịnh hành</span></button><span className="youtube-music-filter" aria-label="Chỉ hiển thị nhạc" title="Chỉ hiển thị nhạc"><Music2 /><span>CHỈ HIỂN THỊ MUSIC</span></span>{suggestions.map((item, index) => { const Icon = suggestionIcons[index]; return <button className="youtube-suggestion-icon" aria-label={item} title={item} onClick={() => void runSearch(item)} key={item}><Icon /><span>{item}</span></button>; })}</div>

    {!hasKey && <section className="api-setup glass"><span><KeyRound /></span><div><small>CẦN THIẾT LẬP MỘT LẦN</small><h2>Kết nối YouTube Data API</h2><p>Tạo file <code>.env</code> ở thư mục dự án, thêm API key rồi khởi động lại dev server:</p><pre>VITE_YOUTUBE_API_KEY=YOUR_API_KEY_HERE</pre><p className="api-note"><AlertCircle /> Không commit hoặc chia sẻ file <code>.env</code>.</p></div></section>}

    <AnimatePresence mode="wait">{selected && <motion.section ref={playerSectionRef} className="youtube-player glass" key={selected.id} initial={{ opacity: 0, y: 30, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20 }}>
      <div className="youtube-frame"><YouTubeEmbed videoId={selected.id} title={selected.title} onUnavailable={unavailable} /></div>
      <div className="youtube-now"><span>ĐANG PHÁT TỪ YOUTUBE</span><h2>{selected.title}</h2><p>{selected.channel}</p><a href={`https://www.youtube.com/watch?v=${selected.id}`} target="_blank" rel="noreferrer">Mở trên YouTube <ExternalLink /></a></div>
    </motion.section>}</AnimatePresence>

    {error && hasKey && <div className="youtube-error glass"><AlertCircle /><div><b>Không tải được kết quả</b><p>{error}</p></div></div>}
    {!loading && hasKey && !error && videos.length === 0 && <div className="youtube-error glass"><AlertCircle /><div><b>Không tìm thấy video có thể phát nhúng</b><p>Hãy thử từ khóa khác hoặc nội dung từ một kênh chính thức.</p></div></div>}
    {loading && <div className="youtube-loading">{Array.from({ length: 8 }, (_, index) => <div className="youtube-skeleton glass" key={index}><i /><span /><small /></div>)}</div>}
    {!loading && videos.length > 0 && <section className="youtube-results"><div className="section-head"><div><span><Sparkles /> {dailyChart ? 'TOP 50 NHẠC HOT · CẬP NHẬT MỖI NGÀY' : 'KẾT QUẢ TỪ YOUTUBE'}</span><h2>{dailyChart ? 'Thịnh hành tại Việt Nam' : 'Âm nhạc dành cho bạn'}</h2></div><small>{dailyChart ? `Hôm nay · ${videos.length}/50 video` : `${videos.length} video`}</small></div><div className="youtube-grid">{videos.map((video, index) => <motion.article initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(index * .025, .35) }} whileHover={{ y: -7 }} className="youtube-card glass" key={video.id}><button className="youtube-thumb" onClick={() => playVideo(video)}><img src={video.thumbnail} alt="" /><span><Play fill="currentColor" /></span><i>{dailyChart ? `TOP ${index + 1}` : 'YOUTUBE'}</i></button><div><h3>{video.title}</h3><p>{video.channel}</p></div></motion.article>)}</div></section>}
  </motion.div>;
}
