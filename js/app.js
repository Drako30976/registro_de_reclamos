const App = {
  currentTab: 'gestion',

  init() {
    this.initTheme();
    Auth.init();
    this.bindNavigation();

    const user = API.getUser();
    if (user) {
      this.switchTab('gestion');
      if (user.rol === 'Espectador') {
        const subHistRec = document.getElementById('reclamos-subtab-btn-historial');
        if (subHistRec) subHistRec.click();
      }
      if (typeof MensajesModule !== 'undefined') {
        MensajesModule.actualizarBadge();
        MensajesModule.iniciarPolling();
      }
      if (typeof ChatsModule !== 'undefined') {
        ChatsModule.init();
      }
    }
  },

  initTheme() {
    const savedTheme = localStorage.getItem('reclamos_theme') || 'light';
    this.setTheme(savedTheme);

    const toggleMain = document.getElementById('btn-theme-toggle');
    if (toggleMain) {
      toggleMain.addEventListener('click', () => this.toggleTheme());
    }

    const toggleLogin = document.getElementById('btn-theme-toggle-login');
    if (toggleLogin) {
      toggleLogin.addEventListener('click', () => this.toggleTheme());
    }
  },

  toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    this.setTheme(isDark ? 'light' : 'dark');
  },

  setTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('reclamos_theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('reclamos_theme', 'light');
    }

    const icons = document.querySelectorAll('.theme-toggle-icon');
    icons.forEach(icon => {
      icon.textContent = theme === 'dark' ? '☀️' : '🌙';
    });

    const themeLabel = document.getElementById('theme-toggle-label');
    if (themeLabel) {
      themeLabel.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
    }

    const toggles = [
      document.getElementById('btn-theme-toggle'),
      document.getElementById('btn-theme-toggle-login')
    ];
    toggles.forEach(btn => {
      if (btn) {
        btn.setAttribute('title', theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro');
      }
    });
  },

  bindNavigation() {
    this.bindZeusMenu();

    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
          this.closeZeusMenu();
        }
      });
    });

    this.bindAtencionSubtabs();
  },

  bindZeusMenu() {
    const btnMenu = document.getElementById('btn-zeus-menu');
    const dropdown = document.getElementById('zeus-dropdown');
    if (!btnMenu || !dropdown) return;

    btnMenu.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdown.classList.contains('hidden');
      if (isHidden) {
        dropdown.classList.remove('hidden');
        btnMenu.setAttribute('aria-expanded', 'true');
      } else {
        dropdown.classList.add('hidden');
        btnMenu.setAttribute('aria-expanded', 'false');
      }
    });

    dropdown.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', () => {
      this.closeZeusMenu();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeZeusMenu();
      }
    });
  },

  closeZeusMenu() {
    const btnMenu = document.getElementById('btn-zeus-menu');
    const dropdown = document.getElementById('zeus-dropdown');
    if (dropdown && !dropdown.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
      if (btnMenu) btnMenu.setAttribute('aria-expanded', 'false');
    }
  },

  bindAtencionSubtabs() {
    const btnReclamos = document.getElementById('atencion-tab-btn-reclamos');
    const btnLlamadas = document.getElementById('atencion-tab-btn-llamadas');
    const secReclamos = document.getElementById('atencion-sec-reclamos');
    const secLlamadas = document.getElementById('atencion-sec-llamadas');

    const subNuevoRec = document.getElementById('reclamos-subtab-btn-nuevo');
    const subHistRec = document.getElementById('reclamos-subtab-btn-historial');
    const secNuevoRec = document.getElementById('reclamos-sec-nuevo');
    const secHistRec = document.getElementById('reclamos-sec-historial');

    const subNuevaLlam = document.getElementById('llamadas-subtab-btn-nueva');
    const subHistLlam = document.getElementById('llamadas-subtab-btn-historial');
    const secNuevaLlam = document.getElementById('llamadas-sec-nueva');
    const secHistLlam = document.getElementById('llamadas-sec-historial');

    if (btnReclamos && btnLlamadas) {
      btnReclamos.addEventListener('click', () => {
        btnReclamos.classList.add('active');
        btnLlamadas.classList.remove('active');
        if (secReclamos) secReclamos.classList.remove('hidden');
        if (secLlamadas) secLlamadas.classList.add('hidden');
        if (typeof ReclamosModule !== 'undefined') ReclamosModule.init();
      });

      btnLlamadas.addEventListener('click', () => {
        btnLlamadas.classList.add('active');
        btnReclamos.classList.remove('active');
        if (secLlamadas) secLlamadas.classList.remove('hidden');
        if (secReclamos) secReclamos.classList.add('hidden');
        if (typeof LlamadasModule !== 'undefined') LlamadasModule.init();
      });
    }

    if (subNuevoRec && subHistRec) {
      subNuevoRec.addEventListener('click', () => {
        subNuevoRec.classList.add('active');
        subHistRec.classList.remove('active');
        if (secNuevoRec) secNuevoRec.classList.remove('hidden');
        if (secHistRec) secHistRec.classList.add('hidden');
        if (typeof ReclamosModule !== 'undefined') ReclamosModule.init();
      });

      subHistRec.addEventListener('click', () => {
        subHistRec.classList.add('active');
        subNuevoRec.classList.remove('active');
        if (secHistRec) secHistRec.classList.remove('hidden');
        if (secNuevoRec) secNuevoRec.classList.add('hidden');
        if (typeof HistorialModule !== 'undefined') HistorialModule.init();
      });
    }

    if (subNuevaLlam && subHistLlam) {
      subNuevaLlam.addEventListener('click', () => {
        subNuevaLlam.classList.add('active');
        subHistLlam.classList.remove('active');
        if (secNuevaLlam) secNuevaLlam.classList.remove('hidden');
        if (secHistLlam) secHistLlam.classList.add('hidden');
        if (typeof LlamadasModule !== 'undefined') LlamadasModule.init();
      });

      subHistLlam.addEventListener('click', () => {
        subHistLlam.classList.add('active');
        subNuevaLlam.classList.remove('active');
        if (secHistLlam) secHistLlam.classList.remove('hidden');
        if (secNuevaLlam) secNuevaLlam.classList.add('hidden');
        if (typeof LlamadasHistorialModule !== 'undefined') LlamadasHistorialModule.init();
      });
    }
  },

  switchTab(tabName) {
    this.currentTab = tabName;

    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const views = document.querySelectorAll('.tab-view');
    views.forEach(v => v.classList.add('hidden'));

    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) {
      activeView.classList.remove('hidden');
    }

    switch (tabName) {
      case 'gestion':
        if (typeof ReclamosModule !== 'undefined') ReclamosModule.init();
        if (typeof HistorialModule !== 'undefined') HistorialModule.init();
        if (typeof LlamadasModule !== 'undefined') LlamadasModule.init();
        if (typeof LlamadasHistorialModule !== 'undefined') LlamadasHistorialModule.init();
        break;
      case 'registros':
        RegistrosModule.init();
        break;
      case 'edicion':
        EdicionModule.init();
        break;
      case 'tareas':
        TareasModule.init();
        break;
      case 'masivos':
        MasivosModule.init();
        break;
      case 'auditorias':
        AuditoriasModule.init();
        break;
      case 'dinamica':
        if (typeof DinamicaModule !== 'undefined') DinamicaModule.init();
        break;
      case 'canales':
        if (typeof CanalesModule !== 'undefined') CanalesModule.init();
        break;
      case 'mensajes':
        if (typeof MensajesModule !== 'undefined') MensajesModule.init();
        break;
      case 'perfil':
        PerfilModule.init();
        break;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
