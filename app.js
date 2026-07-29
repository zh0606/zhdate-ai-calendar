const API_ROOT = String(window.ZHDATE_API_URL || localStorage.getItem("zhdate_api_url") || "http://192.168.1.45:8000").replace(/\/$/, "");
const API_URL = `${API_ROOT}/chat`;
const EVENT_KEY = "zhdate_events_v2";
const CATEGORY = {
  study: { label: "学习", icon: "📖", color: "#afa0c8" },
  life: { label: "生活", icon: "🍵", color: "#eebba6" },
  work: { label: "工作", icon: "💼", color: "#a9b9a2" },
  other: { label: "其他", icon: "✨", color: "#e6c978" }
};

let viewDate = new Date();
let selectedDate = toDateKey(new Date());
let currentFilter = "all";
let events = loadEvents();
let toastTimer;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

function init() {
  renderGreeting();
  renderCalendar();
  renderAgenda();
  bindActions();
  checkApiConnection();
  initPetCompanion();
}

function bindActions() {
  $("#aiSubmitForm").addEventListener("submit", submitSmartInput);
  $("#prevMonth").addEventListener("click", () => changeMonth(-1));
  $("#nextMonth").addEventListener("click", () => changeMonth(1));
  $("#todayBtn").addEventListener("click", goToday);
  $("#quickAddBtn").addEventListener("click", () => openEventDialog(selectedDate));
  $("#dialogClose").addEventListener("click", closeDialog);
  $("#eventForm").addEventListener("submit", saveFromDialog);
  $("#deleteEventBtn").addEventListener("click", deleteFromDialog);
  $("#exportBtn").addEventListener("click", exportEvents);
  $("#importInput").addEventListener("change", importEvents);

  $$(".quick-examples button").forEach((button) => {
    button.addEventListener("click", () => {
      $("#taskInput").value = button.dataset.prompt;
      $("#taskInput").focus();
    });
  });
  $$(".filter-chip").forEach((button) => {
    button.addEventListener("click", () => {
      currentFilter = button.dataset.filter;
      $$(".filter-chip").forEach((item) => item.classList.toggle("active", item === button));
      renderAgenda();
    });
  });

  $("#eventDialog").addEventListener("click", (event) => {
    if (event.target === $("#eventDialog")) closeDialog();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && $("#eventDialog").open) closeDialog();
    if (event.key.toLowerCase() === "n" && !isTyping(event.target)) {
      event.preventDefault();
      openEventDialog(selectedDate);
    }
    if (event.key === "/" && !isTyping(event.target)) {
      event.preventDefault();
      $("#taskInput").focus();
    }
  });
}

function initPetCompanion() {
  const pet = $("#petCompanion");
  const sprite = pet?.querySelector(".pet-orb");
  const bubble = $("#petBubble");
  if (!pet || !sprite || !bubble) return;
  let bubbleTimer;
  let motionFrame;
  const messages = [
    "先完成一件小事吧 ✿",
    "记得喝水，也记得休息。",
    "我会帮你守好今天的计划！",
    "慢慢来，时间站在你这边。",
    "再点一下，我还会跳哦～"
  ];

  const speak = (message) => {
    bubble.textContent = message;
    pet.classList.add("talking");
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => pet.classList.remove("talking"), 3200);
  };

  pet.addEventListener("click", () => {
    const todayEvents = getEventsForDate(toDateKey(new Date()));
    const remaining = todayEvents.filter((item) => !item.done).length;
    const message = remaining
      ? `今天还有 ${remaining} 件事，我陪你慢慢完成。`
      : (todayEvents.length ? "今天的清单完成啦，好厉害！" : messages[Math.floor(Math.random() * messages.length)]);
    pet.classList.remove("excited");
    void pet.offsetWidth;
    pet.classList.add("excited");
    speak(message);
    setTimeout(() => pet.classList.remove("excited"), 850);
  });

  document.addEventListener("pointermove", (event) => {
    if (motionFrame) return;
    motionFrame = requestAnimationFrame(() => {
      const rect = sprite.getBoundingClientRect();
      const x = Math.max(-2.2, Math.min(2.2, (event.clientX - (rect.left + rect.width / 2)) / 90));
      const y = Math.max(-1.7, Math.min(1.7, (event.clientY - (rect.top + rect.height / 2)) / 110));
      sprite.style.setProperty("--look-x", `${x}px`);
      sprite.style.setProperty("--look-y", `${y}px`);
      motionFrame = null;
    });
  }, { passive: true });

  speak("嗨，我会陪你安排好每一天！");
}

