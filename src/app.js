import { esc, txt, wcw, clip, stripEmoji, bytes, uptime, pct, graph, meter, box } from "./render/util.js";
import './visual/palettes.js';
import './visual/fx.js';
import './visual/style.css';
import { api } from './data/http.js';
import { createLive } from './data/live.js';
import { sampleHistory } from './data/samples.js';
import { groupsOf, summaryOf, finite } from './data/model.js';
import { resolveConfig, preference } from './config/settings.js';
import { mount } from './render/dom.js';
import manifest from '../theme.json';
import { createDetail } from "./views/detail.js";
import { t as tr, getLang, setLang, onLang, detect } from "./i18n/index.js";

const $ = (id) => document.getElementById(id);
const PALETTES = window.OMARCHY_PALETTES || {};
const OFX = window.OFX;
const STORE = "palette";
const FONT = '"JetBrainsMono Nerd Font","JetBrains Mono",ui-monospace,"Liberation Mono",monospace';

const store = {
  get: () => { try { return preference.get(STORE); } catch { return null; } },
  set: (v) => { try { v ? preference.set(STORE, v) : preference.set(STORE, null); } catch {} },
};
const reduced = matchMedia("(prefers-reduced-motion: reduce)");
const reduceMotion=()=>matchMedia("(prefers-reduced-motion: reduce)").matches;

let site = {};      // /api/public
let settings = {};  // site.theme_settings
let siteName = "Monitor";
let nodes = [];

const hist = {}; // Monitor id -> {cpu, up, down}
let group = null, query = "", cursor = 0, kbd = false, curList = [];
let W = 44; // card width in characters
let banner, bannerText = "";

// ---- palette ----
const dark = matchMedia("(prefers-color-scheme: dark)");
const adminDefault = () => (dark.matches ? settings.palette_dark || "catppuccin" : settings.palette_light || "catppuccin");
const colorCache = {};
const TOKENS = { main: "accent", bright: "bright-foreground", dim: "muted", green: "green", cyan: "cyan", blue: "blue", orange: "orange", red: "red", yellow: "yellow" };
const color = (tok) => colorCache[tok] || (colorCache[tok] = getComputedStyle(document.documentElement).getPropertyValue("--" + (TOKENS[tok] || tok)).trim() || "#888");

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES["catppuccin"] || Object.values(PALETTES)[0];
  if (!p) return;
  const root = document.documentElement.style;
  const c = (k, fb) => p[k] || p[fb] || p.foreground;
  const vars = {
    background: c("background"), "dark-background": c("dark_background", "background"),
    "darker-background": c("darker_background", "background"), "lighter-background": c("lighter_background", "background"),
    foreground: c("foreground"), "dark-foreground": c("dark_foreground", "muted"),
    "light-foreground": c("light_foreground", "foreground"), "bright-foreground": c("bright_foreground", "foreground"),
    accent: c("accent", "blue"), selection: c("selection", "muted"), muted: c("muted", "selection"),
    red: c("red"), yellow: c("yellow"), orange: c("orange", "yellow"), green: c("green"),
    cyan: c("cyan", "blue"), blue: c("blue"), magenta: c("magenta", "accent"),
  };
  for (const [k, v] of Object.entries(vars)) root.setProperty("--" + k, v);
  root.colorScheme = p.mode === "light" ? "light" : "dark";
  for (const k in colorCache) delete colorCache[k];
  if (banner && !banner.raf) banner.drawStatic();
}
const paletteNames = () => Object.keys(PALETTES);
const chosenPalette = () => { const c = settings.allow_switch === false ? null : store.get(); return PALETTES[c] ? c : null; };
const currentPalette = () => chosenPalette() || adminDefault();

function setupPaletteSelect() {
  const sel = $("palette");
  if (settings.allow_switch === false) { sel.hidden = true; return; }
  mount(sel, `<option value="">${tr("auto")}</option>` + paletteNames().map((n) => `<option value="${n}">${n}</option>`).join(""));
  sel.value = chosenPalette() || "";
  sel.hidden = false;
  const fit=()=>{sel.style.width=`${wcw(sel.selectedOptions[0]?.textContent||'')+1}ch`;};
  fit();
  sel.onchange = () => { store.set(sel.value); fit(); applyPalette(currentPalette()); status(); };
}
dark.addEventListener("change", () => applyPalette(currentPalette()));

