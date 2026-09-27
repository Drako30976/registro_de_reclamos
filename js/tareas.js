const TareasModule = {
  usuarios: [],
  sucursales: [],
  tareas: [],
  historialTareas: [],
  currentEditingId: null,
  currentSubtab: 'activas',

  async init() {
    await Promise.all([
      this.cargarCatalogos(),
      this.cargarTareas()
    ]);
    this.bindEvents();
    if (this.currentSubtab === 'historial') {
      await this.cargarHistorial();
    }
  },

  async cargarCatalogos() {
    try {
      const [sucursales, asesores] = await Promise.all([
        API.get('/catalogos/sucursales'),
        API.get('/catalogos/asesores')
      ]);

      this.sucursales = sucursales;
      this.usuarios = (asesores || []).filter(u => u.usuario.toLowerCase() !== 'admin');

      this.poblarDropdowns();
    } catch (err) {
      console.error('Error al cargar catálogos para tareas:', err);
    }
  },

  poblarDropdowns() {
    const selUser = document.getElementById('tarea-usuario');
    const selSuc1 = document.getElementById('tarea-sucursal-1');
    const selSuc2 = document.getElementById('tarea-sucursal-2');
    const filtroAsesor = document.getElementById('filtro-tarea-asesor');
    const filtroSucursal = document.getElementById('filtro-tarea-sucursal');

    if (selUser) {
      selUser.innerHTML = '<option value="">-- Seleccione Usuario --</option>';
      this.usuarios.forEach(u => {
        const tieneActiva = this.tareas.some(t => t.usuario_id === u.id);
        const activaTag = tieneActiva ? ' ⚠️ [Tiene tarea activa]' : '';
        selUser.innerHTML += `<option value="${u.id}">${u.nombre_completo} (${u.rol})${activaTag}</option>`;
      });
    }

    if (selSuc1) {
      selSuc1.innerHTML = '<option value="">-- Seleccione Sucursal Principal --</option>';
      this.sucursales.forEach(s => {
        selSuc1.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
    }

    if (selSuc2) {
      selSuc2.innerHTML = '<option value="">-- Ninguna / Opcional --</option>';
      this.sucursales.forEach(s => {
        selSuc2.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
    }

    if (filtroAsesor) {
      const currentVal = filtroAsesor.value;
      filtroAsesor.innerHTML = '<option value="">Todos los asesores</option>';
      this.usuarios.forEach(u => {
        filtroAsesor.innerHTML += `<option value="${u.id}">${u.nombre_completo}</option>`;
      });
      if (currentVal) filtroAsesor.value = currentVal;
    }

    if (filtroSucursal) {
      const currentVal = filtroSucursal.value;
      filtroSucursal.innerHTML = '<option value="">Todas las sucursales</option>';
      this.sucursales.forEach(s => {
        filtroSucursal.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
      if (currentVal) filtroSucursal.value = currentVal;
    }
  },

  async cargarTareas() {
    const tbody = document.getElementById('tabla-tareas-body');
    const contador = document.getElementById('tareas-contador');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Cargando tareas activas...</td></tr>';

    try {
      const data = await API.get('/tareas');
      this.tareas = data;

      if (contador) {
        contador.textContent = `${this.tareas.length} activas`;
      }

      this.renderTabla();
      this.poblarDropdowns();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Error al cargar tareas: ${err.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('tabla-tareas-body');
    if (!tbody) return;

    if (this.tareas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-muted">No hay tareas activas asignadas actualmente.</td></tr>';
      return;
    }

    tbody.innerHTML = this.tareas.map(t => {
      const sucursalesTexto = t.sucursal_2_nombre 
        ? `${t.sucursal_1_nombre} / ${t.sucursal_2_nombre}`
        : t.sucursal_1_nombre;

      const tareaTexto = t.tarea
        ? `<span class="badge badge-info">${t.tarea}</span>`
        : `<span class="badge badge-secondary" style="opacity: 0.7;">Sin tarea diaria</span>`;

      const estadoHtml = t.tarea
        ? `<label class="tarea-checkbox-wrap" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
            <input type="checkbox" ${t.completada ? 'checked' : ''} onchange="TareasModule.toggleMarcarTarea(${t.id}, this.checked)">
            <span class="badge ${t.completada ? 'badge-success' : 'badge-warning'}">
              ${t.completada ? '✓ Marcada' : '⏳ Pendiente'}
            </span>
          </label>`
        : `<span class="badge badge-secondary" style="opacity: 0.7;">-</span>`;

      const descParaEliminar = (t.tarea || sucursalesTexto).replace(/'/g, "\\'");

      return `
        <tr>
          <td>
            <a href="javascript:void(0)" class="user-link-badge" onclick="HistorialModule.abrirModalVerPerfil(${t.usuario_id})" title="Ver perfil">
              <span>👤</span> ${t.usuario_nombre}
            </a>
            <div><small class="role-badge role-${t.usuario_rol.toLowerCase()}">${t.usuario_rol}</small></div>
          </td>
          <td><strong>${sucursalesTexto}</strong></td>
          <td>${tareaTexto}</td>
          <td>${estadoHtml}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-outline-primary mr-1" onclick="TareasModule.abrirModalEditar(${t.id})">Editar</button>
            <button class="btn btn-sm btn-outline-danger" onclick="TareasModule.confirmarEliminar(${t.id}, '${descParaEliminar}')">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  getHistorialQueryParams() {
    const params = new URLSearchParams();
    const fechaDesde = document.getElementById('filtro-tarea-fecha-desde')?.value;
    const fechaHasta = document.getElementById('filtro-tarea-fecha-hasta')?.value;
    const asesorId = document.getElementById('filtro-tarea-asesor')?.value;
    const sucursalId = document.getElementById('filtro-tarea-sucursal')?.value;

    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (asesorId) params.append('asesor_id', asesorId);
    if (sucursalId) params.append('sucursal_id', sucursalId);

    return params;
  },

  async cargarHistorial() {
    const tbody = document.getElementById('tabla-historial-tareas-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Cargando historial de tareas...</td></tr>';

    try {
      const params = this.getHistorialQueryParams();
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await API.get(`/tareas/historial${qs}`);
      this.historialTareas = data || [];
      this.renderTablaHistorial();
    } catch (err) {
      console.error('Error al cargar historial de tareas:', err);
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error al cargar historial: ${err.message}</td></tr>`;
    }
  },

  renderTablaHistorial() {
    const tbody = document.getElementById('tabla-historial-tareas-body');
    if (!tbody) return;

    if (this.historialTareas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-muted">No se encontraron tareas con los filtros seleccionados.</td></tr>';
      return;
    }

    tbody.innerHTML = this.historialTareas.map(t => {
      const suc1 = t.sucursal_1_nombre || '-';
      const suc2 = t.sucursal_2_nombre ? `<span class="badge badge-secondary">${t.sucursal_2_nombre}</span>` : '<span class="text-muted font-sm">-</span>';

      const tareaTexto = t.tarea
        ? `<span class="badge badge-info">${t.tarea}</span>`
        : `<span class="badge badge-secondary" style="opacity: 0.7;">Sin tarea diaria</span>`;

      const estadoTexto = t.tarea
        ? `<span class="badge ${t.completada ? 'badge-success' : 'badge-warning'}">${t.completada ? '✓ Marcada' : '⏳ Pendiente'}</span>`
        : `<span class="badge badge-secondary" style="opacity: 0.7;">-</span>`;

      const vigenciaTexto = t.vigente
        ? '<span class="badge badge-success">Activa</span>'
        : '<span class="badge badge-secondary" style="opacity: 0.8;">Finalizada</span>';

      return `
        <tr>
          <td>
            <strong>${t.fecha_fmt}</strong>
            <div><small class="text-muted">${t.hora_fmt} hs</small></div>
          </td>
          <td>
            <a href="javascript:void(0)" class="user-link-badge" onclick="HistorialModule.abrirModalVerPerfil(${t.usuario_id})" title="Ver perfil">
              <span>👤</span> ${t.asesor_nombre}
            </a>
            <div><small class="role-badge role-${(t.asesor_rol || '').toLowerCase()}">${t.asesor_rol || ''}</small></div>
          </td>
          <td><strong>${suc1}</strong></td>
          <td>${suc2}</td>
          <td>${tareaTexto}</td>
          <td>${estadoTexto}</td>
          <td>${vigenciaTexto}</td>
          <td>
            <span class="text-muted font-sm">${t.creado_por_nombre || '-'}</span>
          </td>
        </tr>
      `;
    }).join('');
  },

  async descargarReportePDF() {
    const btn = document.getElementById('btn-emitir-reporte-tareas');
    const originalText = btn ? btn.innerHTML : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Generando PDF...';
      }

      const params = this.getHistorialQueryParams();
      const qs = params.toString() ? `?${params.toString()}` : '';
      const url = `/api/reportes/tareas-pdf${qs}`;
      const token = API.getToken();
      if (!token) {
        throw new Error('Sesión no encontrada o expirada. Por favor inicie sesión nuevamente.');
      }
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Error al generar el reporte PDF.');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const fechaHoy = new Date().toISOString().slice(0, 10);
      a.download = `Reporte_Tareas_${fechaHoy}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (err) {
      console.error('Error al emitir reporte de tareas PDF:', err);
      alert('Error al emitir reporte PDF: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  },

  bindEvents() {
    const subtabBtnAsignar = document.getElementById('subtab-btn-asignar-tareas');
    const subtabBtnHistorial = document.getElementById('subtab-btn-historial-tareas');
    const secActivas = document.getElementById('tareas-sec-activas');
    const secHistorial = document.getElementById('tareas-sec-historial');

    if (subtabBtnAsignar && subtabBtnHistorial && secActivas && secHistorial) {
      subtabBtnAsignar.onclick = () => {
        this.currentSubtab = 'activas';
        subtabBtnAsignar.classList.add('active');
        subtabBtnHistorial.classList.remove('active');
        secActivas.classList.remove('hidden');
        secHistorial.classList.add('hidden');
      };

      subtabBtnHistorial.onclick = () => {
        this.currentSubtab = 'historial';
        subtabBtnHistorial.classList.add('active');
        subtabBtnAsignar.classList.remove('active');
        secHistorial.classList.remove('hidden');
        secActivas.classList.add('hidden');
        this.cargarHistorial();
      };
    }

    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-tareas');
    const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros-tareas');
    const btnReportePdf = document.getElementById('btn-emitir-reporte-tareas');

    if (btnAplicarFiltros) {
      btnAplicarFiltros.onclick = () => {
        this.cargarHistorial();
      };
    }

    if (btnLimpiarFiltros) {
      btnLimpiarFiltros.onclick = () => {
        const fd = document.getElementById('filtro-tarea-fecha-desde');
        const fh = document.getElementById('filtro-tarea-fecha-hasta');
        const fa = document.getElementById('filtro-tarea-asesor');
        const fs = document.getElementById('filtro-tarea-sucursal');
        if (fd) fd.value = '';
        if (fh) fh.value = '';
        if (fa) fa.value = '';
        if (fs) fs.value = '';
        this.cargarHistorial();
      };
    }

    if (btnReportePdf) {
      btnReportePdf.onclick = () => {
        this.descargarReportePDF();
      };
    }

    const form = document.getElementById('form-asignar-tarea');
    const inputDesc = document.getElementById('tarea-descripcion');
    const counter = document.getElementById('tarea-char-counter');

    if (inputDesc && counter) {
      inputDesc.oninput = () => {
        counter.textContent = `Hasta 50 caracteres (${inputDesc.value.length} / 50)`;
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('tarea-form-alert');
        alertEl.className = 'form-alert hidden';

        const usuario_id = parseInt(document.getElementById('tarea-usuario').value, 10);
        const sucursal_1_id = parseInt(document.getElementById('tarea-sucursal-1').value, 10);
        const sucursal_2_val = document.getElementById('tarea-sucursal-2').value;
        const sucursal_2_id = sucursal_2_val ? parseInt(sucursal_2_val, 10) : null;
        const tarea = inputDesc.value.trim();

        if (!usuario_id || !sucursal_1_id) {
          alertEl.textContent = 'Por favor complete todos los campos obligatorios (*)';
          alertEl.className = 'form-alert error';
          return;
        }

        if (tarea && tarea.length > 50) {
          alertEl.textContent = 'La descripción de la tarea no puede exceder los 50 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        try {
          const btnSubmit = form.querySelector('button[type="submit"]');
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Asignando...';

          await API.post('/tareas', {
            usuario_id,
            sucursal_1_id,
            sucursal_2_id,
            tarea: tarea || null
          });

          alertEl.textContent = '¡Tarea asignada con éxito!';
          alertEl.className = 'form-alert success';

          form.reset();
          if (counter) counter.textContent = 'Hasta 50 caracteres (0 / 50)';
          await this.cargarTareas();

          setTimeout(() => {
            alertEl.className = 'form-alert hidden';
          }, 3500);
        } catch (err) {
          alertEl.textContent = err.message || 'Error al asignar la tarea.';
          alertEl.className = 'form-alert error';
        } finally {
          const btnSubmit = form.querySelector('button[type="submit"]');
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Asignar Tarea';
        }
      };
    }

    const formEdit = document.getElementById('form-editar-tarea');
    const inputEditDesc = document.getElementById('edit-tarea-descripcion');
    const editCounter = document.getElementById('edit-tarea-char-counter');

    if (inputEditDesc && editCounter) {
      inputEditDesc.oninput = () => {
        editCounter.textContent = `Hasta 50 caracteres (${inputEditDesc.value.length} / 50)`;
      };
    }

    if (formEdit) {
      formEdit.onsubmit = async (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('edit-tarea-alert');
        alertEl.className = 'form-alert hidden';

        const usuario_id = parseInt(document.getElementById('edit-tarea-usuario').value, 10);
        const sucursal_1_id = parseInt(document.getElementById('edit-tarea-sucursal-1').value, 10);
        const sucursal_2_val = document.getElementById('edit-tarea-sucursal-2').value;
        const sucursal_2_id = sucursal_2_val ? parseInt(sucursal_2_val, 10) : null;
        const tarea = inputEditDesc.value.trim();
        const activo = document.getElementById('edit-tarea-activo').value === 'true';
        const completada = document.getElementById('edit-tarea-completada').value === 'true';

        if (!usuario_id || !sucursal_1_id) {
          alertEl.textContent = 'Por favor complete todos los campos obligatorios (*)';
          alertEl.className = 'form-alert error';
          return;
        }

        if (tarea && tarea.length > 50) {
          alertEl.textContent = 'La descripción de la tarea no puede superar 50 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        try {
          const btnSubmit = formEdit.querySelector('button[type="submit"]');
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Guardando...';

          await API.put(`/tareas/${this.currentEditingId}`, {
            usuario_id,
            sucursal_1_id,
            sucursal_2_id,
            tarea: tarea || null,
            activo,
            completada
          });

          this.cerrarModalEditar();
          await this.cargarTareas();
          if (this.currentSubtab === 'historial') {
            await this.cargarHistorial();
          }
          alert('Tarea actualizada exitosamente.');
        } catch (err) {
          alertEl.textContent = err.message || 'Error al actualizar la tarea.';
          alertEl.className = 'form-alert error';
        } finally {
          const btnSubmit = formEdit.querySelector('button[type="submit"]');
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Guardar Cambios';
        }
      };
    }
  },

  abrirModalEditar(id) {
    const tarea = this.tareas.find(t => t.id === id);
    if (!tarea) return;

    this.currentEditingId = id;

    const modal = document.getElementById('modal-editar-tarea');
    const selUser = document.getElementById('edit-tarea-usuario');
    const selSuc1 = document.getElementById('edit-tarea-sucursal-1');
    const selSuc2 = document.getElementById('edit-tarea-sucursal-2');
    const inputDesc = document.getElementById('edit-tarea-descripcion');
    const selActivo = document.getElementById('edit-tarea-activo');
    const selCompletada = document.getElementById('edit-tarea-completada');
    const counter = document.getElementById('edit-tarea-char-counter');
    const alertEl = document.getElementById('edit-tarea-alert');

    if (alertEl) alertEl.className = 'form-alert hidden';

    if (selUser) {
      selUser.innerHTML = '';
      this.usuarios.forEach(u => {
        selUser.innerHTML += `<option value="${u.id}">${u.nombre_completo} (${u.rol})</option>`;
      });
      selUser.value = tarea.usuario_id;
    }

    if (selSuc1) {
      selSuc1.innerHTML = '';
      this.sucursales.forEach(s => {
        selSuc1.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
      selSuc1.value = tarea.sucursal_1_id;
    }

    if (selSuc2) {
      selSuc2.innerHTML = '<option value="">-- Ninguna / Opcional --</option>';
      this.sucursales.forEach(s => {
        selSuc2.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
      selSuc2.value = tarea.sucursal_2_id || '';
    }

    if (inputDesc) {
      inputDesc.value = tarea.tarea || '';
      if (counter) counter.textContent = `Hasta 50 caracteres (${(tarea.tarea || '').length} / 50)`;
    }

    if (selActivo) {
      selActivo.value = tarea.activo ? 'true' : 'false';
    }

    if (selCompletada) {
      selCompletada.value = tarea.completada ? 'true' : 'false';
    }

    if (modal) modal.classList.remove('hidden');
  },

  cerrarModalEditar() {
    const modal = document.getElementById('modal-editar-tarea');
    if (modal) modal.classList.add('hidden');
    this.currentEditingId = null;
  },

  async toggleMarcarTarea(id, completada) {
    try {
      await API.patch(`/tareas/${id}/marcar`, { completada });
      await this.cargarTareas();
      if (this.currentSubtab === 'historial') {
        await this.cargarHistorial();
      }
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      alert('Error al actualizar estado: ' + (err.message || err));
      await this.cargarTareas();
    }
  },

  async confirmarEliminar(id, descripcion) {
    if (confirm(`¿Está seguro de eliminar la tarea "${descripcion}"? Esta acción no se puede deshacer.`)) {
      try {
        await API.delete(`/tareas/${id}`);
        await this.cargarTareas();
        if (this.currentSubtab === 'historial') {
          await this.cargarHistorial();
        }
        alert('Tarea eliminada exitosamente.');
      } catch (err) {
        alert('Error al eliminar tarea: ' + err.message);
      }
    }
  }
};
