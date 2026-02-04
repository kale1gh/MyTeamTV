// MyTeamTV demo app (multi-page) with "login" + onboarding via localStorage
// NOTE: For a class project, this is perfect. For real production, you’d replace with real auth + backend.

const SPORTS = ["NFL","NBA","MLB","NHL","College Football","College Basketball","Soccer","Tennis"];
const TEAMS = [
  "Dallas Cowboys","Kansas City Chiefs","Green Bay Packers",
  "Los Angeles Lakers","Dallas Mavericks","Boston Celtics",
  "Houston Astros","New York Yankees",
  "Texas A&M Aggies","Alabama Crimson Tide",
  "FC Barcelona","Manchester United"
];

function getState(){
  return {
    user: JSON.parse(localStorage.getItem("mtv_user") || "null"),
    picks: JSON.parse(localStorage.getItem("mtv_picks") || "{\"sports\":[],\"teams\":[]}")
  };
}
function setUser(user){ localStorage.setItem("mtv_user", JSON.stringify(user)); }
function setPicks(picks){ localStorage.setItem("mtv_picks", JSON.stringify(picks)); }
function logout(){
  localStorage.removeItem("mtv_user");
  localStorage.removeItem("mtv_picks");
  location.reload();
}

function computePrice(sportsCount, teamsCount){
  if (sportsCount === 0) return { price: 0, tier: "—", note: "Select at least 1 sport to start.", details: "" };

  let base, tier, includedTeams, perTeam;

  // Price tiers aligned to current consumer expectations (roughly: ~$13, ~$25, ~$35, ~$45)
  if (sportsCount === 1){
    base = 12.99; tier = "Basic Fan"; includedTeams = 2; perTeam = 2.50;
  } else if (sportsCount <= 2){
    base = 24.99; tier = "Team Pass"; includedTeams = 5; perTeam = 2.00;
  } else if (sportsCount <= 4){
    base = 34.99; tier = "All-Star"; includedTeams = 10; perTeam = 1.50;
  } else {
    base = 39.99; tier = "Super Fan"; includedTeams = 12; perTeam = 1.25;
  }

  const extraTeams = Math.max(0, teamsCount - includedTeams);
  let price = base + extraTeams * perTeam;

  const shouldUnlimited = (sportsCount >= 6) || (teamsCount >= 15) || (price > 44.99);
  if (shouldUnlimited){
    return {
      price: 44.99,
      tier: "Unlimited Access",
      note: "You’re on Unlimited — everything included.",
      details: "Unlimited includes all sports + teams, plus premium features like multi-game view and full replays."
    };
  }

  const details =
    `${tier} includes ${sportsCount} sport${sportsCount!==1?'s':''} access and up to ${includedTeams} team selections. ` +
    (extraTeams > 0 ? `Extra teams: ${extraTeams} × $${perTeam.toFixed(2)}.` : `Add up to ${includedTeams} teams at no extra cost.`);

  return { price, tier, note: "Cancel anytime. Student pricing can reduce entry tiers.", details };
}

function mountNavActive(){
  const path = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  document.querySelectorAll("[data-nav]").forEach(a=>{
    const target = (a.getAttribute("href") || "").toLowerCase();
    if (target.endsWith(path)) a.classList.add("active");
  });
}

function qs(sel){ return document.querySelector(sel); }
function qsa(sel){ return [...document.querySelectorAll(sel)]; }
// ===== Pitch Mode =====
function isPitchMode(){
  return localStorage.getItem("mtv_pitch_mode") === "1";
}
function setPitchMode(on){
  localStorage.setItem("mtv_pitch_mode", on ? "1" : "0");
  document.body.classList.toggle("pitch", on);
  updatePitchToggleLabel();
}
function updatePitchToggleLabel(){
  const btn = document.querySelector("#pitchToggle");
  if (!btn) return;
  btn.textContent = isPitchMode() ? "Pitch Mode: ON" : "Pitch Mode: OFF";
}
function mountPitchMode(){
  document.body.classList.toggle("pitch", isPitchMode());
  updatePitchToggleLabel();

  const btn = document.querySelector("#pitchToggle");
  if (!btn) return;

  btn.addEventListener("click", ()=>{
    setPitchMode(!isPitchMode());
  });
}

function openModal(id){
  const el = qs(id);
  if (!el) return;
  el.style.display = "flex";
}
function closeModal(id){
  const el = qs(id);
  if (!el) return;
  el.style.display = "none";
}

function renderPills(containerId, items, selectedSet, onToggle){
  const wrap = qs(containerId);
  if (!wrap) return;
  wrap.innerHTML = "";
  items.forEach(label=>{
    const id = `${containerId}-${label}`.replace(/\s+/g,"-").toLowerCase();
    const pill = document.createElement("label");
    pill.className = "pick";
    pill.setAttribute("for", id);
    pill.innerHTML = `<input id="${id}" type="checkbox" ${selectedSet.has(label)?"checked":""}/> <span>${label}</span>`;
    pill.querySelector("input").addEventListener("change",(e)=>onToggle(label, e.target.checked));
    wrap.appendChild(pill);
  });
}

