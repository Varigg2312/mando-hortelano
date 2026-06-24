// ==========================================================================
// CONFIGURACIÓN
// ==========================================================================
const PIN_ACCESO    = '1234';          // ← Cambia este valor para modificar el PIN
const CAMPOS_MEMORIA = ['lote-vinagre', 'lote-sal', 'lote-ajo', 'lote-aceite', 'lote-limon', 'lote-pimiento', 'lote-envase', 'cliente-destino'];

// ==========================================================================
// SISTEMA DE NOTIFICACIONES (TOASTS)
// ==========================================================================
function mostrarToast(mensaje, tipo = 'exito') {
    const contenedor = document.getElementById('contenedor-toast');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    const duracion = tipo === 'error' ? 6000 : 4000;
    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duracion);
}

// ==========================================================================
// MODAL DE CONFIRMACIÓN
// ==========================================================================
function confirmar(mensaje) {
    return new Promise(resolve => {
        const modal   = document.getElementById('modal-confirmacion');
        document.getElementById('modal-mensaje').textContent = mensaje;
        modal.classList.remove('oculto');

        const resolver = (r) => { modal.classList.add('oculto'); resolve(r); };
        document.getElementById('modal-confirmar-si').onclick = () => resolver(true);
        document.getElementById('modal-confirmar-no').onclick = () => resolver(false);
    });
}

// ==========================================================================
// CONTROL DE ACCESO — PIN LOCAL (sin servidores)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (sessionStorage.getItem('hortelano_sesion') === '1') {
        desbloquearPanel();
    }
});

document.getElementById('btn-login').addEventListener('click', () => {
    const pin      = document.getElementById('login-pin').value;
    const errorMsg = document.getElementById('login-error');

    if (!pin) return;

    if (pin === PIN_ACCESO) {
        sessionStorage.setItem('hortelano_sesion', '1');
        desbloquearPanel();
    } else {
        errorMsg.textContent = 'PIN incorrecto. Inténtalo de nuevo.';
        errorMsg.classList.remove('oculto');
        document.getElementById('login-pin').value = '';
    }
});

// El PIN también se puede enviar con Enter
document.getElementById('login-pin').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
});

function desbloquearPanel() {
    document.getElementById('pantalla-login').classList.add('oculto');
    arrancarOperaciones();
}

// ==========================================================================
// VALIDACIÓN DE RANGOS LEGALES (APPCC)
// ==========================================================================
const RANGOS = {
    'cloro':                { min: 0.2,       max: 1.0, label: 'Cloro Libre',    unidad: 'ppm' },
    'ph':                   { min: 6.5,       max: 8.5, label: 'pH',             unidad: '' },
    'temperatura-cam1':     { min: -Infinity, max: 4.0, label: 'Temp. Cámara 1', unidad: 'ºC' },
    'temperatura-vehiculo': { min: -Infinity, max: 4.0, label: 'Temp. Vehículo', unidad: 'ºC' }
};

function validarRangos() {
    const alertas = [];
    for (const [id, rango] of Object.entries(RANGOS)) {
        const input = document.getElementById(id);
        const val   = parseFloat(input.value);
        const fuera = !isNaN(val) && (val < rango.min || val > rango.max);
        input.classList.toggle('rango-alerta', fuera);
        if (fuera) {
            const minStr = rango.min === -Infinity ? '-∞' : rango.min;
            alertas.push(`${rango.label}: ${val}${rango.unidad} (límite: ${minStr}–${rango.max}${rango.unidad})`);
        }
    }
    return alertas;
}

function activarValidacionEnTiempoReal() {
    for (const [id, rango] of Object.entries(RANGOS)) {
        const input = document.getElementById(id);
        if (!input) continue;
        input.addEventListener('blur', () => {
            const val   = parseFloat(input.value);
            const fuera = !isNaN(val) && (val < rango.min || val > rango.max);
            input.classList.toggle('rango-alerta', fuera);
        });
    }
}

// ==========================================================================
// LÓGICA OPERATIVA PRINCIPAL
// ==========================================================================
function arrancarOperaciones() {
    activarReloj();
    inicializarFechasManuales();
    inicializarFechasPDF();
    recuperarMemoriaOperativa();
    activarValidacionEnTiempoReal();
    inicializarDictadoPorVoz();
    inicializarCristalFirma();
    inicializarGraficas();
    prepararFormularios();
    prepararGeneradorPDF();
    prepararExportImport();
    inicializarNavegacion();
    verificarRegistroHoy();
}

