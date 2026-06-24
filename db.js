// ==========================================================================
// BASE DE DATOS LOCAL — IndexedDB
// Sin servidores, sin suscripciones, sin internet.
// Los datos se guardan permanentemente en el navegador del dispositivo.
// ==========================================================================
const HortelanoDB = (() => {

    const NOMBRE_BD  = 'HortelanoAppDB';
    const VERSION    = 1;
    const T_HIGIENE  = 'registro_higiene';
    const T_TRAZA    = 'registro_trazabilidad';

    let instancia = null;

    // --- Abre (o crea) la base de datos ---
    function abrir() {
        if (instancia) return Promise.resolve(instancia);

        return new Promise((resolve, reject) => {
            const req = indexedDB.open(NOMBRE_BD, VERSION);

            req.onupgradeneeded = (e) => {
                const bd = e.target.result;
                [T_HIGIENE, T_TRAZA].forEach(tabla => {
                    if (!bd.objectStoreNames.contains(tabla)) {
                        const store = bd.createObjectStore(tabla, { keyPath: 'id', autoIncrement: true });
                        store.createIndex('idx_fecha', 'fecha_hora', { unique: false });
                    }
                });
            };

            req.onsuccess = (e) => { instancia = e.target.result; resolve(instancia); };
            req.onerror   = (e) => reject(new Error(`Error BD: ${e.target.error?.message}`));
            req.onblocked = ()  => reject(new Error('BD bloqueada. Cierra otras pestañas de esta app.'));
        });
    }

    // --- Inserta un registro nuevo (el id lo asigna autoIncrement) ---
    async function insertar(tabla, datos) {
        const bd = await abrir();
        return new Promise((resolve, reject) => {
            const { id: _descartado, ...registro } = datos;
            const tx  = bd.transaction(tabla, 'readwrite');
            const req = tx.objectStore(tabla).add(registro);
            req.onsuccess = () => resolve({ ok: true, id: req.result });
            req.onerror   = () => reject(new Error(`Error al insertar en ${tabla}: ${req.error?.message}`));
        });
    }

    // --- Devuelve los últimos N registros ordenados por fecha (para gráficas) ---
    async function obtenerUltimos(tabla, limite = 15) {
        const bd = await abrir();
        return new Promise((resolve, reject) => {
            const req = bd.transaction(tabla, 'readonly').objectStore(tabla).getAll();
            req.onsuccess = () => {
                const lista = req.result
                    .sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora))
                    .slice(-limite);
                resolve(lista);
            };
            req.onerror = () => reject(req.error);
        });
    }

    // --- Devuelve registros en un rango de fechas (para PDF e historial) ---
    async function obtenerPorRango(tabla, desde = null, hasta = null) {
        const bd = await abrir();
        return new Promise((resolve, reject) => {
            const req = bd.transaction(tabla, 'readonly').objectStore(tabla).getAll();
            req.onsuccess = () => {
                let lista = req.result.sort((a, b) => a.fecha_hora.localeCompare(b.fecha_hora));
                if (desde) lista = lista.filter(r => r.fecha_hora >= `${desde}T00:00:00.000Z`);
                if (hasta) lista = lista.filter(r => r.fecha_hora <= `${hasta}T23:59:59.999Z`);
                resolve(lista);
            };
            req.onerror = () => reject(req.error);
        });
    }

    // --- Comprueba si ya hay un registro de higiene hoy ---
    async function existeHoy() {
        const hoy = new Date().toISOString().split('T')[0];
        const lista = await obtenerPorRango(T_HIGIENE, hoy, hoy);
        return lista.length > 0;
    }

    // --- Exporta toda la base de datos como objeto JSON ---
    async function exportarTodo() {
        const bd = await abrir();
        const leer = (tabla) => new Promise((res, rej) => {
            const req = bd.transaction(tabla, 'readonly').objectStore(tabla).getAll();
            req.onsuccess = () => res(req.result);
            req.onerror   = () => rej(req.error);
        });
        const [higiene, trazabilidad] = await Promise.all([leer(T_HIGIENE), leer(T_TRAZA)]);
        return {
            version:      VERSION,
            app:          'HortelanoApp',
            exportado_en: new Date().toISOString(),
            higiene,
            trazabilidad
        };
    }

    // --- Importa registros desde un JSON exportado previamente ---
    async function importarDesdeJSON(json) {
        const bd = await abrir();

        // Normaliza tanto arrays directos como el wrapper {value:[]} que genera PowerShell
        const comoArray = (v) => Array.isArray(v) ? v : (v?.value ?? []);

        const volcar = (tabla, registros) => new Promise((res, rej) => {
            const lista = comoArray(registros);
            const tx = bd.transaction(tabla, 'readwrite');
            lista.forEach(r => tx.objectStore(tabla).put(r));
            tx.oncomplete = res;
            tx.onerror    = () => rej(tx.error);
        });

        await volcar(T_HIGIENE, json.higiene      || []);
        await volcar(T_TRAZA,   json.trazabilidad || []);
        return {
            higiene:      comoArray(json.higiene).length,
            trazabilidad: comoArray(json.trazabilidad).length
        };
    }

    return { insertar, obtenerUltimos, obtenerPorRango, existeHoy, exportarTodo, importarDesdeJSON, T_HIGIENE, T_TRAZA };
})();
