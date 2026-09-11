const RegistrosModule = {
  currentPage: 1,
  totalPages: 1,
  totalRecords: 0,

  async init() {
    this.bindEvents();
    await this.cargarPagina(1);
  },

  bindEvents() {
    const btnPrev = document.getElementById('btn-audit-prev');
    const btnNext = document.getElementById('btn-audit-next');

    if (btnPrev) {
      btnPrev.onclick = () => {
        if (this.currentPage > 1) {
          this.cargarPagina(this.currentPage - 1);
        }
      };
    }

    if (btnNext) {
      btnNext.onclick = () => {
        if (this.currentPage < this.totalPages) {
          this.cargarPagina(this.currentPage + 1);
        }
      };
    }
  },

  async cargarPagina(page) {
    const tbody = document.getElementById('tabla-registros-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Cargando registros de auditoría...</td></tr>';

    try {
      const res = await API.get(`/auditoria?page=${page}`);
      this.currentPage = res.page;
      this.totalPages = res.total_pages;
      this.totalRecords = res.total_records;

      this.renderTabla(res.data);
      this.renderPaginacion();
    } catch (err) {
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error al cargar registros: ${err.message}</td></tr>`;
    }
  },

  renderTabla(registros) {
    const tbody = document.getElementById('tabla-registros-body');
    if (!tbody) return;

    if (registros.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-muted">No existen registros de auditoría aún.</td></tr>';
      return;
    }

    tbody.innerHTML = registros.map(r => {
      const fechaObj = new Date(r.fecha);
      const fechaStr = fechaObj.toLocaleString('es-AR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      let cambioTexto = '-';

      if (r.datos_anteriores) {
        if (typeof r.datos_anteriores === 'string') {
          cambioTexto = r.datos_anteriores;
        } else if (r.datos_anteriores.resumen) {
          cambioTexto = `<div class="audit-detail">${r.datos_anteriores.resumen}</div>`;
        } else {
          cambioTexto = `<pre class="audit-json">${JSON.stringify(r.datos_anteriores, null, 2)}</pre>`;
        }
      }

      return `
        <tr>
          <td><span class="text-muted font-mono">${fechaStr}</span></td>
          <td><strong class="text-dark">${r.accion}</strong></td>
          <td><span class="badge badge-user">${r.realizado_por}</span></td>
          <td class="audit-change-cell">${cambioTexto}</td>
        </tr>
      `;
    }).join('');
  },

  renderPaginacion() {
    const infoEl = document.getElementById('audit-pagination-info');
    const btnPrev = document.getElementById('btn-audit-prev');
    const btnNext = document.getElementById('btn-audit-next');

    if (infoEl) {
      infoEl.textContent = `Página ${this.currentPage} de ${this.totalPages} (Total: ${this.totalRecords} registros - 20 por página)`;
    }

    if (btnPrev) {
      btnPrev.disabled = (this.currentPage <= 1);
    }

    if (btnNext) {
      btnNext.disabled = (this.currentPage >= this.totalPages);
    }
  }
};
