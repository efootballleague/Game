// ============================================================
// UCL.JS — Champions League: Bracket + Payments
// Rebuilt from scratch — renders directly into page-ucl
// ============================================================

function renderUCL() {
  var pg = $('page-ucl');
  if (!pg) return;

  // Guard — show loading if data not ready yet
  if (!allPlayers || !Object.keys(allPlayers).length) {
    pg.innerHTML = '<div style="text-align:center;padding:3rem 1rem;color:var(--dim)">'
      + '<div style="font-size:2rem;margin-bottom:.8rem">🏆</div>'
      + '<div style="font-family:Orbitron,sans-serif;font-size:.8rem;color:var(--gold)">Champions League</div>'
      + '<div style="margin-top:.5rem;font-size:.76rem">Loading...</div></div>';
    return;
  }

  var seeds = [];
  UCL_LEAGUES.forEach(function(lid) {
    computeStd(lid).slice(0, 4).forEach(function(r, i) {
      seeds.push(Object.assign({}, r, { league: lid, seed: i + 1 }));
    });
  });

  var fee      = parseFloat((uclSettings && uclSettings.fee) || 0);
  var cur      = (uclSettings && uclSettings.currency) || 'NGN';
  var paidList = Object.values(uclPayments || {}).filter(function(p) { return p.status === 'confirmed'; });
  var pool     = paidList.length * fee;
  var p1       = (pool * 0.7).toFixed(2);
  var p2       = (pool * 0.3).toFixed(2);
  var isAdmin  = me && me.email === ADMIN_EMAIL;
  var myPay    = myProfile ? ((uclPayments || {})[myProfile.uid] || null) : null;
  var iQ       = myProfile && seeds.some(function(s) { return s.uid === myProfile.uid; });

  var html = '<div class="section-header">'
    + '<div class="section-title c-gold">🏆 Champions League</div>'
    + '<div class="section-line gold"></div>'
    + '</div>';

  // ── PRIZE POOL CARDS ──────────────────────────────────────
  html += '<div class="ucl-prizes">'
    + '<div class="ucl-prize gold">'
    +   '<div class="ucl-prize-label">1st Place</div>'
    +   '<div class="ucl-prize-val">' + (fee > 0 && pool > 0 ? cur + p1 : fee > 0 ? cur + '?' : '--') + '</div>'
    + '</div>'
    + '<div class="ucl-prize silver">'
    +   '<div class="ucl-prize-label">2nd Place</div>'
    +   '<div class="ucl-prize-val" style="color:#ccc">' + (fee > 0 && pool > 0 ? cur + p2 : fee > 0 ? cur + '?' : '--') + '</div>'
    + '</div>'
    + '<div class="ucl-prize cyan">'
    +   '<div class="ucl-prize-label">Prize Pool</div>'
    +   '<div class="ucl-prize-val" style="color:var(--cyan)">' + cur + pool.toFixed(2) + '</div>'
    +   '<div style="font-size:.6rem;color:var(--dim)">' + paidList.length + '/16 paid</div>'
    + '</div>'
    + '</div>';

  // ── HOW IT WORKS ──────────────────────────────────────────
  html += '<div class="ucl-rules">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--gold);letter-spacing:1.5px;margin-bottom:.4rem">HOW IT WORKS</div>'
    + '<div style="font-size:.74rem;color:var(--dim);line-height:1.65">'
    + '• Top 4 from each league (16 total) qualify<br>'
    + '• Pay entry fee to lock your spot<br>'
    + '• 70% to Champion · 30% to Runner-up<br>'
    + '• No payment within 48hrs = forfeit spot'
    + '</div>'
    + '</div>';

  // ── MY ENTRY STATUS ───────────────────────────────────────
  if (iQ) {
    html += '<div class="ucl-fee-box">'
      + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin-bottom:.5rem">YOUR ENTRY</div>'
      + (!fee
        ? '<div style="font-size:.76rem;color:var(--dim)">Entry fee not set yet. Check back soon.</div>'
        : !myPay
          ? '<button class="btn-primary" onclick="openUCLPay()">💳 Pay Entry Fee (' + cur + fee + ')</button>'
          : myPay.status === 'pending'
            ? '<div style="font-size:.76rem;color:var(--gold)">⏳ Payment submitted — admin reviewing.</div>'
            : myPay.status === 'confirmed'
              ? '<div style="font-size:.76rem;color:var(--green)">✅ Spot confirmed! Get ready.</div>'
              : '<button class="btn-primary" onclick="openUCLPay()">💳 Pay (' + cur + fee + ')</button>')
      + '</div>';
  } else if (myProfile && !iQ) {
    html += '<div style="background:rgba(255,255,255,0.03);border:1px solid var(--border);border-radius:12px;padding:.8rem;margin-bottom:.8rem;font-size:.74rem;color:var(--dim)">'
      + 'Finish in the top 4 of your league to qualify for the Champions League.'
      + '</div>';
  }

  // ── QUALIFIED PLAYERS ─────────────────────────────────────
  html += '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin:.9rem 0 .5rem">QUALIFIED PLAYERS</div>';

  if (!seeds.length) {
    html += '<div class="card empty" style="margin-bottom:.8rem">No qualifiers yet. Leagues must complete their season first.</div>';
  } else {
    html += '<div class="grid2">';
    seeds.forEach(function(s) {
      var p    = allPlayers[s.uid]; if (!p) return;
      var lg   = LGS[s.league] || {};
      var paid = (uclPayments || {})[s.uid] && (uclPayments || {})[s.uid].status === 'confirmed';
      html += '<div class="card" style="padding:.7rem;display:flex;align-items:center;gap:.5rem">'
        + clubBadge(p.club, s.league, 26)
        + '<div style="flex:1;min-width:0">'
        +   '<div style="font-size:.78rem;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p.username) + '</div>'
        +   '<div style="font-size:.6rem;color:' + lg.c + '">' + esc(lg.short || '') + ' #' + s.seed + '</div>'
        + '</div>'
        + '<div style="font-size:.62rem;font-weight:700;color:' + (paid ? 'var(--green)' : 'var(--dim)') + '">'
        +   (paid ? '✓ Paid' : 'Unpaid') + '</div>'
        + '</div>';
    });
    html += '</div>';
  }

  // ── BRACKET ───────────────────────────────────────────────
  html += '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--dim);letter-spacing:1.5px;margin:.9rem 0 .5rem">BRACKET</div>';
  html += '<div style="overflow-x:auto">' + _renderUCLBracket(seeds) + '</div>';

  // ── ADMIN PANEL ───────────────────────────────────────────
  if (isAdmin) {
    html += _renderUCLAdmin();
  }

  pg.innerHTML = html;
}

