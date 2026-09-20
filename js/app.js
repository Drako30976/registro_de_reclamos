const App = {
  currentTab: 'gestion',

  init() {
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
      case 'perfil':
        PerfilModule.init();
        break;
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
