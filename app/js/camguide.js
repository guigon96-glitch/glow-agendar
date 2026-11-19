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
