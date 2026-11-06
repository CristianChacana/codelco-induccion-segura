# ==============================================================================
# CODELCO - SISTEMA DE INDUCCIÓN Y EVALUACIÓN SEGURA EN PREVENCIÓN DE RIESGOS
# Normativa: DS 132 (Seguridad Minera), DS 44 (Gestión Preventiva), ISP y SUSESO
# Arquitectura: Zero-Trust Backend con Validación Server-Side Estricta
# ==============================================================================

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Union
from datetime import datetime
import re
import html

app = FastAPI(
    title="CODELCO - API Inducción Segura DS132 & DS44",
    description="Backend de alta seguridad para evaluación de competencias críticas en prevención de riesgos mineros.",
    version="2.0.0"
)

# Configuración de CORS estricto
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción acotar al dominio institucional Codelco
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ==============================================================================
# 📊 BANCO DE PREGUNTAS CRÍTICAS (ESTRICTAMENTE PRIVADO EN SERVIDOR)
# Ninguna respuesta correcta ni justificación legal se expone en la carga inicial.
# ==============================================================================
BANCO_PREGUNTAS: Dict[int, Dict[str, Any]] = {
    1: {
        "id": 1,
        "tipo": "verdadero_falso",
        "categoria": "DS 132 - Minería Subterránea",
        "pregunta": "Según el Artículo 142 del DS 132, ¿está permitido el ingreso de vehículos con motor a combustión de gasolina (bencina) a faenas subterráneas si el sistema de ventilación forzada opera al 100%?",
        "opciones": ["Verdadero", "Falso"],
        "correcta": "Falso",
        "justificacion": "El Art. 142 del DS 132 prohíbe taxativamente la introducción de motores a bencina al interior de minas subterráneas debido a la alta tasa de emanación letal de monóxido de carbono (CO) y vapores volátiles inflamables, independiente de la capacidad de ventilación instalada."
    },
    2: {
        "id": 2,
        "tipo": "seleccion_unica",
        "categoria": "DS 44 - Gestión Preventiva",
        "pregunta": "De acuerdo al nuevo DS 44 que moderniza la gestión preventiva de riesgos laborales, ¿cuál es el instrumento técnico obligatorio para identificar peligros y evaluar riesgos de forma continua y auditable?",
        "opciones": [
            "A) Registro diario manuscrito de entrega de EPP",
            "B) Matriz IPER (Identificación de Peligros y Evaluación de Riesgos) auditable y dinámica",
            "C) Bitácora histórica no vinculante del Instituto de Salud Pública (ISP)",
            "D) Registro trimestral de accidentes pasados ante la SUSESO"
        ],
        "correcta": "B) Matriz IPER (Identificación de Peligros y Evaluación de Riesgos) auditable y dinámica",
        "justificacion": "El DS 44 consagra la Matriz IPER como el núcleo sistemático para la evaluación proactiva de riesgos, la cual debe actualizarse ante cualquier cambio de proceso, tecnología o incidentes operacionales."
    },
    3: {
        "id": 3,
        "tipo": "seleccion_multiple",
        "categoria": "SUSESO & ISP - Marco Regulatorio",
        "pregunta": "Seleccione cuáles de las siguientes constituyen obligaciones legales no negociables del empleador en la Gran Minería bajo las directrices unificadas de SUSESO e ISP:",
        "opciones": [
            "A) Suministrar gratuitamente EPP certificados y homologados por el ISP para cada riesgo específico.",
            "B) Mantener en funcionamiento activo el Comité Paritario de Higiene y Seguridad (CPHS) y estadísticas de siniestralidad.",
            "C) Descontar por planilla un porcentaje complementario de seguro al trabajador para gastos médicos.",
            "D) Capacitar a todo trabajador nuevo en los riesgos laborales inherentes a su labor (Derecho a Saber - ODI)."
        ],
        "correcta": ["A", "B", "D"],
        "justificacion": "Bajo la Ley 16.744 y circulares SUSESO, los EPP son 100% gratuitos y de suministro obligatorio por el empleador, al igual que el CPHS y la difusión de riesgos (ODI). Exigir o descontar cobros al trabajador constituye una infracción gravísima penada por ley."
    },
    4: {
        "id": 4,
        "tipo": "verdadero_falso",
        "categoria": "DS 132 - Estabilidad y Fortificación",
        "pregunta": "Bajo el DS 132 (Art. 52), ¿es obligatorio realizar la inspección y acuñadura minuciosa de techos y cajas antes de que cualquier persona o equipo comience labores en frentes subterráneos?",
        "opciones": ["Verdadero", "Falso"],
        "correcta": "Verdadero",
        "justificacion": "El Art. 52 del DS 132 exige que antes de iniciar faenas y durante el ciclo de avance minero, se debe acuñar de forma obligatoria y continua para prevenir desprendimientos de bloques rocosos, principal causa de fatalidades en minería subterránea."
    },
    5: {
        "id": 5,
        "tipo": "seleccion_unica",
        "categoria": "ISP - Protocolo PLANESI Sílice",
        "pregunta": "En áreas con presencia de polvo con contenido de sílice libre cristalizada (Chancado, Traspasos, Molienda), ¿cuál es la especificación técnica requerida por el ISP para los elementos de protección respiratoria?",
        "opciones": [
            "A) Mascarilla de papel desechable para polvo convencional",
            "B) Respirador de medio rostro o rostro completo con filtros de alta eficiencia P100 / HEPA con pruebas de ajuste hermético",
            "C) Pañuelo de protección industrial con humectación previa",
            "D) Mascarilla quirúrgica con triple capa de tela"
        ],
        "correcta": "B) Respirador de medio rostro o rostro completo con filtros de alta eficiencia P100 / HEPA con pruebas de ajuste hermético",
        "justificacion": "La Guía Técnica del ISP y el Plan Nacional de Erradicación de la Silicosis (PLANESI) exigen filtros certificados de grado P100 con eficiencia del 99.97% contra micropartículas menores a 10 micras, sometidos a pruebas de ajuste cualitativas y cuantitativas periódicas."
    },
    6: {
        "id": 6,
        "tipo": "seleccion_multiple",
        "categoria": "DS 132 & Reglas que Salvan la Vida - LOTO",
        "pregunta": "¿Cuáles son los pasos mandatorios e intransferibles del Estándar de Control de Fatalidades de CODELCO para Aislamiento y Bloqueo de Energías (LOTO)?",
        "opciones": [
            "A) Desenergización y aislamiento total de todas las fuentes de energía (eléctrica, hidráulica, neumática o cinética).",
            "B) Instalación de candado personal e intransferible junto a tarjeta de identificación en cada punto de bloqueo.",
            "C) Delegar la colocación del candado en el supervisor de turno si el trabajador está retrasado.",
            "D) Comprobación obligatoria de potencial de energía cero antes de iniciar cualquier maniobra o contacto físico."
        ],
        "correcta": ["A", "B", "D"],
        "justificacion": "El protocolo LOTO prohíbe terminantemente ceder el candado personal a terceros. El ciclo inquebrantable exige desenergizar, bloquear personalmente con candado y tarjeta, y verificar físicamente la ausencia total de energía residual (energía cero)."
    },
    7: {
        "id": 7,
        "tipo": "verdadero_falso",
        "categoria": "SUSESO - Ley 16.744 Art. 76 bis",
        "pregunta": "Ante la ocurrencia de un accidente laboral fatal o grave en una faena minera, ¿la empresa está obligada por ley a suspender de forma inmediata y preventiva las faenas afectadas y dar aviso a las autoridades competentes?",
        "opciones": ["Verdadero", "Falso"],
        "correcta": "Verdadero",
        "justificacion": "El Art. 76 bis de la Ley 16.744 y circulares SUSESO estipulan la paralización inmediata de las faenas en caso de accidente fatal o grave, impidiendo la reanudación hasta que la Inspección del Trabajo y SEREMI de Salud o Sernageomin autoricen el levantamiento tras verificar la subsanación de condiciones de peligro."
    },
    8: {
        "id": 8,
        "tipo": "seleccion_unica",
        "categoria": "DS 44 - Comités Paritarios",
        "pregunta": "¿Con qué periodicidad mínima obligatoria debe sesionar de manera ordinaria el Comité Paritario de Higiene y Seguridad (CPHS) en cada centro de trabajo según el DS 44 y DS 54?",
        "opciones": [
            "A) Cada seis meses o cuando la jefatura lo considere oportuno",
            "B) De manera trimestral coincidiendo con el balance de producción",
            "C) Al menos una vez al mes en forma ordinaria, y extraordinariamente en caso de accidente grave o de riesgo inminente",
            "D) Una vez al año durante la auditoría externa de gestión"
        ],
        "correcta": "C) Al menos una vez al mes en forma ordinaria, y extraordinariamente en caso de accidente grave o de riesgo inminente",
        "justificacion": "La legislación exige sesiones ordinarias al menos una vez por mes calendario, manteniendo actas foliadas y auditables, y sesiones extraordinarias inmediatas frente a accidentes de gravedad o denuncias de peligro inminente."
    },
    9: {
        "id": 9,
        "tipo": "seleccion_multiple",
        "categoria": "DS 132 - Rajo Abierto e Interacción Equipos",
        "pregunta": "Al transitar con vehículos livianos (camionetas) en las pistas de acarreo de una mina a rajo abierto con presencia de Camiones de Extracción (CAEX), ¿cuáles medidas son obligatorias según el DS 132 y reglamentos internos de CODELCO?",
        "opciones": [
            "A) Portar pértiga flexible de seguridad con baliza y luz estroboscópica a una altura no inferior a 4.5 metros.",
            "B) Mantener radio bidireccional encendida en la frecuencia de control mina informando puntos ciegos.",
            "C) Conservar una distancia de seguridad mínima de 50 metros detrás de un camión CAEX en movimiento.",
            "D) Adelantar a los camiones de extracción por la derecha en curvas cerradas para despejar la vía rápidamente."
        ],
        "correcta": ["A", "B", "C"],
        "justificacion": "Los CAEX poseen enormes zonas ciegas de visión. Es mandatorio el uso de pértiga reglamentaria, radiofrecuencia sintonizada y distancia mínima de 50m. Adelantar por la derecha en curvas constituye una maniobra temeraria de altísimo riesgo letal prohibida por procedimiento."
    },
    10: {
        "id": 10,
        "tipo": "verdadero_falso",
        "categoria": "ISP & SUSESO - Naturaleza del EPP",
        "pregunta": "¿Puede la administración de la faena acordar con el sindicato o el trabajador la entrega de un bono en dinero en sustitución de la entrega material de los Elementos de Protección Personal normados por el ISP?",
        "opciones": ["Verdadero", "Falso"],
        "correcta": "Falso",
        "justificacion": "La Ley 16.744 y resoluciones del ISP/SUSESO declaran nulo cualquier pacto de compensación económica por EPP. Los elementos deben ser provistos en especie física, inspeccionados, ajustados a la talla del colaborador y con certificación de calidad oficial del ISP vigente."
    },
    11: {
        "id": 11,
        "tipo": "seleccion_unica",
        "categoria": "DS 132 - Manipulación de Explosivos",
        "pregunta": "¿Qué acreditación legal es indispensable para que un operador de tronadura pueda almacenar, transportar o cebar explosivos en los polvorines y frentes de CODELCO?",
        "opciones": [
            "A) Declaración jurada simple de experiencia previa en canteras",
            "B) Carnet interno de conductor otorgado por el departamento de transportes",
            "C) Licencia oficial vigente de Manipulador de Explosivos otorgada por la Autoridad Fiscalizadora de Carabineros (Ley 17.798) más autorización interna de faena",
            "D) Certificado de título técnico sin requerimiento de acreditación policial"
        ],
        "correcta": "C) Licencia oficial vigente de Manipulador de Explosivos otorgada por la Autoridad Fiscalizadora de Carabineros (Ley 17.798) más autorización interna de faena",
        "justificacion": "El Art. 524 del DS 132 y la Ley 17.798 sobre Control de Armas y Explosivos exigen que todo manipulador cuente con licencia al día emitida por Carabineros de Chile tras aprobar exámenes toxicológicos, psicológicos y técnicos rigurosos."
    },
    12: {
        "id": 12,
        "tipo": "seleccion_multiple",
        "categoria": "SUSESO - Protocolo de Riesgos Psicosociales",
        "pregunta": "De acuerdo con el Cuestionario CEAL-SM / SUSESO de evaluación de riesgos psicosociales en el trabajo, ¿qué dimensiones deben ser monitoreadas activamente en faenas mineras con regímenes de turnos excepcionales?",
        "opciones": [
            "A) Carga cuantitativa de trabajo y exigencias emocionales en la operación.",
            "B) Compatibilidad entre el descanso, vida familiar y los sistemas de turnos mineros (7x7, 4x3).",
            "C) Claridad de rol, liderazgo y apoyo social en el equipo de trabajo.",
            "D) Preferencias políticas o religiosas individuales del trabajador en la faena."
        ],
        "correcta": ["A", "B", "C"],
        "justificacion": "El marco SUSESO vigila las cargas laborales, tiempos de descanso y dinámicas de liderazgo. La esfera íntima o ideológica no forma parte de las variables de salud ocupacional laboral y está protegida por la ley de privacidad."
    },
    13: {
        "id": 13,
        "tipo": "verdadero_falso",
        "categoria": "DS 132 - Atmósferas Mineras Subterráneas",
        "pregunta": "Según el Artículo 138 del DS 132, ¿la concentración mínima permitida de oxígeno en el aire de cualquier galería subterránea en donde transite o trabaje personal es del 19.5% en volumen?",
        "opciones": ["Verdadero", "Falso"],
        "correcta": "Verdadero",
        "justificacion": "El DS 132 fija el umbral de 19.5% de oxígeno como límite inferior absoluto. Concentraciones inferiores generan hipoxia aguda y pérdida de consciencia, exigiendo la evacuación inmediata y refuerzo de ventilación secundaria."
    },
    14: {
        "id": 14,
        "tipo": "seleccion_unica",
        "categoria": "ISP - Protocolo de Exposición a Ruido (PREXOR)",
        "pregunta": "Conforme a la Norma Técnica del ISP y el Protocolo PREXOR, ¿cuál es el Criterio de Acción para el nivel de presión sonora continuo equivalente ponderado A (NPSeq) en una jornada laboral de 8 horas diarias?",
        "opciones": [
            "A) 82 dBA como Criterio de Acción, y 85 dBA como Límite Permisible Ponderado antes de exigir controles técnicos obligatorios",
            "B) 100 dBA sin necesidad de atenuación si el turno es de menos de 10 horas",
            "C) 60 dBA en cualquier condición minera de chancado",
            "D) 95 dBA solo si se trabaja en espacios abiertos"
        ],
        "correcta": "A) 82 dBA como Criterio de Acción, y 85 dBA como Límite Permisible Ponderado antes de exigir controles técnicos obligatorios",
        "justificacion": "El PREXOR fija el Criterio de Acción en 82 dBA para iniciar programas de vigilancia médica auditiva, y 85 dBA como límite estricto de exposición para evitar la hipoacusia neurosensorial inducida por ruido laboral (HNIR)."
    },
    15: {
        "id": 15,
        "tipo": "seleccion_multiple",
        "categoria": "Reglas de Oro CODELCO - Trabajo en Altura Física",
        "pregunta": "Para la ejecución de tareas sobre 1.8 metros de altura física en instalaciones industriales de CODELCO, ¿qué requerimientos de seguridad son de cumplimiento obligatorio?",
        "opciones": [
            "A) Uso ininterrumpido de arnés de cuerpo completo de tres argollas certificado ISP con doble cabo de vida y amortiguador de impacto.",
            "B) Fijación exclusiva a puntos de anclaje certificados capaces de resistir un mínimo de 5.000 lb (22.2 kN) por persona conectada.",
            "C) Amarrarse a cañerías de fluidos o conduit eléctrico si no se visualiza una línea de vida cercana.",
            "D) Inspección de preuso minuciosa de cinchas, costuras, argollas y mosquetones con tarjeta de inspección de color del mes vigente."
        ],
        "correcta": ["A", "B", "D"],
        "justificacion": "Anclarse a tuberías de proceso, ductos de fluidos o canalizaciones eléctricas está estrictamente prohibido por riesgo de colapso y electrocución. Se requiere arnés certificado, doble cabo para estar 100% del tiempo amarrado, puntos certificados de 5.000 lb y chequeo de preuso con código de colores mensual."
    }
}

