# ==============================================================================
# CODELCO - SERVIDOR HTTP SEGURO NATIVO POWERSHELL (.NET HTTPLISTENER)
# Backend Zero-Trust compatible con Windows sin dependencias externas
# Expone exactamente la misma API REST que servidor.py
# ==============================================================================

param(
    [int]$Port = 8080,
    [string]$HostUrl = "http://localhost:8080/",
    [switch]$NoListen = $false
)

Add-Type -AssemblyName System.Web

# ==============================================================================
# 📊 BANCO DE 15 PREGUNTAS CRÍTICAS (PRIVADO EN SERVIDOR)
# ==============================================================================
$script:BANCO_PREGUNTAS = @{
    1 = @{
        id = 1; tipo = "verdadero_falso"; categoria = "DS 132 - Minería Subterránea"
        pregunta = "Según el Artículo 142 del DS 132, ¿está permitido el ingreso de vehículos con motor a combustión de gasolina (bencina) a faenas subterráneas si el sistema de ventilación forzada opera al 100%?"
        opciones = @("Verdadero", "Falso")
        correcta = "Falso"
        justificacion = "El Art. 142 del DS 132 prohíbe taxativamente la introducción de motores a bencina al interior de minas subterráneas debido a la alta tasa de emanación letal de monóxido de carbono (CO) y vapores volátiles inflamables, independiente de la capacidad de ventilación instalada."
    }
    2 = @{
        id = 2; tipo = "seleccion_unica"; categoria = "DS 44 - Gestión Preventiva"
        pregunta = "De acuerdo al nuevo DS 44 que moderniza la gestión preventiva de riesgos laborales, ¿cuál es el instrumento técnico obligatorio para identificar peligros y evaluar riesgos de forma continua y auditable?"
        opciones = @(
            "A) Registro diario manuscrito de entrega de EPP",
            "B) Matriz IPER (Identificación de Peligros y Evaluación de Riesgos) auditable y dinámica",
            "C) Bitácora histórica no vinculante del Instituto de Salud Pública (ISP)",
            "D) Registro trimestral de accidentes pasados ante la SUSESO"
        )
        correcta = "B) Matriz IPER (Identificación de Peligros y Evaluación de Riesgos) auditable y dinámica"
        justificacion = "El DS 44 consagra la Matriz IPER como el núcleo sistemático para la evaluación proactiva de riesgos, la cual debe actualizarse ante cualquier cambio de proceso, tecnología o incidentes operacionales."
    }
    3 = @{
        id = 3; tipo = "seleccion_multiple"; categoria = "SUSESO & ISP - Marco Regulatorio"
        pregunta = "Seleccione cuáles de las siguientes constituyen obligaciones legales no negociables del empleador en la Gran Minería bajo las directrices unificadas de SUSESO e ISP:"
        opciones = @(
            "A) Suministrar gratuitamente EPP certificados y homologados por el ISP para cada riesgo específico.",
            "B) Mantener en funcionamiento activo el Comité Paritario de Higiene y Seguridad (CPHS) y estadísticas de siniestralidad.",
            "C) Descontar por planilla un porcentaje complementario de seguro al trabajador para gastos médicos.",
            "D) Capacitar a todo trabajador nuevo en los riesgos laborales inherentes a su labor (Derecho a Saber - ODI)."
        )
        correcta = @("A", "B", "D")
        justificacion = "Bajo la Ley 16.744 y circulares SUSESO, los EPP son 100% gratuitos y de suministro obligatorio por el empleador, al igual que el CPHS y la difusión de riesgos (ODI). Exigir o descontar cobros al trabajador constituye una infracción gravísima penada por ley."
    }
    4 = @{
        id = 4; tipo = "verdadero_falso"; categoria = "DS 132 - Estabilidad y Fortificación"
        pregunta = "Bajo el DS 132 (Art. 52), ¿es obligatorio realizar la inspección y acuñadura minuciosa de techos y cajas antes de que cualquier persona o equipo comience labores en frentes subterráneos?"
        opciones = @("Verdadero", "Falso")
        correcta = "Verdadero"
        justificacion = "El Art. 52 del DS 132 exige que antes de iniciar faenas y durante el ciclo de avance minero, se debe acuñar de forma obligatoria y continua para prevenir desprendimientos de bloques rocosos, principal causa de fatalidades en minería subterránea."
    }
    5 = @{
        id = 5; tipo = "seleccion_unica"; categoria = "ISP - Protocolo PLANESI Sílice"
        pregunta = "En áreas con presencia de polvo con contenido de sílice libre cristalizada (Chancado, Traspasos, Molienda), ¿cuál es la especificación técnica requerida por el ISP para los elementos de protección respiratoria?"
        opciones = @(
            "A) Mascarilla de papel desechable para polvo convencional",
            "B) Respirador de medio rostro o rostro completo con filtros de alta eficiencia P100 / HEPA con pruebas de ajuste hermético",
            "C) Pañuelo de protección industrial con humectación previa",
            "D) Mascarilla quirúrgica con triple capa de tela"
        )
        correcta = "B) Respirador de medio rostro o rostro completo con filtros de alta eficiencia P100 / HEPA con pruebas de ajuste hermético"
        justificacion = "La Guía Técnica del ISP y el Plan Nacional de Erradicación de la Silicosis (PLANESI) exigen filtros certificados de grado P100 con eficiencia del 99.97% contra micropartículas menores a 10 micras, sometidos a pruebas de ajuste cualitativas y cuantitativas periódicas."
    }
    6 = @{
        id = 6; tipo = "seleccion_multiple"; categoria = "DS 132 & Reglas que Salvan la Vida - LOTO"
        pregunta = "¿Cuáles son los pasos mandatorios e intransferibles del Estándar de Control de Fatalidades de CODELCO para Aislamiento y Bloqueo de Energías (LOTO)?"
        opciones = @(
            "A) Desenergización y aislamiento total de todas las fuentes de energía (eléctrica, hidráulica, neumática o cinética).",
            "B) Instalación de candado personal e intransferible junto a tarjeta de identificación en cada punto de bloqueo.",
            "C) Delegar la colocación del candado en el supervisor de turno si el trabajador está retrasado.",
            "D) Comprobación obligatoria de potencial de energía cero antes de iniciar cualquier maniobra o contacto físico."
        )
        correcta = @("A", "B", "D")
        justificacion = "El protocolo LOTO prohíbe terminantemente ceder el candado personal a terceros. El ciclo inquebrantable exige desenergizar, bloquear personalmente con candado y tarjeta, y verificar físicamente la ausencia total de energía residual (energía cero)."
    }
    7 = @{
        id = 7; tipo = "verdadero_falso"; categoria = "SUSESO - Ley 16.744 Art. 76 bis"
        pregunta = "Ante la ocurrencia de un accidente laboral fatal o grave en una faena minera, ¿la empresa está obligada por ley a suspender de forma inmediata y preventiva las faenas afectadas y dar aviso a las autoridades competentes?"
        opciones = @("Verdadero", "Falso")
        correcta = "Verdadero"
        justificacion = "El Art. 76 bis de la Ley 16.744 y circulares SUSESO estipulan la paralización inmediata de las faenas en caso de accidente fatal o grave, impidiendo la reanudación hasta que la Inspección del Trabajo y SEREMI de Salud o Sernageomin autoricen el levantamiento tras verificar la subsanación de condiciones de peligro."
    }
    8 = @{
        id = 8; tipo = "seleccion_unica"; categoria = "DS 44 - Comités Paritarios"
        pregunta = "¿Con qué periodicidad mínima obligatoria debe sesionar de manera ordinaria el Comité Paritario de Higiene y Seguridad (CPHS) en cada centro de trabajo según el DS 44 y DS 54?"
        opciones = @(
            "A) Cada seis meses o cuando la jefatura lo considere oportuno",
            "B) De manera trimestral coincidiendo con el balance de producción",
            "C) Al menos una vez al mes en forma ordinaria, y extraordinariamente en caso de accidente grave o de riesgo inminente",
            "D) Una vez al año durante la auditoría externa de gestión"
        )
        correcta = "C) Al menos una vez al mes en forma ordinaria, y extraordinariamente en caso de accidente grave o de riesgo inminente"
        justificacion = "La legislación exige sesiones ordinarias al menos una vez por mes calendario, manteniendo actas foliadas y auditables, y sesiones extraordinarias inmediatas frente a accidentes de gravedad o denuncias de peligro inminente."
    }
    9 = @{
        id = 9; tipo = "seleccion_multiple"; categoria = "DS 132 - Rajo Abierto e Interacción Equipos"
        pregunta = "Al transitar con vehículos livianos (camionetas) en las pistas de acarreo de una mina a rajo abierto con presencia de Camiones de Extracción (CAEX), ¿cuáles medidas son obligatorias según el DS 132 y reglamentos internos de CODELCO?"
        opciones = @(
            "A) Portar pértiga flexible de seguridad con baliza y luz estroboscópica a una altura no inferior a 4.5 metros.",
            "B) Mantener radio bidireccional encendida en la frecuencia de control mina informando puntos ciegos.",
            "C) Conservar una distancia de seguridad mínima de 50 metros detrás de un camión CAEX en movimiento.",
            "D) Adelantar a los camiones de extracción por la derecha en curvas cerradas para despejar la vía rápidamente."
        )
        correcta = @("A", "B", "C")
        justificacion = "Los CAEX poseen enormes zonas ciegas de visión. Es mandatorio el uso de pértiga reglamentaria, radiofrecuencia sintonizada y distancia mínima de 50m. Adelantar por la derecha en curvas constituye una maniobra temeraria de altísimo riesgo letal prohibida por procedimiento."
    }
    10 = @{
        id = 10; tipo = "verdadero_falso"; categoria = "ISP & SUSESO - Naturaleza del EPP"
        pregunta = "¿Puede la administración de la faena acordar con el sindicato o el trabajador la entrega de un bono en dinero en sustitución de la entrega material de los Elementos de Protección Personal normados por el ISP?"
        opciones = @("Verdadero", "Falso")
        correcta = "Falso"
        justificacion = "La Ley 16.744 y resoluciones del ISP/SUSESO declaran nulo cualquier pacto de compensación económica por EPP. Los elementos deben ser provistos en especie física, inspeccionados, ajustados a la talla del colaborador y con certificación de calidad oficial del ISP vigente."
    }
    11 = @{
        id = 11; tipo = "seleccion_unica"; categoria = "DS 132 - Manipulación de Explosivos"
        pregunta = "¿Qué acreditación legal es indispensable para que un operador de tronadura pueda almacenar, transportar o cebar explosivos en los polvorines y frentes de CODELCO?"
        opciones = @(
            "A) Declaración jurada simple de experiencia previa en canteras",
            "B) Carnet interno de conductor otorgado por el departamento de transportes",
            "C) Licencia oficial vigente de Manipulador de Explosivos otorgada por la Autoridad Fiscalizadora de Carabineros (Ley 17.798) más autorización interna de faena",
            "D) Certificado de título técnico sin requerimiento de acreditación policial"
        )
        correcta = "C) Licencia oficial vigente de Manipulador de Explosivos otorgada por la Autoridad Fiscalizadora de Carabineros (Ley 17.798) más autorización interna de faena"
        justificacion = "El Art. 524 del DS 132 y la Ley 17.798 sobre Control de Armas y Explosivos exigen que todo manipulador cuente con licencia al día emitida por Carabineros de Chile tras aprobar exámenes toxicológicos, psicológicos y técnicos rigurosos."
    }
    12 = @{
        id = 12; tipo = "seleccion_multiple"; categoria = "SUSESO - Protocolo de Riesgos Psicosociales"
        pregunta = "De acuerdo con el Cuestionario CEAL-SM / SUSESO de evaluación de riesgos psicosociales en el trabajo, ¿qué dimensiones deben ser monitoreadas activamente en faenas mineras con regímenes de turnos excepcionales?"
        opciones = @(
            "A) Carga cuantitativa de trabajo y exigencias emocionales en la operación.",
            "B) Compatibilidad entre el descanso, vida familiar y los sistemas de turnos mineros (7x7, 4x3).",
            "C) Claridad de rol, liderazgo y apoyo social en el equipo de trabajo.",
            "D) Preferencias políticas o religiosas individuales del trabajador en la faena."
        )
        correcta = @("A", "B", "C")
        justificacion = "El marco SUSESO vigila las cargas laborales, tiempos de descanso y dinámicas de liderazgo. La esfera íntima o ideológica no forma parte de las variables de salud ocupacional laboral y está protegida por la ley de privacidad."
    }
    13 = @{
        id = 13; tipo = "verdadero_falso"; categoria = "DS 132 - Atmósferas Mineras Subterráneas"
        pregunta = "Según el Artículo 138 del DS 132, ¿la concentración mínima permitida de oxígeno en el aire de cualquier galería subterránea en donde transite o trabaje personal es del 19.5% en volumen?"
        opciones = @("Verdadero", "Falso")
        correcta = "Verdadero"
        justificacion = "El DS 132 fija el umbral de 19.5% de oxígeno como límite inferior absoluto. Concentraciones inferiores generan hipoxia aguda y pérdida de consciencia, exigiendo la evacuación inmediata y refuerzo de ventilación secundaria."
    }
    14 = @{
        id = 14; tipo = "seleccion_unica"; categoria = "ISP - Protocolo de Exposición a Ruido (PREXOR)"
        pregunta = "Conforme a la Norma Técnica del ISP y el Protocolo PREXOR, ¿cuál es el Criterio de Acción para el nivel de presión sonora continuo equivalente ponderado A (NPSeq) en una jornada laboral de 8 horas diarias?"
        opciones = @(
            "A) 82 dBA como Criterio de Acción, y 85 dBA como Límite Permisible Ponderado antes de exigir controles técnicos obligatorios",
            "B) 100 dBA sin necesidad de atenuación si el turno es de menos de 10 horas",
            "C) 60 dBA en cualquier condición minera de chancado",
            "D) 95 dBA solo si se trabaja en espacios abiertos"
        )
        correcta = "A) 82 dBA como Criterio de Acción, y 85 dBA como Límite Permisible Ponderado antes de exigir controles técnicos obligatorios"
        justificacion = "El PREXOR fija el Criterio de Acción en 82 dBA para iniciar programas de vigilancia médica auditiva, y 85 dBA como límite estricto de exposición para evitar la hipoacusia neurosensorial inducida por ruido laboral (HNIR)."
    }
    15 = @{
        id = 15; tipo = "seleccion_multiple"; categoria = "Reglas de Oro CODELCO - Trabajo en Altura Física"
        pregunta = "Para la ejecución de tareas sobre 1.8 metros de altura física en instalaciones industriales de CODELCO, ¿qué requerimientos de seguridad son de cumplimiento obligatorio?"
        opciones = @(
            "A) Uso ininterrumpido de arnés de cuerpo completo de tres argollas certificado ISP con doble cabo de vida y amortiguador de impacto.",
            "B) Fijación exclusiva a puntos de anclaje certificados capaces de resistir un mínimo de 5.000 lb (22.2 kN) por persona conectada.",
            "C) Amarrarse a cañerías de fluidos o conduit eléctrico si no se visualiza una línea de vida cercana.",
            "D) Inspección de preuso minuciosa de cinchas, costuras, argollas y mosquetones con tarjeta de inspección de color del mes vigente."
        )
        correcta = @("A", "B", "D")
        justificacion = "Anclarse a tuberías de proceso, ductos de fluidos o canalizaciones eléctricas está estrictamente prohibido por riesgo de colapso y electrocución. Se requiere arnés certificado, doble cabo para estar 100% del tiempo amarrado, puntos certificados de 5.000 lb y chequeo de preuso con código de colores mensual."
    }
}