function safeParse(value, fallback) {
  try { return value ? JSON.parse(value) : fallback; } catch { return fallback; }
}

async function checkApiConnection() {
  setApiStatus("checking", "正在连接 DeepSeek");
  try {
    const response = await fetchWithTimeout(`${API_ROOT}/`, { method: "GET" }, 5000);
    if (!response.ok) throw new Error("backend unavailable");
    const data = await response.json();
    if (data.ai_enabled) setApiStatus("connected", "DeepSeek 已连接");
    else setApiStatus("warning", "后端已启动 · 未配置密钥");
  } catch {
    setApiStatus("offline", "DeepSeek 后端未连接");
  }
}

function setApiStatus(state, text) {
  const status = $("#apiStatus");
  if (!status) return;
  status.dataset.state = state;
  $("#apiStatusText").textContent = text;
  status.title = `${text}（${API_ROOT}）`;
}

function loadEvents() {
  const saved = safeParse(localStorage.getItem(EVENT_KEY), null);
  if (Array.isArray(saved)) return saved.map(normalizeEvent).filter(Boolean);
  const legacy = safeParse(localStorage.getItem("iris_events"), []);
  if (!Array.isArray(legacy)) return [];
  const migrated = legacy.map(normalizeEvent).filter(Boolean);
  if (migrated.length) localStorage.setItem(EVENT_KEY, JSON.stringify(migrated));
  return migrated;
}

function normalizeEvent(item) {
  if (!item || !item.title || !/^\d{4}-\d{2}-\d{2}$/.test(item.date || "")) return null;
  return {
    id: item.id || makeId(),
    title: String(item.title).slice(0, 60),
    date: item.date,
    time: normalizeTime(item.time),
    category: CATEGORY[item.category] ? item.category : "life",
    note: String(item.note || item.advice || "").slice(0, 120),
    done: Boolean(item.done),
    createdAt: item.createdAt || Date.now()
  };
}

function persist() {
  localStorage.setItem(EVENT_KEY, JSON.stringify(events));
}

function renderGreeting() {
  const now = new Date();
  const hour = now.getHours();
  $("#greeting").textContent = hour < 6 ? "夜深了" : hour < 11 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
  $("#fullDate").textContent = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" }).format(now);
  const quotes = [
    "慢一点也没关系，我们把今天过好。",
    "做完一件小事，也值得认真庆祝。",
    "把重要的事写下来，心就轻一点。",
    "今天的你，也在悄悄向前走。"
  ];
  $("#dailyQuote").textContent = quotes[now.getDate() % quotes.length];
}

