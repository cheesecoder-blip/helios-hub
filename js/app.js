/* =========================================================
   HELIOS HUB V11 - MAIN APPLICATION CONTROLLER
   ========================================================= */

function renderNavbar(activePage) {
  const user = getCurrentUser() || { full_name: "Guest", section: "Helios", circle_of_friends: "FF" };
  const navHtml = `
    <nav class="navbar">
      <a href="dashboard.html" class="nav-brand">
        <span class="logo-icon">☀️</span> Helios Hub
      </a>
      <button class="hamburger" id="hamburgerBtn" onclick="toggleMobileMenu()">☰</button>
      <ul class="nav-links" id="navLinks">
        <li><a href="dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">🏠 Dashboard</a></li>
        <li><a href="messages.html" class="${activePage === 'messages' ? 'active' : ''}">💬 Messages</a></li>
        <li><a href="od.html" class="${activePage === 'od' ? 'active' : ''}">🛡️ Officer of Day</a></li>
        <li><a href="tasks.html" class="${activePage === 'tasks' ? 'active' : ''}">📝 Tasks</a></li>
        <li><a href="schedule.html" class="${activePage === 'schedule' ? 'active' : ''}">📅 Schedule</a></li>
        <li><a href="classes.html" class="${activePage === 'classes' ? 'active' : ''}">📚 Classes</a></li>
        <li><a href="library.html" class="${activePage === 'library' ? 'active' : ''}">📁 Library</a></li>
        <li><a href="profile.html" class="${activePage === 'profile' ? 'active' : ''}">👤 Profile</a></li>
        <li><a href="#" onclick="handleSignOut(); return false;" style="color: var(--danger);">🚪 Logout</a></li>
      </ul>
    </nav>
  `;
  const headerElem = document.getElementById("mainHeader");
  if (headerElem) headerElem.innerHTML = navHtml;
}

