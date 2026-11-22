'use strict';
/* ===== Versão web (navegador no desktop, iPhone e iPad): instalação, armazenamento e avisos ===== */
const IS_WEB = typeof window.Native === 'undefined' || !window.Native;
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isStandalone = () => (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
if (IS_WEB && /^https?:$/.test(location.protocol)) {
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { /* sem suporte */ }
}
let _installEv = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); _installEv = e; });
(function () {
  const _v = vInicio;
  vInicio = async function () { // eslint-disable-line no-func-assign
    const r = await _v(); if (!IS_WEB || !r || !r.html) return r;
    let cards = '';
    if (typeof cloudOn === 'function' && !cloudOn()) cards += '<div class="card stack" style="gap:8px;border-color:#E5D6CE;background:#F8EEE9"><b>Seus dados estão só neste navegador</b><div class="muted sm">Se você limpar o navegador ou trocar de aparelho, eles se perdem. Entre com o Google para guardar tudo na nuvem com criptografia e abrir em qualquer lugar.</div><div class="acts"><button class="btn sm" data-act="cl-google">Entrar com Google</button></div></div>';
    if (!isStandalone() && !(S.settings && S.settings.installHide)) {
      if (isIOS) cards += '<div class="card stack" style="gap:6px"><b>Instale no seu iPhone ou iPad</b><div class="muted sm">No Safari, toque em Compartilhar (quadrado com seta) e depois em <b>Adicionar à Tela de Início</b>. Assim o app abre em tela cheia e seus dados ficam mais protegidos.</div><div class="acts"><button class="btn ghost sm" data-act="install-hide">Entendi</button></div></div>';
      else if (_installEv) cards += '<div class="card stack" style="gap:6px"><b>Instalar no computador</b><div class="muted sm">Abra o Glow Studio como um aplicativo, com ícone próprio.</div><div class="acts"><button class="btn sm" data-act="install-go">Instalar</button><button class="btn ghost sm" data-act="install-hide">Agora não</button></div></div>';
    }
    if (cards) { const i = topAt(r.html); r.html = r.html.slice(0, i) + cards + r.html.slice(i); }
    return r;
  };
  Object.assign(ACTX, {
    'install-hide'() { S.settings.installHide = true; save(); route({ keep: true }); },
    async 'install-go'() { if (!_installEv) return; _installEv.prompt(); try { await _installEv.userChoice; } catch (e) { /* ignorado */ } _installEv = null; route({ keep: true }); }
  });
})();
