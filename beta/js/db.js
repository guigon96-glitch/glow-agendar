'use strict';
/* ===== Armazenamento local (IndexedDB) + estado ===== */
const DB = {
  db: null, mem: { kv: new Map(), photos: new Map() },
  open() {
    return new Promise((res) => {
      try {
        const r = indexedDB.open('lss', 1);
        r.onupgradeneeded = () => { r.result.createObjectStore('kv'); r.result.createObjectStore('photos'); };
        r.onsuccess = () => { DB.db = r.result; res(true); };
        r.onerror = () => res(false);
      } catch (e) { res(false); }
    });
  },
  tx(store, mode, fn) {
    return new Promise((res, rej) => {
      const t = DB.db.transaction(store, mode); const s = t.objectStore(store); const rq = fn(s);
      t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error);
    });
  },
  async get(store, key) { return DB.db ? DB.tx(store, 'readonly', (s) => s.get(key)) : DB.mem[store].get(key); },
  async put(store, key, val) { if (DB.db) return DB.tx(store, 'readwrite', (s) => s.put(val, key)); DB.mem[store].set(key, val); },
  async del(store, key) { if (DB.db) return DB.tx(store, 'readwrite', (s) => s.delete(key)); DB.mem[store].delete(key); },
  async all(store) {
    if (!DB.db) return [...DB.mem[store].entries()];
    return new Promise((res, rej) => {
      const out = []; const rq = DB.db.transaction(store, 'readonly').objectStore(store).openCursor();
      rq.onsuccess = () => { const c = rq.result; if (c) { out.push([c.key, c.value]); c.continue(); } else res(out); };
      rq.onerror = () => rej(rq.error);
    });
  }
};