function renderCalendar() {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  $("#calendarTitle").textContent = `${year} 年 ${month + 1} 月`;
  const grid = $("#calendarDays");
  grid.innerHTML = "";

  const first = new Date(year, month, 1);
  const mondayOffset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - mondayOffset);
  const todayKey = toDateKey(new Date());

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(start);
    cellDate.setDate(start.getDate() + i);
    const key = toDateKey(cellDate);
    const dayEvents = getEventsForDate(key);
    const markerCategories = [...new Set(dayEvents.map((item) => item.category))].slice(0, 3);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "date-cell";
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", `${cellDate.getMonth() + 1}月${cellDate.getDate()}日，${dayEvents.length}项日程`);
    if (cellDate.getMonth() !== month) button.classList.add("other-month");
    if (key === todayKey) button.classList.add("today");
    if (key === selectedDate) button.classList.add("selected");
    const eventRows = dayEvents.slice(0, 1).map((item) => `<span class="cell-event ${item.category}">${escapeHtml(item.title)}</span>`).join("");
    const markers = markerCategories.length ? `<span class="event-markers" aria-hidden="true">${markerCategories.map((category) => `<i class="${category}"></i>`).join("")}</span>` : "";
    button.innerHTML = `<span class="day-number">${cellDate.getDate()}</span>${key === todayKey ? '<span class="today-label">TODAY</span>' : ""}${markers}<span class="cell-events">${eventRows}${dayEvents.length > 1 ? `<span class="more-count">+${dayEvents.length - 1} 项</span>` : ""}</span>`;
    button.addEventListener("click", () => selectDay(cellDate));
    grid.appendChild(button);
  }
}

function selectDay(date) {
  selectedDate = toDateKey(date);
  if (date.getMonth() !== viewDate.getMonth() || date.getFullYear() !== viewDate.getFullYear()) {
    viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
  }
  renderCalendar();
  renderAgenda();
  if (window.innerWidth < 1050) $("#todayTitle").scrollIntoView({ behavior: "smooth", block: "start" });
}

function changeMonth(offset) {
  viewDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + offset, 1);
  renderCalendar();
}

function goToday() {
  viewDate = new Date();
  selectedDate = toDateKey(viewDate);
  renderCalendar();
  renderAgenda();
}

function renderAgenda() {
  const todayKey = toDateKey(new Date());
  const selected = parseLocalDate(selectedDate);
  const label = selectedDate === todayKey ? "今日清单" : `${selected.getMonth() + 1} 月 ${selected.getDate()} 日`;
  $("#todayTitle").textContent = label;

  const all = getEventsForDate(selectedDate);
  renderAdviceForDay(all);
  const doneCount = all.filter((item) => item.done).length;
  const percent = all.length ? Math.round(doneCount / all.length * 100) : 0;
  $("#progressText").textContent = `${percent}%`;
  $("#progressRing").style.setProperty("--progress", `${percent * 3.6}deg`);
  $("#progressRing").setAttribute("aria-label", `${label}完成进度 ${percent}%`);

  const filtered = all.filter((item) => currentFilter === "all" || (currentFilter === "done" ? item.done : !item.done));
  const wrap = $("#events");
  if (!filtered.length) {
    const emptyText = all.length ? "这里暂时没有符合筛选的日程" : "还没有安排，留点空白也很好";
    wrap.innerHTML = `<div class="empty-state"><span>☕</span><p>${emptyText}</p></div>`;
    return;
  }
  wrap.innerHTML = "";
  filtered.forEach((item) => {
    const category = CATEGORY[item.category];
    const row = document.createElement("article");
    row.className = `event-item ${item.category}${item.done ? " done" : ""}`;
    row.innerHTML = `
      <input class="event-check" type="checkbox" ${item.done ? "checked" : ""} aria-label="完成 ${escapeHtml(item.title)}">
      <div class="event-main"><div class="event-title">${category.icon} ${escapeHtml(item.title)}</div><div class="event-meta"><i class="category-mark" style="background:${category.color}"></i><span>${item.time || "全天"}</span><span>·</span><span>${category.label}</span></div>${item.note ? `<div class="event-advice">AI 建议：${escapeHtml(item.note)}</div>` : ""}</div>
      <button class="event-edit" type="button" aria-label="编辑 ${escapeHtml(item.title)}">···</button>`;
    row.querySelector(".event-check").addEventListener("change", (event) => toggleDone(item.id, event.target.checked));
    row.querySelector(".event-edit").addEventListener("click", () => openEventDialog(item.date, item.id));
    wrap.appendChild(row);
  });
}

