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

          App.switchTab('gestion');
          if (this.currentUser.rol === 'Espectador') {
            const subHistRec = document.getElementById('reclamos-subtab-btn-historial');
            if (subHistRec) subHistRec.click();
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
    const roleEl = document.getElementById('header-user-role');
    const avatarEl = document.getElementById('header-user-avatar');

    if (nameEl) nameEl.textContent = u.nombre_completo;
    if (roleEl) roleEl.textContent = `${u.rol} (${u.usuario})`;

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
    const tabRegistros = document.querySelector('[data-tab="registros"]');
    const tabEdicion = document.querySelector('[data-tab="edicion"]');
    const tabTareas = document.querySelector('[data-tab="tareas"]');
    const tabMasivos = document.querySelector('[data-tab="masivos"]');
    const tabAuditorias = document.querySelector('[data-tab="auditorias"]');
    const tabDinamica = document.querySelector('[data-tab="dinamica"]');
    const tabCanales = document.querySelector('[data-tab="canales"]');
    const tabPerfil = document.querySelector('[data-tab="perfil"]');

    if (tabGestion) {
      tabGestion.style.display = 'inline-flex';
    }

    const formCols = document.querySelectorAll('.gestion-col-form');
    formCols.forEach(col => {
      col.style.display = (rol === 'Espectador') ? 'none' : 'block';
    });

    const btnReportePDF = document.getElementById('btn-emitir-reporte');
    if (btnReportePDF) {
      btnReportePDF.style.display = (rol === 'Espectador') ? 'none' : 'inline-flex';
    }

    const btnReporteLlamadasPDF = document.getElementById('btn-emitir-reporte-llamadas');
    if (btnReporteLlamadasPDF) {
      btnReporteLlamadasPDF.style.display = (rol === 'Espectador') ? 'none' : 'inline-flex';
    }

    if (tabRegistros) {
      tabRegistros.style.display = (rol === 'Admin') ? 'inline-flex' : 'none';
    }

    if (tabEdicion) {
      tabEdicion.style.display = (rol === 'Admin' || rol === 'Supervisor') ? 'inline-flex' : 'none';
    }

    if (tabTareas) {
      tabTareas.style.display = (rol === 'Admin' || rol === 'Supervisor') ? 'inline-flex' : 'none';
    }

    if (tabMasivos) {
      tabMasivos.style.display = (rol === 'Admin' || rol === 'Supervisor' || rol === 'Asesor') ? 'inline-flex' : 'none';
    }

    if (tabAuditorias) {
      tabAuditorias.style.display = (rol === 'Admin' || rol === 'Supervisor') ? 'inline-flex' : 'none';
    }

    if (tabDinamica) {
      tabDinamica.style.display = (rol === 'Admin' || rol === 'Supervisor') ? 'inline-flex' : 'none';
    }

    if (tabCanales) {
      tabCanales.style.display = 'inline-flex';
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
