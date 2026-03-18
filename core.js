// ============================================================
// CORE.JS — Firebase boot, navigation, online presence, refresh
// ============================================================

// ── Toast ─────────────────────────────────────────────────────
function toast(msg, type) {
  var e = $('toast'); if (!e) return;
  e.textContent = msg;
  var isErr = type === 'error';
  e.style.background = isErr ? 'rgba(255,40,130,0.18)' : 'rgba(0,212,255,0.12)';
  e.style.border      = '1.5px solid '+(isErr?'#FF2882':'#00D4FF');
  e.style.color       = isErr ? '#FF2882' : '#00D4FF';
  e.style.opacity     = '1';
  e.style.transform   = 'translateY(0)';
  e.style.display     = 'block';
  clearTimeout(e._t);
  e._t = setTimeout(function(){
    e.style.opacity='0'; e.style.transform='translateY(8px)';
    setTimeout(function(){ e.style.display='none'; }, 300);
  }, 3000);
}

// ── Modals ────────────────────────────────────────────────────
function openMo(id)  { var e=$(id); if(e) e.classList.add('active'); }
function closeMo(id) { var e=$(id); if(e) e.classList.remove('active'); }

// ── Loader / Landing ──────────────────────────────────────────
function showLoader() { var l=$('loader'); if(l) l.style.display='flex'; }
function hideLoader() {
  var l=$('loader'); if(!l) return;
  l.style.opacity='0';
  setTimeout(function(){ l.style.display='none'; }, 400);
}
function showLanding() {
  hideLoader();
  var l=$('landing'); if(l){ l.classList.remove('landing-hidden'); l.classList.add('landing-visible'); }
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
}
function hideLanding() {
  var l=$('landing'); if(l){ l.classList.add('landing-hidden'); l.classList.remove('landing-visible'); }
}
function lTab(t) {
  document.querySelectorAll('.ltab').forEach(function(b,i){
    b.classList.toggle('active',(t==='in'&&i===0)||(t!=='in'&&i===1));
  });
  var pin=$('l-in'), pup=$('l-up');
  if(pin) pin.classList.toggle('active', t==='in');
  if(pup) pup.classList.toggle('active', t!=='in');
}

// ── Page navigation ───────────────────────────────────────────
function activePage() {
  var pages = ['home','leagues','fixtures','matchprep','ucl','polls','leaderboard',
               'referee','chat','profile','admin','news','predict','notifications'];
  for (var i=0; i<pages.length; i++) {
    var p = $('page-'+pages[i]);
    if (p && p.classList.contains('active')) return pages[i];
  }
  return 'home';
}

function goPage(name) {
  if (App.ui.navLocked) return;
  App.ui.navLocked = true;
  setTimeout(function(){ App.ui.navLocked = false; }, 250);

  hideLanding();
  closeDrawer();
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('active'); });
  window.scrollTo(0,0);

  // Chat and messages both use page-chat
  if (name === 'pm') name = 'chat';

  var pg = $('page-'+name); if (pg) pg.classList.add('active');
  var nb = document.querySelector('.nb[data-page="'+name+'"]'); if (nb) nb.classList.add('active');
  App.ui.page = name;

  // Page-specific boot
  if (name==='home')         { renderHomeStats(); renderRecentRes(); renderTopPlayers(); if(typeof renderNewsFeatured==='function') renderNewsFeatured(); }
  if (name==='leagues')      renderStd(App.ui.curLg);
  if (name==='fixtures')     renderFx();
  if (name==='matchprep')    { renderMatchPrep(); renderMatchRooms(); renderSchedTimeline(); }
  if (name==='ucl')          renderUCL();
  if (name==='polls')        { renderPolls(); setBadge('polls-badge',0); }
  if (name==='leaderboard')  { renderLeaderboard(); renderMyPredictions(); renderPredLeaderboard(); }
  if (name==='referee')      { renderRefPanel(); setBadge('ref-badge',0); }
  if (name==='profile')      renderProfile();
  if (name==='admin')        loadAdmin();
  if (name==='news')         { if(typeof renderNewsAnchor==='function') renderNewsAnchor(); }
  if (name==='predict')      renderPredictions();
  if (name==='notifications'){ renderNotifications(); }
  if (name==='chat')         { renderMessenger(chatTab); setBadge('pm-badge',0); }

  // Chat FAB
  var fab=$('chat-fab');
  if (fab) fab.style.display = (name==='chat'||!App.access.isLoggedIn()) ? 'none' : 'flex';
}

