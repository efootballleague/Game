// ============================================================
// FRIENDLY.JS — Friendly Match Request System
// Any player can challenge any other player.
// Both agree on time. Match goes through normal result flow.
// DB path: ef_friendlies
// ============================================================

var _friendlyListening = false;
var _friendlyRequests  = {};  // incoming requests to me
var _friendlySent      = {};  // requests I sent

// ── INIT — listen for incoming friendly requests ──────────────
function initFriendly() {
  if (_friendlyListening || !myProfile || !db) return;
  _friendlyListening = true;
  var uid = myProfile.uid;

  // Incoming requests to me
  db.ref('ef_friendlies').orderByChild('toUID').equalTo(uid).on('value', function(s) {
    _friendlyRequests = {};
    Object.entries(s.val() || {}).forEach(function(kv) {
      var key = kv[0], req = kv[1];
      if (req.status === 'pending' || req.status === 'accepted') {
        _friendlyRequests[key] = Object.assign({ key: key }, req);
      }
    });
    var count = Object.values(_friendlyRequests).filter(function(r){ return r.status === 'pending'; }).length;
    setBadge('friendly-badge', count);
    setBadge('friendly-page-badge', count);
    if (activePage() === 'matchprep') renderFriendlySection();
    if (activePage() === 'friendly')  renderFriendlyPage();
  });

  // Requests I sent
  db.ref('ef_friendlies').orderByChild('fromUID').equalTo(uid).on('value', function(s) {
    _friendlySent = {};
    Object.entries(s.val() || {}).forEach(function(kv) {
      var key = kv[0], req = kv[1];
      if (req.status === 'pending' || req.status === 'accepted') {
        _friendlySent[key] = Object.assign({ key: key }, req);
      }
    });
    if (activePage() === 'matchprep') renderFriendlySection();
    if (activePage() === 'friendly')  renderFriendlyPage();
  });
}

// ── OPEN FRIENDLY REQUEST MODAL ───────────────────────────────
function openFriendlyModal() {
  if (!myProfile) { showLanding(); return; }

  // List all players except self (cross-league allowed)
  var others = Object.values(allPlayers)
    .filter(function(p){ return p.uid !== myProfile.uid && !p.banned; })
    .sort(function(a,b){ return (a.username||'').localeCompare(b.username||''); });

  var el = $('friendly-player-list');
  if (!el) return;

  el.innerHTML = others.length ? others.map(function(p) {
    var lg = LGS[p.league] || {};
    // Check if there's already a pending request between us
    var alreadySent = Object.values(_friendlySent).some(function(r){
      return r.toUID === p.uid && r.status === 'pending';
    });
    return '<div class="swap-row" style="'+(alreadySent?'opacity:.5;cursor:not-allowed':'')+'" '
      + (!alreadySent ? 'onclick="selectFriendlyTarget(\''+p.uid+'\',\''+esc(p.username)+'\')"' : '')+'>'
      + clubBadge(p.club, p.league, 30)
      + '<div style="flex:1"><div style="font-weight:700;font-size:.82rem">'+esc(p.username)+'</div>'
      + '<div style="font-size:.62rem;color:'+lg.c+'">'+esc(lg.short||'')+' · '+esc(p.club)+'</div></div>'
      + (alreadySent
        ? '<span style="font-size:.6rem;color:var(--gold)">Request Sent</span>'
        : '<span style="font-size:.6rem;color:var(--dim)">Challenge</span>')
      + '</div>';
  }).join('') : '<div style="color:var(--dim);text-align:center;padding:1rem;font-size:.78rem">No other players yet.</div>';

  // Reset form
  $('friendly-target-info').classList.add('hidden');
  $('friendly-send-wrap').classList.add('hidden');
  $('friendly-err').textContent = '';
  $('friendly-msg').classList.add('hidden');
  window._friendlyTargetUID = null;
  window._friendlyTargetName = null;

  openMo('friendly-mo');
}

