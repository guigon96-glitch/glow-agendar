'use strict';
/* ===== Câmera: guias de enquadramento por tipo de foto (muda conforme o serviço) ===== */
const CAM_HINT = {
  od: 'Alinhe o olho direito dentro do guia · mesma distância nas duas fotos',
  oe: 'Alinhe o olho esquerdo dentro do guia · mesma distância nas duas fotos',
  sob: 'Rosto de frente: encaixe as duas sobrancelhas no guia · mesma distância nas duas fotos',
  rosto: 'Enquadre o rosto todo no guia, de frente · mesma distância nas duas fotos',
  maos: 'Mão aberta, com os dedos dentro do guia e a luz sobre as unhas',
  cab: 'Enquadre o cabelo inteiro dentro do guia · mesmo ângulo nas duas fotos',
  reg: 'Centralize a região tratada no guia · mesma distância nas duas fotos'
};
/* desenhos em uma tela quadrada 1000×1000 (mantém a proporção em qualquer aparelho) */
const CAM_SHAPES = {
  od: () => '<path d="M110 500Q500 250 890 500Q500 750 110 500Z" class="m"/><circle cx="500" cy="500" r="118" class="f"/><circle cx="500" cy="500" r="42" class="f"/><path d="M170 400Q500 150 830 400" class="f"/><circle cx="150" cy="520" r="9" class="d"/><path d="M500 120V880M120 500H880" class="g"/>',
  oe: () => '<path d="M110 500Q500 250 890 500Q500 750 110 500Z" class="m"/><circle cx="500" cy="500" r="118" class="f"/><circle cx="500" cy="500" r="42" class="f"/><path d="M170 400Q500 150 830 400" class="f"/><circle cx="850" cy="520" r="9" class="d"/><path d="M500 120V880M120 500H880" class="g"/>',
  sob: () => '<path d="M100 520Q150 400 330 380Q450 372 470 470Q330 420 100 520Z" class="m"/><path d="M900 520Q850 400 670 380Q550 372 530 470Q670 420 900 520Z" class="m"/><path d="M500 220V820" class="g"/><path d="M100 640H900" class="g"/><path d="M455 380V470M545 380V470" class="f"/><circle cx="300" cy="640" r="52" class="f"/><circle cx="700" cy="640" r="52" class="f"/><path d="M440 700Q500 760 560 700" class="f"/>',
  rosto: () => '<ellipse cx="500" cy="500" rx="290" ry="400" class="m"/><path d="M500 80V920" class="g"/><path d="M210 430H790M250 640H750M330 760H670" class="g"/><path d="M330 430Q400 395 470 430M530 430Q600 395 670 430" class="f"/><path d="M440 770Q500 800 560 770" class="f"/>',
  maos: () => '<rect x="305" y="520" width="390" height="330" rx="70" class="m"/><rect x="305" y="240" width="82" height="330" rx="41" class="m"/><rect x="402" y="170" width="82" height="400" rx="41" class="m"/><rect x="499" y="210" width="82" height="360" rx="41" class="m"/><rect x="596" y="300" width="82" height="270" rx="41" class="m"/><rect x="170" y="560" width="82" height="260" rx="41" class="m" transform="rotate(-38 211 690)"/><g class="f"><rect x="318" y="252" width="56" height="62" rx="20"/><rect x="415" y="182" width="56" height="62" rx="20"/><rect x="512" y="222" width="56" height="62" rx="20"/><rect x="609" y="312" width="56" height="62" rx="20"/></g><path d="M500 120V900" class="g"/>',
  cab: () => '<path d="M330 300C300 90 700 90 670 300C780 470 740 700 830 900H170C260 700 220 470 330 300Z" class="m"/><ellipse cx="500" cy="450" rx="150" ry="205" class="f"/><path d="M500 90V900" class="g"/><path d="M120 900H880" class="g"/><path d="M360 450H640" class="g"/>',
  reg: () => '<rect x="170" y="170" width="660" height="660" rx="60" class="m"/><path d="M500 170V830M170 500H830" class="g"/><circle cx="500" cy="500" r="120" class="f"/>'
};
function camGuideSvg(angle) {
  const sh = (CAM_SHAPES[angle] || CAM_SHAPES.reg)();
  return '<svg class="guide" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><style>.m{stroke-opacity:.85;stroke-width:5;stroke-dasharray:18 14}.f{stroke-opacity:.45;stroke-width:3;stroke-dasharray:6 10}.g{stroke-opacity:.2;stroke-width:2}.d{fill:#fff;stroke:none;fill-opacity:.7}</style>' + sh + '</g></svg>' +
    '<svg class="guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><g stroke="#fff" stroke-opacity=".12" stroke-width=".25" vector-effect="non-scaling-stroke"><path d="M33.3 0V100M66.6 0V100M0 33.3H100M0 66.6H100" vector-effect="non-scaling-stroke"/></g></svg>' +
    '<svg class="guide" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path d="M3 9V3H9M91 3H97V9M97 91V97H91M9 97H3V91" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
}

