// Módulo de Gestión de Reclamos (Carga principal con cascada dinámica)
const ReclamosModule = {
  arbolEstructura: [],
  sucursales: [],

  async init() {
    this.setupFormDefaults();
    await this.loadCatalogos();
    this.bindEvents();
  },

  setupFormDefaults() {
    // Fecha automática
    const fechaInput = document.getElementById('reclamo-fecha');
    if (fechaInput) {
      const now = new Date();
      // Formato YYYY-MM-DD para input date
      const fechaLocal = now.toLocaleDateString('en-CA');
      fechaInput.value = fechaLocal;
    }

    // Asesor automático (nombre del usuario en sesión)
    const asesorInput = document.getElementById('reclamo-asesor');
    const user = API.getUser();
    if (asesorInput && user) {
      asesorInput.value = user.nombre_completo;
    }
  },

  async loadCatalogos() {
    try {
      const [sucursales, arbol] = await Promise.all([
        API.get('/catalogos/sucursales'),
        API.get('/catalogos/estructura')
      ]);

      this.sucursales = sucursales;
      this.arbolEstructura = arbol;

      this.populateSucursales();
      this.populateTipos();
    } catch (error) {
      console.error('Error al cargar catálogos de reclamos:', error);
    }
  },

  populateSucursales() {
    const select = document.getElementById('reclamo-sucursal');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione Sucursal --</option>';
    this.sucursales.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.nombre;
      select.appendChild(opt);
    });
  },

  populateTipos() {
    const select = document.getElementById('reclamo-tipo');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione Tipo de Consulta --</option>';
    this.arbolEstructura.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.contenido;
      select.appendChild(opt);
    });

    // Resetear niveles inferiores
    this.resetSelect('reclamo-caracteristica', '-- Seleccione Característica --', true);
    this.resetSelect('reclamo-definicion', '-- Seleccione Definición (Opcional) --', true);
    this.resetSelect('reclamo-finalizacion', '-- Seleccione Finalización (Opcional) --', true);
  },

  resetSelect(elementId, placeholder, disabled = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>`;
    el.disabled = disabled;
  },

  bindEvents() {
    const tipoSelect = document.getElementById('reclamo-tipo');
    const carSelect = document.getElementById('reclamo-caracteristica');
    const defSelect = document.getElementById('reclamo-definicion');
    const form = document.getElementById('form-gestion-reclamo');

    // Cascada: Al cambiar Tipo -> Cargar Características
    if (tipoSelect) {
      tipoSelect.onchange = () => {
        const tipoId = parseInt(tipoSelect.value, 10);
        this.resetSelect('reclamo-caracteristica', '-- Seleccione Característica --', true);
        this.resetSelect('reclamo-definicion', '-- Seleccione Definición (Opcional) --', true);
        this.resetSelect('reclamo-finalizacion', '-- Seleccione Finalización (Opcional) --', true);

        if (!tipoId) return;

        const tipoObj = this.arbolEstructura.find(t => t.id === tipoId);
        if (tipoObj && tipoObj.caracteristicas && tipoObj.caracteristicas.length > 0) {
          carSelect.disabled = false;
          tipoObj.caracteristicas.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.contenido;
            carSelect.appendChild(opt);
          });
        }
      };
    }

    // Cascada: Al cambiar Característica -> Cargar Definiciones
    if (carSelect) {
      carSelect.onchange = () => {
        const tipoId = parseInt(tipoSelect.value, 10);
        const carId = parseInt(carSelect.value, 10);

        this.resetSelect('reclamo-definicion', '-- Seleccione Definición (Opcional) --', true);
        this.resetSelect('reclamo-finalizacion', '-- Seleccione Finalización (Opcional) --', true);

        if (!carId) return;

        const tipoObj = this.arbolEstructura.find(t => t.id === tipoId);
        const carObj = tipoObj ? tipoObj.caracteristicas.find(c => c.id === carId) : null;

        if (carObj && carObj.definiciones && carObj.definiciones.length > 0) {
          defSelect.disabled = false;
          carObj.definiciones.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = d.contenido;
            defSelect.appendChild(opt);
          });
        }
      };
    }

    // Cascada: Al cambiar Definición -> Cargar Finalizaciones
    if (defSelect) {
      defSelect.onchange = () => {
        const tipoId = parseInt(tipoSelect.value, 10);
        const carId = parseInt(carSelect.value, 10);
        const defId = parseInt(defSelect.value, 10);
        const finSelect = document.getElementById('reclamo-finalizacion');

        this.resetSelect('reclamo-finalizacion', '-- Seleccione Finalización (Opcional) --', true);

        if (!defId) return;

        const tipoObj = this.arbolEstructura.find(t => t.id === tipoId);
        const carObj = tipoObj ? tipoObj.caracteristicas.find(c => c.id === carId) : null;
        const defObj = carObj ? carObj.definiciones.find(d => d.id === defId) : null;

        if (defObj && defObj.finalizaciones && defObj.finalizaciones.length > 0) {
          finSelect.disabled = false;
          defObj.finalizaciones.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = f.contenido;
            finSelect.appendChild(opt);
          });
        }
      };
    }

    // Envío del formulario
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('reclamo-form-alert');
        alertEl.textContent = '';
        alertEl.className = 'form-alert hidden';

        const sucursal_id = document.getElementById('reclamo-sucursal').value;
        const numero_cliente = document.getElementById('reclamo-cliente').value.trim();
        const tipo_consulta_id = document.getElementById('reclamo-tipo').value;
        const caracteristica_id = document.getElementById('reclamo-caracteristica').value;
        const definicion_id = document.getElementById('reclamo-definicion').value || null;
        const finalizacion_id = document.getElementById('reclamo-finalizacion').value || null;

        if (!sucursal_id || !numero_cliente || !tipo_consulta_id || !caracteristica_id) {
          alertEl.textContent = 'Por favor complete todos los campos obligatorios (*)';
          alertEl.className = 'form-alert error';
          return;
        }

        if (numero_cliente.length > 15) {
          alertEl.textContent = 'El número de cliente no puede superar 15 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        try {
          const btnSubmit = form.querySelector('button[type="submit"]');
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Guardando...';

          await API.post('/reclamos', {
            sucursal_id: parseInt(sucursal_id, 10),
            numero_cliente,
            tipo_consulta_id: parseInt(tipo_consulta_id, 10),
            caracteristica_id: parseInt(caracteristica_id, 10),
            definicion_id: definicion_id ? parseInt(definicion_id, 10) : null,
            finalizacion_id: finalizacion_id ? parseInt(finalizacion_id, 10) : null
          });

          alertEl.textContent = `¡Reclamo del abonado ${numero_cliente} guardado con éxito!`;
          alertEl.className = 'form-alert success';

          // Limpiar campos excepto fecha y asesor
          document.getElementById('reclamo-cliente').value = '';
          this.populateTipos();
          document.getElementById('reclamo-sucursal').value = '';

          setTimeout(() => {
            alertEl.className = 'form-alert hidden';
          }, 4000);
        } catch (err) {
          alertEl.textContent = err.message || 'Error al guardar el reclamo.';
          alertEl.className = 'form-alert error';
        } finally {
          const btnSubmit = form.querySelector('button[type="submit"]');
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Guardar Reclamo';
        }
      };
    }
  }
};
