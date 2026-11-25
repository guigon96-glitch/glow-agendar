'use strict';
/* ===== Temas: cores do app e da página de agendamento da cliente (enviado no catálogo como studio.theme) ===== */
const THEMES = [
  ['rose', 'Rosé', 'O clássico do app: rosé e dourado', { bg: '#FAF6F2', surf: '#FFFDFB', line: '#EFE4DD', line2: '#E5D6CE', ink: '#3B2E2E', muted: '#756560', rose: '#A45F5C', 'rose-d': '#8F504D', blush: '#F3E1DC', blush2: '#F8EEE9', gold: '#7F6538', 'gold-l': '#C9AE86', sage: '#E6EFE6', 'sage-t': '#3D6B47', sand: '#F3EBDD' }],
  ['nude', 'Nude e caramelo', 'Neutro e elegante, combina com tudo', { bg: '#F7F3EE', surf: '#FFFCF8', line: '#EAE1D6', line2: '#DDD0C0', ink: '#33291F', muted: '#6E6155', rose: '#8A5A3C', 'rose-d': '#73492F', blush: '#EFE1D3', blush2: '#F5ECE2', gold: '#7A6232', 'gold-l': '#C4AD7E', sage: '#E5EEE3', 'sage-t': '#3D6B47', sand: '#F1E8D8' }],
  ['pink', 'Pink', 'Vibrante e alegre, para unhas e make', { bg: '#FFF6F9', surf: '#FFFFFF', line: '#F6E1EA', line2: '#EFCFDC', ink: '#33182A', muted: '#74566A', rose: '#C2185B', 'rose-d': '#A0144B', blush: '#FBE0EB', blush2: '#FDEEF4', gold: '#8A5A1E', 'gold-l': '#D9A86C', sage: '#E5F2E8', 'sage-t': '#2F6B45', sand: '#FBEFE6' }],
  ['lavanda', 'Lavanda', 'Delicado e moderno', { bg: '#F7F5FA', surf: '#FFFEFF', line: '#E8E3EF', line2: '#DAD2E6', ink: '#2E2638', muted: '#6B6178', rose: '#7B5BA6', 'rose-d': '#654A8C', blush: '#EAE2F4', blush2: '#F2EDF8', gold: '#7A6232', 'gold-l': '#C2AC80', sage: '#E4EFE7', 'sage-t': '#3B6B4C', sand: '#EFEAF3' }],
  ['salvia', 'Sálvia', 'Natural e calmo, para estética e spa', { bg: '#F4F6F2', surf: '#FDFEFC', line: '#E2E8DE', line2: '#D2DBCC', ink: '#26302A', muted: '#5F6B62', rose: '#4E7A5E', 'rose-d': '#3F654D', blush: '#E0EBE2', blush2: '#ECF2EC', gold: '#7A6232', 'gold-l': '#C2AC80', sage: '#E3EEE4', 'sage-t': '#2F6B45', sand: '#EEF0E6' }],
  ['terracota', 'Terracota', 'Quente e acolhedor', { bg: '#FAF4EF', surf: '#FFFCF9', line: '#EFE0D5', line2: '#E4CDBE', ink: '#3A2620', muted: '#765F55', rose: '#B4532A', 'rose-d': '#96431F', blush: '#F5DED1', blush2: '#F9EBE2', gold: '#7F6538', 'gold-l': '#C9AE86', sage: '#E6EFE6', 'sage-t': '#3D6B47', sand: '#F4E9DA' }],
  ['marinho', 'Azul marinho', 'Sóbrio e clássico, ótimo para barbearia', { bg: '#F3F5F8', surf: '#FDFEFF', line: '#E1E6EE', line2: '#D0D8E4', ink: '#1E2733', muted: '#5D6878', rose: '#2F4A6E', 'rose-d': '#243B59', blush: '#E1E8F2', blush2: '#EDF1F7', gold: '#8A6A2E', 'gold-l': '#C7AE7C', sage: '#E3EFE6', 'sage-t': '#2F6B45', sand: '#EEF0F3' }],
  ['noite', 'Preto e dourado', 'Escuro e sofisticado', { bg: '#17140F', surf: '#211D17', line: '#332D24', line2: '#4A4134', ink: '#F3ECE0', muted: '#B3A794', rose: '#C9A45C', 'rose-d': '#B08D45', blush: '#3A3122', blush2: '#2A241B', gold: '#D9B872', 'gold-l': '#8C7444', sage: '#213528', 'sage-t': '#8FCB9E', sand: '#2E2719', field: '#2A251D', on: '#17140F' }]
];
// Tema próprio: a pessoa escolhe só a cor principal e a do fundo; o resto é calculado (texto, linhas, tons claros)
const hexRgb = (h) => { h = String(h || '').replace('#', ''); if (h.length === 3) h = h.split('').map((x) => x + x).join(''); return /^[0-9a-f]{6}$/i.test(h) ? [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) : [0, 0, 0]; };
const rgbHex = (c) => '#' + c.map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, '0')).join('').toUpperCase();
const mix = (a, b, t) => { const x = hexRgb(a), y = hexRgb(b); return rgbHex(x.map((v, i) => v + (y[i] - v) * t)); }; // t=0 -> a, t=1 -> b
const lum = (h) => { const c = hexRgb(h).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const CUSTOM_DEFAULT = { main: '#A45F5C', bg: '#FAF6F2' };
function customVars(ct) {
  const main = (ct && ct.main) || CUSTOM_DEFAULT.main, bg = (ct && ct.bg) || CUSTOM_DEFAULT.bg, dark = lum(bg) < 0.18;
  const ink = dark ? mix(bg, '#FFFFFF', 0.9) : mix(bg, '#1A1414', 0.88);
  const on = contrast('#FFFFFF', main) >= contrast('#17140F', main) ? '#FFFFFF' : '#17140F';
  return { bg, surf: dark ? mix(bg, '#FFFFFF', 0.05) : mix(bg, '#FFFFFF', 0.6), line: mix(bg, ink, 0.09), line2: mix(bg, ink, 0.16), ink, muted: mix(bg, ink, dark ? 0.62 : 0.74),
    rose: main, 'rose-d': dark ? mix(main, '#FFFFFF', 0.12) : mix(main, '#000000', 0.14), blush: mix(bg, main, dark ? 0.22 : 0.16), blush2: mix(bg, main, dark ? 0.12 : 0.08),
    gold: dark ? '#D9B872' : '#7F6538', 'gold-l': dark ? '#8C7444' : '#C9AE86', sage: dark ? '#213528' : '#E6EFE6', 'sage-t': dark ? '#8FCB9E' : '#3D6B47', sand: mix(bg, '#C9AE86', 0.12),
    field: dark ? mix(bg, '#FFFFFF', 0.08) : '#FFFFFF', on };
}
const themeOf = (id) => id === 'custom' ? ['custom', 'Meu tema', 'Cores escolhidas por você', customVars(S.settings.customTheme)] : THEMES.find((t) => t[0] === id) || THEMES[0];
// Cores completas do tema (campo e texto sobre a cor de ação têm padrão claro)
const themeVars = (id) => Object.assign({ field: '#FFFFFF', on: '#FFFFFF' }, themeOf(id)[3]);
function applyTheme(id) {
  const tid = themeOf(id || (S.settings && S.settings.theme))[0], v = themeVars(tid), r = document.documentElement.style;
  if (tid !== 'custom' && document.documentElement.dataset.theme === tid) return;
  Object.keys(v).forEach((k) => r.setProperty('--' + k, v[k]));
  document.documentElement.dataset.theme = tid;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = v.rose;
}
function themePicker() {
  const cur = themeOf(S.settings.theme)[0];
  return '<div class="card stack"><h2 class="h2">Tema</h2><div class="muted sm">Muda as cores do app e da página onde suas clientes agendam.</div><div class="themes">' + THEMES.map(([id, name, sub, c]) =>
    '<button class="theme' + (id === cur ? ' on' : '') + '" data-act="theme" data-v="' + id + '" aria-pressed="' + (id === cur) + '" style="background:' + c.bg + ';color:' + c.ink + ';border-color:' + (id === cur ? c.rose : c.line2) + '"><span class="tsw"><i style="background:' + c.rose + '"></i><i style="background:' + c.gold + '"></i><i style="background:' + c.blush + '"></i><i style="background:' + c.surf + ';border:1px solid ' + c.line2 + '"></i></span><b>' + name + '</b><small style="color:' + c.muted + '">' + sub + '</small></button>').join('') + customCard(cur) + '</div>' + (cur === 'custom' ? customEditor() : '') + '</div>';
}
function customCard(cur) {
  const c = customVars(S.settings.customTheme), on = cur === 'custom';
  return '<button class="theme' + (on ? ' on' : '') + '" data-act="theme" data-v="custom" aria-pressed="' + on + '" style="background:' + c.bg + ';color:' + c.ink + ';border-color:' + (on ? c.rose : c.line2) + '"><span class="tsw"><i style="background:' + c.rose + '"></i><i style="background:' + c.bg + ';border:1px solid ' + c.line2 + '"></i></span><b>Meu tema</b><small style="color:' + c.muted + '">Escolha a cor principal e a do fundo</small></button>';
}
function customEditor() {
  const ct = Object.assign({}, CUSTOM_DEFAULT, S.settings.customTheme), c = customVars(ct);
  const fld = (k, l, sub) => '<label class="ct-row"><input type="color" class="ct-in" data-k="' + k + '" value="' + ct[k] + '" aria-label="' + l + '"><span><b>' + l + '</b><small class="muted">' + sub + '</small></span><span class="ct-hex">' + ct[k].toUpperCase() + '</span></label>';
  const low = contrast(c.on, c.rose) < 3, same = contrast(c.rose, c.bg) < 1.4;
  return '<div class="ct-ed">' + fld('main', 'Cor principal', 'Topo das telas, botões e destaques') + fld('bg', 'Cor do fundo', 'Fundo das telas; o texto se ajusta sozinho') +
    '<div class="ct-prev" style="background:' + c.bg + ';color:' + c.ink + ';border-color:' + c.line2 + '"><span class="ct-bar" style="background:' + c.rose + ';color:' + c.on + '">Agenda</span><span style="padding:10px 12px;display:block">Juliana Prado<small style="display:block;color:' + c.muted + '">Extensão de cílios · 14:30</small></span><span class="ct-btn" style="background:' + c.rose + ';color:' + c.on + '">Iniciar atendimento</span></div>' +
    (low ? '<div class="sm" style="color:#B42318">Essa cor principal deixa o texto dos botões difícil de ler. Experimente um tom mais escuro ou mais claro.</div>' : '') +
    (same ? '<div class="sm" style="color:#B42318">A cor principal está muito parecida com o fundo. Escolha uma mais forte para o topo e os botões aparecerem.</div>' : '') +
    '<button class="btn ghost sm" data-act="ct-reset">Voltar às cores iniciais</button></div>';
}
document.addEventListener('input', (e) => {
  const t = e.target; if (!t.classList || !t.classList.contains('ct-in')) return;
  S.settings.customTheme = Object.assign({}, CUSTOM_DEFAULT, S.settings.customTheme, { [t.dataset.k]: t.value }); S.settings.theme = 'custom';
  const h = t.parentNode.querySelector('.ct-hex'); if (h) h.textContent = t.value.toUpperCase(); applyTheme('custom');
});
document.addEventListener('change', (e) => { const t = e.target; if (t.classList && t.classList.contains('ct-in')) { save(); if (typeof catDirty !== 'undefined') catDirty = true; route({ keep: true }); } });
Object.assign(ACTX, {
  'ct-reset'() { S.settings.customTheme = Object.assign({}, CUSTOM_DEFAULT); save(); if (typeof catDirty !== 'undefined') catDirty = true; applyTheme('custom'); route({ keep: true }); },
  theme(el) { S.settings.theme = el.dataset.v; save(); if (typeof catDirty !== 'undefined') catDirty = true; applyTheme(); route({ keep: true }); toast('Tema ' + themeOf(el.dataset.v)[1] + ' aplicado'); }
});
