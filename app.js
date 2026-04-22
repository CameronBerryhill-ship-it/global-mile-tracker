const CONFIG = window.APP_CONFIG || {};

const HAS_CONFIG =
  CONFIG.SUPABASE_URL &&
  CONFIG.SUPABASE_ANON_KEY;

const TABLE_NAME = "global_mile_tracker_cases";

let rows = [];

const el = (id) => document.getElementById(id);

// ✅ ONLY ONE supabase instance (THIS fixes your error)
const sb = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

// ---------- PARSE ----------
function parseRequestText(text) {
  const lines = text.split("\n").map(x => x.trim());

  const get = (label) => {
    const line = lines.find(l => l.toLowerCase().includes(label));
    if (!line) return "";
    return line.split(":")[1]?.trim() || "";
  };

  return {
    case_number: get("case"),
    container_number: get("container"),
    chassis_number: get("chassis"),
    location: get("location"),
    repair_description: get("description")
  };
}

function handlePasteParse() {
  const text = el("pasteInput")?.value || "";
  if (!text.trim()) return;

  const parsed = parseRequestText(text);

  el("case_number").value = parsed.case_number;
  el("container_number").value = parsed.container_number;
  el("chassis_number").value = parsed.chassis_number;
  el("location").value = parsed.location;
  el("repair_description").value = parsed.repair_description;
}

// ---------- CRUD ----------
function formData() {
  return {
    case_number: el("case_number")?.value || "",
    container_number: el("container_number")?.value || "",
    chassis_number: el("chassis_number")?.value || "",
    location: el("location")?.value || "",
    repair_description: el("repair_description")?.value || ""
  };
}

async function saveItem() {
  const data = formData();

  if (!data.container_number || !data.chassis_number) {
    alert("Missing required fields");
    return;
  }

  await sb.from(TABLE_NAME).insert(data);
  await loadRows();
}

async function loadRows() {
  const { data } = await sb.from(TABLE_NAME).select("*");
  rows = data || [];
  renderTable();
}

function renderTable() {
  const tbody = el("tableBody");
  if (!tbody) return;

  tbody.innerHTML = rows.map(item => `
    <tr>
      <td>${item.case_number || ""}</td>
      <td>${item.container_number || ""}</td>
      <td>${item.chassis_number || ""}</td>
      <td>${item.location || ""}</td>
      <td>${item.repair_description || ""}</td>
    </tr>
  `).join("");
}

// ---------- AUTH ----------
async function signIn() {
  const email = el("loginEmail")?.value;
  const password = el("loginPassword")?.value;

  const { error } = await sb.auth.signInWithPassword({
    email,
    password
  });

  if (error) alert(error.message);
}

async function signOut() {
  await sb.auth.signOut();
}

async function handleSession(session) {
  const authView = el("authView");
  const trackerView = el("trackerView");

  if (!session) {
    authView.classList.remove("hidden");
    trackerView.classList.add("hidden");
    return;
  }

  authView.classList.add("hidden");
  trackerView.classList.remove("hidden");

  await loadRows();
}

// ---------- INIT ----------
async function init() {
  if (!HAS_CONFIG) {
    alert("Config missing");
    return;
  }

  const { data } = await sb.auth.getSession();
  await handleSession(data.session);

  sb.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });
}

// ---------- EVENTS ----------
document.addEventListener("DOMContentLoaded", () => {
  el("parseBtn")?.addEventListener("click", handlePasteParse);
  el("saveBtn")?.addEventListener("click", saveItem);
  el("signInBtn")?.addEventListener("click", signIn);
  el("signOutBtn")?.addEventListener("click", signOut);

  init();
});
