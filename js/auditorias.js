const AuditoriasModule = {
  criteriosData: [],
  canalesData: [],
  usuariosData: [],
  currentAuditIdDetalle: null,

  async init() {
    this.bindSubtabs();
    this.bindStageEvents();
    this.bindFiltros();
    this.bindComentarioCounter();
    await this.cargarCatalogos();
    await this.cargarCriteriosParaEvaluacion();
  },

  bindComentarioCounter() {
    const inputComentario = document.getElementById('nueva-auditoria-comentario');
    const counter = document.getElementById('nueva-auditoria-comentario-counter');
    if (inputComentario && counter) {
      inputComentario.oninput = () => {
        counter.textContent = `Opcional - Hasta 150 caracteres (${inputComentario.value.length} / 150)`;
      };
    }
  },

  bindSubtabs() {
    const btnNueva = document.getElementById('subtab-btn-nueva-auditoria');
    const btnHistorial = document.getElementById('subtab-btn-historial-auditorias');
    const btnEditar = document.getElementById('subtab-btn-editar-criterios');

    const secNueva = document.getElementById('auditorias-sec-nueva');
    const secHistorial = document.getElementById('auditorias-sec-historial');
    const secEditar = document.getElementById('auditorias-sec-editar');

    if (btnNueva) {
      btnNueva.onclick = () => {
        btnNueva.classList.add('active');
        btnHistorial.classList.remove('active');
        btnEditar.classList.remove('active');
        secNueva.classList.remove('hidden');
        secHistorial.classList.add('hidden');
        secEditar.classList.add('hidden');
        if (Auth.currentUser) {
          const idAud = document.getElementById('nueva-auditoria-auditor');
          if (idAud) idAud.value = String(Auth.currentUser.id);
          const txtAud = document.getElementById('nueva-auditoria-auditor-nombre');
          if (txtAud) txtAud.value = `${Auth.currentUser.nombre_completo} (${Auth.currentUser.rol})`;
        }
      };
    }

    if (btnHistorial) {
      btnHistorial.onclick = () => {
        btnHistorial.classList.add('active');
        btnNueva.classList.remove('active');
        btnEditar.classList.remove('active');
        secHistorial.classList.remove('hidden');
        secNueva.classList.add('hidden');
        secEditar.classList.add('hidden');
        this.cargarHistorial();
      };
    }

    if (btnEditar) {
      btnEditar.onclick = () => {
        btnEditar.classList.add('active');
        btnNueva.classList.remove('active');
        btnHistorial.classList.remove('active');
        secEditar.classList.remove('hidden');
        secNueva.classList.add('hidden');
        secHistorial.classList.add('hidden');
        this.cargarCanalesAdmin();
        this.cargarCriteriosAdmin();
      };
    }
  },

  bindStageEvents() {
    const btnAvanzar = document.getElementById('btn-avanzar-etapa-2');
    const btnVolver = document.getElementById('btn-volver-etapa-1');
    const btnGuardar = document.getElementById('btn-guardar-auditoria');
    const checkErrorCritico = document.getElementById('check-error-critico');
    const boxErrorCritico = document.getElementById('box-error-critico');
    const grupoComentarioCritico = document.getElementById('grupo-comentario-error-critico');

    if (btnAvanzar) {
      btnAvanzar.onclick = () => this.avanzarAEtapa2();
    }

    if (btnVolver) {
      btnVolver.onclick = () => this.volverAEtapa1();
    }

    if (btnGuardar) {
      btnGuardar.onclick = () => this.guardarAuditoria();
    }

    if (checkErrorCritico) {
      checkErrorCritico.onchange = () => {
        if (checkErrorCritico.checked) {
          grupoComentarioCritico.classList.remove('hidden');
          boxErrorCritico.classList.add('checked');
          document.getElementById('input-error-critico-detalle').focus();
        } else {
          grupoComentarioCritico.classList.add('hidden');
          boxErrorCritico.classList.remove('checked');
          document.getElementById('input-error-critico-detalle').value = '';
        }
      };
    }
  },

  bindFiltros() {
    const btnBuscar = document.getElementById('btn-aplicar-filtros-auditorias');
    const btnLimpiar = document.getElementById('btn-limpiar-filtros-auditorias');
    const btnReportePDF = document.getElementById('btn-emitir-reporte-auditorias');
    const btnPdfDetalle = document.getElementById('btn-ver-audit-pdf');

    if (btnBuscar) {
      btnBuscar.onclick = () => this.cargarHistorial();
    }

    if (btnLimpiar) {
      btnLimpiar.onclick = () => {
        document.getElementById('filtro-audit-fecha-desde').value = '';
        document.getElementById('filtro-audit-fecha-hasta').value = '';
        document.getElementById('filtro-audit-asesor').value = '';
        document.getElementById('filtro-audit-auditor').value = '';
        document.getElementById('filtro-audit-canal').value = '';
        document.getElementById('filtro-audit-resultado').value = '';
        this.cargarHistorial();
      };
    }

    if (btnReportePDF) {
      btnReportePDF.onclick = () => this.descargarReporteGeneralPDF();
    }

    if (btnPdfDetalle) {
      btnPdfDetalle.onclick = () => {
        if (this.currentAuditIdDetalle) {
          this.descargarPdfIndividual(this.currentAuditIdDetalle);
        }
      };
    }
  },

  async cargarCatalogos() {
    try {
      const [canales, usuarios] = await Promise.all([
        API.get('/auditorias/canales'),
        API.get('/usuarios')
      ]);

      this.canalesData = canales;
      this.usuariosData = usuarios;

      const selCanal = document.getElementById('nueva-auditoria-canal');
      const selCanalFiltro = document.getElementById('filtro-audit-canal');
      if (selCanal) {
        selCanal.innerHTML = '<option value="">-- Seleccione Canal --</option>';
        canales.forEach(c => {
          selCanal.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
      }
      if (selCanalFiltro) {
        selCanalFiltro.innerHTML = '<option value="">Todos los canales</option>';
        canales.forEach(c => {
          selCanalFiltro.innerHTML += `<option value="${c.id}">${c.nombre}</option>`;
        });
      }

      const selAsesor = document.getElementById('nueva-auditoria-asesor');
      const selAsesorFiltro = document.getElementById('filtro-audit-asesor');
      const selAuditor = document.getElementById('nueva-auditoria-auditor');
      const selAuditorFiltro = document.getElementById('filtro-audit-auditor');

      const asesores = usuarios.filter(u => u.rol === 'Asesor');
      const auditores = usuarios.filter(u => u.rol === 'Supervisor' || u.rol === 'Admin');

      if (selAsesor) {
        selAsesor.innerHTML = '<option value="">-- Seleccione Asesor --</option>';
        asesores.forEach(a => {
          selAsesor.innerHTML += `<option value="${a.id}">${a.nombre_completo}</option>`;
        });
      }
      if (selAsesorFiltro) {
        selAsesorFiltro.innerHTML = '<option value="">Todos los asesores</option>';
        asesores.forEach(a => {
          selAsesorFiltro.innerHTML += `<option value="${a.id}">${a.nombre_completo}</option>`;
        });
      }

      const currentUser = Auth.currentUser;
      const txtAuditorNombre = document.getElementById('nueva-auditoria-auditor-nombre');
      const inputAuditorId = document.getElementById('nueva-auditoria-auditor');
      if (currentUser) {
        if (txtAuditorNombre) {
          txtAuditorNombre.value = `${currentUser.nombre_completo} (${currentUser.rol})`;
        }
        if (inputAuditorId) {
          inputAuditorId.value = String(currentUser.id);
        }
      }
      if (selAuditorFiltro) {
        selAuditorFiltro.innerHTML = '<option value="">Todos los auditores</option>';
        auditores.forEach(au => {
          selAuditorFiltro.innerHTML += `<option value="${au.id}">${au.nombre_completo}</option>`;
        });
      }

      const inputFecha = document.getElementById('nueva-auditoria-fecha');
      if (inputFecha && !inputFecha.value) {
        inputFecha.value = new Date().toISOString().split('T')[0];
      }
    } catch (err) {
      console.error('Error al cargar catálogos para auditorías:', err);
    }
  },

  async cargarCriteriosParaEvaluacion() {
    try {
      const tbody = document.getElementById('tabla-criterios-evaluacion-body');
      if (!tbody) return;

      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Cargando criterios...</td></tr>';

      const criterios = await API.get('/auditorias/criterios');
      this.criteriosData = criterios;

      if (!criterios || criterios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No hay criterios configurados en el sistema.</td></tr>';
        return;
      }

      let html = '';
      criterios.forEach(cat => {
        html += `
          <tr class="eval-category-header">
            <td colspan="5">
              <span>${cat.nombre.toUpperCase()}</span>
              ${cat.descripcion ? `<span class="font-normal font-sm text-muted d-block" style="text-transform: none;">${cat.descripcion}</span>` : ''}
            </td>
          </tr>
        `;

        if (cat.subcriterios && cat.subcriterios.length > 0) {
          cat.subcriterios.forEach(sub => {
            html += `
              <tr class="criterio-eval-row" 
                  data-cat-id="${cat.id}" 
                  data-cat-nombre="${encodeURIComponent(cat.nombre)}" 
                  data-sub-id="${sub.id}" 
                  data-sub-nombre="${encodeURIComponent(sub.nombre)}" 
                  data-max="${sub.puntaje_maximo}">
                <td>
                  <strong>${sub.nombre}</strong>
                </td>
                <td style="text-align: center;">
                  <span class="badge" style="background: #E2E8F0; color: #1E293B; font-weight: 700;">${sub.puntaje_maximo} pts</span>
                </td>
                <td>
                  <select class="eval-select eval-cumple" onchange="AuditoriasModule.onEvaluacionChange(this)">
                    <option value="Cumple" selected>Cumple</option>
                    <option value="No cumple">No cumple</option>
                    <option value="No aplica">No aplica</option>
                  </select>
                </td>
                <td style="text-align: center;">
                  <span class="eval-score-badge obtained-full score-display">${sub.puntaje_maximo}</span>
                </td>
                <td>
                  <input type="text" maxlength="250" class="form-control eval-obs" placeholder="Observación específica..." style="padding: 0.35rem 0.5rem; font-size: 0.8rem;">
                </td>
              </tr>
            `;
          });
        } else {
          html += `
            <tr>
              <td colspan="5" class="text-muted font-sm italic pl-4">Esta categoría no tiene subcriterios activos configurados.</td>
            </tr>
          `;
        }
      });

      tbody.innerHTML = html;
      this.recalcularTotalesEnVivo();
    } catch (err) {
      console.error('Error al cargar criterios para evaluación:', err);
      const tbody = document.getElementById('tabla-criterios-evaluacion-body');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-danger">Error: ${err.message}</td></tr>`;
      }
    }
  },

  onEvaluacionChange(selectEl) {
    const row = selectEl.closest('tr');
    const maxScore = parseFloat(row.getAttribute('data-max')) || 0;
    const scoreBadge = row.querySelector('.score-display');
    const valor = selectEl.value;

    selectEl.classList.remove('eval-cumple', 'eval-no-cumple', 'eval-no-aplica');
    scoreBadge.classList.remove('obtained-full', 'obtained-zero', 'obtained-na');

    if (valor === 'Cumple') {
      selectEl.classList.add('eval-cumple');
      scoreBadge.classList.add('obtained-full');
      scoreBadge.textContent = maxScore;
    } else if (valor === 'No cumple') {
      selectEl.classList.add('eval-no-cumple');
      scoreBadge.classList.add('obtained-zero');
      scoreBadge.textContent = '0';
    } else {
      selectEl.classList.add('eval-no-aplica');
      scoreBadge.classList.add('obtained-na');
      scoreBadge.textContent = '-';
    }

    this.recalcularTotalesEnVivo();
  },

  calcularMetricasActuales() {
    const rows = document.querySelectorAll('.criterio-eval-row');
    let puntajeMaximo = 0;
    let puntajeObtenido = 0;
    const categoriasMap = {};

    rows.forEach(r => {
      const catNombre = decodeURIComponent(r.getAttribute('data-cat-nombre'));
      const max = parseFloat(r.getAttribute('data-max')) || 0;
      const selectVal = r.querySelector('.eval-select').value;

      if (!categoriasMap[catNombre]) {
        categoriasMap[catNombre] = { max: 0, obt: 0 };
      }

      if (selectVal !== 'No aplica') {
        puntajeMaximo += max;
        categoriasMap[catNombre].max += max;
        if (selectVal === 'Cumple') {
          puntajeObtenido += max;
          categoriasMap[catNombre].obt += max;
        }
      }
    });

    let porcentajeCalidad = 0;
    if (puntajeMaximo > 0) {
      porcentajeCalidad = Math.ceil((puntajeObtenido / puntajeMaximo) * 100);
    }

    let resultado = 'CRÍTICO';
    let badgeClass = 'badge-critico';
    let escalaDesc = 'Menor a 60%';

    if (porcentajeCalidad >= 90) {
      resultado = 'EXCELENTE';
      badgeClass = 'badge-excelente';
      escalaDesc = '90% a 100%';
    } else if (porcentajeCalidad >= 80) {
      resultado = 'MUY BUENO';
      badgeClass = 'badge-muy-bueno';
      escalaDesc = '80% a 89%';
    } else if (porcentajeCalidad >= 70) {
      resultado = 'BUENO';
      badgeClass = 'badge-bueno';
      escalaDesc = '70% a 79%';
    } else if (porcentajeCalidad >= 60) {
      resultado = 'A MEJORAR';
      badgeClass = 'badge-mejorar';
      escalaDesc = '60% a 69%';
    }

    return {
      puntajeMaximo,
      puntajeObtenido,
      porcentajeCalidad,
      resultado,
      badgeClass,
      escalaDesc,
      categoriasMap
    };
  },

  recalcularTotalesEnVivo() {
    const { puntajeMaximo, puntajeObtenido, porcentajeCalidad } = this.calcularMetricasActuales();
    const liveBadge = document.getElementById('badge-score-en-vivo');
    if (liveBadge) {
      liveBadge.textContent = `Puntaje en vivo: ${puntajeObtenido} / ${puntajeMaximo} (${porcentajeCalidad}%)`;
    }
  },

  avanzarAEtapa2() {
    const alertEl = document.getElementById('nueva-auditoria-alert');
    alertEl.classList.add('hidden');
    alertEl.textContent = '';

    const elFecha = document.getElementById('nueva-auditoria-fecha');
    const elAsesor = document.getElementById('nueva-auditoria-asesor');
    const elAuditor = document.getElementById('nueva-auditoria-auditor');
    const elCanal = document.getElementById('nueva-auditoria-canal');
    const elReferencia = document.getElementById('nueva-auditoria-referencia');

    const fecha = elFecha ? elFecha.value : '';
    const asesor = elAsesor ? elAsesor.value : '';
    const auditor = elAuditor ? elAuditor.value : '';
    const canal = elCanal ? elCanal.value : '';
    const referencia = elReferencia ? elReferencia.value.trim() : '';

    [elFecha, elAsesor, elAuditor, elCanal, elReferencia].forEach(el => {
      if (el) el.style.borderColor = '';
    });

    if (!fecha || !asesor || !auditor || !canal || !referencia) {
      alertEl.textContent = 'Debe completar todos los campos obligatorios de "Datos Principales de la Auditoría" (Fecha, Asesor Evaluado, Auditor / Evaluador, Canal de Ingreso y Teléfono de contacto) para poder continuar a la segunda etapa.';
      alertEl.classList.remove('hidden');

      if (!fecha && elFecha) elFecha.style.borderColor = '#EF4444';
      if (!asesor && elAsesor) elAsesor.style.borderColor = '#EF4444';
      if (!auditor && elAuditor) elAuditor.style.borderColor = '#EF4444';
      if (!canal && elCanal) elCanal.style.borderColor = '#EF4444';
      if (!referencia && elReferencia) elReferencia.style.borderColor = '#EF4444';

      alertEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    const {
      puntajeMaximo,
      puntajeObtenido,
      porcentajeCalidad,
      resultado,
      badgeClass,
      escalaDesc,
      categoriasMap
    } = this.calcularMetricasActuales();

    document.getElementById('resumen-puntaje-maximo').textContent = puntajeMaximo;
    document.getElementById('resumen-puntaje-obtenido').textContent = puntajeObtenido;
    document.getElementById('resumen-porcentaje-calidad').textContent = `${porcentajeCalidad}%`;

    const badgeRes = document.getElementById('resumen-resultado-badge');
    badgeRes.className = `badge-resultado ${badgeClass}`;
    badgeRes.textContent = resultado;
    document.getElementById('resumen-escala-desc').textContent = escalaDesc;

    const tbodyCat = document.getElementById('tabla-resumen-categorias-body');
    let catHtml = '';
    Object.keys(categoriasMap).forEach(catName => {
      const c = categoriasMap[catName];
      const pct = c.max > 0 ? Math.round((c.obt / c.max) * 100) : 0;
      catHtml += `
        <tr>
          <td><strong>${catName}</strong></td>
          <td style="text-align: center;">${c.max} pts</td>
          <td style="text-align: center;">${c.obt} pts</td>
          <td style="text-align: center;">
            <span class="font-bold ${pct >= 80 ? 'text-success' : (pct >= 60 ? 'text-warning' : 'text-danger')}">${pct}%</span>
          </td>
        </tr>
      `;
    });
    tbodyCat.innerHTML = catHtml;

    document.getElementById('auditoria-etapa-1').classList.add('hidden');
    document.getElementById('auditoria-etapa-2').classList.remove('hidden');

    const ind1 = document.getElementById('auditoria-step-ind-1');
    const ind2 = document.getElementById('auditoria-step-ind-2');
    ind1.classList.remove('active');
    ind1.classList.add('completed');
    ind2.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  volverAEtapa1() {
    document.getElementById('auditoria-etapa-2').classList.add('hidden');
    document.getElementById('auditoria-etapa-1').classList.remove('hidden');

    const ind1 = document.getElementById('auditoria-step-ind-1');
    const ind2 = document.getElementById('auditoria-step-ind-2');
    ind1.classList.remove('completed');
    ind1.classList.add('active');
    ind2.classList.remove('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  async guardarAuditoria() {
    const alertEl = document.getElementById('guardar-auditoria-alert');
    alertEl.classList.add('hidden');
    alertEl.textContent = '';

    const checkCritico = document.getElementById('check-error-critico').checked;
    const detalleCritico = document.getElementById('input-error-critico-detalle').value.trim();

    if (checkCritico && !detalleCritico) {
      alertEl.textContent = 'Debe indicar el motivo o detalle del Error Crítico (hasta 100 caracteres).';
      alertEl.classList.remove('hidden');
      return;
    }

    const rows = document.querySelectorAll('.criterio-eval-row');
    const detalles = [];

    rows.forEach(r => {
      detalles.push({
        criterio_id: parseInt(r.getAttribute('data-cat-id'), 10),
        subcriterio_id: parseInt(r.getAttribute('data-sub-id'), 10),
        criterio_nombre: decodeURIComponent(r.getAttribute('data-cat-nombre')),
        subcriterio_nombre: decodeURIComponent(r.getAttribute('data-sub-nombre')),
        puntaje_maximo: parseFloat(r.getAttribute('data-max')) || 0,
        evaluacion: r.querySelector('.eval-select').value,
        observacion: r.querySelector('.eval-obs').value.trim()
      });
    });

    const elAbonado = document.getElementById('nueva-auditoria-abonado');
    const elComentario = document.getElementById('nueva-auditoria-comentario');

    const payload = {
      fecha: document.getElementById('nueva-auditoria-fecha').value,
      asesor_id: parseInt(document.getElementById('nueva-auditoria-asesor').value, 10),
      auditor_id: parseInt(document.getElementById('nueva-auditoria-auditor').value, 10),
      canal_id: parseInt(document.getElementById('nueva-auditoria-canal').value, 10),
      referencia: document.getElementById('nueva-auditoria-referencia').value.trim(),
      numero_abonado: elAbonado && elAbonado.value.trim() ? elAbonado.value.trim() : null,
      comentario: elComentario && elComentario.value.trim() ? elComentario.value.trim() : null,
      error_critico: checkCritico,
      comentario_error_critico: checkCritico ? detalleCritico : null,
      observaciones_generales: document.getElementById('input-auditoria-obs-generales').value.trim(),
      detalles
    };

    const btnGuardar = document.getElementById('btn-guardar-auditoria');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando auditoría...';

    try {
      const auditCreada = await API.post('/auditorias', payload);

      this.resetearFormularioNuevaAuditoria();
      document.getElementById('subtab-btn-historial-auditorias').click();

      this.ofrecerFeedbackAsesor(auditCreada, payload);
    } catch (err) {
      console.error('Error al guardar auditoría:', err);
      alertEl.textContent = err.message || 'Error al guardar la auditoría.';
      alertEl.classList.remove('hidden');
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = '<span class="btn-icon">💾</span> Finalizar y Guardar Auditoría';
    }
  },

  resetearFormularioNuevaAuditoria() {
    document.getElementById('nueva-auditoria-referencia').value = '';
    const elAbonado = document.getElementById('nueva-auditoria-abonado');
    if (elAbonado) elAbonado.value = '';
    const elComentario = document.getElementById('nueva-auditoria-comentario');
    if (elComentario) elComentario.value = '';
    const counter = document.getElementById('nueva-auditoria-comentario-counter');
    if (counter) counter.textContent = 'Opcional - Hasta 150 caracteres (0 / 150)';

    document.getElementById('nueva-auditoria-asesor').value = '';
    document.getElementById('nueva-auditoria-canal').value = '';
    document.getElementById('nueva-auditoria-fecha').value = new Date().toISOString().split('T')[0];

    const currentUser = Auth.currentUser;
    if (currentUser) {
      const inputAuditorId = document.getElementById('nueva-auditoria-auditor');
      if (inputAuditorId) inputAuditorId.value = String(currentUser.id);
      const txtAuditorNombre = document.getElementById('nueva-auditoria-auditor-nombre');
      if (txtAuditorNombre) txtAuditorNombre.value = `${currentUser.nombre_completo} (${currentUser.rol})`;
    }

    document.getElementById('check-error-critico').checked = false;
    document.getElementById('grupo-comentario-error-critico').classList.add('hidden');
    document.getElementById('box-error-critico').classList.remove('checked');
    document.getElementById('input-error-critico-detalle').value = '';
    document.getElementById('input-auditoria-obs-generales').value = '';

    document.querySelectorAll('.criterio-eval-row').forEach(r => {
      const sel = r.querySelector('.eval-select');
      sel.value = 'Cumple';
      this.onEvaluacionChange(sel);
      r.querySelector('.eval-obs').value = '';
    });

    this.volverAEtapa1();
  },

  async cargarHistorial() {
    const tbody = document.getElementById('tabla-historial-auditorias-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">Cargando auditorías...</td></tr>';

    const fechaDesde = document.getElementById('filtro-audit-fecha-desde').value;
    const fechaHasta = document.getElementById('filtro-audit-fecha-hasta').value;
    const asesorId = document.getElementById('filtro-audit-asesor').value;
    const auditorId = document.getElementById('filtro-audit-auditor').value;
    const canalId = document.getElementById('filtro-audit-canal').value;
    const resultado = document.getElementById('filtro-audit-resultado').value;

    const params = new URLSearchParams();
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (asesorId) params.append('asesor_id', asesorId);
    if (auditorId) params.append('auditor_id', auditorId);
    if (canalId) params.append('canal_id', canalId);
    if (resultado) params.append('resultado', resultado);

    try {
      const list = await API.get(`/auditorias/historial?${params.toString()}`);

      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="10" class="text-center py-4 text-muted">No se encontraron auditorías con los filtros seleccionados.</td></tr>';
        return;
      }

      const esAdmin = Auth.currentUser && Auth.currentUser.rol === 'Admin';
      let html = '';

      list.forEach(a => {
        let badgeClass = 'badge-critico';
        if (a.resultado === 'EXCELENTE') badgeClass = 'badge-excelente';
        else if (a.resultado === 'MUY BUENO') badgeClass = 'badge-muy-bueno';
        else if (a.resultado === 'BUENO') badgeClass = 'badge-bueno';
        else if (a.resultado === 'A MEJORAR') badgeClass = 'badge-mejorar';

        html += `
          <tr>
            <td>${a.fecha_fmt}</td>
            <td><strong>${a.asesor_nombre}</strong></td>
            <td>${a.auditor_nombre}</td>
            <td>${a.canal_nombre}</td>
            <td>
              <code>${a.referencia}</code>
              ${a.numero_abonado ? `<br><small class="text-muted">Abo: ${a.numero_abonado}</small>` : ''}
            </td>
            <td style="text-align: center;">${a.puntaje_obtenido} / ${a.puntaje_maximo}</td>
            <td style="text-align: center;"><strong>${a.porcentaje_calidad}%</strong></td>
            <td style="text-align: center;">
              <span class="badge-resultado ${badgeClass}">${a.resultado}</span>
            </td>
            <td style="text-align: center;">
              ${a.error_critico ? '<span class="badge" style="background:#FEE2E2; color:#B91C1C; font-weight:700;">SÍ</span>' : '<span class="text-muted">No</span>'}
            </td>
            <td style="text-align: center;">
              <div class="flex-row gap-1 justify-center">
                <button class="btn btn-sm btn-outline-primary" onclick="AuditoriasModule.verDetalle(${a.id})" title="Ver informe y devolución">
                  👁️ Detalle
                </button>
                <button class="btn btn-sm btn-outline-warning" onclick="AuditoriasModule.abrirModalEditarAuditoria(${a.id})" title="Editar auditoría realizada">
                  ✏️ Editar
                </button>
                ${esAdmin ? `
                  <button class="btn btn-sm btn-outline-danger" onclick="AuditoriasModule.eliminarAuditoria(${a.id})" title="Eliminar registro">
                    🗑️
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    } catch (err) {
      console.error('Error al cargar historial de auditorías:', err);
      tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-danger">Error: ${err.message}</td></tr>`;
    }
  },

  async verDetalle(id) {
    this.currentAuditIdDetalle = id;
    const modal = document.getElementById('modal-ver-auditoria');
    modal.classList.remove('hidden');

    try {
      const a = await API.get(`/auditorias/${id}`);

      document.getElementById('ver-audit-titulo').textContent = `Informe de Auditoría N° ${a.id}`;
      document.getElementById('ver-audit-fecha').textContent = a.fecha_fmt;
      document.getElementById('ver-audit-asesor').textContent = a.asesor_nombre;
      document.getElementById('ver-audit-auditor').textContent = a.auditor_nombre;
      document.getElementById('ver-audit-canal').textContent = a.canal_nombre;
      document.getElementById('ver-audit-referencia').textContent = a.referencia;
      const elAbo = document.getElementById('ver-audit-abonado');
      if (elAbo) elAbo.textContent = a.numero_abonado || '-';
      const elCom = document.getElementById('ver-audit-comentario');
      if (elCom) elCom.textContent = a.comentario || '-';
      document.getElementById('ver-audit-error-critico').textContent = a.error_critico ? 'SÍ' : 'No';

      document.getElementById('ver-audit-max').textContent = a.puntaje_maximo;
      document.getElementById('ver-audit-obt').textContent = a.puntaje_obtenido;
      document.getElementById('ver-audit-pct').textContent = `${a.porcentaje_calidad}%`;

      let badgeClass = 'badge-critico';
      if (a.resultado === 'EXCELENTE') badgeClass = 'badge-excelente';
      else if (a.resultado === 'MUY BUENO') badgeClass = 'badge-muy-bueno';
      else if (a.resultado === 'BUENO') badgeClass = 'badge-bueno';
      else if (a.resultado === 'A MEJORAR') badgeClass = 'badge-mejorar';

      const badgeRes = document.getElementById('ver-audit-badge');
      badgeRes.className = `badge-resultado ${badgeClass}`;
      badgeRes.textContent = a.resultado;

      const alertaCritico = document.getElementById('ver-audit-alerta-critico');
      if (a.error_critico) {
        alertaCritico.classList.remove('hidden');
        document.getElementById('ver-audit-critico-comentario').textContent = a.comentario_error_critico || 'Sin detalle especificado.';
      } else {
        alertaCritico.classList.add('hidden');
      }

      const tbodyDet = document.getElementById('ver-audit-tabla-detalles-body');
      let detHtml = '';
      const catSummary = {};

      a.detalles.forEach(d => {
        if (!catSummary[d.criterio_nombre]) {
          catSummary[d.criterio_nombre] = { max: 0, obt: 0 };
        }
        if (d.evaluacion !== 'No aplica') {
          catSummary[d.criterio_nombre].max += d.puntaje_maximo;
          catSummary[d.criterio_nombre].obt += d.puntaje_obtenido;
        }

        let evalColor = '#065F46';
        if (d.evaluacion === 'No cumple') evalColor = '#991B1B';
        else if (d.evaluacion === 'No aplica') evalColor = '#64748B';

        detHtml += `
          <tr>
            <td>
              <small class="text-muted d-block">${d.criterio_nombre}</small>
              <strong>${d.subcriterio_nombre}</strong>
            </td>
            <td style="text-align: center;">${d.puntaje_maximo}</td>
            <td><strong style="color: ${evalColor};">${d.evaluacion}</strong></td>
            <td style="text-align: center;"><strong>${d.puntaje_obtenido}</strong></td>
            <td><span class="text-muted">${d.observacion || '-'}</span></td>
          </tr>
        `;
      });
      tbodyDet.innerHTML = detHtml;

      const tbodyCat = document.getElementById('ver-audit-tabla-categorias-body');
      let catHtml = '';
      Object.keys(catSummary).forEach(cat => {
        const item = catSummary[cat];
        const pct = item.max > 0 ? Math.round((item.obt / item.max) * 100) : 0;
        catHtml += `
          <tr>
            <td><strong>${cat}</strong></td>
            <td style="text-align: center;">${item.max}</td>
            <td style="text-align: center;">${item.obt}</td>
            <td style="text-align: center;"><strong>${pct}%</strong></td>
          </tr>
        `;
      });
      tbodyCat.innerHTML = catHtml;

      document.getElementById('ver-audit-obs-generales').textContent = a.observaciones_generales || 'Sin observaciones generales registradas.';
      this.currentAuditoriaDetalleData = a;
    } catch (err) {
      console.error('Error al ver detalle de auditoría:', err);
      alert('Error al consultar el detalle de la auditoría: ' + err.message);
    }
  },

  cerrarModalVerDetalle() {
    this.currentAuditIdDetalle = null;
    this.currentAuditoriaDetalleData = null;
    document.getElementById('modal-ver-auditoria').classList.add('hidden');
  },

  enviarAuditoriaDesdeDetalle() {
    const a = this.currentAuditoriaDetalleData;
    if (!a) {
      alert('No se pudo cargar la información de la auditoría seleccionada.');
      return;
    }

    const payload = {
      fecha: a.fecha ? a.fecha.split('T')[0] : '',
      asesor_id: a.asesor_id,
      auditor_id: a.auditor_id,
      canal_id: a.canal_id,
      referencia: a.referencia,
      numero_abonado: a.numero_abonado,
      comentario: a.comentario,
      error_critico: !!a.error_critico,
      comentario_error_critico: a.comentario_error_critico,
      observaciones_generales: a.observaciones_generales || '',
      detalles: Array.isArray(a.detalles) ? a.detalles.map(d => ({
        criterio_nombre: d.criterio_nombre,
        subcriterio_nombre: d.subcriterio_nombre,
        evaluacion: d.evaluacion,
        observacion: d.observacion
      })) : []
    };

    this.cerrarModalVerDetalle();
    this.ofrecerFeedbackAsesor(a, payload);
  },

  currentAuditIdEditing: null,

  async abrirModalEditarAuditoria(id) {
    this.currentAuditIdEditing = id;
    const modal = document.getElementById('modal-editar-auditoria');
    const alertEl = document.getElementById('edit-auditoria-alert');
    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    try {
      const a = await API.get(`/auditorias/${id}`);
      document.getElementById('edit-audit-id').value = String(a.id);
      document.getElementById('edit-audit-id-badge').textContent = String(a.id);

      const inputFecha = document.getElementById('edit-audit-fecha');
      if (inputFecha) {
        inputFecha.value = a.fecha ? a.fecha.split('T')[0] : '';
      }

      const selAsesor = document.getElementById('edit-audit-asesor');
      if (selAsesor) {
        selAsesor.innerHTML = '<option value="">-- Seleccione Asesor --</option>';
        const asesores = (this.usuariosData || []).filter(u => u.rol === 'Asesor');
        asesores.forEach(ase => {
          selAsesor.innerHTML += `<option value="${ase.id}" ${ase.id === a.asesor_id ? 'selected' : ''}>${ase.nombre_completo}</option>`;
        });
      }

      const txtAuditor = document.getElementById('edit-audit-auditor-nombre');
      const inputAuditor = document.getElementById('edit-audit-auditor');
      if (txtAuditor) txtAuditor.value = `${a.auditor_nombre}`;
      if (inputAuditor) inputAuditor.value = String(a.auditor_id);

      const selCanal = document.getElementById('edit-audit-canal');
      if (selCanal) {
        selCanal.innerHTML = '<option value="">-- Seleccione Canal --</option>';
        (this.canalesData || []).forEach(c => {
          selCanal.innerHTML += `<option value="${c.id}" ${c.id === a.canal_id ? 'selected' : ''}>${c.nombre}</option>`;
        });
      }

      document.getElementById('edit-audit-referencia').value = a.referencia || '';
      document.getElementById('edit-audit-abonado').value = a.numero_abonado || '';
      document.getElementById('edit-audit-comentario').value = a.comentario || '';

      const checkCritico = document.getElementById('edit-check-error-critico');
      const boxCritico = document.getElementById('edit-box-error-critico');
      const grupoCritico = document.getElementById('edit-grupo-comentario-error-critico');
      const inputCriticoDetalle = document.getElementById('edit-input-error-critico-detalle');

      if (checkCritico) {
        checkCritico.checked = !!a.error_critico;
        if (a.error_critico) {
          if (grupoCritico) grupoCritico.classList.remove('hidden');
          if (boxCritico) boxCritico.classList.add('checked');
          if (inputCriticoDetalle) inputCriticoDetalle.value = a.comentario_error_critico || '';
        } else {
          if (grupoCritico) grupoCritico.classList.add('hidden');
          if (boxCritico) boxCritico.classList.remove('checked');
          if (inputCriticoDetalle) inputCriticoDetalle.value = '';
        }
        checkCritico.onchange = () => {
          if (checkCritico.checked) {
            grupoCritico.classList.remove('hidden');
            boxCritico.classList.add('checked');
            inputCriticoDetalle.focus();
          } else {
            grupoCritico.classList.add('hidden');
            boxCritico.classList.remove('checked');
            inputCriticoDetalle.value = '';
          }
        };
      }

      document.getElementById('edit-audit-obs-generales').value = a.observaciones_generales || '';

      const tbody = document.getElementById('tabla-edit-criterios-body');
      if (tbody) {
        let html = '';
        let lastCat = '';

        (a.detalles || []).forEach(d => {
          if (d.criterio_nombre !== lastCat) {
            lastCat = d.criterio_nombre;
            html += `
              <tr class="eval-category-header">
                <td colspan="5"><span>${lastCat.toUpperCase()}</span></td>
              </tr>
            `;
          }

          let scoreBadgeClass = 'obtained-full';
          if (d.evaluacion === 'No cumple') scoreBadgeClass = 'obtained-zero';
          else if (d.evaluacion === 'No aplica') scoreBadgeClass = 'obtained-na';

          let evalSelectClass = 'eval-cumple';
          if (d.evaluacion === 'No cumple') evalSelectClass = 'eval-no-cumple';
          else if (d.evaluacion === 'No aplica') evalSelectClass = 'eval-no-aplica';

          html += `
            <tr class="criterio-eval-row-edit" 
                data-cat-id="${d.criterio_id}" 
                data-cat-nombre="${encodeURIComponent(d.criterio_nombre)}" 
                data-sub-id="${d.subcriterio_id}" 
                data-sub-nombre="${encodeURIComponent(d.subcriterio_nombre)}" 
                data-max="${d.puntaje_maximo}">
              <td><strong>${d.subcriterio_nombre}</strong></td>
              <td style="text-align: center;">
                <span class="badge" style="background: #E2E8F0; color: #1E293B; font-weight: 700;">${d.puntaje_maximo} pts</span>
              </td>
              <td>
                <select class="eval-select-edit ${evalSelectClass}" onchange="AuditoriasModule.onEvaluacionEditChange(this)">
                  <option value="Cumple" ${d.evaluacion === 'Cumple' ? 'selected' : ''}>Cumple</option>
                  <option value="No cumple" ${d.evaluacion === 'No cumple' ? 'selected' : ''}>No cumple</option>
                  <option value="No aplica" ${d.evaluacion === 'No aplica' ? 'selected' : ''}>No aplica</option>
                </select>
              </td>
              <td style="text-align: center;">
                <span class="eval-score-badge ${scoreBadgeClass} score-display-edit">${d.puntaje_obtenido}</span>
              </td>
              <td>
                <input type="text" maxlength="250" class="form-control eval-obs-edit" value="${d.observacion || ''}" style="padding: 0.35rem 0.5rem; font-size: 0.8rem;">
              </td>
            </tr>
          `;
        });

        tbody.innerHTML = html;
      }

      this.recalcularTotalesEditEnVivo();

      const formEdit = document.getElementById('form-editar-auditoria');
      if (formEdit) {
        formEdit.onsubmit = (e) => {
          e.preventDefault();
          this.guardarEdicionAuditoria();
        };
      }

      modal.classList.remove('hidden');
    } catch (err) {
      console.error('Error al abrir modal para editar auditoría:', err);
      alert('Error al consultar auditoría: ' + err.message);
    }
  },

  onEvaluacionEditChange(selectEl) {
    const row = selectEl.closest('tr');
    const maxScore = parseFloat(row.getAttribute('data-max')) || 0;
    const scoreBadge = row.querySelector('.score-display-edit');
    const valor = selectEl.value;

    selectEl.classList.remove('eval-cumple', 'eval-no-cumple', 'eval-no-aplica');
    scoreBadge.classList.remove('obtained-full', 'obtained-zero', 'obtained-na');

    if (valor === 'Cumple') {
      selectEl.classList.add('eval-cumple');
      scoreBadge.classList.add('obtained-full');
      scoreBadge.textContent = maxScore;
    } else if (valor === 'No cumple') {
      selectEl.classList.add('eval-no-cumple');
      scoreBadge.classList.add('obtained-zero');
      scoreBadge.textContent = '0';
    } else if (valor === 'No aplica') {
      selectEl.classList.add('eval-no-aplica');
      scoreBadge.classList.add('obtained-na');
      scoreBadge.textContent = '-';
    }

    this.recalcularTotalesEditEnVivo();
  },

  recalcularTotalesEditEnVivo() {
    const rows = document.querySelectorAll('.criterio-eval-row-edit');
    let puntajeMaximo = 0;
    let puntajeObtenido = 0;

    rows.forEach(r => {
      const maxScore = parseFloat(r.getAttribute('data-max')) || 0;
      const selectVal = r.querySelector('.eval-select-edit').value;
      if (selectVal !== 'No aplica') {
        puntajeMaximo += maxScore;
        if (selectVal === 'Cumple') {
          puntajeObtenido += maxScore;
        }
      }
    });

    const porcentajeCalidad = puntajeMaximo > 0 ? Math.ceil((puntajeObtenido / puntajeMaximo) * 100) : 0;
    const liveBadge = document.getElementById('edit-badge-score-en-vivo');
    if (liveBadge) {
      liveBadge.textContent = `Puntaje en vivo: ${puntajeObtenido} / ${puntajeMaximo} (${porcentajeCalidad}%)`;
    }
  },

  cerrarModalEditarAuditoria() {
    this.currentAuditIdEditing = null;
    const modal = document.getElementById('modal-editar-auditoria');
    if (modal) modal.classList.add('hidden');
  },

  async guardarEdicionAuditoria() {
    const id = this.currentAuditIdEditing;
    if (!id) return;

    const alertEl = document.getElementById('edit-auditoria-alert');
    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    const fecha = document.getElementById('edit-audit-fecha').value;
    const asesor_id = document.getElementById('edit-audit-asesor').value;
    const canal_id = document.getElementById('edit-audit-canal').value;
    const referencia = document.getElementById('edit-audit-referencia').value.trim();
    const numero_abonado = document.getElementById('edit-audit-abonado').value.trim();
    const comentario = document.getElementById('edit-audit-comentario').value.trim();

    if (!fecha || !asesor_id || !canal_id || !referencia) {
      if (alertEl) {
        alertEl.textContent = 'Por favor complete todos los campos obligatorios (*) (Fecha, Asesor, Canal y Teléfono de contacto).';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    const checkCritico = document.getElementById('edit-check-error-critico').checked;
    const detalleCritico = document.getElementById('edit-input-error-critico-detalle').value.trim();

    if (checkCritico && !detalleCritico) {
      if (alertEl) {
        alertEl.textContent = 'Debe detallar el motivo del Error Crítico (hasta 100 caracteres).';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    const rows = document.querySelectorAll('.criterio-eval-row-edit');
    const detalles = [];

    rows.forEach(r => {
      detalles.push({
        criterio_id: parseInt(r.getAttribute('data-cat-id'), 10),
        subcriterio_id: parseInt(r.getAttribute('data-sub-id'), 10),
        criterio_nombre: decodeURIComponent(r.getAttribute('data-cat-nombre')),
        subcriterio_nombre: decodeURIComponent(r.getAttribute('data-sub-nombre')),
        puntaje_maximo: parseFloat(r.getAttribute('data-max')) || 0,
        evaluacion: r.querySelector('.eval-select-edit').value,
        observacion: r.querySelector('.eval-obs-edit').value.trim()
      });
    });

    const payload = {
      fecha,
      asesor_id: parseInt(asesor_id, 10),
      canal_id: parseInt(canal_id, 10),
      referencia,
      numero_abonado: numero_abonado || null,
      comentario: comentario || null,
      error_critico: checkCritico,
      comentario_error_critico: checkCritico ? detalleCritico : null,
      observaciones_generales: document.getElementById('edit-audit-obs-generales').value.trim(),
      detalles
    };

    const btnSubmit = document.getElementById('btn-guardar-edicion-auditoria');
    if (btnSubmit) {
      btnSubmit.disabled = true;
      btnSubmit.textContent = 'Guardando cambios...';
    }

    try {
      await API.put(`/auditorias/${id}`, payload);
      alert(`Auditoría N° ${id} actualizada con éxito. El cambio fue registrado en la auditoría.`);
      this.cerrarModalEditarAuditoria();
      await this.cargarHistorial();
    } catch (err) {
      console.error('Error al actualizar auditoría:', err);
      if (alertEl) {
        alertEl.textContent = err.message || 'Error al guardar los cambios en la auditoría.';
        alertEl.classList.remove('hidden');
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span class="btn-icon">💾</span> Guardar Cambios';
      }
    }
  },

  async descargarReporteGeneralPDF() {
    const fechaDesde = document.getElementById('filtro-audit-fecha-desde').value;
    const fechaHasta = document.getElementById('filtro-audit-fecha-hasta').value;
    const asesorId = document.getElementById('filtro-audit-asesor').value;
    const auditorId = document.getElementById('filtro-audit-auditor').value;
    const canalId = document.getElementById('filtro-audit-canal').value;
    const resultado = document.getElementById('filtro-audit-resultado').value;

    const params = new URLSearchParams();
    if (fechaDesde) params.append('fecha_desde', fechaDesde);
    if (fechaHasta) params.append('fecha_hasta', fechaHasta);
    if (asesorId) params.append('asesor_id', asesorId);
    if (auditorId) params.append('auditor_id', auditorId);
    if (canalId) params.append('canal_id', canalId);
    if (resultado) params.append('resultado', resultado);

    try {
      const blob = await API.request(`/reportes/auditorias-pdf?${params.toString()}`, {
        headers: { 'Accept': 'application/pdf' },
        isBlob: true
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Reporte_General_Auditorias_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar reporte de auditorías en PDF:', err);
      alert('Error al generar el reporte en PDF: ' + err.message);
    }
  },

  async descargarPdfIndividual(id) {
    try {
      const blob = await API.request(`/reportes/auditoria-individual-pdf?id=${id}`, {
        headers: { 'Accept': 'application/pdf' },
        isBlob: true
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Auditoria_${id}_Evaluacion.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error al descargar PDF individual de auditoría:', err);
      alert('Error al descargar el PDF individual: ' + err.message);
    }
  },

  async eliminarAuditoria(id) {
    if (!confirm(`¿Está seguro de que desea eliminar la auditoría N° ${id}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      await API.delete(`/auditorias/${id}`);
      alert('Auditoría eliminada con éxito.');
      this.cargarHistorial();
    } catch (err) {
      console.error('Error al eliminar auditoría:', err);
      alert('Error al eliminar la auditoría: ' + err.message);
    }
  },

  async cargarCriteriosAdmin() {
    const contenedor = document.getElementById('criterios-manager-lista');
    if (!contenedor) return;

    contenedor.innerHTML = '<div class="text-center py-4 text-muted">Cargando criterios y subcriterios...</div>';

    try {
      const list = await API.get('/auditorias/criterios/admin');

      if (!list || list.length === 0) {
        contenedor.innerHTML = '<div class="text-center py-4 text-muted">No existen categorías configuradas. Presione "+ Nueva Categoría" para comenzar.</div>';
        return;
      }

      let html = '';
      list.forEach(c => {
        html += `
          <div class="criterio-card-item">
            <div class="criterio-card-header">
              <div>
                <strong class="font-md">${c.nombre}</strong>
                ${c.descripcion ? `<small class="text-muted d-block">${c.descripcion}</small>` : ''}
              </div>
              <div class="flex-row gap-1 align-center">
                <button class="btn btn-sm btn-outline-primary" onclick="AuditoriasModule.abrirModalEditarCriterio(${c.id}, '${encodeURIComponent(c.nombre)}', '${encodeURIComponent(c.descripcion || '')}')">
                  ✏️ Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="AuditoriasModule.eliminarCriterio(${c.id}, '${encodeURIComponent(c.nombre)}')">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
            <div class="criterio-card-body">
              <div class="flex-row justify-between align-center mb-3">
                <span class="font-sm text-muted font-bold">SUB-CRITERIOS / INDICADORES:</span>
                <button class="btn btn-sm btn-outline-primary" onclick="AuditoriasModule.abrirModalCrearSubcriterio(${c.id}, '${encodeURIComponent(c.nombre)}')">
                  + Agregar Indicador
                </button>
              </div>
              <div class="subcriterios-list">
        `;

        if (c.subcriterios && c.subcriterios.length > 0) {
          c.subcriterios.forEach(sub => {
            html += `
              <div class="subcriterio-pill-item">
                <div>
                  <span class="font-bold">${sub.nombre}</span>
                  <span class="badge ml-2" style="background:#E2E8F0; color:#334155; font-size:0.75rem;">${sub.puntaje_maximo} pts</span>
                </div>
                <div class="flex-row gap-1">
                  <button class="btn btn-sm btn-outline-secondary" onclick="AuditoriasModule.abrirModalEditarSubcriterio(${sub.id}, '${encodeURIComponent(sub.nombre)}', ${sub.puntaje_maximo})">
                    ✏️
                  </button>
                  <button class="btn btn-sm btn-outline-danger" onclick="AuditoriasModule.eliminarSubcriterio(${sub.id}, '${encodeURIComponent(sub.nombre)}')">
                    🗑️
                  </button>
                </div>
              </div>
            `;
          });
        } else {
          html += '<p class="text-muted font-sm italic m-0">No posee subcriterios vinculados. Recuerde que cada criterio debe tener al menos un subcriterio.</p>';
        }

        html += `
              </div>
            </div>
          </div>
        `;
      });

      contenedor.innerHTML = html;
    } catch (err) {
      console.error('Error al cargar administración de criterios:', err);
      contenedor.innerHTML = `<div class="text-danger py-4 text-center">Error: ${err.message}</div>`;
    }
  },

  abrirModalCrearCriterio() {
    document.getElementById('nuevo-criterio-nombre').value = '';
    document.getElementById('nuevo-criterio-desc').value = '';
    const modal = document.getElementById('modal-crear-criterio');
    modal.classList.remove('hidden');

    const form = document.getElementById('form-crear-criterio');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('nuevo-criterio-nombre').value.trim();
      const descripcion = document.getElementById('nuevo-criterio-desc').value.trim();

      try {
        await API.post('/auditorias/criterios', { nombre, descripcion });
        modal.classList.add('hidden');
        await this.cargarCriteriosAdmin();
        await this.cargarCriteriosParaEvaluacion();
      } catch (err) {
        alert('Error al crear categoría: ' + err.message);
      }
    };
  },

  cerrarModalCrearCriterio() {
    document.getElementById('modal-crear-criterio').classList.add('hidden');
  },

  abrirModalEditarCriterio(id, nombreEnc, descEnc) {
    const nombre = decodeURIComponent(nombreEnc);
    const desc = decodeURIComponent(descEnc);

    document.getElementById('edit-criterio-id').value = id;
    document.getElementById('edit-criterio-nombre').value = nombre;
    document.getElementById('edit-criterio-desc').value = desc;

    const modal = document.getElementById('modal-editar-criterio');
    modal.classList.remove('hidden');

    const form = document.getElementById('form-editar-criterio');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nuevoNombre = document.getElementById('edit-criterio-nombre').value.trim();
      const nuevaDesc = document.getElementById('edit-criterio-desc').value.trim();

      try {
        await API.put(`/auditorias/criterios/${id}`, { nombre: nuevoNombre, descripcion: nuevaDesc });
        modal.classList.add('hidden');
        await this.cargarCriteriosAdmin();
        await this.cargarCriteriosParaEvaluacion();
      } catch (err) {
        alert('Error al modificar categoría: ' + err.message);
      }
    };
  },

  cerrarModalEditarCriterio() {
    document.getElementById('modal-editar-criterio').classList.add('hidden');
  },

  async eliminarCriterio(id, nombreEnc) {
    const nombre = decodeURIComponent(nombreEnc);
    const mensaje = `¡ADVERTENCIA!\n\n¿Está seguro de que desea eliminar el criterio "${nombre}"?\nAl eliminar este criterio también se eliminarán todos los subcriterios vinculados al mismo.`;

    if (!confirm(mensaje)) return;

    try {
      const res = await API.delete(`/auditorias/criterios/${id}`);
      if (res && res.mensaje) {
        alert(res.mensaje);
      }
      await this.cargarCriteriosAdmin();
      await this.cargarCriteriosParaEvaluacion();
    } catch (err) {
      alert('Error al eliminar criterio: ' + err.message);
    }
  },

  abrirModalCrearSubcriterio(criterioId, catNombreEnc) {
    const catNombre = decodeURIComponent(catNombreEnc);
    document.getElementById('nuevo-subcriterio-criterio-id').value = criterioId;
    document.getElementById('nuevo-subcriterio-criterio-nombre').textContent = catNombre;
    document.getElementById('nuevo-subcriterio-nombre').value = '';
    document.getElementById('nuevo-subcriterio-puntaje').value = '';

    const modal = document.getElementById('modal-crear-subcriterio');
    modal.classList.remove('hidden');

    const form = document.getElementById('form-crear-subcriterio');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('nuevo-subcriterio-nombre').value.trim();
      const puntaje = parseFloat(document.getElementById('nuevo-subcriterio-puntaje').value);

      try {
        await API.post('/auditorias/subcriterios', {
          criterio_id: criterioId,
          nombre,
          puntaje_maximo: puntaje
        });
        modal.classList.add('hidden');
        await this.cargarCriteriosAdmin();
        await this.cargarCriteriosParaEvaluacion();
      } catch (err) {
        alert('Error al agregar indicador: ' + err.message);
      }
    };
  },

  cerrarModalCrearSubcriterio() {
    document.getElementById('modal-crear-subcriterio').classList.add('hidden');
  },

  abrirModalEditarSubcriterio(id, nombreEnc, puntaje) {
    const nombre = decodeURIComponent(nombreEnc);
    document.getElementById('edit-subcriterio-id').value = id;
    document.getElementById('edit-subcriterio-nombre').value = nombre;
    document.getElementById('edit-subcriterio-puntaje').value = puntaje;

    const modal = document.getElementById('modal-editar-subcriterio');
    modal.classList.remove('hidden');

    const form = document.getElementById('form-editar-subcriterio');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nuevoNombre = document.getElementById('edit-subcriterio-nombre').value.trim();
      const nuevoPuntaje = parseFloat(document.getElementById('edit-subcriterio-puntaje').value);

      try {
        await API.put(`/auditorias/subcriterios/${id}`, {
          nombre: nuevoNombre,
          puntaje_maximo: nuevoPuntaje
        });
        modal.classList.add('hidden');
        await this.cargarCriteriosAdmin();
        await this.cargarCriteriosParaEvaluacion();
      } catch (err) {
        alert('Error al modificar indicador: ' + err.message);
      }
    };
  },

  cerrarModalEditarSubcriterio() {
    document.getElementById('modal-editar-subcriterio').classList.add('hidden');
  },

  async eliminarSubcriterio(id, nombreEnc) {
    const nombre = decodeURIComponent(nombreEnc);
    if (!confirm(`¿Está seguro de que desea eliminar el indicador "${nombre}"?`)) return;

    try {
      const res = await API.delete(`/auditorias/subcriterios/${id}`);
      if (res && res.mensaje) {
        alert(res.mensaje);
      }
      await this.cargarCriteriosAdmin();
      await this.cargarCriteriosParaEvaluacion();
    } catch (err) {
      alert('Error al eliminar indicador: ' + err.message);
    }
  },

  async cargarCanalesAdmin() {
    const tbody = document.getElementById('tabla-canales-admin-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">Cargando canales...</td></tr>';

    try {
      const list = await API.get('/auditorias/canales/admin');

      if (!list || list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center py-4 text-muted">No hay canales de atención configurados.</td></tr>';
        return;
      }

      let html = '';
      list.forEach(c => {
        html += `
          <tr>
            <td><strong>${c.nombre}</strong></td>
            <td style="text-align: center;">
              ${c.activo 
                ? '<span class="badge" style="background:#DCFCE7; color:#15803D; font-weight:700;">Activo</span>' 
                : '<span class="badge" style="background:#FEE2E2; color:#B91C1C; font-weight:700;">Inactivo</span>'}
            </td>
            <td style="text-align: center;">
              <div class="flex-row gap-1 justify-center">
                <button class="btn btn-sm btn-outline-primary" onclick="AuditoriasModule.abrirModalEditarCanal(${c.id}, '${encodeURIComponent(c.nombre)}', ${c.activo})">
                  ✏️ Editar
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="AuditoriasModule.eliminarCanal(${c.id}, '${encodeURIComponent(c.nombre)}')">
                  🗑️ Eliminar
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = html;
    } catch (err) {
      console.error('Error al cargar administración de canales:', err);
      tbody.innerHTML = `<tr><td colspan="3" class="text-center py-4 text-danger">Error: ${err.message}</td></tr>`;
    }
  },

  abrirModalCrearCanal() {
    document.getElementById('nuevo-canal-nombre').value = '';
    const modal = document.getElementById('modal-crear-canal');
    modal.classList.remove('hidden');

    const form = document.getElementById('form-crear-canal');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('nuevo-canal-nombre').value.trim();

      try {
        await API.post('/auditorias/canales', { nombre });
        modal.classList.add('hidden');
        await this.cargarCanalesAdmin();
        await this.cargarCatalogos();
      } catch (err) {
        alert('Error al crear canal: ' + err.message);
      }
    };
  },

  cerrarModalCrearCanal() {
    document.getElementById('modal-crear-canal').classList.add('hidden');
  },

  abrirModalEditarCanal(id, nombreEnc, activo) {
    const nombre = decodeURIComponent(nombreEnc);
    document.getElementById('edit-canal-id').value = id;
    document.getElementById('edit-canal-nombre').value = nombre;
    document.getElementById('edit-canal-activo').value = String(activo);

    const modal = document.getElementById('modal-editar-canal');
    modal.classList.remove('hidden');

    const form = document.getElementById('form-editar-canal');
    form.onsubmit = async (e) => {
      e.preventDefault();
      const nuevoNombre = document.getElementById('edit-canal-nombre').value.trim();
      const nuevoActivo = document.getElementById('edit-canal-activo').value === 'true';

      try {
        await API.put(`/auditorias/canales/${id}`, { nombre: nuevoNombre, activo: nuevoActivo });
        modal.classList.add('hidden');
        await this.cargarCanalesAdmin();
        await this.cargarCatalogos();
      } catch (err) {
        alert('Error al modificar canal: ' + err.message);
      }
    };
  },

  cerrarModalEditarCanal() {
    document.getElementById('modal-editar-canal').classList.add('hidden');
  },

  async eliminarCanal(id, nombreEnc) {
    const nombre = decodeURIComponent(nombreEnc);
    if (!confirm(`¿Está seguro de que desea eliminar o desactivar el canal "${nombre}"?`)) return;

    try {
      const res = await API.delete(`/auditorias/canales/${id}`);
      if (res && res.mensaje) {
        alert(res.mensaje);
      }
      await this.cargarCanalesAdmin();
      await this.cargarCatalogos();
    } catch (err) {
      alert('Error al eliminar canal: ' + err.message);
    }
  },

  ofrecerFeedbackAsesor(auditoria, payload) {
    const modal = document.getElementById('modal-feedback-auditoria');
    if (!modal) {
      alert('Auditoría registrada exitosamente.');
      return;
    }

    const asesorSelect = document.getElementById('nueva-auditoria-asesor');
    let asesorNombre = 'Asesor';
    if (asesorSelect) {
      const opt = asesorSelect.querySelector(`option[value="${payload.asesor_id}"]`);
      if (opt) asesorNombre = opt.textContent;
    }

    const nombreEl = document.getElementById('feedback-asesor-nombre');
    const badgeEl = document.getElementById('feedback-resultado-badge');
    const metaEl = document.getElementById('feedback-audit-meta');
    const asuntoInput = document.getElementById('feedback-input-asunto');
    const cuerpoInput = document.getElementById('feedback-input-cuerpo');
    const alertEl = document.getElementById('alert-feedback-auditoria');

    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    if (nombreEl) nombreEl.textContent = asesorNombre;
    if (metaEl) {
      metaEl.textContent = `Auditoría N° ${auditoria.id} - Fecha evaluada: ${payload.fecha} - Ref/Tel: ${payload.referencia}`;
    }

    const pct = auditoria.porcentaje_calidad || 0;
    const res = auditoria.resultado || 'Evaluado';
    if (badgeEl) {
      let bClass = 'badge-success';
      if (res === 'Crítico' || res === 'No Cumple') bClass = 'badge-danger';
      else if (res === 'Regular') bClass = 'badge-warning';
      badgeEl.innerHTML = `<span class="badge ${bClass}" style="font-size: 0.9rem;">${pct}% (${res})</span>`;
    }

    if (asuntoInput) {
      asuntoInput.value = `Feedback de Auditoría de Calidad N° ${auditoria.id} (${res})`;
    }

    if (cuerpoInput) {
      let texto = `Hola ${asesorNombre},

Se ha completado la Auditoría de Calidad N° ${auditoria.id} correspondiente a tu interacción del día ${payload.fecha} (Referencia: ${payload.referencia}).

`;
      texto += `• Resultado Final: ${pct}% (${res})
`;
      if (payload.error_critico) {
        texto += `• Error Crítico Detectado: ${payload.comentario_error_critico || 'Sí'}
`;
      }
      if (payload.comentario) {
        texto += `• Comentario sobre la interacción: ${payload.comentario}
`;
      }
      if (payload.observaciones_generales) {
        texto += `• Observaciones Generales: ${payload.observaciones_generales}
`;
      }

      texto += `
Detalle por categorías evaluadas:
`;
      payload.detalles.forEach(d => {
        texto += `- ${d.criterio_nombre} / ${d.subcriterio_nombre}: [${d.evaluacion}]`;
        if (d.observacion) {
          texto += ` (Obs: ${d.observacion})`;
        }
        texto += `
`;
      });

      texto += `
Cualquier duda o consulta sobre esta evaluación, quedo a disposición.
Saludos cordiales.`;
      cuerpoInput.value = texto;
      this.actualizarContadorFeedback(cuerpoInput);
    }

    this.pendingFeedbackData = {
      destinatario_id: payload.asesor_id,
      auditoria_id: auditoria.id
    };

    modal.classList.remove('hidden');
  },

  actualizarContadorFeedback(textarea) {
    const counter = document.getElementById('feedback-cuerpo-counter');
    if (counter && textarea) {
      counter.textContent = `${textarea.value.length} / 10.000`;
    }
  },

  cerrarModalFeedback() {
    const modal = document.getElementById('modal-feedback-auditoria');
    if (modal) modal.classList.add('hidden');
    this.pendingFeedbackData = null;
  },

  async enviarFeedbackConfirmado(e) {
    if (e) e.preventDefault();

    if (!this.pendingFeedbackData || !this.pendingFeedbackData.destinatario_id) {
      this.cerrarModalFeedback();
      return;
    }

    const asunto = document.getElementById('feedback-input-asunto').value.trim();
    const cuerpo = document.getElementById('feedback-input-cuerpo').value.trim();
    const alertEl = document.getElementById('alert-feedback-auditoria');
    const btnSubmit = document.getElementById('btn-enviar-feedback-submit');

    if (alertEl) {
      alertEl.classList.add('hidden');
      alertEl.textContent = '';
    }

    if (!cuerpo) {
      if (alertEl) {
        alertEl.textContent = 'El contenido del feedback no puede estar vacío.';
        alertEl.classList.remove('hidden');
      }
      return;
    }

    try {
      if (btnSubmit) {
        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Enviando feedback...';
      }

      const formData = new FormData();
      formData.append('destinatario_id', this.pendingFeedbackData.destinatario_id);
      formData.append('asunto', asunto);
      formData.append('cuerpo', cuerpo);

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
        throw new Error(data.error || 'Error al enviar feedback.');
      }

      alert('Feedback enviado exitosamente al asesor por Mensajería Interna.');
      this.cerrarModalFeedback();

      if (typeof MensajesModule !== 'undefined') {
        MensajesModule.actualizarBadge();
      }
    } catch (err) {
      if (alertEl) {
        alertEl.textContent = err.message || 'Error al enviar feedback.';
        alertEl.classList.remove('hidden');
      } else {
        alert(err.message || 'Error al enviar feedback.');
      }
    } finally {
      if (btnSubmit) {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>✉️</span> Enviar Feedback al Asesor';
      }
    }
  },

};
