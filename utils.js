// ============================================================
// UTILS.JS — Pure helpers. No DOM. No Firebase. No side effects.
// GPT: "Separate Logic from UI" — these are LOGIC only.
// ============================================================

// ── DOM shorthand ─────────────────────────────────────────────
function $(id) { return document.getElementById(id); }

// ── String safety ─────────────────────────────────────────────
function esc(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Date/time helpers ─────────────────────────────────────────
function fmtDate(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleDateString('en-GB', { day:'2-digit', month:'short' });
}
function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}
function fmtFull(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleString('en-GB', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });
}
function fmtAgo(ts) {
  if (!ts) return 'Never';
  var d = Date.now() - ts, m = Math.floor(d / 60000);
  if (m < 2)  return 'Online now';
  if (m < 60) return m + 'm ago';
  var h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  var dy = Math.floor(h / 24);
  if (dy === 1) return 'Yesterday';
  if (dy < 7)  return dy + 'd ago';
  return fmtDate(ts);
}
function lsColor(ts) {
  if (!ts) return '#555';
  var d = Date.now() - ts;
  if (d < 300000)  return '#00ff88';
  if (d < 3600000) return '#ffe600';
  return '#555';
}
function dmKey(a, b) { return [a, b].sort().join('_'); }
function shuffle(a) {
  var b = a.slice();
  for (var i = b.length-1; i > 0; i--) {
    var j = Math.floor(Math.random()*(i+1)), t = b[i]; b[i] = b[j]; b[j] = t;
  }
  return b;
}
function tsToDatetimeLocal(ts) {
  if (!ts) return '';
  var d = new Date(ts), p = function(n){ return n < 10 ? '0'+n : ''+n; };
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes());
}

// ── Club/league helpers ───────────────────────────────────────
function getClub(lid, name) {
  return (ALL_CLUBS[lid] || []).find(function(c){ return c.name === name; })
      || { name: name, color: '#888', logo: '' };
}
function clubColor(name) {
  var lids = ['epl','laliga','seriea','ligue1'];
  for (var i = 0; i < lids.length; i++) {
    var c = getClub(lids[i], name);
    if (c && c.color && c.color !== '#888') return c.color;
  }
  var h = 0;
  for (var j = 0; j < (name||'').length; j++) h = (h*31 + name.charCodeAt(j)) & 0xFFFFFF;
  return '#' + h.toString(16).padStart(6,'0');
}

// ── Reusable UI components (GPT: "Create Reusable Components") ─
// These return HTML strings — no DOM mutation.

function clubBadge(name, lid, sz) {
  var club = getClub(lid, name);
  var c    = club.color || '#888';
  var init = (name||'?').split(' ').map(function(w){ return w[0]||''; }).join('').slice(0,2).toUpperCase();
  var s    = sz || 28;
  var st   = 'width:'+s+'px;height:'+s+'px;border-radius:50%;background:'+c+'18;border:1.5px solid '+c+'44;'
           + 'display:inline-flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;'
           + 'position:relative;font-size:'+(s*.3)+'px;font-weight:800;color:'+c+';vertical-align:middle';
  if (club.logo) {
    return '<div style="'+st+'" title="'+esc(name)+'">'+init
      +'<img src="'+club.logo+'" loading="lazy" decoding="async" '
      +'style="position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:'+(s*.1)+'px;background:#fff;opacity:0;transition:opacity .2s" '
      +'onload="this.style.opacity=1" onerror="this.remove()">'
      +'</div>';
  }
  return '<div style="'+st+'" title="'+esc(name)+'">'+init+'</div>';
}

function lgBadge(lid) {
  var lg = LGS[lid] || {};
  return '<span class="lg-badge" style="background:'+lg.bg+';color:'+lg.c+';border:1px solid '+lg.c+'44">'+lg.f+' '+lg.short+'</span>';
}