const AREAS = {
  cilios: { name: 'Cílios', icon: '👁', desc: 'Extensão, lash lifting' },
  sobrancelhas: { name: 'Sobrancelhas', icon: '〰', desc: 'Design, henna, brow lamination' },
  unhas: { name: 'Unhas', icon: '💅', desc: 'Gel, blindagem, esmaltação' },
  cabelo: { name: 'Cabelo', icon: '✂', desc: 'Corte, coloração, mechas, tratamentos' },
  maquiagem: { name: 'Maquiagem', icon: '✨', desc: 'Social, noiva, festa' },
  estetica: { name: 'Estética e depilação', icon: '🌿', desc: 'Depilação, limpeza de pele, peeling' }
};
const SERVICES = {
  cilios: { area: 'cilios', name: 'Extensão de cílios', short: 'Cílios', dur: 150, next: 18, nextTxt: 'entre 15 e 20 dias', angle: 'od', angles: ['od', 'oe'] },
  lifting: { area: 'cilios', name: 'Lash lifting', short: 'Cílios', dur: 60, next: 45, nextTxt: 'em 6 a 8 semanas', angle: 'od', angles: ['od', 'oe'] },
  design: { area: 'sobrancelhas', name: 'Design de sobrancelhas', short: 'Sobrancelhas', dur: 60, next: 25, nextTxt: 'em 3 a 4 semanas', angle: 'sob', angles: ['sob'] },
  henna: { area: 'sobrancelhas', name: 'Henna e brow lamination', short: 'Sobrancelhas', dur: 60, next: 28, nextTxt: 'em 4 semanas', angle: 'sob', angles: ['sob'] },
  gel: { area: 'unhas', name: 'Alongamento em gel', short: 'Unhas', dur: 150, next: 21, nextTxt: 'em 3 semanas (manutenção)', angles: ['maos'] },
  esmalt: { area: 'unhas', name: 'Esmaltação em gel', short: 'Unhas', dur: 60, next: 15, nextTxt: 'em 2 a 3 semanas', angles: ['maos'] },
  blind: { area: 'unhas', name: 'Blindagem de unhas', short: 'Unhas', dur: 90, next: 21, nextTxt: 'em 3 semanas', angles: ['maos'] },
  corte: { area: 'cabelo', name: 'Corte e escova', short: 'Cabelo', dur: 90, next: 50, nextTxt: 'em 6 a 8 semanas', angles: ['cab'] },
  color: { area: 'cabelo', name: 'Coloração', short: 'Cabelo', dur: 150, next: 35, nextTxt: 'em 5 semanas (retoque de raiz)', angles: ['cab'] },
  mechas: { area: 'cabelo', name: 'Mechas e luzes', short: 'Cabelo', dur: 240, next: 90, nextTxt: 'em 3 meses', angles: ['cab'] },
  tratam: { area: 'cabelo', name: 'Hidratação e tratamento', short: 'Cabelo', dur: 90, next: 15, nextTxt: 'em 15 dias', angles: ['cab'] },
  social: { area: 'maquiagem', name: 'Maquiagem social', short: 'Maquiagem', dur: 75, next: 60, nextTxt: 'quando quiser renovar o visual', angles: ['rosto'] },
  noiva: { area: 'maquiagem', name: 'Maquiagem de noiva', short: 'Maquiagem', dur: 120, next: 365, nextTxt: 'no dia do seu evento', angles: ['rosto'] },
  festa: { area: 'maquiagem', name: 'Maquiagem para festa', short: 'Maquiagem', dur: 90, next: 60, nextTxt: 'no próximo evento', angles: ['rosto'] },
  depil: { area: 'estetica', name: 'Depilação com cera', short: 'Estética', dur: 45, next: 28, nextTxt: 'em 4 semanas', angles: ['reg'] },
  limpeza: { area: 'estetica', name: 'Limpeza de pele', short: 'Estética', dur: 75, next: 30, nextTxt: 'em 30 dias', angles: ['rosto'] },
  peeling: { area: 'estetica', name: 'Peeling facial', short: 'Estética', dur: 60, next: 30, nextTxt: 'em 30 dias', angles: ['rosto'] }
};
const ANGLES = { rosto: 'Rosto todo', od: 'Olho direito', oe: 'Olho esquerdo', sob: 'Sobrancelhas', maos: 'Mãos e unhas', cab: 'Cabelo', reg: 'Região tratada' };
const activeAreas = () => { const a = (S.settings.areas || []).filter((k) => AREAS[k]); return a.length ? a : Object.keys(AREAS); };
const activeServices = () => { const a = activeAreas(); return Object.keys(SERVICES).filter((k) => a.includes(SERVICES[k].area) && !(S.ext && S.ext.svc && S.ext.svc[k] && S.ext.svc[k].hidden)); };
// Ficha técnica por área: [campo, rótulo, opções, sufixo]. Cílios mantém os campos antigos; as outras áreas usam prefixo para não misturar.
const TECH = {
  unhas: [['u_tec', 'Técnica', ['Gel', 'Fibra de vidro', 'Polygel', 'Acrílico', 'Banho de gel', 'Esmaltação em gel', 'Esmalte comum']], ['u_fmt', 'Formato', ['Quadrada', 'Squoval', 'Redonda', 'Oval', 'Amendoada', 'Bailarina', 'Stiletto']], ['u_comp', 'Comprimento', ['Natural', 'Curta', 'Média', 'Longa', 'Extra longa']], ['u_acab', 'Acabamento', ['Brilho', 'Fosco', 'Francesinha', 'Baby boomer', 'Nail art', 'Cromado']], ['u_cut', 'Cutícula', ['Cortada', 'Só empurrada', 'Russa (a seco)']], ['u_nat', 'Unha natural', ['Saudável', 'Fina', 'Quebradiça', 'Roída', 'Descolando']]],
  cabelo: [['h_tipo', 'Tipo de fio', ['Liso', 'Ondulado', 'Cacheado', 'Crespo']], ['h_esp', 'Espessura do fio', ['Fino', 'Médio', 'Grosso']], ['h_comp', 'Comprimento', ['Curto', 'Médio', 'Longo', 'Extra longo']], ['h_cond', 'Condição', ['Virgem', 'Colorido', 'Descolorido', 'Com progressiva', 'Danificado']], ['h_couro', 'Couro cabeludo', ['Normal', 'Oleoso', 'Seco', 'Sensível', 'Com caspa']], ['h_bra', 'Fios brancos', ['Nenhum', 'Até 30%', '30 a 60%', 'Mais de 60%']]],
  cilios: [['tecnica', 'Técnica', ['Fio a fio', 'Brasileiro', 'Russo', 'Híbrido']], ['curvatura', 'Curvatura', ['J', 'B', 'C', 'D', 'L']], ['espessura', 'Espessura (mm)', ['0,05', '0,07', '0,10', '0,15'], ' mm'], ['comprimento', 'Comprimento (mm)', ['8–10', '9–12', '10–13', '12–14'], ' mm'], ['mapeamento', 'Mapeamento', ['Natural', 'Gatinho', 'Boneca', 'Esquilo']]],
  sobrancelhas: [['b_fmt', 'Formato', ['Natural', 'Arqueada', 'Reta', 'Angulada']], ['b_tec', 'Técnica', ['Pinça', 'Linha', 'Cera', 'Henna', 'Brow lamination']], ['b_cor', 'Tom', ['Louro', 'Castanho claro', 'Castanho médio', 'Castanho escuro', 'Preto']], ['b_fal', 'Falhas', ['Nenhuma', 'Poucas', 'Muitas']]],
  maquiagem: [['m_pele', 'Tipo de pele', ['Seca', 'Normal', 'Mista', 'Oleosa', 'Madura']], ['m_sub', 'Subtom', ['Frio', 'Neutro', 'Quente', 'Oliva']], ['m_acab', 'Acabamento', ['Matte', 'Natural', 'Luminoso']], ['m_olho', 'Olhos', ['Natural', 'Esfumado', 'Delineado', 'Cut crease', 'Glitter']]],
  estetica: [['e_pele', 'Tipo de pele', ['Seca', 'Normal', 'Mista', 'Oleosa', 'Sensível']], ['e_fot', 'Fototipo', ['I', 'II', 'III', 'IV', 'V', 'VI']], ['e_cond', 'O que tratar', ['Acne', 'Manchas', 'Poros', 'Desidratação', 'Flacidez', 'Pelos']]]
};
// Campo de texto livre da área: [campo, rótulo, exemplo]
const TECH_TXT = { cilios: ['lote', 'Adesivo / lote', 'Ex.: lote 2411-B'], unhas: ['produto', 'Cores e produtos', 'Ex.: gel construtor nude · esmalte 112 · top fosco'], cabelo: ['produto', 'Fórmula da cor e produtos', 'Ex.: 7.1 + 6.0 (1:1) · OX 20 vol · 35 min'] };
const areaOf = (s) => (SERVICES[s.service] || SERVICES.cilios).area;
// [rótulo, valor] preenchidos da ficha técnica do atendimento
const techItems = (s) => (TECH[areaOf(s)] || []).filter((t) => s[t[0]]).map((t) => [t[1].replace(/ \(mm\)$/, ''), s[t[0]] + (t[3] || '')]);
const CARE_DEFAULT = {
  cilios: ['Não molhar nas primeiras 24 h', 'Evitar vapor, sauna e água quente', 'Sem produtos oleosos na região dos olhos', 'Escovar os cílios diariamente', 'Evitar dormir de bruços', 'Não puxar nem arrancar os fios'],
  lifting: ['Não molhar nas primeiras 24 h', 'Evitar vapor, sauna e maquiagem por 24 h', 'Não usar curvador de cílios', 'Hidratar os cílios com sérum'],
  design: ['Evitar sol e vapor por 24 h', 'Não molhar a região nas primeiras 12 h', 'Não retirar casquinhas nem esfoliar', 'Hidratar a região com produto indicado'],
  henna: ['Não molhar a região por 12 h', 'Evitar sol, vapor e sauna por 48 h', 'Não esfoliar a região', 'Hidratar diariamente'],
  gel: ['Evitar água quente e produtos de limpeza sem luvas por 24 h', 'Hidratar cutículas com óleo todos os dias', 'Não usar as unhas como ferramenta', 'Não arrancar nem descascar o gel', 'Agendar manutenção em 3 semanas'],
  esmalt: ['Evitar água muito quente nas primeiras 2 h', 'Usar luvas para limpeza', 'Hidratar cutículas diariamente', 'Não remover o esmalte em casa'],
  blind: ['Evitar contato com produtos químicos sem luvas', 'Hidratar cutículas com óleo', 'Não roer nem descascar a blindagem', 'Agendar manutenção em 3 semanas'],
  corte: ['Usar shampoo e condicionador adequados ao seu cabelo', 'Aplicar protetor térmico antes de secador e chapinha', 'Evitar lavar com água muito quente', 'Renovar as pontas a cada 2 meses'],
  color: ['Esperar 48 h para lavar o cabelo', 'Usar shampoo sem sulfato e para cabelos coloridos', 'Evitar água quente e exposição solar intensa', 'Fazer hidratação semanal', 'Retoque de raiz em 5 semanas'],
  mechas: ['Esperar 48 h para lavar o cabelo', 'Usar shampoo matizador 1 vez por semana', 'Fazer hidratação e reconstrução quinzenal', 'Evitar piscina e mar sem protetor', 'Manutenção em 3 meses'],
  tratam: ['Aguardar 24 h para lavar', 'Usar produtos de manutenção da linha indicada', 'Evitar calor excessivo (chapinha e secador quente)', 'Repetir o tratamento em 15 dias'],
  social: ['Evitar tocar o rosto com as mãos', 'Retocar com papel secante e pó compacto', 'Remover a maquiagem com demaquilante antes de dormir', 'Hidratar a pele após a limpeza'],
  noiva: ['Evitar tocar o rosto com as mãos', 'Levar o kit de retoque (batom e pó compacto)', 'Usar o fixador de maquiagem se for preciso', 'Remover com demaquilante e limpar bem a pele no fim do dia'],
  festa: ['Evitar tocar o rosto com as mãos', 'Retocar o batom e o pó ao longo da noite', 'Remover a maquiagem com demaquilante antes de dormir', 'Hidratar a pele'],
  depil: ['Evitar sol, sauna e piscina por 24 h', 'Não usar desodorante nem cremes perfumados por 12 h', 'Hidratar a pele diariamente', 'Esfoliar suavemente a partir do 3º dia para evitar encravados', 'Usar roupas folgadas por 24 h'],
  limpeza: ['Evitar maquiagem por 24 h', 'Usar protetor solar diariamente', 'Não espremer nem mexer na pele', 'Evitar sol direto por 48 h', 'Manter a pele hidratada'],
  peeling: ['Não esfoliar nem usar ácidos por 7 dias', 'Usar protetor solar FPS 50 e reaplicar', 'Não arrancar as peles que descamarem', 'Evitar sol, sauna e academia nas primeiras 48 h', 'Hidratar com o produto indicado']
};
const MSG_DEFAULT = 'Oi, {nome}! Foi um prazer cuidar de você hoje.\n\nSegue o relatório do seu procedimento ({procedimento}) com as fotos de antes e depois e os cuidados para o resultado durar mais.\n\nPrincipais cuidados:\n{cuidados}\n\nSua próxima manutenção: {manutencao}. Qualquer dúvida, é só me chamar por aqui!\n\n{estudio}';
const SETTINGS_DEFAULT = () => ({ studio: 'Glow Studio', owner: 'Bia Martins', areas: Object.keys(AREAS), areasSet: false, whats: '', insta: '', logo: null, msg: MSG_DEFAULT, cuidados: JSON.parse(JSON.stringify(CARE_DEFAULT)), attachPdf: true, attachPhotos: true, askConsent: true });

