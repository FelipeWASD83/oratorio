# Liga este PC ao Oratório do servidor de casa: lê o token da sincronia no mini PC e grava no .env
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
