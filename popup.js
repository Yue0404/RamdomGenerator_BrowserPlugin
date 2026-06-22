// ============================================================
// 随机数生成器 - popup.js
// ============================================================

// ---------- 预设主题配色 ----------
const THEMES = {
  purple: { primary: '#6366f1', light: '#8b5cf6', rgb: '99, 102, 241' },
  blue:   { primary: '#3b82f6', light: '#60a5fa', rgb: '59, 130, 246' },
  green:  { primary: '#10b981', light: '#34d399', rgb: '16, 185, 129' },
  red:    { primary: '#ef4444', light: '#f87171', rgb: '239, 68, 68' },
  orange: { primary: '#f59e0b', light: '#fbbf24', rgb: '245, 158, 11' },
  pink:   { primary: '#ec4899', light: '#f472b6', rgb: '236, 72, 153' },
  cyan:   { primary: '#06b6d4', light: '#22d3ee', rgb: '6, 182, 212' },
  slate:  { primary: '#475569', light: '#64748b', rgb: '71, 85, 105' },
};

const ALL_TABS = ['decimal', 'integer', 'password', 'rgb', 'sequence'];

// ---------- 参数边界 ----------
const BOUNDS = {
  decimalPlaces:  { min: 1,  max: 32  },
  passwordLength: { min: 6,  max: 128 },
  seqCount:       { min: 1,  max: 1024 },
};

// ---------- 默认设置 ----------
let settings = {
  theme: 'purple',
  customColor: null,
  visibleTabs: [...ALL_TABS],
  tabOrder: [...ALL_TABS],
  colorAdvanced: false,
  pwdSecurityLevel: 'default',
  prefs: {},
};

const DEFAULT_PREFS = {
  decPlaces: '3',
  intMin: '0', intMax: '100',
  pwdLength: '16', pwdUpper: true, pwdLower: true, pwdDigit: true, pwdSpecial: true,
  seqCount: '5', seqType: 'decimal', seqDecPlaces: '3', seqIntMin: '0', seqIntMax: '100',
};

// ---------- DOM 引用 ----------
const mainView     = document.getElementById('main-view');
const settingsView = document.getElementById('settings-view');
const btnSettings  = document.getElementById('btn-settings');
const btnBack      = document.getElementById('btn-back');
const btnGenerate  = document.getElementById('btn-generate');
const btnCopy      = document.getElementById('btn-copy');
const hintMinTabs  = document.getElementById('hint-min-tabs');

// 对调按钮
const swapInt    = document.getElementById('swap-int');
const swapSeqInt = document.getElementById('swap-seq-int');

let activeTab = ALL_TABS[0];

// ---------- 历史记录 ----------
const HISTORY_MAX = 1000;
let history = [];

// 各 tab 对应的中文标签
const TAB_LABELS = {
  decimal: '小数', integer: '整数', password: '口令', rgb: '颜色', 'rgb-advanced': '高级颜色', sequence: '序列',
};

// ============================================================
// 校验系统
// ============================================================

/** 清除单个输入框的错误/警告状态 */
function clearInputError(inputEl) {
  inputEl.classList.remove('input-error', 'input-warn');
  const hint = document.querySelector(`.error-hint[data-for="${inputEl.id}"]`);
  if (hint) hint.classList.remove('show');
}

/** 清除面板内所有错误/警告（含 warn-hint & swap-btn） */
function clearPanelErrors(panelId) {
  const panel = document.getElementById(panelId);
  if (!panel) return;
  panel.querySelectorAll('.input-error, .input-warn').forEach(el => {
    el.classList.remove('input-error', 'input-warn');
  });
  panel.querySelectorAll('.error-hint, .warn-hint').forEach(el => {
    el.classList.remove('show');
  });
  // 隐藏对调按钮
  const swap = panel.querySelector('.swap-btn');
  if (swap) swap.classList.remove('show');
}

/** 显示单个输入框的错误 */
function showInputError(inputEl, level, msg) {
  inputEl.classList.add(level === 'warn' ? 'input-warn' : 'input-error');
  const hint = document.querySelector(`.error-hint[data-for="${inputEl.id}"]`);
  if (hint) {
    hint.textContent = msg;
    hint.classList.add('show');
  }
}

/** 显示 warn-hint（不绑定到具体 input，如 min==max 场景） */
function showWarnHint(panelId, dataFor, msg) {
  const hint = document.querySelector(`#${panelId} .warn-hint[data-for="${dataFor}"]`);
  if (hint) {
    hint.textContent = msg;
    hint.classList.add('show');
  }
}

/** 验证整数字段：非空、整数、在范围内。返回 { valid, level, msg } */
function validateIntField(inputEl, label, min, max) {
  const raw = inputEl.value.trim();
  if (raw === '') {
    return { valid: false, level: 'error', msg: `请输入${label}` };
  }
  // 不能是小数 / 非数字
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    return { valid: false, level: 'error', msg: `${label}必须为整数` };
  }
  if (num < min || num > max) {
    return { valid: false, level: 'error', msg: `${label}必须在 ${min}–${max} 之间` };
  }
  return { valid: true, level: 'ok', msg: '' };
}

// ============================================================
// 各面板校验（供 blur 和 generate 共用）
// ============================================================

/** 校验小数面板。返回 { valid }（valid=false 则已标记错误） */
function validateDecimalPanel() {
  clearPanelErrors('panel-decimal');
  const el = document.getElementById('dec-places');
  const b = BOUNDS.decimalPlaces;
  const r = validateIntField(el, '小数位数', b.min, b.max);
  if (!r.valid) {
    showInputError(el, r.level, r.msg);
  }
  return r;
}

