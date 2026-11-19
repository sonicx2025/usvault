/* 超声影像库 - 前端 (原生 JS, 无构建步骤) */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const DEFAULT_PARTS = ['甲状腺', '乳腺', '肝脏', '胆囊', '胰腺', '脾脏', '肾脏', '膀胱', '前列腺',
  '子宫附件', '产科', '心脏', '颈部血管', '下肢血管', '浅表淋巴结', '腮腺', '颌下腺', '肌骨', '阴囊', '其他'];
let META = { body_parts: [], tags: [], stats: {} };
let DEFAULT_PW = false;
const EMPTY_LIST = { q: '', date_from: '', date_to: '', body_part: '', hospital: '', biopsy_pathology: '', surgery_pathology: '', tag: '', kind: '', followup: '', page: 1, cf: {} };
let listState = { ...EMPTY_LIST, cf: {} };
let filtersOpen = false;

// ------------------------------------------------------------ 图标 & 主题
const ICONS = {
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
  play: '<polygon points="6 4 20 12 6 20 6 4" fill="currentColor" stroke="none"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>',
  trash: '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  columns: '<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/>',
  list: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><circle cx="4" cy="6" r="1" fill="currentColor"/><circle cx="4" cy="12" r="1" fill="currentColor"/><circle cx="4" cy="18" r="1" fill="currentColor"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  x: '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  up: '<polyline points="18 15 12 9 6 15"/>',
  down: '<polyline points="6 9 12 15 18 9"/>',
};
const ico = (name, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24">${ICONS[name] || ''}</svg>`;

function syncThemeBtn() {
  const btn = $('#themeBtn');
  const cur = document.documentElement.dataset.theme || 'dark';
  if (btn) {
    btn.innerHTML = ico(cur === 'dark' ? 'sun' : 'moon');
    btn.title = cur === 'dark' ? '切换浅色模式' : '切换深色模式';
  }
  const m = $('#metaTheme');
  if (m) m.content = cur === 'light' ? '#f5f5f7' : '#09090b';
}
if ($('#themeBtn')) {
  syncThemeBtn();
  $('#themeBtn').onclick = () => {
    const next = (document.documentElement.dataset.theme || 'dark') === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    localStorage.setItem('usv_theme', next);
    syncThemeBtn();
  };
}

// ------------------------------------------------------------ 工具
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtSize = (b) => b > 1 << 30 ? (b / (1 << 30)).toFixed(2) + ' GB' : b > 1 << 20 ? (b / (1 << 20)).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
const fmtDur = (s) => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '';

function daysUntil(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y1, m1, d1] = iso.split('-').map(Number);
  const [y0, m0, d0] = today().split('-').map(Number);
  return Math.round((Date.UTC(y1, m1 - 1, d1) - Date.UTC(y0, m0 - 1, d0)) / 86400000);
}