function renderAdviceForDay(dayEvents) {
  const withAdvice = dayEvents.find((item) => !item.done && item.note) || dayEvents.find((item) => item.note);
  $("#aiAdvice").textContent = withAdvice
    ? `“${withAdvice.note}”`
    : "“今天不需要完美，完成一件小事就很好。”";
}

function getEventsForDate(date) {
  return events.filter((item) => item.date === date).sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99") || a.createdAt - b.createdAt);
}

function toggleDone(id, done) {
  const item = events.find((event) => event.id === id);
  if (!item) return;
  item.done = done;
  persist();
  renderCalendar();
  renderAgenda();
  showToast(done ? "完成一件啦，真不错 ✿" : "已放回待办清单");
}

async function submitSmartInput(event) {
  event.preventDefault();
  const input = $("#taskInput");
  const button = $("#sendBtn");
  const text = input.value.trim();
  if (!text) { showToast("先写下一件想做的事吧"); input.focus(); return; }

  button.disabled = true;
  button.innerHTML = "正在整理…";
  let parsed;
  let usedLocal = false;
  try {
    setApiStatus("thinking", "DeepSeek 正在理解");
    const response = await fetchWithTimeout(API_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) }, 20000);
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw new Error(failure.detail || "service unavailable");
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    parsed = typeof data.result === "string" ? JSON.parse(data.result) : data.result;
    parsed.date = resolveRelativeDateKey(text) || parsed.date;
    parsed.time = normalizeTime(parsed.time);
    setApiStatus("connected", "DeepSeek 已连接");
  } catch (error) {
    parsed = parseNaturalInput(text);
    usedLocal = true;
    setApiStatus("offline", "DeepSeek 未连接 · 本地模式");
    console.warn("DeepSeek request failed; using local parser:", error);
    checkApiConnection();
  }

  if (usedLocal && looksLikeTime(text) && !parsed.time) {
    showToast("DeepSeek 未连接，本地也没读懂时间；请用 15:30 这样的格式再试一次");
    button.disabled = false;
    button.innerHTML = '帮我记下 <span aria-hidden="true">→</span>';
    return;
  }

  const item = normalizeEvent({
    id: makeId(), title: parsed.title || text, date: parsed.date || selectedDate,
    time: parsed.time || "", category: CATEGORY[parsed.category] ? parsed.category : guessCategory(text), note: parsed.advice || "",
    done: false, createdAt: Date.now()
  });
  if (!item) {
    showToast("没能看懂日期，请试试“明天 15:00 开会”");
  } else {
    events.push(item);
    persist();
    selectedDate = item.date;
    const date = parseLocalDate(item.date);
    viewDate = new Date(date.getFullYear(), date.getMonth(), 1);
    renderCalendar();
    renderAgenda();
    input.value = "";
    showToast(usedLocal ? "DeepSeek 未连接，已用本地识别并记下 ✎" : "DeepSeek 已识别日期、时间和事情 ✿");
  }
  button.disabled = false;
  button.innerHTML = '帮我记下 <span aria-hidden="true">→</span>';
}

function parseNaturalInput(text) {
  const now = new Date();
  let date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const explicit = text.match(/(20\d{2})[-/.年](\d{1,2})[-/.月](\d{1,2})日?/);
  const monthDay = text.match(/(?<!\d)(\d{1,2})月(\d{1,2})日?/);
  if (explicit) date = new Date(Number(explicit[1]), Number(explicit[2]) - 1, Number(explicit[3]));
  else if (monthDay) {
    date = new Date(now.getFullYear(), Number(monthDay[1]) - 1, Number(monthDay[2]));
    if (date < new Date(now.getFullYear(), now.getMonth(), now.getDate())) date.setFullYear(date.getFullYear() + 1);
  } else {
    const relativeDate = resolveRelativeDateKey(text, now);
    if (relativeDate) date = parseLocalDate(relativeDate);
  }

  const clock = parseClockFromText(text);
  const time = clock?.time || "";

  let title = text
    .replace(clock?.raw || "", "")
    .replace(/(20\d{2})[-/.年]\d{1,2}[-/.月]\d{1,2}日?/g, "")
    .replace(/\d{1,2}月\d{1,2}日?/g, "")
    .replace(/今天|今日|明天|明日|后天|(?:下下周|下周|下个星期|下星期|本周|这周|这个星期|本星期|周|星期)[一二三四五六日天]/g, "")
    .replace(/(?:上午|早上|中午|下午|晚上|今晚)?\s*\d{1,2}(?::|：|点)\d{0,2}分?|半/g, "")
    .replace(/^[,，。\s]+|[,，。\s]+$/g, "");
  title = title || "新的日程";
  return { title, date: toDateKey(date), time, advice: gentleAdvice(title) };
}