const S = { clients: [], sessions: [], settings: SETTINGS_DEFAULT(), ext: null, persisted: true };
const PC = new Map(); // cache de fotos id -> dataURL

async function loadAll() {
  S.persisted = await DB.open();
  const [c, s, st, ex] = await Promise.all([DB.get('kv', 'clients'), DB.get('kv', 'sessions'), DB.get('kv', 'settings'), DB.get('kv', 'ext')]);
  S.clients = c || []; S.sessions = s || [];
  S.settings = Object.assign(SETTINGS_DEFAULT(), st || {}); S.ext = ex || null; ensureExt();
}
let _saveT = null;
function save() { clearTimeout(_saveT); _saveT = setTimeout(flush, 120); }
async function flush() {
  clearTimeout(_saveT);
  await DB.put('kv', 'clients', S.clients); await DB.put('kv', 'sessions', S.sessions); await DB.put('kv', 'settings', S.settings); await DB.put('kv', 'ext', S.ext);
}
const Photo = {
  async add(dataUrl) { const id = 'p' + uid(); PC.set(id, dataUrl); await DB.put('photos', id, dataUrl); return id; },
  async del(id) { if (!id) return; PC.delete(id); await DB.del('photos', id); },
  async preload(ids) {
    await Promise.all(ids.filter((i) => i && !PC.has(i)).map(async (i) => { const v = await DB.get('photos', i); if (v) PC.set(i, v); }));
  }
};

