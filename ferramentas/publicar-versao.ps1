# Publica a versão atual do Oratório como release no GitHub (é ela que o botão Atualizar baixa).
# Antes: subir a versão em versao.json, package.json e CHANGELOG.md, commitar e dar push.
# Publicar é decisão do Felipe: este script só roda quando ele manda. Precisa do gh logado.
# O pacote é o git archive do commit: leva só o código (a Bíblia, o Catecismo e os dados nunca vão).
$ErrorActionPreference = 'Stop'
$raiz = Split-Path -Parent $PSScriptRoot
Set-Location $raiz

function Rodar([string]$exe, [string[]]$argumentos) {
    $ErrorActionPreference = 'Continue'
    $saida = & $exe @argumentos 2>&1 | ForEach-Object { "$_" }
    return [pscustomobject]@{ codigo = $LASTEXITCODE; saida = (($saida -join "`n").Trim()) }
}

$info = Get-Content (Join-Path $raiz 'versao.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$versao = $info.versao
$repo = $info.repositorio
$pacote = Get-Content (Join-Path $raiz 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($pacote.version -ne $versao) { throw "package.json diz $($pacote.version) e versao.json diz $versao. Acerte antes." }
$changelog = Get-Content (Join-Path $raiz 'CHANGELOG.md') -Raw -Encoding UTF8
if ($changelog -notmatch "## $([regex]::Escape($versao)) ") { throw "O CHANGELOG.md não tem a seção da versão $versao." }
$r = Rodar python @('ferramentas\sincronizar_vendor.py', '--conferir')
if ($r.codigo -ne 0) { throw "As cópias da colinha, da árvore ou dos versículos estão desatualizadas: rode python ferramentas\sincronizar_vendor.py e commite." }

if ((Rodar git @('status', '--porcelain')).saida) { throw 'Há mudanças não commitadas. Commite antes de publicar.' }
$r = Rodar git @('fetch', '-q', 'origin')
if ($r.codigo -ne 0) { throw "Não deu para falar com o GitHub (git fetch): $($r.saida)" }
$local = (Rodar git @('rev-parse', 'HEAD')).saida
$r = Rodar git @('rev-parse', '@{u}')
if ($r.codigo -ne 0) { throw 'Este ramo não está ligado ao GitHub. Rode: git push -u origin main' }
if ($local -ne $r.saida) { throw 'O commit atual ainda não foi enviado (git push) ou está atrás do GitHub.' }
if ((Rodar gh @('release', 'view', "v$versao", '--repo', $repo)).codigo -eq 0) { throw "A release v$versao já existe." }

$linhas = $changelog -split "`r?`n"
$inicio = [array]::IndexOf($linhas, ($linhas | Where-Object { $_ -match "^## $([regex]::Escape($versao)) " } | Select-Object -First 1))
$notas = @()
for ($i = $inicio + 1; $i -lt $linhas.Length; $i++) { if ($linhas[$i] -match '^## ') { break }; $notas += $linhas[$i] }
$tmp = Join-Path $env:TEMP "oratorio-release-$versao"
New-Item -ItemType Directory -Force $tmp | Out-Null
$arqNotas = Join-Path $tmp 'notas.md'
[IO.File]::WriteAllText($arqNotas, (($notas -join "`n").Trim()), [Text.UTF8Encoding]::new($false))
$zip = Join-Path $tmp "oratorio-$versao.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }
$r = Rodar git @('archive', '--format=zip', "--prefix=oratorio-$versao/", '-o', $zip, 'HEAD')
if ($r.codigo -ne 0) { throw "Não deu para gerar o pacote: $($r.saida)" }

Write-Host "Publicando v$versao em $repo com $zip"
$r = Rodar gh @('release', 'create', "v$versao", $zip, '--repo', $repo, '--title', "Oratório $versao", '--notes-file', $arqNotas, '--target', $local)
if ($r.codigo -ne 0) { throw "O gh não criou a release: $($r.saida)" }
Write-Host $r.saida
Write-Host 'Pronto. O botão Atualizar das outras cópias já enxerga esta versão.'