function toggleMobileMenu() {
  const navLinks = document.getElementById("navLinks");
  if (navLinks) navLinks.classList.toggle("open");
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ---------------------------------------------------------
// DASHBOARD INITIALIZER
// ---------------------------------------------------------
function initDashboardPage() {
  renderNavbar("dashboard");
  const user = getCurrentUser();
  if (user) {
    const welcomeElem = document.getElementById("welcomeName");
    if (welcomeElem) welcomeElem.textContent = user.full_name || user.username;
    const secElem = document.getElementById("welcomeSection");
    if (secElem) secElem.textContent = `Section: ${user.section} | Circle of Friends: ${user.circle_of_friends}`;
  }
  loadQuickStats();
}

async function loadQuickStats() {
  let tasksCount = 0;
  let odCurrent = "None";
  let libraryCount = 0;

  if (supabaseClient) {
    try {
      const { data: tData } = await supabaseClient.from("tasks").select("id").eq("completed", false);
      if (tData) tasksCount = tData.length;

      const { data: odData } = await supabaseClient.from("od_roster").select("*").order("position_order", { ascending: true });
      if (odData && odData.length > 0) odCurrent = odData[0].member_name;

      const { data: libData } = await supabaseClient.from("library_assets").select("id");
      if (libData) libraryCount = libData.length;
    } catch (e) {}
  }

  const tElem = document.getElementById("statTasks");
  if (tElem) tElem.textContent = tasksCount;
  const odElem = document.getElementById("statOD");
  if (odElem) odElem.textContent = odCurrent;
  const libElem = document.getElementById("statLibrary");
  if (libElem) libElem.textContent = libraryCount;
}

// ---------------------------------------------------------
// MESSAGES INITIALIZER (EXCLUSIVE CIRCLE OF FRIENDS & REALTIME)
// ---------------------------------------------------------
let currentChannelTarget = "";
let currentChannelType = "circle";
let realtimeChannel = null;

function initMessagesPage() {
  renderNavbar("messages");
  const user = getCurrentUser() || { section: "Helios", circle_of_friends: "FF" };

  // Set default active channel target to user's assigned Circle of Friends
  currentChannelTarget = "circle_" + user.circle_of_friends;

  // Render Sidebar with ONLY the user's Section GC and user's EXCLUSIVE Circle of Friends GC
  renderMessageSidebar(user);

  // Subscribe to Realtime messages via Supabase
  setupRealtimeSubscription();

  // Initial load & 2-second polling fallback
  loadMessages();
  setInterval(loadMessages, 2000);
}

function renderMessageSidebar(user) {
  const sidebarElem = document.getElementById("chatSidebarContent");
  if (!sidebarElem) return;

  const sectionName = user.section || "Helios";
  const circleName = user.circle_of_friends || "FF";

  sidebarElem.innerHTML = `
    <h3 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-bottom: 0.5rem; letter-spacing: 0.05em;">Section Group Chat</h3>
    <ul class="channel-list">
      <li class="channel-item ${currentChannelTarget === 'section_' + sectionName ? 'active' : ''}" onclick="switchChannel('section', 'section_${sectionName}', 'Grade 8 - ${sectionName}', event)">
        <span>📢 Grade 8 - ${escapeHtml(sectionName)}</span>
      </li>
    </ul>

    <h3 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-top: 1.5rem; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Your Exclusive Circle</h3>
    <ul class="channel-list">
      <li class="channel-item ${currentChannelTarget === 'circle_' + circleName ? 'active' : ''}" onclick="switchChannel('circle', 'circle_${circleName}', 'Circle: ${circleName}', event)">
        <span>👥 ${escapeHtml(circleName)}</span>
        <span class="od-badge">Exclusive</span>
      </li>
    </ul>

    <h3 style="font-size: 0.85rem; text-transform: uppercase; color: var(--text-muted); margin-top: 1.5rem; margin-bottom: 0.5rem; letter-spacing: 0.05em;">Direct Messages</h3>
    <div style="margin-bottom: 0.75rem;">
      <input type="text" id="dmSearchInput" class="form-control" style="padding: 0.4rem 0.6rem; font-size: 0.8rem;" placeholder="Search user to DM..." oninput="filterDirectMessages()">
    </div>
    <ul class="channel-list" id="dmUserList">
      <li style="color: var(--text-muted); font-size: 0.8rem; padding: 0.4rem;">Loading users...</li>
    </ul>
  `;

  loadUsersForDM();
}

async function loadUsersForDM() {
  const listElem = document.getElementById("dmUserList");
  if (!listElem) return;

  let allUsers = [];

  if (supabaseClient) {
    try {
      const { data } = await supabaseClient.from("profiles").select("*");
      if (data) allUsers = data;
    } catch (e) {}
  }

  if (allUsers.length === 0) {
    allUsers = JSON.parse(localStorage.getItem("helios_users_db") || "[]");
  }

  const currentUser = getCurrentUser();
  const otherUsers = allUsers.filter(u => !currentUser || (u.id !== currentUser.id && u.full_name !== currentUser.full_name));

  if (otherUsers.length === 0) {
    listElem.innerHTML = `<li style="color: var(--text-muted); font-size: 0.8rem; padding: 0.4rem;">No other registered users found.</li>`;
    return;
  }

  listElem.innerHTML = otherUsers.map(u => `
    <li class="channel-item ${currentChannelTarget === 'dm_' + u.id ? 'active' : ''}" onclick="switchChannel('dm', 'dm_${u.id}', 'DM: ${escapeHtml(u.full_name || u.username)}', event)">
      <span>💬 ${escapeHtml(u.full_name || u.username)}</span>
    </li>
  `).join("");
}

function filterDirectMessages() {
  const query = document.getElementById("dmSearchInput").value.toLowerCase();
  document.querySelectorAll("#dmUserList .channel-item").forEach(item => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(query) ? "flex" : "none";
  });
}

