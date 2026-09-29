/*
 * Dāimūn embed helper — https://daimun.app
 *
 * Optional companion to the <iframe src="https://daimun.app/embed/…"> snippet.
 * The widget reports its content height; this sizes each Daimun iframe to fit,
 * so there is no inner scrollbar or empty gap when times change (e.g. a second
 * Jumuah is added). Without it the iframe simply keeps its fixed height.
 */
(function () {
  if (window.__daimunEmbed) return; // tolerate the script being pasted twice
  window.__daimunEmbed = true;

  var ORIGINS = ['https://daimun.app', 'https://www.daimun.app'];

  window.addEventListener('message', function (e) {
    if (ORIGINS.indexOf(e.origin) === -1) return;
    var data = e.data;
    if (!data || data.type !== 'daimun-embed:height') return;
    var h = Number(data.height);
    if (!isFinite(h) || h <= 0 || h > 4000) return;

    var frames = document.querySelectorAll('iframe[src*="daimun.app/embed/"]');
    for (var i = 0; i < frames.length; i++) {
      if (frames[i].contentWindow === e.source) {
        frames[i].style.height = Math.ceil(h) + 'px';
        break;
      }
    }
  });
})();
