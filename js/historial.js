const HistorialModule = {
  reclamos: [],
  catalogos: {
    sucursales: [],
    tipos: [],
    usuarios: []
  },
  currentEditingId: null,

  async init() {
    await this.loadFilterOptions();
    this.bindEvents();
    await this.cargarReclamos();
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
      console.error('Error al cargar opciones de filtro:', err);
    }
  },

  populateFilterDropdowns() {
    const selSucursal = document.getElementById('filtro-sucursal');
    const selTipo = document.getElementById('filtro-tipo');
    const selAsesor = document.getElementById('filtro-asesor');

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
  },

  getFilterQueryParams() {
    const params = new URLSearchParams();
    const fechaDesde = document.getElementById('filtro-fecha-desde')?.value;
    const fechaHasta = document.getElementById('filtro-fecha-hasta')?.value;
    const sucursalId = document.getElementById('filtro-sucursal')?.value;
    const tipoId = document.getElementById('filtro-tipo')?.value;
    const asesorId = document.getElementById('filtro-asesor')?.value;
    const cliente = document.getElementById('filtro-cliente')?.value;

    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (sucursalId) params.append('sucursal_id', sucursalId);
    if (tipoId) params.append('tipo_consulta_id', tipoId);
    if (asesorId) params.append('asesor_id', asesorId);
    if (cliente) params.append('numero_cliente', cliente);

    return params.toString();
  },

  async cargarReclamos() {
    const tbody = document.getElementById('tabla-historial-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="9" class="text-center py-4">Cargando registros...</td></tr>';

    try {
      const qs = this.getFilterQueryParams();
      const data = await API.get(`/reclamos?${qs}`);
      this.reclamos = data;
      this.renderTabla();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center text-danger py-4">Error al cargar registros: ${err.message}</td></tr>`;
    }
  },

  renderTabla() {
    const tbody = document.getElementById('tabla-historial-body');
    if (!tbody) return;

    const user = API.getUser();
    const rol = user ? user.rol : '';

    if (this.reclamos.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" class="text-center py-6 text-muted">No se encontraron reclamos con los filtros aplicados.</td></tr>';
      return;
    }

    tbody.innerHTML = this.reclamos.map(r => {
      const fechaFormateada = new Date(r.fecha).toLocaleDateString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      let botonesAccion = '';

      if (rol !== 'Espectador') {
        botonesAccion += `<button class="btn btn-sm btn-outline-primary mr-1" onclick="HistorialModule.abrirModalEditar(${r.id})">Editar</button>`;
      }

      if (rol === 'Admin') {
        botonesAccion += `<button class="btn btn-sm btn-outline-danger" onclick="HistorialModule.confirmarEliminar(${r.id}, '${r.numero_cliente}')">Eliminar</button>`;
      }

      if (rol === 'Espectador') {
        botonesAccion = `<span class="badge badge-secondary">Solo lectura</span>`;
      }

      return `
        <tr>
          <td><strong>${fechaFormateada}</strong></td>
          <td>${r.sucursal}</td>
          <td>
            <a href="javascript:void(0)" class="user-link-badge" onclick="HistorialModule.abrirModalVerPerfil(${r.asesor_id || `'${r.asesor}'`})" title="Ver información del usuario">
              <span>👤</span> ${r.asesor}
            </a>
          </td>
          <td><span class="client-badge">${r.numero_cliente}</span></td>
          <td><span class="badge badge-info">${r.tipo_consulta}</span></td>
          <td>${r.caracteristica}</td>
          <td>${r.definicion || '-'}</td>
          <td>${r.finalizacion ? `<span class="status-pill status-${this.slugify(r.finalizacion)}">${r.finalizacion}</span>` : '-'}</td>
          <td class="table-actions">${botonesAccion}</td>
        </tr>
      `;
    }).join('');
  },

  slugify(text) {
    return text.toString().toLowerCase().trim().replace(/[\s\W-]+/g, '-');
  },

  bindEvents() {

    const btnFiltrar = document.getElementById('btn-aplicar-filtros');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros');
    const btnReporte = document.getElementById('btn-emitir-reporte');

    if (btnFiltrar) {
      btnFiltrar.onclick = () => this.cargarReclamos();
    }

    if (btnLimpiar) {
      btnLimpiar.onclick = () => {
        const inputs = ['filtro-fecha-desde', 'filtro-fecha-hasta', 'filtro-sucursal', 'filtro-tipo', 'filtro-asesor', 'filtro-cliente'];
        inputs.forEach(id => {
          const el = document.getElementById(id);
          if (el) el.value = '';
        });
        this.cargarReclamos();
      };
    }

    if (btnReporte) {
      btnReporte.onclick = async () => {
        try {
          btnReporte.disabled = true;
          btnReporte.textContent = 'Generando PDF...';

          const qs = this.getFilterQueryParams();
          const token = API.getToken();

          const res = await fetch(`/api/reportes/pdf?${qs}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (!res.ok) throw new Error('Error al generar el reporte en PDF');

          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `Reporte_Reclamos_${new Date().toISOString().slice(0, 10)}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (err) {
          alert('Error al emitir reporte: ' + err.message);
        } finally {
          btnReporte.disabled = false;
          btnReporte.innerHTML = '<span class="icon">📄</span> Emitir Reporte PDF';
        }
      };
    }

    const formEdit = document.getElementById('form-editar-reclamo');
    if (formEdit) {
      formEdit.onsubmit = async (e) => {
        e.preventDefault();
        await this.guardarEdicion();
      };
    }
  },

  async abrirModalEditar(id) {
    this.currentEditingId = id;
    try {
      const r = await API.get(`/reclamos/${id}`);
      
      const modal = document.getElementById('modal-editar-reclamo');
      document.getElementById('edit-cliente').value = r.numero_cliente;

      const selSuc = document.getElementById('edit-sucursal');
      selSuc.innerHTML = '';
      this.catalogos.sucursales.forEach(s => {
        selSuc.innerHTML += `<option value="${s.id}" ${s.id === r.sucursal_id ? 'selected' : ''}>${s.nombre}</option>`;
      });

      const selTipo = document.getElementById('edit-tipo');
      const selCar = document.getElementById('edit-caracteristica');
      const selDef = document.getElementById('edit-definicion');
      const selFin = document.getElementById('edit-finalizacion');

      selTipo.innerHTML = '<option value="">-- Seleccionar --</option>';
      this.catalogos.tipos.forEach(t => {
        selTipo.innerHTML += `<option value="${t.id}" ${t.id === r.tipo_consulta_id ? 'selected' : ''}>${t.contenido}</option>`;
      });

      const actualizarCascadaEdit = (tipoId, selectedCarId = null, selectedDefId = null, selectedFinId = null) => {
        const tipoObj = this.catalogos.tipos.find(t => t.id === tipoId);
        selCar.innerHTML = '<option value="">-- Seleccionar --</option>';
        selDef.innerHTML = '<option value="">-- Seleccionar --</option>';
        selFin.innerHTML = '<option value="">-- Seleccionar --</option>';

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

        if (selectedDefId) {
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
        actualizarCascadaEdit(parseInt(selTipo.value, 10));
      };
      selCar.onchange = () => {
        const tipoId = parseInt(selTipo.value, 10);
        const carId = parseInt(selCar.value, 10);
        actualizarCascadaEdit(tipoId, carId);
      };
      selDef.onchange = () => {
        const tipoId = parseInt(selTipo.value, 10);
        const carId = parseInt(selCar.value, 10);
        const defId = parseInt(selDef.value, 10);
        actualizarCascadaEdit(tipoId, carId, defId);
      };

      modal.classList.remove('hidden');
    } catch (err) {
      alert('Error al cargar datos del reclamo: ' + err.message);
    }
  },

  async guardarEdicion() {
    if (!this.currentEditingId) return;

    const sucursal_id = parseInt(document.getElementById('edit-sucursal').value, 10);
    const numero_cliente = document.getElementById('edit-cliente').value.trim();
    const tipo_consulta_id = parseInt(document.getElementById('edit-tipo').value, 10);
    const caracteristica_id = parseInt(document.getElementById('edit-caracteristica').value, 10);
    const definicion_id = parseInt(document.getElementById('edit-definicion').value, 10) || null;
    const finalizacion_id = parseInt(document.getElementById('edit-finalizacion').value, 10) || null;

    try {
      await API.put(`/reclamos/${this.currentEditingId}`, {
        sucursal_id,
        numero_cliente,
        tipo_consulta_id,
        caracteristica_id,
        definicion_id,
        finalizacion_id
      });

      this.cerrarModalEditar();
      await this.cargarReclamos();
      alert('Reclamo actualizado correctamente. El cambio fue registrado en la auditoría.');
    } catch (err) {
      alert('Error al actualizar reclamo: ' + err.message);
    }
  },

  cerrarModalEditar() {
    const modal = document.getElementById('modal-editar-reclamo');
    if (modal) modal.classList.add('hidden');
    this.currentEditingId = null;
  },

  async confirmarEliminar(id, abonado) {
    if (confirm(`¿Está seguro de eliminar el reclamo del abonado "${abonado}"? Esta acción quedará asentada en el registro de auditoría.`)) {
      try {
        await API.delete(`/reclamos/${id}`);
        await this.cargarReclamos();
        alert(`Reclamo del abonado ${abonado} eliminado correctamente.`);
      } catch (err) {
        alert('Error al eliminar reclamo: ' + err.message);
      }
    }
  },

  async abrirModalVerPerfil(identificador) {
    const modal = document.getElementById('modal-ver-perfil-usuario');
    if (!modal) return;

    const avatarEl = document.getElementById('ver-perfil-avatar');
    const nombreEl = document.getElementById('ver-perfil-nombre');
    const userLoginEl = document.getElementById('ver-perfil-usuario');
    const rolEl = document.getElementById('ver-perfil-rol');
    const fraseEl = document.getElementById('ver-perfil-frase');

    nombreEl.textContent = 'Cargando...';
    userLoginEl.textContent = '';
    rolEl.textContent = '';
    fraseEl.textContent = 'Cargando información del usuario...';

    modal.classList.remove('hidden');

    try {
      const u = await API.get(`/usuarios/publico/${encodeURIComponent(identificador)}`);
      
      nombreEl.textContent = u.nombre_completo;
      userLoginEl.textContent = `@${u.usuario}`;
      rolEl.textContent = u.rol;
      rolEl.className = `role-badge role-${u.rol.toLowerCase()}`;
      
      fraseEl.textContent = u.descripcion && u.descripcion.trim() 
        ? `"${u.descripcion.trim()}"` 
        : 'Este usuario aún no ha agregado una descripción o frase personal.';

      if (avatarEl) {
        avatarEl.src = u.foto_perfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(u.nombre_completo)}&background=3B82F6&color=fff&size=150`;
      }
    } catch (err) {
      nombreEl.textContent = 'Usuario';
      fraseEl.textContent = 'No se pudo cargar la información del usuario.';
    }
  },

  cerrarModalVerPerfil() {
    const modal = document.getElementById('modal-ver-perfil-usuario');
    if (modal) modal.classList.add('hidden');
  }
};
