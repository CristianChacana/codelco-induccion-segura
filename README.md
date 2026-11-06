# ⛏️ CODELCO — Sistema Seguro de Inducción en Prevención de Riesgos
### 🛡️ Arquitectura Cliente-Servidor Zero-Trust | DS 132 • DS 44 • ISP • SUSESO

![Zero-Trust Architecture](https://img.shields.io/badge/Architecture-Zero--Trust-002B49?style=for-the-badge&logo=shield)
![Normativa Chilena](https://img.shields.io/badge/Normativa-DS_132_|_DS_44_|_ISP_|_SUSESO-D96B27?style=for-the-badge)
![OWASP Top 10](https://img.shields.io/badge/Security-OWASP_Top_10_Certified-10B981?style=for-the-badge)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI_|_PowerShell-005088?style=for-the-badge&logo=fastapi)

---

## 📌 Descripción del Proyecto

Aplicación web Single Page Application (SPA) para la inducción interactiva y evaluación obligatoria en **Prevención de Riesgos para la Gran Minería (CODELCO)**.

Diseñada bajo el principio de **Cero Confianza (Zero-Trust)** para impedir fraudes o filtraciones de respuestas:
- **Validación 100% Server-Side:** Las respuestas correctas y justificaciones legales nunca se exponen al cliente en la carga inicial.
- **Inmutabilidad de Notas:** El porcentaje de aprobación no puede ser adulterado mediante peticiones manipulatedas en el frontend.
- **Anti-Tampering & Anti-Replay:** Bloqueo automático frente a intentos de responder dos veces la misma pregunta para corregir errores.
- **Sanitización Estricta:** Mitigación completa de inyecciones XSS en los campos de login mediante validadores Pydantic y codificación de entidades HTML.

---

## 🗺️ Módulos de la Aplicación

1. **Acreditación e Historial de Usuario:** Registro con RUT chileno, cargo en faena y trazabilidad completa de intentos previos.
2. **Fase 1 — Recorrido Interactivo por Zonas Críticas:**
   - ⛏️ **Mina Subterránea:** Ventilación forzada, prohibición de motores a bencina (Art. 142), concentración de O2 >= 19.5% (Art. 138) y acuñadura continua (Art. 52).
   - 🚛 **Mina Rajo Abierto:** Seguridad vial, interacción con camiones CAEX, pértiga reglamentaria a 4.5m y distancia de 50m.
   - 🏭 **Planta Concentradora:** Protocolo PLANESI contra sílice libre (filtros P100/HEPA) y PREXOR contra ruido (82/85 dBA).
   - 🔒 **Mantenimiento y LOTO:** Aislamiento y bloqueo personal intransferible (energía cero) y trabajo en altura física (>1.8m con anclaje 5.000 lb).
   - 📋 **Gestión Preventiva:** Matriz IPER auditable (DS 44), comités paritarios CPHS y paralización por accidente grave (Art. 76 bis).
3. **Fase 2 — Evaluación Oficial de 15 Preguntas:**
   - Banco privado en servidor con preguntas de Verdadero/Falso, Selección Única y Selección Múltiple.
   - Bloqueo inmediato de opciones al responder y retroalimentación técnica con citas normativas legales.
   - Cálculo formal de aprobación (exigencia mínima de 85.0%).
4. **Consola SecOps de Pentesting OWASP en Vivo:**
   - Panel interactivo para auditar en tiempo real la resiliencia del sistema frente a XSS, Parameter Tampering y Zero-Leakage.

---

## 🏗️ Esquema Relacional en Memoria

```
  +------------------+          +------------------+          +-----------------------+
  |     Usuarios     |          |     Intentos     |          |  Respuestas_Detalle   |
  +------------------+          +------------------+          +-----------------------+
  | id (PK)          |1        N| id (PK)          |1        N| id (PK)               |
  | rut (Unique)     |----------| usuario_id (FK)  |----------| intento_id (FK)       |
  | nombre           |          | fecha_inicio     |          | pregunta_id           |
  | cargo            |          | fecha_fin        |          | opcion_seleccionada   |
  +------------------+          | total_preguntas  |          | es_correcta (Bool)    |
                                | correctas        |          +-----------------------+
                                | porcentaje       |
                                +------------------+
```

---

## 🚀 Puesta en Marcha Local

### Opción 1: Backend en Python (FastAPI)
```bash
# 1. Instalar dependencias
pip install fastapi uvicorn pydantic requests

# 2. Iniciar el servidor seguro
python servidor.py
```
*Acceda a `http://localhost:8000` en su navegador.*

### Opción 2: Backend Nativo en PowerShell (.NET HttpListener)
```powershell
powershell -ExecutionPolicy Bypass -File .\ServidorCodelco.ps1 -Port 8080
```
*Acceda a `http://localhost:8080` en su navegador.*

### Opción 3: Modo Standalone (Doble clic)
Abra directamente el archivo `index.html` en cualquier navegador moderno. El sistema cuenta con un motor `FallbackServer` en memoria que emula la API con idénticas garantías de seguridad y pentesting.

---

## 🧪 Ejecución de Auditoría y Pentesting Automatizado

```powershell
# Auditoría de resiliencia directa en memoria (9/9 pruebas aprobadas)
powershell -ExecutionPolicy Bypass -File .\Test-BackendDirect.ps1

# Auditoría de endpoints HTTP activos
powershell -ExecutionPolicy Bypass -File .\Test-SecurityAudit.ps1
```

En entornos con Python:
```bash
python pentest_audit.py http://127.0.0.1:8000
```

---

## 📁 Estructura del Repositorio

```
codelco-induccion-segura/
│
├── .github/
│   └── workflows/
│       └── security-audit.yml     # Pipeline CI/CD de pentesting en GitHub Actions
│
├── index.html                     # SPA Frontend interactiva con identidad Codelco
├── style.css                      # Estilos corporativos (Cobre, Azul Marino, Acero)
├── app.js                         # Lógica cliente y consola de ciberseguridad
│
├── servidor.py                    # Backend seguro en Python (FastAPI + Pydantic)
├── ServidorCodelco.ps1            # Backend nativo Windows en PowerShell (.NET)
│
├── pentest_audit.py               # Suite de pentesting automatizado en Python
├── Test-SecurityAudit.ps1         # Suite de pentesting para endpoints HTTP
├── Test-BackendDirect.ps1         # Suite de auditoría directa en memoria
│
├── README_AUDITORIA_CODELCO.md    # Dossier técnico completo para auditores de TI
├── README.md                      # Presentación principal del repositorio
└── .gitignore                     # Exclusión de temporales y caches
```

---

## 📄 Licencia y Propiedad

Desarrollado para la **Corporación Nacional del Cobre de Chile (CODELCO)**.  
Cumple con los estándares de la Dirección Corporativa de Seguridad y Salud Ocupacional (DS 132 / DS 44 / ISP / SUSESO).
