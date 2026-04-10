const SUPABASE_URL = 'https://sesrmzxwpgxobfrmuaix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWQLt7yJm0bw406beocZAQ_-t28acp3';
let tokenSeguridad = null; 

// --- 0. EL CADENERO DE LA PUERTA (BÓVEDA DE TITANIO) ---
document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;
    const btn = document.getElementById('btn-login');
    const errorMsg = document.getElementById('login-error');
    
    btn.textContent = "VERIFICANDO...";
    errorMsg.style.display = 'none';

    try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();
        
        if (res.ok && data.access_token) {
            tokenSeguridad = data.access_token; 
            document.getElementById('pantalla-login').style.display = 'none'; 
            iniciarMaquinaria(); 
        } else {
            // Extraemos el veneno exacto que escupe Supabase
            const motivo = data.error_description || data.msg || "Credenciales inválidas";
            throw new Error(motivo);
        }
    } catch (err) {
        console.error("Fallo de acceso:", err);
        errorMsg.textContent = "ERROR: " + err.message;
        errorMsg.style.display = 'block';
        btn.textContent = "DESBLOQUEAR SISTEMA";
    }
});

// --- MAQUINARIA PESADA (ENVUELTA EN ZONA SEGURA) ---
function iniciarMaquinaria() {

    // --- 1. PURIFICADOR DE VOZ ---
    function limpiarTextoVoz(textoBruto) {
        let texto = textoBruto.toUpperCase().replace(/\b(EL|LA|DE|DEL|LETRA|NÚMERO|NUMERO|LOTE|RAYA|ESPACIO)\b/g, '');
        const correcciones = { "ÉLE":"L", "ELE":"L", "GUION":"-", "GUIÓN":"-", "MENOS":"-", "BARRA":"/", "PARTIDO":"/", "PUNTO":".", "CERO":"0", "UNO":"1", "DOS":"2", "TRES":"3", "CUATRO":"4", "CINCO":"5", "SEIS":"6", "SIETE":"7", "OCHO":"8", "NUEVE":"9" };
        for (const [palabra, simbolo] of Object.entries(correcciones)) texto = texto.replace(new RegExp(`\\b${palabra}\\b`, 'g'), simbolo);
        return texto.replace(/\s+/g, '').replace(/[^A-Z0-9\-\/\.]/g, '');
    }

    window.dictarLote = function(idField) {
        const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Reconocimiento) return alert("Navegador no compatible con voz.");
        const reco = new Reconocimiento(); reco.lang = 'es-ES';
        reco.onstart = () => { document.getElementById(idField).style.backgroundColor = "#fff3cd"; };
        reco.onresult = (e) => { document.getElementById(idField).value = limpiarTextoVoz(e.results[0][0].transcript); };
        reco.onend = () => { document.getElementById(idField).style.backgroundColor = "#fff"; };
        reco.start();
    };

    // --- 2. GESTIÓN DE LA FIRMA TÁCTIL ---
    const canvas = document.getElementById('lienzo-firma');
    const ctx = canvas.getContext('2d');
    let dibujando = false;
    let lienzoEstaDibujado = false; 

    const iniciarTrazado = (e) => {
        dibujando = true; ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = "#000000"; ctx.lineCap = "round";
        const r = canvas.getBoundingClientRect(); const ev = e.touches ? e.touches[0] : e;
        ctx.moveTo(ev.clientX - r.left, ev.clientY - r.top);
        lienzoEstaDibujado = true; e.preventDefault();
    };
    const dibujar = (e) => {
        if (!dibujando) return;
        const r = canvas.getBoundingClientRect(); const ev = e.touches ? e.touches[0] : e;
        ctx.lineTo(ev.clientX - r.left, ev.clientY - r.top); ctx.stroke(); e.preventDefault();
    };
    const detenerTrazado = () => { dibujando = false; };

    canvas.addEventListener('mousedown', iniciarTrazado); canvas.addEventListener('mousemove', dibujar); canvas.addEventListener('mouseup', detenerTrazado);
    canvas.addEventListener('touchstart', iniciarTrazado); canvas.addEventListener('touchmove', dibujar); canvas.addEventListener('touchend', detenerTrazado);
    document.getElementById('btn-limpiar-firma').addEventListener('click', () => { ctx.clearRect(0,0,canvas.width,canvas.height); lienzoEstaDibujado = false; });

    // --- 3. MEMORIA DE MATERIA PRIMA ---
    const camposAtrasar = ['lote-vinagre', 'lote-sal', 'lote-ajo', 'lote-aceite', 'lote-limon', 'lote-pimiento', 'lote-envase'];
    function guardarMemoria() { camposAtrasar.forEach(id => { if(document.getElementById(id).value) localStorage.setItem(id, document.getElementById(id).value); }); }
    function cargarMemoria() { camposAtrasar.forEach(id => { if(localStorage.getItem(id)) document.getElementById(id).value = localStorage.getItem(id); }); }

    // --- 4. MOTOR PRINCIPAL ---
    cargarMemoria();
    setInterval(() => { document.getElementById('reloj').textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);

    // DOBLE GRÁFICA (FRÍO Y CLORO)
    let chartTemp = null;
    let chartCloro = null;

    async function cargarGraficas() {
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=fecha_hora,temperatura,cloro&order=fecha_hora.desc&limit=15`, { 
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` }
            });
            const datosHigiene = await res.json(); datosHigiene.reverse();
            const etiquetasFechas = datosHigiene.map(d => new Date(d.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));

            // Destruimos gráficas antiguas si existen para evitar errores visuales
            if (chartTemp) chartTemp.destroy();
            if (chartCloro) chartCloro.destroy();

            const ctxTemp = document.getElementById('grafica-temperatura').getContext('2d');
            chartTemp = new Chart(ctxTemp, { type: 'line', data: { labels: etiquetasFechas, datasets: [{ label: 'ºC Cámara', data: datosHigiene.map(d => d.temperatura), borderColor: '#2980b9', tension: 0.3, fill: false }] }, options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { suggestedMin: 0, suggestedMax: 10 } } } });

            const ctxCloro = document.getElementById('grafica-cloro').getContext('2d');
            chartCloro = new Chart(ctxCloro, { type: 'line', data: { labels: etiquetasFechas, datasets: [{ label: 'Cloro (mg/L)', data: datosHigiene.map(d => d.cloro), borderColor: '#27ae60', tension: 0.3, fill: false }] }, options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { suggestedMin: 0, suggestedMax: 3 } } } });
        } catch(e) { console.log("Error cargando visuales protegidos."); }
    }
    cargarGraficas();

    // HIGIENE (CORREGIDO: Sin recarga de página suicida)
    document.getElementById('formulario-higiene').addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = { cloro: parseFloat(document.getElementById('cloro').value), organoleptico: document.querySelector('input[name="organoleptico"]:checked').value, temperatura: parseFloat(document.getElementById('temperatura').value), firma: "Manual" };
        
        const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}`, 'Content-Type': 'application/json' }, 
            body: JSON.stringify(d) 
        });
        
        if (r.ok) { 
            alert('✅ Higiene sellada.'); 
            document.getElementById('formulario-higiene').reset(); 
            cargarGraficas(); // Actualizamos las gráficas sin pestañear
        } else { alert('❌ Error: El servidor ha rechazado los datos.'); }
    });

    // TRAZABILIDAD
    document.getElementById('formulario-trazabilidad').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!lienzoEstaDibujado) { alert('❌ Operación cancelada. El responsable DEBE FIRMAR.'); return; }
        
        guardarMemoria();
        const firmaBase64 = canvas.toDataURL('image/png'); 

        const d = {
            lote_tomate: document.getElementById('lote-tomate').value, lote_vinagre: document.getElementById('lote-vinagre').value, lote_sal: document.getElementById('lote-sal').value,
            lote_ajo: document.getElementById('lote-ajo').value, lote_aceite: document.getElementById('lote-aceite').value, lote_limon: document.getElementById('lote-limon').value,
            lote_pimiento: document.getElementById('lote-pimiento').value, lote_envases: document.getElementById('lote-envase').value, litros: parseFloat(document.getElementById('litros-prod').value),
            lote_gazpacho_salida: document.getElementById('lote-salida').value, firma: firmaBase64
        };
        
        const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad`, { 
            method: 'POST', 
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}`, 'Content-Type': 'application/json' }, 
            body: JSON.stringify(d) 
        });
        
        if (r.ok) { 
            alert('✅ Lote sellado y firma guardada.'); 
            document.getElementById('lote-tomate').value = ''; 
            document.getElementById('litros-prod').value = ''; 
            document.getElementById('lote-salida').value = ''; 
            ctx.clearRect(0,0,canvas.width,canvas.height); 
            lienzoEstaDibujado = false; 
        } else { alert('❌ Acceso denegado.'); }
    });

    // PDF FORENSE
    const btnImprimir = document.getElementById('btn-imprimir-traza');
    btnImprimir.addEventListener('click', async () => {
        btnImprimir.textContent = "⏳ GENERANDO...";
        try {
            const [resH, resT] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` }}),
                fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${tokenSeguridad}` }})
            ]);
            
            const higiene = await resH.json(); const traza = await resT.json();
            const mapaHigiene = {}; higiene.forEach(h => { mapaHigiene[new Date(h.fecha_hora).toLocaleDateString('es-ES')] = h; });

            const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape');
            doc.setFontSize(14); doc.text("REGISTRO UNIFICADO - EL HORTELANO", 14, 15);

            const filas = traza.map(t => {
                const f = new Date(t.fecha_hora).toLocaleDateString('es-ES'); const h = mapaHigiene[f] || {};
                return [f, h.cloro || '-', h.temperatura || '-', h.organoleptico || '-', t.lote_tomate, t.lote_vinagre, t.lote_sal, t.lote_ajo, t.lote_aceite, t.lote_limon, t.lote_pimiento, t.lote_envases, t.litros, t.lote_gazpacho_salida, ""];
            });

            doc.autoTable({
                startY: 28, head: [['Fecha', 'Cloro', 'ºC', 'Org.', 'Tom.', 'Vin.', 'Sal', 'Ajo', 'Ace.', 'Lim.', 'Pim.', 'Env.', 'Lit.', 'Sal.', 'Firma']], body: filas, theme: 'grid', styles: { fontSize: 7, halign: 'center' }, headStyles: { fillColor: [230, 230, 230], textColor: [0,0,0] },
                didDrawCell: (datosCell) => {
                    if (datosCell.column.index === 14 && datosCell.section === 'body') {
                        const t = traza[datosCell.row.index];
                        if (t.firma && t.firma.startsWith('data:image/png;base64,')) { doc.addImage(t.firma, 'PNG', datosCell.cell.x + 2, datosCell.cell.y + 1, 15, 6); }
                    }
                }
            });
            doc.save('Informe_Firmado_El_Hortelano.pdf');
        } catch (err) { alert('❌ Error en el reporte.'); }
        finally { btnImprimir.textContent = "🖨️ IMPRIMIR REGISTRO PDF"; }
    });
}