function switchChannel(type, target, label, evt) {
  currentChannelType = type;
  currentChannelTarget = target;
  
  const titleElem = document.getElementById("chatTitle");
  if (titleElem) titleElem.textContent = label;
  
  document.querySelectorAll(".channel-item").forEach(el => el.classList.remove("active"));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");

  loadMessages();
}

function setupRealtimeSubscription() {
  if (supabaseClient) {
    try {
      realtimeChannel = supabaseClient
        .channel("public:messages")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
          if (payload.new && payload.new.channel_target === currentChannelTarget) {
            loadMessages();
          }
        })
        .subscribe();
    } catch (e) {
      console.warn("Realtime subscription note:", e);
    }
  }
}

async function loadMessages() {
  const container = document.getElementById("chatMessages");
  if (!container) return;

  let messages = [];
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient
        .from("messages")
        .select("*")
        .eq("channel_target", currentChannelTarget)
        .order("created_at", { ascending: true });
      if (!error && data) messages = data;
    } catch (e) {}
  }

  if (messages.length === 0) {
    const localMsgs = JSON.parse(localStorage.getItem("helios_messages_db") || "[]");
    messages = localMsgs.filter(m => m.channel_target === currentChannelTarget);
  }

  const currentUser = getCurrentUser();
  if (messages.length === 0) {
    container.innerHTML = `<p style="color: var(--text-muted); text-align: center; margin-top: 2rem;">No messages in this chat yet. Be the first to say hi! 👋</p>`;
    return;
  }

  container.innerHTML = messages.map(m => {
    const isMe = currentUser && (m.sender_name === currentUser.full_name || m.sender_name === currentUser.username);
    return `
      <div class="message-bubble ${isMe ? 'sent' : 'received'}">
        <div class="message-meta">${escapeHtml(m.sender_name)} • ${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
        <div>${escapeHtml(m.content)}</div>
      </div>
    `;
  }).join("");

  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById("chatInput");
  const text = input.value.trim();
  if (!text) return;

  const user = getCurrentUser() || { full_name: "User", username: "User" };
  const newMsg = {
    id: "msg_" + Date.now(),
    sender_name: user.full_name || user.username,
    channel_type: currentChannelType,
    channel_target: currentChannelTarget,
    content: text,
    created_at: new Date().toISOString()
  };

  input.value = "";

  if (supabaseClient) {
    try { await supabaseClient.from("messages").insert([newMsg]); } catch (e) {}
  }

  let localMsgs = JSON.parse(localStorage.getItem("helios_messages_db") || "[]");
  localMsgs.push(newMsg);
  localStorage.setItem("helios_messages_db", JSON.stringify(localMsgs));

  loadMessages();
}

// ---------------------------------------------------------
// OFFICER OF THE DAY (OD) INITIALIZER
// ---------------------------------------------------------
let odRoster = [];
let isOdPaused = false;

function initOdPage() {
  renderNavbar("od");
  loadOdRoster();
}

async function loadOdRoster() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("od_roster").select("*").order("position_order", { ascending: true });
      if (!error && data) odRoster = data;
    } catch (e) {}
  }

  if (odRoster.length === 0) {
    odRoster = JSON.parse(localStorage.getItem("helios_od_roster_db") || "[]");
  }

  renderOdRoster();
}

