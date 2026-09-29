// تولید شناسه یکتا — امن در همه محیط‌ها (حتی HTTP روی شبکه داخلی که crypto.randomUUID ندارد)
export function safeUUID(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const b = new Uint8Array(16);
      crypto.getRandomValues(b);
      b[6] = (b[6] & 0x0f) | 0x40; // نسخه ۴
      b[8] = (b[8] & 0x3f) | 0x80; // واریانت
      const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
      return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
    }
  } catch {
    // ادامه به فالبک قطعی
  }
  // فالبک قطعی: timestamp + تصادفی (کافی برای یکتایی در این اپ)
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
}
