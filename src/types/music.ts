export interface Song {id:string; title:string; artist:string; album:string; genre:string; duration:number; cover:string; audio:string; accent:string; featured?:boolean; home_order?:number|null}
export interface Album {id:string;title:string;artist:string;cover:string;year:number}
export interface Artist {id:string;name:string;image:string;listeners:string}
export interface Playlist {id:string;name:string;description:string;songIds:string[];cover:string}