function renderOdRoster() {
  const listElem = document.getElementById("odList");
  if (!listElem) return;

  if (odRoster.length === 0) {
    listElem.innerHTML = `<li class="od-item"><span>No members in roster yet. Add someone below!</span></li>`;
    const badge = document.getElementById("activeOdBadge");
    if (badge) badge.textContent = "None";
    return;
  }

  const now = new Date();
  const startDay = new Date(now.getFullYear(), 0, 1);
  const diffDays = Math.floor((now - startDay) / (1000 * 60 * 60 * 24));
  const activeIndex = isOdPaused ? 0 : (diffDays % odRoster.length);

  const badge = document.getElementById("activeOdBadge");
  if (badge) badge.textContent = odRoster[activeIndex]?.member_name || "None";

  listElem.innerHTML = odRoster.map((m, idx) => `
    <li class="od-item ${idx === activeIndex ? 'active-od' : ''}">
      <div>
        <strong>#${idx + 1} ${escapeHtml(m.member_name)}</strong>
        ${idx === activeIndex ? '<span class="od-badge" style="margin-left: 0.5rem;">Active Officer Today (7:00 AM)</span>' : ''}
      </div>
      <button class="btn btn-danger btn-sm" onclick="removeOdMember('${m.id}')">Remove</button>
    </li>
  `).join("");
}

async function addOdMember() {
  const input = document.getElementById("odNameInput");
  const name = input.value.trim();
  if (!name) return;

  if (odRoster.length >= 40) {
    alert("OD Roster limit reached (maximum 40 members).");
    return;
  }

  const newMember = {
    id: "od_" + Date.now(),
    member_name: name,
    position_order: odRoster.length,
    is_paused: false,
    created_at: new Date().toISOString()
  };

  input.value = "";

  if (supabaseClient) {
    try { await supabaseClient.from("od_roster").insert([newMember]); } catch (e) {}
  }

  odRoster.push(newMember);
  localStorage.setItem("helios_od_roster_db", JSON.stringify(odRoster));
  renderOdRoster();
}

async function removeOdMember(id) {
  if (supabaseClient) {
    try { await supabaseClient.from("od_roster").delete().eq("id", id); } catch (e) {}
  }
  odRoster = odRoster.filter(m => m.id !== id);
  localStorage.setItem("helios_od_roster_db", JSON.stringify(odRoster));
  renderOdRoster();
}

function toggleOdPause() {
  isOdPaused = !isOdPaused;
  const btn = document.getElementById("pauseOdBtn");
  if (btn) btn.textContent = isOdPaused ? "▶️ Resume Rotation" : "⏸️ Pause Rotation";
  renderOdRoster();
}

// ---------------------------------------------------------
// TASKS INITIALIZER
// ---------------------------------------------------------
let tasksList = [];

function initTasksPage() {
  renderNavbar("tasks");
  loadTasks();
}

async function loadTasks() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("tasks").select("*").order("created_at", { ascending: false });
      if (!error && data) tasksList = data;
    } catch (e) {}
  }

  if (tasksList.length === 0) {
    tasksList = JSON.parse(localStorage.getItem("helios_tasks_db") || "[]");
  }

  renderTasks();
}

function renderTasks() {
  const elem = document.getElementById("taskList");
  if (!elem) return;

  if (tasksList.length === 0) {
    elem.innerHTML = `<div class="card"><p style="color: var(--text-muted);">No tasks created yet.</p></div>`;
    return;
  }

  elem.innerHTML = tasksList.map(t => `
    <div class="property-row">
      <div>
        <input type="checkbox" ${t.completed ? 'checked' : ''} onchange="toggleTaskStatus('${t.id}')" style="margin-right: 0.5rem;" />
        <span style="${t.completed ? 'text-decoration: line-through; opacity: 0.6;' : 'font-weight: 600;'}">${escapeHtml(t.title)}</span>
        ${t.due_date ? `<small style="color: var(--text-muted); margin-left: 0.5rem;">Due: ${t.due_date}</small>` : ''}
        ${t.subject_id ? `<span class="od-badge" style="margin-left: 0.5rem;">${t.subject_id}</span>` : ''}
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteTask('${t.id}')">Delete</button>
    </div>
  `).join("");
}

