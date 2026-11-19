/* Pix (BR Code estático): usado pelo app e pela página de agendamento. O dinheiro vai direto para a chave da profissional. */
var PixCore = (function () {
  function crc16(s) { var c = 0xFFFF; for (var i = 0; i < s.length; i++) { c ^= s.charCodeAt(i) << 8; for (var k = 0; k < 8; k++) c = (c & 0x8000) ? ((c << 1) ^ 0x1021) & 0xFFFF : (c << 1) & 0xFFFF; } return ('000' + c.toString(16).toUpperCase()).slice(-4); }
  function tlv(id, v) { v = String(v); return id + ('0' + v.length).slice(-2) + v; }
  function clean(s, n) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().toUpperCase().slice(0, n); }
  /* tipos: cpfcnpj, telefone, email, aleatoria. Devolve a chave normalizada ou '' se inválida */
  function normKey(type, key) {
    key = String(key || '').trim(); var d = key.replace(/\D/g, '');
    if (type === 'cpfcnpj') return d.length === 11 || d.length === 14 ? d : '';
    if (type === 'telefone') { if (d.length >= 12 && d.slice(0, 2) === '55') d = d.slice(2); return d.length === 10 || d.length === 11 ? '+55' + d : ''; }
    if (type === 'email') return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(key) && key.length <= 77 ? key.toLowerCase() : '';
    if (type === 'aleatoria') return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key) ? key.toLowerCase() : '';
    return '';
  }
  function payload(o) {
    var acct = tlv('00', 'br.gov.bcb.pix') + tlv('01', o.key);
    var p = tlv('00', '01') + tlv('01', '12') + tlv('26', acct) + tlv('52', '0000') + tlv('53', '986');
    if (o.amount > 0) p += tlv('54', Number(o.amount).toFixed(2));
    p += tlv('58', 'BR') + tlv('59', clean(o.name, 25) || 'RECEBEDOR') + tlv('60', clean(o.city, 15) || 'BRASIL');
    p += tlv('62', tlv('05', String(o.txid || '***').replace(/[^A-Za-z0-9*]/g, '').slice(0, 25) || '***'));
    p += '6304'; return p + crc16(p);
  }
  function qrSvg(text, px) {
    var q = qrcode(0, 'M'); q.addData(text); q.make(); var n = q.getModuleCount(), m = 2, d = '';
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += 'M' + (c + m) + ' ' + (r + m) + 'h1v1h-1z';
    var t = n + m * 2; return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + t + ' ' + t + '" width="' + (px || 240) + '" height="' + (px || 240) + '" shape-rendering="crispEdges" role="img" aria-label="QR Code Pix"><rect width="' + t + '" height="' + t + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  return { crc16: crc16, normKey: normKey, payload: payload, qrSvg: qrSvg, clean: clean };
})();
