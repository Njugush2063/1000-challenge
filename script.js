// ── CONFIG ─────────────────────────────────────────────────
const SUPABASE_URL      = 'https://oslqmrkpgwwlxvclsvgc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zbHFtcmtwZ3d3bHh2Y2xzdmdjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjkzMjIsImV4cCI6MjA5NzQ0NTMyMn0.aL42NN0dMNgtQS-NzLZ7DxycO4m52kfkFKxQRBQib1Y';
// ───────────────────────────────────────────────────────────

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
let currentUser = null;
let userProfile = null;
let entries = [], wins = [];
let saveDashTimer, saveMonthTimer, saveYearTimer;
let catChartObj, monthChartObj, methodChartObj;
let isDark = false;

const PAGE_TITLES = {
  dashboard:'Dashboard', add:'Add Entry', log:'Entries', wins:'Wins',
  analytics:'Analytics', milestones:'Achievements', monthly:'Monthly Review',
  yearend:'Year-End Reflection', settings:'Settings'
};

const QUOTES = [
  'The goal is not to avoid rejection. The goal is to become the kind of person who isn\'t afraid of it.',
  'Success is often hidden inside persistence.',
  'One thousand attempts. One transformed life.',
  'Every no brings you closer to the yes that changes everything.',
  'Rejection is not failure. It\'s data. Use it wisely.',
  'The most successful people share one trait: they kept going.',
  'Courage is asking — even when the answer might be no.'
];

const MILESTONES = [
  {count:1,   icon:'🏅', label:'First rejection',  sub:'The journey begins'},
  {count:10,  icon:'🥉', label:'10 rejections',    sub:'Just getting started'},
  {count:25,  icon:'🥈', label:'25 rejections',    sub:'Building momentum'},
  {count:50,  icon:'🥇', label:'50 rejections',    sub:'Halfway to 100'},
  {count:100, icon:'🏆', label:'100 rejections',   sub:'First major milestone'},
  {count:250, icon:'💎', label:'250 rejections',   sub:'Quarter of the way'},
  {count:500, icon:'🚀', label:'500 rejections',   sub:'Halfway done'},
  {count:750, icon:'⚡', label:'750 rejections',   sub:'Almost there'},
  {count:1000,icon:'👑', label:'1000 rejections',  sub:'Challenge complete!'}
];
const SPECIALS = [
  {id:'first_accept',   icon:'⭐', label:'First acceptance',      hint:'Log your first win'},
  {id:'first_interview',icon:'🎤', label:'First interview',       hint:'Got invited to interview'},
  {id:'first_referral', icon:'🤝', label:'First referral',        hint:'Got referred by someone'},
  {id:'first_client',   icon:'💼', label:'First client',          hint:'Signed your first client'},
  {id:'first_partner',  icon:'🔗', label:'First partnership',     hint:'Formed a partnership'},
  {id:'first_paid',     icon:'💰', label:'First paid opportunity',hint:'Earned from an attempt'},
  {id:'streak_30',      icon:'🔥', label:'30-day streak',         hint:'30 consecutive days of action'},
  {id:'no_quit_100',    icon:'💪', label:'100 attempts',          hint:'Never quit — logged 100+'}
];

// ── TOAST ───────────────────────────────────────────────────
function toast(msg, type='', dur=2800) {
  const el = document.getElementById('toast');
  el.textContent = msg; el.className = 'show' + (type ? ' '+type : '');
  setTimeout(() => { el.className = ''; }, dur);
}

// ── THEME ───────────────────────────────────────────────────
function toggleTheme() {
  isDark = !isDark;
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
  const sb2 = document.getElementById('themeBtnSettings');
  if (sb2) sb2.textContent = isDark ? 'Switch to light' : 'Switch to dark';
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
  if (catChartObj) setTimeout(renderAnalytics, 50);
}
(function initTheme() {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark') { isDark = true; document.documentElement.setAttribute('data-theme','dark'); }
})();

// ── SIDEBAR (MOBILE) ────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebarOverlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebarOverlay').classList.remove('show');
}

// ── AUTH ────────────────────────────────────────────────────
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateUsername(username) {
  if (username.length < 3) return 'Username must be at least 3 characters.';
  if (username.length > 20) return 'Username must be 20 characters or fewer.';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only use letters, numbers, and underscores.';
  return '';
}