function selectFriendlyTarget(uid, uname) {
  window._friendlyTargetUID  = uid;
  window._friendlyTargetName = uname;
  var p = allPlayers[uid];
  var el = $('friendly-target-info');
  if (!el) return;

  el.innerHTML = '<div style="display:flex;align-items:center;gap:.7rem;padding:.6rem;background:rgba(0,212,255,0.05);border:1px solid rgba(0,212,255,0.15);border-radius:10px">'
    + (p ? clubBadge(p.club, p.league, 36) : '')
    + '<div><div style="font-weight:700">'+esc(uname)+'</div>'
    + (p ? '<div style="font-size:.62rem;color:var(--dim)">'+esc(p.club)+'</div>' : '')
    + '</div></div>';
  el.classList.remove('hidden');
  $('friendly-send-wrap').classList.remove('hidden');
  $('friendly-err').textContent = '';
  $('friendly-msg').classList.add('hidden');

  // Highlight selection
  document.querySelectorAll('#friendly-player-list .swap-row').forEach(function(r){
    r.style.borderColor = r.getAttribute('onclick') && r.getAttribute('onclick').includes(uid) ? 'var(--cyan)' : '';
  });
}

function sendFriendlyRequest() {
  if (!myProfile || !window._friendlyTargetUID || !db) return;
  var msg    = $('friendly-msg-inp') ? $('friendly-msg-inp').value.trim() : '';
  var date   = $('friendly-date-inp') ? $('friendly-date-inp').value : '';
  var err    = $('friendly-err'); err.textContent = '';
  var target = allPlayers[window._friendlyTargetUID];
  if (!target) { err.textContent = 'Player not found.'; return; }

  var btn = $('friendly-send-btn');
  btn.textContent = 'Sending...'; btn.disabled = true;

  db.ref('ef_friendlies').push({
    fromUID:   myProfile.uid,
    fromName:  myProfile.username,
    fromClub:  myProfile.club,
    fromLeague:myProfile.league,
    toUID:     window._friendlyTargetUID,
    toName:    target.username,
    toClub:    target.club,
    toLeague:  target.league,
    message:   msg || '',
    proposedTime: date ? new Date(date).getTime() : null,
    status:    'pending',
    isFriendly: true,
    createdAt: Date.now()
  }).then(function() {
    btn.textContent = 'Send Challenge'; btn.disabled = false;
    var msgEl = $('friendly-msg');
    msgEl.textContent = 'Challenge sent to ' + target.username + '! 🤜';
    msgEl.classList.remove('hidden');
    $('friendly-send-wrap').classList.add('hidden');

    sendNotif(window._friendlyTargetUID, {
      title: '⚔️ Friendly Challenge!',
      body:  myProfile.username + ' has challenged you to a friendly match!',
      icon:  '⚔️',
      type:  'friendly',
      link:  'friendly'
    });
  }).catch(function(e) {
    err.textContent = 'Failed: ' + e.message;
    btn.textContent = 'Send Challenge'; btn.disabled = false;
  });
}

// ── ACCEPT / DECLINE ──────────────────────────────────────────
function acceptFriendly(key) {
  if (!myProfile || !db) return;
  var req = _friendlyRequests[key]; if (!req) return;

  // Create an actual match in ef_matches
  var matchRef = db.ref(DB.matches).push();
  var mid = matchRef.key;

  // Agreed time: use proposedTime or let them set it now
  var matchTime = req.proposedTime || null;

  matchRef.set({
    id:         mid,
    league:     req.fromLeague || req.toLeague || 'epl',
    homeId:     req.fromUID,
    homeName:   req.fromName,
    homeClub:   req.fromClub,
    awayId:     req.toUID,
    awayName:   req.toName,
    awayClub:   req.toClub,
    refereeUID: '',
    refereeName:'TBD',
    matchTime:  matchTime,
    played:     false,
    isFriendly: true,
    createdAt:  Date.now(),
    createdBy:  myProfile.uid
  }).then(function() {
    db.ref('ef_friendlies/' + key).update({
      status:    'accepted',
      matchId:   mid,
      acceptedAt: Date.now()
    });
    toast('Challenge accepted! Match created. 🤝');
    sendNotif(req.fromUID, {
      title: '✅ Challenge Accepted!',
      body:  req.toName + ' accepted your friendly challenge!',
      icon:  '✅',
      type:  'friendly',
      link:  'friendly'
    });
    renderFriendlySection();
  }).catch(function(e){ toast('Failed: ' + e.message, 'error'); });
}

