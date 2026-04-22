/**
 * db.js — ClubTrack Data Layer
 * Currently: localStorage
 * PHP migration: replace each function body with fetch() to your API endpoint.
 * Keep function signatures identical — no other file needs to change.
 */
'use strict';

const DB = (() => {

  /* ═══════════════════════════════════════
     STORAGE KEYS
  ═══════════════════════════════════════ */
  const K = {
    USERS:    'ct_users',
    SESSIONS: 'ct_attendance',
    REPORTS:  'ct_reports',
    CONCERNS: 'ct_concerns',
    REPLYLOGS:'ct_replylogs',
  };

  const _r = k        => JSON.parse(localStorage.getItem(k) || 'null');
  const _w = (k, v)   => localStorage.setItem(k, JSON.stringify(v));

  /* ═══════════════════════════════════════
     BOOTSTRAP — seed super admin once
  ═══════════════════════════════════════ */
  function init() {
    if (!_r(K.USERS)) {
      _w(K.USERS, [{
        id:        'sa-0001',
        name:      'Super Administrator',
        username:  'superadmin',
        password:  'super1234',
        role:      'superadmin',   // 'superadmin' | 'admin' | 'member'
        status:    'approved',
        clubId:    'SYS',
        createdAt: _iso(),
      }]);
    }
    if (!_r(K.SESSIONS))  _w(K.SESSIONS,  {});
    if (!_r(K.REPORTS))   _w(K.REPORTS,   []);
    if (!_r(K.CONCERNS))  _w(K.CONCERNS,  []);
    if (!_r(K.REPLYLOGS)) _w(K.REPLYLOGS, []);
  }

  /* ═══════════════════════════════════════
     UTILITIES
  ═══════════════════════════════════════ */
  const _uid  = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const _iso  = () => new Date().toISOString();
  const _today= () => new Date().toISOString().slice(0, 10);
  const _ts   = () => new Date().toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  /* ═══════════════════════════════════════
     USERS
     PHP later: GET /api/users, POST /api/users, PATCH /api/users/:id, DELETE /api/users/:id
  ═══════════════════════════════════════ */
  const getUsers    = ()       => _r(K.USERS) || [];
  const _saveUsers  = users    => _w(K.USERS, users);
  const getUserById = id       => getUsers().find(u => u.id === id) || null;
  const getUserBy   = (f, v)   => getUsers().find(u => u[f] === v) || null;

  function registerUser({ name, username, password, clubId }) {
    const users = getUsers();
    if (users.find(u => u.username === username.toLowerCase()))
      return { ok: false, msg: 'Username already taken.' };

    const user = {
      id: _uid(), name,
      username: username.toLowerCase(),
      password,
      role:   'member',
      status: 'pending',   // pending → approved | rejected
      clubId: clubId || '',
      createdAt: _iso(),
    };
    users.push(user);
    _saveUsers(users);
    return { ok: true, user };
  }

  function login(username, password) {
    const u = getUserBy('username', username.toLowerCase());
    if (!u)                      return { ok: false, msg: 'User not found.' };
    if (u.password !== password) return { ok: false, msg: 'Wrong password.' };
    if (u.status === 'pending')  return { ok: false, msg: 'Account pending admin approval.' };
    if (u.status === 'rejected') return { ok: false, msg: 'Account rejected. Contact the admin.' };
    return { ok: true, user: u };
  }

  function updateUser(id, patch) {
    const users = getUsers();
    const i = users.findIndex(u => u.id === id);
    if (i < 0) return false;
    users[i] = { ...users[i], ...patch };
    _saveUsers(users);
    return true;
  }

  const approveUser  = id => updateUser(id, { status: 'approved' });
  const rejectUser   = id => updateUser(id, { status: 'rejected' });

  function promoteToAdmin(id) {
    return updateUser(id, { role: 'admin', status: 'approved' });
  }

  function demoteToMember(id) {
    return updateUser(id, { role: 'member' });
  }

  function deleteUser(id) {
    _saveUsers(getUsers().filter(u => u.id !== id));
  }

  function createAdmin({ name, username, password }) {
    const users = getUsers();
    if (users.find(u => u.username === username.toLowerCase()))
      return { ok: false, msg: 'Username already exists.' };
    const user = {
      id: _uid(), name,
      username: username.toLowerCase(),
      password,
      role:      'admin',
      status:    'approved',
      clubId:    'ADMIN',
      createdAt: _iso(),
    };
    users.push(user);
    _saveUsers(users);
    return { ok: true, user };
  }

  /* ═══════════════════════════════════════
     ATTENDANCE
     PHP later: GET /api/attendance?date=, POST /api/attendance
  ═══════════════════════════════════════ */
  const _getSessions = () => _r(K.SESSIONS) || {};
  const _saveSessions= s  => _w(K.SESSIONS, s);

  function _getUserDayData(userId, date) {
    const s = _getSessions();
    if (!s[date])         s[date]         = {};
    if (!s[date][userId]) s[date][userId] = { status: 'out', log: [] };
    return { s, data: s[date][userId] };
  }

  function recordAttendance(userId, type) {
    const date = _today();
    const { s, data } = _getUserDayData(userId, date);
    const ts = _ts();
    data.status = type;
    data.log.push({ type, ts, iso: _iso() });
    s[date][userId] = data;
    _saveSessions(s);
    return ts;
  }

  function getUserAttendanceToday(userId) {
    const { data } = _getUserDayData(userId, _today());
    return data;
  }

  function getAllAttendanceToday() {
    const s = _getSessions();
    return s[_today()] || {};
  }

  function getUserAttendanceAll(userId) {
    // Returns { "YYYY-MM-DD": { status, log[] }, … }
    const s = _getSessions();
    const result = {};
    Object.keys(s).sort().reverse().forEach(d => {
      if (s[d][userId]) result[d] = s[d][userId];
    });
    return result;
  }

  function getAllAttendanceFull() {
    return _getSessions();
  }

  /* ═══════════════════════════════════════
     REPORTS
     PHP later: GET /api/reports, POST /api/reports, PATCH /api/reports/:id/reply
  ═══════════════════════════════════════ */
  const getReports   = ()  => _r(K.REPORTS) || [];
  const _saveReports = r   => _w(K.REPORTS, r);

  function submitReport({ userId, userName, title, body }) {
    const reports = getReports();
    const r = { id: _uid(), userId, userName, title, body, reply: null, createdAt: _iso() };
    reports.push(r);
    _saveReports(reports);
    return r;
  }

  function replyReport(reportId, { adminId, adminName, text }) {
    const reports = getReports();
    const i = reports.findIndex(r => r.id === reportId);
    if (i < 0) return false;
    const replyObj = { adminId, adminName, text, at: _iso() };
    reports[i].reply = replyObj;
    _saveReports(reports);
    // log it
    _logReply({ type: 'report', refId: reportId, refTitle: reports[i].title, adminId, adminName, text });
    return true;
  }

  const getUserReports = userId => getReports().filter(r => r.userId === userId);

  /* ═══════════════════════════════════════
     CONCERNS
     PHP later: GET /api/concerns, POST /api/concerns, PATCH /api/concerns/:id/reply
  ═══════════════════════════════════════ */
  const getConcerns   = ()  => _r(K.CONCERNS) || [];
  const _saveConcerns = c   => _w(K.CONCERNS, c);

  function submitConcern({ userId, userName, subject, message }) {
    const concerns = getConcerns();
    const c = { id: _uid(), userId, userName, subject, message, reply: null, createdAt: _iso() };
    concerns.push(c);
    _saveConcerns(concerns);
    return c;
  }

  function replyConcern(concernId, { adminId, adminName, text }) {
    const concerns = getConcerns();
    const i = concerns.findIndex(c => c.id === concernId);
    if (i < 0) return false;
    const replyObj = { adminId, adminName, text, at: _iso() };
    concerns[i].reply = replyObj;
    _saveConcerns(concerns);
    _logReply({ type: 'concern', refId: concernId, refTitle: concerns[i].subject, adminId, adminName, text });
    return true;
  }

  const getUserConcerns = userId => getConcerns().filter(c => c.userId === userId);

  /* ═══════════════════════════════════════
     REPLY LOGS  (for super admin audit trail)
     PHP later: GET /api/replylogs
  ═══════════════════════════════════════ */
  const getReplyLogs   = () => _r(K.REPLYLOGS) || [];
  const _saveReplyLogs = l  => _w(K.REPLYLOGS, l);

  function _logReply({ type, refId, refTitle, adminId, adminName, text }) {
    const logs = getReplyLogs();
    logs.push({ id: _uid(), type, refId, refTitle, adminId, adminName, text, at: _iso() });
    _saveReplyLogs(logs);
  }

  /* ═══════════════════════════════════════
     EXPORT
  ═══════════════════════════════════════ */
  init();

  return {
    // users
    getUsers, getUserById, getUserBy,
    registerUser, login, updateUser,
    approveUser, rejectUser, promoteToAdmin, demoteToMember, deleteUser, createAdmin,
    // attendance
    recordAttendance,
    getUserAttendanceToday, getAllAttendanceToday,
    getUserAttendanceAll,   getAllAttendanceFull,
    today: _today,
    // reports
    getReports, submitReport, replyReport, getUserReports,
    // concerns
    getConcerns, submitConcern, replyConcern, getUserConcerns,
    // super admin
    getReplyLogs,
  };

})();
