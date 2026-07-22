import { supabase, supabaseConfigured } from './supabase';

export type StoragePreference = 'auto' | 'supabase' | 'r2';
export type StorageProvider = 'external' | 'supabase' | 'r2';

export interface StorageStatus {
  configured: boolean;
  provider: 'r2';
  bucket: string;
  publicUrl: string | null;
  reachable: boolean;
}

export interface UploadedAsset {
  url: string;
  path: string | null;
  provider: StorageProvider;
}

const PREFERENCE_KEY = 'larmx-storage-preference';
const TOKEN_KEY = 'larmx-r2-admin-token';

export const getStoragePreference = (): StoragePreference => {
  const value = localStorage.getItem(PREFERENCE_KEY);
  return value === 'supabase' || value === 'r2' ? value : 'auto';
};
export const setStoragePreference = (value: StoragePreference) => localStorage.setItem(PREFERENCE_KEY, value);
export const getR2AdminToken = () => sessionStorage.getItem(TOKEN_KEY) || '';
export const setR2AdminToken = (value: string) => {
  if (value.trim()) sessionStorage.setItem(TOKEN_KEY, value.trim());
  else sessionStorage.removeItem(TOKEN_KEY);
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  const data = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || `Máy chủ lưu trữ báo lỗi ${response.status}.`);
  return data;
};

export const fetchStorageStatus = async (): Promise<StorageStatus> => {
  try {
    const response = await fetch('/api/storage/status', { headers: { Accept: 'application/json' } });
    const data = await parseResponse<Omit<StorageStatus, 'reachable'>>(response);
    return { ...data, reachable: true };
  } catch {
    return { configured: false, provider: 'r2', bucket: 'larmx-media', publicUrl: null, reachable: false };
  }
};

export const verifyR2Access = async () => {
  const token = getR2AdminToken();
  if (!token) throw new Error('Hãy nhập mã quản trị R2.');
  const response = await fetch('/api/storage/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder: 'covers', fileName: 'connection-check.txt' }),
  });
  await parseResponse(response);
  return true;
};

const uploadToR2 = async (file: File, path: string): Promise<UploadedAsset> => {
  const token = getR2AdminToken();
  if (!token) throw new Error('Hãy nhập mã quản trị R2 trong mục Lưu trữ của Studio.');
  const folder = path.startsWith('covers/') ? 'covers' : 'songs';
  let response: Response;
  try {
    const params = new URLSearchParams({
      folder,
      fileName: file.name,
      size: String(file.size),
    });
    response = await fetch(`/api/storage/upload?${params}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream', Authorization: `Bearer ${token}` },
      body: file,
    });
  } catch {
    throw new Error('Không kết nối được API upload R2. Hãy kiểm tra terminal dev:storage và tải lại website.');
  }
  const uploaded = await parseResponse<{ publicUrl: string; key: string }>(response);
  return { url: uploaded.publicUrl, path: uploaded.key, provider: 'r2' };
};

const uploadToSupabase = async (file: File, path: string, bucket: string): Promise<UploadedAsset> => {
  if (!supabase || !supabaseConfigured) throw new Error('Supabase chưa được cấu hình.');
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type || 'application/octet-stream', cacheControl: '3600', upsert: true,
  });
  if (error) throw new Error(error.message);
  return { url: supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl, path, provider: 'supabase' };
};

export const uploadManagedAsset = async (file: File, path: string, bucket: string, preference: StoragePreference): Promise<UploadedAsset> => {
  if (preference === 'r2') return uploadToR2(file, path);
  if (preference === 'supabase') return uploadToSupabase(file, path, bucket);
  try { return await uploadToSupabase(file, path, bucket); }
  catch (supabaseError) {
    try { return await uploadToR2(file, path); }
    catch (r2Error) {
      const first = supabaseError instanceof Error ? supabaseError.message : 'Supabase thất bại';
      const second = r2Error instanceof Error ? r2Error.message : 'R2 thất bại';
      throw new Error(`Không thể upload tự động. Supabase: ${first}. R2: ${second}.`);
    }
  }
};

export const deleteManagedAsset = async (provider?: StorageProvider, path?: string | null, bucket = 'larmx-audio') => {
  if (!path) return;
  if (provider === 'r2') {
    const token = getR2AdminToken();
    if (!token) return;
    await fetch('/api/storage/object', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ key: path }),
    }).then(response => parseResponse(response));
    return;
  }
  if (provider === 'supabase' && supabase) await supabase.storage.from(bucket).remove([path]);
};