/* ===== utilidades ===== */
const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const todayISO = () => iso(new Date());
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseISO(s); d.setDate(d.getDate() + n); return iso(d); };
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESL = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const DIAL = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const fmtDate = (s) => { const d = parseISO(s); return pad(d.getDate()) + ' ' + MES[d.getMonth()] + ' ' + d.getFullYear(); };
const fmtLong = (s) => { const d = parseISO(s); return d.getDate() + ' de ' + MESL[d.getMonth()] + ' de ' + d.getFullYear(); };
const initials = (n) => (n || '?').trim().split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
const mins = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const hhmm = (m) => pad(Math.floor(m / 60)) + ':' + pad(m % 60);
const digits = (s) => String(s || '').replace(/\D/g, '');
const waNumber = (s) => { let d = digits(s); if (d.length === 10 || d.length === 11) d = '55' + d; return d; };
const client = (id) => S.clients.find((c) => c.id === id);
const sess = (id) => S.sessions.find((s) => s.id === id);
const careFor = (svc) => (S.settings.cuidados && S.settings.cuidados[svc]) || CARE_DEFAULT[svc] || [];
const sortSessions = (a, b) => (a.date + a.time).localeCompare(b.date + b.time);
function procTitle(s) {
  const sv = SERVICES[s.service] || SERVICES.cilios;
  if (s.service === 'cilios' && s.tecnica) return sv.name + ' · ' + s.tecnica.toLowerCase();
  if (sv.area === 'unhas' && s.u_fmt) return sv.name + ' · ' + s.u_fmt.toLowerCase();
  return sv.name;
}
function nextDate(s) { return addDays(s.date, (SERVICES[s.service] || SERVICES.cilios).next); }
function clientSessions(id) { return S.sessions.filter((s) => s.clientId === id).sort(sortSessions).reverse(); }
function toast(msg) { const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), 2600); }
function photoOf(s, stage, angle) { return (s.photos || []).find((p) => p.stage === stage && p.angle === angle); }
function anglesWithPhotos(s) { return Object.keys(ANGLES).filter((a) => photoOf(s, 'antes', a) || photoOf(s, 'depois', a)); }
function anglesComplete(s) { return Object.keys(ANGLES).filter((a) => photoOf(s, 'antes', a) && photoOf(s, 'depois', a)); }
async function setPhoto(s, stage, angle, dataUrl) {
  s.photos = s.photos || [];
  const old = photoOf(s, stage, angle);
  const id = await Photo.add(dataUrl);
  if (old) { await Photo.del(old.id); old.id = id; } else s.photos.push({ id, stage, angle });
  save();
}
async function removePhoto(s, stage, angle) {
  const old = photoOf(s, stage, angle); if (!old) return;
  await Photo.del(old.id); s.photos = s.photos.filter((p) => p !== old); save();
}
function newSession(clientId, over) {
  const svc = (over && over.service) || activeServices()[0];
  return Object.assign({ id: uid(), clientId, date: todayISO(), time: '09:00', dur: SERVICES[svc].dur, service: svc, status: 'agendado', proId: '', price: null, discount: 0, pay: null, pkgUseId: null, use: [], tecnica: '', curvatura: '', espessura: '', comprimento: '', mapeamento: '', lote: '', notes: '', cuidados: null, photos: [], sent: false }, over || {});
}
function messageText(s) {
  const c = client(s.clientId) || { name: '' };
  const care = (s.cuidados || careFor(s.service)).slice(0, 3).map((x) => '• ' + x).join('\n');
  const first = (c.name || '').split(' ')[0];
  return (S.settings.msg || MSG_DEFAULT)
    .replace(/\{nome\}/g, first).replace(/\{procedimento\}/g, procTitle(s).toLowerCase())
    .replace(/\{cuidados\}/g, care).replace(/\{manutencao\}/g, (SERVICES[s.service] || SERVICES.cilios).nextTxt)
    .replace(/\{estudio\}/g, S.settings.studio);
}
async function loadSample() {
  const t = todayISO();
  const mk = (name, phone, extra) => Object.assign({ id: uid(), name, phone, birth: '', email: '', insta: '', city: '', origin: 'Indicação de cliente', notes: '', anam: {}, termo: { aceite: true, fotos: true, divulgacao: false }, created: t }, extra || {});
  const a = mk('Ana Beatriz Lima', '(11) 9 8123-4567', { anam: { lentes: true, jafez: true } }), b = mk('Camila Ferreira', '(11) 9 9234-1180'), c = mk('Juliana Prado', '(11) 9 7765-2031'), d = mk('Mariana Costa', '(11) 9 9120-8844'), e = mk('Renata Alves', '(11) 9 8456-7720');
  S.clients.push(a, b, c, d, e);
  const sA0 = newSession(a.id, { date: addDays(t, -120), time: '10:00', service: 'cilios', tecnica: 'Fio a fio', curvatura: 'C', espessura: '0,10', comprimento: '10–13', mapeamento: 'Natural', status: 'concluido' });
  const sA1 = newSession(a.id, { date: t, time: '09:00', dur: 150, service: 'cilios', tecnica: 'Russo', curvatura: 'C', espessura: '0,07', comprimento: '9–12', mapeamento: 'Gatinho', status: 'concluido' });
  const sB1 = newSession(b.id, { date: t, time: '11:30', dur: 90, service: 'design', status: 'concluido' });
  const sB0 = newSession(b.id, { date: addDays(t, -22), time: '15:00', service: 'design', status: 'concluido' });
  const sC0 = newSession(c.id, { date: addDays(t, -30), time: '10:30', dur: 120, service: 'cilios', tecnica: 'Brasileiro', curvatura: 'D', espessura: '0,07', comprimento: '9–12', mapeamento: 'Natural', status: 'concluido' });
  const sD0 = newSession(d.id, { date: addDays(t, -45), time: '13:00', dur: 60, service: 'lifting', status: 'concluido' });
  const sE0 = newSession(e.id, { date: addDays(t, -28), time: '17:00', dur: 60, service: 'henna', status: 'concluido' });
  S.sessions.push(sA0, sA1, sB1, newSession(c.id, { date: t, time: '14:30', dur: 90, service: 'cilios', tecnica: 'Brasileiro', status: 'agendado' }), newSession(d.id, { date: t, time: '16:30', dur: 60, service: 'lifting', status: 'agendado' }), newSession(e.id, { date: t, time: '18:00', dur: 60, service: 'henna', status: 'agendado' }), sB0, sC0, sD0, sE0);
  const put = async (s, key, angle) => { if (typeof DEMO_PHOTOS === 'undefined') return; for (const st of ['antes', 'depois']) { const d = DEMO_PHOTOS[key + '_' + st]; if (d) await setPhoto(s, st, angle, d); } };
  if (typeof DEMO_PHOTOS !== 'undefined') {
    await put(sA0, 'ana_old_od', 'od'); await put(sA1, 'ana_od', 'od'); await put(sA1, 'ana_oe', 'oe');
    await put(sB1, 'camila_sob', 'sob'); await put(sB0, 'camila_old_sob', 'sob');
    await put(sC0, 'juliana_od', 'od'); await put(sC0, 'juliana_oe', 'oe');
    await put(sD0, 'mariana_od', 'od'); await put(sD0, 'mariana_oe', 'oe');
    await put(sE0, 'renata_sob', 'sob');
    // rosto todo (quando houver imagens): sessão mais recente de cada cliente
    for (const [s0, k] of [[sA1, 'ana'], [sB1, 'camila'], [sC0, 'juliana'], [sD0, 'mariana'], [sE0, 'renata']]) await put(s0, k + '_rosto', 'rosto');
  }
  // ===== novas áreas (3 exemplos por área) =====
  const ex = [
    // [nome, telefone, serviço, dias atrás, hora, dur, produto, prefixo de foto, ângulo, obs]
    ['Vitória Cardoso', '(11) 9 9301-4420', 'design', 12, '14:00', 60, '', 'b1', 'sob', 'Pele sensível, usar pinça e linha.'],
    ['Fernanda Duarte', '(11) 9 9812-3345', 'gel', 6, '09:30', 150, 'Gel construtor nude · molde F1 · formato amendoado', 'u1', 'maos', 'Roía as unhas; primeira vez no alongamento.'],
    ['Patrícia Nunes', '(11) 9 8870-1290', 'esmalt', 10, '15:00', 60, 'Esmalte em gel vermelho cereja · base fortalecedora', 'u2', 'maos', 'Gosta de cores clássicas.'],
    ['Gabriela Rocha', '(11) 9 9544-7761', 'blind', 15, '11:00', 90, 'Blindagem em gel rosa leitoso · formato oval curto', 'u3', 'maos', 'Unhas finas e quebradiças.'],
    ['Tatiane Melo', '(11) 9 9127-6503', 'color', 8, '10:00', 180, 'Tom 8.3 louro dourado · oxidante 20 vol · matizador', 'h1', 'cab', 'Cabelo com cor desbotada e raiz marcada.'],
    ['Vanessa Lopes', '(11) 9 9689-2218', 'corte', 5, '13:30', 90, 'Corte long bob · escova modelada · finalizador térmico', 'h2', 'cab', 'Quer um visual mais leve para o dia a dia.'],
    ['Bruna Teixeira', '(11) 9 9455-0937', 'mechas', 20, '09:00', 240, 'Mechas iluminadas (babylights) · pó descolorante 7 tons · tonalização', 'h3', 'cab', 'Cabelo castanho, sem química anterior.'],
    ['Isabela Moraes', '(11) 9 9733-5124', 'social', 4, '16:00', 75, 'Pele natural · base fluida · blush pêssego · batom nude rosado', 'm1', 'rosto', 'Maquiagem para jantar de aniversário.'],
    ['Carolina Vieira', '(11) 9 8266-9087', 'noiva', 18, '07:30', 120, 'Pele luminosa · esfumado marrom suave · cílios fio a fio', 'm2', 'rosto', 'Teste de maquiagem para o casamento.'],
    ['Priscila Andrade', '(11) 9 9150-6672', 'festa', 9, '18:00', 90, 'Esfumado bronze · iluminador · batom vinho', 'm3', 'rosto', 'Formatura da irmã.'],
    ['Aline Barros', '(11) 9 9378-4056', 'depil', 7, '10:30', 45, 'Cera quente · pernas inteiras', 'e1', 'reg', 'Preferência por cera quente.'],
    ['Daniela Freitas', '(11) 9 9024-3189', 'limpeza', 14, '14:30', 75, 'Higienização · extração · máscara calmante', 'e2', 'rosto', 'Pele oleosa com cravos na zona T.'],
    ['Sabrina Pires', '(11) 9 8599-2741', 'peeling', 21, '17:00', 60, 'Peeling de ácido mandélico · protetor FPS 50', 'e3', 'rosto', 'Manchas leves e textura irregular.']
  ];
  for (const [nome, tel, svc, ago, hora, dur, prod, pre, ang, obs] of ex) {
    const cl = mk(nome, tel, { notes: obs }); S.clients.push(cl);
    const ss = newSession(cl.id, { date: addDays(t, -ago), time: hora, dur, service: svc, status: 'concluido', produto: prod, notes: obs });
    S.sessions.push(ss);
    if (typeof DEMO_PHOTOS !== 'undefined') await put(ss, pre, ang);
  }
  // agendamentos de hoje nas novas áreas
  const ag = S.clients.filter((x) => ['Fernanda Duarte', 'Tatiane Melo', 'Isabela Moraes', 'Aline Barros'].includes(x.name));
  const hs = [['10:00', 'gel', 150], ['08:00', 'color', 150], ['12:30', 'social', 75], ['15:30', 'depil', 45]];
  ag.forEach((x, i) => S.sessions.push(newSession(x.id, { date: t, time: hs[i][0], dur: hs[i][2], service: hs[i][1], status: 'agendado' })));
  await demoConsents(); loadSampleExt(); if (S.settings.areasSet) trimSampleToAreas(activeAreas()); save();
}
async function exportBackup() {
  const photos = {}; for (const [k, v] of await DB.all('photos')) photos[k] = v;
  return JSON.stringify({ app: 'lss', v: 2, at: new Date().toISOString(), clients: S.clients, sessions: S.sessions, settings: S.settings, ext: S.ext, photos });
}
async function importBackup(txt) {
  let d = JSON.parse(txt); if (typeof d === 'string') d = JSON.parse(d); if (!d || d.app !== 'lss') throw new Error('Arquivo inválido');
  S.clients = d.clients || []; S.sessions = d.sessions || []; S.settings = Object.assign(SETTINGS_DEFAULT(), d.settings || {}); S.ext = d.ext || null; ensureExt();
  for (const [k] of await DB.all('photos')) await DB.del('photos', k);
  PC.clear();
  for (const k in (d.photos || {})) { await DB.put('photos', k, d.photos[k]); }
  await flush();
}
