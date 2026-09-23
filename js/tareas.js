const TareasModule = {
  usuarios: [],
  sucursales: [],
  tareas: [],
  currentEditingId: null,

  async init() {
    await Promise.all([
      this.cargarCatalogos(),
      this.cargarTareas()
    ]);
    this.bindEvents();
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

    if (selUser) {
      selUser.innerHTML = '<option value="">-- Seleccione Usuario --</option>';
      this.usuarios.forEach(u => {
        selUser.innerHTML += `<option value="${u.id}">${u.nombre_completo} (${u.rol})</option>`;
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
  },

  async cargarTareas() {
    const tbody = document.getElementById('tabla-tareas-body');
    const contador = document.getElementById('tareas-contador');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-muted">Cargando tareas activas...</td></tr>';

    try {
      const data = await API.get('/tareas');
      this.tareas = data;

      if (contador) {
        contador.textContent = `${this.tareas.length} activas`;
      }

      this.renderTabla();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">Error al cargar tareas: ${err.message}</td></tr>`;
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

      const estadoBadge = t.completada
        ? `<span class="badge badge-success" title="Completada por el usuario">✓ Marcada</span>`
        : `<span class="badge badge-warning" title="Aún no realizada">⏳ Pendiente</span>`;

      return `
        <tr>
          <td>
            <a href="javascript:void(0)" class="user-link-badge" onclick="HistorialModule.abrirModalVerPerfil(${t.usuario_id})" title="Ver perfil">
              <span>👤</span> ${t.usuario_nombre}
            </a>
            <div><small class="role-badge role-${t.usuario_rol.toLowerCase()}">${t.usuario_rol}</small></div>
          </td>
          <td><strong>${sucursalesTexto}</strong></td>
          <td><span class="badge badge-info">${t.tarea}</span></td>
          <td>
            <label class="tarea-checkbox-wrap" style="cursor: pointer; display: inline-flex; align-items: center; gap: 0.4rem;">
              <input type="checkbox" ${t.completada ? 'checked' : ''} onchange="TareasModule.toggleMarcarTarea(${t.id}, this.checked)">
              <span class="badge ${t.completada ? 'badge-success' : 'badge-warning'}">
                ${t.completada ? '✓ Marcada' : '⏳ Pendiente'}
              </span>
            </label>
          </td>
          <td class="table-actions">
            <button class="btn btn-sm btn-outline-primary mr-1" onclick="TareasModule.abrirModalEditar(${t.id})">Editar</button>
            <button class="btn btn-sm btn-outline-danger" onclick="TareasModule.confirmarEliminar(${t.id}, '${t.tarea.replace(/'/g, "\\'")}')">Eliminar</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  bindEvents() {
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

        if (!usuario_id || !sucursal_1_id || !tarea) {
          alertEl.textContent = 'Por favor complete todos los campos obligatorios (*)';
          alertEl.className = 'form-alert error';
          return;
        }

        if (tarea.length > 50) {
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
            tarea
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

        if (!usuario_id || !sucursal_1_id || !tarea) {
          alertEl.textContent = 'Por favor complete todos los campos obligatorios (*)';
          alertEl.className = 'form-alert error';
          return;
        }

        if (tarea.length > 50) {
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
            tarea,
            activo,
            completada
          });

          this.cerrarModalEditar();
          await this.cargarTareas();
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
      inputDesc.value = tarea.tarea;
      if (counter) counter.textContent = `Hasta 50 caracteres (${tarea.tarea.length} / 50)`;
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
        alert('Tarea eliminada exitosamente.');
      } catch (err) {
        alert('Error al eliminar tarea: ' + err.message);
      }
    }
  }
};
