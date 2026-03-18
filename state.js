// ============================================================
// STATE.JS — Centralized application state
// ALL data lives here. Nothing is a scattered global.
// GPT: "Create something like const store = { players:{}, matches:{}, user:null }"
// ============================================================

var App = {
  // Firebase handles
  auth: null,
  db:   null,

  // ── Centralized data store ────────────────────────────────
  state: {
    user:        null,   // Firebase auth user
    profile:     null,   // player profile from DB
    players:     {},
    matches:     {},
    penalties:   {},
    polls:       {},
    uclSettings: {},
    uclPayments: {}
  },

  // ── UI state ─────────────────────────────────────────────
  ui: {
    page:       'home',
    curLg:      'epl',
    fxFilter:   'all',
    chatTab:    'dms',
    navLocked:  false,
    drawerOpen: false
  },

  // ── Access control (GPT: what user should/shouldn't access) ─
  access: {
    isLoggedIn:    function() { return !!App.state.profile; },
    isAdmin:       function() { return !!(App.state.user && App.state.user.email === ADMIN_EMAIL); },
    isBanned:      function() { return !!(App.state.profile && App.state.profile.banned); },
    isRestricted:  function(type) {
      var p = App.state.profile;
      if (!p || !p.restrictions) return false;
      var r = p.restrictions[type];
      if (!r) return false;
      if (r.until && Date.now() > r.until) return false;
      return true;
    },
    canSubmitResult: function() {
      return App.access.isLoggedIn() && !App.access.isBanned() && !App.access.isRestricted('no_submit');
    },
    canChat: function() {
      return App.access.isLoggedIn() && !App.access.isBanned() && !App.access.isRestricted('no_chat');
    }
  },

  // ── Lightweight event bus ─────────────────────────────────
  _listeners: {},
  on: function(event, fn) {
    if (!App._listeners[event]) App._listeners[event] = [];
    App._listeners[event].push(fn);
  },
  emit: function(event, data) {
    (App._listeners[event] || []).forEach(function(fn) { try { fn(data); } catch(e) { console.error(e); } });
  }
};

// ── Backward-compat property aliases ─────────────────────────
// Old code using globals still works; new code uses App.state.*
Object.defineProperty(window, 'allPlayers',   { get: function(){ return App.state.players;     }, set: function(v){ App.state.players     = v; } });
Object.defineProperty(window, 'allMatches',   { get: function(){ return App.state.matches;     }, set: function(v){ App.state.matches     = v; } });
Object.defineProperty(window, 'allPenalties', { get: function(){ return App.state.penalties;   }, set: function(v){ App.state.penalties   = v; } });
Object.defineProperty(window, 'allPolls',     { get: function(){ return App.state.polls;       }, set: function(v){ App.state.polls       = v; } });
Object.defineProperty(window, 'myProfile',    { get: function(){ return App.state.profile;     }, set: function(v){ App.state.profile     = v; } });
Object.defineProperty(window, 'me',           { get: function(){ return App.state.user;        }, set: function(v){ App.state.user        = v; } });
Object.defineProperty(window, 'auth',         { get: function(){ return App.auth;              }, set: function(v){ App.auth              = v; } });
Object.defineProperty(window, 'db',           { get: function(){ return App.db;                }, set: function(v){ App.db               = v; } });
Object.defineProperty(window, 'uclSettings',  { get: function(){ return App.state.uclSettings; }, set: function(v){ App.state.uclSettings = v; } });
Object.defineProperty(window, 'uclPayments',  { get: function(){ return App.state.uclPayments; }, set: function(v){ App.state.uclPayments = v; } });
Object.defineProperty(window, 'curLg',        { get: function(){ return App.ui.curLg;  }, set: function(v){ App.ui.curLg  = v; } });
Object.defineProperty(window, 'curFxFilter',  { get: function(){ return App.ui.fxFilter; }, set: function(v){ App.ui.fxFilter = v; } });

// These are genuinely module-scoped — kept as vars
var drawnClub           = null;
var chatTab             = 'dms';
var activeDMUID         = null;
var activeDMKey         = null;
var _swapRequests       = {};
var _swapListening      = false;
var _globalDMsListening = false;
var _unreadListening    = false;
var unreadPM            = 0;
var onlineInterval      = null;
var _refreshTimer       = null;
var _openRoomId         = null;
var _dmUnreadGroups     = {};
var _gsUser = null, _gsLeague = '', _gsClub = '';
var _postponeMid = null, _postponeOrig = 0, _postponeIsAdmin = false;
var _swapTargetUID = null;
var _predictTarget = {};
