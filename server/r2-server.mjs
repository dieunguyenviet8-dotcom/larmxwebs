import { createHmac, createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const loadEnv = (path) => {
  try {
    const source = readFileSync(path, 'utf8');
    for (const line of source.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]]) continue;
      let value = match[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
      process.env[match[1]] = value;
    }
  } catch { /* Environment variables can be provided by PM2/systemd instead. */ }
};

loadEnv(join(here, '.env'));

const config = {
  accountId: process.env.R2_ACCOUNT_ID || '',
  accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  bucket: process.env.R2_BUCKET || 'larmx-media',
  publicUrl: (process.env.R2_PUBLIC_URL || '').replace(/\/$/, ''),
  adminToken: process.env.R2_ADMIN_TOKEN || '',
  port: Number(process.env.R2_API_PORT || 8787),
};

const configured = () => Boolean(config.accountId && config.accessKeyId && config.secretAccessKey && config.bucket && config.publicUrl && config.adminToken);
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const hmac = (key, value, encoding) => createHmac('sha256', key).update(value).digest(encoding);
const encode = (value) => encodeURIComponent(value).replace(/[!'()*]/g, char => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
const encodePath = (value) => value.split('/').map(encode).join('/');
const safeSegment = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 150);
const safeKey = (folder, fileName) => `${folder === 'covers' ? 'covers' : 'songs'}/${Date.now()}-${randomUUID()}-${safeSegment(fileName || 'file')}`;

const signingKey = (date) => {
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, date);
  const regionKey = hmac(dateKey, 'auto');
  const serviceKey = hmac(regionKey, 's3');
  return hmac(serviceKey, 'aws4_request');
};

const presignPut = (key) => {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = amzDate.slice(0, 8);
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodePath(config.bucket)}/${encodePath(key)}`;
  const params = {
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${config.accessKeyId}/${scope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': '900',
    'X-Amz-SignedHeaders': 'host',
  };
  const canonicalQuery = Object.entries(params).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([name, value]) => `${encode(name)}=${encode(value)}`).join('&');
  const canonicalRequest = ['PUT', canonicalUri, canonicalQuery, `host:${host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(shortDate), stringToSign, 'hex');
  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
};

const signedDelete = async (key) => {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const shortDate = amzDate.slice(0, 8);
  const scope = `${shortDate}/auto/s3/aws4_request`;
  const host = `${config.accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodePath(config.bucket)}/${encodePath(key)}`;
  const payloadHash = sha256('');
  const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = ['DELETE', canonicalUri, '', canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonicalRequest)].join('\n');
  const signature = hmac(signingKey(shortDate), stringToSign, 'hex');
  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  const response = await fetch(`https://${host}${canonicalUri}`, { method: 'DELETE', headers: { Authorization: authorization, 'x-amz-content-sha256': payloadHash, 'x-amz-date': amzDate } });
  if (!response.ok && response.status !== 404) throw new Error(`R2 delete failed (${response.status})`);
};

const json = (response, status, body) => {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  response.end(JSON.stringify(body));
};
const readJson = async (request) => {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 32_768) throw new Error('Request quá lớn.');
  }
  return body ? JSON.parse(body) : {};
};
const authorized = (request) => {
  const supplied = String(request.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!supplied || !config.adminToken) return false;
  const left = Buffer.from(supplied); const right = Buffer.from(config.adminToken);
  return left.length === right.length && timingSafeEqual(left, right);
};

createServer(async (request, response) => {
  try {
    const url = new URL(request.url || '/', 'http://localhost');
    if (request.method === 'GET' && url.pathname === '/api/storage/status') {
      return json(response, 200, { configured: configured(), provider: 'r2', bucket: config.bucket, publicUrl: config.publicUrl || null });
    }
    if (!configured()) return json(response, 503, { error: 'R2 chưa được cấu hình đầy đủ trên máy chủ.' });
    if (!authorized(request)) return json(response, 401, { error: 'Mã quản trị R2 không hợp lệ.' });
    if (request.method === 'POST' && url.pathname === '/api/storage/presign') {
      const body = await readJson(request);
      const key = safeKey(body.folder, body.fileName);
      return json(response, 200, { uploadUrl: presignPut(key), publicUrl: `${config.publicUrl}/${encodePath(key)}`, key, provider: 'r2', expiresIn: 900 });
    }
    if (request.method === 'POST' && url.pathname === '/api/storage/upload') {
      const folder = url.searchParams.get('folder') === 'covers' ? 'covers' : 'songs';
      const fileName = url.searchParams.get('fileName') || 'file';
      const contentLength = Number(url.searchParams.get('size'));
      if (!Number.isSafeInteger(contentLength) || contentLength <= 0 || contentLength > 220 * 1024 * 1024) {
        return json(response, 400, { error: 'Kích thước file không hợp lệ hoặc vượt quá 220 MB.' });
      }
      const key = safeKey(folder, fileName);
      const upload = await fetch(presignPut(key), {
        method: 'PUT',
        headers: {
          'Content-Type': String(request.headers['content-type'] || 'application/octet-stream'),
          'Content-Length': String(contentLength),
        },
        body: request,
        duplex: 'half',
      });
      if (!upload.ok) {
        const detail = await upload.text().catch(() => '');
        throw new Error(`R2 từ chối upload (${upload.status})${detail ? `: ${detail.slice(0, 240)}` : ''}`);
      }
      return json(response, 200, { publicUrl: `${config.publicUrl}/${encodePath(key)}`, key, provider: 'r2' });
    }
    if (request.method === 'DELETE' && url.pathname === '/api/storage/object') {
      const body = await readJson(request);
      if (!body.key || !/^(songs|covers)\//.test(body.key)) return json(response, 400, { error: 'Đường dẫn R2 không hợp lệ.' });
      await signedDelete(body.key);
      return json(response, 200, { deleted: true });
    }
    return json(response, 404, { error: 'Không tìm thấy API.' });
  } catch (error) {
    return json(response, 500, { error: error instanceof Error ? error.message : 'Lỗi máy chủ.' });
  }
}).listen(config.port, '127.0.0.1', () => {
  console.log(`LARMX R2 API listening on http://127.0.0.1:${config.port}`);
});
