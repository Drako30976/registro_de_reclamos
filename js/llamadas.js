const LlamadasModule = {
  arbolEstructura: [],
  sucursales: [],
  misTareas: [],

  getStorageKey() {
    const user = API.getUser();
    return user ? `llamadas_recientes_${user.id}` : 'llamadas_recientes';
  },

  cargarLlamadasAlmacenadas() {
    try {
      const data = localStorage.getItem(this.getStorageKey());
      this.llamadasRecientes = data ? JSON.parse(data) : [];
    } catch {
      this.llamadasRecientes = [];
    }
  },

  guardarLlamadasAlmacenadas() {
    try {
      localStorage.setItem(this.getStorageKey(), JSON.stringify(this.llamadasRecientes));
    } catch (e) {
      console.error('Error al guardar llamadas en cache local:', e);
    }
  },

  async init() {
    this.cargarLlamadasAlmacenadas();
    this.renderPreviewLlamadas();
    await Promise.all([
      this.loadCatalogos(),
      this.cargarMisTareas(),
      this.cargarMasivosBanner()
    ]);
    this.bindEvents();
  },

  async cargarMasivosBanner() {
    const bannerBadge = document.getElementById('masivos-banner-badge-llamadas');
    const bannerContent = document.getElementById('masivos-banner-content-llamadas');
    const bannerCard = document.getElementById('sec-inconvenientes-masivos-llamadas');
    if (!bannerContent) return;

    try {
      const data = await API.get('/masivos/vigentes');
      const masivos = data || [];
      const activos = masivos.filter(m => m.estado === 'Activo');

      if (bannerBadge) {
        if (activos.length > 0) {
          bannerBadge.className = 'badge badge-danger';
          bannerBadge.textContent = `${activos.length} activo${activos.length > 1 ? 's' : ''}`;
        } else {
          bannerBadge.className = 'badge badge-secondary';
          bannerBadge.textContent = 'Sin inconvenientes activos';
        }
      }

      if (bannerCard) {
        if (activos.length > 0) {
          bannerCard.classList.remove('sin-masivos');
        } else {
          bannerCard.classList.add('sin-masivos');
        }
      }

      if (masivos.length === 0) {
        bannerContent.innerHTML = `
          <div class="text-center py-2 text-muted">
            <span style="color: #10B981; font-weight: bold;">✓</span> Sin inconvenientes activos
          </div>
        `;
        return;
      }

      bannerContent.innerHTML = masivos.map(m => {
        const esActivo = m.estado === 'Activo';
        const badgeEstado = esActivo 
          ? '<span class="badge badge-danger">Activo</span>' 
          : '<span class="badge badge-success">Finalizado</span>';

        return `
          <details class="masivo-accordion-item ${esActivo ? 'masivo-activo' : 'masivo-finalizado'}">
            <summary class="masivo-accordion-header">
              <div class="masivo-accordion-left">
                <span class="badge badge-secondary masivo-sucursal-badge">${m.sucursal_nombre}</span>
                <strong class="masivo-servicio-title">${m.servicio_afectado}</strong>
              </div>
              <div class="masivo-accordion-right">
                ${badgeEstado}
                <span class="masivo-accordion-arrow">▾</span>
              </div>
            </summary>
            <div class="masivo-accordion-content">
              <div class="masivo-detail-grid">
                <div class="masivo-detail-item">
                  <span class="detail-label">Fecha Inicio:</span>
                  <span><strong>${m.fecha_inicio_fmt}</strong> hs</span>
                </div>
                <div class="masivo-detail-item">
                  <span class="detail-label">Zona Afectada:</span>
                  <span class="masivo-zona-val">${m.zona_afectada}</span>
                </div>
                <div class="masivo-detail-item">
                  <span class="detail-label">Tiempo Estimado:</span>
                  <span>${m.tiempo_resolucion}</span>
                </div>
                <div class="masivo-detail-item">
                  <span class="detail-label">Informado por:</span>
                  <span>${m.creado_por_nombre || '-'}</span>
                </div>
              </div>

              ${m.caracteristicas_dano && m.caracteristicas_dano !== '-' ? `
                <div class="masivo-detail-box masivo-dano-box">
                  <strong>Características del Daño:</strong>
                  <div>${m.caracteristicas_dano}</div>
                </div>
              ` : ''}

              ${!esActivo ? `
                <div class="masivo-detail-box masivo-resuelto-box">
                  <div class="masivo-detail-grid">
                    <div class="masivo-detail-item">
                      <span class="detail-label">Finalizado:</span>
                      <span><strong>${m.fecha_fin_fmt || '-'}</strong> hs</span>
                    </div>
                    <div class="masivo-detail-item">
                      <span class="detail-label">Finalizado por:</span>
                      <span>${m.finalizado_por_nombre || '-'}</span>
                    </div>
                    <div class="masivo-detail-item">
                      <span class="detail-label">Responsable:</span>
                      <span>${m.responsable_solucion}</span>
                    </div>
                    <div class="masivo-detail-item">
                      <span class="detail-label">Arreglo:</span>
                      <span>${m.arreglo}</span>
                    </div>
                  </div>
                </div>
              ` : ''}
            </div>
          </details>
        `;
      }).join('');
    } catch (err) {
      console.error('Error al cargar masivos en llamadas:', err);
      bannerContent.innerHTML = `
        <div class="text-center py-2 text-muted">
          <span>✓</span> Sin inconvenientes activos
        </div>
      `;
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
      console.error('Error al cargar catálogos de llamadas:', error);
    }
  },

  populateSucursales() {
    const select = document.getElementById('llamada-sucursal');
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
    const select = document.getElementById('llamada-tipo');
    if (!select) return;
    select.innerHTML = '<option value="">-- Seleccione Tipo de Consulta --</option>';
    this.arbolEstructura.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = t.contenido;
      select.appendChild(opt);
    });

    this.resetSelect('llamada-caracteristica', '-- Seleccione Característica --', true);
    this.resetSelect('llamada-definicion', '-- Seleccione Definición --', true);
    this.resetSelect('llamada-finalizacion', '-- Seleccione Finalización --', true);
  },

  resetSelect(elementId, placeholder, disabled = false) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.innerHTML = `<option value="">${placeholder}</option>`;
    el.disabled = disabled;
  },

  bindEvents() {
    const tipoSelect = document.getElementById('llamada-tipo');
    const carSelect = document.getElementById('llamada-caracteristica');
    const defSelect = document.getElementById('llamada-definicion');
    const form = document.getElementById('form-gestion-llamada');

    if (tipoSelect) {
      tipoSelect.onchange = () => {
        const tipoId = parseInt(tipoSelect.value, 10);
        this.resetSelect('llamada-caracteristica', '-- Seleccione Característica --', true);
        this.resetSelect('llamada-definicion', '-- Seleccione Definición --', true);
        this.resetSelect('llamada-finalizacion', '-- Seleccione Finalización --', true);

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

    if (carSelect) {
      carSelect.onchange = () => {
        const tipoId = parseInt(tipoSelect.value, 10);
        const carId = parseInt(carSelect.value, 10);

        this.resetSelect('llamada-definicion', '-- Seleccione Definición --', true);
        this.resetSelect('llamada-finalizacion', '-- Seleccione Finalización --', true);

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

    if (defSelect) {
      defSelect.onchange = () => {
        const tipoId = parseInt(tipoSelect.value, 10);
        const carId = parseInt(carSelect.value, 10);
        const defId = parseInt(defSelect.value, 10);
        const finSelect = document.getElementById('llamada-finalizacion');

        this.resetSelect('llamada-finalizacion', '-- Seleccione Finalización --', true);

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

    const comentarioInput = document.getElementById('llamada-comentario');
    const comentarioCounter = document.getElementById('llamada-comentario-counter');
    if (comentarioInput && comentarioCounter) {
      comentarioInput.oninput = () => {
        const len = comentarioInput.value.length;
        comentarioCounter.textContent = `Opcional - Hasta 500 caracteres (${len} / 500)`;
      };
    }

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await this.submitLlamada();
      };
    }
  },

  async submitLlamada() {
    const alertEl = document.getElementById('llamada-form-alert');
    alertEl.className = 'form-alert hidden';

    const sucursal_id = document.getElementById('llamada-sucursal').value;
    const numero_cliente = document.getElementById('llamada-cliente').value.trim();
    const tipo_consulta_id = document.getElementById('llamada-tipo').value;
    const caracteristica_id = document.getElementById('llamada-caracteristica').value;
    const definicion_id = document.getElementById('llamada-definicion').value;
    const finalizacion_id = document.getElementById('llamada-finalizacion').value;
    const comentario = document.getElementById('llamada-comentario').value.trim();

    if (!sucursal_id || !numero_cliente || !tipo_consulta_id || !caracteristica_id || !definicion_id || !finalizacion_id) {
      this.showAlert('Los campos Sucursal, Número de Cliente, Tipo de Consulta, Características, Definición y Finalización son obligatorios.', 'error');
      return;
    }

    if (numero_cliente.length > 15) {
      this.showAlert('El número de cliente no puede superar los 15 caracteres.', 'error');
      return;
    }

    if (comentario.length > 500) {
      this.showAlert('El comentario no puede superar los 500 caracteres.', 'error');
      return;
    }

    const payload = {
      sucursal_id: parseInt(sucursal_id, 10),
      numero_cliente,
      tipo_consulta_id: parseInt(tipo_consulta_id, 10),
      caracteristica_id: parseInt(caracteristica_id, 10),
      definicion_id: parseInt(definicion_id, 10),
      finalizacion_id: parseInt(finalizacion_id, 10),
      comentario: comentario || null
    };

    try {
      const submitBtn = document.querySelector('#form-gestion-llamada button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const res = await API.post('/llamadas', payload);
      this.showAlert('Llamada guardada exitosamente.', 'success');

      if (res.llamada) {
        this.llamadasRecientes.unshift(res.llamada);
        if (this.llamadasRecientes.length > 10) {
          this.llamadasRecientes.pop();
        }
        this.guardarLlamadasAlmacenadas();
        this.renderPreviewLlamadas();
      }

      this.resetFormulario();
      if (typeof LlamadasHistorialModule !== 'undefined' && LlamadasHistorialModule.cargarLlamadas) {
        LlamadasHistorialModule.cargarLlamadas();
      }
    } catch (err) {
      this.showAlert(err.message || 'Error al guardar la llamada.', 'error');
    } finally {
      const submitBtn = document.querySelector('#form-gestion-llamada button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
    }
  },

  resetFormulario() {
    const form = document.getElementById('form-gestion-llamada');
    if (form) form.reset();

    this.resetSelect('llamada-caracteristica', '-- Seleccione Característica --', true);
    this.resetSelect('llamada-definicion', '-- Seleccione Definición --', true);
    this.resetSelect('llamada-finalizacion', '-- Seleccione Finalización --', true);

    const comentarioCounter = document.getElementById('llamada-comentario-counter');
    if (comentarioCounter) {
      comentarioCounter.textContent = 'Opcional - Hasta 500 caracteres (0 / 500)';
    }
  },

  showAlert(message, type) {
    const alertEl = document.getElementById('llamada-form-alert');
    if (!alertEl) return;
    alertEl.className = `form-alert alert-${type}`;
    alertEl.textContent = message;
    alertEl.classList.remove('hidden');

    if (type === 'success') {
      setTimeout(() => {
        alertEl.classList.add('hidden');
      }, 4000);
    }
  },

  renderPreviewLlamadas() {
    const tbody = document.getElementById('tabla-preview-body-llamadas');
    const badge = document.getElementById('preview-contador-llamadas');
    if (!tbody) return;

    if (badge) {
      badge.textContent = `${this.llamadasRecientes.length} llamada${this.llamadasRecientes.length !== 1 ? 's' : ''}`;
    }

    if (this.llamadasRecientes.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4 text-muted">Aún no se han cargado llamadas en esta sesión.</td></tr>';
      return;
    }

    tbody.innerHTML = this.llamadasRecientes.map(r => {
      const fechaObj = new Date(r.fecha || r.created_at);
      const fechaFmt = fechaObj.toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const horaFmt = fechaObj.toLocaleTimeString('es-AR', {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <tr>
          <td><span class="font-bold">${fechaFmt}</span> <small class="text-muted">${horaFmt} hs</small></td>
          <td><span class="badge badge-secondary">${r.sucursal || '-'}</span></td>
          <td>${r.asesor || '-'}</td>
          <td><strong style="color: #0D9488;">${r.numero_cliente}</strong></td>
          <td>${r.tipo_consulta || '-'}</td>
          <td>${r.caracteristica || '-'}</td>
          <td>${r.definicion || '-'}</td>
          <td>${r.finalizacion || '-'}</td>
          <td class="cell-comentario">${r.comentario ? `<span title="${r.comentario.replace(/"/g, '&quot;')}">${r.comentario}</span>` : '<span class="text-muted">-</span>'}</td>
        </tr>
      `;
    }).join('');
  },

  async cargarMisTareas() {
    const container = document.getElementById('mis-tareas-body-llamadas');
    const badge = document.getElementById('mis-tareas-badge-llamadas');
    if (!container) return;

    try {
      const data = await API.get('/tareas/mis-tareas');
      this.misTareas = data.filter(t => t.vigente);

      if (badge) {
        badge.textContent = this.misTareas.length;
        badge.className = this.misTareas.length > 0 ? 'badge badge-warning' : 'badge badge-info';
      }

      if (this.misTareas.length === 0) {
        container.innerHTML = `
          <div class="text-center py-3 text-muted">
            <span style="color: #10B981; font-weight: bold;">✓</span> No tienes tareas asignadas hoy
          </div>
        `;
        return;
      }

      container.innerHTML = this.misTareas.map(t => {
        return `
          <div class="mis-tareas-item ${t.completada ? 'tarea-completada' : ''}">
            <div class="mis-tareas-subgrupo">
              <span class="mis-tareas-subgrupo-titulo">
                <span>🏢</span> SUCURSALES ASIGNADAS
              </span>
              <div class="mis-tareas-sucursales-tags">
                <span class="badge badge-secondary">${t.sucursal_1_nombre}</span>
                ${t.sucursal_2_nombre ? `<span class="badge badge-secondary">${t.sucursal_2_nombre}</span>` : ''}
              </div>
            </div>

            <div class="mis-tareas-subgrupo">
              <span class="mis-tareas-subgrupo-titulo">
                <span>📝</span> TAREA DEL DÍA
              </span>
              <div class="tarea-diaria-row">
                <span class="tarea-diaria-texto">${t.tarea || 'Atención general'}</span>
                <span class="badge ${t.completada ? 'badge-success' : 'badge-warning'}">
                  ${t.completada ? '✓ Completada' : '⏳ Pendiente'}
                </span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    } catch (err) {
      console.error('Error al cargar mis tareas en llamadas:', err);
      container.innerHTML = '<div class="text-center py-2 text-muted">Error al cargar tareas</div>';
    }
  }
};

const LlamadasHistorialModule = {
  llamadas: [],
  catalogos: {
    sucursales: [],
    tipos: [],
    usuarios: []
  },
  currentEditingId: null,

  async init() {
    await this.loadFilterOptions();
    this.bindEvents();
  },

  async loadFilterOptions() {
    try {
      const [sucursales, tipos, usuarios] = await Promise.all([
        API.get('/catalogos/sucursales'),
        API.get('/catalogos/estructura'),
        API.get('/catalogos/asesores').catch(() => [])
      ]);

      this.catalogos.sucursales = sucursales;
      this.catalogos.tipos = tipos;
      this.catalogos.usuarios = usuarios;

      this.populateFilterDropdowns();
    } catch (err) {
      console.error('Error al cargar opciones de filtro de llamadas:', err);
    }
  },

  populateFilterDropdowns() {
    const selSucursal = document.getElementById('filtro-llamada-sucursal');
    const selTipo = document.getElementById('filtro-llamada-tipo');
    const selAsesor = document.getElementById('filtro-llamada-asesor');

    if (selSucursal) {
      selSucursal.innerHTML = '<option value="">Todas las sucursales</option>';
      this.catalogos.sucursales.forEach(s => {
        selSucursal.innerHTML += `<option value="${s.id}">${s.nombre}</option>`;
      });
    }

    if (selTipo) {
      selTipo.innerHTML = '<option value="">Todos los tipos</option>';
      this.catalogos.tipos.forEach(t => {
        selTipo.innerHTML += `<option value="${t.id}">${t.contenido}</option>`;
      });
    }

    if (selAsesor) {
      selAsesor.innerHTML = '<option value="">Todos los asesores</option>';
      this.catalogos.usuarios.forEach(u => {
        selAsesor.innerHTML += `<option value="${u.id}">${u.nombre_completo}</option>`;
      });
    }

    this.actualizarOpcionesCaracteristicas();
    this.actualizarOpcionesDefiniciones();
    this.actualizarOpcionesFinalizaciones();
  },

  actualizarOpcionesCaracteristicas(tipoId = null, selectedCarId = null) {
    const selCar = document.getElementById('filtro-llamada-caracteristica');
    if (!selCar) return;

    let cars = [];
    if (tipoId) {
      const tipo = this.catalogos.tipos.find(t => t.id === tipoId);
      cars = tipo ? (tipo.caracteristicas || []) : [];
    } else {
      this.catalogos.tipos.forEach(t => {
        (t.caracteristicas || []).forEach(c => cars.push(c));
      });
    }

    selCar.innerHTML = '<option value="">Todas las características</option>';
    cars.forEach(c => {
      selCar.innerHTML += `<option value="${c.id}" ${c.id === selectedCarId ? 'selected' : ''}>${c.contenido}</option>`;
    });
    if (!selectedCarId) selCar.value = '';
  },

  actualizarOpcionesDefiniciones(tipoId = null, carId = null, selectedDefId = null) {
    const selDef = document.getElementById('filtro-llamada-definicion');
    if (!selDef) return;

    let defs = [];
    if (carId) {
      for (const t of this.catalogos.tipos) {
        const c = (t.caracteristicas || []).find(item => item.id === carId);
        if (c) {
          defs = c.definiciones || [];
          break;
        }
      }
    } else if (tipoId) {
      const tipo = this.catalogos.tipos.find(t => t.id === tipoId);
      if (tipo) {
        (tipo.caracteristicas || []).forEach(c => {
          (c.definiciones || []).forEach(d => defs.push(d));
        });
      }
    } else {
      this.catalogos.tipos.forEach(t => {
        (t.caracteristicas || []).forEach(c => {
          (c.definiciones || []).forEach(d => defs.push(d));
        });
      });
    }

    selDef.innerHTML = '<option value="">Todas las definiciones</option>';
    defs.forEach(d => {
      selDef.innerHTML += `<option value="${d.id}" ${d.id === selectedDefId ? 'selected' : ''}>${d.contenido}</option>`;
    });
    if (!selectedDefId) selDef.value = '';
  },

  actualizarOpcionesFinalizaciones(tipoId = null, carId = null, defId = null, selectedFin = null) {
    const selFin = document.getElementById('filtro-llamada-finalizacion');
    if (!selFin) return;

    selFin.innerHTML = '<option value="">Todas las finalizaciones</option>';

    if (defId) {
      let finList = [];
      for (const t of this.catalogos.tipos) {
        for (const c of (t.caracteristicas || [])) {
          const d = (c.definiciones || []).find(item => item.id === defId);
          if (d) {
            finList = d.finalizaciones || [];
            break;
          }
        }
        if (finList.length > 0) break;
      }
      finList.forEach(f => {
        selFin.innerHTML += `<option value="${f.id}" ${f.id === selectedFin ? 'selected' : ''}>${f.contenido}</option>`;
      });
    } else {
      let finSet = new Map();
      this.catalogos.tipos.forEach(t => {
        (t.caracteristicas || []).forEach(c => {
          (c.definiciones || []).forEach(d => {
            (d.finalizaciones || []).forEach(f => {
              if (!finSet.has(f.id)) {
                finSet.set(f.id, f);
              }
            });
          });
        });
      });
      finSet.forEach(f => {
        selFin.innerHTML += `<option value="${f.id}" ${f.id === selectedFin ? 'selected' : ''}>${f.contenido}</option>`;
      });
    }

    if (!selectedFin) selFin.value = '';
  },

  bindEvents() {
    const btnFiltrar = document.getElementById('btn-aplicar-filtros-llamadas');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros-llamadas');
    const btnReporte = document.getElementById('btn-emitir-reporte-llamadas');

    const selTipo = document.getElementById('filtro-llamada-tipo');
    const selCar = document.getElementById('filtro-llamada-caracteristica');
    const selDef = document.getElementById('filtro-llamada-definicion');

    if (btnFiltrar) {
      btnFiltrar.onclick = () => this.cargarLlamadas();
    }

    if (btnLimpiar) {
      btnLimpiar.onclick = () => {
        document.getElementById('filtro-llamada-fecha-desde').value = '';
        document.getElementById('filtro-llamada-fecha-hasta').value = '';
        document.getElementById('filtro-llamada-sucursal').value = '';
        document.getElementById('filtro-llamada-tipo').value = '';
        document.getElementById('filtro-llamada-asesor').value = '';
        document.getElementById('filtro-llamada-cliente').value = '';

        this.actualizarOpcionesCaracteristicas(null);
        this.actualizarOpcionesDefiniciones(null, null);
        this.actualizarOpcionesFinalizaciones(null, null, null);

        this.cargarLlamadas();
      };
    }

    if (selTipo) {
      selTipo.onchange = () => {
        const tipoId = parseInt(selTipo.value, 10);
        this.actualizarOpcionesCaracteristicas(tipoId || null);
        this.actualizarOpcionesDefiniciones(tipoId || null, null);
        this.actualizarOpcionesFinalizaciones(tipoId || null, null, null);
      };
    }

    if (selCar) {
      selCar.onchange = () => {
        const carId = parseInt(selCar.value, 10);
        if (carId) {
          const parentTipo = this.catalogos.tipos.find(t => (t.caracteristicas || []).some(c => c.id === carId));
          if (parentTipo && parseInt(selTipo.value, 10) !== parentTipo.id) {
            selTipo.value = parentTipo.id;
            this.actualizarOpcionesCaracteristicas(parentTipo.id, carId);
          }
          this.actualizarOpcionesDefiniciones(parentTipo ? parentTipo.id : null, carId);
          this.actualizarOpcionesFinalizaciones(parentTipo ? parentTipo.id : null, carId, null);
        } else {
          const tipoId = parseInt(selTipo.value, 10) || null;
          this.actualizarOpcionesDefiniciones(tipoId, null);
          this.actualizarOpcionesFinalizaciones(tipoId, null, null);
        }
      };
    }

    if (selDef) {
      selDef.onchange = () => {
        const defId = parseInt(selDef.value, 10);
        if (defId) {
          let foundCar = null;
          let foundTipo = null;
          for (const t of this.catalogos.tipos) {
            for (const c of (t.caracteristicas || [])) {
              if ((c.definiciones || []).some(d => d.id === defId)) {
                foundCar = c;
                foundTipo = t;
                break;
              }
            }
            if (foundTipo) break;
          }

          if (foundTipo && parseInt(selTipo.value, 10) !== foundTipo.id) {
            selTipo.value = foundTipo.id;
            this.actualizarOpcionesCaracteristicas(foundTipo.id, foundCar ? foundCar.id : null);
          } else if (foundCar && parseInt(selCar.value, 10) !== foundCar.id) {
            selCar.value = foundCar.id;
          }

          this.actualizarOpcionesFinalizaciones(foundTipo ? foundTipo.id : null, foundCar ? foundCar.id : null, defId);
        } else {
          const tipoId = parseInt(selTipo.value, 10) || null;
          const carId = parseInt(selCar.value, 10) || null;
          this.actualizarOpcionesFinalizaciones(tipoId, carId, null);
        }
      };
    }

    if (btnReporte) {
      btnReporte.onclick = async () => {
        try {
          btnReporte.disabled = true;
          btnReporte.textContent = 'Generando PDF...';

          const qs = this.getFilterQueryParams();
          const token = API.getToken();

          const res = await fetch(`/api/reportes/llamadas-pdf?${qs}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!res.ok) throw new Error('Error al generar el reporte en PDF de llamadas');

          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Reporte_Llamadas_${new Date().toISOString().slice(0, 10)}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (err) {
          alert('Error al emitir reporte de llamadas: ' + err.message);
        } finally {
          btnReporte.disabled = false;
          btnReporte.innerHTML = '<span class="icon">📄</span> Emitir Reporte PDF';
        }
      };
    }

    const formEdit = document.getElementById('form-editar-llamada');
    if (formEdit) {
      formEdit.onsubmit = async (e) => {
        e.preventDefault();
        await this.guardarEdicion();
      };
    }
  },

  getFilterQueryParams() {
    const params = new URLSearchParams();
    const fechaDesde = document.getElementById('filtro-llamada-fecha-desde')?.value;
    const fechaHasta = document.getElementById('filtro-llamada-fecha-hasta')?.value;
    const sucursalId = document.getElementById('filtro-llamada-sucursal')?.value;
    const tipoId = document.getElementById('filtro-llamada-tipo')?.value;
    const caracteristicaId = document.getElementById('filtro-llamada-caracteristica')?.value;
    const definicionId = document.getElementById('filtro-llamada-definicion')?.value;
    const finalizacionId = document.getElementById('filtro-llamada-finalizacion')?.value;
    const asesorId = document.getElementById('filtro-llamada-asesor')?.value;
    const cliente = document.getElementById('filtro-llamada-cliente')?.value;

    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (sucursalId) params.append('sucursal_id', sucursalId);
    if (tipoId) params.append('tipo_consulta_id', tipoId);
    if (caracteristicaId) params.append('caracteristica_id', caracteristicaId);
    if (definicionId) params.append('definicion_id', definicionId);
    if (finalizacionId) params.append('finalizacion_id', finalizacionId);
    if (asesorId) params.append('asesor_id', asesorId);
    if (cliente) params.append('numero_cliente', cliente);

    return params.toString();
  },

  async cargarLlamadas() {
    const tableContainer = document.getElementById('contenedor-tabla-historial-llamadas');
    const emptyState = document.getElementById('historial-llamadas-empty-state');
    const tbody = document.getElementById('tabla-historial-llamadas-body');
    if (!tbody) return;

    const qs = this.getFilterQueryParams();

    if (!qs || qs.trim().length === 0) {
      if (tableContainer) tableContainer.classList.add('hidden');
      if (emptyState) emptyState.classList.remove('hidden');
      this.llamadas = [];
      tbody.innerHTML = '';
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');
    if (tableContainer) tableContainer.classList.remove('hidden');

    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4">Buscando llamadas...</td></tr>';

    try {
      const data = await API.get(`/llamadas?${qs}`);
      this.llamadas = data;
      this.renderTabla();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="10" class="text-center text-danger py-4">Error al cargar llamadas: ${err.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('tabla-historial-llamadas-body');
    if (!tbody) return;

    const user = API.getUser();
    const rol = user ? user.rol : '';

    if (this.llamadas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" class="text-center py-6 text-muted">No se encontraron llamadas con los filtros aplicados.</td></tr>';
      return;
    }

    tbody.innerHTML = this.llamadas.map(r => {
      const fechaFormateada = new Date(r.fecha).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      let botonesAccion = '';

      if (rol !== 'Espectador') {
        botonesAccion += `<button class="btn btn-sm btn-outline-primary mr-1" onclick="LlamadasHistorialModule.abrirModalEditar(${r.id})">Editar</button>`;
      }

      if (rol === 'Admin') {
        botonesAccion += `<button class="btn btn-sm btn-outline-danger" onclick="LlamadasHistorialModule.confirmarEliminar(${r.id}, '${r.numero_cliente}')">Eliminar</button>`;
      }

      if (rol === 'Espectador') {
        botonesAccion = `<span class="badge badge-secondary">Solo lectura</span>`;
      }

      const comentarioHtml = r.comentario 
        ? `<span title="${r.comentario.replace(/"/g, '&quot;')}">${r.comentario.length > 30 ? r.comentario.substring(0, 30) + '...' : r.comentario}</span>`
        : '<span class="text-muted">-</span>';

      const userHoverHtml = `<span class="user-hover-link" onclick="HistorialModule.verPerfilUsuario(${r.asesor_id})" title="Ver perfil de ${r.asesor}">${r.asesor}</span>`;

      return `
        <tr>
          <td>${fechaFormateada}</td>
          <td><span class="badge badge-secondary">${r.sucursal}</span></td>
          <td>${userHoverHtml}</td>
          <td><strong style="color: #0D9488;">${r.numero_cliente}</strong></td>
          <td>${r.tipo_consulta}</td>
          <td>${r.caracteristica}</td>
          <td>${r.definicion || '-'}</td>
          <td>${r.finalizacion || '-'}</td>
          <td class="cell-comentario">${comentarioHtml}</td>
          <td class="table-actions">${botonesAccion}</td>
        </tr>
      `;
    }).join('');
  },

  async abrirModalEditar(id) {
    this.currentEditingId = id;
    try {
      const r = await API.get(`/llamadas/${id}`);
      
      const modal = document.getElementById('modal-editar-llamada');
      document.getElementById('edit-llamada-cliente').value = r.numero_cliente;

      const selSuc = document.getElementById('edit-llamada-sucursal');
      selSuc.innerHTML = '';
      this.catalogos.sucursales.forEach(s => {
        selSuc.innerHTML += `<option value="${s.id}" ${s.id === r.sucursal_id ? 'selected' : ''}>${s.nombre}</option>`;
      });

      const selTipo = document.getElementById('edit-llamada-tipo');
      const selCar = document.getElementById('edit-llamada-caracteristica');
      const selDef = document.getElementById('edit-llamada-definicion');
      const selFin = document.getElementById('edit-llamada-finalizacion');

      selTipo.innerHTML = '<option value="">-- Seleccionar --</option>';
      this.catalogos.tipos.forEach(t => {
        selTipo.innerHTML += `<option value="${t.id}" ${t.id === r.tipo_consulta_id ? 'selected' : ''}>${t.contenido}</option>`;
      });

      const actualizarCascadaEdit = (tipoId, selectedCarId = null, selectedDefId = null, selectedFinId = null) => {
        selCar.innerHTML = '<option value="">-- Seleccione Característica --</option>';
        selDef.innerHTML = '<option value="">-- Seleccione Definición --</option>';
        selFin.innerHTML = '<option value="">-- Seleccione Finalización --</option>';

        if (!tipoId) return;

        const tipoObj = this.catalogos.tipos.find(t => t.id === tipoId);
        if (tipoObj && tipoObj.caracteristicas) {
          tipoObj.caracteristicas.forEach(c => {
            selCar.innerHTML += `<option value="${c.id}" ${c.id === selectedCarId ? 'selected' : ''}>${c.contenido}</option>`;
          });
        }

        if (selectedCarId) {
          const carObj = tipoObj?.caracteristicas.find(c => c.id === selectedCarId);
          if (carObj && carObj.definiciones) {
            carObj.definiciones.forEach(d => {
              selDef.innerHTML += `<option value="${d.id}" ${d.id === selectedDefId ? 'selected' : ''}>${d.contenido}</option>`;
            });
          }
        }

        if (selectedDefId && selectedCarId) {
          const carObj = tipoObj?.caracteristicas.find(c => c.id === selectedCarId);
          const defObj = carObj?.definiciones.find(d => d.id === selectedDefId);
          if (defObj && defObj.finalizaciones) {
            defObj.finalizaciones.forEach(f => {
              selFin.innerHTML += `<option value="${f.id}" ${f.id === selectedFinId ? 'selected' : ''}>${f.contenido}</option>`;
            });
          }
        }
      };

      actualizarCascadaEdit(r.tipo_consulta_id, r.caracteristica_id, r.definicion_id, r.finalizacion_id);

      selTipo.onchange = () => {
        const tid = parseInt(selTipo.value, 10);
        actualizarCascadaEdit(tid, null, null, null);
      };

      selCar.onchange = () => {
        const tid = parseInt(selTipo.value, 10);
        const cid = parseInt(selCar.value, 10);
        actualizarCascadaEdit(tid, cid, null, null);
      };

      selDef.onchange = () => {
        const tid = parseInt(selTipo.value, 10);
        const cid = parseInt(selCar.value, 10);
        const did = parseInt(selDef.value, 10);
        actualizarCascadaEdit(tid, cid, did, null);
      };

      document.getElementById('edit-llamada-comentario').value = r.comentario || '';
      modal.classList.remove('hidden');
    } catch (err) {
      alert('Error al abrir llamada: ' + err.message);
    }
  },

  cerrarModalEditar() {
    const modal = document.getElementById('modal-editar-llamada');
    if (modal) modal.classList.add('hidden');
    this.currentEditingId = null;
  },

  async guardarEdicion() {
    if (!this.currentEditingId) return;

    const sucursal_id = document.getElementById('edit-llamada-sucursal').value;
    const numero_cliente = document.getElementById('edit-llamada-cliente').value.trim();
    const tipo_consulta_id = document.getElementById('edit-llamada-tipo').value;
    const caracteristica_id = document.getElementById('edit-llamada-caracteristica').value;
    const definicion_id = document.getElementById('edit-llamada-definicion').value;
    const finalizacion_id = document.getElementById('edit-llamada-finalizacion').value;
    const comentario = document.getElementById('edit-llamada-comentario').value.trim();

    if (!sucursal_id || !numero_cliente || !tipo_consulta_id || !caracteristica_id || !definicion_id || !finalizacion_id) {
      alert('Los campos Sucursal, Cliente, Tipo, Características, Definición y Finalización son obligatorios.');
      return;
    }

    if (numero_cliente.length > 15) {
      alert('El número de cliente no puede superar los 15 caracteres.');
      return;
    }

    if (comentario.length > 500) {
      alert('El comentario no puede superar los 500 caracteres.');
      return;
    }

    const payload = {
      sucursal_id: parseInt(sucursal_id, 10),
      numero_cliente,
      tipo_consulta_id: parseInt(tipo_consulta_id, 10),
      caracteristica_id: parseInt(caracteristica_id, 10),
      definicion_id: parseInt(definicion_id, 10),
      finalizacion_id: parseInt(finalizacion_id, 10),
      comentario: comentario || null
    };

    try {
      await API.put(`/llamadas/${this.currentEditingId}`, payload);
      this.cerrarModalEditar();
      await this.cargarLlamadas();
      if (typeof LlamadasModule !== 'undefined' && LlamadasModule.cargarLlamadasAlmacenadas) {
        LlamadasModule.cargarLlamadasAlmacenadas();
        LlamadasModule.renderPreviewLlamadas();
      }
    } catch (err) {
      alert('Error al guardar cambios de la llamada: ' + err.message);
    }
  },

  async confirmarEliminar(id, cliente) {
    if (confirm(`¿Está seguro de eliminar el registro de llamada del cliente "${cliente}"?\nEsta acción quedará registrada en el sistema de auditoría.`)) {
      try {
        await API.delete(`/llamadas/${id}`);
        await this.cargarLlamadas();
      } catch (err) {
        alert('Error al eliminar llamada: ' + err.message);
      }
    }
  }
};