// ── Enter app after login/boot ────────────────────────────────
function enterApp() {
  hideLoader(); hideLanding();
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); });
  document.querySelectorAll('.nb').forEach(function(b){ b.classList.remove('active'); });
  var home=$('page-home'); if(home) home.classList.add('active');
  var homeBtn=document.querySelector('.nb[data-page="home"]'); if(homeBtn) homeBtn.classList.add('active');
  App.ui.page = 'home';
  updateNav();
  updateDrawer();
  renderHomeStats();
  renderRecentRes();
  renderTopPlayers();
  if (typeof renderNewsFeatured==='function') renderNewsFeatured();
}

// ── Nav update ────────────────────────────────────────────────
function updateNav() {
  var e = $('nav-right'); if (!e) return;
  var isAdmin = App.access.isAdmin();
  var p = App.state.profile;

  if (p && p.username) {
    var club = getClub(p.league, p.club);
    e.innerHTML = '<span class="uchip" onclick="goPage(\'profile\')" title="'+esc(p.username)+'">'
      +(club&&club.logo?'<img src="'+club.logo+'" style="width:18px;height:18px;object-fit:contain;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.remove()">':'')
      +esc(p.username)+'</span>'
      +(isAdmin?'<button class="btn-sm btn-outline" onclick="goPage(\'admin\')">Admin</button>':'')
      +'<button class="btn-sm btn-outline" onclick="doLogout()">Out</button>';

    var h=$('home-cta');
    if(h) h.innerHTML='<button class="btn-sm btn-accent" onclick="goPage(\'fixtures\')">Result</button>'
      +'<button class="btn-sm btn-outline" onclick="goPage(\'profile\')">Profile</button>';

    // Admin-only add fixture button
    var af=$('add-fix-btn'); if(af) af.style.display = isAdmin?'inline-flex':'none';
    var sp=$('score-panel'); if(sp) sp.classList.remove('hidden');
    var fab=$('chat-fab'); if(fab&&activePage()!=='chat') fab.style.display='flex';
    var da=$('drawer-admin-btn'); if(da) da.style.display=isAdmin?'flex':'none';
    var ds=$('drawer-signout-btn'); if(ds) ds.style.display='flex';
    var dl=$('drawer-login-btn'); if(dl) dl.style.display='none';
  } else {
    e.innerHTML='<button class="btn-sm btn-outline" onclick="lTab(\'in\');showLanding()">Login</button>'
      +'<button class="btn-sm btn-accent" onclick="lTab(\'up\');showLanding()">Join</button>';
    var h=$('home-cta');
    if(h) h.innerHTML='<button class="btn-sm btn-accent" onclick="lTab(\'up\');showLanding()">Join Now</button>';
    var af=$('add-fix-btn'); if(af) af.style.display='none';
    var sp=$('score-panel'); if(sp) sp.classList.add('hidden');
    var fab=$('chat-fab'); if(fab) fab.style.display='none';
    var da=$('drawer-admin-btn'); if(da) da.style.display='none';
    var ds=$('drawer-signout-btn'); if(ds) ds.style.display='none';
    var dl=$('drawer-login-btn'); if(dl) dl.style.display='flex';
  }
}

