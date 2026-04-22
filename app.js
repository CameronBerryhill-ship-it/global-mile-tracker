const CONFIG = window.APP_CONFIG || {};

const HAS_CONFIG =
  CONFIG.SUPABASE_URL &&
  CONFIG.SUPABASE_ANON_KEY;

const TABLE_NAME = "global_mile_tracker_cases";
const STATUS_OPTIONS = [
  "Pending Shop Availability",
  "Diag RO Open",
  "Diag Done",
  "Repair RO Open",
  "Repair Order Completed",
];

let editingId = null;
let activeCaseId = null;
let rows = [];
let channel = null;

const el = (id) => document.getElementById(id);

const supabase = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

function showMessage(text) {
  console.log(text);
}

function formData() {
  return {
    case_number: el("case_number")?.value || "",
    container_number: el("container_number")?.value || "",
    chassis_number: el("chassis_number")?.value || "",
    location: el("location")?.value || "",
    repair_description: el("repair_description")?.value || "",
    diag_ro_number: el("diag_ro_number")?.value || "",
    repair_ro_number: el("repair_ro_number")?.value || "",
    status: el("status")?.value || STATUS_OPTIONS[0],
    notes: el("notes")?.value || "",
  };
}

function resetForm() {
  editingId = null;
}

async function saveItem() {
  const data = formData();

  if (!data.container_number || !data.chassis_number) {
    alert("Missing required fields");
    return;
  }

  if (editingId) {
    await supabase.from(TABLE_NAME).update(data).eq("id", editingId);
  } else {
    await supabase.from(TABLE_NAME).insert(data);
  }

  await loadRows();
}

async function loadRows() {
  const { data } = await supabase.from(TABLE_NAME).select("*");
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

async function signIn() {
  const email = el("loginEmail")?.value;
  const password = el("loginPassword")?.value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    alert(error.message);
  }
}

async function signOut() {
  await supabase.auth.signOut();
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

async function init() {
  if (!HAS_CONFIG) {
    alert("Config missing");
    return;
  }

  const { data } = await supabase.auth.getSession();
  await handleSession(data.session);

  supabase.auth.onAuthStateChange((_event, session) => {
    handleSession(session);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});