async function resolveLoginEmail(identifier) {
  if (identifier.includes('@')) {
    if (!isValidEmail(identifier)) throw new Error('Please enter a valid email address.');
    return identifier;
  }

  const { data, error } = await sb.rpc('get_email_by_username', { uname: identifier });
  if (error) throw new Error('Could not look up username. Run supabase-setup.sql in your Supabase project.');
  if (!data) throw new Error('No account found for that username.');
  return data;
}

function switchAuth(mode) {
  document.getElementById('loginForm').style.display  = mode==='login'  ? 'block' : 'none';
  document.getElementById('signupForm').style.display = mode==='signup' ? 'block' : 'none';
  document.querySelectorAll('.auth-tab').forEach((t,i) =>
    t.classList.toggle('active', (i===0&&mode==='login')||(i===1&&mode==='signup'))
  );
  document.getElementById('authMsg').className = 'auth-msg';
  document.getElementById('authBoxTitle').textContent = mode==='login' ? 'Welcome back' : 'Create your account';
  document.getElementById('authBoxSub').textContent   = mode==='login'
    ? 'Sign in with your username or email.'
    : 'Start your journey to 1,000 rejections.';
}
function setAuthMsg(msg, type='error') {
  const el = document.getElementById('authMsg');
  el.textContent = msg; el.className = 'auth-msg ' + type;
}

async function doLogin() {
  const identifier = document.getElementById('loginIdentifier').value.trim();
  const pass = document.getElementById('loginPass').value;
  if (!identifier || !pass) { setAuthMsg('Please enter your username or email and password.'); return; }

  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Signing in…';

  try {
    const email = await resolveLoginEmail(identifier);
    const { error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) setAuthMsg(error.message);
  } catch (err) {
    setAuthMsg(err.message);
  } finally {
    btn.disabled = false; btn.textContent = 'Sign in';
  }
}

async function doSignup() {
  const email = document.getElementById('signupEmail').value.trim();
  const username = document.getElementById('signupUsername').value.trim();
  const pass = document.getElementById('signupPass').value;

  if (!email || !username || !pass) {
    setAuthMsg('Please enter email, username, and password.');
    return;
  }
  if (!isValidEmail(email)) {
    setAuthMsg('Please enter a valid email address.');
    return;
  }
  const usernameErr = validateUsername(username);
  if (usernameErr) { setAuthMsg(usernameErr); return; }
  if (pass.length < 6) { setAuthMsg('Password must be at least 6 characters.'); return; }

  const btn = document.getElementById('signupBtn');
  btn.disabled = true; btn.textContent = 'Creating account…';

  const { data: available, error: checkErr } = await sb.rpc('is_username_available', { uname: username });
  if (checkErr) {
    btn.disabled = false; btn.textContent = 'Create account';
    setAuthMsg('Database setup required. Run supabase-setup.sql in your Supabase SQL editor.');
    return;
  }
  if (available === false) {
    btn.disabled = false; btn.textContent = 'Create account';
    setAuthMsg('That username is already taken. Please choose another.');
    return;
  }

  const { data, error } = await sb.auth.signUp({
    email,
    password: pass,
    options: { data: { username } }
  });

  btn.disabled = false; btn.textContent = 'Create account';

  if (error) {
    setAuthMsg(error.message);
    return;
  }

  if (data.session) {
    setAuthMsg('Account created! Welcome.', 'success');
  } else {
    setAuthMsg('Account created! Check your email to confirm, then sign in.', 'success');
  }
}

async function loadUserProfile() {
  if (!currentUser) return;
  const { data } = await sb.from('profiles').select('username, email').eq('id', currentUser.id).single();
  userProfile = data || {
    username: currentUser.user_metadata?.username || null,
    email: currentUser.email
  };
  updateUserDisplay();
}

function updateUserDisplay() {
  const displayName = userProfile?.username || currentUser?.email?.split('@')[0] || 'User';
  const email = userProfile?.email || currentUser?.email || '';
  document.getElementById('userEmail').textContent = displayName;
  document.getElementById('userAvatar').textContent = displayName[0].toUpperCase();
  document.getElementById('settingsEmail').textContent = email;
  const settingsUsername = document.getElementById('settingsUsername');
  if (settingsUsername) settingsUsername.textContent = userProfile?.username || '—';
}

async function doLogout() { await sb.auth.signOut(); }

