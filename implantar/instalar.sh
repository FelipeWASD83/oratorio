#!/usr/bin/env bash
# Instala ou atualiza o Oratório no servidor de casa (mini PC), como serviço do usuário (sem sudo).
# Chamado pelo implantar/enviar.ps1. Nunca mexe em dados/ (o banco, a senha, o token e as chaves).
set -euo pipefail

ORIGEM="${1:?uso: instalar.sh <pasta com o código novo>}"
DESTINO="$HOME/oratorio"
UNIDADES="$HOME/.config/systemd/user"
SERVICO=oratorio.service
PORTA=8076
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$(id -u)}"

case "$ORIGEM" in
    /tmp/?*) ;;
    *) echo "A pasta de origem tem que estar em /tmp (recebi $ORIGEM)."; exit 1 ;;
esac
for item in app/index.html servidor/servidor.py versao.json "implantar/$SERVICO"; do
    if [ ! -e "$ORIGEM/$item" ]; then
        echo "O pacote chegou sem $item. Rode o enviar.ps1 de novo."
        exit 1
    fi
done
if [ -e "$ORIGEM/dados" ]; then
    echo "O pacote trouxe uma pasta dados/. Recusado, para não trocar os dados do servidor."
    exit 1
fi
if ! python3 -c 'import sys; sys.exit(sys.version_info < (3, 10))' 2>/dev/null; then
    echo "O Oratório precisa de Python 3.10 ou mais novo, e este Ubuntu tem $(python3 --version 2>&1)."
    exit 1
fi

USUARIO="$(id -un)"
if [ "$(loginctl show-user "$USUARIO" -p Linger --value 2>/dev/null)" != "yes" ]; then
    echo "Aviso: o início no boot sem login não está ligado; o servidor só sobe quando o $USUARIO entrar."
fi

mkdir -p "$DESTINO/dados"
chmod 700 "$DESTINO/dados"
rm -rf "$DESTINO/app" "$DESTINO/servidor" "$DESTINO/implantar"
if [ -d "$ORIGEM/cache" ]; then rm -rf "$DESTINO/cache"; fi
cp -a "$ORIGEM"/. "$DESTINO"/

# O token da sincronia (o PC usa para mandar e receber os dados): criado uma vez.
if [ ! -s "$DESTINO/dados/token.txt" ]; then
    python3 -c 'import secrets; print(secrets.token_urlsafe(32))' > "$DESTINO/dados/token.txt"
    echo "Token da sincronia criado. No PC, rode o configurar-sincronia.ps1."
fi
chmod 600 "$DESTINO/dados/token.txt"
# A senha da parte trancada é a mesma do cadeado: o hash que o P.AI do mini PC já usa.
if [ ! -s "$DESTINO/dados/senha.json" ] && [ -s "$HOME/persona-ai/dados/senha.json" ]; then
    cp "$HOME/persona-ai/dados/senha.json" "$DESTINO/dados/senha.json"
    chmod 600 "$DESTINO/dados/senha.json"
    echo "Senha do cadeado copiada do P.AI (o mesmo hash)."
fi

mkdir -p "$UNIDADES"
install -m 644 "$DESTINO/implantar/$SERVICO" "$UNIDADES/$SERVICO"
systemctl --user daemon-reload
systemctl --user enable "$SERVICO" >/dev/null 2>&1
systemctl --user restart "$SERVICO"
rm -rf "$ORIGEM" /tmp/oratorio.tar.gz

for _ in $(seq 1 15); do
    if python3 - "$PORTA" <<'FIM' 2>/dev/null
import json, sys, urllib.request
d = json.load(urllib.request.urlopen(f"http://127.0.0.1:{sys.argv[1]}/api/saude", timeout=2))
sys.exit(0 if d.get("app") == "oratorio" else 1)
FIM
    then
        echo "Oratório no ar (porta $PORTA)."
        if [ ! -s "$DESTINO/dados/senha.json" ]; then
            echo "Atenção: sem senha.json, a parte trancada (Vigia, colinha, perguntas) fica ABERTA para quem estiver na rede."
        fi
        exit 0
    fi
    sleep 1
done
echo "O servidor não respondeu em 15 s. Últimas linhas do registro:"
journalctl --user -u "$SERVICO" -n 30 --no-pager
exit 1