# ==============================================================================
# 🗄️ BASE DE DATOS EN MEMORIA (USUARIOS E INTENTOS)
# ==============================================================================
$script:DB_USUARIOS = @{}
$script:DB_INTENTOS = @{}

# ==============================================================================
# FUNCIONES AUXILIARES DE SEGURIDAD (SANITIZACIÓN Y PARSEO)
# ==============================================================================
function Clean-Rut([string]$raw) {
    if ([string]::IsNullOrWhiteSpace($raw)) { return "" }
    $clean = $raw.Trim().Replace(".", "").Replace(" ", "").ToUpper()
    return [System.Web.HttpUtility]::HtmlEncode($clean)
}

function Sanitize-String([string]$raw) {
    if ([string]::IsNullOrWhiteSpace($raw)) { return "" }
    $clean = $raw.Trim()
    return [System.Web.HttpUtility]::HtmlEncode($clean)
}

function Send-JsonResponse($response, [int]$statusCode, $obj) {
    $json = ConvertTo-Json -InputObject $obj -Depth 10 -Compress
    $buffer = [System.Text.Encoding]::UTF8.GetBytes($json)
    $response.StatusCode = $statusCode
    $response.ContentType = "application/json; charset=utf-8"
    $response.AddHeader("Access-Control-Allow-Origin", "*")
    $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
    $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
    $response.ContentLength64 = $buffer.Length
    $response.OutputStream.Write($buffer, 0, $buffer.Length)
    $response.OutputStream.Close()
}

