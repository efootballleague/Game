// STATE.JS — Centralized state + backward-compat aliases
// Load order: 2nd (after config.js, before everything else)

var App = {
  auth:null, db:null,
  state:{ user:null, profile:null, players:{}, matches:{}, penalties:{}, polls:{}, uclSettings:{}, uclPayments:{} },
  ui:{ page:'home', curLg:'epl', fxFilter:'all', chatTab:'dms', navLocked:false },
  access:{
    isLoggedIn: function(){ return !!App.state.profile; },
    isAdmin:    function(){ return !!(App.state.user && App.state.user.email===ADMIN_EMAIL); },
    isBanned:   function(){ return !!(App.state.profile && App.state.profile.banned); }
  },
  _listeners:{},
  on:   function(ev,fn){ if(!App._listeners[ev])App._listeners[ev]=[]; App._listeners[ev].push(fn); },
  emit: function(ev,d){ (App._listeners[ev]||[]).forEach(function(fn){try{fn(d);}catch(e){console.error(e);}}); }
};

// Backward-compat window property aliases
Object.defineProperty(window,'allPlayers',   {get:function(){return App.state.players;    },set:function(v){App.state.players    =v;}});
Object.defineProperty(window,'allMatches',   {get:function(){return App.state.matches;    },set:function(v){App.state.matches    =v;}});
Object.defineProperty(window,'allPenalties', {get:function(){return App.state.penalties;  },set:function(v){App.state.penalties  =v;}});
Object.defineProperty(window,'allPolls',     {get:function(){return App.state.polls;      },set:function(v){App.state.polls      =v;}});
Object.defineProperty(window,'myProfile',    {get:function(){return App.state.profile;    },set:function(v){App.state.profile    =v;}});
Object.defineProperty(window,'me',           {get:function(){return App.state.user;       },set:function(v){App.state.user       =v;}});
Object.defineProperty(window,'auth',         {get:function(){return App.auth;             },set:function(v){App.auth             =v;}});
Object.defineProperty(window,'db',           {get:function(){return App.db;              },set:function(v){App.db              =v;}});
Object.defineProperty(window,'uclSettings',  {get:function(){return App.state.uclSettings;},set:function(v){App.state.uclSettings=v;}});
Object.defineProperty(window,'uclPayments',  {get:function(){return App.state.uclPayments;},set:function(v){App.state.uclPayments=v;}});
Object.defineProperty(window,'curLg',        {get:function(){return App.ui.curLg;        },set:function(v){App.ui.curLg        =v;}});
Object.defineProperty(window,'curFxFilter',  {get:function(){return App.ui.fxFilter;     },set:function(v){App.ui.fxFilter     =v;}});

// Module-scoped vars shared across files
var drawnClub=null, chatTab='dms', activeDMUID=null, activeDMKey=null;
var _swapRequests={}, _swapListening=false, _globalDMsListening=false, _unreadListening=false;
var unreadPM=0, onlineInterval=null, _refreshTimer=null, _openRoomId=null, _dmUnreadGroups={};
var _gsUser=null, _gsLeague='', _gsClub='', _postponeMid=null, _postponeOrig=0, _postponeIsAdmin=false;
var _swapTargetUID=null, _predictTarget={}, _navLock=false, _notifOff=null;
var _evCountry=null, _evType=null, _evId=null;