function resolveRelativeDateKey(text, baseDate = new Date()) {
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate());
  if (/后天/.test(text)) { base.setDate(base.getDate() + 2); return toDateKey(base); }
  if (/明天|明日/.test(text)) { base.setDate(base.getDate() + 1); return toDateKey(base); }
  if (/今天|今日/.test(text)) return toDateKey(base);

  const weekdays = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 日: 0, 天: 0 };
  const match = String(text).match(/(下下周|下周|下个星期|下星期|本周|这周|这个星期|本星期|周|星期)([一二三四五六日天])/);
  if (!match) return null;
  const targetDay = weekdays[match[2]];
  const phrase = match[1];

  if (/^(下下周)/.test(phrase)) {
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7) + 14);
    monday.setDate(monday.getDate() + ((targetDay + 6) % 7));
    return toDateKey(monday);
  }
  if (/^下/.test(phrase)) {
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7) + 7);
    monday.setDate(monday.getDate() + ((targetDay + 6) % 7));
    return toDateKey(monday);
  }
  if (/^(本|这)/.test(phrase)) {
    const monday = new Date(base);
    monday.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    monday.setDate(monday.getDate() + ((targetDay + 6) % 7));
    return toDateKey(monday);
  }

  let offset = (targetDay - base.getDay() + 7) % 7;
  if (offset === 0) offset = 7;
  base.setDate(base.getDate() + offset);
  return toDateKey(base);
}