// ── SESSION ─────────────────────────────────────────────────
sb.auth.onAuthStateChange(async (event, session) => {
  if (session?.user) {
    currentUser = session.user;
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('appScreen').style.display  = 'block';
    document.getElementById('fab').style.display = 'flex';
    document.getElementById('themeBtn').textContent = isDark ? '☀️' : '🌙';
    await loadUserProfile();
    await initApp();
  } else {
    currentUser = null;
    userProfile = null;
    document.getElementById('authScreen').style.display = 'flex';
    document.getElementById('appScreen').style.display  = 'none';
    document.getElementById('fab').style.display = 'none';
    entries = []; wins = [];
  }
});

// ── INIT ────────────────────────────────────────────────────
async function initApp() {
  await Promise.all([loadEntries(), loadWins()]);
  renderDashboard();
  populateMonthSelect();
}

// ── PAGE NAVIGATION ─────────────────────────────────────────
function showPage(name, btn) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  document.getElementById('page-'+name).classList.add('active');
  if (btn) btn.classList.add('active');
  document.getElementById('topbarTitle').textContent = PAGE_TITLES[name] || name;
  closeSidebar();
  if (name==='dashboard')  renderDashboard();
  if (name==='log')        renderLog();
  if (name==='wins')       renderWins();
  if (name==='monthly')    renderMonthly();
  if (name==='milestones') renderMilestones();
  if (name==='analytics')  setTimeout(renderAnalytics, 60);
  if (name==='yearend')    renderYearEnd();
  window.scrollTo(0,0);
}

// ── STATS ────────────────────────────────────────────────────
function calcStats() {
  const total    = entries.length;
  const rejected = entries.filter(e=>e.status==='Rejected'||e.status==='No Response').length;
  const pending  = entries.filter(e=>e.status==='Pending').length;
  const responded= entries.filter(e=>e.status!=='Pending'&&e.status!=='No Response').length;
  const rr = total ? Math.round(responded/total*100) : 0;
  const ar = total ? Math.round(wins.length/total*100) : 0;
  return { total, rejected, accepted:wins.length, pending, rr, ar };
}

function statsCardsHTML(s) {
  return `
    <div class="stat-card" style="--stat-color:#4F46E5;--stat-bg:#EEF2FF">
      <div class="stat-icon">📋</div>
      <div class="stat-label">Total attempts</div>
      <div class="stat-value">${s.total}</div>
      <div class="stat-sub">All logged entries</div>
    </div>
    <div class="stat-card" style="--stat-color:#EF4444;--stat-bg:#FEF2F2">
      <div class="stat-icon">🚫</div>
      <div class="stat-label">Rejections</div>
      <div class="stat-value">${s.rejected}</div>
      <div class="stat-sub">Toward your 1,000</div>
    </div>
    <div class="stat-card" style="--stat-color:#10B981;--stat-bg:#ECFDF5">
      <div class="stat-icon">✅</div>
      <div class="stat-label">Acceptances</div>
      <div class="stat-value" style="color:#10B981">${s.accepted}</div>
      <div class="stat-sub">Wins logged</div>
    </div>
    <div class="stat-card" style="--stat-color:#F59E0B;--stat-bg:#FFFBEB">
      <div class="stat-icon">⏳</div>
      <div class="stat-label">Pending</div>
      <div class="stat-value" style="color:#F59E0B">${s.pending}</div>
      <div class="stat-sub">Awaiting response</div>
    </div>
    <div class="stat-card" style="--stat-color:#6366F1;--stat-bg:#EEF2FF">
      <div class="stat-icon">📬</div>
      <div class="stat-label">Response rate</div>
      <div class="stat-value" style="color:#6366F1">${s.rr}%</div>
      <div class="stat-sub">Of total attempts</div>
    </div>
    <div class="stat-card" style="--stat-color:#10B981;--stat-bg:#ECFDF5">
      <div class="stat-icon">🎯</div>
      <div class="stat-label">Acceptance rate</div>
      <div class="stat-value" style="color:#10B981">${s.ar}%</div>
      <div class="stat-sub">Success ratio</div>
    </div>
  `;
}

