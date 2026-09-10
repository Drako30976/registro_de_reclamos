// Módulo de Edición (Mantenimiento de Sucursales y Estructura Jerárquica)
const EdicionModule = {
  sucursales: [],
  arbol: [],

  async init() {
    this.bindEvents();
    await this.cargarTodo();
  },

  async cargarTodo() {
    await Promise.all([
      this.cargarSucursales(),
      this.cargarEstructura()
    ]);
  },

  bindEvents() {
    // Sub-pestañas internas de edición (Sucursales vs Estructura)
    const btnTabSuc = document.getElementById('subtab-btn-sucursales');
    const btnTabEst = document.getElementById('subtab-btn-estructura');
    const secSuc = document.getElementById('edicion-sec-sucursales');
    const secEst = document.getElementById('edicion-sec-estructura');

    if (btnTabSuc && btnTabEst) {
      btnTabSuc.onclick = () => {
        btnTabSuc.classList.add('active');
        btnTabEst.classList.remove('active');
        secSuc.classList.remove('hidden');
        secEst.classList.add('hidden');
      };
      btnTabEst.onclick = () => {
        btnTabEst.classList.add('active');
        btnTabSuc.classList.remove('active');
        secEst.classList.remove('hidden');
        secSuc.classList.add('hidden');
      };
    }

    // Modal Crear Sucursal
    const formCrearSuc = document.getElementById('form-crear-sucursal');
    if (formCrearSuc) {
      formCrearSuc.onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('input-nueva-sucursal');
        const nombre = input.value.trim();
        if (!nombre) return;

        try {
          await API.post('/catalogos/sucursales', { nombre });
          input.value = '';
          this.cerrarModal('modal-crear-sucursal');
          await this.cargarSucursales();
          alert(`Sucursal "${nombre}" creada exitosamente.`);
        } catch (err) {
          alert('Error al crear sucursal: ' + err.message);
        }
      };
    }

    // Modal Crear Elemento de Estructura
    const formCrearEst = document.getElementById('form-crear-nodo-estructura');
    if (formCrearEst) {
      formCrearEst.onsubmit = async (e) => {
        e.preventDefault();
        const nivel = document.getElementById('nodo-nivel').value;
        const parent_id = document.getElementById('nodo-parent-id').value;
        const contenido = document.getElementById('nodo-contenido').value.trim();
        const descripcion = document.getElementById('nodo-descripcion').value.trim();

        if (!contenido) return;

        try {
          await API.post('/catalogos/estructura', {
            nivel,
            parent_id: parent_id ? parseInt(parent_id, 10) : null,
            contenido,
            descripcion
          });

          this.cerrarModal('modal-crear-nodo-estructura');
          await this.cargarEstructura();
          alert(`Elemento "${contenido}" agregado a la estructura.`);
        } catch (err) {
          alert('Error al agregar elemento: ' + err.message);
        }
      };
    }
  },

  // ==========================================
  // SUCURSALES
  // ==========================================
  async cargarSucursales() {
    const listEl = document.getElementById('lista-sucursales-edicion');
    if (!listEl) return;

    try {
      this.sucursales = await API.get('/catalogos/sucursales?todas=true');
      const user = API.getUser();
      const rol = user ? user.rol : '';

      listEl.innerHTML = this.sucursales.map(s => `
        <div class="card p-3 mb-2 flex-row justify-between align-center">
          <div>
            <strong>${s.nombre}</strong>
            <span class="badge ${s.activo ? 'badge-success' : 'badge-danger'} ml-2">
              ${s.activo ? 'Activa' : 'Inactiva'}
            </span>
          </div>
          <div class="action-buttons">
            <button class="btn btn-sm btn-outline-secondary" onclick="EdicionModule.editarSucursal(${s.id}, '${s.nombre}', ${s.activo})">
              Editar
            </button>
            ${rol === 'Admin' ? `
              <button class="btn btn-sm btn-outline-danger" onclick="EdicionModule.eliminarSucursal(${s.id}, '${s.nombre}')">
                Eliminar
              </button>
            ` : ''}
          </div>
        </div>
      `).join('');
    } catch (err) {
      listEl.innerHTML = `<p class="text-danger">Error al cargar sucursales: ${err.message}</p>`;
    }
  },

  abrirModalCrearSucursal() {
    const modal = document.getElementById('modal-crear-sucursal');
    if (modal) modal.classList.remove('hidden');
  },

  async editarSucursal(id, nombreActual, activoActual) {
    const nuevoNombre = prompt('Ingrese el nuevo nombre para la sucursal:', nombreActual);
    if (nuevoNombre === null) return;
    if (!nuevoNombre.trim()) {
      alert('El nombre no puede estar vacío.');
      return;
    }

    try {
      await API.put(`/catalogos/sucursales/${id}`, {
        nombre: nuevoNombre.trim(),
        activo: activoActual
      });
      await this.cargarSucursales();
      alert('Sucursal actualizada con éxito.');
    } catch (err) {
      alert('Error al actualizar sucursal: ' + err.message);
    }
  },

  async eliminarSucursal(id, nombre) {
    if (confirm(`¿Está seguro de eliminar la sucursal "${nombre}"?`)) {
      try {
        await API.delete(`/catalogos/sucursales/${id}`);
        await this.cargarSucursales();
        alert('Sucursal eliminada.');
      } catch (err) {
        alert('Error al eliminar sucursal: ' + err.message);
      }
    }
  },

  // ==========================================
  // ESTRUCTURA DE RECLAMOS (ÁRBOL)
  // ==========================================
  async cargarEstructura() {
    const treeEl = document.getElementById('arbol-estructura-edicion');
    if (!treeEl) return;

    try {
      this.arbol = await API.get('/catalogos/estructura');
      const user = API.getUser();
      const rol = user ? user.rol : '';

      if (this.arbol.length === 0) {
        treeEl.innerHTML = '<p class="text-muted">No hay tipos de consulta configurados.</p>';
        return;
      }

      treeEl.innerHTML = this.arbol.map(tipo => `
        <div class="tree-node tree-tipo">
          <div class="tree-header">
            <span class="tree-title"><strong>Tipo:</strong> ${tipo.contenido}</span>
            <div class="tree-actions">
              <button class="btn btn-xs btn-outline-primary" onclick="EdicionModule.abrirModalCrearNodo('caracteristica', ${tipo.id}, 'Tipo: ${tipo.contenido}')">+ Característica</button>
              <button class="btn btn-xs btn-outline-secondary" onclick="EdicionModule.editarNodo('tipo', ${tipo.id}, '${tipo.contenido}')">Editar</button>
              ${rol === 'Admin' ? `<button class="btn btn-xs btn-outline-danger" onclick="EdicionModule.eliminarNodo('tipo', ${tipo.id}, '${tipo.contenido}')">Eliminar</button>` : ''}
            </div>
          </div>

          <div class="tree-children">
            ${(tipo.caracteristicas || []).map(car => `
              <div class="tree-node tree-caracteristica">
                <div class="tree-header">
                  <span class="tree-title"><strong>Caract:</strong> ${car.contenido}</span>
                  <div class="tree-actions">
                    <button class="btn btn-xs btn-outline-primary" onclick="EdicionModule.abrirModalCrearNodo('definicion', ${car.id}, 'Caract: ${car.contenido}')">+ Definición</button>
                    <button class="btn btn-xs btn-outline-secondary" onclick="EdicionModule.editarNodo('caracteristica', ${car.id}, '${car.contenido}')">Editar</button>
                    ${rol === 'Admin' ? `<button class="btn btn-xs btn-outline-danger" onclick="EdicionModule.eliminarNodo('caracteristica', ${car.id}, '${car.contenido}')">Eliminar</button>` : ''}
                  </div>
                </div>

                <div class="tree-children">
                  ${(car.definiciones || []).map(def => `
                    <div class="tree-node tree-definicion">
                      <div class="tree-header">
                        <span class="tree-title"><strong>Def:</strong> ${def.contenido}</span>
                        <div class="tree-actions">
                          <button class="btn btn-xs btn-outline-primary" onclick="EdicionModule.abrirModalCrearNodo('finalizacion', ${def.id}, 'Def: ${def.contenido}')">+ Finalización</button>
                          <button class="btn btn-xs btn-outline-secondary" onclick="EdicionModule.editarNodo('definicion', ${def.id}, '${def.contenido}')">Editar</button>
                          ${rol === 'Admin' ? `<button class="btn btn-xs btn-outline-danger" onclick="EdicionModule.eliminarNodo('definicion', ${def.id}, '${def.contenido}')">Eliminar</button>` : ''}
                        </div>
                      </div>

                      <div class="tree-children tree-leaves">
                        ${(def.finalizaciones || []).map(fin => `
                          <span class="tree-leaf">
                            ${fin.contenido}
                            ${rol === 'Admin' ? `<button class="leaf-del" onclick="EdicionModule.eliminarNodo('finalizacion', ${fin.id}, '${fin.contenido}')">&times;</button>` : ''}
                          </span>
                        `).join('')}
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');
    } catch (err) {
      treeEl.innerHTML = `<p class="text-danger">Error al cargar árbol: ${err.message}</p>`;
    }
  },

  abrirModalCrearNodo(nivel, parentId = null, parentLabel = '') {
    const modal = document.getElementById('modal-crear-nodo-estructura');
    document.getElementById('nodo-nivel').value = nivel;
    document.getElementById('nodo-parent-id').value = parentId || '';
    document.getElementById('nodo-parent-label').textContent = parentLabel ? `Bajo: ${parentLabel}` : 'Nuevo Tipo Principal';
    document.getElementById('nodo-contenido').value = '';
    document.getElementById('nodo-descripcion').value = '';
    if (modal) modal.classList.remove('hidden');
  },

  async editarNodo(nivel, id, contenidoActual) {
    const nuevoContenido = prompt(`Modificar contenido para ${nivel}:`, contenidoActual);
    if (nuevoContenido === null) return;
    if (!nuevoContenido.trim()) {
      alert('El contenido no puede estar vacío.');
      return;
    }

    try {
      await API.put(`/catalogos/estructura/${nivel}/${id}`, {
        contenido: nuevoContenido.trim()
      });
      await this.cargarEstructura();
      alert('Elemento actualizado.');
    } catch (err) {
      alert('Error al actualizar: ' + err.message);
    }
  },

  async eliminarNodo(nivel, id, contenido) {
    if (confirm(`¿Está seguro de eliminar ${nivel} "${contenido}" y sus elementos dependientes?`)) {
      try {
        await API.delete(`/catalogos/estructura/${nivel}/${id}`);
        await this.cargarEstructura();
        alert('Elemento eliminado.');
      } catch (err) {
        alert('Error al eliminar: ' + err.message);
      }
    }
  },

  cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }
};
