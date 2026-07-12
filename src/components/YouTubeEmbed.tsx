import { useEffect, useRef } from 'react';

let apiPromise: Promise<void> | null = null;
const loadYouTubeApi = () => {
  if (window.YT?.Player) return Promise.resolve();
  if (apiPromise) return apiPromise;
  apiPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.youtube.com/iframe_api"]');
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { previousReady?.(); resolve(); };
    if (existing) return;
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api'; script.async = true;
    script.onerror = () => reject(new Error('Không tải được YouTube Player API'));
    document.head.appendChild(script);
  });
  return apiPromise;
};

export function YouTubeEmbed({ videoId, title, onUnavailable }: { videoId: string; title: string; onUnavailable: (videoId: string, code: number) => void }) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false; let player: YouTubePlayer | null = null;
    void loadYouTubeApi().then(() => {
      if (disposed || !host.current || !window.YT) return;
      host.current.innerHTML = '';
      const mount = document.createElement('div'); host.current.appendChild(mount);
      player = new window.YT.Player(mount, {
        videoId,
        playerVars: { autoplay: 1, playsinline: 1, rel: 0, origin: window.location.origin },
        events: {
          onReady: event => event.target.playVideo(),
          onError: event => { if (!disposed) onUnavailable(videoId, event.data); },
        },
      });
    }).catch(() => { if (!disposed) onUnavailable(videoId, 153); });
    return () => { disposed = true; try { player?.destroy(); } catch { /* player may already be removed */ } if (host.current) host.current.innerHTML = ''; };
  }, [videoId, onUnavailable]);
  return <div className="youtube-embed-host" ref={host} role="region" aria-label={`YouTube player: ${title}`} />;
}