// ---- list card (a box drawn with text) ----
// Only metrics that are safe to show publicly: no processes, IPs or remarks.
function cardHTML(n, i) {
  const I = W - 2, b = box(I);
  const r = n.metrics;
  const on = n.online && !!r;
  const h = hist[n.id] || { cpu: [], up: [], down: [] };
  const L = [];

  const right = n.group ? ` ${clip(n.group, 12)} ` : "";
  L.push(b.top(` ${String(i + 1).padStart(2, "0")} ${n.name} `, right));

  const state = n.state === "online" ? ` ${tr("up", { t: uptime(r.uptime) })}` : ` ${n.state === "waiting" ? (getLang()==="zh"?"等待上报":"waiting") : n.state === "invalid" ? (getLang()==="zh"?"指标异常":"unavailable") : tr("offline")}`;
  const sub = [stripEmoji(n.country), n.os].filter(Boolean).join(" · ");
  const rem = I - 2 - wcw(state) - 3;
  L.push(b.row([["", " "], [on ? "g" : "r", "●"], ["", state], ...(rem > 6 && sub ? [["d", " · " + clip(sub, rem)]] : [])]));

  const bl = I - 5 - 7;
  const meterRow = (label, p, has) => b.row([["d", ` ${label} `], ...meter(p / 100, bl), ["w", (has ? p.toFixed(1) + "%" : "-").padStart(7) + " "]]);
  const cpu = on && finite(r.cpu) ? r.cpu : null, mem = on && finite(r.mem_used) && r.mem_total>0 ? pct(r.mem_used, r.mem_total) : null, dsk = on && finite(r.disk_used) && r.disk_total>0 ? pct(r.disk_used, r.disk_total) : null;
  L.push(meterRow("cpu", cpu??0, cpu!==null));
  for (const g of graph(h.cpu, I - 2, 1, 100)) L.push(b.row([["", " "], ["a", g]]));
  L.push(meterRow("mem", mem??0, mem!==null));
  L.push(meterRow("dsk", dsk??0, dsk!==null));

  const gw = I - 13;
  const net = (arrow, cls, bps, series) => {
    const mx = Math.max(1024, ...series.slice(-gw * 2));
    return b.row([[cls, ` ${arrow} `], ["w", (on && finite(bps) ? bytes(bps) + "/s" : "-").padStart(8)], ["", " "], [cls, graph(series, gw, 1, mx)[0]]]);
  };
  L.push(net("↑", "u", on ? r.net_tx : 0, h.up));
  L.push(net("↓", "n", on ? r.net_rx : 0, h.down));
  L.push(b.bottom("[↵]"));
  return L.join("");
}

// ---- list view ----
const els = new Map();
let lastSig = "";
function cardEl(id) {
  let el = els.get(id);
  if (!el) {
    el = document.createElement("div");
    el.className = "card";
    el.tabIndex=0; el.setAttribute("role","link");
    el.dataset.id = id;
    els.set(id, el);
  }
  return el;
}

function visibleNodes() { const q=query.toLowerCase(); return nodes.filter(n=>(group===null||n.group===group)&&(!q||`${n.name} ${n.group}`.toLowerCase().includes(q))); }
function summary() {
 const v=summaryOf(visibleNodes());
 mount($("summary"), `<span class="${v.online?'g':'r'}">●</span> <b>${v.online}/${v.total}</b> ${txt(tr('online'))}   <span class="u">↑ ${v.tx===null?'—':bytes(v.tx)+'/s'}</span>  <span class="n">↓ ${v.rx===null?'—':bytes(v.rx)+'/s'}</span>${v.cpu===null?'':`   <span class="d">${txt(tr('cpuavg'))}</span> ${v.cpu.toFixed(0)}%`}`);
}

function render() {
  const list = visibleNodes();
  const sig = list.map((n) => n.id).join() + "|" + W;
  if (sig !== lastSig) { lastSig = sig; $("grid").replaceChildren(...list.map((n) => cardEl(n.id))); }
  curList = list;
  cursor = Math.max(0, Math.min(cursor, list.length - 1));
  list.forEach((n, i) => {
    const el = cardEl(n.id), html = cardHTML(n, i);
    el.setAttribute("aria-label", n.name);
    if (el._h !== html) { el._h = html; mount(el,html); }
    el.classList.toggle("off", !n.online);
    el.classList.toggle("cur", kbd && i === cursor);
  });
  $("empty").hidden = list.length > 0;

  summary();
  status();
}

let groupSignature="";
function setupGroups() {
  const box = $("chips");
  const groups=groupsOf(nodes);
  const signature=JSON.stringify([groups,nodes.some(n=>!n.group),group,getLang(),settings.show_group]);if(signature===groupSignature)return;groupSignature=signature;
  if(settings.show_group===false||!groups.length){box.hidden=true;return;}
  box.hidden=false; box.replaceChildren();
  for(const value of [null,...groups,...(nodes.some(n=>!n.group)?['']:[])]) {
    const b=document.createElement('button');b.className='chip'+(group===value?' on':'');
    b.textContent=value===null?tr('all'):value===''?(getLang()==='zh'?'未分组':'ungrouped'):value;
    b.onclick=()=>{group=value;setupGroups();render();};box.append(b);
  }
}