/** 校验整数面板。返回 { valid, level }（warn 仍允许生成） */
function validateIntegerPanel() {
  clearPanelErrors('panel-integer');
  const minEl = document.getElementById('int-min');
  const maxEl = document.getElementById('int-max');

  // 分别校验两个字段
  const rMin = validateIntField(minEl, '最小值', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
  const rMax = validateIntField(maxEl, '最大值', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

  if (!rMin.valid) showInputError(minEl, 'error', rMin.msg);
  if (!rMax.valid) showInputError(maxEl, 'error', rMax.msg);
  if (!rMin.valid || !rMax.valid) {
    return { valid: false, level: 'error' };
  }

  const min = parseInt(minEl.value, 10);
  const max = parseInt(maxEl.value, 10);

  // min > max → 显示对调按钮，拒绝生成
  if (min > max) {
    showInputError(minEl, 'error', '最小值不能大于最大值');
    showInputError(maxEl, 'error', '最小值不能大于最大值');
    swapInt.classList.add('show');
    return { valid: false, level: 'error', suggestSwap: true };
  }

  // min == max → 黄框警告，但允许生成
  if (min === max) {
    showInputError(minEl, 'warn', '范围为零');
    showInputError(maxEl, 'warn', '范围为零');
    showWarnHint('panel-integer', 'int-pair', `范围为零，只能生成固定值 ${min}`);
    return { valid: true, level: 'warn' };
  }

  return { valid: true, level: 'ok' };
}

/** 校验口令面板 */
function validatePasswordPanel() {
  clearPanelErrors('panel-password');
  const el = document.getElementById('pwd-length');
  const b = BOUNDS.passwordLength;
  const r = validateIntField(el, '口令长度', b.min, b.max);
  if (!r.valid) {
    showInputError(el, r.level, r.msg);
  }
  applyPwdSecurityLevel();
  return r;
}

/** 校验序列面板 */
function validateSequencePanel() {
  clearPanelErrors('panel-sequence');
  const countEl  = document.getElementById('seq-count');
  const type     = document.getElementById('seq-type').value;

  // 校验数量
  const bCount = BOUNDS.seqCount;
  const rCount = validateIntField(countEl, '随机数数量', bCount.min, bCount.max);
  if (!rCount.valid) {
    showInputError(countEl, rCount.level, rCount.msg);
    return rCount;
  }

  if (type === 'decimal') {
    const placesEl = document.getElementById('seq-dec-places');
    const bDec = BOUNDS.decimalPlaces;
    const rDec = validateIntField(placesEl, '小数位数', bDec.min, bDec.max);
    if (!rDec.valid) {
      showInputError(placesEl, rDec.level, rDec.msg);
      return rDec;
    }
  } else {
    // 整数类型 — 复用整数面板的校验逻辑
    const minEl = document.getElementById('seq-int-min');
    const maxEl = document.getElementById('seq-int-max');

    const rMin = validateIntField(minEl, '最小值', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);
    const rMax = validateIntField(maxEl, '最大值', -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER);

    if (!rMin.valid) showInputError(minEl, 'error', rMin.msg);
    if (!rMax.valid) showInputError(maxEl, 'error', rMax.msg);
    if (!rMin.valid || !rMax.valid) {
      return { valid: false, level: 'error' };
    }

    const min = parseInt(minEl.value, 10);
    const max = parseInt(maxEl.value, 10);

    if (min > max) {
      showInputError(minEl, 'error', '最小值不能大于最大值');
      showInputError(maxEl, 'error', '最小值不能大于最大值');
      swapSeqInt.classList.add('show');
      return { valid: false, level: 'error', suggestSwap: true };
    }

    if (min === max) {
      showInputError(minEl, 'warn', '范围为零');
      showInputError(maxEl, 'warn', '范围为零');
      showWarnHint('panel-sequence', 'seq-int-pair', `范围为零，只能生成固定值 ${min}`);
      return { valid: true, level: 'warn' };
    }
  }

  return { valid: true, level: 'ok' };
}

/** 校验当前活跃标签页 → generate() 的守门人 */
function validateActiveTab() {
  switch (activeTab) {
    case 'decimal':  return validateDecimalPanel();
    case 'integer':  return validateIntegerPanel();
    case 'password': return validatePasswordPanel();
    case 'rgb':      return { valid: true, level: 'ok' }; // 颜色无需参数
    case 'sequence': return validateSequencePanel();
    default:         return { valid: true, level: 'ok' };
  }
}

// ============================================================
// 对调逻辑
// ============================================================

function doSwap(minId, maxId, swapBtn) {
  const minEl = document.getElementById(minId);
  const maxEl = document.getElementById(maxId);
  const tmp = minEl.value;
  minEl.value = maxEl.value;
  maxEl.value = tmp;
  swapBtn.classList.remove('show');
  // 重新校验
  const panelId = swapBtn.closest('.panel').id;
  if (panelId === 'panel-integer') validateIntegerPanel();
  else if (panelId === 'panel-sequence') validateSequencePanel();
}

// ============================================================
// 颜色原始值存储（供小复制按钮使用）
// ============================================================
let lastColor = { r: 0, g: 0, b: 0 };
let alphaLocked = false;
let lockedAlpha = 1;
let colorEverGenerated = false;
let alphaRandom = false;

// ============================================================
// 主题 / 可见性 / 设置
// ============================================================

function applyTheme(name) {
  let primary, light, rgb;
  if (name === 'custom' && settings.customColor) {
    const c = settings.customColor;
    primary = c;
    light   = lightenHex(c, 0.25);
    rgb     = hexToRgb(c);
  } else {
    const t = THEMES[name] || THEMES.purple;
    primary = t.primary; light = t.light; rgb = t.rgb;
  }
  const root = document.documentElement;
  root.style.setProperty('--primary',       primary);
  root.style.setProperty('--primary-light', light);
  root.style.setProperty('--primary-rgb',   rgb);
  root.style.setProperty('--primary-15',    `rgba(${rgb}, 0.15)`);
  root.style.setProperty('--primary-35',    `rgba(${rgb}, 0.35)`);
  root.style.setProperty('--tab-hover-bg',  `rgba(${rgb}, 0.06)`);

  document.querySelectorAll('.color-preset').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.color === name);
  });
  document.getElementById('input-custom-color').value = (name === 'custom') ? settings.customColor : '';
}

/** hex → "R, G, B" 字符串 */
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return `${parseInt(h.slice(0, 2), 16)}, ${parseInt(h.slice(2, 4), 16)}, ${parseInt(h.slice(4, 6), 16)}`;
}

