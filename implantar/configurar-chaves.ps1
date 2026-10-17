# As chaves de IA do Oratório (para "Isso é pecado?" e o revisor de orações). Você cola, nada aparece
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