// ── Data validation (GPT: "Add Data Validation") ──────────────
var Validate = {
  username: function(u) {
    if (!u || u.length < 3 || u.length > 20) return 'Username: 3-20 characters.';
    if (!/^[a-zA-Z0-9_]+$/.test(u)) return 'Letters, numbers and underscore only.';
    return null;
  },
  email: function(em) {
    if (!em || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) return 'Invalid email address.';
    return null;
  },
  password: function(pw) {
    if (!pw || pw.length < 8) return 'Password must be at least 8 characters.';
    return null;
  },
  score: function(hg, ag) {
    if (isNaN(hg)||isNaN(ag)||hg < 0||ag < 0) return 'Invalid score.';
    if (hg > 20 || ag > 20) return 'Score seems too high.';
    return null;
  }
};

// ── Error handler (GPT: "Improve Error Handling") ─────────────
function handleError(err, context) {
  console.error('[' + (context||'App') + ']', err);
  if (!err) return 'Something went wrong.';
  var codes = {
    'auth/email-already-in-use': 'Email already registered. Try signing in.',
    'auth/user-not-found':       'No account found with this email.',
    'auth/wrong-password':       'Wrong email or password.',
    'auth/too-many-requests':    'Too many attempts. Try again later.',
    'auth/network-request-failed': 'No internet connection.',
    'auth/weak-password':        'Password too weak (min 8 chars).',
    'auth/invalid-email':        'Invalid email address.',
    'auth/invalid-credential':   'Wrong email or password.'
  };
  if (err.code && codes[err.code]) return codes[err.code];
  if (err.message) return err.message;
  return 'Something went wrong. Please try again.';
}

// ── Standings compute (GPT: "computeStd() — logic, keep pure") ─
function computeStd(lid) {
  var t = {};
  Object.values(App.state.players)
    .filter(function(p){ return p.league === lid; })
    .forEach(function(p){
      t[p.uid] = { uid:p.uid, name:p.username, club:p.club, league:lid,
        country:p.country||'', lastSeen:p.lastSeen||0,
        p:0, w:0, d:0, l:0, gf:0, ga:0, form:[] };
    });
  Object.values(App.state.matches)
    .filter(function(m){ return m.league===lid && m.played && !m.pendingResult; })
    .forEach(function(m){
      var h=t[m.homeId], a=t[m.awayId]; if(!h||!a) return;
      h.p++; a.p++; h.gf+=m.hg; h.ga+=m.ag; a.gf+=m.ag; a.ga+=m.hg;
      if      (m.hg>m.ag){ h.w++; h.form.push('w'); a.l++; a.form.push('l'); }
      else if (m.hg<m.ag){ a.w++; a.form.push('w'); h.l++; h.form.push('l'); }
      else               { h.d++; h.form.push('d'); a.d++; a.form.push('d'); }
    });
  return Object.values(t).map(function(r){
    var pen = App.state.penalties[r.uid]
      ? Object.values(App.state.penalties[r.uid]).reduce(function(s,x){ return s+(x.pts||0); },0) : 0;
    r.rawPts=r.w*3+r.d; r.penPts=pen; r.pts=Math.max(0,r.rawPts-pen);
    return r;
  }).sort(function(a,b){
    if (b.pts !== a.pts) return b.pts - a.pts;
    return (b.gf-b.ga) - (a.gf-a.ga);
  });
}

// ── Player stats (pure compute, no DOM) ───────────────────────
function computePlayerStats(uid) {
  var ms = Object.values(App.state.matches)
    .filter(function(m){ return m.played && (m.homeId===uid||m.awayId===uid); });
  var wins   = ms.filter(function(m){ return (m.homeId===uid&&m.hg>m.ag)||(m.awayId===uid&&m.ag>m.hg); }).length;
  var draws  = ms.filter(function(m){ return m.hg===m.ag; }).length;
  var losses = ms.length - wins - draws;
  var gf     = ms.reduce(function(a,m){ return a+(m.homeId===uid?m.hg:m.ag); },0);
  var ga     = ms.reduce(function(a,m){ return a+(m.homeId===uid?m.ag:m.hg); },0);
  var pen    = App.state.penalties[uid]
    ? Object.values(App.state.penalties[uid]).reduce(function(s,x){ return s+(x.pts||0); },0) : 0;
  return { ms:ms, wins:wins, draws:draws, losses:losses,
           gf:gf, ga:ga, pts:Math.max(0,wins*3+draws-pen), pen:pen };
}

