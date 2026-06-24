// ==========================================================================
// CONFIGURACIÓN Y CONSTANTES VITALES
// ==========================================================================
const SUPABASE_URL = 'https://sesrmzxwpgxobfrmuaix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWQLt7yJm0bw406beocZAQ_-t28acp3';
const EMAIL_OFICIAL = 'alimentoselhortelano@gmail.com';
const CAMPOS_MEMORIA = ['lote-vinagre', 'lote-sal', 'lote-ajo', 'lote-aceite', 'lote-limon', 'lote-pimiento', 'lote-envase', 'cliente-destino'];

let tokenSeguridad = localStorage.getItem('llave_hortelano');

// ==========================================================================
// SISTEMA DE NOTIFICACIONES (TOASTS — reemplaza alert())
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
// MODAL DE CONFIRMACIÓN (reemplaza confirm())
// ==========================================================================
function confirmar(mensaje) {
    return new Promise(resolve => {
        const modal = document.getElementById('modal-confirmacion');
        document.getElementById('modal-mensaje').textContent = mensaje;
        modal.classList.remove('oculto');

        const btnSi = document.getElementById('modal-confirmar-si');
        const btnNo = document.getElementById('modal-confirmar-no');

        const resolver = (resultado) => {
            modal.classList.add('oculto');
            resolve(resultado);
        };

        btnSi.onclick = () => resolver(true);
        btnNo.onclick = () => resolver(false);
    });
}

// ==========================================================================
// CONTROL DE ACCESO (BÓVEDA)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    if (tokenSeguridad) desbloquearPanel();
});

document.getElementById('btn-login').addEventListener('click', async () => {
    const pin = document.getElementById('login-pin').value;
    const btn = document.getElementById('btn-login');
    const errorMsg = document.getElementById('login-error');

    if (!pin) return;

    btn.textContent = "VERIFICANDO PIN...";
    errorMsg.classList.add('oculto');

    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: EMAIL_OFICIAL, password: pin })
        });
        const data = await res.json();
        if (!res.ok || !data.access_token) throw new Error("Credenciales rechazadas. PIN Incorrecto.");
        tokenSeguridad = data.access_token;
        localStorage.setItem('llave_hortelano', tokenSeguridad);
        desbloquearPanel();
    } catch (err) {
        errorMsg.textContent = err.message;
        errorMsg.classList.remove('oculto');
        btn.textContent = "DESBLOQUEAR";
    }
});

function desbloquearPanel() {
    document.getElementById('pantalla-login').classList.add('oculto');
    arrancarOperaciones();
}

function forzarReidentificacion() {
    localStorage.removeItem('llave_hortelano');
    mostrarToast("⚠️ Credencial caducada. Se requiere reidentificación.", 'advertencia');
    setTimeout(() => window.location.reload(), 2500);
}

// ==========================================================================
// VALIDACIÓN DE RANGOS LEGALES (APPCC)
// ==========================================================================
const RANGOS = {
    'cloro':               { min: 0.2,       max: 1.0, label: 'Cloro Libre',    unidad: 'ppm' },
    'ph':                  { min: 6.5,       max: 8.5, label: 'pH',             unidad: '' },
    'temperatura-cam1':    { min: -Infinity, max: 4.0, label: 'Temp. Cámara 1', unidad: 'ºC' },
    'temperatura-vehiculo':{ min: -Infinity, max: 4.0, label: 'Temp. Vehículo', unidad: 'ºC' }
};