function activarReloj() {
    const visor = document.getElementById('reloj');
    setInterval(() => { visor.textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);
}

function inicializarFechasManuales() {
    const hoy = new Date().toISOString().split('T')[0];
    const h   = document.getElementById('fecha-higiene');
    const t   = document.getElementById('fecha-trazabilidad');
    if (h) h.value = hoy;
    if (t) t.value = hoy;
}

function inicializarFechasPDF() {
    const hoy    = new Date().toISOString().split('T')[0];
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);
    document.getElementById('pdf-desde').value = hace30.toISOString().split('T')[0];
    document.getElementById('pdf-hasta').value  = hoy;
}

function recuperarMemoriaOperativa() {
    CAMPOS_MEMORIA.forEach(id => {
        const v = localStorage.getItem(id);
        if (v) document.getElementById(id).value = v;
    });
}

// --- BADGE: CONTROL DE HIGIENE HOY ---
async function verificarRegistroHoy() {
    const badge = document.getElementById('badge-registro-hoy');
    if (!badge) return;
    try {
        const existe = await HortelanoDB.existeHoy();
        if (existe) {
            badge.textContent = '✅ Control de higiene registrado hoy';
            badge.className   = 'badge-hoy badge-hoy-ok';
        } else {
            badge.textContent = '⚠️ Control de higiene pendiente hoy';
            badge.className   = 'badge-hoy badge-hoy-pendiente';
        }
        badge.classList.remove('oculto');
    } catch (e) {
        console.error('Error verificando registro hoy:', e);
    }
}

// --- DICTADO POR VOZ ---
function inicializarDictadoPorVoz() {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) {
        document.querySelectorAll('.btn-micro').forEach(b => b.style.display = 'none');
        return;
    }

    const limpiarTextoVoz = (texto) => {
        let s = texto.toUpperCase().replace(/\b(EL|LA|DE|DEL|LETRA|NÚMERO|NUMERO|LOTE|RAYA|ESPACIO)\b/g, '');
        const conv = { "ÉLE":"L","ELE":"L","GUION":"-","GUIÓN":"-","MENOS":"-","BARRA":"/","PARTIDO":"/","PUNTO":".",
                       "CERO":"0","UNO":"1","DOS":"2","TRES":"3","CUATRO":"4","CINCO":"5","SEIS":"6","SIETE":"7","OCHO":"8","NUEVE":"9" };
        for (const [p, sim] of Object.entries(conv)) s = s.replace(new RegExp(`\\b${p}\\b`, 'g'), sim);
        return s.replace(/[^A-Z0-9\-\/\.\s]/g, '').trim();
    };

    let recoActivo = null;

    document.querySelectorAll('.btn-micro').forEach(boton => {
        boton.addEventListener('click', function () {
            if (recoActivo) { recoActivo.abort(); recoActivo = null; return; }

            const input       = document.getElementById(this.getAttribute('data-dictado-target'));
            const botonActual = this;
            const reco        = new R();
            reco.lang         = 'es-ES';
            recoActivo        = reco;

            reco.onstart  = () => { input.style.backgroundColor = '#fff3cd'; botonActual.classList.add('grabando'); };
            reco.onresult = (e) => { input.value = limpiarTextoVoz(e.results[0][0].transcript); };
            reco.onend    = () => { input.style.backgroundColor = '#fff'; botonActual.classList.remove('grabando'); recoActivo = null; };
            reco.start();
        });
    });
}

// --- FIRMA BIOMÉTRICA RESPONSIVE ---
function inicializarCristalFirma() {
    const canvas = document.getElementById('lienzo-firma');
    const ctx    = canvas.getContext('2d');
    let dibujando    = false;
    let limitesLienzo = null;

    window.estadoFirma = { estaDibujado: false };

    const escalar = (ev, rect) => ({
        x: (ev.clientX - rect.left)  * (canvas.width  / rect.width),
        y: (ev.clientY - rect.top)   * (canvas.height / rect.height)
    });

    const iniciar   = (e) => {
        dibujando = true; window.estadoFirma.estaDibujado = true;
        limitesLienzo = canvas.getBoundingClientRect();
        ctx.beginPath(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#000';
        const { x, y } = escalar(e.touches ? e.touches[0] : e, limitesLienzo);
        ctx.moveTo(x, y); e.preventDefault();
    };
    const continuar = (e) => {
        if (!dibujando || !limitesLienzo) return;
        const { x, y } = escalar(e.touches ? e.touches[0] : e, limitesLienzo);
        ctx.lineTo(x, y); ctx.stroke(); e.preventDefault();
    };
    const parar     = () => { dibujando = false; };

    canvas.addEventListener('mousedown',  iniciar);
    canvas.addEventListener('mousemove',  continuar);
    canvas.addEventListener('mouseup',    parar);
    canvas.addEventListener('mouseout',   parar);
    canvas.addEventListener('touchstart', iniciar);
    canvas.addEventListener('touchmove',  continuar);
    canvas.addEventListener('touchend',   parar);

    document.getElementById('btn-limpiar-firma').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.estadoFirma.estaDibujado = false;
    });
}

