"""Gera os scripts .ps1 do implantar\\ em UTF-8 COM BOM (o PowerShell 5.1 lê sem BOM como ANSI e quebra os acentos).

Fonte dos scripts: os blocos abaixo. Mexeu num script, mexa aqui e rode: python implantar\\_escrever_ps1.py
"""
from pathlib import Path

PASTA = Path(__file__).resolve().parent

COMUM = r'''# Peças comuns dos scripts de implantar (carregado com ". $PSScriptRoot\comum.ps1").
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
'''

ENVIAR = r'''# Manda o Oratório (página, servidor, Bíblia e Catecismo do cache) para o mini PC e reinstala o serviço.
# Rodar de novo toda vez que o código mudar. Os dados do mini PC (~/oratorio/dados: banco, senha,
# token, chaves) não são tocados, e nada da pasta dados\ deste PC vai junto.
# O texto da Bíblia e do Catecismo vai para o SEU servidor (uso pessoal), nunca para a internet.
# Uso: powershell -ExecutionPolicy Bypass -File "<pasta do projeto>\implantar\enviar.ps1" [-SemTextos]

param([string]$Servidor, [switch]$SemTextos)
. "$PSScriptRoot\comum.ps1"
$Servidor = Get-Servidor $Servidor

foreach ($item in @("app\index.html", "app\vendor\colinha", "servidor\servidor.py", "versao.json", "implantar\instalar.sh", "implantar\oratorio.service")) {
    if (-not (Test-Path (Join-Path $Raiz $item))) { throw "Falta $item na pasta do projeto ($Raiz)." }
}
$codigoServidor = @(Get-ChildItem -LiteralPath (Join-Path $Raiz "servidor") -Filter "*.py" -File | Sort-Object Name | ForEach-Object { "servidor/" + $_.Name })
$itens = @("app", "versao.json") + $codigoServidor + @("implantar/instalar.sh", "implantar/oratorio.service")
if (-not $SemTextos) {
    if (Test-Path (Join-Path $Raiz "cache\biblias")) { $itens += "cache/biblias" } else { Write-Host "Aviso: sem cache\biblias (rode ferramentas\baixar_biblia.py)." }
    if (Test-Path (Join-Path $Raiz "cache\catecismo.json")) { $itens += "cache/catecismo.json" } else { Write-Host "Aviso: sem cache\catecismo.json (rode ferramentas\baixar_catecismo.py)." }
}

$pacote = Join-Path $env:TEMP "oratorio.tar.gz"
& $TarExe -czf $pacote -C $Raiz --exclude "*__pycache__*" --exclude "*.pyc" --exclude "Thumbs.db" --exclude "desktop.ini" @itens
if ($LASTEXITCODE -ne 0) { throw "Não consegui empacotar o projeto." }
try {
    $tamanho = [math]::Ceiling((Get-Item $pacote).Length / 1MB)
    Write-Host "Mandando o pacote ($tamanho MB) para $Servidor..."
    Copy-ParaServidor $Servidor $pacote "/tmp/oratorio.tar.gz"
    Invoke-Ssh $Servidor -Acao "a instalação" ('rm -rf /tmp/oratorio-novo && mkdir /tmp/oratorio-novo ' +
        '&& tar -xzf /tmp/oratorio.tar.gz -C /tmp/oratorio-novo ' +
        '&& sed -i ''s/\r$//'' /tmp/oratorio-novo/implantar/instalar.sh /tmp/oratorio-novo/implantar/oratorio.service ' +
        '&& bash /tmp/oratorio-novo/implantar/instalar.sh /tmp/oratorio-novo')
}
finally {
    Remove-Item $pacote -ErrorAction SilentlyContinue
}
$endereco = Get-Endereco $Servidor
Write-Host ""
Write-Host "Pronto. No celular (na rede de casa): http://${endereco}:$PortaDoServidor"
Write-Host "Primeira vez? Rode também o configurar-sincronia.ps1 (liga este PC ao servidor)."
'''