function validarRangos() {
    const alertas = [];
    for (const [id, rango] of Object.entries(RANGOS)) {
        const input = document.getElementById(id);
        const val = parseFloat(input.value);
        const fueraDeRango = !isNaN(val) && (val < rango.min || val > rango.max);
        input.classList.toggle('rango-alerta', fueraDeRango);
        if (fueraDeRango) {
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
            const val = parseFloat(input.value);
            const fueraDeRango = !isNaN(val) && (val < rango.min || val > rango.max);
            input.classList.toggle('rango-alerta', fueraDeRango);
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
    inicializarNavegacion();
    verificarRegistroHoy();
}

function activarReloj() {
    const visorReloj = document.getElementById('reloj');
    setInterval(() => { visorReloj.textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);
}

function inicializarFechasManuales() {
    const hoy = new Date().toISOString().split('T')[0];
    const h = document.getElementById('fecha-higiene');
    const t = document.getElementById('fecha-trazabilidad');
    if (h) h.value = hoy;
    if (t) t.value = hoy;
}

function inicializarFechasPDF() {
    const hoy = new Date().toISOString().split('T')[0];
    const hace30 = new Date();
    hace30.setDate(hace30.getDate() - 30);
    const desde = hace30.toISOString().split('T')[0];
    document.getElementById('pdf-desde').value = desde;
    document.getElementById('pdf-hasta').value = hoy;
}

function recuperarMemoriaOperativa() {
    CAMPOS_MEMORIA.forEach(id => {
        const v = localStorage.getItem(id);
        if (v) document.getElementById(id).value = v;
    });
}

// --- BADGE: HOY YA REGISTRADO ---
async function verificarRegistroHoy() {
    const badge = document.getElementById('badge-registro-hoy');
    if (!badge) return;
    const hoy = new Date().toISOString().split('T')[0];
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/registro_higiene?select=id&fecha_hora=gte.${hoy}T00:00:00Z&fecha_hora=lte.${hoy}T23:59:59Z&limit=1`,
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` } }
        );
        if (!res.ok) return;
        const datos = await res.json();
        if (datos.length > 0) {
            badge.textContent = '✅ Control de higiene registrado hoy';
            badge.className = 'badge-hoy badge-hoy-ok';
        } else {
            badge.textContent = '⚠️ Control de higiene pendiente hoy';
            badge.className = 'badge-hoy badge-hoy-pendiente';
        }
        badge.classList.remove('oculto');
    } catch (e) {
        console.error('Error verificando registro hoy:', e);
    }
}

// --- DICTADO POR VOZ (instancia única, sin solapamiento) ---
function inicializarDictadoPorVoz() {
    const R = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!R) {
        console.warn("Asistencia vocal no compatible con este dispositivo.");
        document.querySelectorAll('.btn-micro').forEach(b => b.style.display = 'none');
        return;
    }

    const limpiarTextoVoz = (texto) => {
        let limpio = texto.toUpperCase().replace(/\b(EL|LA|DE|DEL|LETRA|NÚMERO|NUMERO|LOTE|RAYA|ESPACIO)\b/g, '');
        const conversiones = {
            "ÉLE":"L","ELE":"L","GUION":"-","GUIÓN":"-","MENOS":"-",
            "BARRA":"/","PARTIDO":"/","PUNTO":".",
            "CERO":"0","UNO":"1","DOS":"2","TRES":"3","CUATRO":"4",
            "CINCO":"5","SEIS":"6","SIETE":"7","OCHO":"8","NUEVE":"9"
        };
        for (const [palabra, simbolo] of Object.entries(conversiones)) {
            limpio = limpio.replace(new RegExp(`\\b${palabra}\\b`, 'g'), simbolo);
        }
        return limpio.replace(/[^A-Z0-9\-\/\.\s]/g, '').trim();
    };

    let recoActivo = null;

    document.querySelectorAll('.btn-micro').forEach(boton => {
        boton.addEventListener('click', function () {
            if (recoActivo) {
                recoActivo.abort();
                recoActivo = null;
                return;
            }
            const idDestino = this.getAttribute('data-dictado-target');
            const inputDestino = document.getElementById(idDestino);
            const botonActual = this;

            const reco = new R();
            reco.lang = 'es-ES';
            recoActivo = reco;

            reco.onstart = () => {
                inputDestino.style.backgroundColor = "#fff3cd";
                botonActual.classList.add('grabando');
            };
            reco.onresult = (e) => {
                inputDestino.value = limpiarTextoVoz(e.results[0][0].transcript);
            };
            reco.onend = () => {
                inputDestino.style.backgroundColor = "#fff";
                botonActual.classList.remove('grabando');
                recoActivo = null;
            };

            reco.start();
        });
    });
}

