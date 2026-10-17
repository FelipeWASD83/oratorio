# Peças comuns dos scripts de implantar (carregado com ". $PSScriptRoot\comum.ps1").
# O servidor é o mini PC da Positivo com Ubuntu Server, usuário elipe, o mesmo dos outros projetos.

$UsuarioPadrao = "elipe"
$ArquivoServidor = Join-Path $PSScriptRoot "servidor.txt"
$PortaDoServidor = 8076
$Raiz = Split-Path -Parent $PSScriptRoot

$SshExe = if ($env:ORATORIO_SSH) { $env:ORATORIO_SSH } else { "ssh.exe" }
$ScpExe = if ($env:ORATORIO_SCP) { $env:ORATORIO_SCP } else { "scp.exe" }
$OpcoesSsh = @("-o", "StrictHostKeyChecking=accept-new", "-o", "ConnectTimeout=10")

function Get-Servidor {
    param([string]$Servidor)
    if (-not $Servidor -and (Test-Path $ArquivoServidor)) {
        $Servidor = (Get-Content $ArquivoServidor -TotalCount 1).Trim()
    }
    if (-not $Servidor) {
        throw ("Não sei o endereço do mini PC. Crie o arquivo $ArquivoServidor com uma linha só: " +
               "elipe@<IP do mini PC> (o mesmo dos outros projetos que rodam lá).")
    }
    if ($Servidor -notmatch "@") { $Servidor = "$UsuarioPadrao@$Servidor" }
    return $Servidor
}

function Get-Endereco {
    param([string]$Servidor)
    return ($Servidor -replace '^.*@', '')
}

function Assert-Codigo {
    param([int]$Codigo, [string]$Acao)
    if ($Codigo -eq 0) { return }
    if ($Codigo -eq 255) {
        throw ("Não consegui conectar no mini PC para $Acao. 'Connection timed out' ou 'No route to host' = " +
               "desligado, fora da rede ou mudou de IP (o IP fica no implantar\servidor.txt); 'Permission denied' = " +
               "a chave deste PC não está lá (o preparar-servidor.ps1 do contato-ia instala).")
    }
    throw "O mini PC respondeu, mas $Acao parou com erro (código $Codigo). O motivo está nas linhas acima."
}

# Roda o ssh; a $Entrada vai pela entrada do comando remoto em UTF-8 sem BOM (segredo nunca na linha de comando).
function Invoke-SshCru {
    param([string[]]$Argumentos, [string[]]$Entrada)
    $semBom = New-Object System.Text.UTF8Encoding $false
    $antes = $null
    try { $antes = [Console]::OutputEncoding; [Console]::OutputEncoding = $semBom } catch { $antes = $null }
    $codificacaoAntes = $global:OutputEncoding
    if ($null -ne $Entrada) { $global:OutputEncoding = $semBom }
    try {
        if ($null -ne $Entrada) { $Entrada | & $SshExe @Argumentos } else { & $SshExe @Argumentos }
    } finally {
        if ($null -ne $antes) { try { [Console]::OutputEncoding = $antes } catch { } }
        $global:OutputEncoding = $codificacaoAntes
    }
}

function Invoke-Ssh {
    param([string]$Servidor, [string]$Comando, [string]$Acao = "o comando")
    Invoke-SshCru -Argumentos ($OpcoesSsh + @("-o", "BatchMode=yes", $Servidor, $Comando))
    Assert-Codigo $LASTEXITCODE $Acao
}

function Invoke-SshComEntrada {
    param([string]$Servidor, [string]$Comando, [string[]]$Entrada, [string]$Acao = "o comando")
    Invoke-SshCru -Argumentos ($OpcoesSsh + @("-o", "BatchMode=yes", $Servidor, $Comando)) -Entrada $Entrada
    Assert-Codigo $LASTEXITCODE $Acao
}

function Copy-ParaServidor {
    param([string]$Servidor, [string]$Origem, [string]$Destino, [string]$Acao = "a cópia do pacote")
    & $ScpExe @OpcoesSsh -o BatchMode=yes $Origem "${Servidor}:$Destino"
    Assert-Codigo $LASTEXITCODE $Acao
}

# Troca (ou acrescenta) linhas CHAVE=valor no .env do PC sem mexer no resto, em UTF-8 sem BOM.
function Set-LinhasEnv {
    param([string]$Arquivo, [hashtable]$Valores)
    $linhas = @()
    if (Test-Path $Arquivo) { $linhas = @([IO.File]::ReadAllLines($Arquivo)) }
    foreach ($chave in $Valores.Keys) {
        $nova = "$chave=$($Valores[$chave])"
        $achou = $false
        for ($i = 0; $i -lt $linhas.Count; $i++) {
            if ($linhas[$i] -match "^\s*$([regex]::Escape($chave))\s*=") { $linhas[$i] = $nova; $achou = $true }
        }
        if (-not $achou) { $linhas += $nova }
    }
    [IO.File]::WriteAllText($Arquivo, (($linhas -join "`n") + "`n"), (New-Object System.Text.UTF8Encoding $false))
}

$TarExe = Join-Path $env:SystemRoot "System32\tar.exe"