// --- GRÁFICAS CON LÍNEAS DE REFERENCIA APPCC ---
let chartTemp = null, chartCloro = null, chartVeh = null;

function lineaRef(label, valor, n, color) {
    return { label, data: Array(n).fill(valor), borderColor: color, borderDash: [6, 4], borderWidth: 1.5, pointRadius: 0, fill: false };
}

async function inicializarGraficas() {
    try {
        const datos = await HortelanoDB.obtenerUltimos(HortelanoDB.T_HIGIENE, 15);
        const n     = datos.length;
        const etiquetas = datos.map(x => new Date(x.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));

        if (chartTemp)  chartTemp.destroy();
        if (chartCloro) chartCloro.destroy();
        if (chartVeh)   chartVeh.destroy();

        const opts = (yMin, yMax) => ({
            responsive: true,
            plugins: { legend: { labels: { boxWidth: 10, font: { size: 9 } } } },
            scales:  { y: { suggestedMin: yMin, suggestedMax: yMax } }
        });

        chartTemp = new Chart(document.getElementById('grafica-temperatura').getContext('2d'), {
            type: 'line',
            data: { labels: etiquetas, datasets: [
                { label: 'ºC Cámara 1', data: datos.map(x => x.temperatura), borderColor: '#2980b9', tension: 0.3, fill: false },
                lineaRef('Límite 4ºC', 4, n, 'rgba(192,57,43,0.65)')
            ]},
            options: opts(0, 8)
        });

        chartCloro = new Chart(document.getElementById('grafica-cloro').getContext('2d'), {
            type: 'line',
            data: { labels: etiquetas, datasets: [
                { label: 'Cloro (ppm)', data: datos.map(x => x.cloro), borderColor: '#27ae60', tension: 0.3, fill: false },
                lineaRef('Mín 0.2', 0.2, n, 'rgba(243,156,18,0.75)'),
                lineaRef('Máx 1.0', 1.0, n, 'rgba(192,57,43,0.65)')
            ]},
            options: opts(0, 1.5)
        });

        chartVeh = new Chart(document.getElementById('grafica-vehiculo').getContext('2d'), {
            type: 'line',
            data: { labels: etiquetas, datasets: [
                { label: 'ºC Vehículo', data: datos.map(x => x.temperatura_vehiculo), borderColor: '#8e44ad', tension: 0.3, fill: false },
                lineaRef('Límite 4ºC', 4, n, 'rgba(192,57,43,0.65)')
            ]},
            options: opts(0, 8)
        });

    } catch (e) {
        console.error('Error en gráficas:', e);
    }
}