# ==============================================================================
# 🗄️ BASE DE DATOS EN MEMORIA (USUARIOS, INTENTOS Y DETALLES)
# ==============================================================================
DB_USUARIOS: Dict[str, Dict[str, Any]] = {}
DB_INTENTOS: Dict[int, Dict[str, Any]] = {}

# ==============================================================================
# 📝 MODELOS DE DATOS Y SANITIZACIÓN ROBUSTA (ANTI-XSS & ANTI-INJECTION)
# ==============================================================================
class LoginRequest(BaseModel):
    rut: str = Field(..., description="RUT chileno con o sin puntos y con guión", min_length=7, max_length=15)
    nombre: str = Field(..., description="Nombre completo del trabajador", min_length=3, max_length=100)
    cargo: str = Field(..., description="Cargo o especialidad en faena", min_length=2, max_length=100)

    @validator("rut")
    def validar_y_sanitizar_rut(cls, v):
        # Limpieza de espacios y normalización
        rut_limpio = v.strip().replace(".", "").replace(" ", "").upper()
        # Validación estricta formato: dígitos seguidos de guión y dígito verificador (0-9 o K)
        if not re.match(r"^\d{7,8}-[0-9K]$", rut_limpio):
            raise ValueError("Formato de RUT inválido. Ejemplo: 12345678-9 o 9876543-K")
        return html.escape(rut_limpio)

    @validator("nombre", "cargo")
    def sanitizar_texto(cls, v):
        # Neutralización inmediata contra XSS y caracteres maliciosos
        texto_limpio = html.escape(v.strip())
        if re.search(r"[<>{}\$]", texto_limpio):
            raise ValueError("El campo contiene caracteres no permitidos.")
        return texto_limpio

