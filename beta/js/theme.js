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
const themeOf = (id) => THEMES.find((t) => t[0] === id) || THEMES[0];
// Cores completas do tema (campo e texto sobre a cor de ação têm padrão claro)
const themeVars = (id) => Object.assign({ field: '#FFFFFF', on: '#FFFFFF' }, themeOf(id)[3]);
function applyTheme(id) {
  const tid = themeOf(id || (S.settings && S.settings.theme))[0], v = themeVars(tid), r = document.documentElement.style;
  if (document.documentElement.dataset.theme === tid) return;
  Object.keys(v).forEach((k) => r.setProperty('--' + k, v[k]));
  document.documentElement.dataset.theme = tid;
  const m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = v.rose;
}
function themePicker() {
  const cur = themeOf(S.settings.theme)[0];
  return '<div class="card stack"><h2 class="h2">Tema</h2><div class="muted sm">Muda as cores do app e da página onde suas clientes agendam.</div><div class="themes">' + THEMES.map(([id, name, sub, c]) =>
    '<button class="theme' + (id === cur ? ' on' : '') + '" data-act="theme" data-v="' + id + '" aria-pressed="' + (id === cur) + '" style="background:' + c.bg + ';color:' + c.ink + ';border-color:' + (id === cur ? c.rose : c.line2) + '"><span class="tsw"><i style="background:' + c.rose + '"></i><i style="background:' + c.gold + '"></i><i style="background:' + c.blush + '"></i><i style="background:' + c.surf + ';border:1px solid ' + c.line2 + '"></i></span><b>' + name + '</b><small style="color:' + c.muted + '">' + sub + '</small></button>').join('') + '</div></div>';
}
Object.assign(ACTX, {
  theme(el) { S.settings.theme = el.dataset.v; save(); if (typeof catDirty !== 'undefined') catDirty = true; applyTheme(); route({ keep: true }); toast('Tema ' + themeOf(el.dataset.v)[1] + ' aplicado'); }
});