/** hex 颜色变亮 ratio（0-1） */
function lightenHex(hex, ratio) {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) + (255 - parseInt(h.slice(0, 2), 16)) * ratio);
  const g = Math.round(parseInt(h.slice(2, 4), 16) + (255 - parseInt(h.slice(2, 4), 16)) * ratio);
  const b = Math.round(parseInt(h.slice(4, 6), 16) + (255 - parseInt(h.slice(4, 6), 16)) * ratio);
  return `#${Math.min(255, r).toString(16).padStart(2, '0')}${Math.min(255, g).toString(16).padStart(2, '0')}${Math.min(255, b).toString(16).padStart(2, '0')}`;
}

function applyVisibility(list) {
  const tabs = document.querySelectorAll('#tabs .tab');
  tabs.forEach(tab => {
    tab.style.display = list.includes(tab.dataset.tab) ? '' : 'none';
  });
  if (!list.includes(activeTab)) {
    switchTab(list[0]);
  }
  document.querySelectorAll('.tab-vis-toggle').forEach(cb => {
    cb.checked = list.includes(cb.dataset.tab);
  });
}

/** FLIP 动画：记录位置 → 改 order → 反转变换 → 过渡到原位 */
function flipAnimate(containerSelector, itemSelector, getKey, newOrder) {
  const container = document.querySelector(containerSelector);
  const items = [...container.querySelectorAll(itemSelector)];
  const oldPos = {};
  items.forEach(el => { oldPos[getKey(el)] = el.getBoundingClientRect(); });

  // 改 order
  items.forEach(el => { el.style.order = newOrder.indexOf(getKey(el)); });

  // FLIP
  items.forEach(el => {
    const key = getKey(el);
    const old = oldPos[key];
    if (!old) return;
    const now = el.getBoundingClientRect();
    const dx = old.left - now.left;
    const dy = old.top - now.top;
    if (dx !== 0 || dy !== 0) {
      el.style.transition = 'none';
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      requestAnimationFrame(() => {
        el.style.transition = 'transform 0.25s ease';
        el.style.transform = '';
        el.addEventListener('transitionend', function cb() {
          el.removeEventListener('transitionend', cb);
          el.style.transition = '';
        }, { once: true });
      });
    }
  });
}

/** 依 tabOrder 重排 tab 栏和设置页行（带 FLIP 动画） */
function applyTabOrder() {
  const order = settings.tabOrder;
  flipAnimate('#tabs', '.tab', el => el.dataset.tab, order);
  flipAnimate('#visibility-toggles', '.tab-order-row', el => el.querySelector('.tab-vis-toggle')?.dataset.tab || '', order);
}

function moveTabOrder(tabName, direction) {
  const order = settings.tabOrder;
  const idx = order.indexOf(tabName);
  const newIdx = idx + direction;
  if (newIdx < 0 || newIdx >= order.length) return;
  [order[idx], order[newIdx]] = [order[newIdx], order[idx]];
  applyTabOrder();
  saveSettings();
}

function applyColorMode() {
  const advanced = settings.colorAdvanced;
  document.getElementById('color-advanced').classList.toggle('show', advanced);
  document.getElementById('row-rgb').style.display = advanced ? '' : 'none';
  document.getElementById('row-hsl').style.display = advanced ? '' : 'none';
  document.getElementById('row-lab').style.display = advanced ? '' : 'none';
  document.getElementById('row-cmyk').style.display = advanced ? '' : 'none';
  document.getElementById('chk-color-advanced').checked = advanced;
}