function _renderUCLBracket(seeds) {
  if (seeds.length < 4) {
    return '<div class="card empty">Bracket available once 4+ players qualify.</div>';
  }

  var rounds = ['Quarter Finals', 'Semi Finals', 'Final'];
  // QF matchups: 1v8, 2v7, 3v6, 4v5 (if 8+ seeds)
  var qfPairs = [];
  var n = seeds.length;
  if (n >= 8) {
    qfPairs = [
      [seeds[0], seeds[7]], [seeds[1], seeds[6]],
      [seeds[2], seeds[5]], [seeds[3], seeds[4]]
    ];
  } else {
    for (var i = 0; i < Math.floor(n / 2); i++) {
      qfPairs.push([seeds[i], seeds[n - 1 - i]]);
    }
  }

  var html = '<div style="display:flex;gap:.6rem;overflow-x:auto;padding-bottom:.5rem;min-width:0">';

  // Quarter Finals
  html += '<div style="min-width:130px;flex-shrink:0">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.55rem;color:var(--gold);letter-spacing:1px;margin-bottom:.5rem;text-align:center">QUARTER FINALS</div>';
  qfPairs.forEach(function(pair) {
    html += _bracketMatchBox(pair[0], pair[1]);
  });
  html += '</div>';

  // Semi Finals
  html += '<div style="min-width:130px;flex-shrink:0">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.55rem;color:var(--gold);letter-spacing:1px;margin-bottom:.5rem;text-align:center">SEMI FINALS</div>';
  for (var j = 0; j < 2; j++) {
    html += _bracketMatchBox(null, null);
  }
  html += '</div>';

  // Final
  html += '<div style="min-width:130px;flex-shrink:0">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.55rem;color:var(--gold);letter-spacing:1px;margin-bottom:.5rem;text-align:center">FINAL</div>';
  html += _bracketMatchBox(null, null);
  html += '</div>';

  html += '</div>';
  return html;
}