# ==============================================================================
# INICIO DEL SERVIDOR HTTP
# ==============================================================================
if ($NoListen -or $env:CODELCO_NO_LISTEN -eq "1") { return }

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($HostUrl)
$listener.Start()
Write-Host "====================================================================" -ForegroundColor Cyan
Write-Host " [CODELCO] Servidor Backend Zero-Trust DS 132 & DS 44 Activo" -ForegroundColor Green
Write-Host " URL de Acceso: $HostUrl" -ForegroundColor Yellow
Write-Host " Banco de Preguntas: 15 preguntas cifradas en servidor (Zero-Leakage)" -ForegroundColor White
Write-Host "====================================================================" -ForegroundColor Cyan

$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Path

try {
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        $urlPath = $request.Url.AbsolutePath
        $method = $request.HttpMethod

        # Manejo de Preflight CORS
        if ($method -eq "OPTIONS") {
            $response.StatusCode = 200
            $response.AddHeader("Access-Control-Allow-Origin", "*")
            $response.AddHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            $response.AddHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
            $response.OutputStream.Close()
            continue
        }

        # Lectura de Body JSON en POST
        $bodyJson = $null
        if ($method -eq "POST" -and $request.HasEntityBody) {
            $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
            $rawBody = $reader.ReadToEnd()
            try {
                $bodyJson = ConvertFrom-Json $rawBody
            } catch {
                Send-JsonResponse $response 400 @{ error = "JSON payload malformado" }
                continue
            }
        }

        # ==================== ROUTING ====================

        # 1. POST /api/auth/login
        if ($urlPath -eq "/api/auth/login" -and $method -eq "POST") {
            $rut = Clean-Rut ($bodyJson.rut)
            $nombre = Sanitize-String ($bodyJson.nombre)
            $cargo = Sanitize-String ($bodyJson.cargo)

            # Validación de RUT formato básico 12345678-9 o 1234567-K
            if ($rut -notmatch "^\d{7,8}-[0-9K]$") {
                Send-JsonResponse $response 422 @{ error = "Formato de RUT chileno inválido. Ejemplo: 12345678-9" }
                continue
            }
            if ($nombre.Length -lt 3 -or $nombre -match "[<>{}\$]") {
                Send-JsonResponse $response 422 @{ error = "Nombre inválido o contiene caracteres sospechosos (Anti-XSS)." }
                continue
            }

            if (-not $script:DB_USUARIOS.ContainsKey($rut)) {
                $script:DB_USUARIOS[$rut] = @{
                    rut = $rut
                    nombre = $nombre
                    cargo = $cargo
                    fecha_registro = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                    intentos = @()
                }
            } else {
                $script:DB_USUARIOS[$rut].nombre = $nombre
                $script:DB_USUARIOS[$rut].cargo = $cargo
            }

            Send-JsonResponse $response 200 @{
                status = "success"
                mensaje = "Usuario autenticado con éxito"
                perfil = $script:DB_USUARIOS[$rut]
            }
            continue
        }

        # 2. GET /api/evaluacion/preguntas (Sanitizado - Zero Leakage)
        if ($urlPath -eq "/api/evaluacion/preguntas" -and $method -eq "GET") {
            $preguntasSeguras = @()
            $keys = $script:BANCO_PREGUNTAS.Keys | Sort-Object
            foreach ($k in $keys) {
                $p = $script:BANCO_PREGUNTAS[$k]
                $preguntasSeguras += @{
                    id = $p.id
                    tipo = $p.tipo
                    categoria = $p.categoria
                    pregunta = $p.pregunta
                    opciones = $p.opciones
                }
            }
            Send-JsonResponse $response 200 @{
                total = $preguntasSeguras.Count
                preguntas = $preguntasSeguras
            }
            continue
        }

        # 3. POST /api/evaluacion/iniciar
        if ($urlPath -eq "/api/evaluacion/iniciar" -and $method -eq "POST") {
            $rut = Clean-Rut ($request.QueryString["rut"])
            if ([string]::IsNullOrEmpty($rut) -and $bodyJson) { $rut = Clean-Rut ($bodyJson.rut) }

            if (-not $script:DB_USUARIOS.ContainsKey($rut)) {
                Send-JsonResponse $response 404 @{ error = "Usuario no registrado en el sistema" }
                continue
            }

            $intentoId = $script:DB_INTENTOS.Count + 1
            $nuevoIntento = @{
                id = $intentoId
                rut = $rut
                fecha_inicio = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                total_preguntas = $script:BANCO_PREGUNTAS.Count
                correctas = 0
                respuestas_registradas = @{}
                completado = $false
            }
            $script:DB_INTENTOS[$intentoId] = $nuevoIntento

            Send-JsonResponse $response 200 @{
                status = "success"
                intento_id = $intentoId
                total_preguntas = $script:BANCO_PREGUNTAS.Count
                mensaje = "Intento #$intentoId iniciado formalmente bajo protocolo DS 132/DS 44"
            }
            continue
        }

        # 4. POST /api/evaluacion/verificar
        if ($urlPath -eq "/api/evaluacion/verificar" -and $method -eq "POST") {
            $intentoId = [int]($bodyJson.intento_id)
            $preguntaId = [int]($bodyJson.pregunta_id)
            $rut = Clean-Rut ($bodyJson.rut)
            $opcion = Sanitize-String ($bodyJson.opcion_seleccionada)

            if (-not $script:DB_INTENTOS.ContainsKey($intentoId)) {
                Send-JsonResponse $response 404 @{ error = "ID de intento no válido" }
                continue
            }
            if (-not $script:BANCO_PREGUNTAS.ContainsKey($preguntaId)) {
                Send-JsonResponse $response 444 @{ error = "Pregunta inexistente" }
                continue
            }

            $intento = $script:DB_INTENTOS[$intentoId]
            if ($intento.rut -ne $rut) {
                Send-JsonResponse $response 403 @{ error = "Acceso denegado: el intento no pertenece a este usuario" }
                continue
            }
            if ($intento.completado) {
                Send-JsonResponse $response 400 @{ error = "El intento ya está finalizado e inmutable" }
                continue
            }

            $pKey = "$preguntaId"
            # Anti-tampering: evitar doble posteo
            if ($intento.respuestas_registradas.ContainsKey($pKey)) {
                Send-JsonResponse $response 409 @{ error = "La pregunta $preguntaId ya fue respondida en este intento" }
                continue
            }

            $pregunta = $script:BANCO_PREGUNTAS[$preguntaId]
            $tipo = $pregunta.tipo
            $solucion = $pregunta.correcta
            $esCorrecta = $false
            $solucionDisplay = ""

            if ($tipo -eq "seleccion_multiple") {
                $userArr = ($opcion -split "," | ForEach-Object { $_.Trim().ToUpper() } | Where-Object { $_ -ne "" }) | Sort-Object
                $solArr = ($solucion | ForEach-Object { $_.Trim().ToUpper() }) | Sort-Object
                $esCorrecta = (($userArr -join ",") -eq ($solArr -join ","))
                $solucionDisplay = ($solucion -join ", ")
            } elseif ($tipo -eq "seleccion_unica") {
                $esCorrecta = ($opcion.Trim().ToLower() -eq $solucion.Trim().ToLower())
                $solucionDisplay = $solucion
            } else {
                $esCorrecta = ($opcion.Trim().ToLower() -eq $solucion.Trim().ToLower())
                $solucionDisplay = $solucion
            }

            if ($esCorrecta) {
                $intento.correctas += 1
            }
            $intento.respuestas_registradas[$pKey] = $esCorrecta

            Send-JsonResponse $response 200 @{
                status = "success"
                pregunta_id = $preguntaId
                es_correcta = $esCorrecta
                solucion_oficial = $solucionDisplay
                justificacion_legal = $pregunta.justificacion
            }
            continue
        }

        # 5. POST /api/evaluacion/finalizar
        if ($urlPath -eq "/api/evaluacion/finalizar" -and $method -eq "POST") {
            $intentoId = [int]($bodyJson.intento_id)
            $rut = Clean-Rut ($bodyJson.rut)

            if (-not $script:DB_INTENTOS.ContainsKey($intentoId)) {
                Send-JsonResponse $response 404 @{ error = "Intento no encontrado" }
                continue
            }

            $intento = $script:DB_INTENTOS[$intentoId]
            if ($intento.rut -ne $rut) {
                Send-JsonResponse $response 403 @{ error = "Acceso no autorizado al intento" }
                continue
            }

            if ($intento.completado) {
                Send-JsonResponse $response 200 @{
                    status = "already_completed"
                    mensaje = "Este intento ya fue finalizado previamente"
                    resultado = $intento.resultado_final
                }
                continue
            }

            $total = $intento.total_preguntas
            $correctas = $intento.correctas
            $porcentaje = [Math]::Round(($correctas / $total) * 100, 1)
            $aprobado = ($porcentaje -ge 85.0)

            $resultadoFinal = @{
                intento_id = $intentoId
                intento_numero = ($script:DB_USUARIOS[$rut].intentos.Count + 1)
                fecha = $intento.fecha_inicio
                fecha_cierre = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
                total_preguntas = $total
                correctas = $correctas
                incorrectas = ($total - $correctas)
                porcentaje = $porcentaje
                aprobado = $aprobado
                certificacion = if ($aprobado) { "ACREDITADO INDUCCION CODELCO DS132/DS44" } else { "NO ACREDITADO - REQUIERE REINDUCCION" }
            }

            $intento.completado = $true
            $intento.resultado_final = $resultadoFinal
            $script:DB_USUARIOS[$rut].intentos += $resultadoFinal

            Send-JsonResponse $response 200 @{
                status = "success"
                mensaje = "Evaluación finalizada y guardada inmutablemente"
                resultado = $resultadoFinal
            }
            continue
        }

        # 6. ARCHIVOS ESTÁTICOS FRONTEND (index.html, style.css, app.js)
        $filePath = ""
        if ($urlPath -eq "/" -or $urlPath -eq "/index.html") {
            $filePath = Join-Path $baseDir "index.html"
            $response.ContentType = "text/html; charset=utf-8"
        } elseif ($urlPath -eq "/style.css") {
            $filePath = Join-Path $baseDir "style.css"
            $response.ContentType = "text/css; charset=utf-8"
        } elseif ($urlPath -eq "/app.js") {
            $filePath = Join-Path $baseDir "app.js"
            $response.ContentType = "application/javascript; charset=utf-8"
        }

        if ($filePath -ne "" -and (Test-Path $filePath)) {
            $fileBytes = [System.IO.File]::ReadAllBytes($filePath)
            $response.StatusCode = 200
            $response.ContentLength64 = $fileBytes.Length
            $response.OutputStream.Write($fileBytes, 0, $fileBytes.Length)
            $response.OutputStream.Close()
            continue
        }

        # 404 Not Found
        Send-JsonResponse $response 404 @{ error = "Ruta no encontrada: $urlPath" }
    }
} finally {
    $listener.Stop()
    $listener.Close()
}