function switchTab(name) {
  activeTab = name;
  document.querySelectorAll('#tabs .tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

  const tabBtn = document.querySelector(`#tabs .tab[data-tab="${name}"]`);
  if (tabBtn) tabBtn.classList.add('active');
  const panel = document.getElementById(`panel-${name}`);
  if (panel) panel.classList.add('active');
}

function saveSettings() {
  chrome.storage.local.set({ settings });
}

function savePrefs() {
  settings.prefs = {
    decPlaces: document.getElementById('dec-places').value,
    intMin: document.getElementById('int-min').value, intMax: document.getElementById('int-max').value,
    pwdLength: document.getElementById('pwd-length').value,
    pwdUpper: document.getElementById('pwd-upper').checked, pwdLower: document.getElementById('pwd-lower').checked,
    pwdDigit: document.getElementById('pwd-digit').checked, pwdSpecial: document.getElementById('pwd-special').checked,
    seqCount: document.getElementById('seq-count').value, seqType: document.getElementById('seq-type').value,
    seqDecPlaces: document.getElementById('seq-dec-places').value,
    seqIntMin: document.getElementById('seq-int-min').value, seqIntMax: document.getElementById('seq-int-max').value,
  };
  saveSettings();
}

function loadPrefs() {
  const p = { ...DEFAULT_PREFS, ...(settings.prefs || {}) };
  document.getElementById('dec-places').value = p.decPlaces;
  document.getElementById('int-min').value = p.intMin;
  document.getElementById('int-max').value = p.intMax;
  document.getElementById('pwd-length').value = p.pwdLength;
  document.getElementById('pwd-upper').checked = p.pwdUpper;
  document.getElementById('pwd-lower').checked = p.pwdLower;
  document.getElementById('pwd-digit').checked = p.pwdDigit;
  document.getElementById('pwd-special').checked = p.pwdSpecial;
  document.getElementById('seq-count').value = p.seqCount;
  document.getElementById('seq-type').value = p.seqType;
  document.getElementById('seq-dec-places').value = p.seqDecPlaces;
  document.getElementById('seq-int-min').value = p.seqIntMin;
  document.getElementById('seq-int-max').value = p.seqIntMax;
  // 序列类型对应 UI 显隐
  const isDecimal = p.seqType === 'decimal';
  document.querySelector('.seq-decimal-config').style.display = isDecimal ? '' : 'none';
  document.querySelector('.seq-integer-config').style.display = isDecimal ? 'none' : '';
}

// ============================================================
// 历史记录
// ============================================================

function saveHistory() {
  chrome.storage.local.set({ history });
}

function addHistory(tab, value, extra) {
  history.unshift({
    tab,
    label: TAB_LABELS[tab] || tab,
    value,
    time: Date.now(),
    extra: extra || null,
  });
  if (history.length > HISTORY_MAX) history.length = HISTORY_MAX;
  saveHistory();
}

function loadHistory() {
  chrome.storage.local.get('history', (data) => {
    history = data.history || [];
    renderHistory();
  });
}

function renderHistory() {
  const list = document.getElementById('history-list');
  if (!history.length) {
    list.innerHTML = '<p class="history-empty">暂无记录</p>';
    return;
  }
  list.innerHTML = history.map((h, i) => {
    const d = new Date(h.time);
    const timeStr = `${d.getMonth() + 1}/${d.getDate()} ${d.toLocaleTimeString('zh-CN', { hour12: false })}`;
    const displayVal = h.extra ? h.extra.hex : h.value;
    const escaped = displayVal.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const titleVal = h.extra ? JSON.stringify(h.extra) : h.value;
    const labelEsc = h.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return `<div class="history-item">
      <span class="history-badge">${labelEsc}</span>
      <span class="history-value" title="${titleVal.replace(/"/g, '&quot;')}">${escaped}</span>
      <button class="history-copy-btn" data-idx="${i}" title="复制此条">📋</button>
      <span class="history-time">${timeStr}</span>
    </div>`;
  }).join('');
}

function clearHistory() {
  const btn = document.getElementById('btn-clear-history');
  if (btn.classList.contains('confirm')) {
    history = [];
    saveHistory();
    renderHistory();
    btn.textContent = '🗑️ 清空';
    btn.classList.remove('confirm');
  } else {
    btn.textContent = '确认清空？';
    btn.classList.add('confirm');
    setTimeout(() => {
      if (btn.classList.contains('confirm')) {
        btn.textContent = '🗑️ 清空';
        btn.classList.remove('confirm');
      }
    }, 1500);
  }
}

function loadSettings() {
  chrome.storage.local.get('settings', (data) => {
    if (data.settings) {
      settings = { ...settings, ...data.settings };
      // 类型 / 边界校验
      if (!Array.isArray(settings.visibleTabs) || settings.visibleTabs.length < 2) {
        settings.visibleTabs = [...ALL_TABS];
      }
      if (!Array.isArray(settings.tabOrder) || settings.tabOrder.length !== ALL_TABS.length) {
        settings.tabOrder = [...ALL_TABS];
      }
      if (!THEMES[settings.theme] && settings.theme !== 'custom') {
        settings.theme = 'purple';
      }
      if (typeof settings.colorAdvanced !== 'boolean') settings.colorAdvanced = false;
      if (!['default','low','medium','high'].includes(settings.pwdSecurityLevel)) {
        settings.pwdSecurityLevel = 'default';
      }
      if (typeof settings.customColor !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(settings.customColor || '')) {
        settings.customColor = null;
      }
      if (!settings.prefs || typeof settings.prefs !== 'object') settings.prefs = {};
    }
    if (settings.tabOrder) applyTabOrder();
    applyTheme(settings.theme);
    applyVisibility(settings.visibleTabs);
    applyColorMode();
    applyPwdSecurityLevel();
    loadPrefs();
  });
}

function showMain() {
  mainView.classList.remove('hidden');
  settingsView.classList.remove('active');
  btnSettings.classList.remove('active');
}

function showSettings() {
  mainView.classList.add('hidden');
  settingsView.classList.add('active');
  btnSettings.classList.add('active');
  document.querySelectorAll('.tab-vis-toggle').forEach(cb => {
    cb.checked = settings.visibleTabs.includes(cb.dataset.tab);
  });
  document.getElementById('chk-color-advanced').checked = settings.colorAdvanced;
  document.getElementById('sel-pwd-security').value = settings.pwdSecurityLevel;
  document.getElementById('input-custom-color').value = settings.customColor || '';
  loadHistory();
}

// ============================================================
// 生成逻辑
// ============================================================

function getActiveResultInput() {
  const panel = document.querySelector('.panel.active');
  return panel ? panel.querySelector('input[type="text"]') : null;
}

function generateDecimal(places = 3) {
  return Math.random().toFixed(Math.max(BOUNDS.decimalPlaces.min, Math.min(BOUNDS.decimalPlaces.max, places)));
}

function generateInteger(min = 0, max = 100) {
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return String(Math.floor(Math.random() * (hi - lo + 1)) + lo);
}

/** 密码学安全随机整数 [0, max) — 使用 CSPRNG 且无偏 */
function secureRandom(max) {
  if (!Number.isInteger(max) || max <= 0) return 0;
  // 消除取模偏差：拒绝 ≥ max 的倍数
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let r;
  do { crypto.getRandomValues(buf); r = buf[0]; } while (r >= limit);
  return r % max;
}

function generatePassword(length = 16, options = {}) {
  const { upper = true, lower = true, digit = true, special = true } = options;
  const pools = [], required = [];
  if (upper)   { pools.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ'); required.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ'); }
  if (lower)   { pools.push('abcdefghijklmnopqrstuvwxyz'); required.push('abcdefghijklmnopqrstuvwxyz'); }
  if (digit)   { pools.push('0123456789');                 required.push('0123456789'); }
  if (special) { pools.push('!@#$%^&*()_+-=[]{}|;:,.<>?'); required.push('!@#$%^&*()_+-=[]{}|;:,.<>?'); }
  if (pools.length === 0) return '（请至少选择一种字符类型）';

  // 降低特殊字符权重：构建全字符池时，非特殊字符重复 3 遍
  const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  let all;
  if (special && pools.length > 1) {
    const nonSpecial = pools.filter(p => p !== specialChars).join('');
    all = nonSpecial.repeat(3) + specialChars;
  } else {
    all = pools.join('');
  }

  const pwd = required.map(p => p[secureRandom(p.length)]);
  while (pwd.length < length) pwd.push(all[secureRandom(all.length)]);
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = secureRandom(i + 1);
    [pwd[i], pwd[j]] = [pwd[j], pwd[i]];
  }
  // 首位不能是特殊字符：如果选中了特殊字符 && 还有其他字符类型可选，则把首位特殊字符与后面第一个非特殊字符对调
  if (special && pools.length > 1) {
    const specials = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    if (specials.includes(pwd[0])) {
      for (let i = 1; i < pwd.length; i++) {
        if (!specials.includes(pwd[i])) {
          [pwd[0], pwd[i]] = [pwd[i], pwd[0]];
          break;
        }
      }
    }
  }
  return pwd.join('');
}