function declineFriendly(key) {
  if (!db) return;
  var req = _friendlyRequests[key]; if (!req) return;
  db.ref('ef_friendlies/' + key).update({ status: 'declined', declinedAt: Date.now() })
    .then(function() {
      toast('Challenge declined.');
      sendNotif(req.fromUID, {
        title: '❌ Challenge Declined',
        body:  req.toName + ' declined your friendly match challenge.',
        icon:  '❌',
        type:  'friendly',
        link:  'friendly'
      });
      renderFriendlySection();
    });
}

function cancelFriendly(key) {
  if (!db) return;
  db.ref('ef_friendlies/' + key).update({ status: 'cancelled', cancelledAt: Date.now() })
    .then(function(){ toast('Request cancelled.'); renderFriendlySection(); });
}

// ── RENDER FRIENDLY SECTION (in match prep page) ──────────────
function renderFriendlySection() {
  var el = $('friendly-section'); if (!el) return;
  if (!myProfile) { el.innerHTML = ''; return; }

  var incoming = Object.values(_friendlyRequests).filter(function(r){ return r.status === 'pending'; });
  var accepted = Object.values(_friendlyRequests).filter(function(r){ return r.status === 'accepted'; });
  var sent     = Object.values(_friendlySent).filter(function(r){ return r.status === 'pending'; });

  if (!incoming.length && !accepted.length && !sent.length) {
    el.innerHTML = '';
    return;
  }

  var html = '<div class="card" style="padding:.9rem;margin-bottom:.8rem;border-color:rgba(0,212,255,0.2)">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--cyan);letter-spacing:1.5px;margin-bottom:.6rem">⚔️ FRIENDLY MATCHES</div>';

  // Incoming pending
  incoming.forEach(function(r) {
    html += '<div style="padding:.55rem 0;border-bottom:1px solid var(--border)">'
      + '<div style="display:flex;align-items:center;gap:.5rem;margin-bottom:.4rem">'
      + clubBadge(r.fromClub, r.fromLeague, 26)
      + '<div style="flex:1"><div style="font-size:.8rem;font-weight:700">'+esc(r.fromName)+' challenged you!</div>'
      + (r.message ? '<div style="font-size:.68rem;color:var(--dim);font-style:italic">"'+esc(r.message)+'"</div>' : '')
      + (r.proposedTime ? '<div style="font-size:.65rem;color:var(--gold)">Proposed: '+fmtFull(r.proposedTime)+'</div>' : '')
      + '</div></div>'
      + '<div style="display:flex;gap:.4rem">'
      + '<button class="btn-sm btn-accent" style="font-size:.68rem" onclick="acceptFriendly(\''+r.key+'\')">✓ Accept</button>'
      + '<button class="btn-sm btn-outline" style="font-size:.68rem" onclick="declineFriendly(\''+r.key+'\')">✗ Decline</button>'
      + '</div></div>';
  });

  // Accepted (match created)
  accepted.forEach(function(r) {
    html += '<div style="padding:.55rem 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.5rem">'
      + clubBadge(r.fromUID===myProfile.uid?r.toClub:r.fromClub, r.fromUID===myProfile.uid?r.toLeague:r.fromLeague, 24)
      + '<div style="flex:1;font-size:.76rem">vs <strong>'+esc(r.fromUID===myProfile.uid?r.toName:r.fromName)+'</strong>'
      + '<span style="font-size:.6rem;color:var(--green);margin-left:.4rem">✓ Match Created</span></div>'
      + '</div>';
  });

  // Sent pending
  sent.forEach(function(r) {
    html += '<div style="padding:.55rem 0;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:.5rem">'
      + clubBadge(r.toClub, r.toLeague, 24)
      + '<div style="flex:1"><div style="font-size:.76rem">Challenge sent to <strong>'+esc(r.toName)+'</strong></div>'
      + '<div style="font-size:.62rem;color:var(--gold)">Waiting for response...</div></div>'
      + '<button class="btn-xs" onclick="cancelFriendly(\''+r.key+'\')" style="color:var(--pink);border-color:rgba(255,40,130,0.3);flex-shrink:0">Cancel</button>'
      + '</div>';
  });

  html += '</div>';
  el.innerHTML = html;
}

