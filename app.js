const SUPABASE_URL = 'https://sesrmzxwpgxobfrmuaix.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_JWQLt7yJm0bw406beocZAQ_-t28acp3';

// --- PURIFICADOR DE VOZ INDUSTRIAL (NIVEL EXTREMO) ---
function limpiarTextoVoz(textoBruto) {
    let texto = textoBruto.toUpperCase();
    
    // 1. Purgar la basura humana (preposiciones y muletillas)
    const basura = /\b(EL|LA|DE|DEL|LETRA|NÚMERO|NUMERO|LOTE|RAYA|ESPACIO)\b/g;
    texto = texto.replace(basura, '');

    // 2. Matriz de conversión fonética de trinchera
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

    // 3. Aniquilación total: fulminamos espacios y cualquier símbolo no autorizado
    texto = texto.replace(/\s+/g, '');
    texto = texto.replace(/[^A-Z0-9\-\/\.]/g, '');

    return texto;
}

function dictarLote(idCampo) {
    const Reconocimiento = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Reconocimiento) { alert("Tu navegador es sordo. Cambia de dispositivo."); return; }
    
    const reco = new Reconocimiento();
    reco.lang = 'es-ES';
    
    reco.onstart = () => { document.getElementById(idCampo).style.backgroundColor = "#fff3cd"; };
    
    reco.onresult = (e) => {
        let escuchado = e.results[0][0].transcript;
        document.getElementById(idCampo).value = limpiarTextoVoz(escuchado);
    };
    
    // Si la máquina no oye nada, marcamos en rojo levemente para avisar
    reco.onerror = () => { document.getElementById(idCampo).style.backgroundColor = "#ffcccc"; };
    reco.onend = () => { document.getElementById(idCampo).style.backgroundColor = "#fff"; };
    
    reco.start();
}

// --- GESTIÓN DE LA MEMORIA DE MATERIA PRIMA ---
const camposAtrasar = [
    'lote-vinagre', 'lote-sal', 'lote-ajo', 'lote-aceite', 
    'lote-limon', 'lote-pimiento', 'lote-envase'
];

function guardarMemoria() {
    camposAtrasar.forEach(id => {
        const valor = document.getElementById(id).value;
        // Solo guardamos si hay algo escrito, para no borrar por accidente con vacíos
        if(valor) localStorage.setItem(id, valor);
    });
}

function cargarMemoria() {
    camposAtrasar.forEach(id => {
        const guardado = localStorage.getItem(id);
        if (guardado) {
            document.getElementById(id).value = guardado;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const reloj = document.getElementById('reloj');
    const formHigiene = document.getElementById('formulario-higiene');
    const formTraza = document.getElementById('formulario-trazabilidad');
    const btnImprimir = document.getElementById('btn-imprimir-traza');

    // Recuperamos lo que Paqui escribió en el turno anterior
    cargarMemoria();

    setInterval(() => { reloj.textContent = new Date().toLocaleTimeString('es-ES'); }, 1000);

    // MÓDULO 1: HIGIENE
    formHigiene.addEventListener('submit', async (e) => {
        e.preventDefault();
        const datos = {
            cloro: parseFloat(document.getElementById('cloro').value),
            organoleptico: document.querySelector('input[name="organoleptico"]:checked').value,
            temperatura: parseFloat(document.getElementById('temperatura').value),
            firma: "Paqui"
        };
        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_higiene`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });
            if (res.ok) { 
                alert('✅ Plan de Higiene sellado en la base de datos.'); 
                formHigiene.reset(); 
            } else throw new Error("Fallo en la red.");
        } catch (err) { alert('❌ Error: El parte de higiene no ha llegado al servidor.'); }
    });

    // MÓDULO 2: TRAZABILIDAD (Memoria + Purificador)
    formTraza.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Blindamos los datos fijos antes de disparar
        guardarMemoria();

        const datos = {
            lote_tomate: document.getElementById('lote-tomate').value,
            lote_vinagre: document.getElementById('lote-vinagre').value,
            lote_sal: document.getElementById('lote-sal').value,
            lote_ajo: document.getElementById('lote-ajo').value,
            lote_aceite: document.getElementById('lote-aceite').value,
            lote_limon: document.getElementById('lote-limon').value,
            lote_pimiento: document.getElementById('lote-pimiento').value,
            lote_envases: document.getElementById('lote-envase').value,
            litros: parseFloat(document.getElementById('litros-prod').value),
            lote_gazpacho_salida: document.getElementById('lote-salida').value,
            firma: "Paqui"
        };

        try {
            const res = await fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad`, {
                method: 'POST',
                headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(datos)
            });

            if (res.ok) { 
                alert('✅ Lote asegurado. Producción registrada.'); 
                // Limpiamos estrictamente lo que caduca a diario
                document.getElementById('lote-tomate').value = '';
                document.getElementById('litros-prod').value = '';
                document.getElementById('lote-salida').value = '';
            } else throw new Error("Fallo en la red.");
        } catch (err) { alert('❌ Error: El lote se ha perdido por falta de conexión.'); }
    });

    // MÓDULO 3: PDF UNIFICADO CRUZADO
    btnImprimir.addEventListener('click', async () => {
        btnImprimir.textContent = "⏳ CRUZANDO DATOS...";
        try {
            const [resH, resT] = await Promise.all([
                fetch(`${SUPABASE_URL}/rest/v1/registro_higiene?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }}),
                fetch(`${SUPABASE_URL}/rest/v1/registro_trazabilidad?select=*&order=fecha_hora.asc`, { headers: { 'apikey': SUPABASE_ANON_KEY }})
            ]);
            
            if (!resH.ok || !resT.ok) throw new Error("Archivos denegados por Supabase.");

            const higiene = await resH.json();
            const traza = await resT.json();
            const mapaHigiene = {};
            higiene.forEach(h => { mapaHigiene[new Date(h.fecha_hora).toLocaleDateString('es-ES')] = h; });

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape');
            doc.text("REGISTRO UNIFICADO - EL HORTELANO", 14, 15);

            const filas = traza.map(t => {
                const f = new Date(t.fecha_hora).toLocaleDateString('es-ES');
                const h = mapaHigiene[f] || {};
                return [f, h.cloro || '-', h.temperatura || '-', h.organoleptico || '-', t.lote_tomate, t.lote_vinagre, t.lote_sal, t.lote_ajo, t.lote_aceite, t.lote_limon, t.lote_pimiento, t.lote_envases, t.litros, t.lote_gazpacho_salida];
            });

            doc.autoTable({
                startY: 25,
                head: [['Fecha', 'Cloro', 'ºC', 'Org.', 'Tom.', 'Vin.', 'Sal', 'Ajo', 'Ace.', 'Lim.', 'Pim.', 'Env.', 'Lit.', 'Sal.']],
                body: filas,
                theme: 'grid',
                styles: { fontSize: 7, halign: 'center' },
                headStyles: { fillColor: [230, 230, 230], textColor: [0,0,0] }
            });
            doc.save('Informe_Unificado_El_Hortelano.pdf');
        } catch (err) { alert('❌ Error crítico al cruzar los datos. Revisa la red.'); }
        finally { btnImprimir.textContent = "🖨️ IMPRIMIR REGISTRO PDF"; }
    });
});
