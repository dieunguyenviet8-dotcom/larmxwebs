export interface Song {id:string; title:string; artist:string; album:string; genre:string; duration:number; cover:string; audio:string; accent:string; featured?:boolean; featured_artist?:boolean; home_order?:number|null; deleted_at?:string|null; storage_path?:string|null; cover_storage_path?:string|null; audio_provider?:'external'|'supabase'|'r2'; cover_provider?:'external'|'supabase'|'r2'}
export interface Album {id:string;title:string;artist:string;cover:string;year:number}
export interface Artist {id:string;name:string;image:string;listeners:string}
export interface Playlist {id:string;name:string;description:string;songIds:string[];cover:string}