class VerificarRespuestaRequest(BaseModel):
    rut: str
    intento_id: int
    pregunta_id: int
    opcion_seleccionada: str  # Para selección múltiple se espera formato separado por comas: "A,B,D"

    @validator("rut")
    def limpiar_rut(cls, v):
        return html.escape(v.strip().replace(".", "").replace(" ", "").upper())

    @validator("opcion_seleccionada")
    def sanitizar_opcion(cls, v):
        return html.escape(v.strip())

class FinalizarIntentoRequest(BaseModel):
    intento_id: int
    rut: str

    @validator("rut")
    def limpiar_rut(cls, v):
        return html.escape(v.strip().replace(".", "").replace(" ", "").upper())

# ==============================================================================
# 🎛️ ENDPOINTS SEGUROS DE LA API (ZERO-TRUST)
# ==============================================================================

@app.post("/api/auth/login", summary="Autenticación segura y consulta de historial de intentos")
def login(datos: LoginRequest):
    rut = datos.rut
    if rut not in DB_USUARIOS:
        DB_USUARIOS[rut] = {
            "rut": rut,
            "nombre": datos.nombre,
            "cargo": datos.cargo,
            "fecha_registro": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "intentos": []
        }
    else:
        # Actualiza cargo o nombre si fue modificado
        DB_USUARIOS[rut]["nombre"] = datos.nombre
        DB_USUARIOS[rut]["cargo"] = datos.cargo

    return {
        "status": "success",
        "mensaje": "Acceso concedido al sistema de inducción CODELCO",
        "perfil": DB_USUARIOS[rut]
    }