// ── DASHBOARD ───────────────────────────────────────────────
async function renderDashboard() {
  const s = calcStats();
  document.getElementById('quoteBox').textContent = QUOTES[Math.floor(Date.now()/86400000)%QUOTES.length];
  const name = userProfile?.username || currentUser?.email?.split('@')[0] || 'there';
  document.getElementById('welcomeMsg').textContent = `Welcome back, ${name}. Keep going.`;
  document.getElementById('dashStats').innerHTML = statsCardsHTML(s);

  // Progress ring
  const pct = Math.min(100, s.rejected / 10);
  const circumference = 314;
  const offset = circumference - (circumference * pct / 100);
  document.getElementById('ringFg').style.strokeDashoffset = offset;
  document.getElementById('ringCount').textContent = s.rejected;
  document.getElementById('ringPct').textContent = Math.round(pct) + '%';
  document.getElementById('progBarLabel').textContent = s.rejected + ' rejections logged';
  document.getElementById('progBarPct').textContent = Math.round(pct) + '%';
  document.getElementById('progBarFill').style.width = pct + '%';

  const msgs = ['Every rejection is data. Keep going — you\'re building something most people never attempt.',
    'You\'re making real progress. Stay consistent and the results will follow.',
    'Double digits! You\'re building a habit that will change your life.',
    'Incredible momentum. You\'re in the top 5% of people who actually act on their goals.',
    'This is elite territory. Most people never make 100 attempts. You\'re transforming.'];
  const msgIdx = s.rejected >= 100 ? 4 : s.rejected >= 50 ? 3 : s.rejected >= 10 ? 2 : s.rejected >= 1 ? 1 : 0;
  document.getElementById('progressMsg').textContent = msgs[msgIdx];

  // Activity feed
  const recent = [...entries].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5);
  const actHTML = recent.length ? recent.map(e=>`
    <div class="activity-item">
      <div class="activity-dot ${e.status==='Accepted'?'green':e.status==='Pending'?'amber':''}"></div>
      <div>
        <div class="activity-text"><strong>${e.status}</strong> — ${e.organisation||e.position||'Entry'}</div>
        <div class="activity-time">${e.date ? new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}) : '—'}</div>
      </div>
    </div>`).join('')
    : `<div class="activity-item"><div class="activity-dot"></div><div><div class="activity-text">Start logging to see your activity</div></div></div>`;
  document.getElementById('activityFeed').innerHTML = actHTML;

  // Load saved highlights
  const { data } = await sb.from('dashboard_settings').select('*').eq('user_id', currentUser.id).single();
  if (data) {
    document.getElementById('d_start').value   = data.start_date || '';
    document.getElementById('d_target').value  = data.target_date || '';
    document.getElementById('d_win').value     = data.biggest_win || '';
    document.getElementById('d_opp').value     = data.best_opportunity || '';
    document.getElementById('d_lesson').value  = data.best_lesson || '';
    document.getElementById('d_rej').value     = data.memorable_rejection || '';
  }
}

async function saveDash() {
  clearTimeout(saveDashTimer);
  saveDashTimer = setTimeout(async () => {
    await sb.from('dashboard_settings').upsert({
      user_id: currentUser.id,
      start_date: document.getElementById('d_start').value || null,
      target_date: document.getElementById('d_target').value || null,
      biggest_win: document.getElementById('d_win').value,
      best_opportunity: document.getElementById('d_opp').value,
      best_lesson: document.getElementById('d_lesson').value,
      memorable_rejection: document.getElementById('d_rej').value,
      updated_at: new Date().toISOString()
    }, { onConflict:'user_id' });
  }, 800);
}

// ── ENTRIES ─────────────────────────────────────────────────
async function loadEntries() {
  const { data } = await sb.from('rejection_entries').select('*').eq('user_id', currentUser.id).order('date',{ascending:false});
  entries = data || [];
}

function renderLog() {
  document.getElementById('logLoading').style.display = 'none';
  const search = (document.getElementById('logSearch')?.value||'').toLowerCase();
  const catF   = document.getElementById('filterCat')?.value || '';
  const statF  = document.getElementById('filterStatus')?.value || '';
  let filtered = entries.filter(e=>{
    if (catF  && e.category !== catF) return false;
    if (statF && e.status   !== statF) return false;
    if (search && !((e.organisation||'')+(e.position||'')+(e.category||'')).toLowerCase().includes(search)) return false;
    return true;
  });
  document.getElementById('logSubtitle').textContent = `${filtered.length} of ${entries.length} entries`;
  const body  = document.getElementById('logBody');
  const empty = document.getElementById('logEmpty');
  if (!filtered.length) { body.innerHTML=''; empty.style.display='block'; return; }
  empty.style.display = 'none';
  body.innerHTML = filtered.map((e,i)=>`
    <tr>
      <td style="color:var(--text-3);font-size:12px">${i+1}</td>
      <td style="color:var(--text-2)">${e.date||'—'}</td>
      <td title="${e.organisation||''}">${e.organisation||'—'}</td>
      <td title="${e.position||''}">${e.position||'—'}</td>
      <td><span style="font-size:12px;color:var(--text-2)">${e.category||'—'}</span></td>
      <td style="font-size:12px;color:var(--text-2)">${e.method||'—'}</td>
      <td><span class="badge badge-${(e.status||'pending').toLowerCase().replace(/ /g,'-')}">${e.status||'—'}</span></td>
      <td title="${e.lesson_learned||''}" style="color:var(--text-2);font-size:12px">${e.lesson_learned||'—'}</td>
      <td><button onclick="deleteEntry('${e.id}')" class="btn btn-xs btn-danger" title="Delete">✕</button></td>
    </tr>`).join('');
}

