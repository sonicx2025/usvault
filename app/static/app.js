/* 超声影像库 - 前端 (原生 JS, 无构建步骤) */
'use strict';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const DEFAULT_PARTS = ['甲状腺', '乳腺', '肝脏', '胆囊', '胰腺', '脾脏', '肾脏', '膀胱', '前列腺',
  '子宫附件', '产科', '心脏', '颈部血管', '下肢血管', '浅表淋巴结', '肌骨', '阴囊', '其他'];
let META = { body_parts: [], tags: [], stats: {} };
let DEFAULT_PW = false;
const EMPTY_LIST = { q: '', date_from: '', date_to: '', body_part: '', tag: '', kind: '', page: 1, cf: {} };
let listState = { ...EMPTY_LIST, cf: {} };

// ------------------------------------------------------------ 工具
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const fmtSize = (b) => b > 1 << 30 ? (b / (1 << 30)).toFixed(2) + ' GB' : b > 1 << 20 ? (b / (1 << 20)).toFixed(1) + ' MB' : Math.ceil(b / 1024) + ' KB';
const fmtDur = (s) => s ? `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}` : '';

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
}

// ------------------------------------------------------------ 登录
function showLogin() {
  $('#topbar').hidden = true;
  app.innerHTML = `
    <form class="login" id="loginForm">
      <img src="/icons/icon-192.png" alt="">
      <h1>超声影像库</h1>
      <input type="password" id="pw" placeholder="请输入密码" autocomplete="current-password" autofocus>
      <button class="btn primary">登录</button>
      <div class="err" id="loginErr"></div>
    </form>`;
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
  try {
    let m;
    if (h === '/' || h.startsWith('/?')) return await viewList();
    if (h === '/new') return viewForm(null);
    if (h === '/settings') return await viewSettings();
    if ((m = h.match(/^\/r\/(\d+)\/edit$/))) return viewForm(await api(`/api/records/${m[1]}`));
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
  switch (f.type) {
    case 'textarea': return `<textarea name="${n}">${esc(v || '')}</textarea>`;
    case 'number': return `<div class="unit-wrap"><input type="number" step="any" name="${n}" value="${esc(v ?? '')}">${f.unit ? `<span>${esc(f.unit)}</span>` : ''}</div>`;
    case 'date': return `<input type="date" name="${n}" value="${esc(v || '')}">`;
    case 'select': return `<select name="${n}"><option value="">—</option>${opts.map((o) =>
      `<option ${o === v ? 'selected' : ''} value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
    case 'multiselect': return `<div class="checks">${opts.map((o) =>
      `<label class="check"><input type="checkbox" name="${n}" value="${esc(o)}" ${(v || []).includes(o) ? 'checked' : ''}>${esc(o)}</label>`).join('') || '<span class="muted">（未设置选项）</span>'}</div>`;
    case 'checkbox': return `<label class="check"><input type="checkbox" name="${n}" value="1" ${v ? 'checked' : ''}>是</label>`;
    default: return `<input name="${n}" value="${esc(v || '')}">`;
  }
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
      return `<div>${lab}<input name="${id}" value="${val(id)}" placeholder="包含…" data-debounce></div>`;
  }
}

