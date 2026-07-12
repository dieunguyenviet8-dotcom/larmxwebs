import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, LogOut, ShieldCheck, User, UserPlus, X } from 'lucide-react';
import { FormEvent, useState } from 'react';

export interface UserProfile { name: string; username: string; avatar?: string; provider: 'local' }
interface StoredAccount { name: string; username: string; passwordHash: string; createdAt: string }
const USERS_KEY = 'larmx-local-accounts-v2';
const SESSION_KEY = 'larmx-user';

const hashPassword = async (password: string) => {
  const bytes = new TextEncoder().encode(`larmx:v2:${password}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, '0')).join('');
};
const readLocal = (): StoredAccount[] => { try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; } };
const openBackup = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open('larmx-account-backup', 1);
  request.onupgradeneeded = () => { if (!request.result.objectStoreNames.contains('accounts')) request.result.createObjectStore('accounts', { keyPath: 'username' }); };
  request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
});
const readBackup = async (): Promise<StoredAccount[]> => {
  try { const db = await openBackup(); return await new Promise(resolve => { const request = db.transaction('accounts').objectStore('accounts').getAll(); request.onsuccess = () => resolve(request.result as StoredAccount[]); request.onerror = () => resolve([]); }); } catch { return []; }
};
const saveAccounts = async (accounts: StoredAccount[]) => {
  localStorage.setItem(USERS_KEY, JSON.stringify(accounts));
  try { const db = await openBackup(); const transaction = db.transaction('accounts', 'readwrite'); const store = transaction.objectStore('accounts'); store.clear(); accounts.forEach(account => store.put(account)); } catch { /* localStorage remains the primary store */ }
};
const loadAccounts = async () => {
  const local = readLocal(); const backup = await readBackup();
  const merged = [...local, ...backup.filter(item => !local.some(account => account.username === item.username))];
  if (merged.length !== local.length) await saveAccounts(merged);
  return merged;
};

export function AuthModal({ open, user, onClose, onAuthenticated, onLogout, onToast }: { open: boolean; user: UserProfile | null; onClose: () => void; onAuthenticated: (user: UserProfile) => void; onLogout: () => void; onToast: (message: string) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(''); const [username, setUsername] = useState(''); const [password, setPassword] = useState(''); const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(normalized)) return setError('Username cần 3–24 ký tự, chỉ dùng chữ, số, dấu chấm hoặc gạch dưới.');
    if (password.length < 6) return setError('Mật khẩu phải có ít nhất 6 ký tự.');
    if (mode === 'register' && password !== confirmPassword) return setError('Mật khẩu nhập lại không khớp.');
    if (mode === 'register' && name.trim().length < 2) return setError('Vui lòng nhập tên hiển thị.');
    setBusy(true);
    try {
      const accounts = await loadAccounts(); const existing = accounts.find(account => account.username === normalized); const passwordHash = await hashPassword(password);
      let profile: UserProfile;
      if (mode === 'register') {
        if (existing) return setError('Username này đã được sử dụng.');
        const account: StoredAccount = { name: name.trim(), username: normalized, passwordHash, createdAt: new Date().toISOString() };
        await saveAccounts([...accounts, account]); profile = { name: account.name, username: account.username, provider: 'local' }; onToast('Tạo tài khoản thành công');
      } else {
        if (!existing || existing.passwordHash !== passwordHash) return setError('Username hoặc mật khẩu không đúng.');
        profile = { name: existing.name, username: existing.username, provider: 'local' }; onToast('Đăng nhập thành công');
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(profile)); onAuthenticated(profile); onClose(); setName(''); setUsername(''); setPassword(''); setConfirmPassword('');
    } catch { setError('Không thể truy cập bộ nhớ tài khoản trên trình duyệt này.'); }
    finally { setBusy(false); }
  };
  const logout = () => { localStorage.removeItem(SESSION_KEY); onLogout(); onToast('Đã đăng xuất'); onClose(); };
  const changeMode = (next: 'login' | 'register') => { setMode(next); setError(''); setPassword(''); setConfirmPassword(''); };
  return <AnimatePresence>{open && <motion.div className="auth-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onPointerDown={event => { if (event.target === event.currentTarget) onClose(); }}><motion.section className="auth-modal glass local-auth" initial={{ opacity: 0, y: 35, scale: .94 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 25, scale: .96 }} transition={{ type: 'spring', stiffness: 270, damping: 25 }}><button className="auth-close" aria-label="Đóng" onClick={onClose}><X /></button>
    {user ? <div className="account-view"><div className="account-avatar"><User /></div><span>TÀI KHOẢN LARMX</span><h2>{user.name}</h2><p>@{user.username}</p><div className="account-provider"><ShieldCheck /> Đã lưu trên thiết bị<Check /></div><button className="logout-button" onClick={logout}><LogOut /> Đăng xuất</button></div> : <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}><div className="auth-brand"><span>{mode === 'login' ? <LockKeyhole /> : <UserPlus />}</span><small>LOCAL SECURE ACCOUNT</small><h2>{mode === 'login' ? 'Chào mừng quay lại.' : 'Tạo tài khoản LARMX.'}</h2><p>Tài khoản được lưu dự phòng trong hai vùng nhớ trên thiết bị này.</p></div><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => changeMode('login')}>Đăng nhập</button><button className={mode === 'register' ? 'active' : ''} onClick={() => changeMode('register')}>Tạo tài khoản</button></div><form className="auth-form" onSubmit={event => void submit(event)}>{mode === 'register' && <label><span><User /> Tên hiển thị</span><input value={name} onChange={event => setName(event.target.value)} placeholder="Minh Anh" autoComplete="name" required /></label>}<label><span><User /> Username</span><input value={username} onChange={event => setUsername(event.target.value)} placeholder="minhanh_07" autoCapitalize="none" autoComplete="username" required /></label><label><span><LockKeyhole /> Mật khẩu</span><div className="password-field"><input type={showPassword ? 'text' : 'password'} value={password} onChange={event => setPassword(event.target.value)} placeholder="Tối thiểu 6 ký tự" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required /><button type="button" aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPassword(value => !value)}>{showPassword ? <EyeOff /> : <Eye />}</button></div></label>{mode === 'register' && <label><span><LockKeyhole /> Nhập lại mật khẩu</span><input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} placeholder="Nhập lại mật khẩu" autoComplete="new-password" required /></label>}{error && <motion.p className="auth-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>}<button className="auth-submit" disabled={busy}>{busy ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'} <ArrowRight /></button></form><p className="local-auth-note"><ShieldCheck /> Mật khẩu được băm trước khi lưu, không lưu dạng văn bản.</p></motion.div>}
  </motion.section></motion.div>}</AnimatePresence>;
}
