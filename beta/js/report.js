'use strict';
/* ===== Relatório: páginas em canvas, colagem antes/depois e PDF ===== */
const RW = 1240, RH = 1754, RM = 90;
const loadImg = (src) => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
async function ensureFonts() {
  const fs = ["italic 500 40px 'Cormorant Garamond'", "600 40px 'Cormorant Garamond'", "400 20px 'Jost'", "500 20px 'Jost'"];
  try { await Promise.all(fs.map((f) => document.fonts.load(f))); } catch (e) { /* segue com fonte padrão */ }
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function cover(ctx, img, x, y, w, h, r) {
  ctx.save(); rr(ctx, x, y, w, h, r || 0); ctx.clip();
  const k = Math.max(w / img.width, h / img.height), iw = img.width * k, ih = img.height * k;
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih); ctx.restore();
}
function wrap(ctx, text, maxW) {
  const out = [];
  String(text).split('\n').forEach((para) => {
    let line = '';
    para.split(' ').forEach((w) => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; });
    out.push(line);
  });
  return out;
}
function pill(ctx, text, x, y, h, fill, color) {
  ctx.font = "500 20px 'Jost'"; const w = ctx.measureText(text).width + 36;
  ctx.fillStyle = fill; rr(ctx, x, y, w, h, h / 2); ctx.fill(); ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, x + 18, y + h / 2 + 1); ctx.textBaseline = 'alphabetic'; return w;
}
async function renderReport(s, opt) {
  // fotos encolhem um pouco antes de deixar o final sozinho numa página quase vazia
  let best;
  for (const k of [0.62, 0.54, 0.46]) {
    const r = await layoutReport(s, opt, k);
    if (!best || r.pages.length < best.pages.length) best = r;
    if (r.pages.length === 1 || r.lastUsed > 420) break;
  }
  return best.pages;
}
async function layoutReport(s, opt, k) {
  opt = Object.assign({ resumo: true, tecnica: true, fotos: true, cuidados: true, manutencao: true }, opt || {});
  await ensureFonts();
  const c = client(s.clientId) || { name: '' };
  const sv = SERVICES[s.service] || SERVICES.cilios;
  const pages = []; let cv, ctx, y;
  const logo = S.settings.logo ? await loadImg(S.settings.logo).catch(() => null) : null;
  const newPage = (first) => {
    cv = document.createElement('canvas'); cv.width = RW; cv.height = RH; ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, RW, RH); pages.push(cv);
    let x = RM;
    if (logo) { ctx.save(); ctx.beginPath(); ctx.arc(x + 36, RM + 36, 36, 0, 7); ctx.clip(); const k = Math.max(72 / logo.width, 72 / logo.height); ctx.drawImage(logo, x + 36 - logo.width * k / 2, RM + 36 - logo.height * k / 2, logo.width * k, logo.height * k); ctx.restore(); x += 94; }
    ctx.fillStyle = '#3B2E2E'; ctx.font = "italic 500 58px 'Cormorant Garamond'"; ctx.textBaseline = 'alphabetic';
    ctx.fillText(S.settings.studio, x, RM + 48);
    ctx.textAlign = 'right'; ctx.fillStyle = '#7F6538'; ctx.font = "500 19px 'Jost'";
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '3px';
    ctx.fillText('RELATÓRIO DO PROCEDIMENTO', RW - RM, RM + 26);
    if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    ctx.fillStyle = '#756560'; ctx.font = "400 24px 'Jost'"; ctx.fillText(fmtLong(s.date), RW - RM, RM + 60); ctx.textAlign = 'left';
    ctx.fillStyle = '#E3CFAE'; ctx.fillRect(RM, RM + 92, RW - RM * 2, 2);
    y = RM + 150;
  };
  const need = (h) => { if (y + h > RH - 130) newPage(false); };
  const section = (t) => { need(120); ctx.fillStyle = '#3B2E2E'; ctx.font = "600 42px 'Cormorant Garamond'"; ctx.fillText(t, RM, y); y += 22; };
  newPage(true);
  ctx.fillStyle = '#756560'; ctx.font = "400 22px 'Jost'"; ctx.fillText('Cliente', RM, y - 20);
  ctx.fillStyle = '#3B2E2E'; ctx.font = "500 40px 'Jost'"; ctx.fillText(c.name, RM, y + 24); y += 96;
  if (opt.resumo) {
    section('Seu procedimento'); y += 38;
    ctx.fillStyle = '#3B2E2E'; ctx.font = "400 30px 'Jost'"; ctx.fillText(procTitle(s) + (s.status === 'concluido' ? '' : ''), RM, y); y += 30;
    if (opt.tecnica) {
      const items = techItems(s).filter((i) => !(s.service === 'cilios' && i[0] === 'Técnica')).slice(0, 6), more = items.length > 4;
      if (!items.length && s.produto) items.push(['Produtos e técnica', s.produto]);
      if (items.length) {
        y += 14; const n = more ? 3 : items.length, w = (RW - RM * 2 - 18 * (n - 1)) / n;
        items.forEach((it, i) => { if (i && i % n === 0) y += 118; const x = RM + (i % n) * (w + 18); ctx.fillStyle = '#FAF3EF'; rr(ctx, x, y, w, 100, 18); ctx.fill(); ctx.fillStyle = '#756560'; ctx.font = "400 21px 'Jost'"; ctx.fillText(it[0], x + 20, y + 36); ctx.fillStyle = '#3B2E2E'; ctx.font = "500 30px 'Jost'"; ctx.fillText(it[1], x + 20, y + 76); });
        y += 100;
      }
    }
    y += 60;
  }
  if (opt.fotos) {
    let list = anglesComplete(s);
    const single = [];
    if (!list.length) Object.keys(ANGLES).forEach((a) => ['antes', 'depois'].forEach((st) => { if (photoOf(s, st, a)) single.push([a, st]); }));
    if (list.length || single.length) {
      section('Antes e depois'); y += 34;
      const pw = (RW - RM * 2 - 24) / 2, ph = Math.round(pw * k);
      const drawPhoto = async (stage, angle, x) => {
        const p = photoOf(s, stage, angle); const im = await loadImg(PC.get(p.id));
        cover(ctx, im, x, y, pw, ph, 20);
        ctx.fillStyle = 'rgba(255,253,251,.92)'; rr(ctx, x + 14, y + 14, stage === 'antes' ? 96 : 112, 38, 19); ctx.fill();
        ctx.fillStyle = '#3B2E2E'; ctx.font = "500 18px 'Jost'"; ctx.textBaseline = 'middle'; ctx.fillText(stage === 'antes' ? 'ANTES' : 'DEPOIS', x + 30, y + 34); ctx.textBaseline = 'alphabetic';
      };
      for (const a of list) {
        need(ph + 70); ctx.fillStyle = '#756560'; ctx.font = "400 22px 'Jost'"; ctx.fillText(ANGLES[a], RM, y - 8); y += 6;
        await drawPhoto('antes', a, RM); await drawPhoto('depois', a, RM + pw + 24); y += ph + 54;
      }
      for (const [a, st] of single) { need(ph + 70); ctx.fillStyle = '#756560'; ctx.font = "400 22px 'Jost'"; ctx.fillText(ANGLES[a], RM, y - 8); y += 6; await drawPhoto(st, a, RM); y += ph + 54; }
      y += 6;
    }
  }
  if (opt.cuidados) {
    const care = s.cuidados || careFor(s.service);
    if (care.length) {
      section('Cuidados para o resultado durar mais'); y += 40;
      ctx.font = "400 28px 'Jost'";
      for (const t of care) {
        const lines = wrap(ctx, t, RW - RM * 2 - 56); need(lines.length * 38 + 14);
        ctx.strokeStyle = '#A45F5C'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); ctx.moveTo(RM + 2, y - 8); ctx.lineTo(RM + 12, y + 2); ctx.lineTo(RM + 28, y - 18); ctx.stroke();
        ctx.fillStyle = '#3B2E2E'; ctx.font = "400 28px 'Jost'"; lines.forEach((l, i) => ctx.fillText(l, RM + 56, y + i * 38)); y += lines.length * 38 + 14;
      }
      y += 26;
    }
  }
  if (opt.manutencao) {
    need(150); ctx.fillStyle = '#F3E1DC'; rr(ctx, RM, y, RW - RM * 2, 120, 22); ctx.fill();
    ctx.fillStyle = '#8A4A47'; ctx.font = "500 20px 'Jost'"; if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '2px'; ctx.fillText('PRÓXIMA MANUTENÇÃO', RM + 34, y + 44); if (ctx.letterSpacing !== undefined) ctx.letterSpacing = '0px';
    ctx.fillStyle = '#3B2E2E'; ctx.font = "500 34px 'Jost'"; ctx.fillText(sv.nextTxt.charAt(0).toUpperCase() + sv.nextTxt.slice(1) + ' · ' + fmtDate(nextDate(s)), RM + 34, y + 92);
    ctx.textAlign = 'right'; ctx.font = "italic 500 36px 'Cormorant Garamond'"; ctx.fillText('Com carinho, ' + (S.settings.owner || ''), RW - RM - 34, y + 74); ctx.textAlign = 'left';
    y += 150;
  }
  pages.forEach((p, i) => { const g = p.getContext('2d'); g.fillStyle = '#756560'; g.font = "400 20px 'Jost'"; g.textAlign = 'center'; g.fillText(S.settings.studio + (S.settings.insta ? ' · ' + S.settings.insta : '') + (pages.length > 1 ? '  ·  ' + (i + 1) + '/' + pages.length : ''), RW / 2, RH - 60); g.textAlign = 'left'; });
  return { pages, lastUsed: y - (RM + 150) };
}
async function renderCollage(s, angle) {
  await ensureFonts();
  const W = 1600, P = 48, pw = (W - P * 2 - 28) / 2, ph = Math.round(pw * 0.75), H = 150 + ph + 120;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const ctx = cv.getContext('2d');
  ctx.fillStyle = '#FAF6F2'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3B2E2E'; ctx.font = "italic 500 52px 'Cormorant Garamond'"; ctx.fillText(S.settings.studio, P, 84);
  ctx.textAlign = 'right'; ctx.fillStyle = '#756560'; ctx.font = "400 26px 'Jost'"; ctx.fillText(ANGLES[angle] + ' · ' + fmtDate(s.date), W - P, 80); ctx.textAlign = 'left';
  for (const [i, st] of ['antes', 'depois'].entries()) {
    const p = photoOf(s, st, angle); const x = P + i * (pw + 28);
    if (p) { const im = await loadImg(PC.get(p.id)); cover(ctx, im, x, 130, pw, ph, 26); }
    ctx.fillStyle = 'rgba(255,253,251,.92)'; rr(ctx, x + 18, 148, 120, 44, 22); ctx.fill();
    ctx.fillStyle = '#3B2E2E'; ctx.font = "500 22px 'Jost'"; ctx.textBaseline = 'middle'; ctx.fillText(st === 'antes' ? 'ANTES' : 'DEPOIS', x + 38, 171); ctx.textBaseline = 'alphabetic';
  }
  ctx.fillStyle = '#756560'; ctx.font = "400 26px 'Jost'"; ctx.fillText(procTitle(s), P, H - 46);
  return cv;
}
const b64 = (cv, q) => cv.toDataURL('image/jpeg', q || 0.9).split(',')[1];
function buildPdf(canvases) {
  const parts = []; let len = 0; const off = [];
  const enc = new TextEncoder();
  const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; parts.push(b); len += b.length; };
  const startObj = (n) => { off[n] = len; push(n + ' 0 obj\n'); };
  const N = canvases.length;
  push('%PDF-1.4\n'); push(new Uint8Array([37, 0xE2, 0xE3, 0xCF, 0xD3, 10]));
  startObj(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  startObj(2); push('<< /Type /Pages /Count ' + N + ' /Kids [' + canvases.map((_, i) => (3 + i * 3) + ' 0 R').join(' ') + '] >>\nendobj\n');
  canvases.forEach((cv, i) => {
    const pg = 3 + i * 3, ct = pg + 1, im = pg + 2;
    const bin = atob(b64(cv, 0.88)); const bytes = new Uint8Array(bin.length); for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
    startObj(pg); push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ' + im + ' 0 R >> >> /Contents ' + ct + ' 0 R >>\nendobj\n');
    const content = 'q 595 0 0 842 0 0 cm /Im0 Do Q';
    startObj(ct); push('<< /Length ' + content.length + ' >>\nstream\n' + content + '\nendstream\nendobj\n');
    startObj(im); push('<< /Type /XObject /Subtype /Image /Width ' + cv.width + ' /Height ' + cv.height + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + bytes.length + ' >>\nstream\n'); push(bytes); push('\nendstream\nendobj\n');
  });
  const total = 3 + N * 3; const xr = len;
  push('xref\n0 ' + total + '\n0000000000 65535 f \n');
  for (let n = 1; n < total; n++) push(String(off[n]).padStart(10, '0') + ' 00000 n \n');
  push('trailer\n<< /Size ' + total + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n');
  const out = new Uint8Array(len); let p = 0; parts.forEach((b) => { out.set(b, p); p += b.length; });
  return out;
}
function bytesToB64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
async function compressImage(srcCanvasOrImg, max) {
  const w = srcCanvasOrImg.videoWidth || srcCanvasOrImg.naturalWidth || srcCanvasOrImg.width, h = srcCanvasOrImg.videoHeight || srcCanvasOrImg.naturalHeight || srcCanvasOrImg.height;
  const k = Math.min(1, max / Math.max(w, h)); const cv = document.createElement('canvas'); cv.width = Math.round(w * k); cv.height = Math.round(h * k);
  cv.getContext('2d').drawImage(srcCanvasOrImg, 0, 0, cv.width, cv.height); return cv.toDataURL('image/jpeg', 0.86);
}
