

```js
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

function showMessage(text, kind = "info") {
  const node = el("appStatus");
  if (!node) return;
  node.textContent = text;
  node.className = kind === "warning" ? "banner warning" : "banner";
  node.classList.remove("hidden");
}

function hideMessage() {
  const node = el("appStatus");
  if (node) node.classList.add("hidden");
}

function cleanValue(v) {
  return String(v || "").replace(/^[\s:#\-\/]+/, "").replace(/\s{2,}/g, " ").trim();
}

function parseRequestText(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "")
    .replace(/[\u00A0\u2007\u202F]/g, " ")
    .replace(/[–—]/g, "-");

  const lines = normalized.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  const out = {
    case_number: "",
    container_number: "",
    chassis_number: "",
    location: "",
    repair_description: "",
  };

  function getLine(regex) {
    for (const line of lines) {
      const m = line.match(regex);
      if (m && m[1]) return cleanValue(m[1]);
    }
    return "";
  }

  function getSection(startLabels, stopLabels) {
    const startGroup = startLabels.join("|");
    const stopGroup = stopLabels.join("|");
    const rgx = new RegExp(
      '(?:^|\\n)\\s*(?:' + startGroup + ')\\s*(?:#|number|id)?\\s*[:#-]?\\s*([\\s\\S]*?)(?=\\n\\s*(?:' + stopGroup + ')\\b|$)',
      "i"
    );
    const m = normalized.match(rgx);
    return m && m[1] ? cleanValue(m[1].replace(/\n+/g, " ")) : "";
  }

  out.case_number = getLine(/^(?:Case\s*(?:#|Number)?|ISA)\s*[:#-]?\s*(.+)$/i);
  out.container_number = getLine(/^(?:Container|Trailer)\s*(?:#|Number|ID)?\s*[:#-]?\s*(.+)$/i);
  out.chassis_number = getLine(/^Chassis\s*(?:#|Number|ID)?\s*[:#-]?\s*(.+)$/i);
  out.location = getSection(
    ["Physical\\s*location", "Location"],
    ["Description\\s*of\\s*the\\s*repair", "Description", "Issue", "Additional\\s*information", "Thank\\s*you", "Case", "ISA", "Container", "Trailer", "Chassis"]
  );
  out.repair_description = getSection(
    ["Description\\s*of\\s*the\\s*repair", "Description", "Issue"],
    ["Additional\\s*information", "Thank\\s*you", "Case", "ISA", "Container", "Trailer", "Chassis", "Physical\\s*location", "Location"]
  );

  return out;
}

function handlePasteParse() {
  const text = el("pasteInput")?.value || "";
  const statusNode = el("pasteStatus");

  if (!text.trim()) {
    if (statusNode) statusNode.textContent = "Paste text first.";
    return;
  }

  if (statusNode) statusNode.textContent = "Parsing...";

  const parsed = parseRequestText(text);

  if (el("case_number")) el("case_number").value = parsed.case_number || "";
  if (el("container_number")) el("container_number").value = parsed.container_number || "";
  if (el("chassis_number")) el("chassis_number").value = parsed.chassis_number || "";
  if (el("location")) el("location").value = parsed.location || "";
  if (el("repair_description")) el("repair_description").value = parsed.repair_description || "";

  const found = [
    parsed.case_number ? "case" : "",
    parsed.container_number ? "container" : "",
    parsed.chassis_number ? "chassis" : "",
    parsed.location ? "location" : "",
    parsed.repair_description ? "description" : "",
  ].filter(Boolean);

  if (statusNode) {
    statusNode.textContent = found.length
      ? `Filled: ${found.join(", ")}. Review before saving.`
      : "Could not detect fields. Check formatting.";
  }
}

function loadExample() {
  if (el("pasteInput")) {
    el("pasteInput").value = `Case Number 20063260601
