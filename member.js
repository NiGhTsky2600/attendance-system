/**
 * member.js — Member Panel
 */
'use strict';

const MemberPanel = (() => {

  function init() {
    const u = App.getUser();
    _qs('#m-hero-name').textContent   = u.name;
    _qs('#m-hero-uname').textContent  = '@' + u.username;
    _qs('#m-hero-clubid').textContent = 'Club ID: ' + (u.clubId || '—');
    _qs('#m-avatar').textContent      = u.name[0].toUpperCase();
    _qs('#m-topbar-name').textContent = u.name;
    _tabSetup('member-tabs', 'm-tab-');
    renderAttendance();
    renderReports();
    renderConcerns();
    renderActivity();

    // Clock
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2,'0');
  const m = String(now.getMinutes()).padStart(2,'0');
  const s = String(now.getSeconds()).padStart(2,'0');
  const el = document.getElementById('m-clock');
  if (el) el.textContent = h + ':' + m + ':' + s;
}
updateClock();
setInterval(updateClock, 1000);

  }

  /* ── Attendance ── */
  function renderAttendance() {
    const u    = App.getUser();
    const data = DB.getUserAttendanceToday(u.id);
    const isIn = data.status === 'in';
    const hasLog = data.log.length > 0;

    _qs('#m-dot').className     = 'status-dot' + (hasLog ? ' ' + data.status : '');
    _qs('#m-status').textContent = hasLog ? (isIn ? 'TIMED IN' : 'TIMED OUT') : 'NOT YET';
    _qs('#m-status').className   = 'status-val ' + (hasLog ? data.status : 'none');

    const last = data.log[data.log.length - 1];
    _qs('#m-last-ts').textContent = last ? (last.type === 'in' ? 'In' : 'Out') + ' at ' + last.ts : '—';

    const btn = _qs('#btn-timein-out');
    btn.textContent = isIn ? '⏹  Time Out' : '▶  Time In';
    btn.className   = 'btn btn-action ' + (isIn ? 'time-out' : 'time-in');

    const log = _qs('#m-att-log');
    if (!data.log.length) { log.innerHTML = '<p class="empty-state">No entries today.</p>'; return; }
    log.innerHTML = '';
    [...data.log].reverse().forEach(e => {
      const row = _mk('div', 'log-row');
      row.innerHTML = `<span class="log-badge ${e.type}">${e.type === 'in' ? 'TIME IN' : 'TIME OUT'}</span><span class="log-ts">${e.ts}</span>`;
      log.appendChild(row);
    });
  }

  /* ── Reports ── */
  function renderReports() {
    const u = App.getUser();
    const list = _qs('#m-reports-list');
    const items = DB.getUserReports(u.id).reverse();
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = '<p class="empty-state">No reports submitted yet.</p>'; return; }
    items.forEach(r => {
      const card = _mk('div', 'ticket-card');
      card.innerHTML = `
        <div class="ticket-head">
          <span class="ticket-title">${_esc(r.title)}</span>
          <span class="ticket-date">${_fmt(r.createdAt)}</span>
        </div>
        <p class="ticket-body">${_esc(r.body)}</p>
        ${r.reply
          ? `<div class="reply-block">
               <span class="reply-lbl">Admin Reply <span class="reply-who">by ${_esc(r.reply.adminName)}</span></span>
               <p>${_esc(r.reply.text)}</p>
               <span class="reply-ts">${_fmt(r.reply.at)}</span>
             </div>`
          : '<p class="awaiting">⏳ Awaiting reply…</p>'}`;
      list.appendChild(card);
    });
  }

  /* ── Concerns ── */
  function renderConcerns() {
    const u = App.getUser();
    const list = _qs('#m-concerns-list');
    const items = DB.getUserConcerns(u.id).reverse();
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = '<p class="empty-state">No concerns submitted yet.</p>'; return; }
    items.forEach(c => {
      const card = _mk('div', 'ticket-card');
      card.innerHTML = `
        <div class="ticket-head">
          <span class="ticket-title">${_esc(c.subject)}</span>
          <span class="ticket-date">${_fmt(c.createdAt)}</span>
        </div>
        <p class="ticket-body">${_esc(c.message)}</p>
        ${c.reply
          ? `<div class="reply-block">
               <span class="reply-lbl">Admin Reply <span class="reply-who">by ${_esc(c.reply.adminName)}</span></span>
               <p>${_esc(c.reply.text)}</p>
               <span class="reply-ts">${_fmt(c.reply.at)}</span>
             </div>`
          : '<p class="awaiting">⏳ Awaiting reply…</p>'}`;
      list.appendChild(card);
    });
  }

  /* ── Activity Log (all days) ── */
  function renderActivity() {
    const u    = App.getUser();
    const all  = DB.getUserAttendanceAll(u.id);
    const list = _qs('#m-activity-list');
    list.innerHTML = '';
    const days = Object.keys(all);
    if (!days.length) { list.innerHTML = '<p class="empty-state">No activity recorded yet.</p>'; return; }
    days.forEach(d => {
      const sec = _mk('div', 'activity-day');
      sec.innerHTML = `<p class="day-label">${d}</p>`;
      all[d].log.forEach(e => {
        const row = _mk('div', 'log-row');
        row.innerHTML = `<span class="log-badge ${e.type}">${e.type === 'in' ? 'TIME IN' : 'TIME OUT'}</span><span class="log-ts">${e.ts}</span>`;
        sec.appendChild(row);
      });
      list.appendChild(sec);
    });
  }

  /* ── Events ── */
  function bindEvents() {
    _qs('#btn-timein-out').addEventListener('click', () => {
      const u    = App.getUser();
      const data = DB.getUserAttendanceToday(u.id);
      DB.recordAttendance(u.id, data.status === 'in' ? 'out' : 'in');
      renderAttendance();
      renderActivity();
    });

    _qs('#btn-logout-m').addEventListener('click', () => App.logout());

    _qs('#btn-submit-report').addEventListener('click', () => {
      const u     = App.getUser();
      const title = _qs('#m-r-title').value.trim();
      const body  = _qs('#m-r-body').value.trim();
      if (!title || !body) { _msg('#m-r-msg', 'Fill in all fields.', 'error'); return; }
      DB.submitReport({ userId: u.id, userName: u.name, title, body });
      _qs('#m-r-title').value = _qs('#m-r-body').value = '';
      _msg('#m-r-msg', '✓ Report submitted!', 'success');
      renderReports();
    });

    _qs('#btn-submit-concern').addEventListener('click', () => {
      const u       = App.getUser();
      const subject = _qs('#m-c-subject').value.trim();
      const message = _qs('#m-c-message').value.trim();
      if (!subject || !message) { _msg('#m-c-msg', 'Fill in all fields.', 'error'); return; }
      DB.submitConcern({ userId: u.id, userName: u.name, subject, message });
      _qs('#m-c-subject').value = _qs('#m-c-message').value = '';
      _msg('#m-c-msg', '✓ Concern submitted!', 'success');
      renderConcerns();
    });
  }

  return { init, bindEvents };

})();
