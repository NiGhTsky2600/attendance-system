
'use strict';

const App = (() => {

  let _user = null;

  /* tab-session only (clears on browser close) */
  const _load  = () => { try { return JSON.parse(sessionStorage.getItem('ct_sess')); } catch { return null; } };
  const _save  = u  => sessionStorage.setItem('ct_sess', JSON.stringify(u));
  const _clear = () => sessionStorage.removeItem('ct_sess');

  function showView(id) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + id);
    if (el) el.classList.add('active');
  }

  function login(username, password) {
    const res = DB.login(username, password);
    if (!res.ok) return res;
    _user = res.user;
    _save(_user);
    return res;
  }

  function logout() {
    _user = null;
    _clear();
    showView('login');
  }

  function getUser() { return _user; }

  function boot() {
    const saved = _load();
    if (saved) {
      const fresh = DB.getUserById(saved.id);
      if (fresh && fresh.status === 'approved') {
        _user = fresh;
        _launchPanel(fresh.role);
        return;
      }
    }
    showView('login');
  }

  function _launchPanel(role) {
    if (role === 'superadmin') { SuperAdminPanel.init(); showView('superadmin'); }
    else if (role === 'admin') { AdminPanel.init();      showView('admin'); }
    else                       { MemberPanel.init();     showView('member'); }
  }

  return { login, logout, getUser, showView, boot };

})();