Container #: TLLU7777690
Chassis #: HDMZ50298
Physical location - 5990 N Cajon Blvd SAN BERNARDINO CA 92407 SBD3 PS321
Description of the repair - Clearance and marker lights are all out
Additional information -`;
  }
  if (el("pasteStatus")) {
    el("pasteStatus").textContent = "Example loaded. Click Parse & Autofill.";
  }
}

function money(v) {
  const n = parseFloat(v);
  return Number.isNaN(n) ? 0 : n;
}

function fmtMoney(v) {
  return `$${v.toFixed(2)}`;
}

function escapeHtml(v) {
  return String(v)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formData() {
  return {
    case_number: el("case_number")?.value.trim() || "",
    container_number: el("container_number")?.value.trim() || "",
    chassis_number: el("chassis_number")?.value.trim() || "",
    location: el("location")?.value.trim() || "",
    repair_description: el("repair_description")?.value.trim() || "",
    diag_ro_number: el("diag_ro_number")?.value.trim() || "",
    repair_ro_number: el("repair_ro_number")?.value.trim() || "",
    diag_comp_code: el("diag_comp_code")?.value.trim() || "",
    diag_cc_description: el("diag_cc_description")?.value.trim() || "",
    diag_cc_hours: el("diag_cc_hours")?.value.trim() || "",
    repair_comp_code: el("repair_comp_code")?.value.trim() || "",
    repair_cc_description: el("repair_cc_description")?.value.trim() || "",
    repair_cc_hours: el("repair_cc_hours")?.value.trim() || "",
    status: el("status")?.value || STATUS_OPTIONS[0],
    notes: el("notes")?.value.trim() || "",
  };
}

function setForm(item = {}) {
  if (el("case_number")) el("case_number").value = item.case_number || "";
  if (el("container_number")) el("container_number").value = item.container_number || "";
  if (el("chassis_number")) el("chassis_number").value = item.chassis_number || "";
  if (el("location")) el("location").value = item.location || "";
  if (el("repair_description")) el("repair_description").value = item.repair_description || "";
  if (el("diag_ro_number")) el("diag_ro_number").value = item.diag_ro_number || "";
  if (el("repair_ro_number")) el("repair_ro_number").value = item.repair_ro_number || "";
  if (el("diag_comp_code")) el("diag_comp_code").value = item.diag_comp_code || "";
  if (el("diag_cc_description")) el("diag_cc_description").value = item.diag_cc_description || "";
  if (el("diag_cc_hours")) el("diag_cc_hours").value = item.diag_cc_hours || "";
  if (el("repair_comp_code")) el("repair_comp_code").value = item.repair_comp_code || "";
  if (el("repair_cc_description")) el("repair_cc_description").value = item.repair_cc_description || "";
  if (el("repair_cc_hours")) el("repair_cc_hours").value = item.repair_cc_hours || "";
  if (el("status")) el("status").value = item.status || STATUS_OPTIONS[0];
  if (el("notes")) el("notes").value = item.notes || "";
}

function resetForm() {
  editingId = null;
  if (el("formTitle")) el("formTitle").textContent = "Add New Case";
  if (el("saveBtn")) el("saveBtn").textContent = "Add Case";
  if (el("pasteInput")) el("pasteInput").value = "";
  if (el("pasteStatus")) el("pasteStatus").textContent = "Waiting for pasted text.";
  setForm({});
}

async function saveItem() {
  const data = formData();

  if (!data.container_number || !data.chassis_number || !data.location || !data.repair_description) {
    alert("Container, chassis, location, and repair description are required.");
    return;
  }

  try {
    if (editingId) {
      const { error } = await supabase
        .from(TABLE_NAME)
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", editingId);
      if (error) throw error;
    } else {
      const { error } = await supabase.from(TABLE_NAME).insert(data);
      if (error) throw error;
    }

    resetForm();
    await loadRows();
  } catch (err) {
    showMessage(err.message || "Could not save case.", "warning");
  }
}

function editItem(id) {
  const item = rows.find((x) => x.id === id);
  if (!item) return;
  editingId = id;
  if (el("formTitle")) el("formTitle").textContent = "Edit Case";
  if (el("saveBtn")) el("saveBtn").textContent = "Save Changes";
  setForm(item);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function deleteItem(id) {
  if (!confirm("Delete this case?")) return;

  try {
    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
    if (error) throw error;
    await loadRows();
  } catch (err) {
    showMessage(err.message || "Could not delete case.", "warning");
  }
}

async function nextStatus(id) {
  const item = rows.find((x) => x.id === id);
  if (!item) return;

  const pos = STATUS_OPTIONS.indexOf(item.status);
  const next = STATUS_OPTIONS[Math.min(pos + 1, STATUS_OPTIONS.length - 1)];

  try {
    const { error } = await supabase
      .from(TABLE_NAME)
      .update({ status: next, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    await loadRows();
  } catch (err) {
    showMessage(err.message || "Could not update status.", "warning");
  }
}

function statusClass(s) {
  return s === "Pending Shop Availability"
    ? "s1"
    : s === "Diag RO Open"
    ? "s2"
    : s === "Diag Done"
    ? "s3"
    : s === "Repair RO Open"
    ? "s4"
    : "s5";
}

function roCell(ro, code, desc, hrs) {
  if (!ro) return "—";
  const title = cleanValue([code, desc, hrs ? `${hrs} hr` : ""].filter(Boolean).join(" "));
  return `<span class="ro-hover" title="${escapeHtml(title || "No comp code details added")}">${escapeHtml(ro)}</span>`;
}

function updateStats(items) {
  if (el("statTotal")) el("statTotal").textContent = items.length;
  if (el("statPending")) el("statPending").textContent = items.filter((x) => x.status === "Pending Shop Availability").length;
  if (el("statDiagOpen")) el("statDiagOpen").textContent = items.filter((x) => x.status === "Diag RO Open").length;
  if (el("statCompleted")) el("statCompleted").textContent = items.filter((x) => x.status === "Repair Order Completed").length;
}

function renderTable() {
  updateStats(rows);

  const q = el("searchInput")?.value.toLowerCase().trim() || "";
  const sf = el("statusFilter")?.value || "all";
  const filtered = rows.filter((item) => {
    const text = [
      item.case_number,
      item.container_number,
      item.chassis_number,
      item.location,
      item.repair_description,
      item.diag_ro_number,
      item.repair_ro_number,
      item.notes,
    ]
      .join(" ")
      .toLowerCase();

    return (!q || text.includes(q)) && (sf === "all" || item.status === sf);
  });

  const tbody = el("tableBody");
  if (!tbody) return;

  if (!filtered.length) {
    tbody.innerHTML =
      '<tr><td colspan="10" style="text-align:center;border-left:1px solid var(--border);border-right:1px solid var(--border);border-radius:16px">No matching cases found.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (item) => `
      <tr>
        <td><button type="button" class="case-btn" data-id="${item.id}">${escapeHtml(item.case_number || "Open Email")}</button></td>
        <td>${escapeHtml(item.container_number || "—")}</td>
        <td>${escapeHtml(item.chassis_number || "—")}</td>
        <td>${escapeHtml(item.location || "—")}</td>
        <td>${escapeHtml(item.repair_description || "—")}</td>
        <td>${roCell(item.diag_ro_number, item.diag_comp_code, item.diag_cc_description, item.diag_cc_hours)}</td>
        <td>${roCell(item.repair_ro_number, item.repair_comp_code, item.repair_cc_description, item.repair_cc_hours)}</td>
        <td><span class="status ${statusClass(item.status)}">${escapeHtml(item.status)}</span></td>
        <td>${escapeHtml(item.notes || "—")}</td>
        <td>
          <div class="actions">
            <button type="button" data-edit="${item.id}">Edit</button>
            <button type="button" data-next="${item.id}">Next</button>
            <button type="button" data-del="${item.id}">Delete</button>
          </div>
        </td>
      </tr>`
    )
    .join("");
}

function makeMailto(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function getItemById(id) {
  return rows.find((x) => x.id === id);
}

function openModal(id) {
  const item = getItemById(id);
  if (!item) return;

  activeCaseId = id;

  if (el("modalMeta")) {
    el("modalMeta").textContent = `Case ${item.case_number || "—"} | Container ${item.container_number || "—"} | Chassis ${item.chassis_number || "—"}`;
  }

  if (el("m_diag_ro")) el("m_diag_ro").value = item.diag_ro_number || "";
  if (el("m_diag_code")) el("m_diag_code").value = item.diag_comp_code || "";
  if (el("m_diag_desc")) el("m_diag_desc").value = item.diag_cc_description || "";
  if (el("m_diag_hours")) el("m_diag_hours").value = item.diag_cc_hours || "";
  if (el("m_rep_ro")) el("m_rep_ro").value = item.repair_ro_number || "";
  if (el("m_rep_ref")) el("m_rep_ref").value = item.diag_ro_number || "";
  if (el("m_rep_code")) el("m_rep_code").value = item.repair_comp_code || "";
  if (el("m_rep_desc")) el("m_rep_desc").value = item.repair_cc_description || "";
  if (el("m_rep_hours")) el("m_rep_hours").value = item.repair_cc_hours || "";
  if (el("m_rep_notes")) el("m_rep_notes").value = item.notes || "";

  if (el("emailModal")) el("emailModal").classList.remove("hidden");
  renderEmails();
}

function closeModal() {
  if (el("emailModal")) el("emailModal").classList.add("hidden");
  activeCaseId = null;
}

function buildDiagEmail(item) {
  const greeting = el("m_diag_greeting")?.value.trim() || "Hello Amz,";
  const opening = el("m_diag_opening")?.value.trim() || "Thank you for the opportunity";
  const ro = el("m_diag_ro")?.value.trim() || "";
  const code = el("m_diag_code")?.value.trim() || "";
  const desc = el("m_diag_desc")?.value.trim() || "";
  const hrs = money(el("m_diag_hours")?.value);
  const rate = money(el("m_diag_rate")?.value);
  const total = hrs * rate;
  const cc = [code, desc, hrs ? `${hrs}hr` : ""].filter(Boolean).join(" ");

  return `${greeting}
