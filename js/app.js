const App = {
  currentTab: 'gestion',

  init() {
    this.initTheme();
    Auth.init();
    this.bindNavigation();

    const user = API.getUser();
    if (user) {
      if (user.rol === 'Espectador') {
        this.switchTab('historial');
      } else {
        this.switchTab('gestion');
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
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) {
          this.switchTab(tab);
        }
      });
    });
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
        ReclamosModule.init();
        break;
      case 'historial':
        HistorialModule.init();
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
      case 'perfil':
        PerfilModule.init();
        break;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
