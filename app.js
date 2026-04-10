const SUPABASE_URL = 'https://sesrmzxwpgxobfrmuaix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWQLt7yJm0bw406beocZAQ_-t28acp3';

// --- PURIFICADOR DE VOZ INDUSTRIAL (NIVEL EXTREMO) ---
function limpiarTextoVoz(textoBruto) {
    let texto = textoBruto.toUpperCase();
    const basura = /\b(EL|LA|DE|DEL|LETRA|NÚMERO|NUMERO|LOTE|RAYA|ESPACIO)\b/g;
    texto = texto.replace(basura, '');

    const correcciones = {
        "ÉLE": "L", "ELE": "L", "GUION": "-", "GUIÓN": "-", "MENOS": "-",
        "BARRA": "/", "PARTIDO": "/", "PUNTO": ".", "CERO": "0", "UNO": "1",
        "DOS": "2", "TRES": "3", "CUATRO": "4", "CINCO": "5", "SEIS": "6",
        "SIETE": "7", "OCHO": "8", "NUEVE": "9"
    };

    for (const [palabra, simbolo] of Object.entries(correcciones)) {
        const exp = new RegExp(`\\b${palabra}\\b`, 'g');
        texto = texto.replace(exp, simbolo);
    }

    texto = texto.replace(/\s+/g, '');
    texto = texto.replace(/[^A-Z0-9\-\/\.]/g, '');
    return texto;
}

function dictarLote(idCampo) {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) { alert("Micrófono denegado o navegador no compatible."); return; }
    
    const reco = new Reconocimiento();
    reco.lang = 'es-ES';
    
    reco.onstart = () => { document.getElementById(idCampo).style.backgroundColor = "#fff3cd"; };
    reco.onresult = (e) => {
        let escuchado = e.results[0][0].transcript;
        document.getElementById(idCampo).value = limpiarTextoVoz(escuchado);
    };
    reco.onerror = () => { document.getElementById(idCampo).style.backgroundColor = "#ffcccc"; };
    reco.onend = () => { document.getElementById(idCampo).style.backgroundColor = "#fff"; };
    
    reco.start();
}

// --- MEMORIA DE MATERIA PRIMA ---
const camposAtrasar = ['lote-vinagre', 'lote-sal', 'lote-ajo', 'lote-aceite', 'lote-limon', 'lote-pimiento', 'lote-envase'];
function guardarMemoria() { camposAtrasar.forEach(id => { const valor = document.getElementById(id).value; if(valor) localStorage.setItem(id, valor); }); }
function cargarMemoria() { camposAtrasar.forEach(id => { const guardado = localStorage.getItem(id); if (guardado) document.getElementById(id).value = guardado; }); }

