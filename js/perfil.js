const PerfilModule = {
  usuarios: [],

  async init() {
    this.renderMiPerfil();
    this.bindEvents();

    const user = API.getUser();
    const secAdmin = document.getElementById('sec-admin-usuarios');
    if (user && (user.rol === 'Admin' || user.rol === 'Supervisor')) {
      if (secAdmin) {
        secAdmin.classList.remove('hidden');
        secAdmin.style.display = 'block';
      }
      await this.cargarListaUsuarios();
    } else {
      if (secAdmin) {
        secAdmin.classList.add('hidden');
        secAdmin.style.display = 'none';
      }
    }
  },

  renderMiPerfil() {
    const user = API.getUser();
    if (!user) return;

    const nombreEl = document.getElementById('perfil-nombre');
    const usuarioEl = document.getElementById('perfil-usuario');
    const rolEl = document.getElementById('perfil-rol');
    const descEl = document.getElementById('perfil-descripcion');
    const charCounter = document.getElementById('desc-char-counter');

    if (nombreEl) nombreEl.textContent = user.nombre_completo;
    if (usuarioEl) usuarioEl.textContent = user.usuario;
    if (rolEl) rolEl.textContent = user.rol;

    if (descEl) {
      descEl.value = user.descripcion || '';
      if (charCounter) {
        charCounter.textContent = `${descEl.value.length} / 255`;
      }
    }

    const avatar = document.getElementById('perfil-avatar-img');
    if (avatar) {
      avatar.src = user.foto_perfil || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.nombre_completo)}&background=3B82F6&color=fff&size=150`;
    }
  },

  bindEvents() {

    const formPass = document.getElementById('form-cambiar-password');
    if (formPass) {
      formPass.onsubmit = async (e) => {
        e.preventDefault();
        const actual = document.getElementById('pass-actual').value;
        const nueva = document.getElementById('pass-nueva').value;
        const confirma = document.getElementById('pass-confirma').value;
        const msgEl = document.getElementById('pass-mensaje');

        msgEl.className = 'form-alert hidden';

        if (nueva !== confirma) {
          msgEl.textContent = 'La nueva contraseña y su confirmación no coinciden.';
          msgEl.className = 'form-alert error';
          return;
        }

        try {
          await API.post('/usuarios/perfil/cambiar-password', {
            password_actual: actual,
            password_nueva: nueva
          });

          msgEl.textContent = '¡Contraseña actualizada exitosamente!';
          msgEl.className = 'form-alert success';
          formPass.reset();
        } catch (err) {
          msgEl.textContent = err.message || 'Error al cambiar contraseña.';
          msgEl.className = 'form-alert error';
        }
      };
    }

    const inputFoto = document.getElementById('input-foto-perfil');
    if (inputFoto) {
      inputFoto.onchange = async () => {
        if (!inputFoto.files || inputFoto.files.length === 0) return;

        const file = inputFoto.files[0];
        const formData = new FormData();
        formData.append('foto', file);

        try {
          const res = await API.post('/usuarios/perfil/foto', formData);

          const user = API.getUser();
          if (user) {
            user.foto_perfil = res.foto_perfil;
            API.setUser(user);
          }

          this.renderMiPerfil();
          Auth.renderUserHeader();
          alert('Foto de perfil actualizada correctamente.');
        } catch (err) {
          alert('Error al subir foto: ' + err.message);
        }
      };
    }

    const descInput = document.getElementById('perfil-descripcion');
    const charCounter = document.getElementById('desc-char-counter');
    const btnGuardarDesc = document.getElementById('btn-guardar-descripcion');
    const msgDesc = document.getElementById('desc-mensaje');

    if (descInput && charCounter) {
      descInput.oninput = () => {
        charCounter.textContent = `${descInput.value.length} / 255`;
      };
    }

    if (btnGuardarDesc && descInput) {
      btnGuardarDesc.onclick = async () => {
        const descripcion = descInput.value.trim();
        msgDesc.className = 'form-alert hidden';

        try {
          btnGuardarDesc.disabled = true;
          btnGuardarDesc.textContent = 'Guardando...';

          const res = await API.put('/usuarios/perfil/descripcion', { descripcion });
          const user = API.getUser();
          if (user) {
            user.descripcion = res.descripcion;
            API.setUser(user);
          }

          msgDesc.textContent = '¡Descripción guardada correctamente!';
          msgDesc.className = 'form-alert success';

          setTimeout(() => {
            msgDesc.className = 'form-alert hidden';
          }, 3500);
        } catch (err) {
          msgDesc.textContent = err.message || 'Error al guardar la descripción.';
          msgDesc.className = 'form-alert error';
        } finally {
          btnGuardarDesc.disabled = false;
          btnGuardarDesc.textContent = 'Guardar Frase';
        }
      };
    }

    const formCrearUser = document.getElementById('form-crear-usuario');
    if (formCrearUser) {
      formCrearUser.onsubmit = async (e) => {
        e.preventDefault();
        const nombre_completo = document.getElementById('nuevo-user-nombre').value.trim();
        const documento = document.getElementById('nuevo-user-doc').value.trim();
        const usuario = document.getElementById('nuevo-user-login').value.trim();
        const contrasena = document.getElementById('nuevo-user-pass').value;
        const rol = document.getElementById('nuevo-user-rol').value;

        try {
          await API.post('/usuarios', {
            nombre_completo,
            documento,
            usuario,
            contrasena,
            rol
          });

          this.cerrarModal('modal-crear-usuario');
          formCrearUser.reset();
          await this.cargarListaUsuarios();
          alert(`Usuario "${usuario}" creado exitosamente.`);
        } catch (err) {
          alert('Error al crear usuario: ' + err.message);
        }
      };
    }

    const formEditarUser = document.getElementById('form-editar-usuario');
    if (formEditarUser) {
      formEditarUser.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('edit-user-id').value;
        const nombre_completo = document.getElementById('edit-user-nombre').value.trim();
        const documento = document.getElementById('edit-user-doc').value.trim();
        const rol = document.getElementById('edit-user-rol').value;
        const contrasena = document.getElementById('edit-user-pass').value.trim();
        const activo = document.getElementById('edit-user-activo').value === 'true';

        try {
          await API.put(`/usuarios/${id}`, {
            nombre_completo,
            documento,
            rol,
            contrasena: contrasena || undefined,
            activo
          });

          this.cerrarModal('modal-editar-usuario');
          await this.cargarListaUsuarios();
          alert('Usuario actualizado exitosamente.');
        } catch (err) {
          alert('Error al actualizar usuario: ' + err.message);
        }
      };
    }
  },

  async cargarListaUsuarios() {
    const tbody = document.getElementById('tabla-usuarios-body');
    if (!tbody) return;

    try {
      this.usuarios = await API.get('/usuarios');
      const currentUser = API.getUser();
      const rolActual = currentUser ? currentUser.rol : '';

      tbody.innerHTML = this.usuarios.map(u => {
        const fechaCreacion = new Date(u.created_at).toLocaleDateString('es-AR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });

        const puedeEditar = (rolActual === 'Admin') || (rolActual === 'Supervisor' && u.rol === 'Asesor');
        const puedeToggleEstado = (rolActual === 'Admin') || (rolActual === 'Supervisor' && u.rol === 'Asesor');
        const puedeEliminar = (rolActual === 'Admin' && u.id !== currentUser.id);

        let acciones = '';
        if (puedeEditar) {
          acciones += `<button class="btn btn-sm btn-outline-primary mr-1" onclick="PerfilModule.abrirModalEditarUsuario(${u.id})">Editar</button>`;
        }

        if (puedeToggleEstado && u.id !== currentUser.id) {
          if (u.activo) {
            acciones += `<button class="btn btn-sm btn-outline-warning mr-1" onclick="PerfilModule.toggleEstadoUsuario(${u.id}, false, '${u.usuario}')">Desactivar</button>`;
          } else {
            acciones += `<button class="btn btn-sm btn-outline-success mr-1" onclick="PerfilModule.toggleEstadoUsuario(${u.id}, true, '${u.usuario}')">Activar</button>`;
          }
        }

        if (puedeEliminar) {
          acciones += `<button class="btn btn-sm btn-outline-danger" onclick="PerfilModule.eliminarUsuario(${u.id}, '${u.usuario}')">Eliminar</button>`;
        }

        const estadoBadge = u.activo 
          ? '<span class="badge badge-success">Activo</span>' 
          : '<span class="badge badge-danger">Suspendido</span>';

        return `
          <tr>
            <td><strong>${u.usuario}</strong></td>
            <td><span class="role-badge role-${u.rol.toLowerCase()}">${u.rol}</span></td>
            <td>${u.nombre_completo}</td>
            <td>${u.documento}</td>
            <td>${estadoBadge}</td>
            <td>${fechaCreacion}</td>
            <td class="table-actions">${acciones || '-'}</td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Error: ${err.message}</td></tr>`;
    }
  },

  async toggleEstadoUsuario(id, nuevoEstado, usuario) {
    const accionTexto = nuevoEstado ? 'activar y permitir el acceso' : 'desactivar y suspender el acceso';
    if (confirm(`¿Está seguro de ${accionTexto} al usuario "${usuario}"?`)) {
      try {
        await API.put(`/usuarios/${id}`, { activo: nuevoEstado });
        await this.cargarListaUsuarios();
        alert(`Usuario "${usuario}" ${nuevoEstado ? 'activado' : 'suspendido'} exitosamente.`);
      } catch (err) {
        alert('Error al cambiar estado del usuario: ' + err.message);
      }
    }
  },

  abrirModalCrearUsuario() {
    const modal = document.getElementById('modal-crear-usuario');
    const selectRol = document.getElementById('nuevo-user-rol');
    const currentUser = API.getUser();

    if (selectRol) {
      selectRol.innerHTML = '';
      if (currentUser && currentUser.rol === 'Supervisor') {
        selectRol.innerHTML = '<option value="Asesor">Asesor</option>';
      } else {
        selectRol.innerHTML = `
          <option value="Admin">Admin</option>
          <option value="Supervisor">Supervisor</option>
          <option value="Asesor" selected>Asesor</option>
          <option value="Espectador">Espectador</option>
        `;
      }
    }

    if (modal) modal.classList.remove('hidden');
  },

  abrirModalEditarUsuario(id) {
    const u = this.usuarios.find(x => x.id === id);
    if (!u) return;

    const modal = document.getElementById('modal-editar-usuario');
    document.getElementById('edit-user-id').value = u.id;
    document.getElementById('edit-user-nombre').value = u.nombre_completo;
    document.getElementById('edit-user-doc').value = u.documento;
    document.getElementById('edit-user-pass').value = '';
    document.getElementById('edit-user-activo').value = u.activo ? 'true' : 'false';

    const selectRol = document.getElementById('edit-user-rol');
    const currentUser = API.getUser();

    if (selectRol) {
      selectRol.innerHTML = '';
      if (currentUser && currentUser.rol === 'Supervisor') {
        selectRol.innerHTML = '<option value="Asesor">Asesor</option>';
      } else {
        selectRol.innerHTML = `
          <option value="Admin" ${u.rol === 'Admin' ? 'selected' : ''}>Admin</option>
          <option value="Supervisor" ${u.rol === 'Supervisor' ? 'selected' : ''}>Supervisor</option>
          <option value="Asesor" ${u.rol === 'Asesor' ? 'selected' : ''}>Asesor</option>
          <option value="Espectador" ${u.rol === 'Espectador' ? 'selected' : ''}>Espectador</option>
        `;
      }
    }

    if (modal) modal.classList.remove('hidden');
  },

  async eliminarUsuario(id, usuario) {
    if (confirm(`¿Está seguro de eliminar al usuario "${usuario}"? Se registrará en la auditoría del sistema.`)) {
      try {
        await API.delete(`/usuarios/${id}`);
        await this.cargarListaUsuarios();
        alert(`Usuario "${usuario}" eliminado con éxito.`);
      } catch (err) {
        alert('Error al eliminar usuario: ' + err.message);
      }
    }
  },

  cerrarModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
  }
};