function addMonths(iso, months) {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(iso || '') ? iso : today();
  const [y, m, d] = base.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12), nm = (total % 12) + 1;
  const lastDay = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, lastDay)).padStart(2, '0')}`;
}

function fuInfo(r) {
  const st = r.followup_status || '';
  const lead = META.followup?.lead_days ?? 7;
  if (st === 'pending' && r.followup_date) {
    const days = r.days_left !== undefined && r.days_left !== null ? r.days_left : daysUntil(r.followup_date);
    if (days < 0) return { text: `逾期 ${-days} 天`, cls: 'fu-over', bucket: 'over', days };
    if (days === 0) return { text: '今天随访', cls: 'fu-due', bucket: 'due', days };
    if (days <= lead) return { text: `${days} 天后随访`, cls: 'fu-due', bucket: 'due', days };
    return { text: `随访 ${r.followup_date}`, cls: 'fu-plan', bucket: 'plan', days };
  }
  if (st === 'done') return { text: '已随访', cls: 'fu-done', bucket: 'done', days: null };
  if (st === 'cancelled') return { text: '已取消随访', cls: 'fu-muted', bucket: 'cancelled', days: null };
  return null;
}

function bindQuickDates(container, input, baseFn) {
  container.querySelectorAll('button[data-m]').forEach((b) => {
    b.onclick = () => {
      const m = Number(b.dataset.m);
      input.value = m === 0 ? '' : addMonths(baseFn ? baseFn() : today(), m);
    };
  });
}

function quickDatesHtml(showClear = true) {
  return `<div class="quick-dates">
    <button type="button" class="btn sm ghost" data-m="1">+1个月</button>
    <button type="button" class="btn sm ghost" data-m="3">+3个月</button>
    <button type="button" class="btn sm ghost" data-m="6">+6个月</button>
    <button type="button" class="btn sm ghost" data-m="12">+1年</button>
    ${showClear ? '<button type="button" class="btn sm ghost" data-m="0">清除</button>' : ''}
  </div>`;
}

function toast(msg, ms = 2200) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => (t.hidden = true), ms);
}

async function api(path, opts = {}) {
  const o = { credentials: 'same-origin', ...opts };
  if (o.json !== undefined) {
    o.body = JSON.stringify(o.json); o.headers = { 'Content-Type': 'application/json' }; delete o.json;
  }
  const r = await fetch(path, o);
  if (r.status === 401 && path !== '/api/login') { showLogin(); throw new Error('未登录'); }
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || `请求失败 (${r.status})`);
  return data;
}

// 带进度的上传
function upload(url, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open('POST', url);
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      let d = {}; try { d = JSON.parse(x.responseText); } catch (e) { }
      if (x.status === 401) { showLogin(); return reject(new Error('未登录')); }
      x.status < 300 ? resolve(d) : reject(new Error(d.detail || `上传失败 (${x.status})`));
    };
    x.onerror = () => reject(new Error('网络错误，上传失败'));
    x.send(formData);
  });
}

async function loadMeta() {
  META = await api('/api/meta');
  const parts = [...new Set([...META.body_parts.map((p) => p.name), ...DEFAULT_PARTS])];
  $('#dlParts').innerHTML = parts.map((p) => `<option value="${esc(p)}">`).join('');
  $('#dlTags').innerHTML = META.tags.map((t) => `<option value="${esc(t.name)}">`).join('');
  const b = $('#fuBadge');
  const fu = META.followup || {};
  if (b) {
    if (fu.alert_count > 0) {
      b.textContent = fu.alert_count > 99 ? '99+' : String(fu.alert_count);
      b.classList.toggle('soon', !fu.overdue);
      b.hidden = false;
    } else {
      b.hidden = true;
    }
  }
}

// ------------------------------------------------------------ 登录
function showLogin() {
  $('#topbar').hidden = true;
  app.innerHTML = `
    <div class="login-wrap">
      <form class="login" id="loginForm">
        <div class="login-logo"><img src="/icons/icon-192.png" alt=""></div>
        <h1>超声影像库</h1>
        <p class="login-sub">个人超声影像与随访管理</p>
        <input type="password" id="pw" placeholder="请输入访问密码" autocomplete="current-password" autofocus>
        <button class="btn primary">登录</button>
        <div class="err" id="loginErr"></div>
      </form>
    </div>`;
  $('#loginForm').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await api('/api/login', { method: 'POST', json: { password: $('#pw').value } });
      boot();
    } catch (err) { $('#loginErr').textContent = err.message; }
  };
}

$('#logoutBtn').onclick = async () => { await api('/api/logout', { method: 'POST' }); showLogin(); };

// ------------------------------------------------------------ 路由
async function route() {
  const h = location.hash.slice(1) || '/';
  closeLightbox();
  window.scrollTo(0, 0);
  document.querySelectorAll('.top-actions a[data-nav]').forEach((a) => {
    a.classList.toggle('active', h === a.dataset.nav);
  });
  try {
    let m;
    if (h === '/' || h.startsWith('/?')) return await viewList();
    if (h === '/followups') return await viewFollowups();
    if (h === '/new' || h.startsWith('/new?')) {
      const qs = new URLSearchParams(h.split('?')[1] || '');
      return await viewForm(null, qs.get('from') ? +qs.get('from') : null);
    }
    if (h === '/settings') return await viewSettings();
    if ((m = h.match(/^\/r\/(\d+)\/edit$/))) return await viewForm(await api(`/api/records/${m[1]}`), null);
    if ((m = h.match(/^\/r\/(\d+)$/))) return await viewDetail(+m[1]);
    location.hash = '#/';
  } catch (err) {
    if (err.message !== '未登录') app.innerHTML = `<div class="empty-state">${esc(err.message)}</div>`;
  }
}
window.addEventListener('hashchange', route);

// ------------------------------------------------------------ 字段配置工具
const BF = (k) => (META.fields?.builtin || []).find((b) => b.key === k) || { key: k, label: k, hidden: false };
const bl = (k) => esc(BF(k).label);
const bh = (k) => BF(k).hidden;
const CF = () => META.fields?.custom || [];
const TYPE_NAMES = { text: '单行文本', textarea: '多行文本', number: '数字', date: '日期', select: '单选下拉', multiselect: '多选', checkbox: '是/否' };
function fmtVal(f, v) {
  if (v === undefined || v === null || v === '' || (Array.isArray(v) && !v.length)) return '';
  if (f.type === 'checkbox') return v ? '是' : '';
  if (Array.isArray(v)) return v.join('、');
  return f.unit ? `${v} ${f.unit}` : String(v);
}

// 自定义字段的表单控件
function cfInput(f, v) {
  const n = `cf_${f.key}`;
  const opts = [...f.options];
  if (f.type === 'select' && v && !opts.includes(v)) opts.push(v);
  if (f.type === 'multiselect') (v || []).forEach((x) => !opts.includes(x) && opts.push(x));
  const wrapPath = (html) => f.pathology_assist
    ? `<div class="ac-wrap" data-path-ac="1" data-biopsy="${/穿刺|fna|cnb|细胞/i.test(f.label) ? '1' : '0'}">${html}<div class="ac-hint"></div></div>`
    : html;
  switch (f.type) {
    case 'textarea': return wrapPath(`<textarea name="${n}" autocomplete="off"${f.pathology_assist ? ' placeholder="输入中文或拼音首字母（如 xw、ptc）联想 WHO 病理类型，也可自由输入"' : ''}>${esc(v || '')}</textarea>`);
    case 'number': return `<div class="unit-wrap"><input type="number" step="any" name="${n}" value="${esc(v ?? '')}">${f.unit ? `<span>${esc(f.unit)}</span>` : ''}</div>`;
    case 'date': return `<input type="date" name="${n}" value="${esc(v || '')}">`;
    case 'select': return `<select name="${n}"><option value="">—</option>${opts.map((o) =>
      `<option ${o === v ? 'selected' : ''} value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
    case 'multiselect': return `<div class="checks">${opts.map((o) =>
      `<label class="check"><input type="checkbox" name="${n}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('') || '<span class="muted">（未设置选项）</span>'}</div>`;
    case 'checkbox': return `<label class="check"><input type="checkbox" name="${n}" value="1" ${v ? 'checked' : ''}>是</label>`;
    default: return wrapPath(`<input name="${n}" value="${esc(v || '')}" autocomplete="off"${f.pathology_assist ? ' placeholder="输入中文或拼音首字母（如 xw）联想 WHO 病理类型"' : ''}>`);
  }
}

// ------------------------------------------------------------ WHO 病理输入联想组件
const AC_CAT_CLS = { '良性': 'benign', '恶性': 'malig', '交界': 'border', '炎性': 'inflam', '穿刺': 'biopsy' };

function bindPathologyACs(container, getBodyPart, opts = {}) {
  const engine = window.USV_PATHOLOGY;
  if (!engine) return { refreshHints() {} };
  const wraps = [...container.querySelectorAll('.ac-wrap[data-path-ac]')];
  const controllers = wraps.map((wrap) => {
    const el = wrap.querySelector('input, textarea');
    const hint = wrap.querySelector('.ac-hint');
    const isBiopsy = wrap.dataset.biopsy === '1';
    const menu = document.createElement('div');
    menu.className = 'ac-menu';
    menu.hidden = true;
    wrap.appendChild(menu);

    let items = [], idx = -1, curOrgan = '', picking = false;

    const updateHint = () => {
      if (!hint) return;
      const org = engine.matchOrgan(getBodyPart());
      hint.textContent = org
        ? `已匹配「${org}」WHO 病理词库 · 支持中文 / 拼音首字母 / 缩写（逗号或回车后可继续联想）`
        : '选择「检查部位」后自动匹配该器官 WHO 病理词库 · 支持中文 / 拼音首字母检索';
    };

    const tokenRange = () => {
      const pos = el.selectionStart ?? el.value.length;
      const before = el.value.slice(0, pos);
      const m = before.match(/[,，;；\n、](?!.*[,，;；\n、])/);
      const start = m ? m.index + 1 : 0;
      return { start, end: pos, token: el.value.slice(start, pos).trim() };
    };

    const close = () => { menu.hidden = true; idx = -1; };

    const pick = (i) => {
      const it = items[i];
      if (!it) return;
      const { start, end } = tokenRange();
      const leadSpace = el.value.slice(start, end).match(/^\s*/)[0];
      const inserted = leadSpace + it.name;
      const nextVal = el.value.slice(0, start) + inserted + el.value.slice(end);
      el.value = nextVal;
      const caret = start + inserted.length;
      picking = true;
      el.focus();
      el.setSelectionRange(caret, caret);
      close();
      el.dispatchEvent(new Event('input', { bubbles: true }));
      picking = false;
    };

    const highlight = () => {
      menu.querySelectorAll('.ac-item').forEach((n, i) => {
        const on = i === idx;
        n.classList.toggle('on', on);
        if (on) n.scrollIntoView({ block: 'nearest' });
      });
    };

    const render = () => {
      const { token } = tokenRange();
      const res = engine.search(token, getBodyPart(), {
        isBiopsy,
        history: META.pathology_history || [],
      });
      items = res.items;
      curOrgan = res.organ;
      if (!items.length) return close();
      idx = token ? 0 : -1;
      const head = curOrgan
        ? `「${esc(curOrgan)}」WHO 病理提示${token ? '' : '（点击或输入拼音首字母筛选）'}`
        : '全部器官 WHO 病理提示（先选检查部位可自动限定器官）';
      menu.innerHTML = `<div class="ac-head">${head}</div>` + items.map((it, i) => `
        <div class="ac-item ${i === idx ? 'on' : ''}" data-i="${i}">
          <span>${esc(it.name)}</span>
          <span class="ac-tags">
            ${it.organ && it.organ !== curOrgan ? `<span class="ac-cat">${esc(it.organ)}</span>` : ''}
            ${it.cat ? `<span class="ac-cat ${AC_CAT_CLS[it.cat] || ''}">${esc(it.cat)}</span>` : ''}
          </span>
        </div>`).join('');
      menu.hidden = false;
    };

    menu.addEventListener('mousedown', (e) => {
      const row = e.target.closest('.ac-item');
      if (!row) return;
      e.preventDefault();
      pick(+row.dataset.i);
    });

    el.addEventListener('focus', () => {
      if (picking) return;
      updateHint();
      if (!opts.onlyOnInput || el.value.trim() || getBodyPart()) render();
    });
    el.addEventListener('input', () => { if (!picking) render(); });
    el.addEventListener('blur', () => setTimeout(close, 150));
    el.addEventListener('keydown', (e) => {
      if (menu.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % items.length; highlight(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; highlight(); }
      else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(idx); }
      else if (e.key === 'Escape') { e.preventDefault(); close(); }
    });

    updateHint();
    return {
      refresh() {
        updateHint();
        if (document.activeElement === el) render();
      },
    };
  });
  return { refreshHints: () => controllers.forEach((c) => c.refresh()) };
}

// 通用历史记录输入联想（用于医院等输入过的词下次自动提示）
function bindHistoryAC(wrap, getList) {
  if (!wrap) return;
  const el = wrap.querySelector('input');
  const menu = document.createElement('div');
  menu.className = 'ac-menu';
  menu.hidden = true;
  wrap.appendChild(menu);
  let items = [], idx = -1, picking = false;
  const close = () => { menu.hidden = true; idx = -1; };
  const pick = (i) => {
    const it = items[i]; if (!it) return;
    picking = true;
    el.value = it.name;
    close();
    el.focus();
    el.dispatchEvent(new Event('input', { bubbles: true }));
    picking = false;
  };
  const highlight = () => {
    menu.querySelectorAll('.ac-item').forEach((n, i) => {
      const on = i === idx; n.classList.toggle('on', on);
      if (on) n.scrollIntoView({ block: 'nearest' });
    });
  };
  const render = () => {
    const q = el.value.trim().toLowerCase();
    const all = getList() || [];
    items = (q ? all.filter((x) => x.name.toLowerCase().includes(q)) : all).slice(0, 15);
    if (!items.length) return close();
    idx = q ? 0 : -1;
    menu.innerHTML = `<div class="ac-head">曾输入过的医院（点击或回车填入）</div>` + items.map((it, i) => `
      <div class="ac-item ${i === idx ? 'on' : ''}" data-i="${i}">
        <span>${esc(it.name)}</span>
        <span class="ac-tags"><span class="ac-cat">${it.n}次</span></span>
      </div>`).join('');
    menu.hidden = false;
  };
  menu.addEventListener('mousedown', (e) => {
    const row = e.target.closest('.ac-item'); if (!row) return;
    e.preventDefault(); pick(+row.dataset.i);
  });
  el.addEventListener('focus', () => { if (!picking) render(); });
  el.addEventListener('input', () => { if (!picking) render(); });
  el.addEventListener('blur', () => setTimeout(close, 150));
  el.addEventListener('keydown', (e) => {
    if (menu.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); idx = (idx + 1) % items.length; highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); idx = (idx - 1 + items.length) % items.length; highlight(); }
    else if (e.key === 'Enter' && idx >= 0) { e.preventDefault(); pick(idx); }
    else if (e.key === 'Escape') { e.preventDefault(); close(); }
  });
}
function collectExtra(fd) {
  const extra = {};
  for (const f of CF()) {
    const n = `cf_${f.key}`;
    if (f.type === 'multiselect') extra[f.key] = fd.getAll(n);
    else if (f.type === 'checkbox') extra[f.key] = fd.has(n);
    else extra[f.key] = (fd.get(n) || '').trim();
  }
  return extra;
}