// --- FORMULARIOS ---
function prepararFormularios() {

    // HIGIENE
    document.getElementById('formulario-higiene').addEventListener('submit', async (e) => {
        e.preventDefault();

        const orgBtn  = document.querySelector('input[name="organoleptico"]:checked');
        const mantBtn = document.querySelector('input[name="mantenimiento"]:checked');
        const plagBtn = document.querySelector('input[name="plagas"]:checked');

        if (!orgBtn)  return mostrarToast('Selecciona el resultado del examen organoléptico.', 'error');
        if (!mantBtn) return mostrarToast('Selecciona el estado de mantenimiento.', 'error');
        if (!plagBtn) return mostrarToast('Confirma el control de plagas.', 'error');

        const alertasRango = validarRangos();
        const msgConfirm   = alertasRango.length > 0
            ? `⚠️ Valores fuera de rango legal:\n${alertasRango.join('\n')}\n\n¿Registrar de todos modos?`
            : '¿Confirmar y registrar el Plan de Higiene?';
        if (!await confirmar(msgConfirm)) return;

        const zonas = Array.from(document.querySelectorAll('.cuadricula-limpieza input[type="checkbox"]:checked'))
            .map(cb => cb.value).join(', ');

        const [y, m, d] = document.getElementById('fecha-higiene').value.split('-').map(Number);
        const ahora = new Date();
        const fechaConHora = new Date(y, m - 1, d, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());

        const cuerpo = {
            fecha_hora:           fechaConHora.toISOString(),
            cloro:                parseFloat(document.getElementById('cloro').value),
            ph:                   parseFloat(document.getElementById('ph').value),
            organoleptico:        orgBtn.value,
            temperatura:          parseFloat(document.getElementById('temperatura-cam1').value),
            temperatura_vehiculo: parseFloat(document.getElementById('temperatura-vehiculo').value),
            zonas_limpieza:       zonas,
            plagas:               plagBtn.value,
            estado_mantenimiento: mantBtn.value,
            observaciones:        document.getElementById('observaciones').value,
            firma:                'Manual'
        };

        try {
            await HortelanoDB.insertar(HortelanoDB.T_HIGIENE, cuerpo);
            mostrarToast('✅ Plan de Higiene registrado correctamente.');
            inicializarGraficas();
            verificarRegistroHoy();
            e.target.reset();
            inicializarFechasManuales();
        } catch (err) {
            mostrarToast(`Error al guardar: ${err.message}`, 'error');
        }
    });

    // TRAZABILIDAD
    document.getElementById('formulario-trazabilidad').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!window.estadoFirma?.estaDibujado) {
            return mostrarToast('La firma biométrica es obligatoria. Sella el documento.', 'error');
        }
        if (!await confirmar('¿Confirmar y sellar el lote de producción?')) return;

        CAMPOS_MEMORIA.forEach(id => {
            const el = document.getElementById(id);
            if (el) localStorage.setItem(id, el.value);
        });

        const [y, m, d] = document.getElementById('fecha-trazabilidad').value.split('-').map(Number);
        const ahora = new Date();
        const fechaConHora = new Date(y, m - 1, d, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());

        const cuerpo = {
            fecha_hora:           fechaConHora.toISOString(),
            lote_tomate:          document.getElementById('lote-tomate').value,
            lote_vinagre:         document.getElementById('lote-vinagre').value,
            lote_sal:             document.getElementById('lote-sal').value,
            lote_ajo:             document.getElementById('lote-ajo').value,
            lote_aceite:          document.getElementById('lote-aceite').value,
            lote_limon:           document.getElementById('lote-limon').value,
            lote_pimiento:        document.getElementById('lote-pimiento').value,
            lote_envases:         document.getElementById('lote-envase').value,
            litros:               parseFloat(document.getElementById('litros-prod').value)  || 0,
            kg_salmorejo:         parseFloat(document.getElementById('kg-salmorejo').value) || 0,
            lote_gazpacho_salida: document.getElementById('lote-salida').value,
            cliente_destino:      document.getElementById('cliente-destino').value,
            firma:                document.getElementById('lienzo-firma').toDataURL()
        };

        try {
            await HortelanoDB.insertar(HortelanoDB.T_TRAZA, cuerpo);
            mostrarToast('✅ Lote sellado y documentado.');
            document.getElementById('btn-limpiar-firma').click();
            document.getElementById('litros-prod').value  = 0;
            document.getElementById('kg-salmorejo').value = 0;
            inicializarFechasManuales();
        } catch (err) {
            mostrarToast(`Error al guardar: ${err.message}`, 'error');
        }
    });
}

