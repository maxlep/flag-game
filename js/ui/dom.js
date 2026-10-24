// js/ui/dom.js: Reaching the page: $, app, pointer capture, a Wikipedia link.
// Needs before it at load time: nothing.

const wl = (url, text, title = "Wikipedia") =>
  `<a class="wl" href="${url}" target="_blank" rel="noopener" title="${title}">${text}</a>`;
const $ = s => document.querySelector(s);
const app = $("#app");
const capture = (el, e) => {
  try {
    el.setPointerCapture(e.pointerId);
  } catch (x) {}
};