async function saveEntry() {
  const btn = document.getElementById('saveEntryBtn');
  btn.disabled = true; btn.textContent = 'Saving…';
  const { error } = await sb.from('rejection_entries').insert({
    user_id: currentUser.id,
    date: document.getElementById('f_date').value || null,
    category: document.getElementById('f_cat').value,
    organisation: document.getElementById('f_org').value,
    position: document.getElementById('f_pos').value,
    industry: document.getElementById('f_ind').value,
    what_i_asked: document.getElementById('f_ask').value,
    method: document.getElementById('f_method').value,
    status: document.getElementById('f_status').value,
    response_received: document.getElementById('f_resp').value==='true',
    feedback_given: document.getElementById('f_feedback').value,
    rejection_reason: document.getElementById('f_reason').value,
    lesson_learned: document.getElementById('f_lesson').value,
    would_do_diff: document.getElementById('f_diff').value,
    skill_improved: document.getElementById('f_skill').value,
    confidence_before: parseInt(document.getElementById('f_cbefore').value)||null,
    confidence_after: parseInt(document.getElementById('f_cafter').value)||null,
    hidden_win: document.getElementById('f_hidden').value,
    new_contact: document.getElementById('f_contact').value==='true',
    followup_needed: document.getElementById('f_followup').value==='true',
    next_action: document.getElementById('f_next').value
  });
  btn.disabled = false; btn.textContent = 'Save entry';
  if (error) { toast('Error: '+error.message,'error'); return; }
  toast('Entry saved ✓','success');
  await loadEntries();
  clearEntryForm();
  showPage('log', document.querySelectorAll('.nav-item')[2]);
}

function clearEntryForm() {
  ['f_org','f_pos','f_ind','f_ask','f_feedback','f_reason','f_lesson','f_diff','f_skill','f_cbefore','f_cafter','f_hidden','f_next']
    .forEach(id=>{ const el=document.getElementById(id); if(el) el.value=''; });
  document.getElementById('f_date').value = new Date().toISOString().slice(0,10);
}

async function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  await sb.from('rejection_entries').delete().eq('id',id).eq('user_id',currentUser.id);
  await loadEntries(); renderLog();
  toast('Entry deleted');
}

// ── WINS ────────────────────────────────────────────────────
async function loadWins() {
  const { data } = await sb.from('acceptance_entries').select('*').eq('user_id',currentUser.id).order('date',{ascending:false});
  wins = data || [];
}
function renderWins() {
  document.getElementById('winsLoading').style.display = 'none';
  document.getElementById('winCountBig').textContent = wins.length;
  const body=document.getElementById('winsBody'), empty=document.getElementById('winsEmpty');
  if (!wins.length) { body.innerHTML=''; empty.style.display='flex'; return; }
  empty.style.display='none';
  body.innerHTML = wins.map(w=>`
    <div class="win-card">
      <div class="win-card-head">
        <div>
          <div class="win-card-title">${w.opportunity||'Unnamed opportunity'}</div>
          <div class="win-card-meta">${[w.organisation,w.category,w.date?new Date(w.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):null].filter(Boolean).join(' · ')}</div>
        </div>
        <button onclick="deleteWin('${w.id}')" class="btn btn-xs btn-danger">✕</button>
      </div>
      ${w.value_created?`<div class="win-card-detail"><span>Value: </span>${w.value_created}</div>`:''}
      ${w.why_succeeded?`<div class="win-card-detail"><span>Why I succeeded: </span>${w.why_succeeded}</div>`:''}
      ${w.lesson_from_success?`<div class="win-card-detail"><span>Lesson: </span>${w.lesson_from_success}</div>`:''}
    </div>`).join('');
}
function toggleWinForm() { document.getElementById('addWinForm').classList.toggle('open'); }
async function saveWin() {
  const btn=document.getElementById('saveWinBtn');
  btn.disabled=true; btn.textContent='Saving…';
  const { error } = await sb.from('acceptance_entries').insert({
    user_id: currentUser.id,
    date: document.getElementById('w_date').value||null,
    category: document.getElementById('w_cat').value,
    organisation: document.getElementById('w_org').value,
    opportunity: document.getElementById('w_opp').value,
    value_created: document.getElementById('w_value').value,
    why_succeeded: document.getElementById('w_why').value,
    lesson_from_success: document.getElementById('w_lesson').value
  });
  btn.disabled=false; btn.textContent='Save win';
  if (error) { toast('Error: '+error.message,'error'); return; }
  toast('Win saved 🎉','success');
  await loadWins(); renderWins(); toggleWinForm();
  ['w_org','w_opp','w_value','w_why','w_lesson'].forEach(id=>document.getElementById(id).value='');
}
async function deleteWin(id) {
  if(!confirm('Delete this win?'))return;
  await sb.from('acceptance_entries').delete().eq('id',id).eq('user_id',currentUser.id);
  await loadWins(); renderWins(); toast('Win deleted');
}