$("grid").addEventListener("click", (e) => {
  const c = e.target.closest(".card");
  if (!c) return;
  const i = curList.findIndex((n) => n.id === c.dataset.id);
  if (i >= 0) cursor = i;
  openNode(c.dataset.id);
});

// ---- sizing ----
let cwCache = 0;
function charWidth() {
  if (!cwCache) {
    const probe=document.createElement('span');
    probe.style.cssText='position:absolute;visibility:hidden;display:block;width:100ch;font:inherit';
    document.body.append(probe);cwCache=probe.getBoundingClientRect().width/100||9;probe.remove();
  }
  return cwCache;
}
function calcWidth() {
  const available=Math.max(0,document.documentElement.clientWidth-16),gap=14,cell=charWidth();
  const columns=Math.max(1,Math.floor((available+gap)/(320+gap)));
  W=Math.max(20,Math.floor((available-gap*(columns-1))/columns/cell));
  $("grid").style.setProperty("--columns",columns);
  $("grid").style.setProperty("--w", W);
}
function layout() {
  calcWidth();
  setBanner(bannerText, false);
  detail.layout();
  if (!detail.active()) render();
}

// ---- banner + screensaver ----
function linesFor(text) {
  text = (text || "Monitor").trim();
  return OFX.bigText(text) || OFX.rasterText(text) || ["", " " + text.toUpperCase(), ""];
}
function setBanner(text, play, effect) {
  bannerText = text;
  banner.set(linesFor(text), innerWidth - 24, 16, 120);
  if (play && !reduceMotion()) banner.play(effect);
}
const siteBanner = () => (settings.banner || siteName || "Monitor");
$("banner").addEventListener("click", () => {if(!reduceMotion())banner.play();});

let saver = null, saverBanner = null, saverTimer = 0, idleTimer = 0;
function startSaver() {
  if (saver || reduceMotion()) return;
  saver = $("saver");
  saver.style.display = "flex";
  saverBanner = new OFX.Banner($("saver-cv"), color);
  saverBanner.set(linesFor(siteBanner()), innerWidth * 0.9, 44);
  saverBanner.onDone = () => { if(reduceMotion()){stopSaver();return;} saverTimer = setTimeout(() => saverBanner && saverBanner.play(), 2500); };
  saverBanner.play();
}
function stopSaver() {
  if (!saver) return;
  clearTimeout(saverTimer);
  saverBanner.stop();
  saverBanner.onDone = null;
  saver.style.display = "none";
  saver = saverBanner = null;
}
function armIdle() {
  clearTimeout(idleTimer);
  if (settings.screensaver !== false) idleTimer = setTimeout(startSaver, 90000);
}
for (const ev of ["pointermove", "pointerdown", "wheel", "touchstart", "keydown"]) {
  addEventListener(ev, () => { if (saver) stopSaver(); armIdle(); }, { passive: true });
}

// ---- routing: #/node/<id> is the detail page; the URL path stays "/" so theme assets keep resolving ----
const detail = createDetail({
  nodes: () => nodes, settings: () => site, cw: charWidth,
  back: () => back(), replay: () => {if(!reduceMotion())banner.play();}, status: () => status(),
});
let fromList = false, listScroll = 0;

function openNode(id) { fromList = true; location.hash = "#/node/" + encodeURIComponent(id); }
function back() {
  if (fromList) { fromList = false; history.back(); } else location.replace("#/");
}
function route() {
  const m = /^#\/node\/(.+)$/.exec(location.hash);
  let id=null; try { id=m&&decodeURIComponent(m[1]); } catch { /* invalid link */ }
  const n = id && nodes.find((x) => x.id === id);
  if (n) {
    if (!detail.active()) listScroll = scrollY;
    $("list-view").hidden = true;
    detail.show(n.id);
    setBanner(n.name, !reduceMotion() && settings.intro !== "off", settings.intro === "random" ? undefined : settings.intro);
  } else {
    const was = detail.active();
    if (was) detail.hide();
    $("list-view").hidden = false;
    if (was) { setBanner(siteBanner(), false); requestAnimationFrame(() => scrollTo(0, listScroll)); }
    render();
  }
  status();
}
addEventListener("hashchange", route);

// ---- vim-style keys ----
const help = $("help"), cmd = $("cmd"), cmdIn = $("cmd-in");
let count = "", pendingG = 0;

