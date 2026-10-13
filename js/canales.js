const CanalesModule = {
  estructura: [],
  sucursalActual: null,
  grillaActual: null,
  canalesActuales: [],
  logosDisponibles: [],
  edicionTab: 'sucursales',

  async init() {
    this.bindEvents();
    await this.cargarLogos();
    await this.cargarEstructura();
  },

  bindEvents() {
    const searchInput = document.getElementById('canales-busqueda');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filtrarCanales(e.target.value);
      });
    }

    const btnCapturar = document.getElementById('btn-capturar-grilla-canales');
    if (btnCapturar) {
      btnCapturar.addEventListener('click', () => {
        this.capturarGrillaComoImagen();
      });
    }

    const btnAbrirEdicion = document.getElementById('btn-canales-abrir-edicion');
    if (btnAbrirEdicion) {
      btnAbrirEdicion.addEventListener('click', () => {
        this.abrirModalEdicion();
      });
    }

    const formSucursal = document.getElementById('form-canal-sucursal');
    if (formSucursal) {
      formSucursal.addEventListener('submit', (e) => this.guardarSucursal(e));
    }

    const formGrilla = document.getElementById('form-canal-grilla');
    if (formGrilla) {
      formGrilla.addEventListener('submit', (e) => this.guardarGrilla(e));
    }

    const formCanal = document.getElementById('form-canal-item');
    if (formCanal) {
      formCanal.addEventListener('submit', (e) => this.guardarCanal(e));
    }

    const selFiltroSucGrillas = document.getElementById('edicion-grillas-filtro-sucursal');
    if (selFiltroSucGrillas) {
      selFiltroSucGrillas.addEventListener('change', () => this.renderTablaGrillas());
    }

    const selFiltroSucCanales = document.getElementById('edicion-canales-filtro-sucursal');
    if (selFiltroSucCanales) {
      selFiltroSucCanales.addEventListener('change', () => {
        this.actualizarGrillasFiltroCanales();
        this.renderTablaCanales();
      });
    }

    const selFiltroGrillaCanales = document.getElementById('edicion-canales-filtro-grilla');
    if (selFiltroGrillaCanales) {
      selFiltroGrillaCanales.addEventListener('change', () => this.renderTablaCanales());
    }

    const fileInputLogo = document.getElementById('canal-logo-file');
    if (fileInputLogo) {
      fileInputLogo.addEventListener('change', (e) => this.subirLogo(e));
    }

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.canales-nav-menu')) {
        document.querySelectorAll('.canales-submenu-grillas').forEach(m => m.style.display = 'none');
        document.querySelectorAll('.btn-canales-sucursal').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.canales-nav-item').forEach(item => item.classList.remove('active'));
        if (this.sucursalActual) {
          const btnActive = document.getElementById(`btn-suc-${this.sucursalActual.id}`);
          if (btnActive) btnActive.classList.add('active');
        }
      }
    });
  },

  async cargarLogos() {
    try {
      const logos = await API.get('/canales/logos');
      this.logosDisponibles = logos || [];
    } catch (err) {
      this.logosDisponibles = [];
    }
  },

  async cargarEstructura(mantenerSeleccion = false) {
    try {
      const data = await API.get('/canales');
      this.estructura = data || [];
      this.renderNavbar();

      if (this.estructura.length > 0) {
        if (mantenerSeleccion && this.sucursalActual && this.grillaActual) {
          const sucFound = this.estructura.find(s => s.id === this.sucursalActual.id);
          if (sucFound) {
            const grillaFound = (sucFound.grillas || []).find(g => g.id === this.grillaActual.id);
            if (grillaFound) {
              await this.seleccionarGrilla(sucFound.id, grillaFound.id);
              return;
            }
          }
        }

        const primeraSuc = this.estructura[0];
        if (primeraSuc && primeraSuc.grillas && primeraSuc.grillas.length > 0) {
          await this.seleccionarGrilla(primeraSuc.id, primeraSuc.grillas[0].id);
        }
      } else {
        const estInicial = document.getElementById('canales-estado-inicial');
        const detalle = document.getElementById('canales-detalle-sucursal');
        if (estInicial) estInicial.style.display = 'block';
        if (detalle) detalle.style.display = 'none';
      }
    } catch (err) {
      console.error('Error al cargar grilla de canales:', err);
    }
  },

  renderNavbar() {
    const navbar = document.getElementById('canales-nav-menu');
    if (!navbar) return;

    navbar.innerHTML = '';

    this.estructura.forEach(sucursal => {
      const li = document.createElement('li');
      li.className = 'canales-nav-item';

      const btnSucursal = document.createElement('button');
      btnSucursal.type = 'button';
      btnSucursal.id = `btn-suc-${sucursal.id}`;
      btnSucursal.className = 'btn-canales-sucursal';
      btnSucursal.innerHTML = `<span style="font-size: 0.8rem;">🏢</span> <span>${sucursal.nombre}</span> <span style="font-size: 0.6rem;">▾</span>`;

      const subMenu = document.createElement('div');
      subMenu.className = 'canales-submenu-grillas';
      subMenu.style.display = 'none';

      const grillas = sucursal.grillas || [];
      if (grillas.length === 0) {
        const emptySpan = document.createElement('span');
        emptySpan.style.fontSize = '0.75rem';
        emptySpan.style.color = 'var(--text-muted)';
        emptySpan.style.padding = '0.4rem';
        emptySpan.textContent = 'Sin grillas configuradas';
        subMenu.appendChild(emptySpan);
      } else {
        grillas.forEach(grilla => {
          const btnGrilla = document.createElement('button');
          btnGrilla.type = 'button';
          btnGrilla.className = `btn-canales-grilla btn-grilla-${grilla.tipo}`;
          btnGrilla.innerHTML = `<span style="font-size: 0.72rem;">📺</span> ${grilla.nombre}`;

          btnGrilla.addEventListener('click', (e) => {
            e.stopPropagation();
            subMenu.style.display = 'none';
            li.classList.remove('active');
            this.seleccionarGrilla(sucursal.id, grilla.id);
          });

          subMenu.appendChild(btnGrilla);
        });
      }

      btnSucursal.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.canales-submenu-grillas').forEach(menu => {
          if (menu !== subMenu) menu.style.display = 'none';
        });
        document.querySelectorAll('.btn-canales-sucursal').forEach(btn => {
          if (btn !== btnSucursal) btn.classList.remove('active');
        });
        document.querySelectorAll('.canales-nav-item').forEach(item => {
          if (item !== li) item.classList.remove('active');
        });

        const isVisible = subMenu.style.display === 'block';
        subMenu.style.display = isVisible ? 'none' : 'block';
        btnSucursal.classList.toggle('active', !isVisible);
        li.classList.toggle('active', !isVisible);
      });

      li.appendChild(btnSucursal);
      li.appendChild(subMenu);
      navbar.appendChild(li);
    });

    if (this.sucursalActual) {
      const activeBtn = document.getElementById(`btn-suc-${this.sucursalActual.id}`);
      if (activeBtn) activeBtn.classList.add('active');
    }
  },

  async seleccionarGrilla(sucursalId, grillaId) {
    try {
      const data = await API.get(`/canales/grilla/${grillaId}`);
      if (!data) return;

      this.grillaActual = data.grilla;
      this.canalesActuales = data.canales || [];
      this.sucursalActual = this.estructura.find(s => s.id === sucursalId) || {
        id: sucursalId,
        nombre: data.grilla.sucursal_nombre,
        localidad: data.grilla.localidad,
        provincia: data.grilla.provincia,
        codigo: data.grilla.sucursal_codigo
      };

      document.querySelectorAll('.btn-canales-sucursal').forEach(b => b.classList.remove('active'));
      const btnSuc = document.getElementById(`btn-suc-${sucursalId}`);
      if (btnSuc) btnSuc.classList.add('active');

      document.querySelectorAll('.btn-canales-grilla').forEach(b => b.classList.remove('active'));
      const activeGrillaBtn = document.querySelector(`#btn-suc-${sucursalId} ~ .canales-submenu-grillas .btn-grilla-${this.grillaActual.tipo}`);
      if (activeGrillaBtn) activeGrillaBtn.classList.add('active');

      this.renderDetalleGrilla();
    } catch (err) {
      console.error('Error al seleccionar grilla:', err);
    }
  },

  renderDetalleGrilla() {
    const estadoInicial = document.getElementById('canales-estado-inicial');
    const detalleSucursal = document.getElementById('canales-detalle-sucursal');
    const sucursalTitulo = document.getElementById('canales-titulo-header');
    const sucursalSubtitulo = document.getElementById('canales-subtitulo-header');

    if (estadoInicial) estadoInicial.style.display = 'none';
    if (detalleSucursal) detalleSucursal.style.display = 'block';

    const locInfo = [this.sucursalActual.localidad, this.sucursalActual.provincia].filter(Boolean).join(', ');

    if (sucursalTitulo) {
      sucursalTitulo.textContent = `${this.sucursalActual.nombre} — Grilla ${this.grillaActual.nombre}`;
    }

    if (sucursalSubtitulo) {
      sucursalSubtitulo.innerHTML = `📍 ${locInfo || 'Argentina'} &bull; 📺 <span class="badge badge-info">${this.canalesActuales.length} canales disponibles</span>`;
    }

    const searchInput = document.getElementById('canales-busqueda');
    if (searchInput) searchInput.value = '';

    this.renderCanalesGrid(this.canalesActuales);
  },

  renderCanalesGrid(canales) {
    const grid = document.getElementById('grilla-canales-cards');
    if (!grid) return;

    grid.innerHTML = '';

    if (!canales || canales.length === 0) {
      grid.innerHTML = `
        <div class="canales-empty-box" style="grid-column: 1 / -1;">
          <p>📺 No se encontraron canales cargados en esta grilla.</p>
        </div>
      `;
      return;
    }

    canales.forEach(canal => {
      const card = document.createElement('div');
      card.className = 'tarjeta-canal';

      const numEl = document.createElement('span');
      numEl.className = 'canal-numero';
      numEl.textContent = canal.numero;

      const logoImg = document.createElement('img');
      logoImg.className = 'canal-logo';
      logoImg.alt = canal.nombre;
      logoImg.loading = 'lazy';

      let logoSrc = canal.logo || '';
      if (logoSrc) {
        if (!logoSrc.startsWith('http') && !logoSrc.startsWith('/')) {
          logoSrc = `/${logoSrc}`;
        }
        logoImg.src = logoSrc;
      } else {
        logoImg.src = '/assets/canales/sinseñal.jpg';
      }

      logoImg.onerror = function() {
        this.onerror = null;
        this.src = '/assets/canales/sinseñal.jpg';
      };

      const nombreEl = document.createElement('span');
      nombreEl.className = 'canal-nombre';
      nombreEl.title = canal.nombre;
      nombreEl.textContent = canal.nombre;

      card.appendChild(numEl);
      card.appendChild(logoImg);
      card.appendChild(nombreEl);

      if (canal.categoria) {
        const catEl = document.createElement('span');
        catEl.className = 'canal-categoria-tag';
        catEl.textContent = canal.categoria;
        card.appendChild(catEl);
      }

      grid.appendChild(card);
    });
  },

  filtrarCanales(query) {
    if (!query || !query.trim()) {
      this.renderCanalesGrid(this.canalesActuales);
      return;
    }

    const q = query.toLowerCase().trim();
    const filtrados = this.canalesActuales.filter(c => {
      const numMatch = String(c.numero).includes(q);
      const nomMatch = c.nombre.toLowerCase().includes(q);
      const catMatch = c.categoria && c.categoria.toLowerCase().includes(q);
      return numMatch || nomMatch || catMatch;
    });

    this.renderCanalesGrid(filtrados);
  },

  async capturarGrillaComoImagen() {
    if (typeof html2canvas === 'undefined') {
      alert('La biblioteca de captura no se encuentra disponible. Por favor descargue la imagen oficial.');
      return;
    }

    const contenedor = document.getElementById('canales-contenedor-captura');
    if (!contenedor) return;

    const btn = document.getElementById('btn-capturar-grilla-canales');
    const textoOriginal = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span>⏳</span> Generando imagen...';
    }

    try {
      const canvas = await html2canvas(contenedor, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });

      const enlace = document.createElement('a');
      const nombreArchivo = `Grilla_${(this.sucursalActual && this.sucursalActual.nombre) || 'Canales'}_${(this.grillaActual && this.grillaActual.nombre) || 'Completa'}.png`.replace(/\s+/g, '_');
      enlace.download = nombreArchivo;
      enlace.href = canvas.toDataURL('image/png');
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
    } catch (err) {
      console.error('Error al capturar grilla:', err);
      alert('Ocurrió un error al generar la imagen de la grilla.');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = textoOriginal;
      }
    }
  },

  abrirModalEdicion(tab = 'sucursales') {
    const modal = document.getElementById('modal-canales-edicion');
    if (!modal) return;
    modal.classList.remove('hidden');
    this.cambiarTabEdicion(tab);
  },

  cerrarModalEdicion() {
    const modal = document.getElementById('modal-canales-edicion');
    if (modal) modal.classList.add('hidden');
  },

  cambiarTabEdicion(tab) {
    this.edicionTab = tab;
    document.querySelectorAll('.canales-edicion-tab-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });

    const secSuc = document.getElementById('canales-edicion-sec-sucursales');
    const secGri = document.getElementById('canales-edicion-sec-grillas');
    const secCan = document.getElementById('canales-edicion-sec-canales');

    if (secSuc) secSuc.classList.toggle('hidden', tab !== 'sucursales');
    if (secGri) secGri.classList.toggle('hidden', tab !== 'grillas');
    if (secCan) secCan.classList.toggle('hidden', tab !== 'canales');

    if (tab === 'sucursales') this.renderTablaSucursales();
    if (tab === 'grillas') {
      this.poblarSucursalesSelect('edicion-grillas-filtro-sucursal');
      this.poblarSucursalesSelect('canal-grilla-sucursal-id');
      this.renderTablaGrillas();
    }
    if (tab === 'canales') {
      this.poblarSucursalesSelect('edicion-canales-filtro-sucursal');
      this.actualizarGrillasFiltroCanales();
      this.renderTablaCanales();
      this.poblarSelectorLogos();
    }
  },

  poblarSucursalesSelect(selectId) {
    const sel = document.getElementById(selectId);
    if (!sel) return;
    const prevVal = sel.value;
    sel.innerHTML = '';

    if (selectId.includes('filtro')) {
      const optTodas = document.createElement('option');
      optTodas.value = '';
      optTodas.textContent = 'Todas las sucursales';
      sel.appendChild(optTodas);
    }

    this.estructura.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = `${s.nombre} (${s.localidad || 'S/L'})`;
      sel.appendChild(opt);
    });

    if (prevVal && sel.querySelector(`option[value="${prevVal}"]`)) {
      sel.value = prevVal;
    } else if (this.sucursalActual && sel.querySelector(`option[value="${this.sucursalActual.id}"]`)) {
      sel.value = this.sucursalActual.id;
    }
  },

  actualizarGrillasFiltroCanales() {
    const selSuc = document.getElementById('edicion-canales-filtro-sucursal');
    const selGri = document.getElementById('edicion-canales-filtro-grilla');
    const selGriForm = document.getElementById('canal-item-grilla-id');
    if (!selGri) return;

    const sucId = selSuc ? parseInt(selSuc.value, 10) : null;
    selGri.innerHTML = '';
    if (selGriForm) selGriForm.innerHTML = '';

    const optTodas = document.createElement('option');
    optTodas.value = '';
    optTodas.textContent = 'Todas las grillas';
    selGri.appendChild(optTodas);

    const sucursalesFiltrar = sucId ? this.estructura.filter(s => s.id === sucId) : this.estructura;

    sucursalesFiltrar.forEach(s => {
      (s.grillas || []).forEach(g => {
        const opt = document.createElement('option');
        opt.value = g.id;
        opt.textContent = `${s.nombre} - ${g.nombre} (${g.tipo})`;
        selGri.appendChild(opt);

        if (selGriForm) {
          const optForm = document.createElement('option');
          optForm.value = g.id;
          optForm.textContent = `${s.nombre} - ${g.nombre} (${g.tipo})`;
          selGriForm.appendChild(optForm);
        }
      });
    });

    if (this.grillaActual && selGri.querySelector(`option[value="${this.grillaActual.id}"]`)) {
      selGri.value = this.grillaActual.id;
    }
    if (this.grillaActual && selGriForm && selGriForm.querySelector(`option[value="${this.grillaActual.id}"]`)) {
      selGriForm.value = this.grillaActual.id;
    }
  },

  poblarSelectorLogos() {
    const container = document.getElementById('logo-picker-container');
    if (!container) return;

    container.innerHTML = '';
    this.logosDisponibles.forEach(item => {
      const div = document.createElement('div');
      div.className = 'logo-picker-item';
      div.title = item.nombre;
      div.innerHTML = `
        <img src="/${item.url}" alt="${item.nombre}" loading="lazy">
        <span>${item.nombre}</span>
      `;
      div.addEventListener('click', () => {
        document.querySelectorAll('.logo-picker-item').forEach(x => x.classList.remove('selected'));
        div.classList.add('selected');
        const inputLogo = document.getElementById('canal-item-logo');
        if (inputLogo) inputLogo.value = item.url;
      });
      container.appendChild(div);
    });
  },

  renderTablaSucursales() {
    const tbody = document.getElementById('tabla-canales-sucursales-body');
    if (!tbody) return;

    tbody.innerHTML = '';
    this.estructura.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${s.nombre}</strong></td>
        <td>${s.localidad || '-'}</td>
        <td>${s.provincia || '-'}</td>
        <td><span class="badge badge-secondary">${(s.grillas || []).length} grillas</span></td>
        <td class="text-right">
          <div class="actions-cell-group">
            <button type="button" class="btn btn-sm btn-outline-primary" onclick="CanalesModule.cargarEdicionSucursal(${s.id})">✏️ Editar</button>
            <span class="action-divider-line"></span>
            <button type="button" class="btn btn-sm btn-outline-danger" onclick="CanalesModule.eliminarSucursal(${s.id})">🗑️ Borrar</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  cargarEdicionSucursal(id) {
    const s = this.estructura.find(x => x.id === id);
    if (!s) return;

    document.getElementById('canal-sucursal-id').value = s.id;
    document.getElementById('canal-sucursal-nombre').value = s.nombre;
    document.getElementById('canal-sucursal-localidad').value = s.localidad || '';
    document.getElementById('canal-sucursal-provincia').value = s.provincia || '';

    const btnSubmit = document.getElementById('btn-guardar-sucursal');
    if (btnSubmit) btnSubmit.textContent = 'Actualizar Sucursal';
  },

  limpiarFormSucursal() {
    const form = document.getElementById('form-canal-sucursal');
    if (form) form.reset();
    document.getElementById('canal-sucursal-id').value = '';
    const btnSubmit = document.getElementById('btn-guardar-sucursal');
    if (btnSubmit) btnSubmit.textContent = 'Crear Sucursal';
  },

  async guardarSucursal(e) {
    e.preventDefault();
    const id = document.getElementById('canal-sucursal-id').value;
    const payload = {
      nombre: document.getElementById('canal-sucursal-nombre').value,
      localidad: document.getElementById('canal-sucursal-localidad').value,
      provincia: document.getElementById('canal-sucursal-provincia').value
    };

    try {
      if (id) {
        await API.put(`/canales/sucursales/${id}`, payload);
      } else {
        await API.post('/canales/sucursales', payload);
      }
      this.limpiarFormSucursal();
      await this.cargarEstructura(true);
      this.renderTablaSucursales();
    } catch (err) {
      alert(err.message || 'Error al guardar sucursal');
    }
  },

  async eliminarSucursal(id) {
    if (!confirm('¿Está seguro de eliminar esta sucursal? Se eliminarán todas sus grillas y canales asociados.')) return;
    try {
      await API.delete(`/canales/sucursales/${id}`);
      await this.cargarEstructura();
      this.renderTablaSucursales();
    } catch (err) {
      alert(err.message || 'Error al eliminar sucursal');
    }
  },

  renderTablaGrillas() {
    const tbody = document.getElementById('tabla-canales-grillas-body');
    if (!tbody) return;

    const selSuc = document.getElementById('edicion-grillas-filtro-sucursal');
    const sucId = selSuc && selSuc.value ? parseInt(selSuc.value, 10) : null;

    tbody.innerHTML = '';
    const sucursalesFiltrar = sucId ? this.estructura.filter(s => s.id === sucId) : this.estructura;

    sucursalesFiltrar.forEach(s => {
      (s.grillas || []).forEach(g => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${s.nombre}</strong></td>
          <td><span class="badge badge-info">${g.tipo}</span></td>
          <td>${g.nombre}</td>
          <td>${g.total_canales || 0}</td>
          <td class="text-right">
            <div class="actions-cell-group">
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="CanalesModule.cargarEdicionGrilla(${g.id}, ${s.id})">✏️ Editar</button>
              <span class="action-divider-line"></span>
              <button type="button" class="btn btn-sm btn-outline-danger" onclick="CanalesModule.eliminarGrilla(${g.id})">🗑️ Borrar</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    });
  },

  cargarEdicionGrilla(grillaId, sucursalId) {
    const suc = this.estructura.find(s => s.id === sucursalId);
    if (!suc) return;
    const g = (suc.grillas || []).find(x => x.id === grillaId);
    if (!g) return;

    document.getElementById('canal-grilla-id').value = g.id;
    document.getElementById('canal-grilla-sucursal-id').value = sucursalId;
    document.getElementById('canal-grilla-tipo').value = g.tipo;
    document.getElementById('canal-grilla-nombre').value = g.nombre;

    const btnSubmit = document.getElementById('btn-guardar-grilla');
    if (btnSubmit) btnSubmit.textContent = 'Actualizar Grilla';
  },

  limpiarFormGrilla() {
    const form = document.getElementById('form-canal-grilla');
    if (form) form.reset();
    document.getElementById('canal-grilla-id').value = '';
    const btnSubmit = document.getElementById('btn-guardar-grilla');
    if (btnSubmit) btnSubmit.textContent = 'Crear Grilla';
  },

  async guardarGrilla(e) {
    e.preventDefault();
    const id = document.getElementById('canal-grilla-id').value;
    const payload = {
      sucursal_id: parseInt(document.getElementById('canal-grilla-sucursal-id').value, 10),
      tipo: document.getElementById('canal-grilla-tipo').value,
      nombre: document.getElementById('canal-grilla-nombre').value
    };

    try {
      if (id) {
        await API.put(`/canales/grillas/${id}`, payload);
      } else {
        await API.post('/canales/grillas', payload);
      }
      this.limpiarFormGrilla();
      await this.cargarEstructura(true);
      this.renderTablaGrillas();
    } catch (err) {
      alert(err.message || 'Error al guardar grilla');
    }
  },

  async eliminarGrilla(id) {
    if (!confirm('¿Está seguro de eliminar esta grilla? Se eliminarán todos sus canales.')) return;
    try {
      await API.delete(`/canales/grillas/${id}`);
      await this.cargarEstructura();
      this.renderTablaGrillas();
    } catch (err) {
      alert(err.message || 'Error al eliminar grilla');
    }
  },

  async renderTablaCanales() {
    const tbody = document.getElementById('tabla-canales-items-body');
    if (!tbody) return;

    const selGri = document.getElementById('edicion-canales-filtro-grilla');
    const grillaId = selGri && selGri.value ? parseInt(selGri.value, 10) : null;

    tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Cargando canales...</td></tr>';

    if (!grillaId) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">Seleccione una grilla específica en el filtro superior para gestionar sus canales.</td></tr>';
      return;
    }

    try {
      const data = await API.get(`/canales/grilla/${grillaId}`);
      const canales = data ? data.canales : [];

      tbody.innerHTML = '';
      if (canales.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-muted">No hay canales cargados en esta grilla.</td></tr>';
        return;
      }

      canales.forEach(c => {
        const tr = document.createElement('tr');
        const logoUrl = c.logo ? (c.logo.startsWith('http') || c.logo.startsWith('/') ? c.logo : `/${c.logo}`) : '/assets/canales/sinseñal.jpg';
        tr.innerHTML = `
          <td><strong>${c.numero}</strong></td>
          <td><img src="${logoUrl}" alt="${c.nombre}" style="width: 32px; height: 32px; object-fit: contain;"></td>
          <td>${c.nombre}</td>
          <td><small class="text-muted">${c.categoria || '-'}</small></td>
          <td class="text-right">
            <div class="actions-cell-group">
              <button type="button" class="btn btn-sm btn-outline-primary" onclick="CanalesModule.cargarEdicionCanal(${c.id}, ${c.numero}, '${c.nombre.replace(/'/g, "\\'")}', '${c.logo || ''}', '${c.categoria || ''}', ${grillaId})">✏️ Editar</button>
              <span class="action-divider-line"></span>
              <button type="button" class="btn btn-sm btn-outline-danger" onclick="CanalesModule.eliminarCanal(${c.id})">🗑️ Borrar</button>
            </div>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center p-3 text-danger">Error al cargar canales</td></tr>';
    }
  },

  cargarEdicionCanal(id, numero, nombre, logo, categoria, grillaId) {
    document.getElementById('canal-item-id').value = id;
    document.getElementById('canal-item-grilla-id').value = grillaId;
    document.getElementById('canal-item-numero').value = numero;
    document.getElementById('canal-item-nombre').value = nombre;
    document.getElementById('canal-item-logo').value = logo || '';
    document.getElementById('canal-item-categoria').value = categoria || '';

    const btnSubmit = document.getElementById('btn-guardar-canal-item');
    if (btnSubmit) btnSubmit.textContent = 'Actualizar Canal';
  },

  limpiarFormCanal() {
    const form = document.getElementById('form-canal-item');
    if (form) form.reset();
    document.getElementById('canal-item-id').value = '';
    const selGri = document.getElementById('edicion-canales-filtro-grilla');
    if (selGri && selGri.value) {
      document.getElementById('canal-item-grilla-id').value = selGri.value;
    }
    const btnSubmit = document.getElementById('btn-guardar-canal-item');
    if (btnSubmit) btnSubmit.textContent = 'Agregar Canal';
  },

  async guardarCanal(e) {
    e.preventDefault();
    const id = document.getElementById('canal-item-id').value;
    const grillaId = parseInt(document.getElementById('canal-item-grilla-id').value, 10);
    const payload = {
      grilla_id: grillaId,
      numero: parseInt(document.getElementById('canal-item-numero').value, 10),
      nombre: document.getElementById('canal-item-nombre').value,
      logo: document.getElementById('canal-item-logo').value,
      categoria: document.getElementById('canal-item-categoria').value
    };

    try {
      if (id) {
        await API.put(`/canales/items/${id}`, payload);
      } else {
        await API.post('/canales/items', payload);
      }
      this.limpiarFormCanal();
      await this.cargarEstructura(true);
      await this.renderTablaCanales();
    } catch (err) {
      alert(err.message || 'Error al guardar canal');
    }
  },

  async eliminarCanal(id) {
    if (!confirm('¿Desea eliminar este canal de la grilla?')) return;
    try {
      await API.delete(`/canales/items/${id}`);
      await this.cargarEstructura(true);
      await this.renderTablaCanales();
    } catch (err) {
      alert(err.message || 'Error al eliminar canal');
    }
  },

  async subirLogo(e) {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('imagen', file);

    const token = API.getToken();
    try {
      const res = await fetch('/api/canales/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al subir imagen');

      document.getElementById('canal-item-logo').value = data.url;
      await this.cargarLogos();
      this.poblarSelectorLogos();
      alert('Logo subido correctamente');
    } catch (err) {
      alert(err.message || 'Error al subir archivo de logo');
    }
  }
};