@app.get("/api/evaluacion/preguntas", summary="Obtener preguntas sanitizadas (Sin respuestas ni justificaciones)")
def obtener_preguntas():
    """
    Retorna el listado completo de preguntas para la evaluación sin revelar
    en ningún momento las soluciones ni las explicaciones al navegador del cliente.
    """
    preguntas_cliente = []
    for p_id in sorted(BANCO_PREGUNTAS.keys()):
        p = BANCO_PREGUNTAS[p_id]
        preguntas_cliente.append({
            "id": p["id"],
            "tipo": p["tipo"],
            "categoria": p["categoria"],
            "pregunta": p["pregunta"],
            "opciones": p["opciones"]
        })
    return {
        "total": len(preguntas_cliente),
        "preguntas": preguntas_cliente
    }

@app.post("/api/evaluacion/iniciar", summary="Inicializar un nuevo intento de evaluación")
def iniciar_evaluacion(rut: str):
    rut_limpio = html.escape(rut.strip().replace(".", "").replace(" ", "").upper())
    if rut_limpio not in DB_USUARIOS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no registrado en el sistema")

    intento_id = len(DB_INTENTOS) + 1
    nuevo_intento = {
        "id": intento_id,
        "rut": rut_limpio,
        "fecha_inicio": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_preguntas": len(BANCO_PREGUNTAS),
        "correctas": 0,
        "respuestas_registradas": {},  # str(pregunta_id) -> bool
        "completado": False
    }
    DB_INTENTOS[intento_id] = nuevo_intento

    return {
        "status": "success",
        "intento_id": intento_id,
        "total_preguntas": len(BANCO_PREGUNTAS),
        "mensaje": f"Intento #{intento_id} iniciado formalmente bajo protocolo DS 132/DS 44"
    }

