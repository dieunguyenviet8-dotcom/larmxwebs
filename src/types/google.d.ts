interface GoogleCredentialResponse { credential: string; select_by: string }
interface GoogleAccountsId {
  initialize(config: { client_id: string; callback: (response: GoogleCredentialResponse) => void; auto_select?: boolean }): void;
  renderButton(element: HTMLElement, options: Record<string, string | number | boolean>): void;
  disableAutoSelect(): void;
}
interface Window { google?: { accounts: { id: GoogleAccountsId } } }

interface YouTubePlayerEvent { target: YouTubePlayer }
interface YouTubePlayerErrorEvent { data: number; target: YouTubePlayer }
interface YouTubePlayer { playVideo(): void; destroy(): void }
interface Window {
  YT?: { Player: new (element: HTMLElement, config: { videoId: string; playerVars?: Record<string, string | number>; events?: { onReady?: (event: YouTubePlayerEvent) => void; onError?: (event: YouTubePlayerErrorEvent) => void } }) => YouTubePlayer };
  onYouTubeIframeAPIReady?: () => void;
}
