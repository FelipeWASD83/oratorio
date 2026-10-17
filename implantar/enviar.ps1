# Manda o Oratório (página, servidor, Bíblia e Catecismo do cache) para o mini PC e reinstala o serviço.
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