// 自定义字段的筛选控件
function cfFilter(f, cf) {
  const id = `cf${f.id}`, lab = `<label>${esc(f.label)}${f.unit ? `（${esc(f.unit)}）` : ''}</label>`;
  const val = (k) => esc(cf[k] || '');
  switch (f.type) {
    case 'select': case 'multiselect':
      return `<div>${lab}<select name="${id}"><option value="">全部</option>${f.options.map((o) =>
        `<option ${cf[id] === o ? 'selected' : ''} value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>`;
    case 'checkbox':
      return `<div>${lab}<select name="${id}"><option value="">全部</option>
        <option value="1" ${cf[id] === '1' ? 'selected' : ''}>是</option><option value="0" ${cf[id] === '0' ? 'selected' : ''}>否</option></select></div>`;
    case 'number': case 'date': {
      const t = f.type === 'number' ? 'number" step="any' : 'date';
      return `<div>${lab}<div class="range"><input type="${t}" name="${id}_min" value="${val(id + '_min')}" placeholder="最小">
        <span>~</span><input type="${t}" name="${id}_max" value="${val(id + '_max')}" placeholder="最大"></div></div>`;
    }
    default:
      return f.pathology_assist
        ? `<div>${lab}<div class="ac-wrap" data-path-ac="1" data-biopsy="${/穿刺|fna|cnb|细胞/i.test(f.label) ? '1' : '0'}"><input name="${id}" value="${val(id)}" placeholder="中文或拼音首字母…" autocomplete="off" data-debounce></div></div>`
        : `<div>${lab}<input name="${id}" value="${val(id)}" placeholder="包含…" data-debounce></div>`;
  }
}

// ------------------------------------------------------------ 列表 / 检索
function activeFilterCount(s) {
  let n = 0;
  for (const k of ['date_from', 'date_to', 'body_part', 'hospital', 'biopsy_pathology', 'surgery_pathology', 'kind', 'followup']) if (s[k]) n++;
  n += Object.keys(s.cf).length;
  return n;
}

async function viewList() {
  const s = listState;
  const kindOpts = [['', '全部类型'], ['image', '含图片'], ['video', '含视频']];
  const fuOpts = [['', '全部随访'], ['pending', '待随访'], ['due', '近期到期/逾期'], ['overdue', '仅已逾期']];
  const cfs = CF().filter((f) => f.filterable);
  const fu = META.followup || {};
  const fuParts = [];
  if (fu.overdue) fuParts.push(`<strong>${fu.overdue}</strong> 条已逾期`);
  if (fu.due_soon) fuParts.push(`<strong>${fu.due_soon}</strong> 条 ${fu.lead_days ? `${fu.lead_days} 天内` : '今天'}到期`);
  const fCount = activeFilterCount(s);
  const showDrawer = filtersOpen || fCount > 0;
  app.innerHTML = `
    ${DEFAULT_PW ? '<div class="warn">当前使用默认密码 admin，请在部署配置中修改 APP_PASSWORD。</div>' : ''}
    ${fu.alert_count > 0 ? `<div class="fu-banner ${fu.overdue ? 'over' : ''}">
      <span class="fu-banner-l">${ico('bell')}<span>随访提醒：${fuParts.join('，')}</span></span>
      <a class="btn sm" href="#/followups">去随访中心 →</a>
    </div>` : ''}
    <form class="search" id="searchForm">
      <div class="search-main">
        <div class="search-box">
          ${ico('search')}
          <input type="search" name="q" placeholder="搜索病例标题、患者、诊断、病理、医院、标签、文件名…" value="${esc(s.q)}">
        </div>
        <button type="button" class="btn filter-btn ${showDrawer || fCount ? 'active' : ''}" id="filterToggle">
          ${ico('sliders')}
          <span>筛选</span>
          <span class="filter-dot" id="filterDot" ${fCount ? '' : 'hidden'}>${fCount || ''}</span>
        </button>
        <button class="btn primary" style="height:40px">搜索</button>
      </div>
      <div class="filters-drawer" id="filtersDrawer" ${showDrawer ? '' : 'hidden'}>
        <div class="filters">
          <div><label>开始日期</label><input type="date" name="date_from" value="${esc(s.date_from)}"></div>
          <div><label>结束日期</label><input type="date" name="date_to" value="${esc(s.date_to)}"></div>
          ${bh('body_part') ? '' : `<div><label>${bl('body_part')}</label><select name="body_part"><option value="">全部</option>
            ${META.body_parts.map((p) => `<option ${p.name === s.body_part ? 'selected' : ''} value="${esc(p.name)}">${esc(p.name)} (${p.n})</option>`).join('')}
          </select></div>`}
          ${!bh('hospital') && META.hospitals?.length ? `<div><label>${bl('hospital')}</label><select name="hospital"><option value="">全部</option>
            ${META.hospitals.map((h) => `<option ${h.name === s.hospital ? 'selected' : ''} value="${esc(h.name)}">${esc(h.name)} (${h.n})</option>`).join('')}
          </select></div>` : ''}
          <div><label>类型</label><select name="kind">
            ${kindOpts.map(([v, t]) => `<option value="${v}" ${v === s.kind ? 'selected' : ''}>${t}</option>`).join('')}
          </select></div>
          <div><label>随访</label><select name="followup">
            ${fuOpts.map(([v, t]) => `<option value="${v}" ${v === s.followup ? 'selected' : ''}>${t}</option>`).join('')}
          </select></div>
          ${bh('biopsy_pathology') ? '' : `<div><label>${bl('biopsy_pathology')}</label><div class="ac-wrap" data-path-ac="1" data-biopsy="1"><input name="biopsy_pathology" value="${esc(s.biopsy_pathology)}" placeholder="中文或拼音首字母…" autocomplete="off" data-debounce></div></div>`}
          ${bh('surgery_pathology') ? '' : `<div><label>${bl('surgery_pathology')}</label><div class="ac-wrap" data-path-ac="1" data-biopsy="0"><input name="surgery_pathology" value="${esc(s.surgery_pathology)}" placeholder="中文或拼音首字母…" autocomplete="off" data-debounce></div></div>`}
          ${cfs.map((f) => cfFilter(f, s.cf)).join('')}
        </div>
        <div style="margin-top:10px" id="resetWrap" hidden><button type="button" class="btn sm ghost" id="resetBtn">${ico('x', 'sm')} 清除筛选条件</button></div>
      </div>
      ${!bh('tags') && META.tags.length ? `<div class="chips">${META.tags.slice(0, 30).map((t) =>
        `<span class="chip ${t.name === s.tag ? 'on' : ''}" data-tag="${esc(t.name)}">#${esc(t.name)} ${t.n}</span>`).join('')}</div>` : ''}
    </form>
    <div class="hero-bar">
      <div class="stat-pills">
        <span class="stat-pill"><strong>${META.stats.records || 0}</strong> 条记录</span>
        <span class="stat-pill">${ico('image', 'sm')} <strong>${META.stats.images || 0}</strong> 图</span>
        <span class="stat-pill">${ico('play', 'sm')} <strong>${META.stats.videos || 0}</strong> 视频</span>
        <span class="stat-pill">${fmtSize(META.stats.bytes || 0)}</span>
      </div>
      <span class="muted num" style="font-size:13px" id="resultInfo">加载中…</span>
    </div>
    <div class="grid" id="grid"></div>
    <div class="more"><button class="btn" id="moreBtn" hidden>加载更多</button></div>`;

  const form = $('#searchForm');
  const drawer = $('#filtersDrawer');
  const fBtn = $('#filterToggle');
  fBtn.onclick = () => {
    filtersOpen = drawer.hidden;
    drawer.hidden = !filtersOpen;
    fBtn.classList.toggle('active', filtersOpen || activeFilterCount(s) > 0);
  };
  const apply = () => {
    const fd = new FormData(form);
    for (const k of ['q', 'date_from', 'date_to', 'body_part', 'hospital', 'biopsy_pathology', 'surgery_pathology', 'kind', 'followup']) s[k] = (fd.get(k) || '').trim();
    s.cf = {};
    for (const [k, v] of fd.entries()) if (/^cf\d+/.test(k) && String(v).trim()) s.cf[k] = String(v).trim();
    const n = activeFilterCount(s);
    const dot = $('#filterDot');
    if (dot) { dot.textContent = n || ''; dot.hidden = !n; }
    fBtn.classList.toggle('active', !drawer.hidden || n > 0);
    s.page = 1; loadPage(true);
  };
  form.onsubmit = (e) => { e.preventDefault(); apply(); };
  let deb;
  form.querySelectorAll('input[name=q], input[data-debounce], input[type=number]').forEach((el) =>
    (el.oninput = () => { clearTimeout(deb); deb = setTimeout(apply, 400); }));
  form.querySelectorAll('select, input[type=date]').forEach((el) => (el.onchange = apply));
  form.querySelectorAll('.chip').forEach((c) => (c.onclick = () => {
    s.tag = s.tag === c.dataset.tag ? '' : c.dataset.tag;
    form.querySelectorAll('.chip').forEach((x) => x.classList.toggle('on', x.dataset.tag === s.tag));
    s.page = 1; loadPage(true);
  }));
  $('#resetBtn').onclick = () => { listState = { ...EMPTY_LIST, q: s.q, cf: {} }; viewList(); };
  const acList = bindPathologyACs(form, () => form.body_part?.value || '', { onlyOnInput: true });
  if (form.body_part) form.body_part.addEventListener('change', () => acList.refreshHints());
  $('#moreBtn').onclick = () => { s.page++; loadPage(false); };
  await loadPage(true);
}

async function loadPage(reset) {
  const s = listState;
  const { cf, ...base } = s;
  const qs = new URLSearchParams(Object.entries({ ...base, ...cf }).filter(([, v]) => v !== ''));
  let d;
  try { d = await api('/api/records?' + qs); } catch (err) { toast(err.message, 4000); return; }
  const grid = $('#grid');
  if (!grid) return;
  if (reset) grid.innerHTML = '';
  grid.insertAdjacentHTML('beforeend', d.items.map(cardHtml).join(''));
  if (!d.total) grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      ${META.stats.records ? '没有找到匹配的记录' : '还没有记录，点击右上角「新建记录」开始吧'}</div>`;
  $('#resultInfo').textContent = `找到 ${d.total} 条`;
  const rw = $('#resetWrap');
  if (rw) rw.hidden = !(s.date_from || s.date_to || s.body_part || s.hospital || s.biopsy_pathology || s.surgery_pathology || s.tag || s.kind || s.followup || Object.keys(s.cf).length);
  $('#moreBtn').hidden = d.page * d.page_size >= d.total;
}

function cardHtml(r) {
  const vis = (k) => (bh(k) ? '' : r[k]);
  const title = vis('title') || vis('diagnosis') || vis('body_part') || '未命名记录';
  const sub = [r.exam_date, vis('body_part'), vis('patient_name'), vis('hospital')].filter(Boolean).join(' · ');
  const pathLine = [!bh('surgery_pathology') && r.surgery_pathology && `${BF('surgery_pathology').label}：${r.surgery_pathology}`,
    !bh('biopsy_pathology') && !r.surgery_pathology && r.biopsy_pathology && `${BF('biopsy_pathology').label}：${r.biopsy_pathology}`].filter(Boolean).join('');
  const extraParts = [pathLine && esc(pathLine), ...CF().filter((f) => f.show_in_card).map((f) => {
    const v = fmtVal(f, r.extra[f.key]);
    return v ? `${esc(f.label)}：${esc(v)}` : '';
  })].filter(Boolean);
  const extra = extraParts.join(' · ');
  const fu = r.followup_status === 'pending' ? fuInfo(r) : null;
  return `<a class="card" href="#/r/${r.id}">
    <div class="cover ${r.cover ? '' : 'empty'}">
      ${r.cover ? `<div class="cover-img" style="background-image:url('${r.cover}')"></div>` : `${ico('image', 'lg')}<span>无预览</span>`}
      ${r.series_count > 1 ? `<span class="card-tl">${ico('clock', 'sm')} ${r.series_count}次</span>` : ''}
      <div class="badges">${r.n_image ? `<span class="badge">${ico('image', 'sm')} ${r.n_image}</span>` : ''}${r.n_video ? `<span class="badge">${ico('play', 'sm')} ${r.n_video}</span>` : ''}</div>
    </div>
    <div class="body"><div class="t">${esc(title)}</div><div class="sub">${esc(sub)}</div>
      ${extra ? `<div class="sub-extra">${extra}</div>` : ''}
      ${fu ? `<div style="margin-top:4px"><span class="fu-pill ${fu.cls}">${ico('calendar', 'sm')} ${esc(fu.text)}</span></div>` : ''}
      ${!bh('tags') && r.tags.length ? `<div class="tagrow">${r.tags.slice(0, 4).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    </div></a>`;
}

// ------------------------------------------------------------ 新建 / 编辑
async function viewForm(rec, fromId = null) {
  const isEdit = !!rec;
  let src = null;
  if (!isEdit && fromId) src = await api(`/api/records/${fromId}`);
  const r = rec || (src ? {
    exam_date: today(),
    body_part: src.body_part,
    hospital: src.hospital,
    title: src.title,
    patient_name: src.patient_name,
    patient_id: src.patient_id,
    sex: src.sex,
    age: src.age,
    tags: src.tags || [],
    extra: {},
  } : { exam_date: today(), tags: [], extra: {} });
  const v = (k) => esc(r[k] || '');
  const fld = (k, html, cls = '') => (bh(k) ? '' : `<div class="${cls}"><label>${bl(k)}</label>${html}</div>`);
  const partOpts = [...new Set([...DEFAULT_PARTS, ...(META.body_parts || []).map((p) => p.name), ...(r.body_part ? [r.body_part] : [])])];
  const cfs = CF();
  const srcExtra = src ? CF().map((f) => {
    const val = fmtVal(f, src.extra[f.key]);
    return val ? `${f.label}：${val}` : '';
  }).filter(Boolean).join(' · ') : '';
  app.innerHTML = `
    <div class="page-head"><h2>${isEdit ? '编辑记录' : (src ? '录入复查记录' : '新建记录')}</h2></div>
    ${src ? `<div class="ref-box">
      <div><strong>${ico('clock', 'sm')} 关联前次检查：</strong>${esc(src.exam_date)} · ${esc(src.title || src.body_part || '未命名记录')} ${src.patient_name ? `(${esc(src.patient_name)})` : ''}</div>
      ${src.diagnosis || src.biopsy_pathology || src.surgery_pathology || srcExtra ? `<div class="ref-sub">${esc([src.diagnosis && '上次诊断：' + src.diagnosis, src.biopsy_pathology && '穿刺病理：' + src.biopsy_pathology, src.surgery_pathology && '手术病理：' + src.surgery_pathology, srcExtra].filter(Boolean).join('\n'))}</div>` : ''}
      ${src.followup_note ? `<div class="ref-sub">随访重点：${esc(src.followup_note)}</div>` : ''}
      <div class="ref-sub">保存后将自动加入同一随访时间线，并把前次待随访计划标记为「已完成」。</div>
    </div>` : ''}
    <form id="recForm">
      <div class="panel form-grid">
        <div><label>检查日期 *</label><input type="date" name="exam_date" value="${v('exam_date')}" required></div>
        ${fld('body_part', `<select name="body_part_sel"><option value="">— 请选择 —</option>${partOpts.map((p) =>
          `<option ${p === r.body_part ? 'selected' : ''} value="${esc(p)}">${esc(p)}</option>`).join('')}<option value="__custom__">＋ 自定义部位…</option></select>
          <input name="body_part_custom" placeholder="输入自定义部位" hidden style="margin-top:6px">`)}
        ${fld('hospital', `<div class="ac-wrap" id="hospWrap"><input name="hospital" value="${v('hospital')}" autocomplete="off" placeholder="输入或选择医院"></div>`)}
        ${fld('title', `<input name="title" value="${v('title')}" placeholder="简要描述，如：甲状腺右叶低回声结节">`, 'full')}
        ${fld('patient_name', `<input name="patient_name" value="${v('patient_name')}">`)}
        ${fld('patient_id', `<input name="patient_id" value="${v('patient_id')}">`)}
        ${fld('sex', `<select name="sex">${['', '男', '女'].map((x) => `<option ${x === r.sex ? 'selected' : ''} value="${x}">${x || '—'}</option>`).join('')}</select>`)}
        ${fld('age', `<input name="age" value="${v('age')}" placeholder="如：45">`)}
        ${fld('diagnosis', `<textarea name="diagnosis" placeholder="如：TI-RADS 4a 类">${v('diagnosis')}</textarea>`, 'full')}
        ${fld('biopsy_pathology', `<div class="ac-wrap" data-path-ac="1" data-biopsy="1"><textarea name="biopsy_pathology" autocomplete="off" placeholder="输入中文或拼音首字母（如 b5、xw、ptc）联想 WHO 病理类型">${v('biopsy_pathology')}</textarea><div class="ac-hint"></div></div>`, 'full')}
        ${fld('surgery_pathology', `<div class="ac-wrap" data-path-ac="1" data-biopsy="0"><textarea name="surgery_pathology" autocomplete="off" placeholder="输入中文或拼音首字母（如 xw、rt、idc）联想 WHO 病理类型">${v('surgery_pathology')}</textarea><div class="ac-hint"></div></div>`, 'full')}
        ${fld('tags', `<input name="tags" list="dlTags" value="${esc((r.tags || []).join(', '))}" placeholder="逗号或空格分隔，如：典型病例, 教学, 造影">`, 'full')}
        ${fld('notes', `<textarea name="notes">${v('notes')}</textarea>`, 'full')}
      </div>
      ${cfs.length ? `<div class="panel form-grid">
        ${cfs.map((f) => `<div class="${['textarea', 'multiselect'].includes(f.type) ? 'full' : ''}">
          <label>${esc(f.label)}</label>${cfInput(f, r.extra[f.key])}</div>`).join('')}
      </div>` : `<div class="muted" style="margin:-4px 2px 14px;font-size:13px">需要更多字段？到 <a href="#/settings">⚙ 设置</a> 添加自定义字段。</div>`}
      <div class="panel" id="fuPanel">
        <h3 class="sec-title">${ico('calendar')} 随访计划（可选）</h3>
        <div class="form-grid">
          <div><label>下次随访日期</label><input type="date" name="followup_date" value="${v('followup_date')}">${quickDatesHtml(true)}</div>
          <div><label>随访重点 / 备注</label><input name="followup_note" value="${v('followup_note')}" placeholder="如：复查右叶结节大小、边界及血流"></div>
        </div>
      </div>
      ${isEdit ? '' : `<div class="panel">${dropzoneHtml()}</div>`}
      <div class="actions">
        <a class="btn ghost" href="${isEdit ? `#/r/${r.id}` : (src ? `#/r/${src.id}` : '#/')}">取消</a>
        <button class="btn primary" id="saveBtn">${isEdit ? '保存修改' : '保存记录'}</button>
      </div>
    </form>`;

  const form = $('#recForm');
  const getBodyPart = () => {
    if (!form.body_part_sel) return '';
    return form.body_part_sel.value === '__custom__' ? (form.body_part_custom?.value || '') : form.body_part_sel.value;
  };
  bindQuickDates($('#fuPanel'), form.followup_date, () => form.exam_date.value || today());
  bindHistoryAC($('#hospWrap'), () => META.hospitals || []);
  const acForm = bindPathologyACs(form, getBodyPart);
  if (form.body_part_sel) {
    form.body_part_sel.onchange = () => {
      const isCust = form.body_part_sel.value === '__custom__';
      form.body_part_custom.hidden = !isCust;
      if (isCust) form.body_part_custom.focus();
      acForm.refreshHints();
    };
    form.body_part_custom.oninput = () => acForm.refreshHints();
  }
  const picked = isEdit ? null : bindDropzone();
  form.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const meta = {};
    for (const [k, val] of fd.entries()) if (!k.startsWith('cf_') && k !== 'body_part_sel' && k !== 'body_part_custom') meta[k] = val;
    if (form.body_part_sel) meta.body_part = getBodyPart().trim();
    meta.extra = collectExtra(fd);
    if (src) meta.from_record_id = src.id;
    const btn = $('#saveBtn'); btn.disabled = true;
    try {
      let res;
      if (isEdit) {
        res = await api(`/api/records/${r.id}`, { method: 'PUT', json: meta });
      } else {
        const up = new FormData();
        up.append('meta', JSON.stringify(meta));
        picked.files.forEach((f) => up.append('files', f));
        btn.textContent = '上传中…';
        res = await upload('/api/records', up, picked.progress);
      }
      toast('已保存');
      await loadMeta();
      location.hash = `#/r/${res.id}`;
    } catch (err) {
      toast(err.message, 4000); btn.disabled = false; btn.textContent = isEdit ? '保存修改' : '保存记录';
    }
  };
}

function dropzoneHtml() {
  return `<div class="drop" id="drop">
      <div class="drop-icon">${ico('upload')}</div>
      <div><strong>拖拽图片 / 视频到这里</strong>，或点击选择文件</div>
      <div style="font-size:12px">支持 JPG、PNG、MP4、MOV，可多选</div>
      <input type="file" id="fileInput" multiple accept="image/*,video/*,.jpg,.jpeg,.png,.mp4,.mov" hidden>
    </div>
    <div class="previews" id="previews"></div>
    <div class="progress" id="prog" hidden><div></div></div>`;
}

function bindDropzone() {
  const state = { files: [] };
  const drop = $('#drop'), input = $('#fileInput'), pv = $('#previews');
  const ok = (f) => /^(image|video)\//.test(f.type) || /\.(jpe?g|png|bmp|webp|mp4|mov|m4v|webm)$/i.test(f.name);
  const render = () => {
    pv.innerHTML = '';
    state.files.forEach((f, i) => {
      const url = URL.createObjectURL(f);
      const isV = f.type.startsWith('video/') || /\.(mp4|mov|m4v|webm)$/i.test(f.name);
      const el = document.createElement('div'); el.className = 'pv';
      el.innerHTML = `${isV ? `<video src="${url}#t=0.5" muted playsinline preload="metadata"></video>` : `<img src="${url}">`}
        <button type="button" class="x">✕</button><div class="nm">${esc(f.name)} · ${fmtSize(f.size)}</div>`;
      el.querySelector('.x').onclick = () => { state.files.splice(i, 1); render(); };
      pv.appendChild(el);
    });
  };
  const add = (list) => {
    const arr = [...list].filter(ok);
    if (arr.length < list.length) toast('已忽略不支持的文件');
    state.files.push(...arr); render();
  };
  drop.onclick = () => input.click();
  input.onchange = () => { add(input.files); input.value = ''; };
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); add(e.dataTransfer.files); };
  state.progress = (p) => { const b = $('#prog'); b.hidden = false; b.firstElementChild.style.width = (p * 100).toFixed(1) + '%'; };
  return state;
}

