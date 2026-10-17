# Mostra as últimas linhas do registro do Oratório no mini PC. Com -Seguir, acompanha até Ctrl+C.
# Uso: powershell -ExecutionPolicy Bypass -File "<pasta do projeto>\implantar\ver-registro.ps1" [-Linhas 100] [-Seguir]

param([string]$Servidor, [int]$Linhas = 60, [switch]$Seguir)
. "$PSScriptRoot\comum.ps1"
$Servidor = Get-Servidor $Servidor
$comando = "journalctl --user -u oratorio.service -n $Linhas --no-pager"
if ($Seguir) { Invoke-SshCru -Argumentos ($OpcoesSsh + @("-t", $Servidor, "$comando -f")) }
else { Invoke-Ssh $Servidor -Acao "a leitura do registro" $comando }