/* ===== Câmera: foto do antes transparente para ajudar no enquadramento do depois ===== */
function camGhostApply() {
  const g = document.getElementById('cam_g'), b = document.getElementById('cam_gb'), r = document.getElementById('cam_gr'); if (!g || !b || !r) return;
  const on = !!UI.camGhost; g.hidden = !on; r.hidden = !on; b.classList.toggle('on', on);
  b.textContent = on ? 'Foto do antes: ligada' : 'Mostrar foto do antes'; g.style.opacity = String((+r.value || 40) / 100);
}
document.addEventListener('input', (e) => { if (e.target && e.target.id === 'cam_gr') camGhostApply(); });

/* ===== Fotos: baixar a foto, baixar antes e depois numa imagem só e enviar da galeria ===== */
function fotoActs(s, an, pa, pd) {
  const col = (st, p) => '<div class="fcol"><div class="muted sm">Foto do ' + st + '</div><div class="fbt">' + (p ? '<button class="btn ghost sm" data-act="foto-dl" data-st="' + st + '">Baixar</button>' : '') + '<button class="btn ghost sm" data-act="foto-up" data-st="' + st + '">' + ic('img') + 'Da galeria</button></div></div>';
  return '<div class="fact">' + col('antes', pa) + col('depois', pd) + '</div><div class="muted sm">"Da galeria" coloca uma foto do celular no lugar da foto do antes ou do depois.</div>' + (pa && pd ? '<div class="fpar"><button class="btn sm" data-act="foto-dl-par">Baixar antes e depois em uma imagem</button><div class="muted sm">Imagem 4:5 com as duas fotos lado a lado, pronta para Reels, Stories e status.</div></div>' : '') + '<input style="display:none" type="file" accept="image/*" id="gal_file" aria-label="Escolher foto da galeria">';
}
const fotoName = (s, extra) => { const c = client(s.clientId) || { name: 'cliente' }; return slug(c.name) + '-' + extra + '-' + s.date + '.jpg'; };
const dataParts = (d) => { const m = /^data:([^;]+);base64,(.*)$/.exec(d || ''); return m ? { mime: m[1], b64: m[2] } : null; };
ACTX['foto-dl'] = function (el) {
  const s = sess(UI.angleFor); if (!s) return; const p = photoOf(s, el.dataset.st, UI.angle), d = p && dataParts(PC.get(p.id)); if (!d) { toast('Foto não encontrada'); return; }
  saveFileOut(fotoName(s, el.dataset.st + '-' + UI.angle), d.mime, d.b64);
};
ACTX['foto-up'] = function (el) { UI.upSt = el.dataset.st; const f = document.getElementById('gal_file'); if (f) f.click(); };
document.addEventListener('change', async (e) => {
  const t = e.target; if (!t || t.id !== 'gal_file') return; const file = t.files && t.files[0]; if (!file) return;
  try {
    const s = sess(UI.angleFor); if (!s) return; const im = await loadImg(URL.createObjectURL(file)); const d = await compressImage(im, 1600);
    await setPhoto(s, UI.upSt || 'antes', UI.angle, d); toast('Foto do ' + (UI.upSt || 'antes') + ' salva'); route({ keep: true });
  } catch (err) { toast('Não foi possível ler a foto'); }
});
function drawCover(ctx, img, x, y, w, h) { const r = Math.max(w / img.width, h / img.height), iw = w / r, ih = h / r; ctx.drawImage(img, (img.width - iw) / 2, (img.height - ih) / 2, iw, ih, x, y, w, h); }
ACTX['foto-dl-par'] = async function () {
  const s = sess(UI.angleFor); if (!s) return; const pa = photoOf(s, 'antes', UI.angle), pd = photoOf(s, 'depois', UI.angle); if (!pa || !pd) return;
  toast('Gerando imagem…');
  const A = await loadImg(PC.get(pa.id)), D = await loadImg(PC.get(pd.id)), cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350; const x = cv.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 1080, 1350); drawCover(x, A, 0, 0, 538, 1350); drawCover(x, D, 542, 0, 538, 1350);
  const pill = (t, cx) => { x.font = '600 30px system-ui,Arial'; const w = x.measureText(t).width + 44; x.fillStyle = 'rgba(255,255,255,.92)'; x.beginPath(); (x.roundRect ? x.roundRect(cx - w / 2, 40, w, 60, 30) : x.rect(cx - w / 2, 40, w, 60)); x.fill(); x.fillStyle = '#3a2828'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, cx, 71); };
  pill('ANTES', 269); pill('DEPOIS', 811);
  const g = x.createLinearGradient(0, 1230, 0, 1350); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.45)'); x.fillStyle = g; x.fillRect(0, 1230, 1080, 120);
  x.fillStyle = '#fff'; x.font = 'italic 400 36px Georgia,serif'; x.textAlign = 'center'; x.fillText(S.settings.studio || '', 540, 1305);
  const d = dataParts(cv.toDataURL('image/jpeg', 0.92)); saveFileOut(fotoName(s, 'antes-e-depois-' + UI.angle), d.mime, d.b64);
};
