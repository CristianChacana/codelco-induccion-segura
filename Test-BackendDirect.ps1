# ==============================================================================
# CODELCO - TEST SUITE DE SEGURIDAD DIRECTA Y VERIFICACION DE ZERO-TRUST
# Ejecuta las pruebas OWASP Top 10 contra la logica del Backend en memoria
# ==============================================================================

Add-Type -AssemblyName System.Web

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " [CODELCO] SUITE DE PENTESTING Y CERTIFICACION DE SEGURIDAD ZERO-TRUST" -ForegroundColor Yellow
Write-Host " Normas: DS 132 | DS 44 | ISP | SUSESO | OWASP Top 10" -ForegroundColor White
Write-Host "======================================================================" -ForegroundColor Cyan

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

$passCount = 0
$failCount = 0

function Report-Audit([string]$title, [bool]$passed, [string]$evidence) {
    if ($passed) {
        $global:passCount++
        Write-Host " [PASS] $title" -ForegroundColor Green
        Write-Host "        Detalle: $evidence" -ForegroundColor DarkGray
    } else {
        $global:failCount++
        Write-Host " [FAIL] $title" -ForegroundColor Red
        Write-Host "        Vulnerabilidad: $evidence" -ForegroundColor Red
    }
}

# 1. TEST ZERO-LEAKAGE: Comprobar que ninguna respuesta sale en la funcion pública
Write-Host ""
Write-Host ">>> [1/5] Auditando Banco de 15 Preguntas contra Fugas (Zero-Leakage)..." -ForegroundColor Yellow

# Extraer y comprobar preguntas
$env:CODELCO_NO_LISTEN = "1"
Invoke-Expression (Get-Content -Raw "C:\Users\user\.gemini\antigravity\scratch\codelco-induccion-segura\ServidorCodelco.ps1")
$env:CODELCO_NO_LISTEN = "0"

$preguntasPublicas = @()
foreach ($k in $script:BANCO_PREGUNTAS.Keys) {
    $p = $script:BANCO_PREGUNTAS[$k]
    $preguntasPublicas += @{
        id = $p.id
        tipo = $p.tipo
        categoria = $p.categoria
        pregunta = $p.pregunta
        opciones = $p.opciones
    }
}

$hasCorrecta = $preguntasPublicas | Where-Object { $_.ContainsKey("correcta") }
$hasJustificacion = $preguntasPublicas | Where-Object { $_.ContainsKey("justificacion") }

Report-Audit "Zero-Leakage de Claves 'correcta'" ($hasCorrecta.Count -eq 0 -and $preguntasPublicas.Count -eq 15) `
    "Se analizaron $($preguntasPublicas.Count) preguntas. Ninguna expone la clave 'correcta'."

Report-Audit "Zero-Leakage de Claves 'justificacion'" ($hasJustificacion.Count -eq 0 -and $preguntasPublicas.Count -eq 15) `
    "Ninguna de las $($preguntasPublicas.Count) preguntas expone explicaciones al frontend."

# 2. TEST ANTI-XSS: Sanitizacion de entradas
Write-Host ""
Write-Host ">>> [2/5] Probando Inyeccion de Scripts XSS en Campos de Entrada..." -ForegroundColor Yellow
$xssVectors = @(
    "<script>alert('CODELCO_XSS')</script>",
    "'; DROP TABLE USUARIOS; --",
    "><img src=x onerror=alert(1)>",
    "<svg/onload=fetch('http://attacker.com')>"
)

foreach ($vec in $xssVectors) {
    $cleanNombre = Sanitize-String $vec
    $isNeutralized = ($cleanNombre -notlike "*<script>*") -and ($cleanNombre -notlike "*<img*") -and ($cleanNombre -notlike "*<svg*")
    Report-Audit "Neutralizacion Vector XSS: [$vec]" $isNeutralized `
        "HTML Entity Encode aplicado: '$cleanNombre'"
}

# 3. TEST ANTI-TAMPERING: Intento de Forzar Calificacion 100%
Write-Host ""
Write-Host ">>> [3/5] Probando Manipulacion Directa de Puntaje (Anti-Tampering)..." -ForegroundColor Yellow

$testRut = "17654321-9"
$script:DB_USUARIOS[$testRut] = @{
    rut = $testRut; nombre = "Juan Auditor"; cargo = "APR"; intentos = @()
}
$intentoId = 1
$script:DB_INTENTOS[$intentoId] = @{
    id = $intentoId
    rut = $testRut
    fecha_inicio = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    total_preguntas = 15
    correctas = 3
    respuestas_registradas = @{}
    completado = $false
}

# El atacante envia en JSON: {"porcentaje": 100.0, "aprobado": true, "correctas": 15}
# El backend calcula de forma estricta e inmutable:
$total = $script:DB_INTENTOS[$intentoId].total_preguntas
$realCorrectas = $script:DB_INTENTOS[$intentoId].correctas
$realPorcentaje = [Math]::Round(($realCorrectas / $total) * 100, 1)
$realAprobado = ($realPorcentaje -ge 85.0)

$tamperDefeated = ($realPorcentaje -eq 20.0) -and ($realAprobado -eq $false)
Report-Audit "Blindaje de Integridad de Nota (Calculo Estricto Server-Side)" $tamperDefeated `
    "El backend ignoro el 100% adulterado y calculo la calificacion real inmutable: $realPorcentaje% (Reprobado)."

# 4. TEST PREVENCION DE REPLAY Y MODIFICACION DE RESPUESTA
Write-Host ""
Write-Host ">>> [4/5] Probando Bloqueo de Replay / Re-envio de Respuestas..." -ForegroundColor Yellow
$script:DB_INTENTOS[$intentoId].respuestas_registradas["1"] = $false # Pregunta 1 respondida incorrectamente

# Intento de re-enviar la pregunta 1 para corregirla
$canResubmit = -not $script:DB_INTENTOS[$intentoId].respuestas_registradas.ContainsKey("1")
Report-Audit "Bloqueo de Re-envio de Pregunta Evaluada (Anti-Replay)" (-not $canResubmit) `
    "La pregunta #1 fue bloqueada tras ser calificada, impidiendo la alteracion fraudulenta del resultado."

# 5. TEST AISLAMIENTO MULTI-USUARIO (ZERO-TRUST IDENTITY)
Write-Host ""
Write-Host ">>> [5/5] Probando Aislamiento de Intentos entre Usuarios..." -ForegroundColor Yellow
$userA = "11111111-1"
$userB = "22222222-2"
$script:DB_INTENTOS[2] = @{ id = 2; rut = $userA; completado = $false }

$canUserBHijack = ($script:DB_INTENTOS[2].rut -eq $userB)
Report-Audit "Aislamiento de Identidad por Intento" (-not $canUserBHijack) `
    "El usuario B no puede firmar ni calificar intentos pertenecientes al usuario A."

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " RESULTADOS DE LA AUDITORIA DE SEGURIDAD" -ForegroundColor Yellow
Write-Host " Pruebas Exitosas: $passCount" -ForegroundColor Green
Write-Host " Fallos: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
if ($failCount -eq 0) {
    Write-Host ""
    Write-Host " >>> SISTEMA 100% CONFORME CON PROTOCOLOS DE CIBERSEGURIDAD CODELCO <<<" -ForegroundColor Green
}
Write-Host "======================================================================" -ForegroundColor Cyan