function parseClockFromText(text) {
  const match = String(text).match(/(凌晨|早上|上午|中午|下午|傍晚|晚上|今晚)?\s*([0-9零〇一二两三四五六七八九十]{1,3})(?:[:：点时])\s*([0-9零〇一二两三四五六七八九十]{1,3})?\s*(分|半)?/);
  if (!match) return null;
  let hour = chineseNumberToInt(match[2]);
  let minute = match[4] === "半" ? 30 : (match[3] ? chineseNumberToInt(match[3]) : 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  const period = match[1] || "";
  if (/(下午|傍晚|晚上|今晚)/.test(period) && hour < 12) hour += 12;
  if (/中午/.test(period) && hour < 11) hour += 12;
  if (/凌晨/.test(period) && hour === 12) hour = 0;
  if (hour > 23 || minute > 59) return null;
  return { raw: match[0], time: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}` };
}

function chineseNumberToInt(value) {
  if (/^\d+$/.test(value)) return Number(value);
  const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  if (value.includes("十")) {
    const [left, right] = value.split("十");
    return (left ? digits[left] : 1) * 10 + (right ? digits[right] : 0);
  }
  return [...value].reduce((total, character) => total * 10 + digits[character], 0);
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const standard = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)(?::\d{2})?$/);
  if (standard) return `${standard[1].padStart(2, "0")}:${standard[2]}`;
  return parseClockFromText(raw)?.time || "";
}

function looksLikeTime(text) {
  return /(?:凌晨|早上|上午|中午|下午|傍晚|晚上|今晚|\d{1,2}\s*[:：点时]|[一二两三四五六七八九十]+\s*[点时])/.test(text);
}

function guessCategory(text) {
  if (/学习|复习|考试|作业|读书|课程|论文|上课|背单词|练习|图书馆|讲座/.test(text)) return "study";
  if (/工作|会议|开会|汇报|客户|设计稿|需求|项目|邮件|提交|面试|打卡|加班/.test(text)) return "work";
  if (/吃饭|吃药|散步|运动|跑步|健身|瑜伽|游泳|买菜|购物|约会|旅行|体检|睡觉|喝水|洗衣|打扫|做饭|快递|生日/.test(text)) return "life";
  return "other";
}

function gentleAdvice(title) {
  if (/会议|开会|汇报/.test(title)) return "提前十分钟准备，会让你更从容。";
  if (/学习|复习|读书/.test(title)) return "先专注二十五分钟，再给自己一小段休息。";
  if (/运动|散步/.test(title)) return "穿舒服的鞋，去感受一点风吧。";
  return "给这件小事留出一点专注，也别忘了照顾自己。";
}

function openEventDialog(date, id = "") {
  const item = id ? events.find((event) => event.id === id) : null;
  $("#eventForm").reset();
  $("#eventId").value = item?.id || "";
  $("#eventTitle").value = item?.title || "";
  $("#eventDate").value = item?.date || date;
  $("#eventTime").value = item?.time || "";
  $("#eventNote").value = item?.note || "";
  const categoryInput = $(`input[name="category"][value="${item?.category || "life"}"]`);
  if (categoryInput) categoryInput.checked = true;
  $("#dialogTitle").textContent = item ? "编辑日程" : "添加日程";
  $("#deleteEventBtn").classList.toggle("hidden", !item);
  $("#eventDialog").showModal();
  setTimeout(() => $("#eventTitle").focus(), 50);
}

function closeDialog() { $("#eventDialog").close(); }

function saveFromDialog(event) {
  event.preventDefault();
  const id = $("#eventId").value;
  const payload = {
    id: id || makeId(), title: $("#eventTitle").value.trim(), date: $("#eventDate").value,
    time: $("#eventTime").value, category: $("input[name='category']:checked").value,
    note: $("#eventNote").value.trim(), done: false, createdAt: Date.now()
  };
  if (!payload.title || !payload.date) return;
  if (id) {
    const index = events.findIndex((item) => item.id === id);
    if (index >= 0) events[index] = { ...events[index], ...payload };
  } else events.push(payload);
  persist();
  selectedDate = payload.date;
  viewDate = parseLocalDate(payload.date);
  renderCalendar();
  renderAgenda();
  closeDialog();
  showToast(id ? "日程已经更新" : "新日程已经记下 ✿");
}

function deleteFromDialog() {
  const id = $("#eventId").value;
  if (!id || !confirm("要删除这条日程吗？")) return;
  events = events.filter((item) => item.id !== id);
  persist();
  renderCalendar();
  renderAgenda();
  closeDialog();
  showToast("日程已删除");
}

function exportEvents() {
  const data = JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), events }, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `ZhDate-${toDateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("日程备份已导出");
}

async function importEvents(event) {
  const file = event.target.files?.[0];
  event.target.value = "";
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const incoming = Array.isArray(data) ? data : data.events;
    if (!Array.isArray(incoming)) throw new Error("invalid format");
    const normalized = incoming.map(normalizeEvent).filter(Boolean);
    const byId = new Map(events.map((item) => [item.id, item]));
    normalized.forEach((item) => byId.set(item.id, item));
    events = [...byId.values()];
    persist();
    renderCalendar(); renderAgenda();
    showToast(`成功导入 ${normalized.length} 条日程`);
  } catch { showToast("这个文件不是有效的 ZhDate 备份"); }
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2300);
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function parseLocalDate(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}
function makeId() { return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}
function isTyping(target) { return ["INPUT", "TEXTAREA", "SELECT"].includes(target?.tagName); }
async function fetchWithTimeout(url, options, timeout) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timer); }
}
