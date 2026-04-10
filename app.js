const SUPABASE_URL = 'https://sesrmzxwpgxobfrmuaix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWQLt7yJm0bw406beocZAQ_-t28acp3';

// --- 1. PURIFICADOR DE VOZ INDUSTRIAL (NIVEL EXTREMO) ---
function limpiarTextoVoz(textoBruto) {
    let texto = textoBruto.toUpperCase();
    const basura = /\b(EL|LA|DE|DEL|LETRA|NÚMERO|NUMERO|LOTE|RAYA|ESPACIO)\b/g;
    texto = texto.replace(basura, '');
    const correcciones = { "ÉLE":"L", "ELE":"L", "GUION":"-", "GUIÓN":"-", "MENOS":"-", "BARRA":"/", "PARTIDO":"/", "PUNTO":".", "CERO":"0", "UNO":"1", "DOS":"2", "TRES":"3", "CUATRO":"4", "CINCO":"5", "SEIS":"6", "SIETE":"7", "OCHO":"8", "NUEVE":"9" };
    for (const [palabra, simbolo] of Object.entries(correcciones)) texto = texto.replace(new RegExp(`\\b${palabra}\\b`, 'g'), simbolo);
    texto = texto.replace(/\s+/g, '').replace(/[^A-Z0-9\-\/\.]/g, '');
    return texto;
}

function dictarLote(idField) {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) return alert("Tu navegador es sordo.");
    const reco = new Reconocimiento(); reco.lang = 'es-ES';
    reco.onstart = () => { document.getElementById(idField).style.backgroundColor = "#fff3cd"; };
    reco.onresult = (e) => { document.getElementById(idField).value = limpiarTextoVoz(e.results[0][0].transcript); };
    reco.onend = () => { document.getElementById(idField).style.backgroundColor = "#fff"; };
    reco.start();
}

// --- 2. GESTIÓN DE LA FIRMA TÁCTIL ---
const canvas = document.getElementById('lienzo-firma');
const ctx = canvas.getContext('2d');
let dibujando = false;
let lienzoEstaDibujado = false; // Flag de seguridad sanitaria

const iniciarTrazado = (e) => {
    dibujando = true; ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = "#000000"; ctx.lineCap = "round";
    const r = canvas.getBoundingClientRect(); const ev = e.touches ? e.touches[0] : e;
    ctx.moveTo(ev.clientX - r.left, ev.clientY - r.top);
    lienzoEstaDibujado = true; // El responsable ha puesto el dedo
    e.preventDefault();
};
const dibujar = (e) => {
    if (!dibujando) return;
    const r = canvas.getBoundingClientRect(); const ev = e.touches ? e.touches[0] : e;
    ctx.lineTo(ev.clientX - r.left, ev.clientY - r.top); ctx.stroke();
    e.preventDefault();
};
const detenerTrazado = () => { dibujando = false; };

canvas.addEventListener('mousedown', iniciarTrazado); canvas.addEventListener('mousemove', dibujar); canvas.addEventListener('mouseup', detenerTrazado);
canvas.addEventListener('touchstart', iniciarTrazado); canvas.addEventListener('touchmove', dibujar); canvas.addEventListener('touchend', detenerTrazado);

document.getElementById('btn-limpiar-firma').addEventListener('click', () => { ctx.clearRect(0,0,canvas.width,canvas.height); lienzoEstaDibujado = false; });

// --- 3. MEMORIA DE MATERIA PRIMA ---
const camposAtrasar = ['lote-vinagre', 'lote-sal', 'lote-ajo', 'lote-aceite', 'lote-limon', 'lote-pimiento', 'lote-envase'];
function guardarMemoria() { camposAtrasar.forEach(id => { if(document.getElementById(id).value) localStorage.setItem(id, document.getElementById(id).value); }); }
function cargarMemoria() { camposAtrasar.forEach(id => { if(localStorage.getItem(id)) document.getElementById(id).value = localStorage.getItem(id); }); }