// ── Drawer ────────────────────────────────────────────────────
function openDrawer() {
  var d=$('drawer'),o=$('drawer-overlay'),h=$('hamburger');
  if(d) d.classList.add('open'); if(o) o.classList.add('active');
  if(h) h.classList.add('open'); document.body.style.overflow='hidden';
  App.ui.drawerOpen=true;
}
function closeDrawer() {
  var d=$('drawer'),o=$('drawer-overlay'),h=$('hamburger');
  if(d) d.classList.remove('open'); if(o) o.classList.remove('active');
  if(h) h.classList.remove('open'); document.body.style.overflow='';
  App.ui.drawerOpen=false;
}
function updateDrawer() {
  var p=App.state.profile;
  var dn=$('drawer-name'), dcl=$('drawer-club-lg'), dav=$('drawer-avatar');
  if(p&&p.username){
    if(dn)  dn.textContent  = p.username;
    if(dcl) dcl.textContent = p.club+' · '+((LGS[p.league]||{}).short||'');
    if(dav){
      if(p.avatar&&p.avatar.length<10){ dav.textContent=p.avatar; dav.style.fontSize='1.4rem'; }
      else if(p.avatar&&p.avatar.startsWith('http')){ dav.innerHTML='<img src="'+p.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'; }
      else { dav.textContent=p.username.charAt(0).toUpperCase(); }
    }
  } else {
    if(dn)  dn.textContent='Guest';
    if(dcl) dcl.textContent='';
    if(dav) dav.textContent='?';
  }
}

// ── Badge helper ──────────────────────────────────────────────
function setBadge(id, n) {
  var e=$(id); if(!e) return;
  if(n>0){ e.textContent=n>9?'9+':n; e.classList.remove('hidden'); }
  else { e.classList.add('hidden'); }
}

// ── Refresh on data change ────────────────────────────────────
function debouncedRefresh() {
  clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(refreshAll, 150);
}
function refreshAll() {
  renderHomeStats();
  var pg = activePage();
  if (pg==='home')      { renderRecentRes(); renderTopPlayers(); if(typeof renderNewsFeatured==='function') renderNewsFeatured(); }
  if (pg==='leagues')   renderStd(App.ui.curLg);
  if (pg==='fixtures')  renderFx();
  if (pg==='matchprep') { renderMatchPrep(); renderMatchRooms(); renderSchedTimeline(); }
  if (pg==='ucl')       renderUCL();
  if (pg==='polls')     renderPolls();
  if (pg==='leaderboard') { renderLeaderboard(); renderPredLeaderboard(); }
  if (pg==='news')      { if(typeof renderNewsAnchor==='function') renderNewsAnchor(); }
  if (typeof refreshNews==='function') refreshNews();
}

// ── Online presence ───────────────────────────────────────────
function setOnline() {
  if (!App.state.profile||!App.db) return;
  var ref = App.db.ref(DB.online+'/'+App.state.user.uid);
  ref.set({ name:App.state.profile.username, ts:Date.now() });
  ref.onDisconnect().remove();
  App.db.ref(DB.players+'/'+App.state.user.uid+'/lastSeen').set(Date.now());
  if (!onlineInterval) {
    onlineInterval = setInterval(function(){
      if(!App.state.profile||!App.db) return;
      App.db.ref(DB.online+'/'+App.state.user.uid).set({ name:App.state.profile.username, ts:Date.now() });
      App.db.ref(DB.players+'/'+App.state.user.uid+'/lastSeen').set(Date.now());
    }, 30000);
    setInterval(function(){
      document.querySelectorAll('[data-lastseen]').forEach(function(el){
        var ts=parseInt(el.getAttribute('data-lastseen')||'0');
        el.style.background=lsColor(ts); el.title=fmtAgo(ts);
      });
    }, 30000);
  }
}

// ── Notifications ─────────────────────────────────────────────
function sendNotif(toUID, payload) {
  if (!App.db||!toUID) return;
  App.db.ref(DB.notifs+'/'+toUID).push({
    title: payload.title||'eFootball Universe',
    body:  payload.body||'',
    icon:  payload.icon||'⚽',
    type:  payload.type||'',
    ts:    Date.now(),
    read:  false
  });
}

function listenNotifs() {
  if (!App.state.profile||!App.db) return;
  var uid = App.state.user.uid;
  App.db.ref(DB.notifs+'/'+uid).orderByChild('ts').limitToLast(10)
    .on('child_added', function(s){
      var n = s.val(); if(!n||n.read) return;
      s.ref.update({ read:true });
      showNotifBanner(n);
    });
}

function showNotifBanner(n) {
  var wrap=$('notif-wrap'); if(!wrap) return;
  var div=document.createElement('div');
  div.className='notif-banner';
  div.innerHTML='<div class="notif-icon">'+(n.icon||'🔔')+'</div>'
    +'<div class="notif-body"><div class="notif-title">'+esc(n.title||'')+'</div>'
    +'<div class="notif-msg">'+esc(n.body||'')+'</div></div>'
    +'<button class="notif-close" onclick="this.parentNode.remove()">✕</button>';
  wrap.appendChild(div);
  setTimeout(function(){ if(div.parentNode) div.remove(); }, 5000);
}

function listenNotifBadge() {
  if (!App.state.profile||!App.db) return;
  App.db.ref(DB.notifs+'/'+App.state.user.uid).orderByChild('read').equalTo(false).on('value', function(s){
    var items = s.val()||{};
    var count = Object.values(items).filter(function(d){ return d.type!=='dm'&&d.type!=='chat'; }).length;
    var hasCode = Object.values(items).some(function(d){ return !d.read&&(d.type==='room_code'); });
    setBadge('notif-badge', count);
    var db2=$('drawer-notif-badge');
    if(db2){ if(count>0){ db2.textContent=count>9?'9+':count; db2.classList.remove('hidden'); } else db2.classList.add('hidden'); }
    if(hasCode) showAttentionDot(); else clearAttentionDot();
  });
}

function showAttentionDot(){
  var btn=$('drawer-notif-btn'); if(!btn) return;
  var dot=btn.querySelector('.attention-dot')||document.createElement('span');
  dot.className='attention-dot';
  dot.style.cssText='position:absolute;top:6px;right:6px;width:10px;height:10px;border-radius:50%;'
    +'background:var(--green);box-shadow:0 0 8px rgba(0,255,133,.8);';
  btn.style.position='relative'; btn.appendChild(dot); dot.style.display='block';
}
function clearAttentionDot(){
  var dot=document.querySelector('#drawer-notif-btn .attention-dot');
  if(dot) dot.style.display='none';
}

// ── Notifications page ────────────────────────────────────────
function renderNotifications() {
  var pg=$('page-notifications'); if(!pg) return;
  if (!App.state.profile||!App.db) { pg.innerHTML='<div class="card empty">Login to view notifications.</div>'; return; }
  var showAll = pg.getAttribute('data-show-all')==='true';
  pg.innerHTML='<div class="section-header"><div class="section-title c-cyan">🔔 Notifications</div><div class="section-line"></div>'
    +'<button class="btn-xs" onclick="toggleNotifFilter()">'+(showAll?'Unread Only':'Show All')+'</button></div>'
    +'<div id="notif-list"><div style="text-align:center;padding:1.5rem;color:var(--dim)">Loading...</div></div>';

  App.db.ref(DB.notifs+'/'+App.state.user.uid).orderByChild('ts').limitToLast(60).once('value', function(s){
    var all=[];
    s.forEach(function(child){ var d=child.val(); if(d.type==='dm'||d.type==='chat') return; all.unshift({key:child.key,data:d}); });
    var list = showAll ? all : all.filter(function(n){ return !n.data.read; });
    var el=$('notif-list'); if(!el) return;
    if(!list.length){ el.innerHTML='<div class="card empty">'+(showAll?'No notifications yet.':'All caught up! 🎉')+'</div>'; return; }
    el.innerHTML=list.map(function(n){
      var d=n.data;
      var isCode=(d.type==='room_code');
      var icon=isCode?'🏟️':(d.icon||'🔔');
      var border=isCode?'rgba(0,255,133,0.45)':(d.read?'var(--border)':'rgba(0,212,255,0.25)');
      var titleColor=isCode?'var(--green)':(d.read?'var(--text)':'var(--cyan)');
      var codeBlock='';
      if(isCode&&d.code){
        codeBlock='<div style="margin-top:.5rem;background:rgba(0,0,0,0.35);border-radius:8px;padding:.45rem .75rem;display:flex;align-items:center;justify-content:space-between;gap:.5rem">'
          +'<span style="font-family:Orbitron,sans-serif;font-size:.95rem;font-weight:900;color:var(--green);letter-spacing:3px">'+esc(d.code)+'</span>'
          +'<button onclick="copyCode(\''+esc(d.code)+'\')" class="btn-xs" style="color:var(--green);border-color:rgba(0,255,133,0.3);font-size:.6rem">Copy</button>'
          +'</div>';
      }
      return '<div style="display:flex;align-items:flex-start;gap:.7rem;padding:.75rem .9rem;background:var(--card);'
        +'border:1px solid '+border+';border-radius:11px;margin-bottom:.45rem;'+(d.read&&!isCode?'opacity:.65':'')+'">'
        +'<div style="font-size:1.25rem;flex-shrink:0;margin-top:2px">'+icon+'</div>'
        +'<div style="flex:1;min-width:0">'
        +'<div style="font-weight:700;font-size:.82rem;color:'+titleColor+'">'+esc(d.title||'')+'</div>'
        +'<div style="font-size:.74rem;color:var(--dim);margin-top:2px">'+esc(d.body||'')+'</div>'
        +codeBlock
        +'<div style="font-size:.6rem;color:var(--dim);margin-top:4px">'+fmtAgo(d.ts)+'</div>'
        +'</div>'
        +(!d.read?'<div style="width:9px;height:9px;border-radius:50%;background:'+(isCode?'var(--green)':'var(--cyan)')+';flex-shrink:0;margin-top:4px"></div>':'')
        +'</div>';
    }).join('');
    list.forEach(function(n){ if(!n.data.read) App.db.ref(DB.notifs+'/'+App.state.user.uid+'/'+n.key+'/read').set(true); });
    setBadge('notif-badge',0); clearAttentionDot();
  });
}
function toggleNotifFilter(){
  var pg=$('page-notifications'); if(!pg) return;
  pg.setAttribute('data-show-all', pg.getAttribute('data-show-all')!=='true');
  renderNotifications();
}

// ── Scroll shadow ─────────────────────────────────────────────
window.addEventListener('scroll', function(){
  var tb=$('topbar'); if(tb) tb.classList.toggle('scrolled', window.scrollY>8);
}, { passive:true });

// ── Visibility refresh ────────────────────────────────────────
document.addEventListener('visibilitychange', function(){
  if (document.visibilityState==='visible'&&App.db) setTimeout(debouncedRefresh,300);
});

// ── Copy code ─────────────────────────────────────────────────
function copyCode(code) {
  if(navigator.clipboard){ navigator.clipboard.writeText(code).then(function(){ toast('Copied: '+code); }); }
  else { toast('Code: '+code); }
}

// ── Result celebration ────────────────────────────────────────
function showResultCelebration(mid,hg,ag,m){
  var el=$('result-celebration'); if(!el) return;
  var hp=App.state.players[m.homeId],ap=App.state.players[m.awayId]; if(!hp||!ap) return;
  var winner=hg>ag?hp.username:ag>hg?ap.username:null;
  el.innerHTML='<div class="celeb-inner"><div class="celeb-score">'+hg+' – '+ag+'</div>'
    +'<div class="celeb-teams">'+esc(hp.username)+' vs '+esc(ap.username)+'</div>'
    +(winner?'<div class="celeb-winner">🏆 '+esc(winner)+' wins!</div>':'<div class="celeb-winner">Draw!</div>')
    +'<button onclick="this.parentNode.parentNode.classList.add(\'hidden\')" '
    +'style="margin-top:1rem;padding:.5rem 1.5rem;border-radius:8px;border:none;background:var(--cyan);color:#000;font-weight:700;cursor:pointer">Close</button></div>';
  el.classList.remove('hidden');
  setTimeout(function(){ el.classList.add('hidden'); },8000);
}

// ── Compat aliases ────────────────────────────────────────────
function go(name){ goPage(name); }
function hideLoadingScreen(){ hideLoader(); }
function updateBadge(id,n){ setBadge(id,n); }
function openMessenger(tab){ chatTab=tab||'dms'; goPage('chat'); }
function openDMWith(uid,uname){ openMessenger('dms'); setTimeout(function(){ if(typeof openDMThread==='function') openDMThread(uid,uname); },350); }
function startDMWith(uid,uname){ openDMWith(uid,uname); }

// ── Stubs (defined in their own files) ────────────────────────
function renderStd(l){}
function renderFx(){}
function renderHomeStats(){}
function renderRecentRes(){}
function renderTopPlayers(){}
function renderMatchPrep(){}
function renderMatchRooms(){}
function renderSchedTimeline(){}
function renderUCL(){}
function renderPolls(){}
function renderLeaderboard(){}
function renderMyPredictions(){}
function renderPredLeaderboard(){}
function renderRefPanel(){}
function renderProfile(){}
function renderMessenger(tab){}
function renderPredictions(){}
function loadAdmin(){}
function initSwap(){}
function listenMatchRooms(){}
function listenUnread(){}
function listenGlobalDMs(){}
function listenRedDots(){}
function listenRoomCodes(){}
function listenBroadcast(){}
function checkRefereeDuties(){}
function checkPendingAutoApprovals(){}
function listenRefDuties(){}
function openGoogleSetup(user){}
function doLogout(){}
function renderPollBadge(){}
function checkSeasonEnd(){}
function autoScheduleForLeague(lid){}

function initRefereeSystem(){
  if(!App.state.profile||!App.db) return;
  if(typeof listenRefDuties==='function') listenRefDuties();
  if(typeof checkPendingAutoApprovals==='function') checkPendingAutoApprovals();
}

// ── Firebase init ─────────────────────────────────────────────
function initApp() {
  showLoader();
  // Load Paystack in background
  var s=document.createElement('script'); s.src='https://js.paystack.co/v2/inline.js'; s.async=true; document.head.appendChild(s);

  if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
  App.auth = firebase.auth();
  App.db   = firebase.database();

  // Safety timeout — never leave user stuck
  var authResolved=false;
  var authTimeout=setTimeout(function(){
    if(!authResolved){ console.warn('Auth timeout — entering as guest'); authResolved=true; enterApp(); }
  }, 6000);

  App.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function(){}).then(function(){
    startListeners(authTimeout, function(){ authResolved=true; });
  });
}