SINCRONIA = r'''# Liga este PC ao Oratório do servidor de casa: lê o token da sincronia no mini PC e grava no .env
# do Oratório deste PC (ORATORIO_SINCRONIA_URL e ORATORIO_SINCRONIA_TOKEN). O token não aparece na tela.
# Depois, feche e abra o Oratório do PC.
# Uso: powershell -ExecutionPolicy Bypass -File "<pasta do projeto>\implantar\configurar-sincronia.ps1"

param([string]$Servidor)
. "$PSScriptRoot\comum.ps1"
$Servidor = Get-Servidor $Servidor
$saida = Invoke-SshCru -Argumentos ($OpcoesSsh + @("-o", "BatchMode=yes", $Servidor, "cat ~/oratorio/dados/token.txt"))
Assert-Codigo $LASTEXITCODE "a leitura do token"
$token = (@($saida) -join "").Trim()
if ($token.Length -lt 20) { throw "O mini PC não tem token ainda: rode o enviar.ps1 primeiro." }
$endereco = Get-Endereco $Servidor
Set-LinhasEnv (Join-Path $Raiz ".env") @{ "ORATORIO_SINCRONIA_URL" = "http://${endereco}:$PortaDoServidor"; "ORATORIO_SINCRONIA_TOKEN" = $token }
Write-Host "Sincronia configurada (http://${endereco}:$PortaDoServidor). Feche e abra o Oratório do PC."
'''

CHAVES = r'''# As chaves de IA do Oratório (para "Isso é pecado?" e o revisor de orações). Você cola, nada aparece
# na tela. Grava OPENAI_API_KEY e ANTHROPIC_API_KEY no .env do Oratório deste PC e, se quiser, no
# servidor de casa (~/oratorio/dados/.env, pela entrada do ssh, nunca pela linha de comando).
# Enter vazio mantém a chave que já está.
# Uso: powershell -ExecutionPolicy Bypass -File "<pasta do projeto>\implantar\configurar-chaves.ps1"

param([string]$Servidor)
. "$PSScriptRoot\comum.ps1"

function Ler-Escondido([string]$Pergunta) {
    $seguro = Read-Host -AsSecureString $Pergunta
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($seguro)
    try { return ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
}

$valores = @{}
$openai = Ler-Escondido "Chave da OpenAI (Enter para manter)"
if ($openai) { $valores["OPENAI_API_KEY"] = $openai }
$anthropic = Ler-Escondido "Chave da Anthropic (Enter para manter)"
if ($anthropic) { $valores["ANTHROPIC_API_KEY"] = $anthropic }
if ($valores.Count -eq 0) { Write-Host "Nada mudou."; exit 0 }
Set-LinhasEnv (Join-Path $Raiz ".env") $valores
Write-Host "Gravado no .env deste PC. Feche e abra o Oratório."

$resposta = Read-Host "Mandar as mesmas chaves para o servidor de casa? (s/n)"
if ($resposta -match '^[sS]') {
    $Servidor = Get-Servidor $Servidor
    $linhas = @($valores.Keys | ForEach-Object { "$_=$($valores[$_])" })
    $remoto = 'f=~/oratorio/dados/.env; touch "$f"; chmod 600 "$f"; while IFS= read -r l; do k="${l%%=*}"; grep -v "^$k=" "$f" > "$f.tmp" || true; mv "$f.tmp" "$f"; printf "%s\n" "$l" >> "$f"; done; chmod 600 "$f"; systemctl --user restart oratorio.service'
    Invoke-SshComEntrada $Servidor $remoto $linhas "a gravação das chaves"
    Write-Host "Chaves no servidor de casa, e o Oratório de lá foi reiniciado."
}
'''

REGISTRO = r'''# Mostra as últimas linhas do registro do Oratório no mini PC. Com -Seguir, acompanha até Ctrl+C.
# Uso: powershell -ExecutionPolicy Bypass -File "<pasta do projeto>\implantar\ver-registro.ps1" [-Linhas 100] [-Seguir]

param([string]$Servidor, [int]$Linhas = 60, [switch]$Seguir)
. "$PSScriptRoot\comum.ps1"
$Servidor = Get-Servidor $Servidor
$comando = "journalctl --user -u oratorio.service -n $Linhas --no-pager"
if ($Seguir) { Invoke-SshCru -Argumentos ($OpcoesSsh + @("-t", $Servidor, "$comando -f")) }
else { Invoke-Ssh $Servidor -Acao "a leitura do registro" $comando }
'''

for nome, texto in {"comum.ps1": COMUM, "enviar.ps1": ENVIAR, "configurar-sincronia.ps1": SINCRONIA,
                    "configurar-chaves.ps1": CHAVES, "ver-registro.ps1": REGISTRO}.items():
    (PASTA / nome).write_text(texto.lstrip("\n"), encoding="utf-8-sig")
    print("escrito", nome)