// ── FULL FRIENDLY PAGE ────────────────────────────────────────
function renderFriendlyPage() {
  var pg = $('page-friendly'); if (!pg) return;

  if (!myProfile) {
    pg.innerHTML = '<div class="card empty" style="margin-top:1.5rem">Login to view friendly matches.</div>';
    return;
  }

  var incoming = Object.values(_friendlyRequests).filter(function(r){ return r.status === 'pending'; });
  var accepted = Object.values(_friendlyRequests).filter(function(r){ return r.status === 'accepted'; });
  var sent     = Object.values(_friendlySent).filter(function(r){ return r.status === 'pending'; });

  var html = '<div class="section-header">'
    + '<div class="section-title c-cyan">⚔️ Friendly Matches</div>'
    + '<div class="section-line"></div>'
    + '<button class="btn-xs" onclick="openFriendlyModal()">+ Challenge</button>'
    + '</div>';

  // ── INCOMING REQUESTS ──────────────────────────────────────
  if (incoming.length) {
    html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--gold);letter-spacing:1.5px;margin:.8rem 0 .4rem">📬 CHALLENGES RECEIVED ('+incoming.length+')</div>';
    incoming.forEach(function(r) {
      var p = allPlayers[r.fromUID];
      html += '<div class="card" style="padding:.9rem;margin-bottom:.5rem;border-color:rgba(255,230,0,0.25)">'
        + '<div style="display:flex;align-items:center;gap:.65rem;margin-bottom:.6rem">'
        + clubBadge(r.fromClub, r.fromLeague, 36)
        + '<div style="flex:1">'
        + '<div style="font-weight:700;font-size:.88rem">'+esc(r.fromName)+'</div>'
        + '<div style="font-size:.65rem;color:var(--dim)">'+esc(r.fromClub)+' · '+esc((LGS[r.fromLeague]||{}).short||'')+'</div>'
        + (r.message ? '<div style="font-size:.72rem;color:var(--text);font-style:italic;margin-top:.3rem">"'+esc(r.message)+'"</div>' : '')
        + (r.proposedTime ? '<div style="font-size:.65rem;color:var(--gold);margin-top:.25rem">📅 Proposed: '+fmtFull(r.proposedTime)+'</div>' : '')
        + '<div style="font-size:.6rem;color:var(--dim);margin-top:.2rem">Sent '+fmtAgo(r.createdAt)+'</div>'
        + '</div></div>'
        + '<div style="display:flex;gap:.5rem">'
        + '<button class="btn-primary" style="flex:1;padding:.5rem;font-size:.75rem" onclick="acceptFriendly(\''+r.key+'\')">✓ Accept Challenge</button>'
        + '<button class="btn-secondary" style="padding:.5rem .9rem;font-size:.75rem" onclick="declineFriendly(\''+r.key+'\')">✗ Decline</button>'
        + '</div></div>';
    });
  }

  // ── ACTIVE / ACCEPTED ──────────────────────────────────────
  if (accepted.length) {
    html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--green);letter-spacing:1.5px;margin:.8rem 0 .4rem">✅ ACTIVE FRIENDLIES</div>';
    accepted.forEach(function(r) {
      var isHome = r.fromUID === myProfile.uid;
      var oppName = isHome ? r.toName : r.fromName;
      var oppClub = isHome ? r.toClub : r.fromClub;
      var oppLeague = isHome ? r.toLeague : r.fromLeague;
      var m = r.matchId ? allMatches[r.matchId] : null;
      html += '<div class="card" style="padding:.9rem;margin-bottom:.5rem;border-color:rgba(0,255,133,0.2)">'
        + '<div style="display:flex;align-items:center;gap:.65rem">'
        + clubBadge(oppClub, oppLeague, 32)
        + '<div style="flex:1">'
        + '<div style="font-weight:700;font-size:.84rem">vs '+esc(oppName)+'</div>'
        + '<div style="font-size:.65rem;color:var(--dim)">'+esc(oppClub)+'</div>'
        + (m && m.matchTime ? '<div style="font-size:.65rem;color:var(--cyan);margin-top:.25rem">📅 '+fmtFull(m.matchTime)+'</div>' : '<div style="font-size:.65rem;color:var(--dim);margin-top:.25rem">Time TBD — set in Match Prep</div>')
        + '</div>'
        + '<span style="font-size:.62rem;font-weight:700;color:var(--green);background:rgba(0,255,133,0.08);border:1px solid rgba(0,255,133,0.25);border-radius:6px;padding:3px 8px">Match Created</span>'
        + '</div></div>';
    });
  }

  // ── SENT REQUESTS ──────────────────────────────────────────
  if (sent.length) {
    html += '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--cyan);letter-spacing:1.5px;margin:.8rem 0 .4rem">📤 CHALLENGES SENT</div>';
    sent.forEach(function(r) {
      html += '<div class="card" style="padding:.9rem;margin-bottom:.5rem">'
        + '<div style="display:flex;align-items:center;gap:.65rem">'
        + clubBadge(r.toClub, r.toLeague, 32)
        + '<div style="flex:1">'
        + '<div style="font-weight:700;font-size:.84rem">'+esc(r.toName)+'</div>'
        + '<div style="font-size:.65rem;color:var(--dim)">'+esc(r.toClub)+'</div>'
        + (r.message ? '<div style="font-size:.7rem;font-style:italic;color:var(--dim);margin-top:.2rem">"'+esc(r.message)+'"</div>' : '')
        + '<div style="font-size:.6rem;color:var(--gold);margin-top:.25rem">⏳ Waiting for response...</div>'
        + '</div>'
        + '<button class="btn-xs" onclick="cancelFriendly(\''+r.key+'\')" style="color:var(--pink);border-color:rgba(255,40,130,0.3);flex-shrink:0">Cancel</button>'
        + '</div></div>';
    });
  }

  // ── EMPTY STATE ────────────────────────────────────────────
  if (!incoming.length && !accepted.length && !sent.length) {
    html += '<div class="card empty" style="margin-top:.5rem">'
      + '<div style="font-size:1.8rem;margin-bottom:.5rem">⚔️</div>'
      + '<div style="font-size:.84rem;font-weight:700;margin-bottom:.3rem">No friendly matches yet</div>'
      + '<div style="font-size:.72rem;color:var(--dim);margin-bottom:1rem">Challenge any player to a friendly — cross-league, no points, pure bragging rights.</div>'
      + '<button class="btn-primary" style="width:auto;padding:.55rem 1.5rem;font-size:.78rem" onclick="openFriendlyModal()">⚔️ Challenge a Player</button>'
      + '</div>';
  }

  pg.innerHTML = html;
}