// ── MONTHLY ─────────────────────────────────────────────────
function populateMonthSelect() {
  const sel=document.getElementById('monthSelect');
  if(sel.options.length)return;
  const now=new Date();
  for(let i=0;i<12;i++){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    const key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
    sel.add(new Option(d.toLocaleDateString('en-GB',{month:'long',year:'numeric'}), key));
  }
}
function renderMonthly() { populateMonthSelect(); loadMonthData(); }
async function loadMonthData() {
  const key=document.getElementById('monthSelect').value;
  const [yr,mo]=key.split('-').map(Number);
  const mE=entries.filter(e=>{ if(!e.date)return false; const d=new Date(e.date); return d.getFullYear()===yr&&d.getMonth()+1===mo; });
  const mW=wins.filter(w=>{ if(!w.date)return false; const d=new Date(w.date); return d.getFullYear()===yr&&d.getMonth()+1===mo; });
  const total=mE.length, rej=mE.filter(e=>e.status==='Rejected'||e.status==='No Response').length;
  const resp=mE.filter(e=>e.status!=='Pending'&&e.status!=='No Response').length;
  const rr=total?Math.round(resp/total*100):0, ar=total?Math.round(mW.length/total*100):0;
  document.getElementById('monthMetrics').innerHTML=`
    <div class="stat-card" style="--stat-color:#4F46E5;--stat-bg:#EEF2FF"><div class="stat-icon">📋</div><div class="stat-label">Attempts</div><div class="stat-value">${total}</div></div>
    <div class="stat-card" style="--stat-color:#EF4444;--stat-bg:#FEF2F2"><div class="stat-icon">🚫</div><div class="stat-label">Rejections</div><div class="stat-value">${rej}</div></div>
    <div class="stat-card" style="--stat-color:#10B981;--stat-bg:#ECFDF5"><div class="stat-icon">✅</div><div class="stat-label">Acceptances</div><div class="stat-value" style="color:#10B981">${mW.length}</div></div>
    <div class="stat-card" style="--stat-color:#6366F1;--stat-bg:#EEF2FF"><div class="stat-icon">📬</div><div class="stat-label">Response rate</div><div class="stat-value" style="color:#6366F1">${rr}%</div></div>
    <div class="stat-card" style="--stat-color:#10B981;--stat-bg:#ECFDF5"><div class="stat-icon">🎯</div><div class="stat-label">Acceptance rate</div><div class="stat-value" style="color:#10B981">${ar}%</div></div>
  `;
  const { data } = await sb.from('monthly_reviews').select('*').eq('user_id',currentUser.id).eq('month_key',key).single();
  const r=data||{};
  ['lesson','win','mistake','courage','bfeed','worked','didnt','improve','goals'].forEach(k=>{ const el=document.getElementById('m_'+k); if(el) el.value=r[{lesson:'biggest_lesson',win:'biggest_win',mistake:'biggest_mistake',courage:'courageous_attempt',bfeed:'best_feedback',worked:'what_worked',didnt:'what_didnt',improve:'what_to_improve',goals:'next_month_goals'}[k]]||''; });
}
async function saveMonth() {
  clearTimeout(saveMonthTimer);
  saveMonthTimer=setTimeout(async()=>{
    const key=document.getElementById('monthSelect').value;
    await sb.from('monthly_reviews').upsert({
      user_id:currentUser.id, month_key:key, updated_at:new Date().toISOString(),
      biggest_lesson:document.getElementById('m_lesson').value,
      biggest_win:document.getElementById('m_win').value,
      biggest_mistake:document.getElementById('m_mistake').value,
      courageous_attempt:document.getElementById('m_courage').value,
      best_feedback:document.getElementById('m_bfeed').value,
      what_worked:document.getElementById('m_worked').value,
      what_didnt:document.getElementById('m_didnt').value,
      what_to_improve:document.getElementById('m_improve').value,
      next_month_goals:document.getElementById('m_goals').value
    },{onConflict:'user_id,month_key'});
  },800);
}