// --- FIRMA BIOMÉTRICA RESPONSIVE (escala con la pantalla) ---
function inicializarCristalFirma() {
    const canvas = document.getElementById('lienzo-firma');
    const ctx = canvas.getContext('2d');
    let dibujando = false;
    let limitesLienzo = null;

    window.estadoFirma = { estaDibujado: false };

    // Las coordenadas se escalan internamente: CSS width puede diferir de canvas.width
    const coord = (ev, rect) => ({
        x: (ev.clientX - rect.left) * (canvas.width / rect.width),
        y: (ev.clientY - rect.top)  * (canvas.height / rect.height)
    });

    const iniciarTrazo = (e) => {
        dibujando = true;
        window.estadoFirma.estaDibujado = true;
        limitesLienzo = canvas.getBoundingClientRect();
        ctx.beginPath();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#000";
        const ev = e.touches ? e.touches[0] : e;
        const { x, y } = coord(ev, limitesLienzo);
        ctx.moveTo(x, y);
        e.preventDefault();
    };

    const continuarTrazo = (e) => {
        if (!dibujando || !limitesLienzo) return;
        const ev = e.touches ? e.touches[0] : e;
        const { x, y } = coord(ev, limitesLienzo);
        ctx.lineTo(x, y);
        ctx.stroke();
        e.preventDefault();
    };

    const detenerTrazo = () => { dibujando = false; };

    canvas.addEventListener('mousedown', iniciarTrazo);
    canvas.addEventListener('mousemove', continuarTrazo);
    canvas.addEventListener('mouseup', detenerTrazo);
    canvas.addEventListener('mouseout', detenerTrazo);
    canvas.addEventListener('touchstart', iniciarTrazo);
    canvas.addEventListener('touchmove', continuarTrazo);
    canvas.addEventListener('touchend', detenerTrazo);

    document.getElementById('btn-limpiar-firma').addEventListener('click', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.estadoFirma.estaDibujado = false;
    });
}

// --- GRÁFICAS CON LÍNEAS DE REFERENCIA ---
let chartTemp = null, chartCloro = null, chartVeh = null;

function lineaRef(label, valor, n, color) {
    return {
        label,
        data: Array(n).fill(valor),
        borderColor: color,
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false
    };
}

