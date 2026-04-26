/**
 * superadmin.js — Super Admin Panel
 * Sees everything admins see + admin management + full reply audit log
 */
'use strict';

const SuperAdminPanel = (() => {

  function init() {
    const u = App.getUser();
    _qs('#sa-topbar-name').textContent = u.name;
    _tabSetup('sa-tabs', 'sa-tab-');
    renderAll();
    setInterval(() => { if (App.getUser()?.role === 'superadmin') renderMonitor(); }, 30000);
  }

  function renderAll() {
    renderMonitor();
    renderPending();
    renderAllUsers();
    renderAdmins();
    renderReports();
    renderConcerns();
    renderReplyLogs();
  }

  /* ── Live Monitor (all members) ── */
  function renderMonitor() {
    const members = DB.getUsers().filter(u => u.role === 'member' && u.status === 'approved');
    const today   = DB.getAllAttendanceToday();
    const tbody   = _qs('#sa-monitor-body');
    tbody.innerHTML = '';

    const inCount = members.filter(u => today[u.id]?.status === 'in').length;
    _qs('#sa-in-count').textContent    = inCount;
    _qs('#sa-total-count').textContent = members.length;
    _qs('#sa-admin-count').textContent = DB.getUsers().filter(u => u.role === 'admin').length;

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

  /* ── Pending (super admin can also approve) ── */
  function renderPending() {
    const pending = DB.getUsers().filter(u => u.role === 'member' && u.status === 'pending');
    const list    = _qs('#sa-pending-list');
    const badge   = _qs('#sa-pending-badge');
    badge.textContent   = pending.length || '';
    badge.style.display = pending.length ? 'inline-flex' : 'none';
    list.innerHTML      = '';

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

    list.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click', () => { DB.approveUser(b.dataset.approve); renderAll(); }));
    list.querySelectorAll('[data-reject]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Reject this registration?')) { DB.rejectUser(b.dataset.reject); renderAll(); }
    }));
  }

  /* ── All Users (members) ── */
  function renderAllUsers() {
    const members = DB.getUsers().filter(u => u.role === 'member');
    const tbody   = _qs('#sa-members-body');
    tbody.innerHTML = '';

    if (!members.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No members registered.</td></tr>';
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
        <td><strong>${_esc(u.name)}</strong></td>
        <td class="mono">@${_esc(u.username)}</td>
        <td class="mono muted">${_esc(u.clubId || '—')}</td>
        <td>${statusMap[u.status] || ''}</td>
        <td class="muted">${_fmt(u.createdAt)}</td>
        <td>
          ${u.status !== 'approved' ? `<button class="btn btn-success btn-sm" data-approve="${u.id}">Approve</button>` : ''}
          <button class="btn btn-accent btn-sm" data-promote="${u.id}" title="Promote to Admin">→ Admin</button>
          <button class="btn btn-danger btn-sm" data-del="${u.id}">Remove</button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-approve]').forEach(b => b.addEventListener('click',  () => { DB.approveUser(b.dataset.approve); renderAll(); }));
    tbody.querySelectorAll('[data-promote]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Promote to Admin?')) { DB.promoteToAdmin(b.dataset.promote); renderAll(); }
    }));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Delete this member?')) { DB.deleteUser(b.dataset.del); renderAll(); }
    }));
  }

  /* ── Admin Management ── */
  function renderAdmins() {
    const admins = DB.getUsers().filter(u => u.role === 'admin');
    const tbody  = _qs('#sa-admins-body');
    tbody.innerHTML = '';

    if (!admins.length) {
      tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No admins created yet.</td></tr>';
      return;
    }

    admins.forEach(u => {
      const tr = _mk('tr');
      tr.innerHTML = `
        <td><strong>${_esc(u.name)}</strong></td>
        <td class="mono">@${_esc(u.username)}</td>
        <td class="muted">${_fmt(u.createdAt)}</td>
        <td>
          <button class="btn btn-ghost btn-sm" data-demote="${u.id}">Demote to Member</button>
          <button class="btn btn-danger btn-sm" data-del="${u.id}">Remove</button>
        </td>`;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll('[data-demote]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Demote this admin to member?')) { DB.demoteToMember(b.dataset.demote); renderAll(); }
    }));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      if (confirm('Delete this admin permanently?')) { DB.deleteUser(b.dataset.del); renderAll(); }
    }));
  }

  /* ── All Reports (super admin sees all, can also reply) ── */
  function renderReports() {
    const list  = _qs('#sa-reports-list');
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
               <span class="reply-lbl">Reply by <strong>${_esc(r.reply.adminName)}</strong></span>
               <p>${_esc(r.reply.text)}</p>
               <span class="reply-ts">${_fmt(r.reply.at)}</span>
             </div>`
          : `<div class="reply-form">
               <textarea class="reply-ta" placeholder="Write a reply as Super Admin…" id="sa-rr-${r.id}"></textarea>
               <button class="btn btn-primary btn-sm" data-report-reply="${r.id}">Send Reply</button>
             </div>`}`;
      list.appendChild(card);
    });

    list.querySelectorAll('[data-report-reply]').forEach(b => b.addEventListener('click', () => {
      const text = _qs('#sa-rr-' + b.dataset.reportReply).value.trim();
      if (!text) return;
      const u = App.getUser();
      DB.replyReport(b.dataset.reportReply, { adminId: u.id, adminName: u.name + ' (Super Admin)', text });
      renderReports(); renderReplyLogs();
    }));
  }

  /* ── All Concerns ── */
  function renderConcerns() {
    const list  = _qs('#sa-concerns-list');
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
               <span class="reply-lbl">Reply by <strong>${_esc(c.reply.adminName)}</strong></span>
               <p>${_esc(c.reply.text)}</p>
               <span class="reply-ts">${_fmt(c.reply.at)}</span>
             </div>`
          : `<div class="reply-form">
               <textarea class="reply-ta" placeholder="Write a reply as Super Admin…" id="sa-cr-${c.id}"></textarea>
               <button class="btn btn-primary btn-sm" data-concern-reply="${c.id}">Send Reply</button>
             </div>`}`;
      list.appendChild(card);
    });

    list.querySelectorAll('[data-concern-reply]').forEach(b => b.addEventListener('click', () => {
      const text = _qs('#sa-cr-' + b.dataset.concernReply).value.trim();
      if (!text) return;
      const u = App.getUser();
      DB.replyConcern(b.dataset.concernReply, { adminId: u.id, adminName: u.name + ' (Super Admin)', text });
      renderConcerns(); renderReplyLogs();
    }));
  }

  /* ── Reply Audit Log ── */
  function renderReplyLogs() {
    const list  = _qs('#sa-replylogs-list');
    list.innerHTML = '';
    const logs  = DB.getReplyLogs().reverse();
    if (!logs.length) { list.innerHTML = '<p class="empty-state">No replies sent yet.</p>'; return; }

    logs.forEach(l => {
      const row = _mk('div', 'audit-row');
      row.innerHTML = `
        <div class="audit-meta">
          <span class="audit-badge ${l.type}">${l.type.toUpperCase()}</span>
          <span class="audit-who">${_esc(l.adminName)}</span>
          <span class="audit-ref">replying to: "${_esc(l.refTitle)}"</span>
        </div>
        <p class="audit-text">${_esc(l.text)}</p>
        <span class="reply-ts">${_fmt(l.at)}</span>`;
      list.appendChild(row);
    });
  }

  /* ── Events ── */
  function bindEvents() {
    _qs('#btn-logout-sa').addEventListener('click', () => App.logout());

    _qs('#btn-add-admin').addEventListener('click', () => {
      const name  = _qs('#sa-admin-name').value.trim();
      const uname = _qs('#sa-admin-uname').value.trim().toLowerCase();
      const pass  = _qs('#sa-admin-pass').value.trim();
      if (!name || !uname || !pass) { _msg('#sa-admin-msg', 'All fields required.', 'error'); return; }
      if (pass.length < 4)          { _msg('#sa-admin-msg', 'Password min 4 characters.', 'error'); return; }
      const res = DB.createAdmin({ name, username: uname, password: pass });
      if (!res.ok) { _msg('#sa-admin-msg', res.msg, 'error'); return; }
      _qs('#sa-admin-name').value = _qs('#sa-admin-uname').value = _qs('#sa-admin-pass').value = '';
      _msg('#sa-admin-msg', `✓ Admin "${name}" created.`, 'success');
      renderAll();
    });
  }

  return { init, bindEvents };

})();