// --- GENERADOR PDF CON ANCHOS DINÁMICOS Y ALERTAS APPCC ---
function prepararGeneradorPDF() {
    document.getElementById('btn-imprimir-traza').addEventListener('click', async () => {
        const btn = document.getElementById('btn-imprimir-traza');
        const textoOriginal = btn.textContent;
        btn.textContent = '⏳ GENERANDO INFORME...';
        btn.disabled    = true;

        try {
            const desde = document.getElementById('pdf-desde').value;
            const hasta = document.getElementById('pdf-hasta').value;

            const [h, t] = await Promise.all([
                HortelanoDB.obtenerPorRango(HortelanoDB.T_HIGIENE, desde, hasta),
                HortelanoDB.obtenerPorRango(HortelanoDB.T_TRAZA,   desde, hasta)
            ]);

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const PW  = doc.internal.pageSize.getWidth();
            const PH  = doc.internal.pageSize.getHeight();
            const ML  = 8;
            const rangoTexto = (desde && hasta) ? `  ${desde} — ${hasta}` : '';

            const titulo = (txt) => {
                doc.setFontSize(10); doc.setFont(undefined, 'bold');
                doc.text(txt + rangoTexto, ML, 12);
                doc.setFont(undefined, 'normal');
            };
            const piePagina = () => {
                doc.setFontSize(7); doc.setTextColor(140);
                doc.text(`El Hortelano — Informe APPCC | Pág. ${doc.internal.getCurrentPageInfo().pageNumber}`, PW / 2, PH - 5, { align: 'center' });
                doc.setTextColor(0);
            };

            // PÁGINA 1 — HIGIENE (anchos: 18+13+12+13+13+18+24+15+80+75 = 281mm)
            titulo('REGISTRO DE HIGIENE Y MANTENIMIENTO — EL HORTELANO');
            doc.autoTable({
                startY: 16, margin: { left: ML, right: ML },
                head: [['Fecha', 'Cloro\n(ppm)', 'pH', 'ºC\nCám.1', 'ºC\nVeh.', 'Org.', 'Plagas', 'Mant.', 'Zonas de Limpieza Ejecutadas', 'Observaciones / Incidencias']],
                body: h.map(x => [
                    new Date(x.fecha_hora).toLocaleDateString('es-ES'),
                    x.cloro ?? '-', x.ph ?? '-', x.temperatura ?? '-', x.temperatura_vehiculo ?? '-',
                    x.organoleptico || '-', x.plagas || '-', x.estado_mantenimiento || '-',
                    x.zonas_limpieza || '-', x.observaciones || ''
                ]),
                theme: 'grid',
                styles:     { fontSize: 6, halign: 'center', cellPadding: 1, overflow: 'linebreak', minCellHeight: 6 },
                headStyles: { fillColor: [44, 62, 80], fontSize: 6, fontStyle: 'bold', cellPadding: 1.5 },
                columnStyles: {
                    0: { cellWidth: 18 }, 1: { cellWidth: 13 }, 2: { cellWidth: 12 },
                    3: { cellWidth: 13 }, 4: { cellWidth: 13 }, 5: { cellWidth: 18 },
                    6: { cellWidth: 24 }, 7: { cellWidth: 15 },
                    8: { cellWidth: 80, halign: 'left' }, 9: { cellWidth: 75, halign: 'left' }
                },
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    const v = parseFloat(data.cell.raw);
                    const alerta = (c) => { if (c) { data.cell.styles.fillColor = [255, 210, 210]; data.cell.styles.textColor = [160, 0, 0]; data.cell.styles.fontStyle = 'bold'; } };
                    if (data.column.index === 1) alerta(!isNaN(v) && (v < 0.2 || v > 1.0));
                    if (data.column.index === 2) alerta(!isNaN(v) && (v < 6.5 || v > 8.5));
                    if (data.column.index === 3) alerta(!isNaN(v) && v > 4);
                    if (data.column.index === 4) alerta(!isNaN(v) && v > 4);
                },
                didDrawPage: piePagina
            });

            // PÁGINA 2 — TRAZABILIDAD (anchos: 16+18+18+16+16+18+16+18+18+14+14+28+45+24 = 279mm)
            doc.addPage();
            titulo('REGISTRO DE TRAZABILIDAD DE PRODUCCIÓN — EL HORTELANO');
            doc.autoTable({
                startY: 16, margin: { left: ML, right: ML },
                head: [['Fecha', 'Tomate', 'Vinagre', 'Sal', 'Ajo', 'Aceite', 'Limón', 'Pimiento', 'Envases', 'L.Gaz\n(L)', 'Kg.Sal\n(Kg)', 'Lote Salida', 'Cliente / Destino', 'Firma']],
                body: t.map(x => [
                    new Date(x.fecha_hora).toLocaleDateString('es-ES'),
                    x.lote_tomate || '-', x.lote_vinagre || '-', x.lote_sal || '-', x.lote_ajo || '-',
                    x.lote_aceite || '-', x.lote_limon  || '-', x.lote_pimiento || '-', x.lote_envases || '-',
                    x.litros ?? '0', x.kg_salmorejo ?? '0', x.lote_gazpacho_salida || '-', x.cliente_destino || '-', ''
                ]),
                theme: 'grid',
                styles:     { fontSize: 5.5, halign: 'center', cellPadding: 1, overflow: 'linebreak', minCellHeight: 8 },
                headStyles: { fillColor: [39, 174, 96], fontSize: 5.5, fontStyle: 'bold', cellPadding: 1.5 },
                columnStyles: {
                    0:  { cellWidth: 16 }, 1:  { cellWidth: 18 }, 2:  { cellWidth: 18 },
                    3:  { cellWidth: 16 }, 4:  { cellWidth: 16 }, 5:  { cellWidth: 18 },
                    6:  { cellWidth: 16 }, 7:  { cellWidth: 18 }, 8:  { cellWidth: 18 },
                    9:  { cellWidth: 14 }, 10: { cellWidth: 14 }, 11: { cellWidth: 28 },
                    12: { cellWidth: 45, halign: 'left' }, 13: { cellWidth: 24 }
                },
                didDrawCell: (data) => {
                    if (data.column.index === 13 && data.section === 'body') {
                        const firma = t[data.row.index]?.firma;
                        if (firma?.startsWith('data:image')) {
                            const iy = data.cell.y + (data.cell.height - 9) / 2;
                            doc.addImage(firma, 'PNG', data.cell.x + 1, iy, 22, 9);
                        }
                    }
                },
                didDrawPage: piePagina
            });

            const etFecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
            doc.save(`Informe_ElHortelano_${etFecha}.pdf`);
            mostrarToast(`✅ Informe generado: ${h.length} registros higiene, ${t.length} trazabilidad.`);

        } catch (err) {
            console.error(err);
            mostrarToast(`Error al generar el informe: ${err.message}`, 'error');
        } finally {
            btn.textContent = textoOriginal;
            btn.disabled    = false;
        }
    });
}