function startListeners(authTimeout, onResolved) {
  // Live data
  App.db.ref(DB.players).on('value', function(s){
    App.state.players = s.val()||{};
    debouncedRefresh();
  });
  App.db.ref(DB.matches).on('value', function(s){
    App.state.matches = s.val()||{};
    debouncedRefresh();
    var pg=activePage();
    if(pg==='fixtures')  renderFx();
    if(pg==='matchprep') { renderMatchPrep(); renderSchedTimeline(); }
    if(typeof checkSeasonEnd==='function') checkSeasonEnd();
    if(typeof checkPendingAutoApprovals==='function') checkPendingAutoApprovals();
  });

  // Non-critical — deferred
  setTimeout(function(){
    App.db.ref(DB.online).on('value', function(s){
      var e=$('online-count'); if(e) e.textContent=Object.keys(s.val()||{}).length;
    });
    App.db.ref(DB.penalties).on('value', function(s){
      App.state.penalties=s.val()||{};
      if(activePage()==='leagues') renderStd(App.ui.curLg);
    });
    App.db.ref(DB.polls).on('value', function(s){
      App.state.polls=s.val()||{};
      if(activePage()==='polls') renderPolls();
      renderPollBadge();
    });
    App.db.ref(DB.uclSet).on('value', function(s){ App.state.uclSettings=s.val()||{}; if(activePage()==='ucl') renderUCL(); });
    App.db.ref(DB.uclPay).on('value', function(s){ App.state.uclPayments=s.val()||{}; if(activePage()==='ucl') renderUCL(); });
    if(typeof initNews==='function') initNews();
  }, 2000);

  // Auth state — the single place that controls guest vs logged-in
  App.auth.onAuthStateChanged(function(user){
    if(authTimeout) clearTimeout(authTimeout);
    if(onResolved)  onResolved();

    App.state.user = user;

    if (user) {
      App.db.ref(DB.players+'/'+user.uid).once('value', function(s){
        var data = s.val();

        // Admin account has no player profile — enter app directly
        if (user.email === ADMIN_EMAIL) {
          App.state.profile = {
            uid:      user.uid,
            username: 'Admin',
            email:    user.email,
            league:   'epl',
            club:     '',
            avatar:   '',
            banned:   false,
            isAdmin:  true
          };
          enterApp();
          setOnline();
          listenUnread();
          listenGlobalDMs();
          initRefereeSystem();
          listenMatchRooms();
          initSwap();
          listenNotifs();
          if(typeof listenRedDots==='function')    listenRedDots();
          if(typeof listenRoomCodes==='function')  listenRoomCodes();
          if(typeof listenNotifBadge==='function') listenNotifBadge();
          if(typeof listenBroadcast==='function')  listenBroadcast();
          checkRefereeDuties();
          return;
        }

        if (!data||!data.username) {
          // New Google user needs setup
          if (user.providerData&&user.providerData[0]&&user.providerData[0].providerId==='google.com') {
            hideLoader();
            if(typeof openGoogleSetup==='function') openGoogleSetup(user);
            else showLanding();
          } else {
            hideLoader(); showLanding();
          }
          return;
        }

        // Existing user — enter app
        App.state.profile = data;
        enterApp();

        // Live profile updates
        App.db.ref(DB.players+'/'+user.uid).on('value', function(s2){
          var d2=s2.val();
          if(d2&&d2.username) App.state.profile=d2;
          updateNav(); updateDrawer();
        });

        // Boot user features
        setOnline();
        listenUnread();
        listenGlobalDMs();
        initRefereeSystem();
        listenMatchRooms();
        initSwap();
        listenNotifs();
        if(typeof listenRedDots==='function')    listenRedDots();
        if(typeof listenRoomCodes==='function')  listenRoomCodes();
        if(typeof listenNotifBadge==='function') listenNotifBadge();
        if(typeof listenBroadcast==='function')  listenBroadcast();
        checkRefereeDuties();

      }, function(){ hideLoader(); enterApp(); });

    } else {
      App.state.profile = null;
      App.state.user    = null;
      enterApp();
    }

  }, function(err){
    console.error('Auth error:', err);
    if(authTimeout) clearTimeout(authTimeout);
    enterApp();
  });
}

// ── Referee drawer badge ──────────────────────────────────────
function checkRefereeDuties(){
  if(!App.state.profile||!App.db) return;
  App.db.ref(DB.matches).orderByChild('refereeUID').equalTo(App.state.profile.uid).on('value', function(s){
    var duties=Object.values(s.val()||{}).filter(function(m){ return !m.played||m.awayVerifying; }).length;
    var btn=$('drawer-ref-btn'); if(btn) btn.style.display=duties>0?'flex':'none';
    setBadge('ref-badge',duties);
  });
}

// ── Poll badge ────────────────────────────────────────────────
function renderPollBadge(){
  var unseen=Object.values(App.state.polls||{}).filter(function(p){ return p.active&&(!App.state.profile||!p.votes||!p.votes[App.state.profile.uid]); }).length;
  setBadge('polls-badge',unseen);
}