// --- 4. ARRANQUE GENERAL DEL SISTEMA (DOM) ---
document.addEventListener('DOMContentLoaded', async () => {
    cargarMemoria();
    setInterval(() => { document.getElementById('reloj').textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);

    // DIBUJAR LA GRÁFICA DEL FRÍO (Últimos 15 registros)
    try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=fecha_hora,temperatura&order=fecha_hora.desc&limit=15`, { headers: { 'apikey': SUPABASE_ANON_KEY }});
        const datosFrio = await res.json(); datosFrio.reverse();
        constctxGrafica = document.getElementById('grafica-temperatura').getContext('2d');
        new Chart(ctxGrafica, {
            type: 'line',
            data: {
                labels: datosFrio.map(d => new Date(d.fecha_hora).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })),
                datasets: [{ label: 'ºC Cámara', data: datosFrio.map(d => d.temperatura), borderColor: '#2980b9', tension: 0.3, fill: false }]
            },
            options: { responsive: true, plugins: { legend: { display: true } }, scales: { y: { suggestedMin: 0, suggestedMax: 10 } } }
        });
    } catch(e) { console.log("Sin datos de frío aún."); }

    // REGISTRO DE HIGIENE
    document.getElementById('formulario-higiene').addEventListener('submit', async (e) => {
        e.preventDefault();
        const d = { cloro: parseFloat(document.getElementById('cloro').value), organoleptico: document.querySelector('input[name="organoleptico"]:checked').value, temperatura: parseFloat(document.getElementById('temperatura').value), firma: "Manual" };
        const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        if (r.ok) { alert('✅ Higiene sellada.'); document.getElementById('formulario-higiene').reset(); location.reload(); }
    });

    // REGISTRO DE TRAZABILIDAD (Ahora con Firma Biométrica Persistente)
    document.getElementById('formulario-trazabilidad').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Bloqueo de seguridad: El responsable DEBE firmar
        if (!lienzoEstaDibujado) {
            alert('❌ Operación cancelada. El responsable DEBE FIRMAR en el cristal táctil para sellar el lote.');
            return;
        }

        guardarMemoria();

        // Convertimos el garabato de Paqui en textoBase64 perpetuo
        const firmaBase64 = canvas.toDataURL('image/png');

        const d = {
            lote_tomate: document.getElementById('lote-tomate').value, lote_vinagre: document.getElementById('lote-vinagre').value, lote_sal: document.getElementById('lote-sal').value,
            lote_ajo: document.getElementById('lote-ajo').value, lote_aceite: document.getElementById('lote-aceite').value, lote_limon: document.getElementById('lote-limon').value,
            lote_pimiento: document.getElementById('lote-pimiento').value, lote_envases: document.getElementById('lote-envase').value, litros: parseFloat(document.getElementById('litros-prod').value),
            lote_gazpacho_salida: document.getElementById('lote-salida').value, 
            firma: firmaBase64 // INYECCIÓN DE LA IMAGEN EN LA BASE DE DATOS
        };
        const r = await fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad`, { method: 'POST', headers: { 'apikey': SUPABASE_ANON_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify(d) });
        if (r.ok) { 
            alert('✅ Lote sellado y firma biométrica guardada con el registro.'); 
            document.getElementById('lote-tomate').value = ''; document.getElementById('litros-prod').value = ''; document.getElementById('lote-salida').value = ''; 
            // Limpiamos la firma tátil para el próximo lote
            ctx.clearRect(0,0,canvas.width,canvas.height); lienzoEstaDibujado = false; 
        }
    });

    // GENERADOR PDF UNIFICADO CRUZADO (Informe de Firmas)
    const btnImprimir = document.getElementById('btn-imprimir-traza');
    btnImprimir.addEventListener('click', async () => {
        btnImprimir.textContent = "⏳ CRUZANDO DATOS Y FIRMAS...";
        try {
            const [resH, resT] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }}),
                fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }})
            ]);
            if (!resH.ok || !resT.ok) throw new Error("Acceso Supabase denegado.");

            const higiene = await resH.json(); const traza = await resT.json();
            const mapaHigiene = {}; higiene.forEach(h => { mapaHigiene[new Date(h.fecha_hora).toLocaleDateString('es-ES')] = h; });

            const { jsPDF } = window.jspdf; 
            const doc = new jsPDF('landscape');
            doc.setFontSize(14); doc.text("REGISTRO UNIFICADO - EL HORTELANO", 14, 15);
            doc.setFontSize(10); doc.text("Informe de Firmas Biométricas de Producción", 14, 21);

            const filas = traza.map(t => {
                const f = new Date(t.fecha_hora).toLocaleDateString('es-ES'); const h = mapaHigiene[f] || {};
                return [f, h.cloro || '-', h.temperatura || '-', h.organoleptico || '-', t.lote_tomate, t.lote_vinagre, t.lote_sal, t.lote_ajo, t.lote_aceite, t.lote_limon, t.lote_pimiento, t.lote_envases, t.litros, t.lote_gazpacho_salida, ""];
            });

            doc.autoTable({
                startY: 28,
                head: [['Fecha', 'Cloro', 'ºC', 'Org.', 'Tom.', 'Vin.', 'Sal', 'Ajo', 'Ace.', 'Lim.', 'Pim.', 'Env.', 'Lit.', 'Sal.', 'Firma Biométrica']],
                body: filas, theme: 'grid', styles: { fontSize: 7, halign: 'center' }, headStyles: { fillColor: [230, 230, 230], textColor: [0,0,0] },
                didDrawCell: (datosCell) => {
                    // Si es la columna de firma y es una fila de datos (no cabecera)
                    if (datosCell.column.index === 14 && datosCell.section === 'body') {
                        const indiceFilaTraza = datosCell.row.index;
                        const t = traza[indiceFilaTraza];
                        // Verificamos si la firma de esta fila tiene datos de imagen
                        if (t.firma && t.firma.startsWith('data:image/png;base64,')) {
                            // Inyectamos la firma manuscrita de Supabase DIRECTAMENTE en su celda
                            doc.addImage(t.firma, 'PNG', datosCell.cell.x + 2, datosCell.cell.y + 1, 15, 6);
                        }
                    }
                }
            });

            doc.save('Informe_Oficial_Firmado_El_Hortelano.pdf');
        } catch (err) { alert('❌ Error crítico al compilar el informe. Revisa la red.'); }
        finally { btnImprimir.textContent = "🖨️ IMPRIMIR INFORME DE FIRMAS (PDF)"; }
    });
});