// --- EXPORTAR / IMPORTAR JSON (copia de seguridad local) ---
function prepararExportImport() {
    document.getElementById('btn-exportar').addEventListener('click', async () => {
        try {
            const datos  = await HortelanoDB.exportarTodo();
            const blob   = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
            const url    = URL.createObjectURL(blob);
            const enlace = document.createElement('a');
            enlace.href     = url;
            enlace.download = `Backup_Hortelano_${new Date().toLocaleDateString('es-ES').replace(/\//g, '-')}.json`;
            enlace.click();
            URL.revokeObjectURL(url);
            mostrarToast(`✅ Copia exportada: ${datos.higiene.length} registros higiene, ${datos.trazabilidad.length} trazabilidad.`);
        } catch (err) {
            mostrarToast(`Error al exportar: ${err.message}`, 'error');
        }
    });

    document.getElementById('input-importar').addEventListener('change', async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;

        const confirmado = await confirmar(`¿Importar datos desde "${archivo.name}"? Los registros existentes con el mismo ID se actualizarán.`);
        if (!confirmado) { e.target.value = ''; return; }

        try {
            const texto   = await archivo.text();
            const json    = JSON.parse(texto);
            const result  = await HortelanoDB.importarDesdeJSON(json);
            mostrarToast(`✅ Importados: ${result.higiene} registros higiene, ${result.trazabilidad} trazabilidad.`);
            inicializarGraficas();
            verificarRegistroHoy();
        } catch (err) {
            mostrarToast(`Error al importar: ${err.message}. ¿Es un archivo de backup válido?`, 'error');
        } finally {
            e.target.value = '';
        }
    });
}

// --- NAVEGACIÓN TÁCTICA ---
function inicializarNavegacion() {
    const btnH = document.getElementById('tab-higiene');
    const btnT = document.getElementById('tab-trazabilidad');
    const vH   = document.getElementById('vista-higiene');
    const vT   = document.getElementById('vista-trazabilidad');
    if (!btnH || !btnT) return;

    btnH.addEventListener('click', () => {
        btnH.classList.add('activo'); btnT.classList.remove('activo');
        vH.classList.remove('oculto'); vT.classList.add('oculto');
        setTimeout(() => { if (chartTemp) chartTemp.resize(); if (chartCloro) chartCloro.resize(); if (chartVeh) chartVeh.resize(); }, 10);
    });

    btnT.addEventListener('click', () => {
        btnT.classList.add('activo'); btnH.classList.remove('activo');
        vT.classList.remove('oculto'); vH.classList.add('oculto');
    });
}
