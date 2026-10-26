const ChatsModule = {
  contactos: [],
  activeContacto: null,
  isDockCollapsed: true,
  historial: [],
  pollingInterval: null,
  archivosAdjuntos: [],
  modoEdicion: null,
  emojisList: ['😊', '😀', '😂', '😍', '👍', '🙏', '❤️', '🔥', '🎉', '👋', '😎', '🤔', '😢', '😡', '👀', '💯', '✨', '🚀'],

  emojiShortcuts: [
    { pattern: /:\)/g, emoji: '😊' },
    { pattern: /:D/g, emoji: '😀' },
    { pattern: /;\)/g, emoji: '😉' },
    { pattern: /<3/g, emoji: '❤️' },
    { pattern: /:P/gi, emoji: '😛' },
    { pattern: /:\(/g, emoji: '😢' },
    { pattern: /:O/gi, emoji: '😮' }
  ],

  esUsuarioPermitido() {
    const user = API.getUser();
    if (!user || !user.rol) return false;
    const rol = (user.rol || '').trim().toLowerCase();
    return rol === 'asesor' || rol === 'admin';
  },

  destruir() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.activeContacto = null;
    this.contactos = [];
    this.historial = [];
    this.archivosAdjuntos = [];
    this.modoEdicion = null;
    const container = document.getElementById('chats-floating-container');
    if (container) {
      container.remove();
    }
  },

  async init() {
    if (!this.esUsuarioPermitido()) {
      this.destruir();
      return;
    }
    this.renderDock();
    await this.cargarContactos();
    this.iniciarPolling();
  },

  iniciarPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    if (!this.esUsuarioPermitido()) {
      this.destruir();
      return;
    }
    this.pollingInterval = setInterval(async () => {
      if (!this.esUsuarioPermitido()) {
        this.destruir();
        return;
      }
      const user = API.getUser();
      if (user) {
        await this.cargarContactos(true);
        if (this.activeContacto) {
          await this.cargarHistorial(this.activeContacto.id, false);
        }
      }
    }, 4000);
  },

  renderDock() {
    if (!this.esUsuarioPermitido()) {
      this.destruir();
      return;
    }
    let container = document.getElementById('chats-floating-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'chats-floating-container';
      container.className = 'chats-floating-container';
      document.body.appendChild(container);
    }

    container.innerHTML = `
      <div id="chat-contacts-dock" class="chat-contacts-dock collapsed">
        <div class="chat-contacts-header" onclick="ChatsModule.toggleDock()">
          <div class="flex-row align-center gap-1">
            <span>💬</span>
            <span>Contactos Activos</span>
            <span id="chat-dock-unread-badge" class="badge badge-danger hidden" style="border-radius: 9999px; margin-left: 0.25rem;">0</span>
          </div>
          <span id="chat-dock-toggle-arrow">▲</span>
        </div>
        <div id="chat-contacts-body" class="chat-contacts-body">
          <div class="text-center py-3 text-muted font-xs">Cargando usuarios...</div>
        </div>
      </div>
      <div id="chat-box-window-container"></div>
      <div id="chat-media-lightbox" class="chat-media-lightbox hidden" onclick="this.classList.add('hidden')"></div>
    `;
  },

  toggleDock() {
    const dock = document.getElementById('chat-contacts-dock');
    const arrow = document.getElementById('chat-dock-toggle-arrow');
    if (!dock) return;

    this.isDockCollapsed = !this.isDockCollapsed;
    if (this.isDockCollapsed) {
      dock.classList.add('collapsed');
      if (arrow) arrow.textContent = '▲';
    } else {
      dock.classList.remove('collapsed');
      if (arrow) arrow.textContent = '▼';
    }
  },

  async cargarContactos(silent = false) {
    if (!this.esUsuarioPermitido()) {
      this.destruir();
      return;
    }
    try {
      const res = await API.get('/chats/contactos');
      this.contactos = res || [];
      this.renderContactosList();
      this.actualizarBadgeGlobal();
    } catch (err) {
      if (!silent) console.error(err);
    }
  },

  renderContactosList() {
    const body = document.getElementById('chat-contacts-body');
    if (!body) return;

    if (this.contactos.length === 0) {
      body.innerHTML = '<div class="text-center py-3 text-muted font-xs">No hay otros usuarios registrados</div>';
      return;
    }

    let html = '';
    this.contactos.forEach(c => {
      const initials = (c.nombre_completo || c.usuario || 'U').substring(0, 2).toUpperCase();
      const unreadCount = parseInt(c.no_leidos, 10) || 0;
      const isActive = this.activeContacto && this.activeContacto.id === c.id;
      const preview = c.ultimo_mensaje ? this.escapeHtml(c.ultimo_mensaje) : `<span class="text-muted">${this.escapeHtml(c.rol || 'Usuario')}</span>`;

      html += `
        <div class="chat-contact-item ${isActive ? 'active' : ''}" onclick="ChatsModule.abrirChatCon(${c.id})">
          <div class="chat-contact-avatar">
            ${initials}
            <span class="chat-online-dot"></span>
          </div>
          <div class="chat-contact-details">
            <span class="chat-contact-name">${this.escapeHtml(c.nombre_completo)}</span>
            <span class="chat-contact-preview">${preview}</span>
          </div>
          ${unreadCount > 0 ? `<span class="badge badge-danger" style="border-radius: 9999px; font-size: 0.7rem;">${unreadCount}</span>` : ''}
        </div>
      `;
    });

    body.innerHTML = html;
  },

  actualizarBadgeGlobal() {
    let totalUnread = 0;
    this.contactos.forEach(c => {
      totalUnread += (parseInt(c.no_leidos, 10) || 0);
    });

    const badge = document.getElementById('chat-dock-unread-badge');
    if (badge) {
      badge.textContent = totalUnread;
      if (totalUnread > 0) {
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }
  },

  async abrirChatCon(contactoId) {
    if (!this.esUsuarioPermitido()) {
      this.destruir();
      return;
    }
    const contacto = this.contactos.find(c => c.id === contactoId);
    if (!contacto) return;

    this.activeContacto = contacto;
    contacto.no_leidos = 0;
    this.renderContactosList();
    this.actualizarBadgeGlobal();

    this.renderChatWindow();
    await this.cargarHistorial(contactoId, true);
  },

  cerrarChatActivo() {
    this.activeContacto = null;
    this.archivosAdjuntos = [];
    this.modoEdicion = null;
    const container = document.getElementById('chat-box-window-container');
    if (container) container.innerHTML = '';
    this.renderContactosList();
  },

  renderChatWindow() {
    const container = document.getElementById('chat-box-window-container');
    if (!container || !this.activeContacto) return;

    const c = this.activeContacto;

    container.innerHTML = `
      <div id="chat-box-window" class="chat-box-window">
        <div class="chat-box-header">
          <div class="chat-box-header-title">
            <span class="chat-online-dot" style="position: static; display: inline-block;"></span>
            <span class="chat-box-header-name" title="${this.escapeHtml(c.nombre_completo)}">${this.escapeHtml(c.nombre_completo)}</span>
          </div>
          <div class="chat-box-header-actions">
            <button type="button" class="chat-box-btn" onclick="ChatsModule.cerrarChatActivo()" title="Cerrar chat">✕</button>
          </div>
        </div>

        <div id="chat-box-messages" class="chat-box-messages">
          <div class="text-center py-4 text-muted font-xs">Cargando conversación...</div>
        </div>

        <div id="chat-media-previews-bar" class="chat-media-previews-bar hidden"></div>

        <div id="chat-editing-banner" class="chat-editing-banner hidden">
          <span>✏️ Editando mensaje</span>
          <button type="button" class="chat-box-btn" style="color: #92400E; font-size: 0.8rem;" onclick="ChatsModule.cancelarEdicion()">✕</button>
        </div>

        <div class="chat-box-footer">
          <div id="chat-emoji-popover" class="chat-emoji-picker-popover hidden"></div>

          <div class="chat-input-controls">
            <button type="button" class="chat-icon-btn" onclick="ChatsModule.toggleEmojiPicker()" title="Insertar emoji">😊</button>
            
            <label class="chat-icon-btn" style="margin: 0; cursor: pointer;" title="Adjuntar multimedia o imágenes">
              📎
              <input type="file" id="chat-file-input" style="display: none;" multiple accept="image/*,video/*" onchange="ChatsModule.onFilesSelected(this)">
            </label>

            <input type="text" id="chat-message-input" class="chat-input-field" placeholder="Escribe un mensaje... (máx 200)" maxlength="200" onkeydown="ChatsModule.onInputKeydown(event)" oninput="ChatsModule.onInputChange(this)">

            <button type="button" id="chat-btn-send" class="chat-btn-send" onclick="ChatsModule.enviarChat()" title="Enviar mensaje">➤</button>
          </div>
        </div>
      </div>
    `;

    this.renderEmojiPicker();
  },

  renderEmojiPicker() {
    const popover = document.getElementById('chat-emoji-popover');
    if (!popover) return;

    let html = '';
    this.emojisList.forEach(em => {
      html += `<button type="button" class="chat-emoji-btn" onclick="ChatsModule.insertarEmoji('${em}')">${em}</button>`;
    });
    popover.innerHTML = html;
  },

  toggleEmojiPicker() {
    const popover = document.getElementById('chat-emoji-popover');
    if (popover) {
      popover.classList.toggle('hidden');
    }
  },

  insertarEmoji(emoji) {
    const input = document.getElementById('chat-message-input');
    if (input) {
      input.value += emoji;
      input.focus();
    }
    const popover = document.getElementById('chat-emoji-popover');
    if (popover) popover.classList.add('hidden');
  },

  onInputChange(input) {
    let val = input.value;
    this.emojiShortcuts.forEach(rule => {
      val = val.replace(rule.pattern, rule.emoji);
    });
    if (val !== input.value) {
      input.value = val;
    }
  },

  onInputKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.enviarChat();
    }
  },

  onFilesSelected(input) {
    const files = Array.from(input.files || []);
    if (files.length === 0) return;

    const existingImages = this.archivosAdjuntos.filter(f => f.type.startsWith('image/')).length;
    const existingVideos = this.archivosAdjuntos.filter(f => f.type.startsWith('video/')).length;

    const newImages = files.filter(f => f.type.startsWith('image/')).length;
    const newVideos = files.filter(f => f.type.startsWith('video/')).length;

    if (existingImages + newImages > 5) {
      alert('Solo se pueden adjuntar hasta 5 imágenes por mensaje.');
      input.value = '';
      return;
    }

    if (existingVideos + newVideos > 1) {
      alert('Solo se puede adjuntar hasta 1 video por mensaje.');
      input.value = '';
      return;
    }

    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) {
        alert(`El archivo "${file.name}" supera el límite de 15 MB.`);
        input.value = '';
        return;
      }
      this.archivosAdjuntos.push(file);
    }

    input.value = '';
    this.renderMediaPreviews();
  },

  renderMediaPreviews() {
    const bar = document.getElementById('chat-media-previews-bar');
    if (!bar) return;

    if (this.archivosAdjuntos.length === 0) {
      bar.innerHTML = '';
      bar.classList.add('hidden');
      return;
    }

    bar.classList.remove('hidden');
    let html = '';
    this.archivosAdjuntos.forEach((f, idx) => {
      const isImg = f.type.startsWith('image/');
      const icon = isImg ? '🖼️' : '🎬';
      html += `
        <div class="chat-preview-item" title="${this.escapeHtml(f.name)}">
          <span style="font-size: 1.2rem; background: #E2E8F0; padding: 0.2rem 0.4rem; border-radius: var(--radius-xs);">${icon}</span>
          <button type="button" class="chat-preview-remove-btn" onclick="ChatsModule.removeAdjunto(${idx})">✕</button>
        </div>
      `;
    });
    bar.innerHTML = html;
  },

  removeAdjunto(idx) {
    this.archivosAdjuntos.splice(idx, 1);
    this.renderMediaPreviews();
  },

  async cargarHistorial(contactoId, autoScroll = true) {
    if (!this.esUsuarioPermitido()) {
      this.destruir();
      return;
    }
    if (!this.activeContacto || this.activeContacto.id !== contactoId) return;

    try {
      const res = await API.get(`/chats/${contactoId}`);
      this.historial = res || [];
      this.renderHistorial(autoScroll);
    } catch (err) {
      console.error(err);
    }
  },

  renderHistorial(autoScroll = true) {
    const box = document.getElementById('chat-box-messages');
    if (!box) return;

    const currentUser = API.getUser();
    const currentUserId = currentUser ? currentUser.id : null;

    if (this.historial.length === 0) {
      box.innerHTML = '<div class="text-center py-4 text-muted font-xs">No hay mensajes previos con este contacto.<br>¡Saluda para comenzar la conversación!</div>';
      return;
    }

    let html = '';
    const now = Date.now();

    this.historial.forEach(m => {
      const isOutgoing = m.emisor_id === currentUserId;
      const fecha = new Date(m.created_at);
      const horaStr = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
      const editadoStr = m.editado ? '<span style="font-style: italic;">(editado)</span>' : '';

      const diffMs = now - fecha.getTime();
      const canEditOrDelete = isOutgoing && (diffMs <= 60 * 60 * 1000);

      let mediaHtml = '';
      if (Array.isArray(m.adjuntos) && m.adjuntos.length > 0) {
        const imgs = m.adjuntos.filter(a => a.tipo === 'imagen');
        const vids = m.adjuntos.filter(a => a.tipo === 'video');

        if (imgs.length > 0) {
          mediaHtml += '<div class="chat-bubble-images">';
          imgs.forEach(img => {
            mediaHtml += `<img src="${img.ruta}" alt="${this.escapeHtml(img.nombre_original)}" class="chat-bubble-img-thumbnail" onclick="ChatsModule.abrirLightbox('${img.ruta}')">`;
          });
          mediaHtml += '</div>';
        }

        if (vids.length > 0) {
          vids.forEach(vid => {
            mediaHtml += `<video controls class="chat-bubble-video-player"><source src="${vid.ruta}" type="${vid.tipo_mime}">Tu navegador no soporta reproducción de video.</video>`;
          });
        }
      }

      const bodyText = m.contenido ? this.autoLinkearTexto(m.contenido) : '';

      html += `
        <div class="chat-bubble-wrapper ${isOutgoing ? 'outgoing' : 'incoming'}">
          ${canEditOrDelete ? `
            <div class="chat-bubble-actions">
              <button type="button" class="chat-action-btn-small" onclick="ChatsModule.iniciarEdicion(${m.id})" title="Editar (hasta 1 hora)">✏️</button>
              <button type="button" class="chat-action-btn-small" onclick="ChatsModule.eliminarChat(${m.id})" title="Eliminar (hasta 1 hora)">🗑️</button>
            </div>
          ` : ''}

          <div class="chat-bubble ${isOutgoing ? 'outgoing' : 'incoming'}">
            <div>${bodyText}</div>
            ${mediaHtml}
            <div class="chat-bubble-meta">
              <span>${horaStr}</span>
              ${editadoStr}
            </div>
          </div>
        </div>
      `;
    });

    box.innerHTML = html;

    if (autoScroll) {
      box.scrollTop = box.scrollHeight;
    }
  },

  abrirLightbox(url) {
    const lightbox = document.getElementById('chat-media-lightbox');
    if (!lightbox) return;
    lightbox.innerHTML = `<img src="${url}" alt="Zoom">`;
    lightbox.classList.remove('hidden');
  },

  iniciarEdicion(mensajeId) {
    const msg = this.historial.find(m => m.id === mensajeId);
    if (!msg) return;

    this.modoEdicion = msg;
    const banner = document.getElementById('chat-editing-banner');
    if (banner) banner.classList.remove('hidden');

    const input = document.getElementById('chat-message-input');
    if (input) {
      input.value = msg.contenido || '';
      input.focus();
    }
  },

  cancelarEdicion() {
    this.modoEdicion = null;
    const banner = document.getElementById('chat-editing-banner');
    if (banner) banner.classList.add('hidden');

    const input = document.getElementById('chat-message-input');
    if (input) input.value = '';
  },

  async eliminarChat(mensajeId) {
    if (!confirm('¿Confirma que desea eliminar este mensaje de chat?')) return;

    try {
      await API.delete(`/chats/${mensajeId}`);
      this.historial = this.historial.filter(m => m.id !== mensajeId);
      this.renderHistorial(false);
      this.cargarContactos(true);
    } catch (err) {
      alert('Error al eliminar mensaje: ' + err.message);
    }
  },

  async enviarChat() {
    if (!this.esUsuarioPermitido()) {
      this.destruir();
      return;
    }
    if (!this.activeContacto) return;

    const input = document.getElementById('chat-message-input');
    const texto = input ? input.value.trim() : '';

    if (this.modoEdicion) {
      if (!texto) {
        alert('El contenido del mensaje editado no puede estar vacío.');
        return;
      }
      try {
        const res = await API.put(`/chats/${this.modoEdicion.id}`, { contenido: texto });
        const idx = this.historial.findIndex(m => m.id === this.modoEdicion.id);
        if (idx !== -1 && res.chat) {
          this.historial[idx] = { ...this.historial[idx], ...res.chat };
        }
        this.cancelarEdicion();
        this.renderHistorial(false);
        this.cargarContactos(true);
      } catch (err) {
        alert('Error al editar chat: ' + err.message);
      }
      return;
    }

    if (!texto && this.archivosAdjuntos.length === 0) {
      return;
    }

    if (texto.length > 200) {
      alert('El chat no puede superar los 200 caracteres.');
      return;
    }

    const formData = new FormData();
    formData.append('receptor_id', this.activeContacto.id);
    formData.append('contenido', texto);

    this.archivosAdjuntos.forEach(file => {
      formData.append('archivos', file);
    });

    const btnSend = document.getElementById('chat-btn-send');
    if (btnSend) btnSend.disabled = true;

    try {
      const token = API.getToken();
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al enviar el chat.');
      }

      if (input) input.value = '';
      this.archivosAdjuntos = [];
      this.renderMediaPreviews();

      this.historial.push(data);
      this.renderHistorial(true);
      this.cargarContactos(true);
    } catch (err) {
      alert(err.message || 'Error al enviar mensaje');
    } finally {
      if (btnSend) btnSend.disabled = false;
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
