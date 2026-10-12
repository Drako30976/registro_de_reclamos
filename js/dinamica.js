const DinamicaModule = {
  datos: null,
  sucursales: [],

  async init() {
    await this.cargarSucursales();
    this.bindEvents();
    await this.cargarDinamica();
  },

  async cargarSucursales() {
    try {
      const sucs = await API.get('/catalogos/sucursales');
      this.sucursales = sucs || [];
      const sel = document.getElementById('filtro-dinamica-sucursal');
      if (sel) {
        sel.innerHTML = '<option value="">Todas las Sucursales</option>';
        this.sucursales.forEach(s => {
          const opt = document.createElement('option');
          opt.value = s.id;
          opt.textContent = s.nombre;
          sel.appendChild(opt);
        });
      }
    } catch (e) {
      console.error('Error al cargar sucursales en dinámica:', e);
    }
  },

  bindEvents() {
    const form = document.getElementById('form-filtro-dinamica');
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();
        await this.cargarDinamica();
      };
    }

    const btnLimpiar = document.getElementById('btn-limpiar-dinamica');
    if (btnLimpiar) {
      btnLimpiar.onclick = async () => {
        document.getElementById('filtro-dinamica-desde').value = '';
        document.getElementById('filtro-dinamica-hasta').value = '';
        document.getElementById('filtro-dinamica-canal').value = 'todos';
        document.getElementById('filtro-dinamica-sucursal').value = '';
        await this.cargarDinamica();
      };
    }

    const btnPDF = document.getElementById('btn-exportar-dinamica-pdf');
    if (btnPDF) {
      btnPDF.onclick = () => {
        this.descargarReportePDF();
      };
    }
  },

  async cargarDinamica() {
    const desde = document.getElementById('filtro-dinamica-desde')?.value || '';
    const hasta = document.getElementById('filtro-dinamica-hasta')?.value || '';
    const canal = document.getElementById('filtro-dinamica-canal')?.value || 'todos';
    const sucursal_id = document.getElementById('filtro-dinamica-sucursal')?.value || '';

    const params = new URLSearchParams();
    if (desde) params.append('fecha_desde', desde);
    if (hasta) params.append('fecha_hasta', hasta);
    if (canal && canal !== 'todos') params.append('canal', canal);
    if (sucursal_id) params.append('sucursal_id', sucursal_id);

    try {
      const url = `/reportes/dinamica${params.toString() ? '?' + params.toString() : ''}`;
      const res = await API.get(url);
      this.datos = res;
      this.renderKPIs(res.kpis);
      this.renderTablaSucursales(res.por_sucursal);
      this.renderTipos(res.tipos_global, res.kpis.total_interacciones);
    } catch (err) {
      console.error('Error al cargar dinámica:', err);
    }
  },

  renderKPIs(kpis) {
    if (!kpis) return;
    const elTot = document.getElementById('kpi-dinamica-total');
    const elRec = document.getElementById('kpi-dinamica-reclamos');
    const elLlam = document.getElementById('kpi-dinamica-llamadas');
    const elBaj = document.getElementById('kpi-dinamica-bajas');
    const elDisp = document.getElementById('kpi-dinamica-disp');
    const elPag = document.getElementById('kpi-dinamica-pagos');

    if (elTot) elTot.textContent = kpis.total_interacciones || 0;
    if (elRec) elRec.textContent = kpis.total_reclamos || 0;
    if (elLlam) elLlam.textContent = kpis.total_llamadas || 0;
    if (elBaj) elBaj.textContent = kpis.total_bajas || 0;
    if (elDisp) elDisp.textContent = kpis.total_disponibilidad || 0;
    if (elPag) elPag.textContent = kpis.total_pagos || 0;
  },

  renderTablaSucursales(sucursales) {
    const tbody = document.getElementById('dinamica-tabla-sucursales');
    if (!tbody) return;

    if (!sucursales || sucursales.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center p-3 text-muted">No se registraron actividades en el período.</td></tr>';
      return;
    }

    let html = '';
    sucursales.forEach(s => {
      html += `
        <tr>
          <td><strong>${s.nombre}</strong></td>
          <td class="text-center">${s.reclamos}</td>
          <td class="text-center">${s.llamadas}</td>
          <td class="text-center"><span class="badge badge-primary">${s.total}</span></td>
          <td class="text-center font-bold text-danger">${s.bajas}</td>
          <td class="text-center font-bold" style="color: #D97706;">${s.disponibilidad}</td>
          <td class="text-center font-bold" style="color: #059669;">${s.pagos}</td>
          <td class="text-center">${s.tecnicos}</td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  },

  renderTipos(tiposGlobal, total) {
    const container = document.getElementById('dinamica-tipos-list');
    if (!container) return;

    const entries = Object.entries(tiposGlobal || {});
    if (entries.length === 0) {
      container.innerHTML = '<p class="text-muted font-sm">Sin datos de tipos de consulta.</p>';
      return;
    }

    let html = '<div class="dinamica-tipos-grid">';
    entries.forEach(([tipo, cant]) => {
      const pct = total > 0 ? ((cant / total) * 100).toFixed(1) : 0;
      html += `
        <div class="dinamica-tipo-item">
          <div class="flex-row justify-between align-center mb-1 font-sm">
            <strong>${tipo}</strong>
            <span class="text-muted">${cant} (${pct}%)</span>
          </div>
          <div class="dinamica-progress-track">
            <div class="dinamica-progress-bar" style="width: ${pct}%;"></div>
          </div>
        </div>
      `;
    });
    html += '</div>';

    container.innerHTML = html;
  },

  descargarReportePDF() {
    const desde = document.getElementById('filtro-dinamica-desde')?.value || '';
    const hasta = document.getElementById('filtro-dinamica-hasta')?.value || '';
    const canal = document.getElementById('filtro-dinamica-canal')?.value || 'todos';
    const sucursal_id = document.getElementById('filtro-dinamica-sucursal')?.value || '';

    const params = new URLSearchParams();
    if (desde) params.append('fecha_desde', desde);
    if (hasta) params.append('fecha_hasta', hasta);
    if (canal && canal !== 'todos') params.append('canal', canal);
    if (sucursal_id) params.append('sucursal_id', sucursal_id);

    const token = API.getToken();
    const url = `/api/reportes/dinamica-pdf?${params.toString()}`;

    const btn = document.getElementById('btn-exportar-dinamica-pdf');
    if (btn) btn.disabled = true;

    fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Error al generar PDF de dinámica');
        return res.blob();
      })
      .then(blob => {
        const u = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = u;
        a.download = `Reporte_Dinamica_Sucursales_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(u);
      })
      .catch(err => {
        alert(err.message || 'Error al descargar el archivo PDF');
      })
      .finally(() => {
        if (btn) btn.disabled = false;
      });
  }
};