/** RGB(0-255) → LAB (CIELAB D65)，返回 { L, A, B } 整数 */
function computeLAB(r, g, b) {
  const rf = r / 255, gf = g / 255, bf = b / 255;
  const toLinear = c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  const lr = toLinear(rf), lg = toLinear(gf), lb = toLinear(bf);
  const x = 0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb;
  const y = 0.2126729 * lr + 0.7151522 * lg + 0.0721750 * lb;
  const z = 0.0193339 * lr + 0.1191920 * lg + 0.9503041 * lb;
  const fLab = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  const fy = fLab(y), fx = fLab(x / 0.95047), fz = fLab(z / 1.08883);
  return {
    L: Math.round(116 * fy - 16),
    A: Math.round(500 * (fx - fy)),
    B: Math.round(200 * (fy - fz)),
  };
}

function generateColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);

  const rf = r / 255, gf = g / 255, bf = b / 255;
  const max = Math.max(rf, gf, bf), min = Math.min(rf, gf, bf);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rf)      h = ((gf - bf) / delta + (gf < bf ? 6 : 0)) * 60;
    else if (max === gf) h = ((bf - rf) / delta + 2) * 60;
    else                 h = ((rf - gf) / delta + 4) * 60;
  }
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  // ---- LAB (CIELAB D65) ----
  const { L, A, B } = computeLAB(r, g, b);

  // ---- CMYK ----
  let C = 0, M = 0, Y = 0, K = 0;
  const k0 = 1 - Math.max(rf, gf, bf);
  if (k0 < 1) {
    C = Math.round((1 - rf - k0) / (1 - k0) * 100);
    M = Math.round((1 - gf - k0) / (1 - k0) * 100);
    Y = Math.round((1 - bf - k0) / (1 - k0) * 100);
    K = Math.round(k0 * 100);
  } else {
    K = 100;
  }

  return {
    r, g, b,
    hr: Math.round(h), hs: Math.round(s * 100), hl: Math.round(l * 100),
    labL: L, labA: A, labB: B,
    cmykC: C, cmykM: M, cmykY: Y, cmykK: K,
    rgb: `rgb(${r}, ${g}, ${b})`,
    hex: `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`,
    hsl: `hsl(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`,
    lab: `(${L}, ${A}, ${B})`,
    cmyk: `(${C}%, ${M}%, ${Y}%, ${K}%)`,
  };
}

// ---------- 摇取 ----------
function generate() {
  // 硬校验 — 不通过则拒绝生成
  const v = validateActiveTab();
  if (!v.valid) return;

  switch (activeTab) {
    case 'decimal': {
      const places = parseInt(document.getElementById('dec-places').value) || 3;
      const val = generateDecimal(places);
      document.getElementById('dec-result').value = val;
      addHistory('decimal', val);
      break;
    }
    case 'integer': {
      const min = parseInt(document.getElementById('int-min').value) || 0;
      const max = parseInt(document.getElementById('int-max').value) || 100;
      const val = generateInteger(min, max);
      document.getElementById('int-result').value = val;
      addHistory('integer', val);
      break;
    }
    case 'password': {
      const length = parseInt(document.getElementById('pwd-length').value) || 16;
      const val = generatePassword(length, {
        upper:   document.getElementById('pwd-upper').checked,
        lower:   document.getElementById('pwd-lower').checked,
        digit:   document.getElementById('pwd-digit').checked,
        special: document.getElementById('pwd-special').checked,
      });
      document.getElementById('pwd-result').value = val;
      applyPwdSecurityLevel();
      if (settings.pwdSecurityLevel !== 'high') addHistory('password', val);
      break;
    }
    case 'rgb': {
      const c = generateColor();
      lastColor = { r: c.r, g: c.g, b: c.b, h: c.hr, s: c.hs, l: c.hl, lab: c.lab, cmyk: c.cmyk, labL: c.labL, labA: c.labA, labB: c.labB };

      // 简约模式：仅 HEX + 预览
      if (!settings.colorAdvanced) {
        document.getElementById('hex-result').value = c.hex;
        document.getElementById('color-preview').style.backgroundColor = c.rgb;
        const hint = document.querySelector('#panel-rgb .warn-hint[data-for="color-similar"]');
        const BGR = 245, BGG = 245, BGB = 249;
        const dist = Math.sqrt((c.r - BGR) ** 2 + (c.g - BGG) ** 2 + (c.b - BGB) ** 2);
        if (dist < 28) {
          hint.textContent = '⚠️ 生成的颜色与插件背景色非常相近，预览可能不明显';
          hint.classList.add('show');
        } else {
          hint.classList.remove('show');
        }
        addHistory('rgb', c.hex);
        break;
      }

      // 高级模式
      // 首次生成 → 显示透明度控制块
      if (!colorEverGenerated) {
        colorEverGenerated = true;
        document.getElementById('alpha-block').classList.add('show');
      }

      // 确定本次透明度
      let alpha;
      if (alphaRandom) {
        alpha = Math.floor(Math.random() * 101) / 100;
        document.getElementById('alpha-range').value = Math.round(alpha * 100);
        syncAlphaControls();
      } else if (alphaLocked) {
        alpha = lockedAlpha;
        document.getElementById('alpha-range').value = Math.round(alpha * 100);
      } else {
        alpha = 1;
        document.getElementById('alpha-range').value = 100;
      }

      updateColorDisplay(alpha);

      // LAB / CMYK 固定（不受 alpha 影响）
      document.getElementById('lab-result').value = c.lab;
      document.getElementById('cmyk-result').value = c.cmyk;

      // 检测背景色相近
      const hint = document.querySelector('#panel-rgb .warn-hint[data-for="color-similar"]');
      const BGR = 245, BGG = 245, BGB = 249;
      const dist = Math.sqrt((c.r - BGR) ** 2 + (c.g - BGG) ** 2 + (c.b - BGB) ** 2);
      if (dist < 28 && alpha >= 1) {
        hint.textContent = '⚠️ 生成的颜色与插件背景色非常相近，预览可能不明显';
        hint.classList.add('show');
      } else {
        hint.classList.remove('show');
      }
      addHistory('rgb-advanced', document.getElementById('hex-result').value, {
        hex:  document.getElementById('hex-result').value,
        rgb:  document.getElementById('rgb-result').value,
        hsl:  document.getElementById('hsl-result').value,
        lab:  document.getElementById('lab-result').value,
        cmyk: document.getElementById('cmyk-result').value,
      });
      break;
    }
    case 'sequence': {
      const count = parseInt(document.getElementById('seq-count').value) || 5;
      const type  = document.getElementById('seq-type').value;
      const results = [];
      if (type === 'decimal') {
        const places = parseInt(document.getElementById('seq-dec-places').value) || 3;
        for (let i = 0; i < count; i++) results.push(Number(generateDecimal(places)));
      } else {
        const min = parseInt(document.getElementById('seq-int-min').value) || 0;
        const max = parseInt(document.getElementById('seq-int-max').value) || 100;
        for (let i = 0; i < count; i++) results.push(Number(generateInteger(min, max)));
      }
      const val = JSON.stringify(results);
      document.getElementById('seq-result').value = val;
      addHistory('sequence', val);
      break;
    }
  }
  savePrefs();
}

