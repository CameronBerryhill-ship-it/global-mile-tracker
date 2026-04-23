const CONFIG = window.APP_CONFIG || {};

const HAS_CONFIG =
  Boolean(CONFIG.SUPABASE_URL) &&
  Boolean(CONFIG.SUPABASE_ANON_KEY);

const TABLE_NAME = "global_mile_tracker_cases";

let rows = [];
let activeCaseId = null;

const el = (id) => document.getElementById(id);

const sb = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

// ---------------- COMP CODE LIST ----------------
const COMP_CODES = [
  { code: "998-405", desc: "Lighting diagnostics" },
  { code: "998-394", desc: "Travel Time" },
  { code: "998-401", desc: "Brake shoe R&R" },
  { code: "998-402", desc: "Brake inspection" },
  { code: "998-408", desc: "Brake chamber R&R" },
  { code: "998-434", desc: "Trailer ABS diagnostic" },
  { code: "998-418", desc: "Mud flap R&R" }
];

// ---------------- BUILD DROPDOWN ----------------
function buildCompList() {
  let list = document.getElementById("compList");
  if (!list) {
    list = document.createElement("datalist");
    list.id = "compList";
    document.body.appendChild(list);
  }

  list.innerHTML = COMP_CODES.map(c =>
    `<option value="${c.code}">${c.code} - ${c.desc}</option>`
  ).join("");
}

// ---------------- ROW CREATION ----------------
function makeRow(prefix, i, enabled=false) {
  return `
  <div class="comp-row ${enabled ? "" : "disabled"}">
    <input list="compList" id="${prefix}_code_${i}" placeholder="Code" ${enabled?"":"disabled"}>
    <input id="${prefix}_desc_${i}" placeholder="Description" ${enabled?"":"disabled"}>
    <input id="${prefix}_hrs_${i}" placeholder="Hours" ${enabled?"":"disabled"}>
  </div>`;
}

// ---------------- INIT ROWS ----------------
function initRows() {
  const diag = el("diagRows");
  const repair = el("repairRows");

  if (diag) {
    diag.innerHTML =
      makeRow("diag",0,true)+
      makeRow("diag",1)+
      makeRow("diag",2)+
      makeRow("diag",3);
  }

  if (repair) {
    repair.innerHTML =
      makeRow("rep",0,true)+
      makeRow("rep",1)+
      makeRow("rep",2)+
      makeRow("rep",3);
  }
}

// ---------------- ENABLE NEXT ----------------
function enableNext(prefix) {
  for (let i=0;i<4;i++) {
    let code = el(`${prefix}_code_${i}`);
    if (code && code.disabled) {
      code.disabled = false;
      el(`${prefix}_desc_${i}`).disabled = false;
      el(`${prefix}_hrs_${i}`).disabled = false;
      break;
    }
  }
}

// ---------------- AUTO FILL ----------------
document.addEventListener("input", (e) => {
  if (e.target.id.includes("_code_")) {
    let val = e.target.value;
    let match = COMP_CODES.find(c => c.code === val);
    if (match) {
      let prefix = e.target.id.split("_code_")[0];
      let i = e.target.id.split("_code_")[1];
      el(`${prefix}_desc_${i}`).value = match.desc;
    }
  }
});

// ---------------- GET ROW DATA ----------------
function getRows(prefix) {
  let arr = [];
  for (let i=0;i<4;i++) {
    let code = el(`${prefix}_code_${i}`)?.value;
    let desc = el(`${prefix}_desc_${i}`)?.value;
    let hrs = el(`${prefix}_hrs_${i}`)?.value;
    if (code || desc || hrs) {
      arr.push({code,desc,hrs});
    }
  }
  return arr;
}

// ---------------- SAVE ----------------
async function saveItem() {
  let data = {
    case_number: el("case_number").value,
    container_number: el("container_number").value,
    chassis_number: el("chassis_number").value,
    location: el("location").value,
    repair_description: el("repair_description").value,
    diag_rows: JSON.stringify(getRows("diag")),
    repair_rows: JSON.stringify(getRows("rep"))
  };

  await sb.from(TABLE_NAME).insert(data);
  loadRows();
}

// ---------------- LOAD ----------------
async function loadRows() {
  let {data} = await sb.from(TABLE_NAME).select("*");
  rows = data || [];
  renderTable();
}

// ---------------- TABLE ----------------
function renderTable() {
  let tbody = el("tableBody");
  if (!tbody) return;

  tbody.innerHTML = rows.map(r=>`
    <tr>
      <td>${r.case_number||""}</td>
      <td>${r.container_number||""}</td>
      <td>${r.chassis_number||""}</td>
      <td>${r.location||""}</td>
      <td>${r.repair_description||""}</td>
    </tr>
  `).join("");
}

// ---------------- AUTH ----------------
async function signIn() {
  let {error} = await sb.auth.signInWithPassword({
    email: el("loginEmail").value,
    password: el("loginPassword").value
  });
  if (error) alert(error.message);
}

async function signOut() {
  await sb.auth.signOut();
}

// ---------------- INIT ----------------
async function init() {
  if (!HAS_CONFIG) return alert("Config missing");

  buildCompList();
  initRows();

  const {data} = await sb.auth.getSession();
  if (data.session) loadRows();
}

// ---------------- EVENTS ----------------
document.addEventListener("DOMContentLoaded", () => {
  el("saveBtn")?.addEventListener("click", saveItem);
  el("signInBtn")?.addEventListener("click", signIn);
  el("signOutBtn")?.addEventListener("click", signOut);
  el("addDiag")?.addEventListener("click", ()=>enableNext("diag"));
  el("addRepair")?.addEventListener("click", ()=>enableNext("rep"));

  init();
});
