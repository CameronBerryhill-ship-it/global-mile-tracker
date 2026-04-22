const CONFIG = window.APP_CONFIG || {};

const HAS_CONFIG =
  CONFIG.SUPABASE_URL &&
  CONFIG.SUPABASE_ANON_KEY;

const TABLE_NAME = "global_mile_tracker_cases";

let editingId = null;
let activeCaseId = null;
let rows = [];
let channel = null;

// ✅ FIXED: only declare ONCE
const supabase = window.supabase.createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_ANON_KEY
);

const el = (id) => document.getElementById(id);

async function loadRows() {
  const { data, error } = await supabase
    .from(TABLE_NAME)
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  rows = data || [];
  console.log("Loaded rows:", rows);
}

async function signIn() {
  const email = el("loginEmail").value.trim();
  const password = el("loginPassword").value;

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert(error.message);
  }
}

async function signOut() {
  await supabase.auth.signOut();
}

async function init() {
  if (!HAS_CONFIG) {
    alert("Config missing");
    return;
  }

  const { data } = await supabase.auth.getSession();
  console.log("Session:", data);

  await loadRows();
}

document.addEventListener("DOMContentLoaded", init);