// ---------- 复制 ----------

/** 执行剪贴板写入 */
async function writeClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // 回退方案
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
}

/** 闪一下按钮文字 */
function flashBtn(btn, original, duration = 1200, successText = '✅ 已复制') {
  btn.textContent = successText;
  setTimeout(() => { btn.textContent = original; }, duration);
}

/** 全局“复制”按钮 */
async function copy() {
  if (activeTab === 'rgb') {
    const hex = document.getElementById('hex-result').value;
    if (!hex) return;
    let text;
    if (settings.colorAdvanced) {
      const rgb  = document.getElementById('rgb-result').value;
      const hsl  = document.getElementById('hsl-result').value;
      const lab  = document.getElementById('lab-result').value;
      const cmyk = document.getElementById('cmyk-result').value;
      text = `${rgb}; ${hex}; ${hsl}; ${lab}; ${cmyk}`;
    } else {
      text = hex;
    }
    await writeClipboard(text);
    flashBtn(btnCopy, '📋 复制');
  } else {
    const input = getActiveResultInput();
    if (!input || !input.value) return;
    await writeClipboard(input.value);
    flashBtn(btnCopy, '📋 复制');
  }
}

/** 小复制按钮 — 复制单个颜色字段（按特定格式） */
async function copyColorField(type) {
  let text = '';
  switch (type) {
    case 'rgb':
      text = `${lastColor.r}, ${lastColor.g}, ${lastColor.b}`;
      break;
    case 'hex':
      text = document.getElementById('hex-result').value;
      break;
    case 'hsl':
      text = document.getElementById('hsl-result').value;
      break;
    case 'lab':
      text = document.getElementById('lab-result').value;
      break;
    case 'cmyk':
      text = document.getElementById('cmyk-result').value;
      break;
  }
  if (!text) return;
  await writeClipboard(text);
  // 闪一下被点击的小按钮
  const btn = document.querySelector(`.copy-mini[data-copy="${type}"]`);
  if (btn) flashBtn(btn, '📋');
}

/** 根据透明度滑块更新颜色预览与输出字段 */
function updateColorDisplay(alpha) {
  const { r, g, b, h, s, l } = lastColor;
  const showAlpha = document.getElementById('chk-show-alpha').checked;
  const pct = Math.round(alpha * 100);

  // 预览：使用 rgba 带透明度
  document.getElementById('color-preview').style.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  document.getElementById('alpha-input').value = pct;

  if (alpha >= 1 && !showAlpha) {
    // 完全不透明且不强制显示 alpha → 无 alpha 后缀
    document.getElementById('rgb-result').value = `rgb(${r}, ${g}, ${b})`;
    document.getElementById('hex-result').value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    document.getElementById('hsl-result').value = `hsl(${h}, ${s}%, ${l}%)`;
  } else {
    // 有透明度 或 勾选了"100%时也显示alpha格式"
    const a = Math.min(1, Math.max(0, alpha));
    document.getElementById('rgb-result').value = `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
    const aHex = Math.round(a * 255).toString(16).padStart(2, '0');
    document.getElementById('hex-result').value = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}${aHex}`;
    document.getElementById('hsl-result').value = `hsla(${h}, ${s}%, ${l}%, ${a.toFixed(2)})`;
  }

  // LAB：随透明度 blend 到背景色后重算
  if (alpha >= 1) {
    const { labL, labA, labB } = lastColor;
    document.getElementById('lab-result').value = `(${labL}, ${labA}, ${labB})`;
  } else {
    const BGR = 245, BGG = 245, BGB = 249;
    const br = Math.round(r * alpha + BGR * (1 - alpha));
    const bg = Math.round(g * alpha + BGG * (1 - alpha));
    const bb = Math.round(b * alpha + BGB * (1 - alpha));
    const blab = computeLAB(br, bg, bb);
    document.getElementById('lab-result').value = `(${blab.L}, ${blab.A}, ${blab.B})`;
  }

}

/** 根据"透明度参与随机"勾选状态，禁用/启用手动透明度控件 */
function syncAlphaControls() {
  const disabled = alphaRandom;
  const slider  = document.getElementById('alpha-range');
  const input   = document.getElementById('alpha-input');
  const lockBtn = document.getElementById('btn-lock-alpha');
  const showChk = document.getElementById('chk-show-alpha');

  document.querySelector('.opacity-slider').classList.toggle('dimmed', disabled);
  document.querySelector('.alpha-tools').classList.toggle('dimmed', disabled);
  slider.disabled = disabled;
  input.disabled = disabled;
  lockBtn.disabled = disabled;
  showChk.disabled = disabled;

  if (disabled) {
    // 强制勾选并锁定"100%时也显示alpha格式"
    showChk.checked = true;
  }
}