${opening}
We have a tech assigned to look at the unit. We will advise of repairs needed soon
Initial Diagnosis RO ${ro || "__________"}

Case Number ${item.case_number || ""}
Container ${item.container_number || ""}
Chassis ${item.chassis_number || ""}
Concern ${item.repair_description || ""}

${cc ? cc + "\n" : ""}${desc || "Diagnosis"} ${hrs || 0} hour${hrs === 1 ? "" : "s"} @ ${fmtMoney(rate)}
Total=${fmtMoney(total)}`.trim();
}

function buildRepairEmail(item) {
  const greeting = el("m_rep_greeting")?.value.trim() || "Hello Amz,";
  const ro = el("m_rep_ro")?.value.trim() || "";
  const ref = el("m_rep_ref")?.value.trim() || "";
  const code = el("m_rep_code")?.value.trim() || "";
  const desc = el("m_rep_desc")?.value.trim() || "";
  const hrs = money(el("m_rep_hours")?.value);
  const rate = money(el("m_rep_rate")?.value);
  const travelHours = money(el("m_rep_travel_hours")?.value);
  const travelRate = money(el("m_rep_travel_rate")?.value);
  const notes = el("m_rep_notes")?.value.trim() || "";
  const completion = el("m_rep_completion")?.value.trim() || "";
  const labor = hrs * rate;
  const travel = travelHours * travelRate;
  const total = labor + travel;
  const cc = [code, desc, hrs ? `${hrs}hr` : ""].filter(Boolean).join(" ");

  return `${greeting}