@app.post("/api/evaluacion/verificar", summary="Validación server-side de respuesta individual")
def verificar_respuesta(data: VerificarRespuestaRequest):
    if data.intento_id not in DB_INTENTOS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="ID de intento no válido o expirado")
    if data.pregunta_id not in BANCO_PREGUNTAS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pregunta solicitada inexistente")

    intento = DB_INTENTOS[data.intento_id]

    # Validación de identidad del intento
    if intento["rut"] != data.rut:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso denegado: el intento no pertenece a este usuario")

    if intento["completado"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Este intento ya fue finalizado e inmutabilizado")

    p_key = str(data.pregunta_id)
    # Prevención anti-tampering: No se permite responder dos veces la misma pregunta en el mismo intento
    if p_key in intento["respuestas_registradas"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"La pregunta {data.pregunta_id} ya fue respondida y evaluada en este intento."
        )

    pregunta_servidor = BANCO_PREGUNTAS[data.pregunta_id]
    tipo = pregunta_servidor["tipo"]
    solucion_real = pregunta_servidor["correcta"]
    es_correcta = False

    if tipo == "seleccion_multiple":
        # Formato esperado: lista de letras seleccionadas ["A", "B", "D"]
        opciones_usuario = [x.strip().upper() for x in data.opcion_seleccionada.split(",") if x.strip()]
        solucion_normalizada = [x.strip().upper() for x in solucion_real]
        es_correcta = sorted(opciones_usuario) == sorted(solucion_normalizada)
        solucion_display = ", ".join(solucion_real)
    elif tipo == "seleccion_unica":
        # Compara coincidencia de la opción elegida o su letra
        seleccion = data.opcion_seleccionada.strip()
        es_correcta = seleccion.lower() == solucion_real.lower()
        solucion_display = solucion_real
    else:  # verdadero_falso
        seleccion = data.opcion_seleccionada.strip().capitalize()
        es_correcta = seleccion == solucion_real
        solucion_display = solucion_real

    if es_correcta:
        intento["correctas"] += 1

    intento["respuestas_registradas"][p_key] = es_correcta

    return {
        "status": "success",
        "pregunta_id": data.pregunta_id,
        "es_correcta": es_correcta,
        "solucion_oficial": solucion_display,
        "justificacion_legal": pregunta_servidor["justificacion"]
    }

@app.post("/api/evaluacion/finalizar", summary="Cierre inmutable de intento y cálculo formal de nota")
def finalizar_evaluacion(data: FinalizarIntentoRequest):
    if data.intento_id not in DB_INTENTOS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Intento no encontrado")

    intento = DB_INTENTOS[data.intento_id]

    if intento["rut"] != data.rut:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acceso no autorizado al intento")

    if intento["completado"]:
        # Retorna el resultado ya archivado sin recomputar
        return {
            "status": "already_completed",
            "mensaje": "Este intento ya fue finalizado previamente.",
            "resultado": intento.get("resultado_final")
        }

    # Cálculo matemático inmutable en el backend (imposible de manipular por payload del cliente)
    total = intento["total_preguntas"]
    correctas = intento["correctas"]
    porcentaje = round((correctas / total) * 100, 1) if total > 0 else 0.0
    aprobado = porcentaje >= 85.0  # Estándar de acreditación minera CODELCO (85%)

    resultado_final = {
        "intento_id": data.intento_id,
        "intento_numero": len(DB_USUARIOS[data.rut]["intentos"]) + 1,
        "fecha": intento["fecha_inicio"],
        "fecha_cierre": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "total_preguntas": total,
        "correctas": correctas,
        "incorrectas": total - correctas,
        "porcentaje": porcentaje,
        "aprobado": aprobado,
        "certificacion": "ACREDITADO INDUCCIÓN CODELCO DS132/DS44" if aprobado else "NO ACREDITADO - REQUIERE REINDUCCIÓN"
    }

    intento["completado"] = True
    intento["resultado_final"] = resultado_final

    # Almacenamiento persistente en el perfil del colaborador
    DB_USUARIOS[data.rut]["intentos"].append(resultado_final)

    return {
        "status": "success",
        "mensaje": "Evaluación calificada y archivada inmutablemente en el registro del trabajador",
        "resultado": resultado_final
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