async function addTask() {
  const titleInput = document.getElementById("taskTitleInput");
  const dateInput = document.getElementById("taskDateInput");
  const subjInput = document.getElementById("taskSubjectSelect");

  const title = titleInput.value.trim();
  if (!title) return;

  const newTask = {
    id: "tsk_" + Date.now(),
    title: title,
    due_date: dateInput.value || null,
    subject_id: subjInput.value || null,
    completed: false,
    created_at: new Date().toISOString()
  };

  titleInput.value = "";

  if (supabaseClient) {
    try { await supabaseClient.from("tasks").insert([newTask]); } catch (e) {}
  }

  tasksList.unshift(newTask);
  localStorage.setItem("helios_tasks_db", JSON.stringify(tasksList));
  renderTasks();
}

async function toggleTaskStatus(id) {
  const task = tasksList.find(t => t.id === id);
  if (!task) return;
  task.completed = !task.completed;

  if (supabaseClient) {
    try { await supabaseClient.from("tasks").update({ completed: task.completed }).eq("id", id); } catch (e) {}
  }

  localStorage.setItem("helios_tasks_db", JSON.stringify(tasksList));
  renderTasks();
}

async function deleteTask(id) {
  if (supabaseClient) {
    try { await supabaseClient.from("tasks").delete().eq("id", id); } catch (e) {}
  }
  tasksList = tasksList.filter(t => t.id !== id);
  localStorage.setItem("helios_tasks_db", JSON.stringify(tasksList));
  renderTasks();
}

// ---------------------------------------------------------
// 365-DAY SCHEDULE CALENDAR INITIALIZER
// ---------------------------------------------------------
let currentCalYear = new Date().getFullYear();
let currentCalMonth = new Date().getMonth();
let calendarEvents = [];

function initSchedulePage() {
  renderNavbar("schedule");
  loadCalendarEvents();
}

async function loadCalendarEvents() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("calendar_events").select("*");
      if (!error && data) calendarEvents = data;
    } catch (e) {}
  }

  if (calendarEvents.length === 0) {
    calendarEvents = JSON.parse(localStorage.getItem("helios_calendar_db") || "[]");
  }

  renderCalendar();
}

function renderCalendar() {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const titleElem = document.getElementById("calMonthYearTitle");
  if (titleElem) titleElem.textContent = `${monthNames[currentCalMonth]} ${currentCalYear}`;

  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay();
  const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();

  let html = `
    <div class="calendar-day-head">Sun</div>
    <div class="calendar-day-head">Mon</div>
    <div class="calendar-day-head">Tue</div>
    <div class="calendar-day-head">Wed</div>
    <div class="calendar-day-head">Thu</div>
    <div class="calendar-day-head">Fri</div>
    <div class="calendar-day-head">Sat</div>
  `;

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-cell" style="opacity: 0.3; pointer-events: none;"></div>`;
  }

  const todayStr = new Date().toISOString().split("T")[0];

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(currentCalMonth + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const dateFormatted = `${currentCalYear}-${monthStr}-${dayStr}`;

    const hasEvents = calendarEvents.some(e => e.event_date === dateFormatted);
    const isToday = dateFormatted === todayStr;

    html += `
      <div class="calendar-cell ${isToday ? 'today' : ''} ${hasEvents ? 'has-event' : ''}" onclick="openDateModal('${dateFormatted}')">
        <strong>${day}</strong>
        ${hasEvents ? '<div class="event-dot"></div>' : ''}
      </div>
    `;
  }

  grid.innerHTML = html;
}

function changeCalMonth(delta) {
  currentCalMonth += delta;
  if (currentCalMonth < 0) {
    currentCalMonth = 11;
    currentCalYear--;
  } else if (currentCalMonth > 11) {
    currentCalMonth = 0;
    currentCalYear++;
  }
  renderCalendar();
}

