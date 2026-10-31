const SucursalesInfoModule = {
  sucursales: [],
  currentSucursalId: null,
  currentSucursalData: null,
  currentSubtab: 'precios',
  preciosFiltroServicio: 'todos',
  conceptosPromoForm: [],

  async init() {
    this.bindEvents();
    this.aplicarPermisosRol();
    await this.cargarSucursales();
  },

  aplicarPermisosRol() {
    const user = API.getUser();
    const esAdminOSup = user && (user.rol === 'Admin' || user.rol === 'Supervisor');
    const actionsBox = document.getElementById('sucursales-info-admin-actions');
    if (actionsBox) {
      actionsBox.style.display = esAdminOSup ? 'flex' : 'none';
    }
  },

  bindEvents() {
    const searchInput = document.getElementById('sucursales-info-busqueda-precios');
    if (searchInput) {
      searchInput.oninput = () => this.filtrarPrecios();
    }
  },

  async cargarSucursales() {
    const selectorBar = document.getElementById('sucursales-selector-bar');
    if (selectorBar) {
      selectorBar.innerHTML = '<div class="text-muted font-sm py-2">Cargando sucursales...</div>';
    }

    try {
      this.sucursales = await API.get('/sucursales-info');
      this.renderSelectorBar();

      if (this.sucursales.length > 0) {
        const idASeleccionar = this.currentSucursalId && this.sucursales.some(s => s.id === this.currentSucursalId)
          ? this.currentSucursalId
          : this.sucursales[0].id;
        await this.seleccionarSucursal(idASeleccionar);
      } else {
        if (selectorBar) selectorBar.innerHTML = '<div class="text-muted font-sm py-2">No hay sucursales registradas.</div>';
        const contenedor = document.getElementById('sucursales-info-detalle');
        if (contenedor) contenedor.classList.add('hidden');
      }
    } catch (err) {
      console.error(err);
      if (selectorBar) selectorBar.innerHTML = '<div class="text-danger font-sm py-2">Error al cargar sucursales.</div>';
    }
  },

  renderSelectorBar() {
    const selectorBar = document.getElementById('sucursales-selector-bar');
    if (!selectorBar) return;

    let html = '';
    this.sucursales.forEach(s => {
      const isActive = this.currentSucursalId === s.id;
      html += `
        <button type="button" class="sucursales-selector-btn ${isActive ? 'active' : ''}" onclick="SucursalesInfoModule.seleccionarSucursal(${s.id})">
          <span>🏢</span> ${this.escapeHtml(s.nombre)}
        </button>
      `;
    });
    selectorBar.innerHTML = html;
  },

  async seleccionarSucursal(id) {
    this.currentSucursalId = id;
    this.renderSelectorBar();

    const contenedor = document.getElementById('sucursales-info-detalle');
    if (contenedor) contenedor.classList.remove('hidden');

    try {
      this.currentSucursalData = await API.get(`/sucursales-info/${id}`);
      this.renderInfoGeneral();
      this.renderPrecios();
      this.renderPromociones();
      this.cambiarSubtab(this.currentSubtab);
    } catch (err) {
      alert('Error al cargar detalle de la sucursal: ' + err.message);
    }
  },

  cambiarSubtab(subtab) {
    this.currentSubtab = subtab;
    const tabBtns = document.querySelectorAll('.sucursales-section-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.getAttribute('data-subtab') === subtab) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const secInfo = document.getElementById('sucursal-sec-info');
    const secPrecios = document.getElementById('sucursal-sec-precios');
    const secPromos = document.getElementById('sucursal-sec-promociones');

    if (secInfo) secInfo.classList.toggle('hidden', subtab !== 'info');
    if (secPrecios) secPrecios.classList.toggle('hidden', subtab !== 'precios');
    if (secPromos) secPromos.classList.toggle('hidden', subtab !== 'promociones');
  },

  renderInfoGeneral() {
    if (!this.currentSucursalData) return;
    const s = this.currentSucursalData.sucursal;

    const nombreEl = document.getElementById('sucursal-info-nombre');
    const locEl = document.getElementById('sucursal-info-localidad');
    const dirEl = document.getElementById('sucursal-info-direccion');
    const horEl = document.getElementById('sucursal-info-horario');
    const mapBox = document.getElementById('sucursal-info-mapa-box');
    const logoBox = document.getElementById('sucursal-info-logo-container');

    if (nombreEl) nombreEl.textContent = s.nombre;
    if (locEl) locEl.textContent = s.localidad || 'No especificada';
    if (dirEl) dirEl.textContent = s.direccion || 'No especificada';
    if (horEl) horEl.textContent = s.horario_atencion || 'No especificado';

    if (logoBox) {
      if (s.logo) {
        logoBox.innerHTML = `<img src="${s.logo}" alt="Logo ${this.escapeHtml(s.nombre)}" class="sucursal-logo-img">`;
      } else {
        logoBox.innerHTML = '🏢';
      }
    }

    if (mapBox) {
      if (s.coordenadas_link) {
        mapBox.innerHTML = `
          <a href="${s.coordenadas_link}" target="_blank" rel="noopener noreferrer" class="btn btn-outline-primary btn-sm flex-row align-center gap-1">
            <span>📍</span> Ver ubicación en Google Maps
          </a>
        `;
      } else {
        mapBox.innerHTML = '<span class="text-muted font-sm">Sin enlace de ubicación registrado</span>';
      }
    }
  },

  renderPrecios() {
    if (!this.currentSucursalData) return;
    const precios = this.currentSucursalData.precios || [];

    const servicios = Array.from(new Set(precios.map(p => p.tipo_servicio))).filter(Boolean);
    const chipsContainer = document.getElementById('precios-servicios-chips');
    if (chipsContainer) {
      let chipsHtml = `
        <button type="button" class="precios-servicio-chip ${this.preciosFiltroServicio === 'todos' ? 'active' : ''}" onclick="SucursalesInfoModule.filtrarPorServicio('todos', this)">
          Todos (${precios.length})
        </button>
      `;
      servicios.forEach(srv => {
        const count = precios.filter(p => p.tipo_servicio === srv).length;
        chipsHtml += `
          <button type="button" class="precios-servicio-chip ${this.preciosFiltroServicio === srv ? 'active' : ''}" onclick="SucursalesInfoModule.filtrarPorServicio('${this.escapeHtml(srv)}', this)">
            ${this.escapeHtml(srv)} (${count})
          </button>
        `;
      });
      chipsContainer.innerHTML = chipsHtml;
    }

    this.filtrarPrecios();
  },

  filtrarPorServicio(servicio, btnEl) {
    this.preciosFiltroServicio = servicio;
    if (btnEl) {
      btnEl.parentElement.querySelectorAll('.precios-servicio-chip').forEach(b => b.classList.remove('active'));
      btnEl.classList.add('active');
    }
    this.filtrarPrecios();
  },

  filtrarPrecios() {
    if (!this.currentSucursalData) return;
    const precios = this.currentSucursalData.precios || [];
    const searchInput = document.getElementById('sucursales-info-busqueda-precios');
    const term = searchInput ? searchInput.value.toLowerCase().trim() : '';

    const filtrados = precios.filter(p => {
      const matchServicio = this.preciosFiltroServicio === 'todos' || p.tipo_servicio === this.preciosFiltroServicio;
      const matchText = (p.codigo || '').toLowerCase().includes(term) ||
                        (p.nombre_concepto || '').toLowerCase().includes(term) ||
                        (p.tipo_servicio || '').toLowerCase().includes(term);
      return matchServicio && matchText;
    });

    const tbody = document.getElementById('tabla-sucursales-precios-body');
    if (!tbody) return;

    if (filtrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No se encontraron precios para los filtros seleccionados.</td></tr>';
      return;
    }

    let html = '';
    filtrados.forEach(p => {
      const costoFmt = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p.costo);
      html += `
        <tr>
          <td><span class="badge badge-info font-bold">${this.escapeHtml(p.tipo_servicio)}</span></td>
          <td><span class="font-mono font-bold" style="letter-spacing: 0.05em;">${this.escapeHtml(p.codigo)}</span></td>
          <td><strong>${this.escapeHtml(p.nombre_concepto)}</strong></td>
          <td style="text-align: right;"><strong class="font-md text-success">${costoFmt}</strong></td>
        </tr>
      `;
    });
    tbody.innerHTML = html;
  },

  renderPromociones() {
    if (!this.currentSucursalData) return;
    const promos = this.currentSucursalData.promociones || [];
    const container = document.getElementById('sucursales-promociones-grid');
    if (!container) return;

    if (promos.length === 0) {
      container.innerHTML = `
        <div class="card p-4 text-center text-muted" style="grid-column: 1 / -1;">
          No hay promociones registradas para esta sucursal actualmente.
        </div>
      `;
      return;
    }

    let html = '';
    promos.forEach(pr => {
      const isActiva = pr.estado === 'Activo';
      const badgeEstado = isActiva ? '<span class="badge badge-success">Activo</span>' : '<span class="badge badge-danger">Vencida</span>';
      const instalacionTexto = pr.instalacion_bonificada ? 'Bonificada (Gratis)' : (parseFloat(pr.costo_instalacion) > 0 ? `$${parseFloat(pr.costo_instalacion).toLocaleString('es-AR')}` : 'Sin costo');

      let conceptosRows = '';
      let totalPromo = 0;

      if (Array.isArray(pr.conceptos) && pr.conceptos.length > 0) {
        pr.conceptos.forEach(c => {
          const pFinal = parseFloat(c.precio_final) || 0;
          totalPromo += pFinal;

          const isBonif = parseFloat(c.bonificacion) > 0 && pFinal < 0;
          const displayPrice = isBonif
            ? `-$${Math.abs(pFinal).toLocaleString('es-AR')}`
            : `$${pFinal.toLocaleString('es-AR')}`;

          conceptosRows += `
            <tr>
              <td>
                <span class="${isBonif ? 'promo-concepto-bonificacion' : 'font-bold'}">
                  ${this.escapeHtml(c.nombre_concepto)}
                </span>
              </td>
              <td style="text-align: right;">
                <span class="${isBonif ? 'promo-concepto-bonificacion' : 'font-bold'}">
                  ${displayPrice}
                </span>
              </td>
            </tr>
          `;
        });
      }

      html += `
        <div class="promo-card">
          <div class="promo-card-header">
            <div>
              <h4 class="promo-card-title">${this.escapeHtml(pr.nombre)}</h4>
              <small class="text-muted">📍 Zona / Barrio: <strong>${this.escapeHtml(pr.zona_barrio)}</strong></small>
            </div>
            ${badgeEstado}
          </div>

          <div class="promo-tags-row">
            <span class="promo-tag">⏳ Duración: ${this.escapeHtml(pr.duracion)}</span>
            <span class="promo-tag">🔧 Instalación: ${this.escapeHtml(instalacionTexto)}</span>
            ${pr.fecha_vencimiento ? `<span class="promo-tag">📅 Vence: ${this.formatearFecha(pr.fecha_vencimiento)}</span>` : ''}
          </div>

          ${pr.observaciones ? `<p class="font-xs text-muted mb-2">${this.escapeHtml(pr.observaciones)}</p>` : ''}

          <table class="promo-conceptos-table">
            <thead>
              <tr>
                <th>Concepto del Servicio</th>
                <th style="text-align: right;">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${conceptosRows}
            </tbody>
          </table>

          <div class="promo-total-box">
            <span class="promo-total-label">PRECIO PROMOCIONAL FINAL</span>
            <span class="promo-total-valor">$${Math.max(0, totalPromo).toLocaleString('es-AR')}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  },

  abrirModalCrearSucursal() {
    const modal = document.getElementById('modal-crear-sucursal-info');
    if (!modal) return;
    const form = document.getElementById('form-sucursal-info-completa');
    if (form) form.reset();
    document.getElementById('form-sucursal-id').value = '';
    document.getElementById('modal-sucursal-info-titulo').textContent = '🏢 Nueva Sucursal';
    modal.classList.remove('hidden');
  },

  async guardarSucursal(e) {
    if (e) e.preventDefault();
    const btnSubmit = document.getElementById('btn-guardar-sucursal-submit');
    const id = document.getElementById('form-sucursal-id').value;
    const nombre = document.getElementById('form-sucursal-nombre').value.trim();
    const localidad = document.getElementById('form-sucursal-localidad').value.trim();
    const direccion = document.getElementById('form-sucursal-direccion').value.trim();
    const horario = document.getElementById('form-sucursal-horario').value.trim();
    const coordenadas = document.getElementById('form-sucursal-coordenadas').value.trim();
    const fileLogo = document.getElementById('form-sucursal-logo').files[0];

    if (!nombre) {
      alert('El nombre de la sucursal es obligatorio.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre);
    formData.append('localidad', localidad);
    formData.append('direccion', direccion);
    formData.append('horario_atencion', horario);
    formData.append('coordenadas_link', coordenadas);
    if (fileLogo) formData.append('logo', fileLogo);

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';
      }

      const token = API.getToken();
      const url = id ? `/api/sucursales-info/${id}` : '/api/sucursales-info';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al guardar sucursal.');
      }

      this.cerrarModal('modal-crear-sucursal-info');
      await this.cargarSucursales();
      if (data.id) await this.seleccionarSucursal(data.id);
      alert('Sucursal guardada exitosamente.');
    } catch (err) {
      alert(err.message || 'Error al guardar sucursal.');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Guardar Sucursal';
      }
    }
  },

  abrirModalCrearPrecio() {
    const modal = document.getElementById('modal-crear-precio-info');
    if (!modal) return;
    const form = document.getElementById('form-precio-info');
    if (form) form.reset();

    const selectSuc = document.getElementById('form-precio-sucursal');
    if (selectSuc) {
      let optHtml = '';
      this.sucursales.forEach(s => {
        const isSelected = this.currentSucursalId === s.id ? 'selected' : '';
        optHtml += `<option value="${s.id}" ${isSelected}>${this.escapeHtml(s.nombre)}</option>`;
      });
      selectSuc.innerHTML = optHtml;
    }

    modal.classList.remove('hidden');
  },

  async guardarPrecio(e) {
    if (e) e.preventDefault();
    const btnSubmit = document.getElementById('btn-guardar-precio-submit');
    const sucursal_id = document.getElementById('form-precio-sucursal').value;
    const tipo_servicio = document.getElementById('form-precio-tipo').value;
    const codigo = document.getElementById('form-precio-codigo').value.trim().toUpperCase();
    const nombre_concepto = document.getElementById('form-precio-concepto').value.trim();
    const costo = document.getElementById('form-precio-costo').value;

    if (!sucursal_id || !codigo || !nombre_concepto || costo === '') {
      alert('Todos los campos son obligatorios.');
      return;
    }

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';
      }

      await API.post('/sucursales-info/precios', {
        sucursal_id,
        tipo_servicio,
        codigo,
        nombre_concepto,
        costo
      });

      this.cerrarModal('modal-crear-precio-info');
      if (parseInt(sucursal_id, 10) === this.currentSucursalId) {
        await this.seleccionarSucursal(this.currentSucursalId);
      }
      alert('Precio guardado exitosamente.');
    } catch (err) {
      alert(err.message || 'Error al guardar precio.');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Guardar Precio';
      }
    }
  },

  abrirModalCrearPromocion() {
    const modal = document.getElementById('modal-crear-promocion-info');
    if (!modal) return;
    const form = document.getElementById('form-promocion-info');
    if (form) form.reset();

    const selectSuc = document.getElementById('form-promo-sucursal');
    if (selectSuc) {
      let optHtml = '';
      this.sucursales.forEach(s => {
        const isSelected = this.currentSucursalId === s.id ? 'selected' : '';
        optHtml += `<option value="${s.id}" ${isSelected}>${this.escapeHtml(s.nombre)}</option>`;
      });
      selectSuc.innerHTML = optHtml;
    }

    this.conceptosPromoForm = [];
    this.agregarFilaConceptoPromo();
    this.renderFilasConceptosPromo();

    modal.classList.remove('hidden');
  },

  toggleCostoInstalacion(valor) {
    const group = document.getElementById('group-form-promo-costo-inst');
    if (group) {
      group.style.display = valor === 'false' ? 'block' : 'none';
    }
  },

  onPromoSelectSucursal(sucId) {
    this.conceptosPromoForm = [];
    this.agregarFilaConceptoPromo();
    this.renderFilasConceptosPromo();
  },

  agregarFilaConceptoPromo() {
    this.conceptosPromoForm.push({
      nombre_concepto: '',
      precio_base: 0,
      bonificacion: 0,
      precio_final: 0
    });
    this.renderFilasConceptosPromo();
  },

  eliminarFilaConceptoPromo(idx) {
    this.conceptosPromoForm.splice(idx, 1);
    this.renderFilasConceptosPromo();
  },

  actualizarConceptoPromo(idx, campo, valor) {
    const c = this.conceptosPromoForm[idx];
    if (!c) return;

    if (campo === 'nombre_concepto') {
      c.nombre_concepto = valor;
    } else if (campo === 'precio_base') {
      c.precio_base = parseFloat(valor) || 0;
    } else if (campo === 'bonificacion') {
      c.bonificacion = parseFloat(valor) || 0;
    }

    if (c.bonificacion > 0 && c.precio_base === 0) {
      c.precio_final = -c.bonificacion;
    } else {
      c.precio_final = c.precio_base - c.bonificacion;
    }

    this.renderFilasConceptosPromo();
  },

  renderFilasConceptosPromo() {
    const tbody = document.getElementById('tabla-form-promo-conceptos-body');
    const totalCalc = document.getElementById('form-promo-total-calculado');
    if (!tbody) return;

    let html = '';
    let total = 0;

    this.conceptosPromoForm.forEach((c, idx) => {
      total += c.precio_final;
      const isNegative = c.precio_final < 0;
      const displayTotal = isNegative ? `-$${Math.abs(c.precio_final).toLocaleString('es-AR')}` : `$${c.precio_final.toLocaleString('es-AR')}`;

      html += `
        <tr>
          <td>
            <input type="text" class="form-control" value="${this.escapeHtml(c.nombre_concepto)}" placeholder="Ej: 100MB + CATV o Bonificación" onchange="SucursalesInfoModule.actualizarConceptoPromo(${idx}, 'nombre_concepto', this.value)" required>
          </td>
          <td>
            <input type="number" class="form-control" value="${c.precio_base}" min="0" step="1" onchange="SucursalesInfoModule.actualizarConceptoPromo(${idx}, 'precio_base', this.value)">
          </td>
          <td>
            <input type="number" class="form-control" value="${c.bonificacion}" min="0" step="1" onchange="SucursalesInfoModule.actualizarConceptoPromo(${idx}, 'bonificacion', this.value)">
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <strong class="${isNegative ? 'text-danger' : 'text-success'}">${displayTotal}</strong>
          </td>
          <td style="text-align: center; vertical-align: middle;">
            ${this.conceptosPromoForm.length > 1 ? `<button type="button" class="btn btn-xs btn-outline-danger" onclick="SucursalesInfoModule.eliminarFilaConceptoPromo(${idx})">✕</button>` : ''}
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
    if (totalCalc) {
      totalCalc.textContent = `$${Math.max(0, total).toLocaleString('es-AR')}`;
    }
  },

  async guardarPromocion(e) {
    if (e) e.preventDefault();
    const btnSubmit = document.getElementById('btn-guardar-promocion-submit');
    const sucursal_id = document.getElementById('form-promo-sucursal').value;
    const nombre = document.getElementById('form-promo-nombre').value.trim();
    const zona_barrio = document.getElementById('form-promo-zona').value.trim();
    const duracion = document.getElementById('form-promo-duracion').value.trim();
    const estado = document.getElementById('form-promo-estado').value;
    const instBonif = document.getElementById('form-promo-inst-bonif').value === 'true';
    const costoInst = document.getElementById('form-promo-costo-inst').value;
    const vencimiento = document.getElementById('form-promo-vencimiento').value || null;
    const observaciones = document.getElementById('form-promo-obs').value.trim();

    if (!sucursal_id || !nombre || !zona_barrio || !duracion) {
      alert('Complete los campos obligatorios.');
      return;
    }

    const conceptosValidos = this.conceptosPromoForm.filter(c => c.nombre_concepto.trim());
    if (conceptosValidos.length === 0) {
      alert('Debe agregar al menos un concepto en la promoción.');
      return;
    }

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Guardando...';
      }

      await API.post('/sucursales-info/promociones', {
        sucursal_id,
        nombre,
        zona_barrio,
        duracion,
        estado,
        instalacion_bonificada: instBonif,
        costo_instalacion: instBonif ? 0 : costoInst,
        fecha_vencimiento: vencimiento,
        observaciones,
        conceptos: conceptosValidos
      });

      this.cerrarModal('modal-crear-promocion-info');
      if (parseInt(sucursal_id, 10) === this.currentSucursalId) {
        await this.seleccionarSucursal(this.currentSucursalId);
      }
      alert('Promoción registrada exitosamente.');
    } catch (err) {
      alert(err.message || 'Error al guardar promoción.');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.textContent = 'Guardar Promoción';
      }
    }
  },

  cerrarModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
  },

  formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    try {
      const partes = fechaStr.split('T')[0].split('-');
      if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}/${partes[0]}`;
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
};
