/**
 * Cloudflare R2 (S3-compatible) 객체 저장소 — AI 생성 이미지 / 사용자 업로드 미디어 호스팅.
 *
 * 왜 R2:
 *   - 이미지가 캠페인에 첨부되어야 Telegram/WordPress/Discord 가 photo URL 로 받음 (data URL 은 외부 API 가 거부)
 *   - 무료 10GB / 1M Class A / 10M Class B operations / month
 *   - egress 무료 (S3 와 차이)
 *   - 같은 SDK (@aws-sdk/client-s3) 그대로 사용 (endpoint 만 R2 로 바꿈)
 *
 * 환경변수:
 *   R2_ENDPOINT          (https://<account_id>.r2.cloudflarestorage.com)
 *   R2_ACCESS_KEY_ID
 *   R2_SECRET_ACCESS_KEY
 *   R2_BUCKET            (bucket 이름)
 *   R2_PUBLIC_URL        (public custom domain — https://media.example.com 또는 R2.dev URL)
 *
 * 키 발급:
 *   1. Cloudflare 대시보드 → R2 Object Storage → 버킷 생성
 *   2. "API 토큰 관리" → Account API Token 생성 (Object Read & Write)
 *   3. 버킷 settings → Public access 또는 Custom Domain 연결 (R2_PUBLIC_URL 결정)
 */
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';

let cachedClient: S3Client | null = null;

function getClient(): S3Client {
    if (cachedClient) return cachedClient;
    const endpoint = process.env.R2_ENDPOINT;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
    if (!endpoint || !accessKeyId || !secretAccessKey) {
        throw new Error('R2 미설정 — R2_ENDPOINT / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY 환경변수를 확인하세요.');
    }
    cachedClient = new S3Client({
        region: 'auto',
        endpoint,
        credentials: { accessKeyId, secretAccessKey },
        // R2 는 v4 signing + path-style 모두 OK. 기본 (virtual-host) 사용.
    });
    return cachedClient;
}

export function isR2Configured(): boolean {
    return !!(process.env.R2_ENDPOINT && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET);
}

export interface UploadResult {
    /** R2 object key (bucket 내부 경로). */
    key: string;
    /** 외부에서 접근 가능한 public URL. R2_PUBLIC_URL 기반. */
    url: string;
    /** 업로드 바이트. */
    size: number;
    /** Content-Type. */
    contentType: string;
}

/**
 * Buffer 또는 base64 data URL 을 R2 에 업로드.
 *
 * keyPrefix 예: `users/${userId}/ai-images` — 사용자별·용도별 디렉터리 분리.
 * 키는 keyPrefix + crypto random 8자 + 확장자 자동 부여.
 */
export async function uploadToR2(input: {
    data: Buffer | string; // Buffer | base64 data URL ('data:image/png;base64,...')
    keyPrefix: string;
    contentType?: string;
    /** 명시적 파일명 (확장자 포함). 미지정 시 random + 자동 확장자. */
    filename?: string;
}): Promise<UploadResult> {
    const bucket = process.env.R2_BUCKET;
    const publicBase = process.env.R2_PUBLIC_URL;
    if (!bucket) throw new Error('R2_BUCKET 환경변수 미설정');
    if (!publicBase) throw new Error('R2_PUBLIC_URL 환경변수 미설정 (public domain 또는 r2.dev URL)');

    let buffer: Buffer;
    let mime = input.contentType || 'application/octet-stream';

    if (typeof input.data === 'string') {
        // data URL 파싱
        const m = input.data.match(/^data:([^;,]+);base64,(.+)$/);
        if (m) {
            mime = m[1];
            buffer = Buffer.from(m[2], 'base64');
        } else {
            throw new Error('data 가 string 인 경우 data:<mime>;base64,<data> 형식이어야 합니다.');
        }
    } else {
        buffer = input.data;
    }

    // 키 생성 — 충돌 방지용 random 8자
    const ext = input.filename
        ? '.' + (input.filename.split('.').pop() || 'bin')
        : extFromMime(mime);
    const random = Math.random().toString(36).slice(2, 10);
    const ts = Date.now();
    const key = `${input.keyPrefix}/${ts}-${random}${ext}`.replace(/^\/+/, '');

    const client = getClient();
    await client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mime,
        // R2 는 ACL 미지원 — 버킷 자체를 public 으로 설정해야 함
        CacheControl: 'public, max-age=31536000, immutable',
    }));

    const url = `${publicBase.replace(/\/+$/, '')}/${key}`;
    return { key, url, size: buffer.length, contentType: mime };
}

/**
 * R2 객체 삭제. 사용자가 캠페인 미디어 제거하거나 청소 cron 에서 호출.
 */
export async function deleteFromR2(key: string): Promise<void> {
    const bucket = process.env.R2_BUCKET;
    if (!bucket) throw new Error('R2_BUCKET 미설정');
    const client = getClient();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

/**
 * 환경변수 + 자격증명 검증 — 설정 페이지 "테스트" 버튼용.
 */
export async function verifyR2Config(): Promise<{ ok: boolean; bucket?: string; error?: string }> {
    if (!isR2Configured()) return { ok: false, error: '환경변수 미설정' };
    try {
        const client = getClient();
        const bucket = process.env.R2_BUCKET!;
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        return { ok: true, bucket };
    } catch (e: any) {
        return { ok: false, error: e?.message || String(e) };
    }
}

function extFromMime(mime: string): string {
    const map: Record<string, string> = {
        'image/png': '.png',
        'image/jpeg': '.jpg',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/svg+xml': '.svg',
        'video/mp4': '.mp4',
        'video/webm': '.webm',
    };
    return map[mime.toLowerCase()] || '.bin';
}