// ------------------------------------------------------------ 列表 / 检索
async function viewList() {
  const s = listState;
  const kindOpts = [['', '全部类型'], ['image', '含图片'], ['video', '含视频']];
  const cfs = CF().filter((f) => f.filterable);
  app.innerHTML = `
    ${DEFAULT_PW ? '<div class="warn">⚠️ 当前使用默认密码 admin，请在部署配置中修改 APP_PASSWORD。</div>' : ''}
    <form class="search" id="searchForm">
      <div class="search-main">
        <input type="search" name="q" placeholder="搜索全部文字信息与文件名…（空格分隔多个关键词）" value="${esc(s.q)}">
        <button class="btn primary">搜索</button>
      </div>
      <div class="filters">
        <div><label>开始日期</label><input type="date" name="date_from" value="${esc(s.date_from)}"></div>
        <div><label>结束日期</label><input type="date" name="date_to" value="${esc(s.date_to)}"></div>
        ${bh('body_part') ? '' : `<div><label>${bl('body_part')}</label><select name="body_part"><option value="">全部</option>
          ${META.body_parts.map((p) => `<option ${p.name === s.body_part ? 'selected' : ''} value="${esc(p.name)}">${esc(p.name)} (${p.n})</option>`).join('')}
        </select></div>`}
        <div><label>类型</label><select name="kind">
          ${kindOpts.map(([v, t]) => `<option value="${v}" ${v === s.kind ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
        ${cfs.map((f) => cfFilter(f, s.cf)).join('')}
      </div>
      ${!bh('tags') && META.tags.length ? `<div class="chips">${META.tags.slice(0, 30).map((t) =>
        `<span class="chip ${t.name === s.tag ? 'on' : ''}" data-tag="${esc(t.name)}">#${esc(t.name)} ${t.n}</span>`).join('')}</div>` : ''}
      <div style="margin-top:10px" id="resetWrap" hidden><button type="button" class="btn ghost" id="resetBtn">清除筛选条件</button></div>
    </form>
    <div class="stats"><span id="resultInfo">加载中…</span>
      <span>共 ${META.stats.records || 0} 条记录 · ${META.stats.images || 0} 张图片 · ${META.stats.videos || 0} 段视频 · ${fmtSize(META.stats.bytes || 0)}</span></div>
    <div class="grid" id="grid"></div>
    <div class="more"><button class="btn" id="moreBtn" hidden>加载更多</button></div>`;

  const form = $('#searchForm');
  const apply = () => {
    const fd = new FormData(form);
    for (const k of ['q', 'date_from', 'date_to', 'body_part', 'kind']) s[k] = (fd.get(k) || '').trim();
    s.cf = {};
    for (const [k, v] of fd.entries()) if (/^cf\d+/.test(k) && String(v).trim()) s.cf[k] = String(v).trim();
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
  $('#resetWrap').hidden = !(s.date_from || s.date_to || s.body_part || s.tag || s.kind || Object.keys(s.cf).length);
  $('#moreBtn').hidden = d.page * d.page_size >= d.total;
}

function cardHtml(r) {
  const vis = (k) => (bh(k) ? '' : r[k]);
  const title = vis('title') || vis('diagnosis') || vis('body_part') || '未命名记录';
  const sub = [r.exam_date, vis('body_part'), vis('patient_name')].filter(Boolean).join(' · ');
  const extra = CF().filter((f) => f.show_in_card).map((f) => {
    const v = fmtVal(f, r.extra[f.key]);
    return v ? `${esc(f.label)}：${esc(v)}` : '';
  }).filter(Boolean).join(' · ');
  return `<a class="card" href="#/r/${r.id}">
    <div class="cover ${r.cover ? '' : 'empty'}" ${r.cover ? `style="background-image:url('${r.cover}')"` : ''}>
      ${r.cover ? '' : '无预览'}
      <div class="badges">${r.n_image ? `<span class="badge">🖼 ${r.n_image}</span>` : ''}${r.n_video ? `<span class="badge">▶ ${r.n_video}</span>` : ''}</div>
    </div>
    <div class="body"><div class="t">${esc(title)}</div><div class="sub">${esc(sub)}</div>
      ${extra ? `<div class="sub">${extra}</div>` : ''}
      ${!bh('tags') && r.tags.length ? `<div class="tagrow">${r.tags.slice(0, 4).map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div>` : ''}
    </div></a>`;
}

// ------------------------------------------------------------ 新建 / 编辑
function viewForm(rec) {
  const isEdit = !!rec;
  const r = rec || { exam_date: today(), tags: [], extra: {} };
  const v = (k) => esc(r[k] || '');
  const fld = (k, html, cls = '') => (bh(k) ? '' : `<div class="${cls}"><label>${bl(k)}</label>${html}</div>`);
  const cfs = CF();
  app.innerHTML = `
    <div class="page-head"><h2>${isEdit ? '编辑记录' : '新建记录'}</h2></div>
    <form id="recForm">
      <div class="panel form-grid">
        <div><label>检查日期 *</label><input type="date" name="exam_date" value="${v('exam_date')}" required></div>
        ${fld('body_part', `<input name="body_part" list="dlParts" value="${v('body_part')}" placeholder="如：甲状腺">`)}
        ${fld('title', `<input name="title" value="${v('title')}" placeholder="简要描述，如：甲状腺右叶低回声结节">`, 'full')}
        ${fld('patient_name', `<input name="patient_name" value="${v('patient_name')}">`)}
        ${fld('patient_id', `<input name="patient_id" value="${v('patient_id')}">`)}
        ${fld('sex', `<select name="sex">${['', '男', '女'].map((x) => `<option ${x === r.sex ? 'selected' : ''} value="${x}">${x || '—'}</option>`).join('')}</select>`)}
        ${fld('age', `<input name="age" value="${v('age')}" placeholder="如：45">`)}
        ${fld('diagnosis', `<textarea name="diagnosis" placeholder="如：TI-RADS 4a 类">${v('diagnosis')}</textarea>`, 'full')}
        ${fld('tags', `<input name="tags" list="dlTags" value="${esc((r.tags || []).join(', '))}" placeholder="逗号或空格分隔，如：结节, 典型病例, 教学">`, 'full')}
        ${fld('notes', `<textarea name="notes">${v('notes')}</textarea>`, 'full')}
      </div>
      ${cfs.length ? `<div class="panel form-grid">
        ${cfs.map((f) => `<div class="${['textarea', 'multiselect'].includes(f.type) ? 'full' : ''}">
          <label>${esc(f.label)}</label>${cfInput(f, r.extra[f.key])}</div>`).join('')}
      </div>` : `<div class="muted" style="margin:-4px 2px 14px;font-size:13px">需要更多字段？到 <a href="#/settings">⚙ 字段设置</a> 添加自定义字段。</div>`}
      ${isEdit ? '' : `<div class="panel">${dropzoneHtml()}</div>`}
      <div class="actions">
        <a class="btn ghost" href="${isEdit ? `#/r/${r.id}` : '#/'}">取消</a>
        <button class="btn primary" id="saveBtn">${isEdit ? '保存修改' : '保存记录'}</button>
      </div>
    </form>`;

  const picked = isEdit ? null : bindDropzone();
  $('#recForm').onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const meta = {};
    for (const [k, val] of fd.entries()) if (!k.startsWith('cf_')) meta[k] = val;
    meta.extra = collectExtra(fd);
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
      <div><strong>拖拽图片 / 视频到这里</strong>，或点击选择文件</div>
      <div style="font-size:12.5px;margin-top:4px">支持 JPG、PNG、MP4、MOV，可多选</div>
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
  app.innerHTML = `
    <div class="page-head">
      <h2>${esc((!bh('title') && r.title) || (!bh('body_part') && r.body_part) || '未命名记录')}</h2>
      <div class="actions">
        <a class="btn ghost" href="#/">← 返回</a>
        <a class="btn" href="#/r/${r.id}/edit">编辑</a>
        <button class="btn danger" id="delRec">删除</button>
      </div>
    </div>
    <div class="panel meta-grid">
      ${row('检查日期', r.exam_date)}${brow('body_part', r.body_part)}${row('患者', patient)}${brow('patient_id', r.patient_id)}
      ${brow('diagnosis', r.diagnosis, true)}
      ${CF().map((f) => row(f.label, fmtVal(f, r.extra[f.key]), ['textarea', 'multiselect'].includes(f.type))).join('')}
      ${!bh('tags') && r.tags.length ? `<div class="full"><div class="k">${bl('tags')}</div><div class="tagrow">${r.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join('')}</div></div>` : ''}
      ${brow('notes', r.notes, true)}
    </div>
    <div class="panel">
      <div class="page-head" style="margin-bottom:10px"><h2 style="font-size:16px">影像 (${r.files.length})</h2></div>
      <div class="gallery" id="gallery">
        ${r.files.map((f, i) => `
          <div class="gitem ${f.thumb ? '' : 'novthumb'}" data-i="${i}" ${f.thumb ? `style="background-image:url('${f.thumb}')"` : ''}>
            ${f.thumb ? '' : esc(f.orig_name)}
            ${f.kind === 'video' ? `<div class="play">▶</div>` : ''}
            <button class="del" data-id="${f.id}">删除</button>
          </div>`).join('')}
      </div>
      <div style="margin-top:14px">${dropzoneHtml()}</div>
      <div class="actions" style="margin-top:10px"><button class="btn primary" id="addBtn" hidden>上传新增文件</button></div>
    </div>
    <div class="stats"><span>创建于 ${esc((r.created_at || '').replace('T', ' '))}</span><span>更新于 ${esc((r.updated_at || '').replace('T', ' '))}</span></div>`;

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

// ------------------------------------------------------------ 字段设置
async function viewSettings() {
  const d = await api('/api/fields');
  app.innerHTML = `
    <div class="page-head"><h2>⚙ 字段设置</h2><a class="btn ghost" href="#/">← 返回</a></div>

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
                 f.filterable ? '可筛选' : '', f.show_in_card ? '卡片显示' : ''].filter(Boolean).map(esc).join(' · ')}</div>
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
    const w = $('#typeWarn'); if (w) w.hidden = t === f.type;
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