// ── Badge compute (pure) ──────────────────────────────────────
function computeBadges(uid) {
  var earned = [];
  var ms = Object.values(App.state.matches)
    .filter(function(m){ return m.played && !m.pendingResult && (m.homeId===uid||m.awayId===uid); })
    .sort(function(a,b){ return (a.playedAt||0)-(b.playedAt||0); });
  if (!ms.length) return earned;
  function res(m){ return m.homeId===uid?(m.hg>m.ag?'W':m.hg===m.ag?'D':'L'):(m.ag>m.hg?'W':m.ag===m.hg?'D':'L'); }
  function conceded(m){ return m.homeId===uid?m.ag:m.hg; }
  var results=ms.map(res), last3=results.slice(-3), last5=results.slice(-5);
  if (ms.length>=10) earned.push('veteran');
  if (last3.length===3 && last3.every(function(r){ return r==='W'; })) earned.push('top_form');
  if (last5.length===5 && last5.every(function(r){ return r!=='L'; })) earned.push('unbeaten');
  if (last5.length>=3  && last5.every(function(r){ return r!=='L'; })) earned.push('consistent');
  var cs = ms.slice(-10).filter(function(m){ return conceded(m)===0; }).length;
  if (cs>=3) earned.push('clean_sheet');
  var p = App.state.players[uid];
  if (p) {
    var table = computeStd(p.league);
    var top3  = table.slice(0,3).map(function(r){ return r.uid; });
    var killed = ms.some(function(m){
      var opp = m.homeId===uid?m.awayId:m.homeId;
      return top3.includes(opp) && res(m)==='W';
    });
    if (killed) earned.push('giant_killer');
  }
  return earned;
}

function renderBadges(uid, size) {
  var earned = computeBadges(uid);
  if (!earned.length) return '<span style="font-size:.7rem;color:var(--dim)">No badges yet</span>';
  return earned.map(function(key){
    var b = BADGES[key]; if (!b) return '';
    var s = size || 32;
    return '<div title="'+esc(b.label)+': '+esc(b.desc)+'" style="width:'+s+'px;height:'+s+'px;border-radius:50%;'
      +'background:'+RARITY_GLOW[b.rarity]+';border:1.5px solid '+b.color+';'
      +'display:inline-flex;align-items:center;justify-content:center;font-size:'+(s*.5)+'px;margin:2px;cursor:help">'
      +b.icon+'</div>';
  }).join('');
}

// ── Cloudinary upload ─────────────────────────────────────────
function compressImage(file, maxW, quality, cb) {
  var reader = new FileReader();
  reader.onload = function(e) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var ratio  = Math.min(maxW/img.width, 1);
      canvas.width = img.width*ratio; canvas.height = img.height*ratio;
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(function(blob){ cb(blob||file); }, 'image/jpeg', quality);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}
function uploadToCloudinary(file, folder, publicId, onSuccess, onFail) {
  compressImage(file, 1280, 0.82, function(blob) {
    var fd = new FormData();
    fd.append('file', blob);
    fd.append('upload_preset', CLOUDINARY_PRESET);
    fd.append('folder', folder||'general');
    if (publicId) fd.append('public_id', publicId);
    fetch('https://api.cloudinary.com/v1_1/'+CLOUDINARY_CLOUD+'/image/upload',
      { method:'POST', body:fd })
      .then(function(r){ return r.json(); })
      .then(function(d){ if (d.secure_url) onSuccess(d.secure_url); else onFail(d); })
      .catch(onFail);
  });
}
