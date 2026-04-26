/**
 * admin.js — Admin Panel
 */
'use strict';

const AdminPanel = (() => {

  function init() {
    const u = App.getUser();
    _qs('#a-topbar-name').textContent = u.name;
    _tabSetup('admin-tabs', 'a-tab-');
    renderAll();
    setInterval(() => { if (App.getUser()?.role === 'admin') renderMonitor(); }, 30000);
  }

  function renderAll() {
    renderMonitor();
    renderPending();
    renderMembers();
    renderReports();
    renderConcerns();
  }

  /* ── Live Monitor ── */
  function renderMonitor() {
    const members = DB.getUsers().filter(u => u.role === 'member' && u.status === 'approved');
    const today   = DB.getAllAttendanceToday();
    const tbody   = _qs('#a-monitor-body');
    tbody.innerHTML = '';

    const inCount = members.filter(u => today[u.id]?.status === 'in').length;
    _qs('#a-in-count').textContent    = inCount;
    _qs('#a-total-count').textContent = members.length;

    if (!members.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No approved members yet.</td></tr>';
      return;
    }

    members.forEach(u => {
      const att     = today[u.id] || { status: 'out', log: [] };
      const firstIn = att.log.find(e => e.type === 'in');
      const lastOut = [...att.log].reverse().find(e => e.type === 'out');
      const pill    = !att.log.length
        ? '<span class="pill none">Not Yet</span>'
        : att.status === 'in'
          ? '<span class="pill in">In</span>'
          : '<span class="pill out">Out</span>';

      const tr = _mk('tr');
      tr.innerHTML = `
        <td><strong>${_esc(u.name)}</strong><br><span class="sub">${_esc(u.clubId || '—')}</span></td>
        <td class="mono">@${_esc(u.username)}</td>
        <td>${pill}</td>
        <td class="mono muted">${firstIn ? firstIn.ts : '—'}</td>
        <td class="mono muted">${lastOut ? lastOut.ts : '—'}</td>`;
      tbody.appendChild(tr);
    });
  }

  /* ── Pending Approvals ── */
  function renderPending() {
    const pending = DB.getUsers().filter(u => u.role === 'member' && u.status === 'pending');
    const list    = _qs('#a-pending-list');
    const badge   = _qs('#a-pending-badge');
    badge.textContent    = pending.length || '';
    badge.style.display  = pending.length ? 'inline-flex' : 'none';
    list.innerHTML       = '';

    if (!pending.length) { list.innerHTML = '<p class="empty-state">No pending registrations.</p>'; return; }

    pending.forEach(u => {
      const card = _mk('div', 'user-card');
      card.innerHTML = `
        <div class="user-info">
          <div class="user-av">${u.name[0].toUpperCase()}</div>
          <div>
            <p class="user-name">${_esc(u.name)}</p>
            <p class="user-meta">@${_esc(u.username)} · Club ID: ${_esc(u.clubId || '—')}</p>
            <p class="user-meta">Registered: ${_fmt(u.createdAt)}</p>
          </div>
        </div>
        <div class="user-actions">
          <button class="btn btn-success btn-sm" data-approve="${u.id}">✓ Approve</button>
          <button class="btn btn-danger btn-sm"  data-reject="${u.id}">✕ Reject</button>
        </div>`;
      list.appendChild(card);
    });

    list.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => {
      DB.approveUser(b.dataset.approve); renderAll();
    }));
    list.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Reject this registration?')) { DB.rejectUser(b.dataset.reject); renderAll(); }
    }));
  }

  /* ── All Members ── */
  function renderMembers() {
    const members = DB.getUsers().filter(u => u.role === 'member');
    const tbody   = _qs('#a-members-body');
    tbody.innerHTML = '';

    if (!members.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No members registered.</td></tr>';
      return;
    }

    members.forEach(u => {
      const statusMap = {
        approved: '<span class="pill in">Approved</span>',
        pending:  '<span class="pill none">Pending</span>',
        rejected: '<span class="pill out">Rejected</span>',
      };
      const tr = _mk('tr');
      tr.innerHTML = `
        <td class="cool-name"><strong>${_esc(u.name)}</strong></td>
        <td class="col-username">@${_esc(u.username)}</td>
        <td class="col-clubid">${_esc(u.clubId || '—')}</td>
        <td>${statusMap[u.status] || ''}</td>
        <td>
          ${u.status !== 'approved' ? `<button class="btn btn-success btn-sm" data-approve="${u.id}">Approve</button>` : ''}
          <button class="btn btn-danger btn-sm" data-del="${u.id}">Remove</button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => { DB.approveUser(b.dataset.approve); renderAll(); }));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Remove this member permanently?')) { DB.deleteUser(b.dataset.del); renderAll(); }
    }));
  }

  /* ── Reports ── */
  function renderReports() {
    const list = _qs('#a-reports-list');
    list.innerHTML = '';
    const items = DB.getReports().reverse();
    if (!items.length) { list.innerHTML = '<p class="empty-state">No reports yet.</p>'; return; }

    items.forEach(r => {
      const card = _mk('div', 'ticket-card');
      card.innerHTML = `
        <div class="ticket-head">
          <div>
            <span class="ticket-title">${_esc(r.title)}</span>
            <span class="ticket-from">from <strong>${_esc(r.userName)}</strong></span>
          </div>
          <span class="ticket-date">${_fmt(r.createdAt)}</span>
        </div>
        <p class="ticket-body">${_esc(r.body)}</p>
        ${r.reply
          ? `<div class="reply-block sent">
               <span class="reply-lbl">Your Reply</span>
               <p>${_esc(r.reply.text)}</p>
               <span class="reply-ts">${_fmt(r.reply.at)}</span>
             </div>`
          : `<div class="reply-form">
               <textarea class="reply-ta" placeholder="Write your reply…" id="rr-${r.id}"></textarea>
               <button class="btn btn-primary btn-sm" data-report-reply="${r.id}">Send Reply</button>
             </div>`}`;
      list.appendChild(card);
    });

    list.querySelectorAll('[data-report-reply]').forEach(b => b.addEventListener('click', () => {
      const text = _qs('#rr-' + b.dataset.reportReply).value.trim();
      if (!text) return;
      const u = App.getUser();
      DB.replyReport(b.dataset.reportReply, { adminId: u.id, adminName: u.name, text });
      renderReports();
    }));
  }

  /* ── Concerns ── */
  function renderConcerns() {
    const list = _qs('#a-concerns-list');
    list.innerHTML = '';
    const items = DB.getConcerns().reverse();
    if (!items.length) { list.innerHTML = '<p class="empty-state">No concerns yet.</p>'; return; }

    items.forEach(c => {
      const card = _mk('div', 'ticket-card');
      card.innerHTML = `
        <div class="ticket-head">
          <div>
            <span class="ticket-title">${_esc(c.subject)}</span>
            <span class="ticket-from">from <strong>${_esc(c.userName)}</strong></span>
          </div>
          <span class="ticket-date">${_fmt(c.createdAt)}</span>
        </div>
        <p class="ticket-body">${_esc(c.message)}</p>
        ${c.reply
          ? `<div class="reply-block sent">
               <span class="reply-lbl">Your Reply</span>
               <p>${_esc(c.reply.text)}</p>
               <span class="reply-ts">${_fmt(c.reply.at)}</span>
             </div>`
          : `<div class="reply-form">
               <textarea class="reply-ta" placeholder="Write your reply…" id="cr-${c.id}"></textarea>
               <button class="btn btn-primary btn-sm" data-concern-reply="${c.id}">Send Reply</button>
             </div>`}`;
      list.appendChild(card);
    });

    list.querySelectorAll('[data-concern-reply]').forEach(b => b.addEventListener('click', () => {
      const text = _qs('#cr-' + b.dataset.concernReply).value.trim();
      if (!text) return;
      const u = App.getUser();
      DB.replyConcern(b.dataset.concernReply, { adminId: u.id, adminName: u.name, text });
      renderConcerns();
    }));
    
    //reply report 
    function replyToReport(id) {
    let message = prompt("Enter your reply:");
    if (!message) return;

    let reports = JSON.parse(localStorage.getItem("reports")) || [];

    let report = reports.find(r => r.id === id);
    if (!report) return;

    report.replies = report.replies || [];

    report.replies.push({
        text: message,
        role: "admin",
        date: new Date().toLocaleString()
    });

    localStorage.setItem("reports", JSON.stringify(reports));

    alert("Reply sent!");
    location.reload();
}

  }

  /* ── Events ── */
  function bindEvents() {
    _qs('#btn-logout-a').addEventListener('click', () => App.logout());
  }

  return { init, bindEvents };

})();
