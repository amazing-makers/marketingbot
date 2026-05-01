import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const TAG_LENGTH = 16;

function getKey(): Buffer {
    const secret = process.env.ENCRYPTION_KEY;
    if (!secret || secret.length < 32) {
        throw new Error('ENCRYPTION_KEY missing or too short (require >= 32 chars)');
    }
    // scrypt 로 32바이트 키 derive (salt 는 고정 = 같은 ENCRYPTION_KEY 면 같은 derived key)
    return scryptSync(secret, 'marketingbot-salt-v1', KEY_LENGTH);
}

export function encrypt(plaintext: string): string {
    const key = getKey();
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    // format: base64(iv || tag || ciphertext)
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(encoded: string): string {
    const key = getKey();
    const data = Buffer.from(encoded, 'base64');
    const iv = data.subarray(0, IV_LENGTH);
    const tag = data.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const ciphertext = data.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// 객체 단위 헬퍼 (자격증명이 보통 JSON object)
export function encryptJSON(obj: any): string {
    return encrypt(JSON.stringify(obj));
}

export function decryptJSON<T = any>(encoded: string): T {
    return JSON.parse(decrypt(encoded));
}
