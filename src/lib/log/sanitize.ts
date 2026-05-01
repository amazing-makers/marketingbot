const SENSITIVE_KEYS = [
    'password', 'credential', 'credentials', 'license', 'licenseKey', 
    'token', 'apiKey', 'apikey', 'secret', 'authorization'
];

export function sanitize(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    // 배열 처리
    if (Array.isArray(obj)) {
        return obj.map(sanitize);
    }

    const out: any = {};
    for (const [k, v] of Object.entries(obj)) {
        // 키 이름에 민감 정보 키워드가 포함되어 있는지 확인 (대소문자 무시)
        const isSensitive = SENSITIVE_KEYS.some(s => k.toLowerCase().includes(s.toLowerCase()));
        
        if (isSensitive) {
            out[k] = '***REDACTED***';
        } else if (v && typeof v === 'object') {
            // 중첩 객체 재귀 처리
            out[k] = sanitize(v);
        } else {
            out[k] = v;
        }
    }
    return out;
}