function openDateModal(dateStr) {
  const modal = document.getElementById("eventModal");
  if (!modal) return;

  document.getElementById("modalSelectedDate").textContent = dateStr;
  document.getElementById("modalDateInput").value = dateStr;

  const dayEvents = calendarEvents.filter(e => e.event_date === dateStr);
  const listElem = document.getElementById("dayEventsList");

  listElem.innerHTML = dayEvents.length === 0 ? "<p style='color: var(--text-muted);'>No events scheduled for this day.</p>" :
    dayEvents.map(e => `
      <div class="property-row">
        <div>
          <strong>${escapeHtml(e.title)}</strong>
          ${e.event_time ? `<small style="color: var(--text-muted); display: block;">Time: ${e.event_time}</small>` : ''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteCalendarEvent('${e.id}', '${dateStr}')">Delete</button>
      </div>
    `).join("");

  modal.style.display = "flex";
}

function closeEventModal() {
  const modal = document.getElementById("eventModal");
  if (modal) modal.style.display = "none";
}

async function addCalendarEvent() {
  const dateStr = document.getElementById("modalDateInput").value;
  const titleInput = document.getElementById("modalTitleInput");
  const timeInput = document.getElementById("modalTimeInput");

  const title = titleInput.value.trim();
  if (!title) return;

  const newEvt = {
    id: "evt_" + Date.now(),
    title: title,
    event_date: dateStr,
    event_time: timeInput.value || null,
    created_at: new Date().toISOString()
  };

  titleInput.value = "";

  if (supabaseClient) {
    try { await supabaseClient.from("calendar_events").insert([newEvt]); } catch (e) {}
  }

  calendarEvents.push(newEvt);
  localStorage.setItem("helios_calendar_db", JSON.stringify(calendarEvents));

  renderCalendar();
  openDateModal(dateStr);
}

async function deleteCalendarEvent(id, dateStr) {
  if (supabaseClient) {
    try { await supabaseClient.from("calendar_events").delete().eq("id", id); } catch (e) {}
  }
  calendarEvents = calendarEvents.filter(e => e.id !== id);
  localStorage.setItem("helios_calendar_db", JSON.stringify(calendarEvents));

  renderCalendar();
  openDateModal(dateStr);
}

// ---------------------------------------------------------
// CLASSES TAB (STRICT SUBJECT-SCOPED PROPERTIES)
// ---------------------------------------------------------
let currentSubjectId = "science";
let classProperties = [];

function initClassesPage() {
  renderNavbar("classes");
  loadClassProperties();
}

async function loadClassProperties() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("class_properties").select("*");
      if (!error && data) classProperties = data;
    } catch (e) {}
  }

  if (classProperties.length === 0) {
    classProperties = JSON.parse(localStorage.getItem("helios_class_props_db") || "[]");
  }

  renderSubjectProperties();
}

function switchClassTab(subjId, evt) {
  currentSubjectId = subjId;
  document.querySelectorAll(".class-tab-btn").forEach(btn => btn.classList.remove("active"));
  if (evt && evt.currentTarget) evt.currentTarget.classList.add("active");
  renderSubjectProperties();
}

function renderSubjectProperties() {
  const container = document.getElementById("propertiesList");
  if (!container) return;

  // STRICT SUBJECT SCOPING: Only show properties that belong strictly to currentSubjectId!
  const scopedProps = classProperties.filter(p => p.subject_id === currentSubjectId);

  if (scopedProps.length === 0) {
    container.innerHTML = `<div class="card"><p style="color: var(--text-muted);">No custom properties added for this class yet.</p></div>`;
    return;
  }

  container.innerHTML = scopedProps.map(p => `
    <div class="property-row">
      <div>
        <span class="property-key">${escapeHtml(p.property_key)}:</span>
        <span class="property-val" style="margin-left: 0.5rem;">${escapeHtml(p.property_value)}</span>
      </div>
      <button class="btn btn-danger btn-sm" onclick="deleteClassProperty('${p.id}')">Delete Property</button>
    </div>
  `).join("");
}