function openHelp() { help.textContent = tr(detail.active() ? "help.detail" : "help.list"); help.hidden = false; }

function status() {
  let mode = "NORMAL", name = "", pos = "", flt = "";
  if (detail.active()) {
    const i = detail.info();
    mode = i.mode; name = i.name; pos = i.pos;
  } else {
    const n = curList[cursor];
    name = n ? n.name : "";
    pos = curList.length ? `${cursor + 1}/${curList.length}` : "0/0";
    flt = [group && `@${group}`, query && `/${query}`, count].filter(Boolean).join(" ");
  }
  $("st-mode").textContent = mode;
  $("st-pos").textContent = pos;
  $("st-name").textContent = name;
  $("st-flt").textContent = flt;
  $("st-pal").textContent = currentPalette();
}
function cols() {
  const cs = $("grid").children;
  if (!cs.length) return 1;
  const top = cs[0].offsetTop;
  let k = 0;
  while (k < cs.length && cs[k].offsetTop === top) k++;
  return k || 1;
}
function moveTo(i) {
  if (!curList.length) return;
  kbd = true;
  cursor = Math.max(0, Math.min(curList.length - 1, i));
  render();
  els.get(curList[cursor].id).scrollIntoView({ block: "nearest" });
}
function moveRows(dir, n) {
  const c = cols(), len = curList.length;
  let i = cursor;
  for (let k = 0; k < n; k++) {
    let t = i + dir * c;
    if (t >= len && Math.floor(i / c) < Math.floor((len - 1) / c)) t = len - 1; // partial last row
    if (t < 0 || t >= len) break;
    i = t;
  }
  moveTo(i);
}
const cycle = (list, cur, dir) => list[(list.indexOf(cur) + dir + list.length) % list.length];
function stepPalette(dir) {
  if (settings.allow_switch === false) return;
  const next = cycle(paletteNames(), currentPalette(), dir);
  store.set(next);
  $("palette").value = next;
  $("palette").style.width=`${wcw(next)+1}ch`;
  applyPalette(next);
}
function stepGroup(dir) {
  const gs = [null, ...groupsOf(nodes), ...(nodes.some(n=>!n.group)?[""]:[])];
  if (gs.length < 2) return;
  group = cycle(gs, group, dir);
  setupGroups();
  render();
}
// u / Esc in the list: clear search, then clear group
function listBack() {
  if (query) { query = ""; render(); }
  else if (group!==null) { group = null; setupGroups(); render(); }
}
function openSearch() { cmd.hidden = false; cmdIn.value = query; cmdIn.focus(); }
function closeSearch(keep) {
  if (!keep) query = "";
  cmd.hidden = true;
  cmdIn.blur();
  moveTo(0);
  if (!curList.length) render();
}
cmdIn.addEventListener("input", () => { query = cmdIn.value.trim(); cursor = 0; render(); });
cmdIn.addEventListener("keydown", (e) => {
  if (e.isComposing) return;
  if (e.key === "Enter") { e.preventDefault(); closeSearch(true); }
  else if (e.key === "Escape") { e.preventDefault(); closeSearch(false); }
});