// ============================================================
// 事件绑定
// ============================================================

// 设置齿轮
btnSettings.addEventListener('click', showSettings);
btnBack.addEventListener('click', () => {
  showMain();
  saveSettings();
});

// 清空历史
document.getElementById('btn-clear-history').addEventListener('click', clearHistory);

// 导出历史 JSON
document.getElementById('btn-export-history').addEventListener('click', function () {
  const data = history.map(h => ({
    tab:     h.tab,
    label:   h.label,
    value:   h.value,
    time:    new Date(h.time).toISOString(),
    extra:   h.extra || undefined,
  }));
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `random-generator-history-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  flashBtn(this, '📤 导出', 1200, '✅ 已导出');
});

// 历史列表 — 单条复制
document.getElementById('history-list').addEventListener('click', async (e) => {
  const btn = e.target.closest('.history-copy-btn');
  if (!btn) return;
  const idx = parseInt(btn.dataset.idx, 10);
  if (idx >= 0 && idx < history.length) {
    const rec = history[idx];
    const text = rec.extra ? JSON.stringify(rec.extra) : rec.value;
    await writeClipboard(text);
    flashBtn(btn, '📋');
  }
});

// 标签切换
document.querySelector('#tabs').addEventListener('click', (e) => {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  switchTab(tab.dataset.tab);
});

// 序列类型切换 — 同时清除序列面板错误
document.getElementById('seq-type').addEventListener('change', function () {
  const isDecimal = this.value === 'decimal';
  document.querySelector('.seq-decimal-config').style.display = isDecimal ? '' : 'none';
  document.querySelector('.seq-integer-config').style.display = isDecimal ? 'none' : '';
  clearPanelErrors('panel-sequence');
});

// 主题预设点击
document.getElementById('color-presets').addEventListener('click', (e) => {
  const preset = e.target.closest('.color-preset');
  if (!preset) return;
  settings.theme = preset.dataset.color;
  settings.customColor = null;
  applyTheme(settings.theme);
  saveSettings();
});

// 自定义颜色输入
const inputCustomColor = document.getElementById('input-custom-color');
inputCustomColor.addEventListener('input', () => {
  // 输入时实时清除错误状态
  inputCustomColor.classList.remove('input-error');
  document.querySelector('.error-hint[data-for="input-custom-color"]').classList.remove('show');
});
inputCustomColor.addEventListener('blur', () => applyCustomColor());
inputCustomColor.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyCustomColor(); });

function applyCustomColor() {
  let raw = inputCustomColor.value.trim();
  const hint = document.querySelector('.error-hint[data-for="input-custom-color"]');
  if (!raw) {
    hint.classList.remove('show');
    return;
  }
  // 去掉用户可能输入的 # 前缀
  raw = raw.replace(/^#/, '');
  // 必须是正好 6 位十六进制
  if (!/^[0-9a-fA-F]{6}$/.test(raw)) {
    inputCustomColor.classList.add('input-error');
    hint.textContent = '请输入合法 6 位 HEX，如 a1b2c3 或 #a1b2c3';
    hint.classList.add('show');
    return;
  }
  const hex = '#' + raw.toLowerCase();
  inputCustomColor.classList.remove('input-error');
  hint.classList.remove('show');
  // 回填带 # 的完整格式
  inputCustomColor.value = hex;
  settings.theme = 'custom';
  settings.customColor = hex;
  applyTheme('custom');
  saveSettings();
}

// 颜色生成器高级模式
document.getElementById('chk-color-advanced').addEventListener('change', function () {
  settings.colorAdvanced = this.checked;
  applyColorMode();
  saveSettings();
});

document.getElementById('sel-pwd-security').addEventListener('change', function () {
  const lvl = this.value;
  if (lvl === 'high' && history.some(h => h.tab === 'password')) {
    if (confirm('切换到"高"保密级别将清除所有已有的口令历史记录，是否继续？')) {
      settings.pwdSecurityLevel = lvl;
      history = history.filter(h => h.tab !== 'password');
      saveHistory();
      renderHistory();
    } else {
      this.value = settings.pwdSecurityLevel;
      return;
    }
  } else {
    settings.pwdSecurityLevel = lvl;
  }
  applyPwdSecurityLevel();
  saveSettings();
});

/** 依 pwdSecurityLevel 控制：掩码、切换按钮、历史告警 */
function applyPwdSecurityLevel() {
  const inp = document.getElementById('pwd-result');
  const btn = document.getElementById('btn-toggle-pwd');
  const hint = document.getElementById('hint-pwd-history');
  const lvl = settings.pwdSecurityLevel;

  // 掩码
  if (lvl === 'low') {
    inp.classList.remove('pwd-masked');
    inp.classList.add('pwd-visible');
  } else {
    inp.classList.add('pwd-masked');
    inp.classList.remove('pwd-visible');
  }
  btn.textContent = (lvl === 'low') ? '🙈' : '👁️';

  // 告警：仅默认模式显示
  hint.classList.toggle('show', lvl === 'default');
}

// 口令遮盖切换（低模式禁用）
document.getElementById('btn-toggle-pwd').addEventListener('click', function () {
  if (settings.pwdSecurityLevel === 'low') return;
  const inp = document.getElementById('pwd-result');
  if (inp.classList.contains('pwd-masked')) {
    inp.classList.remove('pwd-masked');
    inp.classList.add('pwd-visible');
    this.textContent = '🙈';
  } else {
    inp.classList.add('pwd-masked');
    inp.classList.remove('pwd-visible');
    this.textContent = '👁️';
  }
});

// 可见性勾选（最少 2 项）
document.getElementById('visibility-toggles').addEventListener('change', (e) => {
  if (!e.target.classList.contains('tab-vis-toggle')) return;

  const checked = document.querySelectorAll('.tab-vis-toggle:checked');
  if (checked.length < 2) {
    e.target.checked = true;
    hintMinTabs.classList.add('show');
    setTimeout(() => hintMinTabs.classList.remove('show'), 1800);
    return;
  }
  settings.visibleTabs = Array.from(checked).map(cb => cb.dataset.tab);
  applyVisibility(settings.visibleTabs);
  saveSettings();
});

// 选项卡顺序调整
document.getElementById('visibility-toggles').addEventListener('click', (e) => {
  const btn = e.target.closest('.arrow-btn');
  if (!btn) return;
  const direction = btn.classList.contains('arrow-up') ? -1 : 1;
  moveTabOrder(btn.dataset.tab, direction);
});

// 按钮
btnGenerate.addEventListener('click', generate);
btnCopy.addEventListener('click', copy);

// ---------- 对调按钮 ----------
swapInt.addEventListener('click', () => doSwap('int-min', 'int-max', swapInt));
swapSeqInt.addEventListener('click', () => doSwap('seq-int-min', 'seq-int-max', swapSeqInt));

// ---------- 小复制按钮（颜色面板） ----------
document.getElementById('panel-rgb').addEventListener('click', (e) => {
  const mini = e.target.closest('.copy-mini');
  if (!mini) return;
  copyColorField(mini.dataset.copy);
});

// ---------- 透明度滑块 ----------
const alphaRange = document.getElementById('alpha-range');
alphaRange.addEventListener('input', function () {
  const alpha = parseInt(this.value, 10) / 100;
  if (alphaLocked) lockedAlpha = alpha;
  updateColorDisplay(alpha);
});

// ---------- 透明度数字输入 ----------
const alphaInput = document.getElementById('alpha-input');
alphaInput.addEventListener('input', function () {
  const raw = this.value.trim();
  if (raw === '') return; // 允许用户清空，等 blur 再校验
  const num = parseInt(raw, 10);
  if (!isNaN(num) && num >= 0 && num <= 100) {
    // 合法值 → 同步滑块
    document.getElementById('alpha-range').value = num;
    const alpha = num / 100;
    if (alphaLocked) lockedAlpha = alpha;
    updateColorDisplay(alpha);
    clearInputError(this);
  }
});
alphaInput.addEventListener('blur', function () {
  const raw = this.value.trim();
  if (raw === '') {
    showInputError(this, 'error', '请输入透明度');
    return;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || !Number.isInteger(num)) {
    showInputError(this, 'error', '透明度必须为整数');
    // 回退到滑块值
    this.value = document.getElementById('alpha-range').value;
    return;
  }
  if (num < 0 || num > 100) {
    showInputError(this, 'error', '透明度必须在 0–100 之间');
    this.value = document.getElementById('alpha-range').value;
    return;
  }
  // 合法
  clearInputError(this);
  document.getElementById('alpha-range').value = num;
  const alpha = num / 100;
  if (alphaLocked) lockedAlpha = alpha;
  updateColorDisplay(alpha);
});

// ---------- "透明度参与随机" 复选框 ----------
document.getElementById('chk-random-alpha').addEventListener('change', function () {
  alphaRandom = this.checked;
  if (alphaRandom) {
    // 关闭锁（如果有）
    if (alphaLocked) {
      document.getElementById('btn-lock-alpha').click();
    }
    syncAlphaControls();
  } else {
    // 取消勾选 → 恢复控件，滑块停在最后一次随机值
    syncAlphaControls();
    if (colorEverGenerated) {
      const range = document.getElementById('alpha-range');
      const alpha = parseInt(range.value, 10) / 100;
      updateColorDisplay(alpha);
    }
  }
});

// ---------- 锁定透明度按钮 ----------
const btnLockAlpha = document.getElementById('btn-lock-alpha');
btnLockAlpha.addEventListener('click', function () {
  alphaLocked = !alphaLocked;
  if (alphaLocked) {
    lockedAlpha = parseInt(document.getElementById('alpha-range').value, 10) / 100;
    btnLockAlpha.textContent = '🔒 透明度已锁定';
    btnLockAlpha.title = '透明度已锁定，生成随机颜色时继承您已设定的透明度';
    btnLockAlpha.classList.add('locked');
  } else {
    btnLockAlpha.textContent = '🔓 透明度未锁定';
    btnLockAlpha.title = '透明度未锁定，每次生成随机颜色时透明度自动重置到100%';
    btnLockAlpha.classList.remove('locked');
  }
});

// ---------- "100%时也显示alpha格式" 复选框 ----------
document.getElementById('chk-show-alpha').addEventListener('change', function () {
  const alpha = parseInt(document.getElementById('alpha-range').value, 10) / 100;
  updateColorDisplay(alpha);
});

// ---------- Blur 校验（实时反馈）----------
document.getElementById('dec-places').addEventListener('blur', () => {
  if (activeTab === 'decimal') validateDecimalPanel();
});

document.getElementById('int-min').addEventListener('blur', () => {
  if (activeTab === 'integer') validateIntegerPanel();
});
document.getElementById('int-max').addEventListener('blur', () => {
  if (activeTab === 'integer') validateIntegerPanel();
});

document.getElementById('pwd-length').addEventListener('blur', () => {
  if (activeTab === 'password') validatePasswordPanel();
});

document.getElementById('seq-count').addEventListener('blur', () => {
  if (activeTab === 'sequence') validateSequencePanel();
});
document.getElementById('seq-dec-places').addEventListener('blur', () => {
  if (activeTab === 'sequence' && document.getElementById('seq-type').value === 'decimal') {
    validateSequencePanel();
  }
});
document.getElementById('seq-int-min').addEventListener('blur', () => {
  if (activeTab === 'sequence' && document.getElementById('seq-type').value === 'integer') {
    validateSequencePanel();
  }
});
document.getElementById('seq-int-max').addEventListener('blur', () => {
  if (activeTab === 'sequence' && document.getElementById('seq-type').value === 'integer') {
    validateSequencePanel();
  }
});

// ---------- 统一偏好记忆：任一 input/select 变化时保存 ----------
document.querySelector('.tab-content').addEventListener('change', (e) => {
  const el = e.target;
  if (el.matches('input[type="number"], input[type="checkbox"], select')) {
    savePrefs();
  }
});

// ---------- 启动 ----------
loadSettings();
