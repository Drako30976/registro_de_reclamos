const Auth = {
  currentUser: null,

  init() {
    this.currentUser = API.getUser();
    const token = API.getToken();

    const loginModal = document.getElementById('login-modal');
    const appContent = document.getElementById('app-content');

    if (!token || !this.currentUser) {
      if (loginModal) loginModal.classList.remove('hidden');
      if (appContent) appContent.classList.add('hidden');
      this.bindLoginForm();
    } else {
      if (loginModal) loginModal.classList.add('hidden');
      if (appContent) appContent.classList.remove('hidden');
      this.renderUserHeader();
      this.applyRolePermissions();
    }

    const logoutBtn = document.getElementById('btn-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => API.logout());
    }
  },

  bindLoginForm() {
    const form = document.getElementById('login-form');
    const errorEl = document.getElementById('login-error');

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        errorEl.textContent = '';
        errorEl.classList.add('hidden');

        const usuario = document.getElementById('login-usuario').value.trim();
        const contrasena = document.getElementById('login-contrasena').value;

        try {
          const res = await API.post('/auth/login', { usuario, contrasena });
          API.setToken(res.token);
          API.setUser(res.usuario);
          this.currentUser = res.usuario;

          document.getElementById('login-modal').classList.add('hidden');
          document.getElementById('app-content').classList.remove('hidden');

          this.renderUserHeader();
          this.applyRolePermissions();

          if (this.currentUser.rol === 'Espectador') {
            App.switchTab('historial');
          } else {
            App.switchTab('gestion');
          }
        } catch (err) {
          errorEl.textContent = err.message || 'Error al iniciar sesión';
          errorEl.classList.remove('hidden');
        }
      };
    }
  },

  renderUserHeader() {
    const u = this.currentUser;
    if (!u) return;

    const nameEl = document.getElementById('header-user-name');
    const avatarEl = document.getElementById('header-user-avatar');

    if (nameEl) nameEl.textContent = u.nombre_completo;

    if (avatarEl) {
      if (u.foto_perfil) {
        avatarEl.src = u.foto_perfil;
      } else {
        avatarEl.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre_completo)}&background=3B82F6&color=fff`;
      }
    }
  },

  applyRolePermissions() {
    const rol = this.currentUser ? this.currentUser.rol : '';

    const tabGestion = document.querySelector('[data-tab="gestion"]');
    const tabHistorial = document.querySelector('[data-tab="historial"]');
    const tabRegistros = document.querySelector('[data-tab="registros"]');
    const tabEdicion = document.querySelector('[data-tab="edicion"]');
    const tabPerfil = document.querySelector('[data-tab="perfil"]');

    if (tabGestion) {
      tabGestion.style.display = (rol === 'Espectador') ? 'none' : 'inline-flex';
    }

    if (tabHistorial) {
      tabHistorial.style.display = 'inline-flex';
    }

    const btnReportePDF = document.getElementById('btn-emitir-reporte');
    if (btnReportePDF) {
      btnReportePDF.style.display = (rol === 'Espectador') ? 'none' : 'inline-flex';
    }

    if (tabRegistros) {
      tabRegistros.style.display = (rol === 'Admin') ? 'inline-flex' : 'none';
    }

    if (tabEdicion) {
      tabEdicion.style.display = (rol === 'Admin' || rol === 'Supervisor') ? 'inline-flex' : 'none';
    }

    if (tabPerfil) {
      tabPerfil.style.display = 'inline-flex';
    }

    const secAdminUsuarios = document.getElementById('sec-admin-usuarios');
    if (secAdminUsuarios) {
      if (rol === 'Admin' || rol === 'Supervisor') {
        secAdminUsuarios.classList.remove('hidden');
        secAdminUsuarios.style.display = 'block';
      } else {
        secAdminUsuarios.classList.add('hidden');
        secAdminUsuarios.style.display = 'none';
      }
    }
  }
};