async function inicializarGraficas() {
    try {
        const res = await fetch(
            `${SUPABASE_URL}/rest/v1/registro_higiene?select=fecha_hora,temperatura,temperatura_vehiculo,cloro&order=fecha_hora.desc&limit=15`,
            { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` } }
        );
        if (res.status === 401) return forzarReidentificacion();
        if (!res.ok) throw new Error("Fallo en la extracción de datos visuales.");

        const datos = await res.json();
        datos.reverse();
        const n = datos.length;
        const etiquetas = datos.map(x => new Date(x.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));

        if (chartTemp)  chartTemp.destroy();
        if (chartCloro) chartCloro.destroy();
        if (chartVeh)   chartVeh.destroy();

        const opts = (yMin, yMax) => ({
            responsive: true,
            plugins: { legend: { labels: { boxWidth: 10, font: { size: 9 } } } },
            scales: { y: { suggestedMin: yMin, suggestedMax: yMax } }
        });

        chartTemp = new Chart(document.getElementById('grafica-temperatura').getContext('2d'), {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: [
                    { label: 'ºC Cámara 1', data: datos.map(x => x.temperatura), borderColor: '#2980b9', tension: 0.3, fill: false },
                    lineaRef('Límite 4ºC', 4, n, 'rgba(192,57,43,0.65)')
                ]
            },
            options: opts(0, 8)
        });

        chartCloro = new Chart(document.getElementById('grafica-cloro').getContext('2d'), {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: [
                    { label: 'Cloro (ppm)', data: datos.map(x => x.cloro), borderColor: '#27ae60', tension: 0.3, fill: false },
                    lineaRef('Mín 0.2', 0.2, n, 'rgba(243,156,18,0.75)'),
                    lineaRef('Máx 1.0', 1.0, n, 'rgba(192,57,43,0.65)')
                ]
            },
            options: opts(0, 1.5)
        });

        chartVeh = new Chart(document.getElementById('grafica-vehiculo').getContext('2d'), {
            type: 'line',
            data: {
                labels: etiquetas,
                datasets: [
                    { label: 'ºC Vehículo', data: datos.map(x => x.temperatura_vehiculo), borderColor: '#8e44ad', tension: 0.3, fill: false },
                    lineaRef('Límite 4ºC', 4, n, 'rgba(192,57,43,0.65)')
                ]
            },
            options: opts(0, 8)
        });

    } catch (e) {
        console.error("Anomalía en gráficas:", e);
    }
}

// --- FORMULARIO HIGIENE ---
function prepararFormularios() {
    document.getElementById('formulario-higiene').addEventListener('submit', async (e) => {
        e.preventDefault();

        const orgBtn  = document.querySelector('input[name="organoleptico"]:checked');
        const mantBtn = document.querySelector('input[name="mantenimiento"]:checked');
        const plagBtn = document.querySelector('input[name="plagas"]:checked');

        if (!orgBtn)  return mostrarToast("Selecciona el resultado del examen organoléptico.", 'error');
        if (!mantBtn) return mostrarToast("Selecciona el estado de mantenimiento.", 'error');
        if (!plagBtn) return mostrarToast("Confirma el control de plagas.", 'error');

        const alertasRango = validarRangos();
        let msgConfirm = '¿Confirmar y registrar el Plan de Higiene?';
        if (alertasRango.length > 0) {
            msgConfirm = `⚠️ Valores fuera de rango legal:\n${alertasRango.join('\n')}\n\n¿Registrar de todos modos?`;
        }
        const confirmado = await confirmar(msgConfirm);
        if (!confirmado) return;

        const zonas = Array.from(document.querySelectorAll('.cuadricula-limpieza input[type="checkbox"]:checked'))
            .map(cb => cb.value).join(', ');

        const fechaManual = document.getElementById('fecha-higiene').value;
        const [y, m, d] = fechaManual.split('-').map(Number);
        const ahora = new Date();
        const fechaConHora = new Date(y, m - 1, d, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());

        const cuerpo = {
            fecha_hora: fechaConHora.toISOString(),
            cloro: parseFloat(document.getElementById('cloro').value),
            ph: parseFloat(document.getElementById('ph').value),
            organoleptico: orgBtn.value,
            temperatura: parseFloat(document.getElementById('temperatura-cam1').value),
            temperatura_vehiculo: parseFloat(document.getElementById('temperatura-vehiculo').value),
            zonas_limpieza: zonas,
            plagas: plagBtn.value,
            estado_mantenimiento: mantBtn.value,
            observaciones: document.getElementById('observaciones').value,
            firma: "Manual"
        };

        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo)
            });
            if (r.status === 401) return forzarReidentificacion();
            if (!r.ok) throw new Error("El servidor rechazó los datos de higiene.");
            mostrarToast('✅ Plan de Higiene registrado correctamente.');
            inicializarGraficas();
            verificarRegistroHoy();
            e.target.reset();
            inicializarFechasManuales();
        } catch (err) {
            mostrarToast(`Error en el envío: ${err.message}`, 'error');
        }
    });

    document.getElementById('formulario-trazabilidad').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!window.estadoFirma?.estaDibujado) {
            return mostrarToast("La firma biométrica es obligatoria. Sella el documento.", 'error');
        }

        const confirmado = await confirmar('¿Confirmar y sellar el lote de producción?');
        if (!confirmado) return;

        CAMPOS_MEMORIA.forEach(id => {
            const el = document.getElementById(id);
            if (el) localStorage.setItem(id, el.value);
        });

        const fechaManual = document.getElementById('fecha-trazabilidad').value;
        const [y, m, d] = fechaManual.split('-').map(Number);
        const ahora = new Date();
        const fechaConHora = new Date(y, m - 1, d, ahora.getHours(), ahora.getMinutes(), ahora.getSeconds());

        const lienzo = document.getElementById('lienzo-firma');
        const cuerpo = {
            fecha_hora: fechaConHora.toISOString(),
            lote_tomate:          document.getElementById('lote-tomate').value,
            lote_vinagre:         document.getElementById('lote-vinagre').value,
            lote_sal:             document.getElementById('lote-sal').value,
            lote_ajo:             document.getElementById('lote-ajo').value,
            lote_aceite:          document.getElementById('lote-aceite').value,
            lote_limon:           document.getElementById('lote-limon').value,
            lote_pimiento:        document.getElementById('lote-pimiento').value,
            lote_envases:         document.getElementById('lote-envase').value,
            litros:               parseFloat(document.getElementById('litros-prod').value) || 0,
            kg_salmorejo:         parseFloat(document.getElementById('kg-salmorejo').value) || 0,
            lote_gazpacho_salida: document.getElementById('lote-salida').value,
            cliente_destino:      document.getElementById('cliente-destino').value,
            firma:                lienzo.toDataURL()
        };

        try {
            const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(cuerpo)
            });
            if (r.status === 401) return forzarReidentificacion();
            if (!r.ok) throw new Error("El servidor rechazó los datos de trazabilidad.");
            mostrarToast('✅ Lote sellado y documentado.');
            document.getElementById('btn-limpiar-firma').click();
            document.getElementById('litros-prod').value = 0;
            document.getElementById('kg-salmorejo').value = 0;
            inicializarFechasManuales();
        } catch (err) {
            mostrarToast(`Error en el envío: ${err.message}`, 'error');
        }
    });
}

// --- GENERADOR PDF CON RANGO DE FECHAS Y ANCHOS DINÁMICOS ---
function prepararGeneradorPDF() {
    document.getElementById('btn-imprimir-traza').addEventListener('click', async () => {
        const btn = document.getElementById('btn-imprimir-traza');
        const textoOriginal = btn.textContent;
        btn.textContent = "⏳ GENERANDO INFORME...";
        btn.disabled = true;

        try {
            const desde = document.getElementById('pdf-desde').value;
            const hasta = document.getElementById('pdf-hasta').value;
            const hdrs  = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` };

            let urlH = `${SUPABASE_URL}/rest/v1/registro_higiene?select=*&order=fecha_hora.asc`;
            let urlT = `${SUPABASE_URL}/rest/v1/registro_trazabilidad?select=*&order=fecha_hora.asc`;
            if (desde) { urlH += `&fecha_hora=gte.${desde}T00:00:00Z`; urlT += `&fecha_hora=gte.${desde}T00:00:00Z`; }
            if (hasta)  { urlH += `&fecha_hora=lte.${hasta}T23:59:59Z`;  urlT += `&fecha_hora=lte.${hasta}T23:59:59Z`; }

            const [rh, rt] = await Promise.all([fetch(urlH, { headers: hdrs }), fetch(urlT, { headers: hdrs })]);
            if (rh.status === 401 || rt.status === 401) return forzarReidentificacion();
            if (!rh.ok || !rt.ok) throw new Error("Error al acceder a los registros.");

            const h = await rh.json();
            const t = await rt.json();

            const { jsPDF } = window.jspdf;
            // A4 landscape: 297×210mm — margen 8mm → 281mm útiles
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const PW  = doc.internal.pageSize.getWidth();   // 297
            const PH  = doc.internal.pageSize.getHeight();  // 210
            const ML  = 8;  // margen izquierdo
            const rangoTexto = (desde && hasta) ? `  ${desde} — ${hasta}` : '';

            const cabeceraDoc = (titulo) => {
                doc.setFontSize(10);
                doc.setFont(undefined, 'bold');
                doc.text(titulo + rangoTexto, ML, 12);
                doc.setFont(undefined, 'normal');
            };

            const numerarPagina = () => {
                const n = doc.internal.getCurrentPageInfo().pageNumber;
                doc.setFontSize(7);
                doc.setTextColor(140);
                doc.text(`El Hortelano — Informe APPCC | Pág. ${n}`, PW / 2, PH - 5, { align: 'center' });
                doc.setTextColor(0);
            };

            // ─────────────────────────────────────────────
            // PÁGINA 1: HIGIENE Y MANTENIMIENTO
            // Anchos (mm): 18+13+12+13+13+18+24+15+80+75 = 281
            // ─────────────────────────────────────────────
            cabeceraDoc('REGISTRO DE HIGIENE Y MANTENIMIENTO — EL HORTELANO');

            doc.autoTable({
                startY: 16,
                margin: { left: ML, right: ML },
                head: [['Fecha', 'Cloro\n(ppm)', 'pH', 'ºC\nCám.1', 'ºC\nVeh.', 'Org.', 'Plagas', 'Mant.', 'Zonas de Limpieza Ejecutadas', 'Observaciones / Incidencias']],
                body: h.map(x => [
                    new Date(x.fecha_hora).toLocaleDateString('es-ES'),
                    x.cloro   ?? '-',
                    x.ph      ?? '-',
                    x.temperatura         ?? '-',
                    x.temperatura_vehiculo ?? '-',
                    x.organoleptico        || '-',
                    x.plagas               || '-',
                    x.estado_mantenimiento || '-',
                    x.zonas_limpieza       || '-',
                    x.observaciones        || ''
                ]),
                theme: 'grid',
                styles:     { fontSize: 6, halign: 'center', cellPadding: 1, overflow: 'linebreak', minCellHeight: 6 },
                headStyles: { fillColor: [44, 62, 80], fontSize: 6, halign: 'center', cellPadding: 1.5, fontStyle: 'bold' },
                columnStyles: {
                    0:  { cellWidth: 18 },
                    1:  { cellWidth: 13 },
                    2:  { cellWidth: 12 },
                    3:  { cellWidth: 13 },
                    4:  { cellWidth: 13 },
                    5:  { cellWidth: 18 },
                    6:  { cellWidth: 24 },
                    7:  { cellWidth: 15 },
                    8:  { cellWidth: 80, halign: 'left' },
                    9:  { cellWidth: 75, halign: 'left' }
                },
                // Marca en rojo valores fuera de rango APPCC
                didParseCell: (data) => {
                    if (data.section !== 'body') return;
                    const v = parseFloat(data.cell.raw);
                    const alertar = (condicion) => {
                        if (condicion) {
                            data.cell.styles.fillColor = [255, 210, 210];
                            data.cell.styles.textColor = [160, 0, 0];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    };
                    if (data.column.index === 1) alertar(!isNaN(v) && (v < 0.2 || v > 1.0));
                    if (data.column.index === 2) alertar(!isNaN(v) && (v < 6.5 || v > 8.5));
                    if (data.column.index === 3) alertar(!isNaN(v) && v > 4);
                    if (data.column.index === 4) alertar(!isNaN(v) && v > 4);
                },
                didDrawPage: numerarPagina
            });

            // ─────────────────────────────────────────────
            // PÁGINA 2: TRAZABILIDAD DE PRODUCCIÓN
            // Anchos (mm): 16+18+18+16+16+18+16+18+18+14+14+28+45+24 = 279 (~281)
            // ─────────────────────────────────────────────
            doc.addPage();
            cabeceraDoc('REGISTRO DE TRAZABILIDAD DE PRODUCCIÓN — EL HORTELANO');

            doc.autoTable({
                startY: 16,
                margin: { left: ML, right: ML },
                head: [['Fecha', 'Tomate', 'Vinagre', 'Sal', 'Ajo', 'Aceite', 'Limón', 'Pimiento', 'Envases', 'L.Gaz\n(L)', 'Kg.Sal\n(Kg)', 'Lote Salida', 'Cliente / Destino', 'Firma']],
                body: t.map(x => [
                    new Date(x.fecha_hora).toLocaleDateString('es-ES'),
                    x.lote_tomate   || '-',
                    x.lote_vinagre  || '-',
                    x.lote_sal      || '-',
                    x.lote_ajo      || '-',
                    x.lote_aceite   || '-',
                    x.lote_limon    || '-',
                    x.lote_pimiento || '-',
                    x.lote_envases  || '-',
                    x.litros        ?? '0',
                    x.kg_salmorejo  ?? '0',
                    x.lote_gazpacho_salida || '-',
                    x.cliente_destino      || '-',
                    ''
                ]),
                theme: 'grid',
                styles:     { fontSize: 5.5, halign: 'center', cellPadding: 1, overflow: 'linebreak', minCellHeight: 8 },
                headStyles: { fillColor: [39, 174, 96], fontSize: 5.5, halign: 'center', cellPadding: 1.5, fontStyle: 'bold' },
                columnStyles: {
                    0:  { cellWidth: 16 },
                    1:  { cellWidth: 18 },
                    2:  { cellWidth: 18 },
                    3:  { cellWidth: 16 },
                    4:  { cellWidth: 16 },
                    5:  { cellWidth: 18 },
                    6:  { cellWidth: 16 },
                    7:  { cellWidth: 18 },
                    8:  { cellWidth: 18 },
                    9:  { cellWidth: 14 },
                    10: { cellWidth: 14 },
                    11: { cellWidth: 28 },
                    12: { cellWidth: 45, halign: 'left' },
                    13: { cellWidth: 24 }
                },
                didDrawCell: (data) => {
                    if (data.column.index === 13 && data.section === 'body') {
                        const firmaData = t[data.row.index]?.firma;
                        if (firmaData?.startsWith('data:image')) {
                            // Centra la imagen en la celda de firma (22×9mm)
                            const ix = data.cell.x + 1;
                            const iy = data.cell.y + (data.cell.height - 9) / 2;
                            doc.addImage(firmaData, 'PNG', ix, iy, 22, 9);
                        }
                    }
                },
                didDrawPage: numerarPagina
            });

            const etFecha = new Date().toLocaleDateString('es-ES').replace(/\//g, '-');
            doc.save(`Informe_ElHortelano_${etFecha}.pdf`);
            mostrarToast(`✅ Informe generado: ${h.length} registros higiene, ${t.length} trazabilidad.`);

        } catch (err) {
            console.error(err);
            mostrarToast(`Error al generar el informe: ${err.message}`, 'error');
        } finally {
            btn.textContent = textoOriginal;
            btn.disabled = false;
        }
    });
}

// --- NAVEGACIÓN TÁCTICA ---
function inicializarNavegacion() {
    const btnH = document.getElementById('tab-higiene');
    const btnT = document.getElementById('tab-trazabilidad');
    const vH   = document.getElementById('vista-higiene');
    const vT   = document.getElementById('vista-trazabilidad');
    if (!btnH || !btnT || !vH || !vT) return;

    btnH.addEventListener('click', () => {
        btnH.classList.add('activo'); btnT.classList.remove('activo');
        vH.classList.remove('oculto'); vT.classList.add('oculto');
        setTimeout(() => {
            if (chartTemp)  chartTemp.resize();
            if (chartCloro) chartCloro.resize();
            if (chartVeh)   chartVeh.resize();
        }, 10);
    });

    btnT.addEventListener('click', () => {
        btnT.classList.add('activo'); btnH.classList.remove('activo');
        vT.classList.remove('oculto'); vH.classList.add('oculto');
    });
}