addEventListener("keydown", (e) => {
  if (e.isComposing || e.target.isContentEditable || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
  const k = e.key;
  if(e.target.closest("button,a") && (k === "Enter" || k === " "))return;
  if(e.target.closest('.card') && k==='Enter'){openNode(e.target.closest('.card').dataset.id);e.preventDefault();return;}
  if (!help.hidden) { if (k === "?" || k === "u" || k === "Escape" || k === "q") { help.hidden = true; e.preventDefault(); } return; }
  // keys that work on every page
  if (k === "?") { openHelp(); e.preventDefault(); return; }
  if (k === "a") { location.href = "/admin"; e.preventDefault(); return; }
  if (k === "i") { toggleLang(); e.preventDefault(); return; }
  if (k === "t") { stepPalette(1); status(); e.preventDefault(); return; }
  if (k === "T") { stepPalette(-1); status(); e.preventDefault(); return; }
  if (k === "s") { startSaver(); e.preventDefault(); return; }
  if (detail.active()) { if (detail.key(e)) e.preventDefault(); status(); return; }

  if (/^[0-9]$/.test(k) && (k !== "0" || count)) { count += k; status(); return; }
  const n = parseInt(count, 10) || 1, hadCount = !!count;
  count = "";
  const g = pendingG && Date.now() - pendingG < 800;
  pendingG = 0;
  let handled = true;
  switch (k) {
    case "h": case "ArrowLeft": moveTo(cursor - n); break;
    case "l": case "ArrowRight": moveTo(cursor + n); break;
    case "j": case "ArrowDown": moveRows(1, n); break;
    case "k": case "ArrowUp": moveRows(-1, n); break;
    case "g": if (g) moveTo(hadCount ? n - 1 : 0); else pendingG = Date.now(); break;
    case "G": moveTo(hadCount ? n - 1 : curList.length - 1); break;
    case "0": { const c = cols(); moveTo(cursor - (cursor % c)); break; }
    case "$": { const c = cols(); moveTo(Math.min(curList.length - 1, cursor - (cursor % c) + c - 1)); break; }
    case "Enter": { const c = curList[cursor]; if (c) { kbd = true; openNode(c.id); } break; }
    case "u": case "Escape": case "Backspace": listBack(); break;
    case "/": openSearch(); break;
    case "H": stepGroup(-1); break;
    case "L": stepGroup(1); break;
    case "r": if(!reduceMotion()) banner.play(); break;
    default: handled = false;
  }
  if (handled) e.preventDefault();
  status();
});
$("st-help").addEventListener("click", openHelp);
$("st-lang").addEventListener("click", toggleLang);

// ---- language ----
function applyStatic() {
  document.querySelectorAll("[data-i18n]").forEach((e) => { e.textContent = tr(e.dataset.i18n); });
  $("st-lang").textContent = tr("lang.label");
  $("cmd-in").placeholder = tr("search");
}
function toggleLang() { setLang(getLang() === "zh" ? "en" : "zh"); }
onLang(() => {
  applyStatic();
  setupPaletteSelect();
  setupGroups();
  lastSig = "";
  for (const el of els.values()) el._h = null;
  if (detail.active()) detail.layout();
  else render();
  status();
});
help.addEventListener("click", () => { help.hidden = true; });

// ---- Monitor snapshots ----
let lastSample=0, lastRoute='';
const stream=createLive({url:`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/ws${typeof DecompressionStream==='function'?'?gzip':''}`,fetchNodes:signal=>api('/nodes',{signal}),
 receive(list){
  const gap=Date.now()-lastSample>10000; lastSample=Date.now(); nodes=list;
  sampleHistory(hist,nodes,gap);
  if(group!==null&&!nodes.some(n=>n.group===group))group=null;
  setupGroups();
  if(lastRoute!==location.hash || !detail.active()&&location.hash.startsWith('#/node/')){lastRoute=location.hash;route();}
  else if(detail.active()){if(!nodes.some(n=>n.id===detail.current()))route();else detail.render();summary();}else render();
 },error(e){const el=$('connection');el.hidden=!e;if(e)el.textContent=e.message;if(e?.status===401){detail.clear();clearSession();route();}}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden){stream.pause();banner.stop();stopSaver();clearTimeout(idleTimer);}else{stream.resume();armIdle();}});
reduced.addEventListener('change',()=>{if(reduceMotion()){banner.stop();banner.drawStatic();stopSaver();clearTimeout(idleTimer);}else armIdle();});
addEventListener('monitor-denied',e=>{stream.pause();nodes=[];detail.clear();clearSession();route();$('connection').hidden=false;$('connection').textContent=e.detail.message;});
function clearSession(){for(const key of Object.keys(hist))delete hist[key];els.clear();lastSig='';groupSignature='';}
addEventListener('pagehide',()=>{stream.stop();detail.hide();});
addEventListener('pageshow',e=>{if(e.persisted&&!document.hidden){lastSample=0;stream.resume();armIdle();}});

// ---- boot ----
banner=new OFX.Banner($('banner'),color);
applyPalette('catppuccin');setLang(detect(''),false);applyStatic();
let rz;addEventListener('resize',()=>{clearTimeout(rz);rz=setTimeout(()=>{cwCache=0;layout();},120);});
document.fonts?.ready.then(()=>{cwCache=0;layout();});document.fonts?.addEventListener('loadingdone',()=>{cwCache=0;layout();});
$('search-button').addEventListener('click',openSearch);
Promise.all([api('/me').catch(e=>{ $('connection').textContent=e.message;return {}; }),api(`/themes/${manifest.short}/config`).catch(()=>({}))]).then(([me,saved])=>{
 site=me||{};settings=resolveConfig(manifest.config,saved);siteName=site.site_name||'Monitor';document.title=siteName;
 $('demo').hidden=!site.demo;setLang(detect(settings.language),false);applyPalette(currentPalette());setupPaletteSelect();calcWidth();setBanner(siteBanner(),!reduceMotion()&&settings.intro!=='off',settings.intro==='random'?undefined:settings.intro);render();armIdle();
});
stream.resume();