// ── MILESTONES ───────────────────────────────────────────────
async function renderMilestones() {
  const total=entries.filter(e=>e.status==='Rejected'||e.status==='No Response').length;
  const next=MILESTONES.find(m=>m.count>total);
  document.getElementById('milestoneGrid').innerHTML=MILESTONES.map(m=>{
    const unlocked=total>=m.count, isNext=next&&m.count===next.count;
    return`<div class="milestone-card ${unlocked?'unlocked':isNext?'next-up':''}">
      <span class="milestone-icon">${m.icon}</span>
      <div class="milestone-name">${m.label}</div>
      <div class="milestone-sub">${unlocked?'Unlocked':isNext?`${m.count-total} to go`:m.sub}</div>
    </div>`;
  }).join('');
  const { data } = await sb.from('special_achievements').select('unlocked').eq('user_id',currentUser.id).single();
  const unlocked=data?.unlocked||{};
  document.getElementById('specialGrid').innerHTML=SPECIALS.map(s=>`
    <div class="special-card ${unlocked[s.id]?'unlocked':''}" onclick="toggleSpecial('${s.id}',this)">
      <div class="special-icon-wrap">${s.icon}</div>
      <div>
        <div class="special-label">${s.label}${unlocked[s.id]?' ✓':''}</div>
        <div class="special-hint">${s.hint}</div>
      </div>
    </div>`).join('');
}
async function toggleSpecial(id,el) {
  const { data } = await sb.from('special_achievements').select('unlocked').eq('user_id',currentUser.id).single();
  const unlocked=data?.unlocked||{};
  unlocked[id]=!unlocked[id];
  await sb.from('special_achievements').upsert({user_id:currentUser.id,unlocked,updated_at:new Date().toISOString()},{onConflict:'user_id'});
  el.classList.toggle('unlocked',!!unlocked[id]);
  const s=SPECIALS.find(x=>x.id===id);
  el.querySelector('.special-label').textContent=s.label+(unlocked[id]?' ✓':'');
  toast(unlocked[id]?s.label+' unlocked 🎉':s.label+' removed','success');
}