Here is the Repair Order number to complete the repairs on RO ${ro || "__________"}
${ref ? `Reference Diagnosis RO ${ref}\n` : ""}Please see the estimate below to make the requested repairs
RO ${ro || "__________"}

Case Number ${item.case_number || ""}
Container ${item.container_number || ""}
Chassis ${item.chassis_number || ""}
Concern ${item.repair_description || ""}

Repair Estimate
${cc ? cc + "\n" : ""}Total Labor hours ${hrs || 0} For ${desc || "Repair"} =${fmtMoney(labor)}
${travelHours ? `${travelHours} Hour Travel Time Total = ${fmtMoney(travel)}\n` : ""}Total ${fmtMoney(total)}
${completion ? "\n" + completion : ""}

${notes ? "Tech Notes:\n" + notes : ""}`.trim();
}

function renderEmails() {
  const item = getItemById(activeCaseId);
  if (!item) return;
  if (el("diagOut")) el("diagOut").textContent = buildDiagEmail(item);
  if (el("repOut")) el("repOut").textContent = buildRepairEmail(item);
}

async function saveModal() {
  const item = getItemById(activeCaseId);
  if (!item) return;

  try {
    const payload = {
      diag_ro_number: el("m_diag_ro")?.value.trim() || "",
      diag_comp_code: el("m_diag_code")?.value.trim() || "",
      diag_cc_description: el("m_diag_desc")?.value.trim() || "",
      diag_cc_hours: el("m_diag_hours")?.value.trim() || "",
      repair_ro_number: el("m_rep_ro")?.value.trim() || "",
      repair_comp_code: el("m_rep_code")?.value.trim() || "",
      repair_cc_description: el("m_rep_desc")?.value.trim() || "",
      repair_cc_hours: el("m_rep_hours")?.value.trim() || "",
      notes: el("m_rep_notes")?.value.trim() || "",
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from(TABLE_NAME).update(payload).eq("id", activeCaseId);
    if (error) throw error;

    await loadRows();
    alert("Case updated.");
  } catch (err) {
    showMessage(err.message || "Could not update case.", "warning");
  }
}

async function loadRows() {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  rows = data || [];
  renderTable();
}

async function signIn() {
  const email = el("loginEmail")?.value.trim() || "";
  const password = el("loginPassword")?.value || "";
  const status = el("authStatus");
  if (status) status.textContent = "Signing in...";

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (status) status.textContent = error.message;
    return;
  }

  if (status) status.textContent = "";
}

async function signOut() {
  await supabase.auth.signOut();
}

async function setupRealtime() {
  if (channel) {
    supabase.removeChannel(channel);
  }

  channel = supabase
    .channel("global-mile-tracker-live")
    .on("postgres_changes", { event: "*", schema: "public", table: TABLE_NAME }, async () => {
      await loadRows();
    })
    .subscribe();
}

async function handleSession(session) {
  const authView = el("authView");
  const trackerView = el("trackerView");

  if (!session) {
    if (authView) authView.classList.remove("hidden");
    if (trackerView) trackerView.classList.add("hidden");
    return;
  }

  if (authView) authView.classList.add("hidden");
  if (trackerView) trackerView.classList.remove("hidden");

  hideMessage();
  await loadRows();
  await setupRealtime();
}

async function init() {
  if (!HAS_CONFIG) {
    const authView = el("authView");
    const trackerView = el("trackerView");
    const configWarning = el("configWarning");

    if (configWarning) configWarning.classList.remove("hidden");
    if (authView) authView.classList.remove("hidden");
    if (trackerView) trackerView.classList.add("hidden");

    showMessage("Config missing or not loading.", "warning");
    return;
  }

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    await handleSession(sessionData.session);

    supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSession(session);
    });
  } catch (err) {
    console.error(err);
    showMessage(err.message || "App failed to initialize.", "warning");
  }
}

function bindEvents() {
  el("parseBtn")?.addEventListener("click", handlePasteParse);
  el("exampleBtn")?.addEventListener("click", loadExample);
  el("saveBtn")?.addEventListener("click", saveItem);
  el("cancelBtn")?.addEventListener("click", resetForm);
  el("signInBtn")?.addEventListener("click", signIn);
  el("signOutBtn")?.addEventListener("click", signOut);
  el("searchInput")?.addEventListener("input", renderTable);
  el("statusFilter")?.addEventListener("change", renderTable);
  el("closeModalBtn")?.addEventListener("click", closeModal);
  el("copyDiagBtn")?.addEventListener("click", () => {
    const item = getItemById(activeCaseId);
    if (item) navigator.clipboard.writeText(buildDiagEmail(item));
  });
  el("copyRepairBtn")?.addEventListener("click", () => {
    const item = getItemById(activeCaseId);
    if (item) navigator.clipboard.writeText(buildRepairEmail(item));
  });
  el("sendDiagBtn")?.addEventListener("click", () => {
    const item = getItemById(activeCaseId);
    if (!item) return;
    const ro = el("m_diag_ro")?.value.trim() || "";
    location.href = makeMailto(ro ? `Create diag RO ${ro}` : "Create diag RO", buildDiagEmail(item));
  });
  el("sendRepairBtn")?.addEventListener("click", () => {
    const item = getItemById(activeCaseId);
    if (!item) return;
    const ro = el("m_rep_ro")?.value.trim() || "";
    location.href = makeMailto(ro ? `Repair order approval RO ${ro}` : "Repair order approval", buildRepairEmail(item));
  });
  el("saveModalBtn")?.addEventListener("click", saveModal);

  [
    "m_diag_greeting","m_diag_opening","m_diag_ro","m_diag_code","m_diag_desc","m_diag_hours","m_diag_rate",
    "m_rep_greeting","m_rep_ro","m_rep_ref","m_rep_code","m_rep_desc","m_rep_hours","m_rep_rate",
    "m_rep_travel_hours","m_rep_travel_rate","m_rep_notes","m_rep_completion"
  ].forEach((id) => {
    el(id)?.addEventListener("input", renderEmails);
  });

  document.addEventListener("click", (e) => {
    const caseBtn = e.target.closest("[data-id]");
    if (caseBtn) {
      openModal(caseBtn.getAttribute("data-id"));
      return;
    }

    const editBtn = e.target.closest("[data-edit]");
    if (editBtn) {
      editItem(editBtn.getAttribute("data-edit"));
      return;
    }

    const nextBtn = e.target.closest("[data-next]");
    if (nextBtn) {
      nextStatus(nextBtn.getAttribute("data-next"));
      return;
    }

    const delBtn = e.target.closest("[data-del]");
    if (delBtn) {
      deleteItem(delBtn.getAttribute("data-del"));
      return;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  resetForm();
  init();
});
```