async function addClassProperty() {
  const keyInput = document.getElementById("propKeyInput");
  const valInput = document.getElementById("propValInput");

  const key = keyInput.value.trim();
  const val = valInput.value.trim();
  if (!key || !val) return;

  const newProp = {
    id: "prop_" + Date.now(),
    subject_id: currentSubjectId, // STRICTLY SCOPED TO THIS SPECIFIC CLASS!
    property_key: key,
    property_value: val,
    created_at: new Date().toISOString()
  };

  keyInput.value = "";
  valInput.value = "";

  if (supabaseClient) {
    try { await supabaseClient.from("class_properties").insert([newProp]); } catch (e) {}
  }

  classProperties.push(newProp);
  localStorage.setItem("helios_class_props_db", JSON.stringify(classProperties));

  renderSubjectProperties();
}

async function deleteClassProperty(id) {
  if (supabaseClient) {
    try { await supabaseClient.from("class_properties").delete().eq("id", id); } catch (e) {}
  }
  classProperties = classProperties.filter(p => p.id !== id);
  localStorage.setItem("helios_class_props_db", JSON.stringify(classProperties));

  renderSubjectProperties();
}

// ---------------------------------------------------------
// DIGITAL LIBRARY (50MB LIMIT & AUDIO/VIDEO RESTRICTION)
// ---------------------------------------------------------
let libraryAssets = [];

function initLibraryPage() {
  renderNavbar("library");
  loadLibraryAssets();
}

async function loadLibraryAssets() {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from("library_assets").select("*").order("created_at", { ascending: false });
      if (!error && data) libraryAssets = data;
    } catch (e) {}
  }

  if (libraryAssets.length === 0) {
    libraryAssets = JSON.parse(localStorage.getItem("helios_library_db") || "[]");
  }

  renderLibraryAssets();
}

function renderLibraryAssets() {
  const container = document.getElementById("libraryAssetList");
  if (!container) return;

  if (libraryAssets.length === 0) {
    container.innerHTML = `<div class="card"><p style="color: var(--text-muted);">No documents or assets uploaded yet.</p></div>`;
    return;
  }

  container.innerHTML = libraryAssets.map(a => `
    <div class="property-row">
      <div>
        <strong>📄 ${escapeHtml(a.file_name)}</strong>
        <small style="color: var(--text-muted); display: block;">Uploaded by ${escapeHtml(a.uploader_name || 'User')} • ${(a.file_size / 1024 / 1024).toFixed(2)} MB</small>
      </div>
      <div>
        <a href="${a.file_url}" target="_blank" download="${a.file_name}" class="btn btn-secondary btn-sm">Download</a>
        <button class="btn btn-danger btn-sm" onclick="deleteLibraryAsset('${a.id}')">Delete</button>
      </div>
    </div>
  `).join("");
}

async function uploadLibraryAsset() {
  const fileInput = document.getElementById("libraryFileInput");
  if (!fileInput.files || fileInput.files.length === 0) return;

  const file = fileInput.files[0];

  // AUDIO & VIDEO RESTRICTION
  if (file.type.startsWith("audio/") || file.type.startsWith("video/") || /\.(mp3|wav|mp4|mkv|avi|mov|flv|wmv)$/i.test(file.name)) {
    alert("Audio and Video files are strictly restricted from upload!");
    fileInput.value = "";
    return;
  }

  // 50MB FILE SIZE LIMIT
  const MAX_SIZE_BYTES = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE_BYTES) {
    alert("File size exceeds 50MB limit! Supabase storage is restricted to 50MB max per file.");
    fileInput.value = "";
    return;
  }

  const user = getCurrentUser() || { full_name: "User" };
  let publicUrl = "";

  if (supabaseClient) {
    try {
      const fileName = `${Date.now()}_${file.name}`;
      const { data, error } = await supabaseClient.storage.from("library").upload(fileName, file);
      if (!error && data) {
        const { data: urlData } = supabaseClient.storage.from("library").getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }
    } catch (e) {}
  }

  if (!publicUrl) {
    publicUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.readAsDataURL(file);
    });
  }

  const newAsset = {
    id: "ast_" + Date.now(),
    uploader_name: user.full_name || user.username,
    file_name: file.name,
    file_url: publicUrl,
    file_size: file.size,
    file_type: file.type || "document",
    created_at: new Date().toISOString()
  };

  fileInput.value = "";

  if (supabaseClient) {
    try { await supabaseClient.from("library_assets").insert([newAsset]); } catch (e) {}
  }

  libraryAssets.unshift(newAsset);
  localStorage.setItem("helios_library_db", JSON.stringify(libraryAssets));

  renderLibraryAssets();
}

