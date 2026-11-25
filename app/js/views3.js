'use strict';
/* ===== Telas (parte 3): WhatsApp e Ajustes ===== */
const slug = (t) => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const pdfName = (s) => 'Relatorio-' + slug((client(s.clientId) || { name: 'cliente' }).name) + '-' + s.date + '.pdf';
async function vWhatsApp(id) {
  const s = sess(id); if (!s) return notFound('relatorios');
  const c = client(s.clientId) || { name: '?' }; await Photo.preload(sessPhotoIds([s]));
  s.wa = Object.assign({ pdf: true, collage: true, fotos: false }, s.wa || {});
  const text = s.msg != null ? s.msg : messageText(s);
  const ck = (k, l, sub) => '<label class="ck" style="min-height:56px"><input type="checkbox" data-o="s" data-id="' + id + '" data-f="wa.' + k + '"' + (s.wa[k] ? ' checked' : '') + '><span style="flex:1">' + l + (sub ? '<br><span class="muted sm">' + sub + '</span>' : '') + '</span></label>';
  const nComp = anglesComplete(s).length, nPhotos = (s.photos || []).length;
  return { nav: 'relatorios', html: head('Relatório · ' + esc(c.name), 'Enviar pelo WhatsApp', back('#/relatorio/' + id, 'Relatório') + '<button class="btn wa" data-act="wa-send" data-id="' + id + '">' + ic('chat') + 'Enviar pelo WhatsApp</button>') +
    '<section class="cols"><div class="stack" style="width:340px;flex:none"><div class="card stack" style="gap:12px"><div style="display:flex;align-items:center;gap:14px">' + av(c.name, 52) + '<div style="flex:1;min-width:0"><div class="muted" style="font-size:12px">Enviar para</div><div style="font-weight:500;font-size:17px">' + esc(c.name) + '</div></div></div><div><label class="lb" for="w_p">WhatsApp</label><input class="in" id="w_p" type="tel" placeholder="(00) 0 0000-0000" data-o="c" data-id="' + c.id + '" data-f="phone" value="' + esc(c.phone || '') + '"></div></div>' +
    '<div class="card" style="padding:20px 22px 10px"><h2 class="h2" style="margin-bottom:8px">Anexos</h2>' + ck('pdf', 'Relatório em PDF', '<span id="pdf_info">gerando…</span>') + ck('collage', 'Colagem antes e depois', nComp ? nComp + (nComp === 1 ? ' imagem' : ' imagens') : 'sem pares de fotos') + ck('fotos', 'Fotos originais', nPhotos + (nPhotos === 1 ? ' foto' : ' fotos')) + '</div>' +
    '<div class="card stack" style="gap:8px"><label class="lb" for="w_m" style="margin:0">Mensagem</label><textarea class="in" id="w_m" rows="9" data-o="s" data-id="' + id + '" data-f="msg" data-live="bub_text">' + esc(text) + '</textarea><button class="btn ghost sm" data-act="msg-reset" data-id="' + id + '" style="align-self:flex-start">Restaurar mensagem padrão</button></div></div>' +
    '<div class="grow chat"><div class="top">' + av(c.name, 40) + '<div><div style="font-weight:500">' + esc(c.name) + '</div><div class="muted sm">prévia da conversa</div></div></div><div class="body" id="chat_body"><div class="bub" style="padding:6px;width:min(100%,340px)" id="prev_col" hidden></div><div class="bub" style="padding:10px 12px;width:min(100%,340px);display:flex;align-items:center;gap:12px" id="prev_pdf"><span style="width:40px;height:40px;border-radius:10px;background:#fff;color:var(--rose-d);display:flex;align-items:center;justify-content:center;flex:none">' + ic('file') + '</span><span style="min-width:0"><span style="display:block;font-size:14px;font-weight:500;overflow-wrap:anywhere">' + esc(pdfName(s)) + '</span><span style="font-size:12px;color:var(--sage-t)">PDF</span></span></div><div class="bub" style="padding:12px 14px;max-width:440px;font-size:14px;line-height:1.4;white-space:pre-wrap;overflow-wrap:anywhere" id="bub_text">' + esc(text) + '</div></div></div></section>',
    after: async () => {
      const col = document.getElementById('prev_col');
      const angs = anglesComplete(s);
      if (angs.length && col) { col.hidden = false; col.innerHTML = ''; for (const a of angs) { const cv = await renderCollage(s, a); const im = document.createElement('img'); im.src = cv.toDataURL('image/jpeg', 0.7); im.alt = 'Colagem ' + ANGLES[a]; im.style.cssText = 'width:100%;display:block;border-radius:12px;margin-bottom:4px'; col.appendChild(im); } }
      const pages = await renderReport(s, s.rep); const inf = document.getElementById('pdf_info'); if (inf) inf.textContent = pages.length + (pages.length === 1 ? ' página' : ' páginas');
    } };
}
/* ---------- Ajustes ---------- */
// seções de Ajustes: aparecem no menu lateral (grupo Ajustes) como #/ajustes/<seção>
const ajTabs = () => [['perfil', 'Perfil do estúdio'], ['areas', 'Áreas de atuação'], ['msg', 'Mensagem do WhatsApp'], ['cuid', 'Modelos de cuidados']].concat(AJ_EXTRA, typeof AJ_CLOUD !== 'undefined' ? AJ_CLOUD : [], [['backup', 'Backup e dados']]);
async function vAjustes() {
  const st = S.settings, tab = UI.ajTab;
  const inp = (f, l, ph) => '<div><label class="lb" for="s_' + f + '">' + l + '</label><input class="in" id="s_' + f + '" data-o="st" data-f="' + f + '" placeholder="' + (ph || '') + '" value="' + esc(st[f]) + '"></div>';
  const ck = (f, l) => '<label class="ck"><input type="checkbox" data-o="st" data-f="' + f + '"' + (st[f] ? ' checked' : '') + '>' + l + '</label>';
  let body = '';
  if (tab === 'perfil') {
    body = '<div class="card stack"><h2 class="h2">Dados do estúdio</h2><div style="display:flex;align-items:center;gap:16px">' + (st.logo ? '<img src="' + st.logo + '" alt="Logo" style="width:64px;height:64px;border-radius:50%;object-fit:cover">' : av(st.owner || 'LS', 64)) + '<div style="flex:1"><div style="font-weight:500">Logo do estúdio</div><div class="muted sm">Aparece no topo dos relatórios</div></div><label class="btn ghost sm" style="position:relative;cursor:pointer">Trocar logo<input class="hidefile" type="file" accept="image/*" id="logo_file" aria-label="Escolher logo"></label>' + (st.logo ? '<button class="btn danger sm" data-act="logo-del">' + ic('trash') + '</button>' : '') + '</div><div class="grid2">' + inp('studio', 'Nome do estúdio') + inp('owner', 'Responsável') + inp('whats', 'WhatsApp do estúdio', '(00) 0 0000-0000') + inp('insta', 'Instagram', '@seuperfil') + '</div></div><div class="card" style="padding:22px 24px 10px"><h2 class="h2" style="margin-bottom:10px">Relatório e fotos</h2>' + ck('attachPdf', 'Anexar o PDF do relatório automaticamente') + ck('attachPhotos', 'Incluir fotos de antes e depois') + ck('askConsent', 'Avisar quando a cliente não autorizou fotos') + '</div>' + themePicker();
  } else if (tab === 'areas') {
    body = '<div class="card stack"><h2 class="h2">Áreas de atuação</h2><div class="muted sm">Marque as áreas que o seu estúdio atende. Só os procedimentos dessas áreas aparecem ao agendar e iniciar um atendimento. Clientes e relatórios antigos continuam guardados.</div><div class="grid2" style="gap:10px">' + areaCards(activeAreas()) + '</div></div>';
  } else if (tab === 'msg') {
    body = '<div class="card stack"><h2 class="h2">Mensagem do WhatsApp</h2><div class="muted sm">Modelo usado em todos os envios. Você ainda pode editar o texto antes de enviar cada relatório. Campos disponíveis: <b>{nome}</b>, <b>{procedimento}</b>, <b>{cuidados}</b>, <b>{manutencao}</b>, <b>{estudio}</b>.</div><textarea class="in" rows="14" id="s_msg" data-o="st" data-f="msg">' + esc(st.msg) + '</textarea><button class="btn ghost sm" style="align-self:flex-start" data-act="aj-msg-reset">Restaurar modelo padrão</button></div>';
  } else if (tab === 'cuid') {
    const svc = UI.ajSvc && activeServices().includes(UI.ajSvc) ? UI.ajSvc : activeServices()[0];
    body = '<div class="card stack"><h2 class="h2">Modelos de cuidados</h2><div class="chips">' + activeServices().map((k) => '<button class="chip ' + (svc === k ? 'on' : '') + '" data-act="aj-svc" data-v="' + k + '">' + SERVICES[k].name + '</button>').join('') + '</div><div class="muted sm">Um cuidado por linha. Eles aparecem pré-selecionados no atendimento e no relatório.</div><textarea class="in" rows="10" id="care_text" data-svc="' + svc + '">' + esc((st.cuidados[svc] || []).join('\n')) + '</textarea></div>';
  } else if (AJ_EXTRA.some((x) => x[0] === tab)) {
    body = ajExtra(tab);
  } else if (typeof ajCloud === 'function' && ajCloud(tab)) {
    body = ajCloud(tab);
  } else {
    body = '<div class="card stack"><h2 class="h2">Backup e dados</h2><div class="muted">' + S.clients.length + ' clientes · ' + S.sessions.length + ' atendimentos · ' + S.sessions.reduce((n, s) => n + (s.photos || []).length, 0) + ' fotos. Os dados ficam guardados somente neste aparelho' + (S.persisted ? '.' : ' e <b>não estão sendo salvos</b> (armazenamento indisponível).') + '</div><div class="acts"><button class="btn" data-act="export">' + ic('dl') + 'Exportar backup</button><label class="btn ghost" style="position:relative;cursor:pointer">Importar backup<input class="hidefile" type="file" accept=".json,application/json" id="imp_file" aria-label="Escolher arquivo de backup"></label></div></div>' + (hasNative() && window.Native.appVersion ? '<div class="card stack"><h2 class="h2">Aplicativo</h2><div class="muted">Versão ' + esc(Native.appVersion()) + '</div><div class="acts"><button class="btn ghost" data-act="app-update">Verificar atualização</button></div></div>' : '') + '<div class="card stack"><h2 class="h2">Outras opções</h2><div class="acts"><button class="btn ghost" data-act="sample">Carregar dados de exemplo</button><button class="btn danger" data-act="wipe">' + ic('trash') + 'Apagar todos os dados</button></div></div>';
  }
  return { nav: 'ajustes', html: head('Ajustes', esc((ajTabs().find((x) => x[0] === tab) || [, 'Ajustes'])[1]), '') + '<div class="stack">' + body + '</div>' };
}