// ------------------------------------------------------------ 详情
async function viewDetail(id) {
  const r = await api(`/api/records/${id}`);
  const row = (k, val, full) => val ? `<div class="${full ? 'full' : ''}"><div class="k">${esc(k)}</div><div class="v">${esc(val)}</div></div>` : '';
  const brow = (k, val, full) => (bh(k) ? '' : row(BF(k).label, val, full));
  const patient = [!bh('patient_name') && r.patient_name, !bh('sex') && r.sex,
    !bh('age') && r.age && (/\D/.test(r.age) ? r.age : r.age + '岁')].filter(Boolean).join(' · ');
  const fu = fuInfo(r);
  const series = r.series || [];
  const hasSeries = series.length > 1;
  app.innerHTML = `
    <div class="page-head">
      <h2>${esc((!bh('title') && r.title) || (!bh('body_part') && r.body_part) || '未命名记录')}</h2>
      <div class="actions">
        <a class="btn ghost" href="#/">${ico('back')} 返回</a>
        <a class="btn primary" href="#/new?from=${r.id}">${ico('plus')} 录入复查</a>
        <a class="btn" href="#/r/${r.id}/edit">${ico('edit')} 编辑</a>
        <button class="btn danger" id="delRec">${ico('trash')} 删除</button>
      </div>
    </div>
    <div class="panel meta-grid">
      ${row('检查日期', r.exam_date)}${brow('body_part', r.body_part)}${brow('hospital', r.hospital)}${row('患者', patient)}${brow('patient_id', r.patient_id)}
      ${brow('diagnosis', r.diagnosis, true)}
      ${brow('biopsy_pathology', r.biopsy_pathology, true)}
      ${brow('surgery_pathology', r.surgery_pathology, true)}
      ${CF().map((f) => row(f.label, fmtVal(f, r.extra[f.key]), ['textarea', 'multiselect'].includes(f.type))).join('')}
      ${!bh('tags') && r.tags.length ? `<div class="full"><div class="k">${bl('tags')}</div><div class="tagrow">${r.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div></div>` : ''}
      ${brow('notes', r.notes, true)}
    </div>

    <div class="panel ${fu ? `fu-panel-${fu.bucket}` : ''}" id="fuBox">
      <div class="page-head" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <h2 style="font-size:15.5px">${ico('calendar')} 随访计划</h2>
          ${fu ? `<span class="fu-pill ${fu.cls}">${esc(fu.text)}</span>` : '<span class="muted" style="font-size:13px">未设置</span>'}
        </div>
        <div class="actions">
          ${r.followup_status === 'pending' ? `
            <button class="btn sm" id="fuDoneBtn">${ico('check', 'sm')} 标记完成</button>
            <button class="btn sm" id="fuEditBtn">改期 / 编辑</button>
            <button class="btn sm ghost" id="fuCancelBtn">取消随访</button>
          ` : `
            <button class="btn sm" id="fuEditBtn">${r.followup_date ? '修改随访' : `${ico('plus', 'sm')} 设置随访`}</button>
            ${r.followup_date && r.followup_status !== 'pending' ? '<button class="btn sm ghost" id="fuReopenBtn">重新开启</button>' : ''}
          `}
          ${!hasSeries ? `<button class="btn sm ghost" id="openLinkBtn">${ico('link', 'sm')} 关联已有记录</button>` : ''}
        </div>
      </div>
      ${r.followup_date ? `<div class="muted num" style="font-size:13px">
        计划日期：<strong style="color:var(--text)">${esc(r.followup_date)}</strong>
        ${r.followup_note ? ` · 备注：${esc(r.followup_note)}` : ''}
        ${r.followup_done_at ? ` · ${r.followup_status === 'cancelled' ? '取消于' : '完成于'} ${esc(r.followup_done_at.replace('T', ' '))}` : ''}
        ${r.followup_next ? ` · <a href="#/r/${r.followup_next.id}">查看复查记录 (${esc(r.followup_next.exam_date)}) →</a>` : ''}
      </div>` : ''}
      <div id="fuEditArea"></div>
      ${!hasSeries ? '<div id="linkArea"></div>' : ''}
    </div>

    ${hasSeries ? renderTimelinePanel(r, series) : ''}

    <div class="panel">
      <div class="page-head" style="margin-bottom:12px"><h2 style="font-size:15.5px">${ico('image')} 影像 (${r.files.length})</h2></div>
      <div class="gallery" id="gallery">
        ${r.files.map((f, i) => `
          <div class="gitem ${f.thumb ? '' : 'novthumb'}" data-i="${i}" ${f.thumb ? `style="background-image:url('${f.thumb}')"` : ''}>
            ${f.thumb ? '' : esc(f.orig_name)}
            ${f.kind === 'video' ? `<div class="play"><span class="play-circle">${ico('play')}</span></div>` : ''}
            <button class="del" data-id="${f.id}">删除</button>
          </div>`).join('')}
      </div>
      <div style="margin-top:14px">${dropzoneHtml()}</div>
      <div class="actions" style="margin-top:10px"><button class="btn primary" id="addBtn" hidden>上传新增文件</button></div>
    </div>
    <div class="stats"><span>创建于 ${esc((r.created_at || '').replace('T', ' '))}</span><span>更新于 ${esc((r.updated_at || '').replace('T', ' '))}</span></div>`;

  // 随访操作
  const saveFu = async (payload, msg) => {
    try { await api(`/api/records/${id}/followup`, { method: 'PUT', json: payload }); await loadMeta(); toast(msg); viewDetail(id); }
    catch (err) { toast(err.message, 4000); }
  };
  if ($('#fuDoneBtn')) $('#fuDoneBtn').onclick = () => saveFu({ followup_status: 'done' }, '已标记完成');
  if ($('#fuCancelBtn')) $('#fuCancelBtn').onclick = () => saveFu({ followup_status: 'cancelled' }, '已取消随访');
  if ($('#fuReopenBtn')) $('#fuReopenBtn').onclick = () => saveFu({ followup_status: 'pending' }, '已重新开启');
  $('#fuEditBtn').onclick = () => {
    const area = $('#fuEditArea');
    if (area.innerHTML) { area.innerHTML = ''; return; }
    area.innerHTML = `<form class="inline-edit" id="fuInlineForm">
      <div class="form-grid">
        <div><label>下次随访日期</label><input type="date" name="followup_date" value="${esc(r.followup_date || '')}">${quickDatesHtml(true)}</div>
        <div><label>随访重点 / 备注</label><input name="followup_note" value="${esc(r.followup_note || '')}" placeholder="如：复查结节大小、血流"></div>
      </div>
      <div class="actions" style="margin-top:10px">
        <button type="button" class="btn sm ghost" id="fuEditCancel">取消</button>
        <button class="btn sm primary">保存随访计划</button>
      </div>
    </form>`;
    const f = $('#fuInlineForm');
    bindQuickDates(f, f.followup_date, () => r.exam_date || today());
    $('#fuEditCancel').onclick = () => (area.innerHTML = '');
    f.onsubmit = (e) => {
      e.preventDefault();
      saveFu({ followup_date: f.followup_date.value, followup_note: f.followup_note.value }, '随访计划已更新');
    };
  };

  // 关联已有记录选择器
  const openLinkBtn = $('#openLinkBtn');
  if (openLinkBtn) openLinkBtn.onclick = () => openLinkPicker(r, series);

  // 时间线 & 并排对比
  if (hasSeries) {
    const byId = Object.fromEntries(series.map((s) => [s.id, s]));
    const tlPanel = $('#tlPanel');
    tlPanel.onclick = (e) => {
      const th = e.target.closest('.tl-th');
      if (th) {
        const recItem = byId[+th.dataset.rid];
        if (recItem?.files?.length) openLightbox(recItem.files, +th.dataset.fi);
      }
    };
    $('#cmpToggleBtn').onclick = () => {
      const cmp = $('#cmpBox'), tl = $('#tlList');
      const showCmp = cmp.hidden;
      cmp.hidden = !showCmp; tl.hidden = showCmp;
      $('#cmpToggleBtn').innerHTML = showCmp ? `${ico('list', 'sm')} 时间线视图` : `${ico('columns', 'sm')} 并排对比`;
    };
    $('#unlinkBtn').onclick = async () => {
      if (!confirm('把当前记录移出此随访时间线？（不会删除记录本身）')) return;
      await api(`/api/records/${id}/unlink`, { method: 'POST' });
      toast('已移出时间线'); viewDetail(id);
    };
  }

  $('#gallery').onclick = async (e) => {
    const del = e.target.closest('.del');
    if (del) {
      e.stopPropagation();
      if (!confirm('删除这个文件？（文件会被移到 NAS 的 trash 目录）')) return;
      await api(`/api/files/${del.dataset.id}`, { method: 'DELETE' });
      toast('已删除'); return viewDetail(id);
    }
    const it = e.target.closest('.gitem');
    if (it) openLightbox(r.files, +it.dataset.i);
  };
  $('#delRec').onclick = async () => {
    if (!confirm('确定删除整条记录及其全部影像？（文件会被移到 NAS 的 trash 目录）')) return;
    await api(`/api/records/${id}`, { method: 'DELETE' });
    await loadMeta(); toast('已删除'); location.hash = '#/';
  };
  const picked = bindDropzone();
  const addBtn = $('#addBtn');
  new MutationObserver(() => (addBtn.hidden = !picked.files.length)).observe($('#previews'), { childList: true });
  addBtn.onclick = async () => {
    const fd = new FormData(); picked.files.forEach((f) => fd.append('files', f));
    addBtn.disabled = true; addBtn.textContent = '上传中…';
    try { await upload(`/api/records/${id}/files`, fd, picked.progress); toast('上传完成'); await loadMeta(); viewDetail(id); }
    catch (err) { toast(err.message, 4000); addBtn.disabled = false; addBtn.textContent = '上传新增文件'; }
  };
}

function renderTimelinePanel(cur, series) {
  const cfs = CF();
  const activeCfs = cfs.filter((f) => series.some((s) => fmtVal(f, s.extra[f.key])));
  const hasBiopsy = !bh('biopsy_pathology') && series.some((s) => s.biopsy_pathology);
  const hasSurgery = !bh('surgery_pathology') && series.some((s) => s.surgery_pathology);
  const hasNotes = series.some((s) => s.notes);
  const thumbStrip = (s) => s.files.length ? `<div class="tl-thumbs">${s.files.slice(0, 6).map((f, i) => `
    <div class="tl-th" data-rid="${s.id}" data-fi="${i}" ${f.thumb ? `style="background-image:url('${f.thumb}')"` : ''}>
      ${f.thumb ? '' : '文件'}${f.kind === 'video' ? `<span class="p">${ico('play')}</span>` : ''}
    </div>`).join('')}${s.files.length > 6 ? `<span class="muted" style="font-size:12px;align-self:center">+${s.files.length - 6}</span>` : ''}</div>` : '';
  return `<div class="panel" id="tlPanel">
    <div class="page-head" style="margin-bottom:12px">
      <h2 style="font-size:15.5px">${ico('clock')} 随访时间线 (${series.length} 次检查)</h2>
      <div class="actions">
        <button class="btn sm" id="cmpToggleBtn">${ico('columns', 'sm')} 并排对比</button>
        <button class="btn sm ghost" id="openLinkBtn">${ico('link', 'sm')} 关联记录</button>
        <button class="btn sm ghost" id="unlinkBtn">移出时间线</button>
      </div>
    </div>
    <div id="linkArea"></div>
    <div class="tl-list" id="tlList">
      ${series.map((s, idx) => {
        const isCur = s.id === cur.id;
        const cfStr = cfs.map((f) => {
          const val = fmtVal(f, s.extra[f.key]);
          return val ? `${esc(f.label)}：<strong>${esc(val)}</strong>` : '';
        }).filter(Boolean).join(' · ');
        return `<div class="tl-item ${isCur ? 'cur' : ''}">
          <div class="tl-head">
            <div>
              <strong>第 ${idx + 1} 次 · ${esc(s.exam_date)}</strong>
              ${isCur ? '<span class="pill" style="color:var(--accent);border-color:var(--accent)">当前</span>' : `<a href="#/r/${s.id}" style="margin-left:6px">${esc(s.title || s.body_part || '查看详情')} →</a>`}
            </div>
            ${s.followup_status === 'pending' ? `<span class="fu-pill ${fuInfo(s).cls}">${esc(fuInfo(s).text)}</span>` : ''}
          </div>
          ${s.diagnosis ? `<div style="margin-top:4px;font-size:13.5px">${esc(s.diagnosis)}</div>` : ''}
          ${cfStr ? `<div class="muted" style="margin-top:3px;font-size:13px">${cfStr}</div>` : ''}
          ${thumbStrip(s)}
        </div>`;
      }).join('')}
    </div>
    <div class="cmp-wrap" id="cmpBox" hidden>
      <table class="cmp-table">
        <thead><tr>
          <th class="k">对比项</th>
          ${series.map((s, i) => `<th class="${s.id === cur.id ? 'cur' : ''}">第 ${i + 1} 次 · ${esc(s.exam_date)}${s.id === cur.id ? ' (当前)' : `<br><a href="#/r/${s.id}" style="font-weight:400;font-size:12px">打开记录 →</a>`}</th>`).join('')}
        </tr></thead>
        <tbody>
          <tr><td class="k">标题 / 部位</td>${series.map((s) => `<td>${esc([s.title, s.body_part].filter(Boolean).join(' · ') || '—')}</td>`).join('')}</tr>
          <tr><td class="k">${bl('diagnosis')}</td>${series.map((s) => `<td style="white-space:pre-wrap">${esc(s.diagnosis || '—')}</td>`).join('')}</tr>
          ${hasBiopsy ? `<tr><td class="k">${bl('biopsy_pathology')}</td>${series.map((s) => `<td style="white-space:pre-wrap">${esc(s.biopsy_pathology || '—')}</td>`).join('')}</tr>` : ''}
          ${hasSurgery ? `<tr><td class="k">${bl('surgery_pathology')}</td>${series.map((s) => `<td style="white-space:pre-wrap">${esc(s.surgery_pathology || '—')}</td>`).join('')}</tr>` : ''}
          ${activeCfs.map((f) => `<tr><td class="k">${esc(f.label)}</td>${series.map((s) => `<td><strong>${esc(fmtVal(f, s.extra[f.key]) || '—')}</strong></td>`).join('')}</tr>`).join('')}
          ${hasNotes ? `<tr><td class="k">${bl('notes')}</td>${series.map((s) => `<td style="white-space:pre-wrap">${esc(s.notes || '—')}</td>`).join('')}</tr>` : ''}
          <tr><td class="k">影像</td>${series.map((s) => `<td>${thumbStrip(s) || '<span class="muted">无</span>'}</td>`).join('')}</tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

function openLinkPicker(r, series) {
  const area = $('#linkArea');
  if (area.innerHTML) { area.innerHTML = ''; return; }
  const existing = new Set([r.id, ...series.map((s) => s.id)]);
  const initQ = r.patient_name || r.body_part || '';
  area.innerHTML = `<div class="inline-edit" style="margin-bottom:10px">
    <div style="display:flex;gap:8px;align-items:center">
      <input id="linkSearch" value="${esc(initQ)}" placeholder="输入患者姓名、标题或部位搜索已有记录…">
      <button type="button" class="btn sm ghost" id="linkClose">关闭</button>
    </div>
    <div class="link-res" id="linkRes"><div class="muted" style="font-size:13px">搜索中…</div></div>
  </div>`;
  $('#linkClose').onclick = () => (area.innerHTML = '');
  const runSearch = async () => {
    const q = $('#linkSearch').value.trim();
    const d = await api('/api/records?' + new URLSearchParams({ q, page_size: 20 }));
    const list = d.items.filter((x) => !existing.has(x.id));
    const box = $('#linkRes');
    if (!box) return;
    box.innerHTML = list.length ? list.map((x) => `<div class="link-opt">
      <div><strong>${esc(x.exam_date)}</strong> · ${esc(x.title || x.body_part || '未命名')} <span class="muted">${esc([x.patient_name, x.diagnosis].filter(Boolean).join(' · '))}</span></div>
      <button type="button" class="btn sm primary" data-tid="${x.id}">关联</button>
    </div>`).join('') : '<div class="muted" style="font-size:13px">没有找到可关联的其他记录</div>';
    box.querySelectorAll('button[data-tid]').forEach((b) => {
      b.onclick = async () => {
        try {
          await api(`/api/records/${r.id}/link`, { method: 'POST', json: { target_id: +b.dataset.tid } });
          toast('已关联到同一随访时间线'); viewDetail(r.id);
        } catch (err) { toast(err.message, 4000); }
      };
    });
  };
  let deb;
  $('#linkSearch').oninput = () => { clearTimeout(deb); deb = setTimeout(runSearch, 300); };
  runSearch();
}

// ------------------------------------------------------------ 随访中心
let fuTab = 'pending';
async function viewFollowups() {
  const d = await api(`/api/followups?status=${fuTab}`);
  const sum = d.summary;
  const lead = sum.lead_days;
  const renderRow = (r) => {
    const info = fuInfo(r);
    const title = (!bh('title') && r.title) || (!bh('body_part') && r.body_part) || '未命名记录';
    const sub = [r.exam_date && `检查日期 ${r.exam_date}`, !bh('body_part') && r.body_part, !bh('hospital') && r.hospital, !bh('patient_name') && r.patient_name].filter(Boolean).join(' · ');
    const extra = CF().filter((f) => f.show_in_card).map((f) => {
      const val = fmtVal(f, r.extra[f.key]);
      return val ? `${f.label}：${val}` : '';
    }).filter(Boolean).join(' · ');
    const cls = fuTab === 'pending' && info ? (info.bucket === 'over' ? 'over' : info.bucket === 'due' ? 'due' : '') : '';
    return `<div class="fu-row ${cls}" data-id="${r.id}">
      <a class="fu-thumb" href="#/r/${r.id}" ${r.cover ? `style="background-image:url('${r.cover}')"` : ''}>${r.cover ? '' : '无预览'}</a>
      <div class="fu-body">
        <div class="fu-top">
          <a class="fu-title" href="#/r/${r.id}">${esc(title)}</a>
          ${info ? `<span class="fu-pill ${info.cls}">${esc(info.text)}</span>` : ''}
          ${r.series_count > 1 ? `<span class="pill">${ico('clock', 'sm')} ${r.series_count}次</span>` : ''}
        </div>
        <div class="muted" style="font-size:12.5px;margin-top:2px">${esc(sub)}</div>
        <div style="font-size:13px;margin-top:4px">
          计划随访：<strong>${esc(r.followup_date)}</strong>
          ${r.followup_note ? ` · ${esc(r.followup_note)}` : ''}
        </div>
        ${r.diagnosis || extra ? `<div class="muted" style="font-size:12.5px;margin-top:2px">${esc([r.diagnosis, extra].filter(Boolean).join(' · '))}</div>` : ''}
        ${r.followup_next ? `<div style="font-size:12.5px;margin-top:4px"><a href="#/r/${r.followup_next.id}">已录入复查 (${esc(r.followup_next.exam_date)}) →</a></div>` : ''}
        <div class="resched-slot"></div>
      </div>
      <div class="fu-act">
        ${fuTab === 'pending' ? `
          <a class="btn sm primary" href="#/new?from=${r.id}">录入复查</a>
          <button class="btn sm" data-act="resched">改期</button>
          <button class="btn sm" data-act="done">完成</button>
          <button class="btn sm ghost" data-act="cancel">取消</button>
        ` : `
          <a class="btn sm" href="#/new?from=${r.id}">录入复查</a>
          <button class="btn sm ghost" data-act="reopen">重新开启</button>
        `}
      </div>
    </div>`;
  };

  let bodyHtml = '';
  if (fuTab === 'pending') {
    const over = d.items.filter((x) => x.days_left < 0);
    const due = d.items.filter((x) => x.days_left >= 0 && x.days_left <= lead);
    const plan = d.items.filter((x) => x.days_left > lead);
    if (!d.items.length) {
      bodyHtml = '<div class="empty-state">暂无待随访计划<br><span style="font-size:13px">在任意记录详情页或新建记录时设置「下次随访日期」即可加入提醒</span></div>';
    } else {
      if (over.length) bodyHtml += `<div class="fu-sec"><h3><span class="dot over"></span>已逾期 (${over.length})</h3>${over.map(renderRow).join('')}</div>`;
      if (due.length) bodyHtml += `<div class="fu-sec"><h3><span class="dot due"></span>近期到期 · ${lead ? `今天～${lead}天内` : '今天'} (${due.length})</h3>${due.map(renderRow).join('')}</div>`;
      if (plan.length) bodyHtml += `<div class="fu-sec"><h3><span class="dot plan"></span>以后计划 (${plan.length})</h3>${plan.map(renderRow).join('')}</div>`;
    }
  } else {
    bodyHtml = d.items.length ? d.items.map(renderRow).join('') : `<div class="empty-state">暂无${fuTab === 'done' ? '已完成' : '已取消'}的随访记录</div>`;
  }

  app.innerHTML = `
    <div class="page-head">
      <h2>${ico('calendar')} 随访中心</h2>
      <div class="actions">
        <a class="btn ghost" href="#/settings">${ico('settings')} 提醒设置（提前 ${lead} 天）</a>
        <a class="btn ghost" href="#/">${ico('back')} 返回</a>
      </div>
    </div>
    <div class="tabs" id="fuTabs">
      <button class="tab ${fuTab === 'pending' ? 'on' : ''}" data-t="pending">待随访 (${sum.pending_total})</button>
      <button class="tab ${fuTab === 'done' ? 'on' : ''}" data-t="done">已完成</button>
      <button class="tab ${fuTab === 'cancelled' ? 'on' : ''}" data-t="cancelled">已取消</button>
    </div>
    <div id="fuList">${bodyHtml}</div>`;

  $('#fuTabs').onclick = (e) => {
    const b = e.target.closest('button[data-t]'); if (!b) return;
    fuTab = b.dataset.t; viewFollowups();
  };
  const byId = Object.fromEntries(d.items.map((x) => [x.id, x]));
  $('#fuList').onclick = async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const rowEl = b.closest('.fu-row'), id = +rowEl.dataset.id, item = byId[id], act = b.dataset.act;
    const update = async (payload, msg) => {
      try { await api(`/api/records/${id}/followup`, { method: 'PUT', json: payload }); await loadMeta(); toast(msg); viewFollowups(); }
      catch (err) { toast(err.message, 4000); }
    };
    if (act === 'done') return update({ followup_status: 'done' }, '已标记完成');
    if (act === 'cancel') return update({ followup_status: 'cancelled' }, '已取消随访');
    if (act === 'reopen') return update({ followup_status: 'pending' }, '已重新开启');
    if (act === 'resched') {
      const slot = rowEl.querySelector('.resched-slot');
      if (slot.innerHTML) { slot.innerHTML = ''; return; }
      slot.innerHTML = `<form class="inline-edit">
        <div class="form-grid">
          <div><label>新的随访日期</label><input type="date" name="followup_date" value="${esc(item.followup_date || today())}" required>${quickDatesHtml(false)}</div>
          <div><label>随访备注</label><input name="followup_note" value="${esc(item.followup_note || '')}"></div>
        </div>
        <div class="actions" style="margin-top:8px">
          <button type="button" class="btn sm ghost" data-close>取消</button>
          <button class="btn sm primary">保存改期</button>
        </div>
      </form>`;
      const form = slot.querySelector('form');
      bindQuickDates(form, form.followup_date, () => today());
      form.querySelector('[data-close]').onclick = () => (slot.innerHTML = '');
      form.onsubmit = (ev) => {
        ev.preventDefault();
        update({ followup_date: form.followup_date.value, followup_note: form.followup_note.value, followup_status: 'pending' }, '已改期');
      };
    }
  };
}

// ------------------------------------------------------------ 设置
async function viewSettings() {
  const [d, fuCfg] = await Promise.all([api('/api/fields'), api('/api/settings/followup')]);
  app.innerHTML = `
    <div class="page-head"><h2>${ico('settings')} 设置</h2><a class="btn ghost" href="#/">${ico('back')} 返回</a></div>

    <form class="panel" id="fuCfgForm">
      <h2 class="sec-title">${ico('bell')} 随访提醒设置</h2>
      <div class="muted" style="font-size:13px;margin-bottom:10px">到期前 N 天起（含当天及已逾期），会在顶部「随访」按钮显示红点角标，并在首页顶部提示。</div>
      <div class="form-grid" style="align-items:end">
        <div>
          <label>提前提醒天数</label>
          <div class="unit-wrap"><input type="number" min="0" max="365" name="lead_days" value="${fuCfg.lead_days}"><span>天</span></div>
        </div>
        <div class="quick-dates" style="margin:0">
          ${[[0, '仅当天'], [3, '3 天'], [7, '7 天'], [14, '14 天'], [30, '30 天']].map(([n, t]) =>
            `<button type="button" class="btn sm ghost" data-lead="${n}">${t}</button>`).join('')}
        </div>
      </div>
      <div class="actions" style="margin-top:12px"><button class="btn primary">保存提醒设置</button></div>
    </form>

    <div class="panel">
      <div class="page-head" style="margin-bottom:8px"><h2 style="font-size:16px">自定义字段</h2>
        <button class="btn primary" id="addField">＋ 添加字段</button></div>
      <div class="muted" style="font-size:13px;margin-bottom:10px">自定义字段会出现在新建/编辑表单中，可用于检索筛选和卡片显示。</div>
      <div id="fieldEditor"></div>
      <div id="fieldList">${d.custom.length ? d.custom.map((f, i) => `
        <div class="frow ${f.active ? '' : 'off'}" data-id="${f.id}">
          <div class="fmove">
            <button class="btn ghost sm" data-act="up" ${i === 0 ? 'disabled' : ''}>↑</button>
            <button class="btn ghost sm" data-act="down" ${i === d.custom.length - 1 ? 'disabled' : ''}>↓</button>
          </div>
          <div class="finfo">
            <div><strong>${esc(f.label)}</strong> <span class="pill">${TYPE_NAMES[f.type]}</span>
              ${f.active ? '' : '<span class="pill warn-pill">已停用</span>'}</div>
            <div class="muted" style="font-size:12.5px">
              ${[f.options.length ? '选项：' + f.options.join(' / ') : '', f.unit ? '单位：' + f.unit : '',
                 f.pathology_assist ? 'WHO 病理联想' : '', f.filterable ? '可筛选' : '', f.show_in_card ? '卡片显示' : ''].filter(Boolean).map(esc).join(' · ')}</div>
          </div>
          <div class="fact">
            <button class="btn sm" data-act="edit">编辑</button>
            <button class="btn sm" data-act="toggle">${f.active ? '停用' : '启用'}</button>
            <button class="btn sm danger" data-act="del">删除</button>
          </div>
        </div>`).join('') : '<div class="empty-state" style="padding:24px 0">还没有自定义字段</div>'}
      </div>
    </div>

    <form class="panel" id="builtinForm">
      <h2 style="font-size:16px;margin:0 0 4px">内置字段</h2>
      <div class="muted" style="font-size:13px;margin-bottom:10px">可修改显示名称，或隐藏用不到的字段（隐藏后已有数据不会丢失）。「检查日期」为必填字段，不可隐藏。</div>
      ${d.builtin.map((b) => `
        <div class="brow">
          <span class="muted">${esc(b.default_label)}</span>
          <input name="label_${b.key}" value="${esc(b.label)}" placeholder="${esc(b.default_label)}">
          <label class="check"><input type="checkbox" name="hidden_${b.key}" ${b.hidden ? 'checked' : ''}>隐藏</label>
        </div>`).join('')}
      <div class="actions" style="margin-top:12px"><button class="btn primary">保存内置字段设置</button></div>
    </form>
    <div class="muted" style="font-size:12px;text-align:center;margin-top:8px">当前版本：${esc(META.version || 'dev')}</div>`;

  const fuForm = $('#fuCfgForm');
  fuForm.querySelectorAll('button[data-lead]').forEach((b) => (b.onclick = () => (fuForm.lead_days.value = b.dataset.lead)));
  fuForm.onsubmit = async (e) => {
    e.preventDefault();
    try { await api('/api/settings/followup', { method: 'PUT', json: { lead_days: +fuForm.lead_days.value } }); await loadMeta(); toast('已保存'); }
    catch (err) { toast(err.message, 4000); }
  };

  const byId = Object.fromEntries(d.custom.map((f) => [f.id, f]));
  $('#addField').onclick = () => fieldEditor(null);
  $('#fieldList').onclick = async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const id = +b.closest('.frow').dataset.id, f = byId[id], act = b.dataset.act;
    try {
      if (act === 'edit') return fieldEditor(f);
      if (act === 'toggle') await api(`/api/fields/${id}`, { method: 'PUT', json: { active: !f.active } });
      if (act === 'del') {
        if (!confirm(`删除字段「${f.label}」？\n\n所有记录中该字段的数据都会被清除，且无法恢复。\n如果只是暂时不用，建议点「停用」（数据会保留）。`)) return;
        await api(`/api/fields/${id}?purge=1`, { method: 'DELETE' });
      }
      if (act === 'up' || act === 'down') {
        const ids = d.custom.map((x) => x.id), i = ids.indexOf(id), j = act === 'up' ? i - 1 : i + 1;
        [ids[i], ids[j]] = [ids[j], ids[i]];
        await api('/api/fields/order', { method: 'POST', json: { ids } });
      }
      await loadMeta(); viewSettings();
    } catch (err) { toast(err.message, 4000); }
  };
  $('#builtinForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target), body = {};
    d.builtin.forEach((b) => (body[b.key] = { label: fd.get(`label_${b.key}`), hidden: fd.has(`hidden_${b.key}`) }));
    try { await api('/api/fields/builtin', { method: 'PUT', json: body }); await loadMeta(); toast('已保存'); }
    catch (err) { toast(err.message, 4000); }
  };
}

function fieldEditor(f) {
  const isNew = !f;
  f = f || { label: '', type: 'select', options: [], unit: '', filterable: true, show_in_card: false };
  const box = $('#fieldEditor');
  box.innerHTML = `
    <form class="panel editor" id="fieldForm">
      <h3>${isNew ? '添加字段' : `编辑字段「${esc(f.label)}」`}</h3>
      <div class="form-grid">
        <div><label>字段名称 *</label><input name="label" value="${esc(f.label)}" placeholder="如：TI-RADS 分级" required></div>
        <div><label>类型</label><select name="type">${Object.entries(TYPE_NAMES).map(([k, n]) =>
          `<option value="${k}" ${k === f.type ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
        <div class="unit-field"><label>单位（可选）</label><input name="unit" value="${esc(f.unit)}" placeholder="如：mm"></div>
        <div class="full opt-field"><label>选项</label>
          <div id="optList"></div>
          <button type="button" class="btn sm" id="addOpt" style="margin-top:6px">＋ 添加选项</button>
          <div class="muted" style="font-size:12px;margin-top:4px">修改已有选项的名称时，已有记录中的值会同步更新。</div>
        </div>
        <div class="full">
          <label class="check"><input type="checkbox" name="filterable" ${f.filterable ? 'checked' : ''}>在检索页显示为筛选条件</label>
          <label class="check"><input type="checkbox" name="show_in_card" ${f.show_in_card ? 'checked' : ''}>在列表卡片上显示</label>
          <label class="check path-field"><input type="checkbox" name="pathology_assist" ${f.pathology_assist ? 'checked' : ''}>启用 WHO 病理词库联想（按检查部位自动匹配，支持拼音首字母）</label>
        </div>
        ${isNew ? '' : '<div class="full muted" style="font-size:12.5px" id="typeWarn" hidden>⚠️ 修改类型后，已有记录中不符合新类型的值可能显示异常。</div>'}
      </div>
      <div class="actions" style="margin-top:12px">
        <button type="button" class="btn ghost" id="cancelField">取消</button>
        <button class="btn primary">${isNew ? '添加' : '保存'}</button>
      </div>
    </form>`;
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const form = $('#fieldForm'), optList = $('#optList');
  const addOpt = (val = '', orig = '') => {
    const row = document.createElement('div'); row.className = 'optrow';
    row.innerHTML = `<input value="${esc(val)}" data-orig="${esc(orig)}" placeholder="选项内容"><button type="button" class="btn ghost sm">✕</button>`;
    row.querySelector('button').onclick = () => row.remove();
    optList.appendChild(row);
    return row.querySelector('input');
  };
  f.options.forEach((o) => addOpt(o, o));
  if (!f.options.length) { addOpt(); addOpt(); }
  $('#addOpt').onclick = () => addOpt().focus();
  const syncType = () => {
    const t = form.type.value;
    form.querySelector('.opt-field').hidden = !['select', 'multiselect'].includes(t);
    form.querySelector('.unit-field').hidden = t !== 'number';
    form.querySelector('.path-field').hidden = !['text', 'textarea'].includes(t);
    const w = $('#typeWarn'); if (w) w.hidden = t === f.type;
  };
  let pathTouched = !isNew;
  form.pathology_assist.onchange = () => (pathTouched = true);
  form.label.oninput = () => {
    if (!pathTouched) form.pathology_assist.checked = /病理/.test(form.label.value);
  };
  form.type.onchange = syncType; syncType();
  $('#cancelField').onclick = () => (box.innerHTML = '');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const inputs = [...optList.querySelectorAll('input')];
    const body = {
      label: form.label.value, type: form.type.value, unit: form.unit.value,
      options: inputs.map((i) => i.value.trim()).filter(Boolean),
      filterable: form.filterable.checked, show_in_card: form.show_in_card.checked,
      pathology_assist: ['text', 'textarea'].includes(form.type.value) && form.pathology_assist.checked,
    };
    if (['select', 'multiselect'].includes(body.type) && !body.options.length) return toast('请至少填写一个选项');
    if (!isNew) {
      body.renames = {};
      inputs.forEach((i) => { if (i.dataset.orig && i.value.trim() && i.value.trim() !== i.dataset.orig) body.renames[i.dataset.orig] = i.value.trim(); });
    }
    try {
      await api(isNew ? '/api/fields' : `/api/fields/${f.id}`, { method: isNew ? 'POST' : 'PUT', json: body });
      await loadMeta(); toast(isNew ? '已添加' : '已保存'); viewSettings();
    } catch (err) { toast(err.message, 4000); }
  };
}

// ------------------------------------------------------------ 大图 / 视频查看器
const LB = { files: [], i: 0 };
function openLightbox(files, i) { LB.files = files; LB.i = i; $('#lightbox').hidden = false; document.body.style.overflow = 'hidden'; renderLB(); }
function closeLightbox() { const lb = $('#lightbox'); if (lb.hidden) return; lb.hidden = true; $('#lbStage').innerHTML = ''; document.body.style.overflow = ''; }
function renderLB() {
  const f = LB.files[LB.i];
  const stage = $('#lbStage');
  stage.innerHTML = f.kind === 'video' && f.web_status === 'pending'
    ? `<div class="empty-state">视频正在后台转码为浏览器可播放格式，请稍后刷新页面<br><br><a class="btn" href="${f.url}?download=1">下载原文件</a></div>`
    : f.kind === 'video'
    ? `<video src="${f.url}" controls autoplay playsinline></video>`
    : `<img src="${f.url}" alt="">`;
  const vid = stage.querySelector('video');
  if (vid) vid.onerror = () => {
    stage.innerHTML = `<div class="empty-state">此浏览器无法播放该视频编码<br><br><a class="btn" href="${f.url}?download=1">下载原文件</a></div>`;
  };
  const img = stage.querySelector('img');
  if (img) img.onclick = () => img.classList.toggle('zoom');
  const dims = f.width ? `${f.width}×${f.height}` : '';
  $('#lbInfo').textContent = `${LB.i + 1} / ${LB.files.length} · ${f.orig_name} · ${[dims, fmtDur(f.duration), fmtSize(f.size)].filter(Boolean).join(' · ')}`;
  $('#lbDownload').href = f.url + '?download=1';
  $('#lbPrev').hidden = $('#lbNext').hidden = LB.files.length < 2;
}
const lbStep = (d) => { LB.i = (LB.i + d + LB.files.length) % LB.files.length; renderLB(); };
$('#lbClose').onclick = closeLightbox;
$('#lbPrev').onclick = () => lbStep(-1);
$('#lbNext').onclick = () => lbStep(1);
document.addEventListener('keydown', (e) => {
  if ($('#lightbox').hidden) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') lbStep(-1);
  if (e.key === 'ArrowRight') lbStep(1);
});
// 手机左右滑动切换
(() => {
  let x0 = null;
  const st = $('#lbStage');
  st.addEventListener('touchstart', (e) => { x0 = e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
  st.addEventListener('touchend', (e) => {
    if (x0 === null || st.querySelector('img.zoom')) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 60) lbStep(dx < 0 ? 1 : -1);
    x0 = null;
  });
})();

// ------------------------------------------------------------ 启动
async function boot() {
  const me = await api('/api/me');
  if (!me.logged_in) return showLogin();
  $('#topbar').hidden = false;
  await loadMeta();
  DEFAULT_PW = me.default_password;
  route();
}
boot();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => { });
