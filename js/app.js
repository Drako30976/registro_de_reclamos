// Coordinador Principal de la Aplicación (Tab Switcher y Ciclo de Vida)
const App = {
  currentTab: 'gestion',

  init() {
    Auth.init();
    this.bindNavigation();

    // Iniciar con la pestaña correspondiente
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

    // Actualizar botones de la barra de navegación
    const navButtons = document.querySelectorAll('.nav-tab-btn');
    navButtons.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Ocultar todas las vistas
    const views = document.querySelectorAll('.tab-view');
    views.forEach(v => v.classList.add('hidden'));

    // Mostrar la vista activa
    const activeView = document.getElementById(`view-${tabName}`);
    if (activeView) {
      activeView.classList.remove('hidden');
    }

    // Inicializar o refrescar el módulo correspondiente
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
      case 'perfil':
        PerfilModule.init();
        break;
    }
  }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