async function deleteLibraryAsset(id) {
  if (supabaseClient) {
    try { await supabaseClient.from("library_assets").delete().eq("id", id); } catch (e) {}
  }
  libraryAssets = libraryAssets.filter(a => a.id !== id);
  localStorage.setItem("helios_library_db", JSON.stringify(libraryAssets));

  renderLibraryAssets();
}

// ---------------------------------------------------------
// PROFILE & AVATAR POSITIONER
// ---------------------------------------------------------
let currentAvatarImageSrc = null;
let avatarTransform = { zoom: 1, x: 0, y: 0 };

function initProfilePage() {
  renderNavbar("profile");
  const user = getCurrentUser();
  if (user) {
    document.getElementById("profileFullNameInput").value = user.full_name || "";
    document.getElementById("profileSectionSelect").value = user.section || "Helios";
    document.getElementById("profileCircleSelect").value = user.circle_of_friends || "FF";

    if (user.avatar_transform) {
      avatarTransform = user.avatar_transform;
      document.getElementById("zoomSlider").value = avatarTransform.zoom;
      document.getElementById("xSlider").value = avatarTransform.x;
      document.getElementById("ySlider").value = avatarTransform.y;
    }

    if (user.avatar_url) {
      currentAvatarImageSrc = user.avatar_url;
      const imgElem = document.getElementById("avatarPreviewImg");
      imgElem.src = currentAvatarImageSrc;
      imgElem.style.display = "block";
      updateAvatarTransformStyles();
    }
  }
}

function handleAvatarFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = e => {
    currentAvatarImageSrc = e.target.result;
    const imgElem = document.getElementById("avatarPreviewImg");
    imgElem.src = currentAvatarImageSrc;
    imgElem.style.display = "block";

    avatarTransform = { zoom: 1, x: 0, y: 0 };
    document.getElementById("zoomSlider").value = 1;
    document.getElementById("xSlider").value = 0;
    document.getElementById("ySlider").value = 0;

    updateAvatarTransformStyles();
  };
  reader.readAsDataURL(file);
}

function updateAvatarTransformStyles() {
  const zoom = document.getElementById("zoomSlider").value;
  const x = document.getElementById("xSlider").value;
  const y = document.getElementById("ySlider").value;

  avatarTransform = { zoom: parseFloat(zoom), x: parseInt(x), y: parseInt(y) };

  const imgElem = document.getElementById("avatarPreviewImg");
  if (imgElem) {
    imgElem.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${zoom})`;
  }
}

async function saveProfileSettings() {
  const user = getCurrentUser();
  if (!user) return;

  user.full_name = document.getElementById("profileFullNameInput").value.trim();
  user.section = document.getElementById("profileSectionSelect").value;
  user.circle_of_friends = document.getElementById("profileCircleSelect").value;
  user.avatar_url = currentAvatarImageSrc;
  user.avatar_transform = avatarTransform;

  setCurrentUser(user);

  if (supabaseClient) {
    try {
      await supabaseClient.from("profiles").upsert({
        id: user.id,
        full_name: user.full_name,
        section: user.section,
        circle_of_friends: user.circle_of_friends,
        avatar_url: user.avatar_url,
        avatar_transform: user.avatar_transform
      });
    } catch (e) {}
  }

  alert("Profile settings & avatar position saved successfully!");
}