// ── ANALYTICS ───────────────────────────────────────────────
function renderAnalytics() {
  const textColor = isDark ? '#94A3B8' : '#475569';
  const gridColor = isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)';
  const baseOpts = { responsive:true, maintainAspectRatio:false,
    plugins:{ legend:{ display:false } },
    scales:{ y:{ beginAtZero:true, ticks:{ stepSize:1, precision:0, color:textColor }, grid:{ color:gridColor } },
             x:{ ticks:{ color:textColor, maxRotation:40 }, grid:{ color:gridColor } } }
  };
  const cats=['Jobs','Internships','Clients','Sales','Scholarships','Partnerships','Investments','Networking','Other'];
  const catCounts=cats.map(c=>entries.filter(e=>e.category===c).length);
  if(catChartObj)catChartObj.destroy();
  catChartObj=new Chart(document.getElementById('catChart'),{
    type:'bar', data:{labels:cats,datasets:[{data:catCounts,backgroundColor:'rgba(79,70,229,.7)',borderRadius:6,hoverBackgroundColor:'rgba(79,70,229,1)',label:'Rejections'}]},
    options:{...baseOpts}
  });

  const now=new Date(); const mLabels=[], mCounts=[];
  for(let i=5;i>=0;i--){
    const d=new Date(now.getFullYear(),now.getMonth()-i,1);
    mLabels.push(d.toLocaleDateString('en-GB',{month:'short',year:'2-digit'}));
    const yr=d.getFullYear(),mo=d.getMonth()+1;
    mCounts.push(entries.filter(e=>{ if(!e.date)return false; const ed=new Date(e.date); return ed.getFullYear()===yr&&ed.getMonth()+1===mo; }).length);
  }
  if(monthChartObj)monthChartObj.destroy();
  monthChartObj=new Chart(document.getElementById('monthChart'),{
    type:'bar', data:{labels:mLabels,datasets:[{data:mCounts,backgroundColor:'rgba(139,92,246,.7)',borderRadius:6,hoverBackgroundColor:'rgba(139,92,246,1)',label:'Entries'}]},
    options:{...baseOpts}
  });

  const methods=['Email','LinkedIn','Cold Call','Walk-in','Referral','Application Portal','Networking Event','Social Media DM','Other'];
  const mColors=['#4F46E5','#7C3AED','#2563EB','#0891B2','#059669','#D97706','#DC2626','#DB2777','#9CA3AF'];
  const mCts=methods.map(m=>entries.filter(e=>e.method===m).length);
  const nz=methods.map((m,i)=>({m,c:mCts[i],col:mColors[i]})).filter(x=>x.c>0);
  const tot=nz.reduce((a,x)=>a+x.c,0);
  if(methodChartObj)methodChartObj.destroy();
  methodChartObj=new Chart(document.getElementById('methodChart'),{
    type:'doughnut', data:{labels:nz.map(x=>x.m),datasets:[{data:nz.map(x=>x.c),backgroundColor:nz.map(x=>x.col),borderWidth:0,hoverOffset:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},cutout:'62%'}
  });
  document.getElementById('methodLegend').innerHTML = nz.length
    ? nz.map(x=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <span style="width:11px;height:11px;border-radius:3px;background:${x.col};flex-shrink:0;display:inline-block"></span>
        <span style="color:var(--text-2);font-size:12px;flex:1">${x.m}</span>
        <span style="font-weight:700;font-size:13px">${x.c}</span>
        <span style="color:var(--text-3);font-size:11px">${tot?Math.round(x.c/tot*100):0}%</span>
      </div>`).join('')
    : '<div style="color:var(--text-3);font-size:13px">No data yet.</div>';

  // Insight
  if (nz.length > 1) {
    const top = nz.reduce((a,b)=>b.c>a.c?b:a);
    document.getElementById('insightText').textContent =
      `Your most-used outreach method is ${top.m} (${Math.round(top.c/tot*100)}% of attempts). Consider diversifying to discover what works best for you.`;
  } else if (entries.length > 0) {
    const topCat = cats.map((c,i)=>({c,n:catCounts[i]})).sort((a,b)=>b.n-a.n)[0];
    if (topCat?.n > 0) document.getElementById('insightText').textContent =
      `You've focused most on ${topCat.c} (${topCat.n} attempts). Strong focus can drive deep expertise.`;
  }
}

// ── YEAR-END ─────────────────────────────────────────────────
async function renderYearEnd() {
  const s=calcStats();
  document.getElementById('yearMetrics').innerHTML=statsCardsHTML(s);
  const { data } = await sb.from('year_end_reflection').select('*').eq('user_id',currentUser.id).single();
  if(data){
    ['became','lesson','opp','fear','advice','journal'].forEach(k=>{
      const el=document.getElementById('y_'+k);
      if(el) el.value=data[{became:'who_became',lesson:'greatest_lesson',opp:'life_opportunity',fear:'fear_overcome',advice:'advice_to_starter',journal:'full_journal'}[k]]||'';
    });
  }
}
async function saveYear() {
  clearTimeout(saveYearTimer);
  saveYearTimer=setTimeout(async()=>{
    await sb.from('year_end_reflection').upsert({
      user_id:currentUser.id, updated_at:new Date().toISOString(),
      who_became:document.getElementById('y_became').value,
      greatest_lesson:document.getElementById('y_lesson').value,
      life_opportunity:document.getElementById('y_opp').value,
      fear_overcome:document.getElementById('y_fear').value,
      advice_to_starter:document.getElementById('y_advice').value,
      full_journal:document.getElementById('y_journal').value
    },{onConflict:'user_id'});
  },1000);
}

// Init entry form date
document.addEventListener('DOMContentLoaded', () => {
  const fd = document.getElementById('f_date');
  if (fd) fd.value = new Date().toISOString().slice(0,10);
  if (isDark) {
    document.getElementById('themeBtn').textContent = '☀️';
    const sb2 = document.getElementById('themeBtnSettings');
    if (sb2) sb2.textContent = 'Switch to light';
  }
});