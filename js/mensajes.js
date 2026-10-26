const MensajesModule = {
  currentView: 'inbox',
  currentInboxFilter: 'todos',
  contactos: [],
  selectedParaIds: new Set(),
  selectedAccIds: new Set(),
  inboxData: [],
  sentData: [],
  pollingInterval: null,
  archivosParaEnviar: [],

  async init() {
    await this.cargarContactos();
    await this.actualizarBadge();
    await this.cargarVistaActual();
    this.iniciarPolling();
  },

  iniciarPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(async () => {
      const user = API.getUser();
      if (user) {
        await this.actualizarBadge();
      }
    }, 20000);
  },

  async actualizarBadge() {
    try {
      const res = await API.get('/mensajes/unread-count');
      const count = res.unread_count || 0;
      const badgeNav = document.getElementById('badge-mensajes-unread');
      const counterInbox = document.getElementById('mensajes-inbox-counter');

      if (badgeNav) {
        badgeNav.textContent = count;
        if (count > 0) {
          badgeNav.classList.remove('hidden');
        } else {
          badgeNav.classList.add('hidden');
        }
      }

      if (counterInbox) {
        counterInbox.textContent = count;
        counterInbox.className = count > 0 ? 'badge badge-danger' : 'badge badge-secondary';
      }
    } catch (err) {
      console.error(err);
    }
  },

  async cargarContactos() {
    try {
      this.contactos = await API.get('/mensajes/contactos');
      this.renderContactosSelect();
    } catch (err) {
      console.error(err);
    }
  },

  renderContactosSelect() {
    const paraBox = document.getElementById('mensaje-para-container');
    const accBox = document.getElementById('mensaje-acc-container');
    const selectPara = document.getElementById('mensaje-input-para');

    if (this.contactos.length === 0) {
      if (paraBox) paraBox.innerHTML = '<div class="text-muted font-xs">No hay usuarios disponibles</div>';
      if (accBox) accBox.innerHTML = '<div class="text-muted font-xs">No hay usuarios disponibles</div>';
      if (selectPara) selectPara.innerHTML = '<option value="">Sin usuarios</option>';
      return;
    }

    if (selectPara) {
      let html = '<option value="">Seleccione un usuario...</option>';
      this.contactos.forEach(c => {
        html += `<option value="${c.id}">${this.escapeHtml(c.nombre_completo)} (${this.escapeHtml(c.usuario)} - ${this.escapeHtml(c.rol)})</option>`;
      });
      selectPara.innerHTML = html;
    }

    if (paraBox) {
      let htmlPara = '';
      this.contactos.forEach(c => {
        const isChecked = this.selectedParaIds.has(c.id);
        htmlPara += `
          <label class="mensaje-acc-chip ${isChecked ? 'selected' : ''}" id="chip-para-${c.id}">
            <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''} onchange="MensajesModule.togglePara(${c.id}, this.checked)">
            <span>${this.escapeHtml(c.nombre_completo)}</span>
          </label>
        `;
      });
      paraBox.innerHTML = htmlPara;
    }

    if (accBox) {
      let htmlAcc = '';
      this.contactos.forEach(c => {
        const isChecked = this.selectedAccIds.has(c.id);
        htmlAcc += `
          <label class="mensaje-acc-chip ${isChecked ? 'selected' : ''}" id="chip-acc-${c.id}">
            <input type="checkbox" value="${c.id}" ${isChecked ? 'checked' : ''} onchange="MensajesModule.toggleAcc(${c.id}, this.checked)">
            <span>${this.escapeHtml(c.nombre_completo)}</span>
          </label>
        `;
      });
      accBox.innerHTML = htmlAcc;
    }
  },

  togglePara(userId, isChecked) {
    if (isChecked) {
      this.selectedParaIds.add(userId);
      if (this.selectedAccIds.has(userId)) {
        this.selectedAccIds.delete(userId);
        const chipAcc = document.getElementById(`chip-acc-${userId}`);
        if (chipAcc) {
          chipAcc.classList.remove('selected');
          const chk = chipAcc.querySelector('input');
          if (chk) chk.checked = false;
        }
        this.actualizarContadorAcc();
      }
    } else {
      this.selectedParaIds.delete(userId);
    }

    const chip = document.getElementById(`chip-para-${userId}`);
    if (chip) {
      if (isChecked && this.selectedParaIds.has(userId)) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    }

    const selectPara = document.getElementById('mensaje-input-para');
    if (selectPara) {
      const firstId = Array.from(this.selectedParaIds)[0];
      selectPara.value = firstId || '';
    }

    this.actualizarContadorPara();
  },

  toggleAcc(userId, isChecked) {
    if (isChecked) {
      this.selectedAccIds.add(userId);
      if (this.selectedParaIds.has(userId)) {
        this.selectedParaIds.delete(userId);
        const chipPara = document.getElementById(`chip-para-${userId}`);
        if (chipPara) {
          chipPara.classList.remove('selected');
          const chk = chipPara.querySelector('input');
          if (chk) chk.checked = false;
        }
        this.actualizarContadorPara();
      }
    } else {
      this.selectedAccIds.delete(userId);
    }

    const chip = document.getElementById(`chip-acc-${userId}`);
    if (chip) {
      if (isChecked && this.selectedAccIds.has(userId)) {
        chip.classList.add('selected');
      } else {
        chip.classList.remove('selected');
      }
    }

    this.actualizarContadorAcc();
  },

  actualizarContadorPara() {
    const countLabel = document.getElementById('mensaje-para-count');
    if (countLabel) {
      const n = this.selectedParaIds.size;
      countLabel.textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`;
    }
  },

  actualizarContadorAcc() {
    const countLabel = document.getElementById('mensaje-acc-count');
    if (countLabel) {
      const n = this.selectedAccIds.size;
      countLabel.textContent = `${n} seleccionado${n !== 1 ? 's' : ''}`;
    }
  },

  seleccionarTodosPara() {
    this.contactos.forEach(c => {
      this.selectedParaIds.add(c.id);
      this.selectedAccIds.delete(c.id);
      const chipPara = document.getElementById(`chip-para-${c.id}`);
      if (chipPara) {
        chipPara.classList.add('selected');
        const chk = chipPara.querySelector('input');
        if (chk) chk.checked = true;
      }
      const chipAcc = document.getElementById(`chip-acc-${c.id}`);
      if (chipAcc) {
        chipAcc.classList.remove('selected');
        const chk = chipAcc.querySelector('input');
        if (chk) chk.checked = false;
      }
    });
    const selectPara = document.getElementById('mensaje-input-para');
    if (selectPara) {
      const firstId = Array.from(this.selectedParaIds)[0];
      selectPara.value = firstId || '';
    }
    this.actualizarContadorPara();
    this.actualizarContadorAcc();
  },

  deseleccionarTodosPara() {
    this.selectedParaIds.clear();
    document.querySelectorAll('#mensaje-para-container .mensaje-acc-chip').forEach(c => {
      c.classList.remove('selected');
      const chk = c.querySelector('input');
      if (chk) chk.checked = false;
    });
    const selectPara = document.getElementById('mensaje-input-para');
    if (selectPara) selectPara.value = '';
    this.actualizarContadorPara();
  },

  seleccionarTodosAcc() {
    this.contactos.forEach(c => {
      if (!this.selectedParaIds.has(c.id)) {
        this.selectedAccIds.add(c.id);
        const chipAcc = document.getElementById(`chip-acc-${c.id}`);
        if (chipAcc) {
          chipAcc.classList.add('selected');
          const chk = chipAcc.querySelector('input');
          if (chk) chk.checked = true;
        }
      }
    });
    this.actualizarContadorAcc();
  },

  deseleccionarTodosAcc() {
    this.selectedAccIds.clear();
    document.querySelectorAll('#mensaje-acc-container .mensaje-acc-chip').forEach(c => {
      c.classList.remove('selected');
      const chk = c.querySelector('input');
      if (chk) chk.checked = false;
    });
    this.actualizarContadorAcc();
  },

  cambiarVista(vista) {
    this.currentView = vista;

    const btnInbox = document.getElementById('mensajes-tab-btn-inbox');
    const btnSent = document.getElementById('mensajes-tab-btn-sent');
    const secInbox = document.getElementById('mensajes-sec-inbox');
    const secSent = document.getElementById('mensajes-sec-sent');

    if (vista === 'inbox') {
      if (btnInbox) btnInbox.classList.add('active');
      if (btnSent) btnSent.classList.remove('active');
      if (secInbox) secInbox.classList.remove('hidden');
      if (secSent) secSent.classList.add('hidden');
      this.cargarInbox();
    } else {
      if (btnSent) btnSent.classList.add('active');
      if (btnInbox) btnInbox.classList.remove('active');
      if (secSent) secSent.classList.remove('hidden');
      if (secInbox) secInbox.classList.add('hidden');
      this.cargarSent();
    }
  },

  async cargarVistaActual() {
    if (this.currentView === 'inbox') {
      await this.cargarInbox();
    } else {
      await this.cargarSent();
    }
  },

  recargarListaActual() {
    this.cargarVistaActual();
    this.actualizarBadge();
  },

  filtrarInbox(filtro, btnEl) {
    this.currentInboxFilter = filtro;
    if (btnEl) {
      const parent = btnEl.parentElement;
      if (parent) {
        parent.querySelectorAll('.btn-tab-nested').forEach(b => b.classList.remove('active'));
        btnEl.classList.add('active');
      }
    }
    this.cargarInbox();
  },

  async cargarInbox() {
    const tbody = document.getElementById('tabla-mensajes-inbox-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Cargando mensajes...</td></tr>';
    }

    try {
      const res = await API.get(`/mensajes/inbox?filtro=${encodeURIComponent(this.currentInboxFilter)}`);
      this.inboxData = res || [];
      this.renderInboxTable(this.inboxData);
    } catch (err) {
      console.error(err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error al cargar la bandeja de entrada.</td></tr>';
      }
    }
  },

  renderInboxTable(items) {
    const tbody = document.getElementById('tabla-mensajes-inbox-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No hay mensajes para mostrar en esta vista.</td></tr>';
      return;
    }

    let html = '';
    items.forEach(m => {
      const isUnread = !m.leido;
      const isFav = !!m.favorito;
      const hasAdj = (parseInt(m.total_adjuntos, 10) || 0) > 0;
      const fechaStr = this.formatearFecha(m.created_at);
      const asuntoStr = m.asunto ? this.escapeHtml(m.asunto) : '<em class="text-muted">(Sin asunto)</em>';
      const remitenteStr = this.escapeHtml(m.remitente_nombre || m.remitente_usuario || 'Desconocido');
      const tipoBadge = m.tipo_destinatario === 'acc' ? '<span class="badge badge-secondary" style="font-size: 0.68rem; margin-left: 0.35rem;">ACC</span>' : '';

      html += `
        <tr class="${isUnread ? 'mensaje-unread-row' : ''}" style="cursor: pointer;" onclick="MensajesModule.onFilaClick(event, ${m.id || m.mensaje_id})">
          <td style="text-align: center;">
            <button type="button" class="btn-star-fav ${isFav ? 'is-favorite' : ''}" onclick="MensajesModule.toggleFavorito(event, ${m.id || m.mensaje_id}, ${isFav})" title="${isFav ? 'Quitar de favoritos' : 'Marcar como favorito'}">
              ${isFav ? '⭐' : '☆'}
            </button>
          </td>
          <td>
            <div class="flex-row align-center">
              ${isUnread ? '<span class="mensaje-unread-dot" title="No leído"></span>' : ''}
              <span class="${isUnread ? 'font-bold' : ''}">${remitenteStr}</span>
              ${tipoBadge}
            </div>
          </td>
          <td>
            <div class="${isUnread ? 'font-bold' : ''}" style="max-width: 480px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${asuntoStr}
            </div>
          </td>
          <td style="text-align: center;">
            ${hasAdj ? '<span title="Contiene archivos adjuntos">📎</span>' : ''}
          </td>
          <td class="font-xs text-muted">
            ${fechaStr}
          </td>
          <td style="text-align: right;">
            <div class="flex-row justify-end align-center gap-1" style="justify-content: flex-end;">
              <button type="button" class="btn btn-xs btn-outline-secondary" onclick="MensajesModule.toggleLeido(event, ${m.id || m.mensaje_id}, ${!isUnread})" title="${isUnread ? 'Marcar como leído' : 'Marcar como no leído'}">
                ${isUnread ? '👁️' : '✉️'}
              </button>
              <button type="button" class="btn btn-xs btn-outline-danger" onclick="MensajesModule.eliminarMensaje(event, ${m.id || m.mensaje_id})" title="Eliminar mensaje">
                🗑️
              </button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  async cargarSent() {
    const tbody = document.getElementById('tabla-mensajes-sent-body');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Cargando mensajes enviados...</td></tr>';
    }

    try {
      const res = await API.get('/mensajes/sent');
      this.sentData = res || [];
      this.renderSentTable(this.sentData);
    } catch (err) {
      console.error(err);
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error al cargar mensajes enviados.</td></tr>';
      }
    }
  },

  renderSentTable(items) {
    const tbody = document.getElementById('tabla-mensajes-sent-body');
    if (!tbody) return;

    if (!items || items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No has enviado ningún mensaje aún.</td></tr>';
      return;
    }

    let html = '';
    items.forEach(m => {
      const hasAdj = (parseInt(m.total_adjuntos, 10) || 0) > 0;
      const fechaStr = this.formatearFecha(m.created_at);
      const asuntoStr = m.asunto ? this.escapeHtml(m.asunto) : '<em class="text-muted">(Sin asunto)</em>';
      
      let destStr = '';
      if (Array.isArray(m.destinatarios) && m.destinatarios.length > 0) {
        destStr = m.destinatarios.map(d => {
          const badge = d.tipo === 'acc' ? ' <span class="badge badge-secondary" style="font-size: 0.65rem;">ACC</span>' : '';
          return `${this.escapeHtml(d.nombre_completo || d.usuario)}${badge}`;
        }).join(', ');
      } else {
        destStr = '<span class="text-muted">Sin destinatarios</span>';
      }

      html += `
        <tr style="cursor: pointer;" onclick="MensajesModule.onFilaClick(event, ${m.id})">
          <td>
            <div style="max-width: 320px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${destStr}
            </div>
          </td>
          <td>
            <div style="max-width: 450px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${asuntoStr}
            </div>
          </td>
          <td style="text-align: center;">
            ${hasAdj ? '<span title="Contiene archivos adjuntos">📎</span>' : ''}
          </td>
          <td class="font-xs text-muted">
            ${fechaStr}
          </td>
          <td style="text-align: right;">
            <button type="button" class="btn btn-xs btn-outline-danger" onclick="MensajesModule.eliminarMensaje(event, ${m.id})" title="Eliminar registro de envío">
              🗑️
            </button>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  buscarEnLista(texto) {
    const term = (texto || '').toLowerCase().trim();
    if (this.currentView === 'inbox') {
      if (!term) {
        this.renderInboxTable(this.inboxData);
        return;
      }
      const filtrados = this.inboxData.filter(m => {
        const remitente = (m.remitente_nombre || m.remitente_usuario || '').toLowerCase();
        const asunto = (m.asunto || '').toLowerCase();
        return remitente.includes(term) || asunto.includes(term);
      });
      this.renderInboxTable(filtrados);
    } else {
      if (!term) {
        this.renderSentTable(this.sentData);
        return;
      }
      const filtrados = this.sentData.filter(m => {
        const asunto = (m.asunto || '').toLowerCase();
        const dests = Array.isArray(m.destinatarios) ? m.destinatarios.map(d => (d.nombre_completo || d.usuario || '').toLowerCase()).join(' ') : '';
        return asunto.includes(term) || dests.includes(term);
      });
      this.renderSentTable(filtrados);
    }
  },

  onFilaClick(e, mensajeId) {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('a')) {
      return;
    }
    this.abrirMensaje(mensajeId);
  },

  async toggleFavorito(e, mensajeId, estadoActual) {
    if (e) e.stopPropagation();
    try {
      await API.patch(`/mensajes/${mensajeId}/favorito`, { favorito: !estadoActual });
      const item = this.inboxData.find(x => (x.id === mensajeId || x.mensaje_id === mensajeId));
      if (item) item.favorito = !estadoActual;
      if (this.currentInboxFilter === 'favoritos' && estadoActual) {
        this.inboxData = this.inboxData.filter(x => (x.id !== mensajeId && x.mensaje_id !== mensajeId));
      }
      this.renderInboxTable(this.inboxData);
    } catch (err) {
      alert('Error al actualizar favorito: ' + err.message);
    }
  },

  async toggleLeido(e, mensajeId, nuevoEstado) {
    if (e) e.stopPropagation();
    try {
      await API.patch(`/mensajes/${mensajeId}/leido`, { leido: nuevoEstado });
      const item = this.inboxData.find(x => (x.id === mensajeId || x.mensaje_id === mensajeId));
      if (item) item.leido = nuevoEstado;
      this.renderInboxTable(this.inboxData);
      await this.actualizarBadge();
    } catch (err) {
      alert('Error al actualizar estado de lectura: ' + err.message);
    }
  },

  async eliminarMensaje(e, mensajeId) {
    if (e) e.stopPropagation();
    if (!confirm('¿Confirma que desea eliminar este mensaje?')) return;

    try {
      await API.delete(`/mensajes/${mensajeId}`);
      if (this.currentView === 'inbox') {
        this.inboxData = this.inboxData.filter(x => (x.id !== mensajeId && x.mensaje_id !== mensajeId));
        this.renderInboxTable(this.inboxData);
      } else {
        this.sentData = this.sentData.filter(x => x.id !== mensajeId);
        this.renderSentTable(this.sentData);
      }
      await this.actualizarBadge();
    } catch (err) {
      alert('Error al eliminar mensaje: ' + err.message);
    }
  },

  async abrirMensaje(mensajeId) {
    try {
      const msg = await API.get(`/mensajes/${mensajeId}`);
      this.renderModalLectura(msg);
      
      const itemInbox = this.inboxData.find(x => (x.id === mensajeId || x.mensaje_id === mensajeId));
      if (itemInbox && !itemInbox.leido) {
        itemInbox.leido = true;
        this.renderInboxTable(this.inboxData);
        await this.actualizarBadge();
      }
    } catch (err) {
      alert('Error al cargar el mensaje: ' + err.message);
    }
  },

  renderModalLectura(msg) {
    const modal = document.getElementById('modal-leer-mensaje');
    if (!modal) return;

    const tituloEl = document.getElementById('leer-mensaje-titulo-asunto');
    const remitenteNomEl = document.getElementById('leer-mensaje-remitente-nombre');
    const remitenteUsrEl = document.getElementById('leer-mensaje-remitente-usuario');
    const fechaEl = document.getElementById('leer-mensaje-fecha');
    const paraEl = document.getElementById('leer-mensaje-destinatario-para');
    const accRow = document.getElementById('leer-mensaje-row-acc');
    const accEl = document.getElementById('leer-mensaje-destinatarios-acc');
    const cuerpoEl = document.getElementById('leer-mensaje-cuerpo-texto');
    const secAdj = document.getElementById('leer-mensaje-sec-adjuntos');
    const totalAdjEl = document.getElementById('leer-mensaje-total-adjuntos');
    const listaAdjEl = document.getElementById('leer-mensaje-lista-adjuntos');
    const accionesLeft = document.getElementById('leer-mensaje-acciones-left');

    if (tituloEl) tituloEl.textContent = msg.asunto ? msg.asunto : '(Sin Asunto)';
    if (remitenteNomEl) remitenteNomEl.textContent = msg.remitente_nombre || 'Usuario';
    if (remitenteUsrEl) remitenteUsrEl.textContent = `@${msg.remitente_usuario || ''}`;
    if (fechaEl) fechaEl.textContent = this.formatearFecha(msg.created_at);

    const paraList = (msg.destinatarios || []).filter(d => d.tipo === 'para');
    const accList = (msg.destinatarios || []).filter(d => d.tipo === 'acc');

    if (paraEl) {
      paraEl.textContent = paraList.map(d => `${d.nombre_completo} (@${d.usuario})`).join(', ') || '-';
    }

    if (accRow && accEl) {
      if (accList.length > 0) {
        accRow.classList.remove('hidden');
        accEl.textContent = accList.map(d => `${d.nombre_completo} (@${d.usuario})`).join(', ');
      } else {
        accRow.classList.add('hidden');
      }
    }

    if (cuerpoEl) {
      cuerpoEl.innerHTML = this.autoLinkearTexto(msg.cuerpo || '');
    }

    const adjuntos = msg.adjuntos || [];
    if (secAdj && totalAdjEl && listaAdjEl) {
      if (adjuntos.length > 0) {
        secAdj.classList.remove('hidden');
        totalAdjEl.textContent = adjuntos.length;

        let adjHtml = '';
        adjuntos.forEach(a => {
          const ext = a.nombre_original ? a.nombre_original.split('.').pop().toLowerCase() : '';
          let icon = '📄';
          if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) icon = '🖼️';
          else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) icon = '🎬';
          else if (['mp3', 'wav', 'ogg'].includes(ext)) icon = '🎵';
          else if (['pdf'].includes(ext)) icon = '📕';
          else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) icon = '📦';
          else if (['doc', 'docx', 'xls', 'xlsx', 'csv'].includes(ext)) icon = '📊';

          const sizeStr = this.formatearBytes(a.peso_bytes);

          adjHtml += `
            <a href="${a.ruta}" target="_blank" download="${this.escapeHtml(a.nombre_original)}" class="mensaje-adjunto-card" title="Descargar ${this.escapeHtml(a.nombre_original)}">
              <span class="mensaje-adjunto-icon">${icon}</span>
              <div class="mensaje-adjunto-info">
                <span class="mensaje-adjunto-name">${this.escapeHtml(a.nombre_original)}</span>
                <span class="mensaje-adjunto-size">${sizeStr}</span>
              </div>
              <span style="font-size: 0.9rem;">⬇️</span>
            </a>
          `;
        });
        listaAdjEl.innerHTML = adjHtml;
      } else {
        secAdj.classList.add('hidden');
      }
    }

    if (accionesLeft) {
      let leftHtml = '';
      if (!msg.es_remitente && msg.estado_destinatario) {
        const isFav = !!msg.estado_destinatario.favorito;
        leftHtml += `
          <button type="button" class="btn btn-outline-secondary" onclick="MensajesModule.toggleFavorito(event, ${msg.id}, ${isFav}); MensajesModule.cerrarModalLeer();">
            ${isFav ? '⭐ Quitar Favorito' : '☆ Marcar Favorito'}
          </button>
          <button type="button" class="btn btn-outline-secondary" onclick="MensajesModule.toggleLeido(event, ${msg.id}, false); MensajesModule.cerrarModalLeer();">
            ✉️ Marcar No Leído
          </button>
        `;
      }
      leftHtml += `
        <button type="button" class="btn btn-outline-danger" onclick="MensajesModule.eliminarMensaje(event, ${msg.id}); MensajesModule.cerrarModalLeer();">
          🗑️ Eliminar
        </button>
      `;
      accionesLeft.innerHTML = leftHtml;
    }

    modal.classList.remove('hidden');
  },

  cerrarModalLeer() {
    const modal = document.getElementById('modal-leer-mensaje');
    if (modal) modal.classList.add('hidden');
  },

  abrirModalRedactar() {
    const modal = document.getElementById('modal-redactar-mensaje');
    if (!modal) return;

    this.selectedParaIds.clear();
    this.selectedAccIds.clear();
    this.archivosParaEnviar = [];

    const form = document.getElementById('form-redactar-mensaje');
    if (form) form.reset();

    const alertEl = document.getElementById('alert-redactar-mensaje');
    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    this.actualizarContadorPara();
    this.actualizarContadorAcc();

    const countCuerpo = document.getElementById('mensaje-cuerpo-counter');
    if (countCuerpo) countCuerpo.textContent = '0 / 10.000 caracteres';

    const previewAdj = document.getElementById('mensaje-adjuntos-preview');
    if (previewAdj) previewAdj.innerHTML = '';

    document.querySelectorAll('#mensaje-para-container .mensaje-acc-chip').forEach(c => {
      c.classList.remove('selected');
      const chk = c.querySelector('input');
      if (chk) chk.checked = false;
    });

    document.querySelectorAll('#mensaje-acc-container .mensaje-acc-chip').forEach(c => {
      c.classList.remove('selected');
      const chk = c.querySelector('input');
      if (chk) chk.checked = false;
    });

    modal.classList.remove('hidden');
  },

  cerrarModalRedactar() {
    const modal = document.getElementById('modal-redactar-mensaje');
    if (modal) modal.classList.add('hidden');
  },

  actualizarContadorCuerpo(textarea) {
    const countEl = document.getElementById('mensaje-cuerpo-counter');
    if (countEl && textarea) {
      const len = textarea.value.length;
      countEl.textContent = `${len.toLocaleString('es-AR')} / 10.000 caracteres`;
      if (len > 9500) {
        countEl.classList.add('text-danger');
      } else {
        countEl.classList.remove('text-danger');
      }
    }
  },

  onArchivosSeleccionados(input) {
    const files = Array.from(input.files || []);
    if (files.length > 10) {
      alert('Solo puede adjuntar un máximo de 10 archivos por mensaje.');
      input.value = '';
      this.archivosParaEnviar = [];
      this.renderArchivosPreview();
      return;
    }

    const oversized = files.filter(f => f.size > 25 * 1024 * 1024);
    if (oversized.length > 0) {
      alert(`El archivo "${oversized[0].name}" supera el límite de 25 MB.`);
      input.value = '';
      this.archivosParaEnviar = [];
      this.renderArchivosPreview();
      return;
    }

    this.archivosParaEnviar = files;
    this.renderArchivosPreview();
  },

  renderArchivosPreview() {
    const container = document.getElementById('mensaje-adjuntos-preview');
    if (!container) return;

    if (this.archivosParaEnviar.length === 0) {
      container.innerHTML = '';
      return;
    }

    let html = '';
    this.archivosParaEnviar.forEach((f, idx) => {
      html += `
        <div class="mensaje-adjunto-item">
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80%;">📎 ${this.escapeHtml(f.name)} (${this.formatearBytes(f.size)})</span>
          <button type="button" class="btn btn-xs btn-outline-danger" onclick="MensajesModule.removerArchivo(${idx})">✕</button>
        </div>
      `;
    });
    container.innerHTML = html;
  },

  removerArchivo(index) {
    this.archivosParaEnviar.splice(index, 1);
    this.renderArchivosPreview();
    const input = document.getElementById('mensaje-input-adjuntos');
    if (input) input.value = '';
  },

  async enviarMensaje(e) {
    if (e) e.preventDefault();

    const alertEl = document.getElementById('alert-redactar-mensaje');
    const btnSubmit = document.getElementById('btn-enviar-mensaje-submit');
    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    const paraArray = Array.from(this.selectedParaIds);
    const asunto = document.getElementById('mensaje-input-asunto').value.trim();
    const cuerpo = document.getElementById('mensaje-input-cuerpo').value.trim();

    if (paraArray.length === 0) {
      this.mostrarAlertaRedactar('Debe seleccionar al menos un destinatario principal (Para).');
      return;
    }

    if (!cuerpo) {
      this.mostrarAlertaRedactar('El mensaje no puede estar vacío.');
      return;
    }

    if (cuerpo.length > 10000) {
      this.mostrarAlertaRedactar('El mensaje supera el límite máximo de 10.000 caracteres.');
      return;
    }

    const formData = new FormData();
    formData.append('destinatarios_ids', JSON.stringify(paraArray));
    formData.append('destinatario_id', paraArray[0]);
    formData.append('asunto', asunto);
    formData.append('cuerpo', cuerpo);

    const accArray = Array.from(this.selectedAccIds);
    if (accArray.length > 0) {
      formData.append('acc_ids', JSON.stringify(accArray));
    }

    this.archivosParaEnviar.forEach(file => {
      formData.append('adjuntos', file);
    });

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando...';
      }

      const token = API.getToken();
      const res = await fetch('/api/mensajes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el mensaje.');
      }

      this.cerrarModalRedactar();
      alert('Mensaje enviado exitosamente.');

      if (this.currentView === 'sent') {
        this.cargarSent();
      } else {
        this.cargarInbox();
      }
    } catch (err) {
      this.mostrarAlertaRedactar(err.message || 'Error inesperado al enviar mensaje.');
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>🚀</span> Enviar Mensaje';
      }
    }
  },

  mostrarAlertaRedactar(mensaje) {
    const alertEl = document.getElementById('alert-redactar-mensaje');
    if (alertEl) {
      alertEl.className = 'form-alert error mb-3';
      alertEl.textContent = mensaje;
      alertEl.classList.remove('hidden');
    } else {
      alert(mensaje);
    }
  },

  autoLinkearTexto(texto) {
    if (!texto) return '';
    const escaped = this.escapeHtml(texto);
    const urlPattern = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/gi;
    return escaped.replace(urlPattern, url => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
  },

  formatearFecha(isoString) {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  },

  formatearBytes(bytes) {
    const n = parseInt(bytes, 10);
    if (isNaN(n) || n === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(n) / Math.log(k));
    return parseFloat((n / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