function mountAuthUI(){
  const state = getState();
  const who = qs("#who");
  const authBtn = qs("#authBtn");
  const logoutBtn = qs("#logoutBtn");

  if (!who || !authBtn) return;

  if (state.user){
    who.textContent = `Signed in as ${state.user.name}`;
    authBtn.style.display = "none";
    if (logoutBtn) logoutBtn.style.display = "inline-flex";
  } else {
    who.textContent = "Not signed in";
    authBtn.style.display = "inline-flex";
    if (logoutBtn) logoutBtn.style.display = "none";
  }

  if (logoutBtn) logoutBtn.addEventListener("click", logout);

  const openLogin = qs("#openLogin");
  if (openLogin) openLogin.addEventListener("click", ()=>openModal("#loginModal"));

  const closeLogin = qs("#closeLogin");
  if (closeLogin) closeLogin.addEventListener("click", ()=>closeModal("#loginModal"));

  const loginForm = qs("#loginForm");
  if (loginForm){
    loginForm.addEventListener("submit",(e)=>{
      e.preventDefault();
      const name = qs("#loginName").value.trim() || "Fan";
      const email = qs("#loginEmail").value.trim() || "fan@example.com";
      setUser({ name, email });
      closeModal("#loginModal");

      // After login, push onboarding
      openModal("#onboardModal");
      mountOnboarding();
      mountAuthUI();
    });
  }

  const closeOnboard = qs("#closeOnboard");
  if (closeOnboard) closeOnboard.addEventListener("click", ()=>closeModal("#onboardModal"));
}

function mountOnboarding(){
  const state = getState();
  const picks = state.picks || { sports: [], teams: [] };
  const sportsSet = new Set(picks.sports || []);
  const teamsSet = new Set(picks.teams || []);

  renderPills("#sportPills", SPORTS, sportsSet, (label, checked)=>{
    checked ? sportsSet.add(label) : sportsSet.delete(label);
    updateSummary();
  });

  renderPills("#teamPills", TEAMS, teamsSet, (label, checked)=>{
    checked ? teamsSet.add(label) : teamsSet.delete(label);
    updateSummary();
  });

  function updateSummary(){
    const sportsCount = sportsSet.size;
    const teamsCount = teamsSet.size;
    const out = computePrice(sportsCount, teamsCount);

    const tier = qs("#tierTag");
    const price = qs("#price");
    const note = qs("#priceNote");
    const details = qs("#tierDetails");
    const sc = qs("#sportCount");
    const tc = qs("#teamCount");

    if (tier) tier.textContent = `Tier: ${out.tier}`;
    if (price) price.textContent = `$${out.price.toFixed(2)}`;
    if (note) note.textContent = out.note;
    if (details) details.textContent = out.details;
    if (sc) sc.textContent = sportsCount;
    if (tc) tc.textContent = teamsCount;
  }

  updateSummary();

  const saveBtn = qs("#savePicks");
  if (saveBtn){
    saveBtn.onclick = ()=>{
      if (sportsSet.size === 0){
        alert("Pick at least 1 sport to build your plan 🙂");
        return;
      }
      setPicks({ sports: [...sportsSet], teams: [...teamsSet] });
      closeModal("#onboardModal");

      // If a dashboard widget exists, refresh it
      mountMiniPlan();
    };
  }
}

function mountMiniPlan(){
  // Optional mini-plan widget on pages (if elements exist)
  const state = getState();
  const picks = state.picks || { sports: [], teams: [] };
  const sportsCount = (picks.sports || []).length;
  const teamsCount = (picks.teams || []).length;

  const tier = qs("#miniTier");
  const price = qs("#miniPrice");
  const list = qs("#miniList");

  if (!tier || !price || !list) return;

  const out = computePrice(sportsCount, teamsCount);
  tier.textContent = out.tier;
  price.textContent = `$${out.price.toFixed(2)}`;

  const sports = picks.sports || [];
  const teams = picks.teams || [];
  list.textContent = `${sports.length ? sports.join(", ") : "No sports yet"} • ${teams.length ? teams.length + " teams" : "No teams"}`;
}

function mountQuickStart(){
  const quick = qs("#quickStart");
  if (!quick) return;

  quick.addEventListener("click", ()=>{
    const state = getState();
    if (!state.user){
      openModal("#loginModal");
      return;
    }
    openModal("#onboardModal");
    mountOnboarding();
  });
}

function init(){
  mountNavActive();
  mountPitchMode();
  mountAuthUI();
  mountMiniPlan();
  mountQuickStart();

  // If user clicks a "Customize Plan" button on pricing page
  qsa("[data-open-onboard]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const state = getState();
      if (!state.user){
        openModal("#loginModal");
        return;
      }
      openModal("#onboardModal");
      mountOnboarding();
    });
  });

  // Close modals if you click backdrop
  qsa(".modalOverlay").forEach(ov=>{
    ov.addEventListener("click",(e)=>{
      if (e.target.classList.contains("modalOverlay")){
        ov.style.display="none";
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", init);