function _bracketMatchBox(p1, p2) {
  var name1 = p1 ? esc((allPlayers[p1.uid] || {}).username || p1.name || '?') : 'TBD';
  var name2 = p2 ? esc((allPlayers[p2.uid] || {}).username || p2.name || '?') : 'TBD';
  var c1    = p1 ? (LGS[p1.league] || {}).c || 'var(--dim)' : 'var(--dim)';
  var c2    = p2 ? (LGS[p2.league] || {}).c || 'var(--dim)' : 'var(--dim)';
  return '<div style="background:var(--card);border:1px solid var(--border);border-radius:9px;padding:.5rem .7rem;margin-bottom:.45rem">'
    + '<div style="font-size:.7rem;font-weight:700;color:' + c1 + ';padding-bottom:.28rem;border-bottom:1px solid rgba(255,255,255,0.05);margin-bottom:.28rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + name1 + '</div>'
    + '<div style="font-size:.7rem;font-weight:700;color:' + c2 + ';overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + name2 + '</div>'
    + '</div>';
}

function _renderUCLAdmin() {
  var fee  = (uclSettings && uclSettings.fee) || '';
  var cur  = (uclSettings && uclSettings.currency) || '';
  var pk   = (uclSettings && uclSettings.pk) || PAYSTACK_PK || '';
  var acct = (uclSettings && uclSettings.acctEmail) || '';

  return '<div style="background:rgba(255,40,130,0.05);border:1px solid rgba(255,40,130,0.2);border-radius:12px;padding:.9rem;margin-top:1rem">'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.62rem;color:var(--pink);letter-spacing:1.5px;margin-bottom:.7rem">🛡 ADMIN — UCL SETTINGS</div>'
    + '<div class="form-row">'
    +   '<div class="form-group"><label class="lbl">Entry Fee</label><input class="inp" id="ucl-fee-inp" type="number" min="0" placeholder="e.g. 500" value="' + fee + '"></div>'
    +   '<div class="form-group"><label class="lbl">Currency</label><input class="inp" id="ucl-cur-inp" placeholder="NGN" value="' + esc(cur) + '"></div>'
    + '</div>'
    + '<div class="form-row">'
    +   '<div class="form-group" style="flex:2"><label class="lbl">Paystack Public Key</label><input class="inp" id="ucl-pk-inp" placeholder="pk_live_..." value="' + esc(pk) + '"></div>'
    +   '<div class="form-group"><label class="lbl">Account Email</label><input class="inp" id="ucl-acct-inp" placeholder="you@email.com" value="' + esc(acct) + '"></div>'
    + '</div>'
    + '<button class="btn-primary" style="width:auto;padding:.5rem 1.2rem" onclick="saveUCLSettings()">Save Settings</button>'
    + '<div style="font-family:Orbitron,sans-serif;font-size:.6rem;color:var(--dim);letter-spacing:1px;margin-top:.9rem;margin-bottom:.4rem">PAYMENT LOG</div>'
    + '<div id="ucl-payment-log">' + _renderUCLPayLog() + '</div>'
    + '</div>';
}

function _renderUCLPayLog() {
  var pays = Object.entries(uclPayments || {});
  if (!pays.length) return '<div style="font-size:.74rem;color:var(--dim)">No payments yet.</div>';
  return pays.map(function(kv) {
    var uid = kv[0], pay = kv[1];
    var p   = allPlayers[uid];
    var sc  = pay.status === 'confirmed' ? 'var(--green)' : pay.status === 'pending' ? 'var(--gold)' : 'var(--pink)';
    return '<div style="display:flex;align-items:center;justify-content:space-between;padding:.4rem 0;border-bottom:1px solid rgba(255,255,255,0.04);font-size:.74rem;gap:.4rem">'
      + '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(p ? p.username : uid) + '</span>'
      + '<span style="color:' + sc + ';font-weight:700;text-transform:capitalize">' + esc(pay.status || '') + '</span>'
      + (pay.status === 'pending' && me && me.email === ADMIN_EMAIL
        ? '<button class="btn-xs" onclick="confirmUCLPayment(\'' + uid + '\')">✓ Confirm</button>' : '')
      + '</div>';
  }).join('');
}

