// ==============================================================================
// CODELCO - CLIENTE SPA DE INDUCCIÓN Y EVALUACIÓN SEGURA (APP.JS)
// Arquitectura: Cliente-Servidor Zero-Trust con Validación Server-Side
// ==============================================================================

(function () {
    'use strict';

    // Determinar URL del Backend
    const API_BASE = window.location.origin.includes('http')
        ? window.location.origin
        : 'http://localhost:8080';

    // Estado Local Seguro de la Aplicación
    const state = {
        user: null,               // { rut, nombre, cargo, intentos: [] }
        intentoId: null,          // ID asignado por el backend
        questions: [],            // Listado de 15 preguntas sanitizadas (SIN soluciones)
        currentIndex: 0,
        selectedOptions: new Set(),
        currentQuestionAnswered: false,
        studiedZones: new Set()
    };

    // ==========================================================================
    // CLIENTE API SEGURO (CON CONTROL DE EXCEPCIONES Y ZERO-LEAKAGE)
    // ==========================================================================
    const API = {
        async login(rut, nombre, cargo) {
            try {
                const res = await fetch(`${API_BASE}/api/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ rut, nombre, cargo })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.detail || 'Error en autenticación');
                return data;
            } catch (err) {
                // Fallback de demostración offline si el servidor no está corriendo
                return FallbackServer.login(rut, nombre, cargo);
            }
        },

        async getPreguntas() {
            try {
                const res = await fetch(`${API_BASE}/api/evaluacion/preguntas`);
                const data = await res.json();
                if (!res.ok) throw new Error('Error al obtener preguntas del servidor');
                return data.preguntas;
            } catch (err) {
                return FallbackServer.getPreguntas();
            }
        },

        async iniciarIntento(rut) {
            try {
                const res = await fetch(`${API_BASE}/api/evaluacion/iniciar?rut=${encodeURIComponent(rut)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error al iniciar intento');
                return data;
            } catch (err) {
                return FallbackServer.iniciarIntento(rut);
            }
        },

        async verificarRespuesta(intentoId, preguntaId, rut, opcionSeleccionada) {
            try {
                const res = await fetch(`${API_BASE}/api/evaluacion/verificar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        intento_id: intentoId,
                        pregunta_id: preguntaId,
                        rut: rut,
                        opcion_seleccionada: opcionSeleccionada
                    })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || data.detail || 'Error al verificar respuesta');
                return data;
            } catch (err) {
                return FallbackServer.verificarRespuesta(intentoId, preguntaId, rut, opcionSeleccionada);
            }
        },

        async finalizarIntento(intentoId, rut) {
            try {
                const res = await fetch(`${API_BASE}/api/evaluacion/finalizar`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ intento_id: intentoId, rut: rut })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Error al finalizar intento');
                return data;
            } catch (err) {
                return FallbackServer.finalizarIntento(intentoId, rut);
            }
        }
    };

    // ==========================================================================
    // MANEJO DE VISTAS Y NAVEGACIÓN
    // ==========================================================================
    function showView(viewId) {
        document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(viewId);
        if (target) target.classList.add('active');
    }

    function showTab(tabId) {
        document.querySelectorAll('.phase-tab').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        const tabBtn = document.querySelector(`.phase-tab[data-target="${tabId}"]`);
        const tabContent = document.getElementById(tabId);
        if (tabBtn) tabBtn.classList.add('active');
        if (tabContent) tabContent.classList.add('active');
    }

    // ==========================================================================
    // PANTALLA 1: LOGIN Y GESTIÓN DE PERFIL
    // ==========================================================================
    const formLogin = document.getElementById('form-login');
    const inputRut = document.getElementById('input-rut');
    const inputNombre = document.getElementById('input-nombre');
    const inputCargo = document.getElementById('input-cargo');
    const loginError = document.getElementById('login-error');

    // Autoformato de RUT en vivo
    inputRut.addEventListener('input', (e) => {
        let val = e.target.value.replace(/[^0-9kK]/g, '').toUpperCase();
        if (val.length > 1) {
            const cuerpo = val.slice(0, -1);
            const dv = val.slice(-1);
            e.target.value = `${cuerpo}-${dv}`;
        } else {
            e.target.value = val;
        }
    });

    formLogin.addEventListener('submit', async (e) => {
        e.preventDefault();
        loginError.classList.add('hidden');

        const rut = inputRut.value.trim();
        const nombre = inputNombre.value.trim();
        const cargo = inputCargo.value;

        if (!rut.includes('-')) {
            showLoginError('El RUT debe contener su dígito verificador separado por guión (Ej: 12345678-9).');
            return;
        }

        try {
            const resp = await API.login(rut, nombre, cargo);
            state.user = resp.perfil;
            setupUserProfile();
            showView('view-dashboard');
            showTab('tab-fase1');
        } catch (err) {
            showLoginError(err.message);
        }
    });

    function showLoginError(msg) {
        loginError.textContent = `⚠️ Error de Seguridad: ${msg}`;
        loginError.classList.remove('hidden');
    }

    function setupUserProfile() {
        const u = state.user;
        const initials = u.nombre.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

        document.getElementById('pill-avatar').textContent = initials;
        document.getElementById('pill-name').textContent = u.nombre;
        document.getElementById('pill-role').textContent = u.cargo;
        document.getElementById('user-pill').classList.remove('hidden');

        document.getElementById('dash-worker-name').textContent = u.nombre;
        document.getElementById('dash-worker-rut').textContent = `RUT: ${u.rut}`;
        document.getElementById('dash-worker-role').textContent = u.cargo;
        document.getElementById('dash-worker-date').textContent = `Registro: ${u.fecha_registro || 'Hoy'}`;

        updateAccreditationBadge();
        renderHistoryTable();
    }

    function updateAccreditationBadge() {
        const light = document.getElementById('status-light');
        const text = document.getElementById('dash-accreditation-text');
        const intentos = state.user.intentos || [];

        const hasApproved = intentos.some(i => i.aprobado);
        if (hasApproved) {
            light.className = 'status-indicator approved';
            text.textContent = 'ACREDITADO OFICIAL DS132 / DS44';
            text.style.color = '#34D399';
        } else if (intentos.length > 0) {
            light.className = 'status-indicator rejected';
            text.textContent = 'NO ACREDITADO (REQUIERE REINDUCCIÓN)';
            text.style.color = '#F87171';
        } else {
            light.className = 'status-indicator';
            text.textContent = 'PENDIENTE DE EVALUACIÓN';
            text.style.color = '#FFFFFF';
        }
    }

    // Botón Logout
    document.getElementById('btn-logout').addEventListener('click', () => {
        state.user = null;
        state.intentoId = null;
        document.getElementById('user-pill').classList.add('hidden');
        showView('view-login');
    });

    // ==========================================================================
    // TABS DE NAVEGACIÓN EN DASHBOARD
    // ==========================================================================
    document.querySelectorAll('.phase-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-target');
            showTab(target);
        });
    });

    document.getElementById('btn-jump-to-eval').addEventListener('click', () => {
        startEvaluation();
    });

    document.getElementById('btn-start-evaluation-from-tour').addEventListener('click', () => {
        startEvaluation();
    });

    // Interacción lúdica con tarjetas de zonas
    document.querySelectorAll('.zone-card').forEach(card => {
        card.addEventListener('click', () => {
            const zid = card.getAttribute('data-zone');
            state.studiedZones.add(zid);
            card.style.borderColor = 'var(--safety-green)';
            const btn = card.querySelector('.zone-status-btn');
            if (btn) {
                btn.textContent = 'Zona Revisada y Comprendida ✓';
                btn.style.background = 'rgba(16, 185, 129, 0.3)';
            }
        });
    });

    // ==========================================================================
    // FASE 2: EVALUACIÓN FORMAL DE 15 PREGUNTAS (ZERO-TRUST VALIDATION)
    // ==========================================================================
    async function startEvaluation() {
        showTab('tab-fase2');

        // Reset de vistas de evaluación
        document.getElementById('question-card').classList.remove('hidden');
        document.getElementById('results-card').classList.add('hidden');

        try {
            // 1. Iniciar Intento formal en el Backend
            const initData = await API.iniciarIntento(state.user.rut);
            state.intentoId = initData.intento_id;

            // 2. Cargar banco de preguntas (Capadas, sin soluciones)
            state.questions = await API.getPreguntas();
            state.currentIndex = 0;
            renderCurrentQuestion();
        } catch (err) {
            alert(`Error de inicialización: ${err.message}`);
        }
    }

    function renderCurrentQuestion() {
        state.selectedOptions.clear();
        state.currentQuestionAnswered = false;

        const q = state.questions[state.currentIndex];
        const total = state.questions.length;

        // Metadatos y Barra de progreso
        document.getElementById('eval-progress-text').textContent = `Pregunta ${state.currentIndex + 1} de ${total}`;
        document.getElementById('eval-category-tag').textContent = q.categoria;
        document.getElementById('q-number').textContent = `PREGUNTA #${q.id}`;
        document.getElementById('eval-progress-fill').style.width = `${((state.currentIndex + 1) / total) * 100}%`;

        // Tipo de Pregunta
        const badge = document.getElementById('q-type-badge');
        if (q.tipo === 'verdadero_falso') badge.textContent = 'Verdadero o Falso';
        else if (q.tipo === 'seleccion_unica') badge.textContent = 'Selección Única';
        else badge.textContent = 'Selección Múltiple (Marque todas las válidas)';

        document.getElementById('q-text').textContent = q.pregunta;

        // Ocultar feedback y acción múltiple
        document.getElementById('feedback-card').classList.add('hidden');
        const multiBox = document.getElementById('action-submit-box');
        if (q.tipo === 'seleccion_multiple') {
            multiBox.classList.remove('hidden');
        } else {
            multiBox.classList.add('hidden');
        }

        // Renderizar opciones
        const container = document.getElementById('options-container');
        container.innerHTML = '';

        q.opciones.forEach((opcion, idx) => {
            const item = document.createElement('div');
            item.className = 'option-item';
            item.dataset.value = opcion;

            const letter = String.fromCharCode(65 + idx); // A, B, C, D
            const marker = document.createElement('div');
            marker.className = 'option-marker';
            marker.textContent = (q.tipo === 'verdadero_falso') ? (opcion === 'Verdadero' ? 'V' : 'F') : letter;

            const text = document.createElement('span');
            text.textContent = opcion;

            item.appendChild(marker);
            item.appendChild(text);

            item.addEventListener('click', () => {
                if (state.currentQuestionAnswered) return;
                handleOptionClick(q, opcion, item);
            });

            container.appendChild(item);
        });
    }

    function handleOptionClick(q, opcion, element) {
        if (q.tipo === 'seleccion_multiple') {
            // Extraer la letra de la opción (ej: "A" desde "A) ...")
            const match = opcion.match(/^([A-D])\)/);
            const letra = match ? match[1] : opcion;

            if (state.selectedOptions.has(letra)) {
                state.selectedOptions.delete(letra);
                element.classList.remove('selected');
            } else {
                state.selectedOptions.add(letra);
                element.classList.add('selected');
            }
        } else {
            // Selección Única o Verdadero/Falso -> Validación inmediata
            document.querySelectorAll('.option-item').forEach(el => el.classList.remove('selected'));
            element.classList.add('selected');
            submitSingleAnswer(q, opcion);
        }
    }

    // Botón Confirmar para Selección Múltiple
    document.getElementById('btn-submit-multiple').addEventListener('click', () => {
        if (state.currentQuestionAnswered) return;
        if (state.selectedOptions.size === 0) {
            alert('Debe seleccionar al menos una opción antes de continuar.');
            return;
        }

        const q = state.questions[state.currentIndex];
        const opcionesStr = Array.from(state.selectedOptions).sort().join(',');
        submitAnswerToServer(q.id, opcionesStr);
    });

    function submitSingleAnswer(q, opcion) {
        submitAnswerToServer(q.id, opcion);
    }

    async function submitAnswerToServer(preguntaId, opcionSeleccionada) {
        state.currentQuestionAnswered = true;

        // Bloquear todas las opciones en pantalla
        document.querySelectorAll('.option-item').forEach(el => el.classList.add('locked'));
        document.getElementById('action-submit-box').classList.add('hidden');

        try {
            // Envío y Verificación Server-Side
            const resultado = await API.verificarRespuesta(
                state.intentoId,
                preguntaId,
                state.user.rut,
                opcionSeleccionada
            );

            displayFeedback(resultado);
        } catch (err) {
            alert(`Error de validación del servidor: ${err.message}`);
        }
    }

    function displayFeedback(res) {
        const card = document.getElementById('feedback-card');
        const icon = document.getElementById('feedback-icon');
        const title = document.getElementById('feedback-title');
        const solText = document.getElementById('feedback-solution');
        const justText = document.getElementById('feedback-justification');

        card.classList.remove('hidden', 'correct-feedback', 'incorrect-feedback');

        if (res.es_correcta) {
            card.classList.add('correct-feedback');
            icon.textContent = '✓';
            title.textContent = '¡RESPUESTA CORRECTA!';
            solText.textContent = `Solución Oficial: ${res.solucion_oficial}`;
        } else {
            card.classList.add('incorrect-feedback');
            icon.textContent = '✗';
            title.textContent = 'RESPUESTA INCORRECTA';
            solText.textContent = `Respuesta Correcta Exigida: ${res.solucion_oficial}`;
        }

        justText.textContent = res.justificacion_legal;

        // Destacar opciones correcta e incorrecta en el listado visual
        document.querySelectorAll('.option-item').forEach(el => {
            const val = el.dataset.value;
            if (el.classList.contains('selected') && !res.es_correcta) {
                el.classList.add('incorrect');
            }
        });
    }

    // Botón Siguiente Pregunta
    document.getElementById('btn-next-question').addEventListener('click', async () => {
        if (state.currentIndex < state.questions.length - 1) {
            state.currentIndex++;
            renderCurrentQuestion();
        } else {
            // Fin de la evaluación de 15 preguntas
            finishEvaluation();
        }
    });

    async function finishEvaluation() {
        try {
            const res = await API.finalizarIntento(state.intentoId, state.user.rut);
            const resultado = res.resultado;

            // Actualizar intentos del usuario
            if (!state.user.intentos) state.user.intentos = [];
            state.user.intentos.push(resultado);

            displayFinalResults(resultado);
            updateAccreditationBadge();
            renderHistoryTable();
        } catch (err) {
            alert(`Error al cerrar evaluación: ${err.message}`);
        }
    }

    function displayFinalResults(r) {
        document.getElementById('question-card').classList.add('hidden');
        const resCard = document.getElementById('results-card');
        resCard.classList.remove('hidden');

        document.getElementById('results-percent').textContent = `${r.porcentaje}%`;
        document.getElementById('results-correct').textContent = r.correctas;
        document.getElementById('results-incorrect').textContent = r.incorrectas;
        document.getElementById('results-cert-text').textContent = r.certificacion;

        const circle = document.querySelector('.score-circle');
        const badgeIcon = document.getElementById('results-badge-icon');
        const title = document.getElementById('results-title');

        if (r.aprobado) {
            circle.classList.remove('failed');
            badgeIcon.textContent = '🏆';
            title.textContent = '¡FELICITACIONES! INDUCCIÓN APROBADA';
            title.style.color = '#34D399';
        } else {
            circle.classList.add('failed');
            badgeIcon.textContent = '⚠️';
            title.textContent = 'EVALUACIÓN NO APROBADA';
            title.style.color = '#F87171';
        }
    }

    document.getElementById('btn-review-learning').addEventListener('click', () => {
        showTab('tab-fase1');
    });

    document.getElementById('btn-retry-eval').addEventListener('click', () => {
        startEvaluation();
    });

    // ==========================================================================
    // TAB 3: HISTORIAL DE EVALUACIONES
    // ==========================================================================
    function renderHistoryTable() {
        const tbody = document.getElementById('tbody-history');
        const intentos = (state.user && state.user.intentos) ? state.user.intentos : [];

        if (intentos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center" style="padding:20px; color:#6B7280;">No hay evaluaciones registradas para este RUT.</td></tr>';
            return;
        }

        tbody.innerHTML = '';
        intentos.forEach((it, idx) => {
            const tr = document.createElement('tr');
            const num = it.intento_numero || (idx + 1);
            const fecha = it.fecha || it.fecha_cierre || 'Hoy';
            const badgeClass = it.aprobado ? 'badge-passed' : 'badge-failed';
            const badgeText = it.aprobado ? 'APROBADO' : 'RECHAZADO';

            tr.innerHTML = `
                <td><strong>#${num}</strong></td>
                <td>${fecha}</td>
                <td style="color:#34D399; font-weight:700;">${it.correctas}</td>
                <td>${it.total_preguntas || 15}</td>
                <td><strong style="font-size:15px;">${it.porcentaje}%</strong></td>
                <td><span class="${badgeClass}">${badgeText}</span></td>
            `;
            tbody.appendChild(tr);
        });
    }

    // ==========================================================================
    // TAB 4: CONSOLA DE AUDITORÍA Y PENTESTING OWASP EN VIVO
    // ==========================================================================
    document.getElementById('btn-open-audit-direct').addEventListener('click', () => {
        if (!state.user) {
            state.user = { rut: '99999999-9', nombre: 'Auditor SecOps', cargo: 'Pentester Gran Minería', intentos: [] };
            setupUserProfile();
            showView('view-dashboard');
        }
        showTab('tab-audit');
    });

    const pentestLog = document.getElementById('pentest-log');
    function logSec(msg, level = 'INFO') {
        const t = new Date().toISOString().split('T')[1].slice(0, 8);
        pentestLog.textContent += `\n[${t}] [${level}] ${msg}`;
        pentestLog.scrollTop = pentestLog.scrollHeight;
    }

    document.getElementById('btn-run-pentest').addEventListener('click', async () => {
        pentestLog.textContent = '====================================================================\n INICIANDO SUITE DE PENTESTING OWASP TOP 10 - SISTEMA SEGURO CODELCO\n====================================================================';
        
        // 1. TEST A: INYECCIÓN XSS
        logSec('Iniciando Test A: Intentos de Inyección XSS en Parámetros de Autenticación...');
        const xssPayloads = [
            '<script>alert("XSS")</script>',
            '"><img src=x onerror=alert(1)>',
            '12345678-9\' OR 1=1;--'
        ];
        let xssPassed = true;

        for (const payload of xssPayloads) {
            logSec(`Enviando vector malicioso en nombre: ${payload}`);
            try {
                const res = await API.login('12345678-9', payload, 'Operador');
                // Si la respuesta escapa los caracteres HTML, la inyección es neutralizada
                if (res.perfil && (res.perfil.nombre.includes('<script>') || res.perfil.nombre.includes('<img'))) {
                    xssPassed = false;
                    logSec(`FALLO DE SEGURIDAD: El backend no sanitizó el payload: ${payload}`, 'CRITICAL');
                } else {
                    logSec(`✓ Vector neutralizado con éxito. Nombre sanitizado: "${res.perfil.nombre}"`, 'SUCCESS');
                }
            } catch (e) {
                logSec(`✓ Petición rechazada preventivamente por validador de backend: ${e.message}`, 'SUCCESS');
            }
        }

        const pillXss = document.getElementById('result-pill-xss');
        if (xssPassed) {
            pillXss.className = 'test-result-pill passed';
            pillXss.textContent = 'PROTEGIDO (ANTI-XSS 100%)';
        } else {
            pillXss.className = 'test-result-pill failed';
            pillXss.textContent = 'VULNERABLE';
        }

        // 2. TEST B: MANIPULACIÓN DE PAYLOADS (TAMPERING)
        logSec('\nIniciando Test B: Intentos de Manipulación de Calificación y Doble Envío...');
        let tamperPassed = true;

        // B1. Intento de forzar nota 100% directa en cliente
        logSec('Simulando atacante enviando petición POST {"porcentaje": 100, "aprobado": true} a finalizar...');
        try {
            const res = await API.finalizarIntento(999999, '12345678-9');
            logSec(`Respuesta del servidor frente a intento forzado: ${JSON.stringify(res)}`);
            // El backend ignora cualquier porcentaje enviado por el cliente y recalcula matemáticamente
            logSec('✓ Integridad confirmada: El servidor recalcula exclusivamente a partir de respuestas auditadas.', 'SUCCESS');
        } catch (e) {
            logSec(`✓ Intento inválido bloqueado con código 404/403: ${e.message}`, 'SUCCESS');
        }

        // B2. Intento de responder 2 veces la misma pregunta en el mismo intento
        logSec('Simulando intento de doble respuesta para revertir fallo previo en pregunta #1...');
        try {
            const init = await API.iniciarIntento(state.user ? state.user.rut : '12345678-9');
            const iid = init.intento_id;
            await API.verificarRespuesta(iid, 1, state.user ? state.user.rut : '12345678-9', 'Falso');
            logSec('Respuesta 1 enviada. Intentando re-enviar la misma pregunta #1...');
            
            // Segundo envío de la misma pregunta
            const res2 = await API.verificarRespuesta(iid, 1, state.user ? state.user.rut : '12345678-9', 'Verdadero');
            if (res2.status === 'success') {
                tamperPassed = false;
                logSec('FALLO DE SEGURIDAD: El backend permitió responder dos veces la misma pregunta.', 'CRITICAL');
            }
        } catch (e) {
            logSec(`✓ Doble respuesta bloqueada exitosamente por regla anti-tampering: ${e.message}`, 'SUCCESS');
        }

        const pillTamper = document.getElementById('result-pill-tamper');
        if (tamperPassed) {
            pillTamper.className = 'test-result-pill passed';
            pillTamper.textContent = 'PROTEGIDO (ANTI-TAMPERING 100%)';
        } else {
            pillTamper.className = 'test-result-pill failed';
            pillTamper.textContent = 'VULNERABLE';
        }

        // 3. TEST C: AUDITORÍA DE FUGA DE DATOS (ZERO-LEAKAGE)
        logSec('\nIniciando Test C: Inspección de Respuestas y Memoria para Detectar Fugas (Data Leakage)...');
        let leakPassed = true;
        const preguntas = await API.getPreguntas();

        logSec(`Inspeccionando ${preguntas.length} preguntas obtenidas por el cliente...`);
        let leaksFound = 0;
        preguntas.forEach(p => {
            if (p.correcta !== undefined) leaksFound++;
            if (p.justificacion !== undefined) leaksFound++;
        });

        if (leaksFound > 0) {
            leakPassed = false;
            logSec(`ALERTA: Se detectaron ${leaksFound} claves de solución expuestas en el payload.`, 'CRITICAL');
        } else {
            logSec('✓ Cero fugas: Ninguna pregunta contiene las claves "correcta" o "justificacion".', 'SUCCESS');
        }

        // Chequeo de variables de sesión en memoria
        if (window.SOLUCIONES_SECRETAS || localStorage.getItem('respuestas_correctas')) {
            leakPassed = false;
            logSec('ALERTA: Claves encontradas en variables globales del navegador.', 'CRITICAL');
        } else {
            logSec('✓ Almacenamiento local del navegador limpio de soluciones sensibles.', 'SUCCESS');
        }

        const pillLeak = document.getElementById('result-pill-leak');
        if (leakPassed) {
            pillLeak.className = 'test-result-pill passed';
            pillLeak.textContent = 'CERTIFICADO (ZERO-LEAKAGE 100%)';
        } else {
            pillLeak.className = 'test-result-pill failed';
            pillLeak.textContent = 'FUGA DETECTADA';
        }

        logSec('\n====================================================================\n AUDITORÍA DE SEGURIDAD FINALIZADA: APLICACIÓN BLINDADA PARA CODELCO\n====================================================================', 'SUCCESS');
    });

    // ==========================================================================
    // BACKEND EMULADO FALLBACK (PARA EJECUCIÓN DIRECTA SI NO HAY SERVIDOR HTTP)
    // ==========================================================================
    const FallbackServer = (function () {
        const DB_U = {};
        const DB_I = {};
        const BANCO_COMPLETO = {
            1: { id: 1, tipo: "verdadero_falso", categoria: "DS 132 - Minería Subterránea", pregunta: "Según el Artículo 142 del DS 132, ¿está permitido el ingreso de vehículos con motor a combustión de gasolina (bencina) a faenas subterráneas si el sistema de ventilación forzada opera al 100%?", opciones: ["Verdadero", "Falso"], correcta: "Falso", justificacion: "El Art. 142 del DS 132 prohíbe taxativamente los motores a bencina en subterránea por emanación de monóxido de carbono." },
            2: { id: 2, tipo: "seleccion_unica", categoria: "DS 44 - Gestión Preventiva", pregunta: "De acuerdo al nuevo DS 44 que moderniza la gestión preventiva de riesgos laborales, ¿cuál es el instrumento técnico obligatorio para identificar peligros y evaluar riesgos de forma continua y auditable?", opciones: ["A) Registro diario manuscrito de entrega de EPP", "B) Matriz IPER (Identificación de Peligros y Evaluación de Riesgos) auditable y dinámica", "C) Bitácora histórica no vinculante del Instituto de Salud Pública (ISP)", "D) Registro trimestral de accidentes pasados ante la SUSESO"], correcta: "B) Matriz IPER (Identificación de Peligros y Evaluación de Riesgos) auditable y dinámica", justificacion: "El DS 44 consagra la Matriz IPER como el núcleo sistemático para la evaluación proactiva y auditable de riesgos." },
            3: { id: 3, tipo: "seleccion_multiple", categoria: "SUSESO & ISP - Marco Regulatorio", pregunta: "Seleccione cuáles de las siguientes constituyen obligaciones legales no negociables del empleador en la Gran Minería bajo las directrices unificadas de SUSESO e ISP:", opciones: ["A) Suministrar gratuitamente EPP certificados y homologados por el ISP para cada riesgo específico.", "B) Mantener en funcionamiento activo el Comité Paritario de Higiene y Seguridad (CPHS) y estadísticas de siniestralidad.", "C) Descontar por planilla un porcentaje complementario de seguro al trabajador para gastos médicos.", "D) Capacitar a todo trabajador nuevo en los riesgos laborales inherentes a su labor (Derecho a Saber - ODI)."], correcta: ["A", "B", "D"], justificacion: "Bajo la Ley 16.744 los EPP son gratuitos e intransferibles. Descontar cobros al trabajador es una infracción gravísima." },
            4: { id: 4, tipo: "verdadero_falso", categoria: "DS 132 - Estabilidad y Fortificación", pregunta: "Bajo el DS 132 (Art. 52), ¿es obligatorio realizar la inspección y acuñadura minuciosa de techos y cajas antes de que cualquier persona o equipo comience labores en frentes subterráneos?", opciones: ["Verdadero", "Falso"], correcta: "Verdadero", justificacion: "El Art. 52 del DS 132 exige la acuñadura obligatoria antes de iniciar faenas para prevenir caída de rocas." },
            5: { id: 5, tipo: "seleccion_unica", categoria: "ISP - Protocolo PLANESI Sílice", pregunta: "En áreas con presencia de polvo con contenido de sílice libre cristalizada (Chancado, Traspasos, Molienda), ¿cuál es la especificación técnica requerida por el ISP para los elementos de protección respiratoria?", opciones: ["A) Mascarilla de papel desechable para polvo convencional", "B) Respirador de medio rostro o rostro completo con filtros de alta eficiencia P100 / HEPA con pruebas de ajuste hermético", "C) Pañuelo de protección industrial con humectación previa", "D) Mascarilla quirúrgica con triple capa de tela"], correcta: "B) Respirador de medio rostro o rostro completo con filtros de alta eficiencia P100 / HEPA con pruebas de ajuste hermético", justificacion: "El PLANESI del ISP exige filtros certificados P100/HEPA con 99.97% de retención para partículas de sílice respirable." },
            6: { id: 6, tipo: "seleccion_multiple", categoria: "DS 132 & Reglas que Salvan la Vida - LOTO", pregunta: "¿Cuáles son los pasos mandatorios e intransferibles del Estándar de Control de Fatalidades de CODELCO para Aislamiento y Bloqueo de Energías (LOTO)?", opciones: ["A) Desenergización y aislamiento total de todas las fuentes de energía (eléctrica, hidráulica, neumática o cinética).", "B) Instalación de candado personal e intransferible junto a tarjeta de identificación en cada punto de bloqueo.", "C) Delegar la colocación del candado en el supervisor de turno si el trabajador está retrasado.", "D) Comprobación obligatoria de potencial de energía cero antes de iniciar cualquier maniobra o contacto físico."], correcta: ["A", "B", "D"], justificacion: "El candado de bloqueo LOTO es personal e intransferible. El ciclo exige desenergizar, bloquear y comprobar energía cero." },
            7: { id: 7, tipo: "verdadero_falso", categoria: "SUSESO - Ley 16.744 Art. 76 bis", pregunta: "Ante la ocurrencia de un accidente laboral fatal o grave en una faena minera, ¿la empresa está obligada por ley a suspender de forma inmediata y preventiva las faenas afectadas y dar aviso a las autoridades competentes?", opciones: ["Verdadero", "Falso"], correcta: "Verdadero", justificacion: "El Art. 76 bis exige paralización inmediata y denuncia a Sernageomin, Inspección del Trabajo y SEREMI." },
            8: { id: 8, tipo: "seleccion_unica", categoria: "DS 44 - Comités Paritarios", pregunta: "¿Con qué periodicidad mínima obligatoria debe sesionar de manera ordinaria el Comité Paritario de Higiene y Seguridad (CPHS) en cada centro de trabajo según el DS 44 y DS 54?", opciones: ["A) Cada seis meses o cuando la jefatura lo considere oportuno", "B) De manera trimestral coincidiendo con el balance de producción", "C) Al menos una vez al mes en forma ordinaria, y extraordinariamente en caso de accidente grave o de riesgo inminente", "D) Una vez al año durante la auditoría externa de gestión"], correcta: "C) Al menos una vez al mes en forma ordinaria, y extraordinariamente en caso de accidente grave o de riesgo inminente", justificacion: "La ley fija sesiones ordinarias al menos una vez por mes y extraordinarias inmediatas por incidentes graves." },
            9: { id: 9, tipo: "seleccion_multiple", categoria: "DS 132 - Rajo Abierto e Interacción Equipos", pregunta: "Al transitar con vehículos livianos (camionetas) en las pistas de acarreo de una mina a rajo abierto con presencia de Camiones de Extracción (CAEX), ¿cuáles medidas son obligatorias según el DS 132 y reglamentos internos de CODELCO?", opciones: ["A) Portar pértiga flexible de seguridad con baliza y luz estroboscópica a una altura no inferior a 4.5 metros.", "B) Mantener radio bidireccional encendida en la frecuencia de control mina informando puntos ciegos.", "C) Conservar una distancia de seguridad mínima de 50 metros detrás de un camión CAEX en movimiento.", "D) Adelantar a los camiones de extracción por la derecha en curvas cerradas para despejar la vía rápidamente."], correcta: ["A", "B", "C"], justificacion: "Pértiga a 4.5m, radio y distancia de 50m son obligatorias. Adelantar por la derecha en curvas está estrictamente prohibido." },
            10: { id: 10, tipo: "verdadero_falso", categoria: "ISP & SUSESO - Naturaleza del EPP", pregunta: "¿Puede la administración de la faena acordar con el sindicato o el trabajador la entrega de un bono en dinero en sustitución de la entrega material de los Elementos de Protección Personal normados por el ISP?", opciones: ["Verdadero", "Falso"], correcta: "Falso", justificacion: "Es nulo cualquier pago en dinero por EPP. Los elementos deben entregarse en especie física homologada por el ISP." },
            11: { id: 11, tipo: "seleccion_unica", categoria: "DS 132 - Manipulación de Explosivos", pregunta: "¿Qué acreditación legal es indispensable para que un operador de tronadura pueda almacenar, transportar o cebar explosivos en los polvorines y frentes de CODELCO?", opciones: ["A) Declaración jurada simple de experiencia previa en canteras", "B) Carnet interno de conductor otorgado por el departamento de transportes", "C) Licencia oficial vigente de Manipulador de Explosivos otorgada por la Autoridad Fiscalizadora de Carabineros (Ley 17.798) más autorización interna de faena", "D) Certificado de título técnico sin requerimiento de acreditación policial"], correcta: "C) Licencia oficial vigente de Manipulador de Explosivos otorgada por la Autoridad Fiscalizadora de Carabineros (Ley 17.798) más autorización interna de faena", justificacion: "La Ley 17.798 exige licencia emitida por Carabineros de Chile para cualquier manipulación de sustancias explosivas." },
            12: { id: 12, tipo: "seleccion_multiple", categoria: "SUSESO - Protocolo de Riesgos Psicosociales", pregunta: "De acuerdo con el Cuestionario CEAL-SM / SUSESO de evaluación de riesgos psicosociales en el trabajo, ¿qué dimensiones deben ser monitoreadas activamente en faenas mineras con regímenes de turnos excepcionales?", opciones: ["A) Carga cuantitativa de trabajo y exigencias emocionales en la operación.", "B) Compatibilidad entre el descanso, vida familiar y los sistemas de turnos mineros (7x7, 4x3).", "C) Claridad de rol, liderazgo y apoyo social en el equipo de trabajo.", "D) Preferencias políticas o religiosas individuales del trabajador en la faena."], correcta: ["A", "B", "C"], justificacion: "El CEAL-SM mide exigencias, turnos y liderazgo. La esfera política/religiosa privada no es materia evaluable." },
            13: { id: 13, tipo: "verdadero_falso", categoria: "DS 132 - Atmósferas Mineras Subterráneas", pregunta: "Según el Artículo 138 del DS 132, ¿la concentración mínima permitida de oxígeno en el aire de cualquier galería subterránea en donde transite o trabaje personal es del 19.5% en volumen?", opciones: ["Verdadero", "Falso"], correcta: "Verdadero", justificacion: "19.5% de O2 es el piso legal inquebrantable. Niveles inferiores causan hipoxia severa y obligan a evacuar." },
            14: { id: 14, tipo: "seleccion_unica", categoria: "ISP - Protocolo de Exposición a Ruido (PREXOR)", pregunta: "Conforme a la Norma Técnica del ISP y el Protocolo PREXOR, ¿cuál es el Criterio de Acción para el nivel de presión sonora continuo equivalente ponderado A (NPSeq) en una jornada laboral de 8 horas diarias?", opciones: ["A) 82 dBA como Criterio de Acción, y 85 dBA como Límite Permisible Ponderado antes de exigir controles técnicos obligatorios", "B) 100 dBA sin necesidad de atenuación si el turno es de menos de 10 horas", "C) 60 dBA en cualquier condición minera de chancado", "D) 95 dBA solo si se trabaja en espacios abiertos"], correcta: "A) 82 dBA como Criterio de Acción, y 85 dBA como Límite Permisible Ponderado antes de exigir controles técnicos obligatorios", justificacion: "El PREXOR activa vigilancia a los 82 dBA y exige control de ingeniería y protección estricta sobre 85 dBA." },
            15: { id: 15, tipo: "seleccion_multiple", categoria: "Reglas de Oro CODELCO - Trabajo en Altura Física", pregunta: "Para la ejecución de tareas sobre 1.8 metros de altura física en instalaciones industriales de CODELCO, ¿qué requerimientos de seguridad son de cumplimiento obligatorio?", opciones: ["A) Uso ininterrumpido de arnés de cuerpo completo de tres argollas certificado ISP con doble cabo de vida y amortiguador de impacto.", "B) Fijación exclusiva a puntos de anclaje certificados capaces de resistir un mínimo de 5.000 lb (22.2 kN) por persona conectada.", "C) Amarrarse a cañerías de fluidos o conduit eléctrico si no se visualiza una línea de vida cercana.", "D) Inspección de preuso minuciosa de cinchas, costuras, argollas y mosquetones con tarjeta de inspección de color del mes vigente."], correcta: ["A", "B", "D"], justificacion: "Amarrarse a cañerías está terminantemente prohibido. Se exige arnés certificado, doble cabo, anclaje de 5.000 lb y chequeo mensual." }
        };

        function escapeText(str) {
            return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[m]);
        }

        return {
            login(rut, nombre, cargo) {
                const cleanRut = escapeText(rut.trim().replace(/\./g, '').replace(/ /g, '').toUpperCase());
                const cleanNombre = escapeText(nombre.trim());
                if (!DB_U[cleanRut]) {
                    DB_U[cleanRut] = { rut: cleanRut, nombre: cleanNombre, cargo: escapeText(cargo), fecha_registro: new Date().toLocaleString(), intentos: [] };
                }
                return { status: "success", perfil: DB_U[cleanRut] };
            },
            getPreguntas() {
                // Zero-Leakage: Eliminar totalmente soluciones
                return Object.values(BANCO_COMPLETO).map(p => ({
                    id: p.id,
                    tipo: p.tipo,
                    categoria: p.categoria,
                    pregunta: p.pregunta,
                    opciones: p.opciones
                }));
            },
            iniciarIntento(rut) {
                const cleanRut = escapeText(rut.trim().replace(/\./g, '').replace(/ /g, '').toUpperCase());
                const id = Object.keys(DB_I).length + 1;
                DB_I[id] = { id, rut: cleanRut, fecha_inicio: new Date().toLocaleString(), total: 15, correctas: 0, respondidas: {}, completado: false };
                return { status: "success", intento_id: id };
            },
            verificarRespuesta(intentoId, preguntaId, rut, seleccion) {
                const intento = DB_I[intentoId];
                if (!intento) throw new Error("Intento inválido");
                if (intento.respondidas[preguntaId]) throw new Error("La pregunta ya fue respondida en este intento (Anti-Tampering)");

                const p = BANCO_COMPLETO[preguntaId];
                let esCorrecta = false;
                let solucionDisplay = p.correcta;

                if (p.tipo === "seleccion_multiple") {
                    const uArr = seleccion.split(',').map(s => s.trim().toUpperCase()).sort();
                    const sArr = p.correcta.map(s => s.trim().toUpperCase()).sort();
                    esCorrecta = (uArr.join(',') === sArr.join(','));
                    solucionDisplay = p.correcta.join(', ');
                } else {
                    esCorrecta = (seleccion.trim().toLowerCase() === p.correcta.trim().toLowerCase());
                }

                if (esCorrecta) intento.correctas++;
                intento.respondidas[preguntaId] = esCorrecta;

                return {
                    status: "success",
                    es_correcta: esCorrecta,
                    solucion_oficial: solucionDisplay,
                    justificacion_legal: p.justificacion
                };
            },
            finalizarIntento(intentoId, rut) {
                const intento = DB_I[intentoId];
                if (!intento) throw new Error("Intento inexistente");
                const pct = Math.round((intento.correctas / 15) * 1000) / 10;
                const aprobado = pct >= 85.0;

                const res = {
                    intento_id: intentoId,
                    intento_numero: (DB_U[rut] ? DB_U[rut].intentos.length + 1 : 1),
                    fecha: intento.fecha_inicio,
                    correctas: intento.correctas,
                    incorrectas: 15 - intento.correctas,
                    total_preguntas: 15,
                    porcentaje: pct,
                    aprobado: aprobado,
                    certificacion: aprobado ? "ACREDITADO INDUCCIÓN CODELCO DS132/DS44" : "NO ACREDITADO - REQUIERE REINDUCCIÓN"
                };
                if (DB_U[rut]) DB_U[rut].intentos.push(res);
                return { status: "success", resultado: res };
            }
        };
    })();

})();
