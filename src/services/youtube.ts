export interface YouTubeVideo {
  id: string;
  title: string;
  channel: string;
  thumbnail: string;
  publishedAt: string;
}

interface SearchResponse {
  items?: Array<{
    id: { videoId?: string };
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: { high?: { url: string }; medium?: { url: string } };
    };
  }>;
  error?: { message?: string };
}

interface VideoStatusResponse {
  items?: Array<{ id: string; snippet?: { categoryId?: string }; status: { embeddable?: boolean; privacyStatus?: string }; contentDetails?: { regionRestriction?: { allowed?: string[]; blocked?: string[] } } }>;
  error?: { message?: string };
}

interface PopularVideosResponse {
  items?: Array<{
    id: string;
    snippet: {
      title: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: { maxres?: { url: string }; high?: { url: string }; medium?: { url: string } };
    };
    status: { embeddable?: boolean; privacyStatus?: string };
    contentDetails?: { regionRestriction?: { allowed?: string[]; blocked?: string[] } };
  }>;
  error?: { message?: string };
}

const HOT_CACHE_KEY = 'larmx-youtube-hot-v2';
const todayKey = () => new Date().toLocaleDateString('en-CA');

const decode = (value: string) => {
  const element = document.createElement('textarea');
  element.innerHTML = value;
  return element.value;
};

const availableInVietnam = (region?: { allowed?: string[]; blocked?: string[] }) =>
  !region?.blocked?.includes('VN') && (!region?.allowed || region.allowed.includes('VN'));

export async function getDailyHotMusic(signal?: AbortSignal): Promise<YouTubeVideo[]> {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!key) throw new Error('MISSING_API_KEY');

  let staleVideos: YouTubeVideo[] = [];
  try {
    const cached = JSON.parse(localStorage.getItem(HOT_CACHE_KEY) || 'null') as { day?: string; videos?: YouTubeVideo[] } | null;
    staleVideos = cached?.videos || [];
    if (cached?.day === todayKey() && cached.videos?.length) return cached.videos;
  } catch { /* Fetch a fresh chart when cache is invalid. */ }

  const params = new URLSearchParams({
    part: 'snippet,status,contentDetails',
    chart: 'mostPopular',
    regionCode: 'VN',
    videoCategoryId: '10',
    maxResults: '50',
    key,
  });
  let response: Response;
  try { response = await fetch(`https://www.googleapis.com/youtube/v3/videos?${params}`, { signal }); }
  catch (error) { if (!signal?.aborted && staleVideos.length) return staleVideos; throw error; }
  const data = await response.json() as PopularVideosResponse;
  if (!response.ok) {
    if (staleVideos.length) return staleVideos;
    throw new Error(data.error?.message || 'Không thể tải bảng xếp hạng YouTube');
  }

  const videos = (data.items || []).filter(video => video.status.embeddable && video.status.privacyStatus === 'public' && availableInVietnam(video.contentDetails?.regionRestriction)).map(video => ({
    id: video.id,
    title: decode(video.snippet.title),
    channel: decode(video.snippet.channelTitle),
    thumbnail: video.snippet.thumbnails.maxres?.url || video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url || '',
    publishedAt: video.snippet.publishedAt,
  }));
  if (videos.length) localStorage.setItem(HOT_CACHE_KEY, JSON.stringify({ day: todayKey(), videos }));
  return videos;
}

export async function searchYouTube(query: string, signal?: AbortSignal): Promise<YouTubeVideo[]> {
  const key = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!key) throw new Error('MISSING_API_KEY');
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', videoEmbeddable: 'true', videoSyndicated: 'true', safeSearch: 'moderate',
    maxResults: '30', regionCode: 'VN', relevanceLanguage: 'vi', videoCategoryId: '10', order: 'relevance', q: query, key,
  });
  const response = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal });
  const data = await response.json() as SearchResponse;
  if (!response.ok) throw new Error(data.error?.message || 'Không thể kết nối YouTube API');
  const candidates = (data.items || []).flatMap(item => item.id.videoId ? [{
    id: item.id.videoId,
    title: decode(item.snippet.title),
    channel: decode(item.snippet.channelTitle),
    thumbnail: item.snippet.thumbnails.high?.url || item.snippet.thumbnails.medium?.url || '',
    publishedAt: item.snippet.publishedAt,
  }] : []);
  if (!candidates.length) return [];

  // Search results may become restricted after indexing. Verify the current
  // status so the UI only offers videos YouTube still allows to be embedded.
  const statusParams = new URLSearchParams({
    part: 'snippet,status,contentDetails', id: candidates.map(video => video.id).join(','), key,
  });
  const statusResponse = await fetch(`https://www.googleapis.com/youtube/v3/videos?${statusParams}`, { signal });
  const statusData = await statusResponse.json() as VideoStatusResponse;
  if (!statusResponse.ok) throw new Error(statusData.error?.message || 'Không thể kiểm tra quyền phát video');
  const playable = new Set((statusData.items || []).filter(video => {
    const region = video.contentDetails?.regionRestriction;
    return video.snippet?.categoryId === '10' && video.status.embeddable && video.status.privacyStatus === 'public' && availableInVietnam(region);
  }).map(video => video.id));
  return candidates.filter(video => playable.has(video.id));
}