function saveUCLSettings() {
  if (!db || !me || me.email !== ADMIN_EMAIL) return;
  var fee  = parseFloat($('ucl-fee-inp').value) || 0;
  var cur  = ($('ucl-cur-inp').value || '').trim() || 'NGN';
  var pk   = ($('ucl-pk-inp').value || '').trim();
  var acct = ($('ucl-acct-inp').value || '').trim();
  if (!confirm('Save UCL settings?\n\nFee: ' + cur + fee + '\nKey: ' + (pk ? pk.slice(0,12)+'...' : 'none'))) return;
  db.ref(DB.uclSet).update({ fee:fee, currency:cur, pk:pk, acctEmail:acct })
    .then(function() { toast('UCL settings saved!'); renderUCL(); })
    .catch(function(e) { toast('Failed: ' + e.message, 'error'); });
}

function confirmUCLPayment(uid) {
  if (!db || !me || me.email !== ADMIN_EMAIL) return;
  var pname = allPlayers[uid] ? allPlayers[uid].username : uid;
  if (!confirm('Confirm payment for ' + pname + '?\nThis will lock their UCL spot.')) return;
  db.ref(DB.uclPay + '/' + uid).update({ status:'confirmed', confirmedAt:Date.now(), confirmedBy:me.uid })
    .then(function() {
      toast('Payment confirmed for ' + pname);
      sendNotif(uid, { title:'🏆 UCL Spot Confirmed!', body:'Your Champions League spot is locked. Get ready!', icon:'trophy', type:'ucl' });
      renderUCL();
    })
    .catch(function(e) { toast('Failed: ' + e.message, 'error'); });
}

function openUCLPay() {
  if (!myProfile) { showLanding(); return; }
  var fee = parseFloat((uclSettings && uclSettings.fee) || 0);
  var cur = (uclSettings && uclSettings.currency) || 'NGN';
  if (!fee) { toast('Entry fee has not been set yet.', 'error'); return; }
  var p1el = $('modal-prize-1'), p2el = $('modal-prize-2'), feeEl = $('modal-fee-display'), errEl = $('pay-err');
  if (p1el)  p1el.textContent  = cur + (fee * 16 * 0.7).toFixed(2);
  if (p2el)  p2el.textContent  = cur + (fee * 16 * 0.3).toFixed(2);
  if (feeEl) feeEl.textContent = cur + fee;
  if (errEl) errEl.textContent = '';
  openMo('ucl-pay-mo');
}

function launchPaystack() {
  var fee  = parseFloat((uclSettings && uclSettings.fee) || 0);
  var cur  = (uclSettings && uclSettings.currency) || 'NGN';
  var pk   = (uclSettings && uclSettings.pk) || PAYSTACK_PK || '';
  var acct = (uclSettings && uclSettings.acctEmail) || '';
  var err  = $('pay-err');
  if (!fee)  { if(err) err.textContent = 'Entry fee not configured.'; return; }
  if (!pk)   { if(err) err.textContent = 'Payment gateway not configured.'; return; }
  if (!acct) { if(err) err.textContent = 'Recipient email not configured.'; return; }
  var btn = $('pay-submit-btn');
  if (btn) { btn.textContent = 'Opening payment...'; btn.disabled = true; }
  db.ref(DB.uclPay + '/' + myProfile.uid).set({
    uid: myProfile.uid, username: myProfile.username,
    amount: fee, currency: cur, status: 'pending', createdAt: Date.now()
  }).then(function() {
    var handler = PaystackPop.setup({
      key:      pk,
      email:    myProfile.email || me.email,
      amount:   Math.round(fee * 100),
      currency: cur,
      ref:      'UCL_' + myProfile.uid + '_' + Date.now(),
      metadata: { uid: myProfile.uid, username: myProfile.username },
      callback: function(response) {
        db.ref(DB.uclPay + '/' + myProfile.uid).update({ paystackRef:response.reference, paidAt:Date.now() })
          .then(function() {
            closeMo('ucl-pay-mo');
            toast('Payment submitted! Admin will confirm shortly. 🎉');
            if (btn) { btn.textContent = 'Pay & Lock My Spot'; btn.disabled = false; }
            renderUCL();
          });
      },
      onClose: function() {
        if (btn) { btn.textContent = 'Pay & Lock My Spot'; btn.disabled = false; }
      }
    });
    handler.openIframe();
  }).catch(function(e) {
    if (err) err.textContent = 'Failed to initiate payment: ' + e.message;
    if (btn) { btn.textContent = 'Pay & Lock My Spot'; btn.disabled = false; }
  });
}
