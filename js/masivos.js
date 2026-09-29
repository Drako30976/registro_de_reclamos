const MasivosModule = {
  sucursales: [],
  masivosActivos: [],
  historialMasivos: [],
  currentEditingId: null,
  currentFinId: null,
  currentSubtab: 'informar',

  async init() {
    await Promise.all([
      this.cargarSucursales(),
      this.cargarMasivosActivos()
    ]);
    this.bindEvents();
    this.inicializarFechaCarga();
    if (this.currentSubtab === 'historial') {
      await this.cargarHistorial();
    }
  },

  inicializarFechaCarga() {
    const inputFecha = document.getElementById('masivo-fecha-inicio');
    if (inputFecha) {
      const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
      inputFecha.value = now.toISOString().slice(0, 10);
    }
  },

  async cargarSucursales() {
    try {
      const sucursales = await API.get('/catalogos/sucursales');
      this.sucursales = sucursales || [];
      this.poblarDropdownsSucursales();
    } catch (err) {
      console.error('Error al cargar sucursales en masivos:', err);
    }
  },

  poblarDropdownsSucursales() {
    const selCarga = document.getElementById('masivo-sucursal');
    const selEdit = document.getElementById('edit-masivo-sucursal');
    const selFiltro = document.getElementById('filtro-masivo-sucursal');

    if (selCarga) {
      selCarga.innerHTML = '<option value="">Todas las sucursales</option>';
      this.sucursales.forEach(s => {
        selCarga.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
    }

    if (selEdit) {
      selEdit.innerHTML = '<option value="">Todas las sucursales</option>';
      this.sucursales.forEach(s => {
        selEdit.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
    }

    if (selFiltro) {
      const currentVal = selFiltro.value;
      selFiltro.innerHTML = `
        <option value="">Todas</option>
        <option value="todas">Solo "Todas las sucursales"</option>
      `;
      this.sucursales.forEach(s => {
        selFiltro.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
      if (currentVal) selFiltro.value = currentVal;
    }
  },

  async cargarMasivosActivos() {
    const tbody = document.getElementById('tabla-masivos-activos-body');
    const contador = document.getElementById('masivos-activos-contador');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Cargando inconvenientes masivos...</td></tr>';

    try {
      const data = await API.get('/masivos/activos');
      this.masivosActivos = data || [];

      if (contador) {
        contador.textContent = `${this.masivosActivos.length} activos`;
      }

      this.renderTablaActivos();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error al cargar masivos: ${err.message}</td></tr>`;
    }
  },

  renderTablaActivos() {
    const tbody = document.getElementById('tabla-masivos-activos-body');
    if (!tbody) return;

    if (this.masivosActivos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center py-6 text-muted">No hay inconvenientes masivos activos actualmente.</td></tr>';
      return;
    }

    tbody.innerHTML = this.masivosActivos.map(m => {
      const danoTexto = m.caracteristicas_dano ? m.caracteristicas_dano : '<span class="text-muted font-sm">-</span>';
      const zonaTexto = m.zona_afectada ? m.zona_afectada : '<span class="text-muted font-sm">-</span>';
      const tiempoTexto = m.tiempo_resolucion ? m.tiempo_resolucion : '<span class="text-muted font-sm">-</span>';

      return `
        <tr>
          <td><strong>${m.fecha_inicio_fmt}</strong> hs</td>
          <td><span class="badge badge-secondary">${m.sucursal_nombre}</span></td>
          <td><strong style="color: #DC2626;">${m.servicio_afectado}</strong></td>
          <td>${danoTexto}</td>
          <td>${zonaTexto}</td>
          <td>${tiempoTexto}</td>
          <td>${m.creado_por_nombre || '-'}</td>
          <td class="table-actions">
            <button class="btn btn-sm btn-outline-primary mr-1" onclick="MasivosModule.abrirModalModificar(${m.id})">Modificar</button>
            <button class="btn btn-sm btn-success mr-1" onclick="MasivosModule.abrirModalFinalizar(${m.id})">Finalizar</button>
            <button class="btn btn-sm btn-outline-danger" onclick="MasivosModule.eliminarMasivo(${m.id})">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  getHistorialQueryParams() {
    const params = new URLSearchParams();
    const fechaDesde = document.getElementById('filtro-masivo-fecha-desde')?.value;
    const fechaHasta = document.getElementById('filtro-masivo-fecha-hasta')?.value;
    const sucursalId = document.getElementById('filtro-masivo-sucursal')?.value;

    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (sucursalId) params.append('sucursal_id', sucursalId);

    return params;
  },

  async cargarHistorial() {
    const tbody = document.getElementById('tabla-historial-masivos-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="12" class="text-center py-4 text-muted">Cargando historial de masivos...</td></tr>';

    try {
      const params = this.getHistorialQueryParams();
      const qs = params.toString() ? `?${params.toString()}` : '';
      const data = await API.get(`/masivos/historial${qs}`);
      this.historialMasivos = data || [];
      this.renderTablaHistorial();
    } catch (err) {
      console.error('Error al consultar historial de masivos:', err);
      tbody.innerHTML = `<tr><td colspan="12" class="text-center text-danger py-4">Error al cargar historial: ${err.message}</td></tr>`;
    }
  },

  renderTablaHistorial() {
    const tbody = document.getElementById('tabla-historial-masivos-body');
    if (!tbody) return;

    if (this.historialMasivos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="12" class="text-center py-6 text-muted">No se encontraron inconvenientes con los filtros seleccionados.</td></tr>';
      return;
    }

    tbody.innerHTML = this.historialMasivos.map(m => {
      const esActivo = m.estado === 'Activo';
      const badgeEstado = esActivo
        ? '<span class="badge badge-danger">Activo</span>'
        : '<span class="badge badge-success">Finalizado</span>';

      return `
        <tr>
          <td><strong>${m.fecha_inicio_fmt}</strong> hs</td>
          <td><span class="badge badge-secondary">${m.sucursal_nombre}</span></td>
          <td><strong>${m.servicio_afectado}</strong></td>
          <td>${m.caracteristicas_dano || '-'}</td>
          <td>${m.zona_afectada}</td>
          <td>${m.tiempo_resolucion}</td>
          <td>${badgeEstado}</td>
          <td>${m.creado_por_nombre || '-'}</td>
          <td>${m.fecha_fin_fmt ? m.fecha_fin_fmt + ' hs' : '-'}</td>
          <td>${m.finalizado_por_nombre || '-'}</td>
          <td>${m.responsable_solucion}</td>
          <td>${m.arreglo}</td>
        </tr>
      `;
    }).join('');
  },

  async eliminarMasivo(id) {
    if (!confirm('¿Está seguro de que desea eliminar este inconveniente masivo?')) return;
    try {
      await API.delete(`/masivos/${id}`);
      await this.cargarMasivosActivos();
      if (this.currentSubtab === 'historial') {
        await this.cargarHistorial();
      }
      if (typeof ReclamosModule !== 'undefined' && ReclamosModule.cargarMasivosBanner) {
        ReclamosModule.cargarMasivosBanner();
      }
    } catch (err) {
      alert('Error al eliminar inconveniente masivo: ' + err.message);
    }
  },

  async descargarReportePDF() {
    const btn = document.getElementById('btn-emitir-reporte-masivos');
    const originalText = btn ? btn.innerHTML : '';
    try {
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-icon">⏳</span> Generando PDF...';
      }

      const params = this.getHistorialQueryParams();
      const qs = params.toString() ? `?${params.toString()}` : '';
      const url = `/api/reportes/masivos-pdf${qs}`;

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
      a.download = `Reporte_Masivos_${fechaHoy}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      a.remove();
    } catch (err) {
      console.error('Error al emitir reporte de masivos PDF:', err);
      alert('Error al emitir reporte PDF: ' + err.message);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  },

  abrirModalModificar(id) {
    const masivo = this.masivosActivos.find(m => m.id === id);
    if (!masivo) return;

    this.currentEditingId = id;

    const modal = document.getElementById('modal-modificar-masivo');
    const alertEl = document.getElementById('edit-masivo-alert');
    const inputFecha = document.getElementById('edit-masivo-fecha-inicio');
    const selSucursal = document.getElementById('edit-masivo-sucursal');
    const inputServicio = document.getElementById('edit-masivo-servicio');
    const inputDano = document.getElementById('edit-masivo-caracteristicas-dano');
    const inputZona = document.getElementById('edit-masivo-zona');
    const inputTiempo = document.getElementById('edit-masivo-tiempo-resolucion');

    if (alertEl) alertEl.className = 'form-alert hidden';

    if (inputFecha) inputFecha.value = masivo.fecha_inicio_input || '';
    if (selSucursal) selSucursal.value = masivo.sucursal_id || '';
    if (inputServicio) inputServicio.value = masivo.servicio_afectado || '';
    if (inputDano) inputDano.value = masivo.caracteristicas_dano || '';
    if (inputZona) inputZona.value = masivo.zona_afectada || '';
    if (inputTiempo) inputTiempo.value = masivo.tiempo_resolucion || '';

    if (modal) modal.classList.remove('hidden');
  },

  cerrarModalModificar() {
    const modal = document.getElementById('modal-modificar-masivo');
    if (modal) modal.classList.add('hidden');
    this.currentEditingId = null;
  },

  abrirModalFinalizar(id) {
    const masivo = this.masivosActivos.find(m => m.id === id);
    if (!masivo) return;

    this.currentFinId = id;

    const modal = document.getElementById('modal-finalizar-masivo');
    const alertEl = document.getElementById('fin-masivo-alert');
    const resumenEl = document.getElementById('fin-masivo-resumen');
    const inputFecha = document.getElementById('fin-masivo-fecha');
    const inputResp = document.getElementById('fin-masivo-responsable');
    const inputArreglo = document.getElementById('fin-masivo-arreglo');

    if (alertEl) alertEl.className = 'form-alert hidden';

    if (resumenEl) {
      resumenEl.innerHTML = `<strong>Inconveniente:</strong> ${masivo.servicio_afectado} | <strong>Sucursal:</strong> ${masivo.sucursal_nombre} | <strong>Inicio:</strong> ${masivo.fecha_inicio_fmt} hs`;
    }

    if (inputFecha) {
      const now = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
      inputFecha.value = now.toISOString().slice(0, 16);
    }

    if (inputResp) inputResp.value = '';
    if (inputArreglo) inputArreglo.value = '';

    if (modal) modal.classList.remove('hidden');
  },

  cerrarModalFinalizar() {
    const modal = document.getElementById('modal-finalizar-masivo');
    if (modal) modal.classList.add('hidden');
    this.currentFinId = null;
  },

  bindEvents() {
    const subtabBtnInformar = document.getElementById('subtab-btn-informar-masivo');
    const subtabBtnHistorial = document.getElementById('subtab-btn-historial-masivos');
    const secInformar = document.getElementById('masivos-sec-informar');
    const secHistorial = document.getElementById('masivos-sec-historial');

    if (subtabBtnInformar && subtabBtnHistorial && secInformar && secHistorial) {
      subtabBtnInformar.onclick = () => {
        this.currentSubtab = 'informar';
        subtabBtnInformar.classList.add('active');
        subtabBtnHistorial.classList.remove('active');
        secInformar.classList.remove('hidden');
        secHistorial.classList.add('hidden');
      };

      subtabBtnHistorial.onclick = () => {
        this.currentSubtab = 'historial';
        subtabBtnHistorial.classList.add('active');
        subtabBtnInformar.classList.remove('active');
        secHistorial.classList.remove('hidden');
        secInformar.classList.add('hidden');
        this.cargarHistorial();
      };
    }

    const btnAplicarFiltros = document.getElementById('btn-aplicar-filtros-masivos');
    const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros-masivos');
    const btnReportePdf = document.getElementById('btn-emitir-reporte-masivos');

    if (btnAplicarFiltros) {
      btnAplicarFiltros.onclick = () => {
        this.cargarHistorial();
      };
    }

    if (btnLimpiarFiltros) {
      btnLimpiarFiltros.onclick = () => {
        const fd = document.getElementById('filtro-masivo-fecha-desde');
        const fh = document.getElementById('filtro-masivo-fecha-hasta');
        const fs = document.getElementById('filtro-masivo-sucursal');
        if (fd) fd.value = '';
        if (fh) fh.value = '';
        if (fs) fs.value = '';
        this.cargarHistorial();
      };
    }

    if (btnReportePdf) {
      btnReportePdf.onclick = () => {
        this.descargarReportePDF();
      };
    }

    const formCargar = document.getElementById('form-cargar-masivo');
    if (formCargar) {
      formCargar.onsubmit = async (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('masivo-form-alert');
        alertEl.className = 'form-alert hidden';

        const fechaVal = document.getElementById('masivo-fecha-inicio').value;
        const sucursal_val = document.getElementById('masivo-sucursal').value;
        const sucursal_id = sucursal_val ? parseInt(sucursal_val, 10) : null;
        const servicio_afectado = document.getElementById('masivo-servicio').value.trim().toUpperCase();
        const caracteristicas_dano = document.getElementById('masivo-caracteristicas-dano').value.trim();
        const zona_afectada = document.getElementById('masivo-zona').value.trim().toUpperCase();
        const tiempo_resolucion = document.getElementById('masivo-tiempo-resolucion').value.trim();

        if (!fechaVal || !servicio_afectado) {
          alertEl.textContent = 'Por favor complete todos los campos obligatorios (*)';
          alertEl.className = 'form-alert error';
          return;
        }

        // Se toma automáticamente el horario actual del reloj al momento de ingresar el masivo
        let fecha_inicio = fechaVal;
        if (fechaVal && !fechaVal.includes('T')) {
          const now = new Date();
          const hh = String(now.getHours()).padStart(2, '0');
          const mm = String(now.getMinutes()).padStart(2, '0');
          const ss = String(now.getSeconds()).padStart(2, '0');
          fecha_inicio = `${fechaVal}T${hh}:${mm}:${ss}`;
        }

        if (servicio_afectado.length > 50) {
          alertEl.textContent = 'El servicio afectado no puede superar 50 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (caracteristicas_dano && caracteristicas_dano.length > 255) {
          alertEl.textContent = 'Las características del daño no pueden superar 255 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (zona_afectada && zona_afectada.length > 100) {
          alertEl.textContent = 'La zona afectada no puede superar 100 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (tiempo_resolucion && tiempo_resolucion.length > 20) {
          alertEl.textContent = 'El tiempo de resolución no puede superar 20 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        try {
          const btnSubmit = formCargar.querySelector('button[type="submit"]');
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Cargando...';

          await API.post('/masivos', {
            fecha_inicio,
            sucursal_id,
            servicio_afectado,
            caracteristicas_dano: caracteristicas_dano || null,
            zona_afectada: zona_afectada || null,
            tiempo_resolucion: tiempo_resolucion || null
          });

          alertEl.textContent = '¡Inconveniente masivo registrado con éxito!';
          alertEl.className = 'form-alert success';

          formCargar.reset();
          this.inicializarFechaCarga();
          await this.cargarMasivosActivos();

          setTimeout(() => {
            alertEl.className = 'form-alert hidden';
          }, 3500);
        } catch (err) {
          alertEl.textContent = err.message || 'Error al cargar inconveniente masivo.';
          alertEl.className = 'form-alert error';
        } finally {
          const btnSubmit = formCargar.querySelector('button[type="submit"]');
          btnSubmit.disabled = false;
          btnSubmit.innerHTML = '<span class="btn-icon">🚨</span> Cargar Masivo';
        }
      };
    }

    const formModificar = document.getElementById('form-modificar-masivo');
    if (formModificar) {
      formModificar.onsubmit = async (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('edit-masivo-alert');
        alertEl.className = 'form-alert hidden';

        const fecha_inicio = document.getElementById('edit-masivo-fecha-inicio').value;
        const sucursal_val = document.getElementById('edit-masivo-sucursal').value;
        const sucursal_id = sucursal_val ? parseInt(sucursal_val, 10) : null;
        const servicio_afectado = document.getElementById('edit-masivo-servicio').value.trim().toUpperCase();
        const caracteristicas_dano = document.getElementById('edit-masivo-caracteristicas-dano').value.trim();
        const zona_afectada = document.getElementById('edit-masivo-zona').value.trim().toUpperCase();
        const tiempo_resolucion = document.getElementById('edit-masivo-tiempo-resolucion').value.trim();

        if (!fecha_inicio || !servicio_afectado) {
          alertEl.textContent = 'Por favor complete todos los campos obligatorios (*)';
          alertEl.className = 'form-alert error';
          return;
        }

        if (servicio_afectado.length > 50) {
          alertEl.textContent = 'El servicio afectado no puede superar 50 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (caracteristicas_dano && caracteristicas_dano.length > 255) {
          alertEl.textContent = 'Las características del daño no pueden superar 255 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (zona_afectada && zona_afectada.length > 100) {
          alertEl.textContent = 'La zona afectada no puede superar 100 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (tiempo_resolucion && tiempo_resolucion.length > 20) {
          alertEl.textContent = 'El tiempo de resolución no puede superar 20 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        try {
          const btnSubmit = formModificar.querySelector('button[type="submit"]');
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Guardando...';

          await API.put(`/masivos/${this.currentEditingId}`, {
            fecha_inicio,
            sucursal_id,
            servicio_afectado,
            caracteristicas_dano: caracteristicas_dano || null,
            zona_afectada: zona_afectada || null,
            tiempo_resolucion: tiempo_resolucion || null
          });

          this.cerrarModalModificar();
          await this.cargarMasivosActivos();
          if (this.currentSubtab === 'historial') {
            await this.cargarHistorial();
          }
          alert('Inconveniente masivo modificado exitosamente.');
        } catch (err) {
          alertEl.textContent = err.message || 'Error al modificar inconveniente masivo.';
          alertEl.className = 'form-alert error';
        } finally {
          const btnSubmit = formModificar.querySelector('button[type="submit"]');
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Guardar Modificaciones';
        }
      };
    }

    const formFinalizar = document.getElementById('form-finalizar-masivo');
    if (formFinalizar) {
      formFinalizar.onsubmit = async (e) => {
        e.preventDefault();
        const alertEl = document.getElementById('fin-masivo-alert');
        alertEl.className = 'form-alert hidden';

        const fecha_fin = document.getElementById('fin-masivo-fecha').value;
        const responsable_solucion = document.getElementById('fin-masivo-responsable').value.trim();
        const arreglo = document.getElementById('fin-masivo-arreglo').value.trim();

        if (!fecha_fin) {
          alertEl.textContent = 'Por favor indique la fecha de finalización.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (responsable_solucion && responsable_solucion.length > 20) {
          alertEl.textContent = 'El responsable no puede superar 20 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        if (arreglo && arreglo.length > 50) {
          alertEl.textContent = 'El detalle del arreglo no puede superar 50 caracteres.';
          alertEl.className = 'form-alert error';
          return;
        }

        try {
          const btnSubmit = formFinalizar.querySelector('button[type="submit"]');
          btnSubmit.disabled = true;
          btnSubmit.textContent = 'Finalizando...';

          await API.patch(`/masivos/${this.currentFinId}/finalizar`, {
            fecha_fin,
            responsable_solucion: responsable_solucion || null,
            arreglo: arreglo || null
          });

          this.cerrarModalFinalizar();
          await this.cargarMasivosActivos();
          if (this.currentSubtab === 'historial') {
            await this.cargarHistorial();
          }
          alert('Inconveniente masivo finalizado exitosamente.');
        } catch (err) {
          alertEl.textContent = err.message || 'Error al finalizar inconveniente masivo.';
          alertEl.className = 'form-alert error';
        } finally {
          const btnSubmit = formFinalizar.querySelector('button[type="submit"]');
          btnSubmit.disabled = false;
          btnSubmit.textContent = 'Confirmar Finalización';
        }
      };
    }
  }
};