// --- ARRANQUE GENERAL DEL SISTEMA ---
document.addEventListener('DOMContentLoaded', async () => {
    
    cargarMemoria();
    setInterval(() => { document.getElementById('reloj').textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);

    // 1. TRAZAR GRÁFICAS DE FRÍO Y CLORO
    try {
        // Pedimos temperatura Y cloro a la vez
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=fecha_hora,temperatura,cloro&order=fecha_hora.desc&limit=15`, { headers: { 'apikey': SUPABASE_ANON_KEY }});
        const datosHigiene = await res.json();
        datosHigiene.reverse(); 
        
        const etiquetasFechas = datosHigiene.map(d => new Date(d.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));

        // Gráfica de Temperatura (Azul)
        const ctxTemp = document.getElementById('grafica-temperatura').getContext('2d');
        new Chart(ctxTemp, {
            type: 'line',
            data: {
                labels: etiquetasFechas,
                datasets: [{ label: 'ºC Cámara', data: datosHigiene.map(d => d.temperatura), borderColor: '#2980b9', tension: 0.3, fill: false }]
            },
            options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { suggestedMin: 0, suggestedMax: 10 } } }
        });

        // Gráfica de Cloro (Verde)
        const ctxCloro = document.getElementById('grafica-cloro').getContext('2d');
        new Chart(ctxCloro, {
            type: 'line',
            data: {
                labels: etiquetasFechas,
                datasets: [{ label: 'Cloro (mg/L)', data: datosHigiene.map(d => d.cloro), borderColor: '#27ae60', tension: 0.3, fill: false }]
            },
            options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { suggestedMin: 0, suggestedMax: 3 } } }
        });

    } catch(e) { console.log("Datos de inspección no disponibles o insuficientes."); }

    // 2. ACTIVAR EL LIENZO DE RESPONSABILIDAD
    const canvas = document.getElementById('lienzo-firma');
    const ctx = canvas.getContext('2d');
    let dibujando = false;

    const iniciarTrazado = (e) => { 
        dibujando = true; ctx.beginPath(); 
        const rect = canvas.getBoundingClientRect();
        const ev = e.touches ? e.touches[0] : e;
        ctx.moveTo(ev.clientX - rect.left, ev.clientY - rect.top);
        e.preventDefault(); 
    };
    const dibujar = (e) => { 
        if (!dibujando) return;
        const rect = canvas.getBoundingClientRect();
        const ev = e.touches ? e.touches[0] : e;
        ctx.lineTo(ev.clientX - rect.left, ev.clientY - rect.top);
        ctx.stroke();
        e.preventDefault();
    };
    const detenerTrazado = () => { dibujando = false; };

    canvas.addEventListener('mousedown', iniciarTrazado); canvas.addEventListener('mousemove', dibujar); canvas.addEventListener('mouseup', detenerTrazado);
    canvas.addEventListener('touchstart', iniciarTrazado); canvas.addEventListener('touchmove', dibujar); canvas.addEventListener('touchend', detenerTrazado);
    document.getElementById('btn-limpiar-firma').addEventListener('click', () => { ctx.clearRect(0, 0, canvas.width, canvas.height); });

    // 3. REGISTROS A BASE DE DATOS
    document.getElementById('formulario-higiene').addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = { cloro: parseFloat(document.getElementById('cloro').value), organoleptico: document.querySelector('input[name="organoleptico"]:checked').value, temperatura: parseFloat(document.getElementById('temperatura').value), firma: "Manual" };
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) { alert('✅ Plan de Higiene sellado.'); document.getElementById('formulario-higiene').reset(); location.reload(); } 
            else throw new Error("Falla en transmisión.");
        } catch (err) { alert('❌ Error: El parte de higiene no ha llegado a la base de datos.'); }
    });

    document.getElementById('formulario-trazabilidad').addEventListener('submit', async (e) => {
        e.preventDefault();
        guardarMemoria();
        const datos = {
            lote_tomate: document.getElementById('lote-tomate').value, lote_vinagre: document.getElementById('lote-vinagre').value, lote_sal: document.getElementById('lote-sal').value,
            lote_ajo: document.getElementById('lote-ajo').value, lote_aceite: document.getElementById('lote-aceite').value, lote_limon: document.getElementById('lote-limon').value,
            lote_pimiento: document.getElementById('lote-pimiento').value, lote_envases: document.getElementById('lote-envase').value, litros: parseFloat(document.getElementById('litros-prod').value),
            lote_gazpacho_salida: document.getElementById('lote-salida').value, firma: "Biométrica"
        };
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(datos) });
            if (res.ok) { 
                alert('✅ Producción registrada.'); 
                document.getElementById('lote-tomate').value = ''; document.getElementById('litros-prod').value = ''; document.getElementById('lote-salida').value = ''; ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else throw new Error("Falla en transmisión.");
        } catch (err) { alert('❌ Error: El lote se ha perdido por falta de red.'); }
    });

    // 4. GENERADOR PDF UNIFICADO
    const btnImprimir = document.getElementById('btn-imprimir-traza');
    btnImprimir.addEventListener('click', async () => {
        btnImprimir.textContent = "⏳ CRUZANDO DATOS...";
        try {
            const [resH, resT] = await Promise.all([ fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }}), fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }}) ]);
            if (!resH.ok || !resT.ok) throw new Error("Acceso denegado.");
            const higiene = await resH.json(); const traza = await resT.json();
            const mapaHigiene = {}; higiene.forEach(h => { mapaHigiene[new Date(h.fecha_hora).toLocaleDateString('es-ES')] = h; });

            const { jsPDF } = window.jspdf; const doc = new jsPDF('landscape');
            doc.text("REGISTRO UNIFICADO - EL HORTELANO", 14, 15);

            const filas = traza.map(t => {
                const f = new Date(t.fecha_hora).toLocaleDateString('es-ES'); const h = mapaHigiene[f] || {};
                return [f, h.cloro || '-', h.temperatura || '-', h.organoleptico || '-', t.lote_tomate, t.lote_vinagre, t.lote_sal, t.lote_ajo, t.lote_aceite, t.lote_limon, t.lote_pimiento, t.lote_envases, t.litros, t.lote_gazpacho_salida];
            });

            doc.autoTable({ startY: 25, head: [['Fecha', 'Cloro', 'ºC', 'Org.', 'Tom.', 'Vin.', 'Sal', 'Ajo', 'Ace.', 'Lim.', 'Pim.', 'Env.', 'Lit.', 'Sal.']], body: filas, theme: 'grid', styles: { fontSize: 7, halign: 'center' }, headStyles: { fillColor: [230, 230, 230], textColor: [0,0,0] } });

            const firmaDatos = canvas.toDataURL('image/png');
            const posFirmaY = doc.lastAutoTable.finalY + 10;
            doc.text("Firma del Responsable:", 14, posFirmaY); doc.addImage(firmaDatos, 'PNG', 14, posFirmaY + 5, 50, 25);
            doc.save('Informe_Oficial_El_Hortelano.pdf');
        } catch (err) { alert('❌ Error crítico al compilar el documento.'); }
        finally { btnImprimir.textContent = "🖨️ IMPRIMIR REGISTRO PDF"; }
    });
});
