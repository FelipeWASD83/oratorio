"""Gera os ícones do Oratório em PNG e ICO (o do atalho do Menu Iniciar) a partir do mesmo desenho do
app/icone.svg: quadrado escuro arredondado, a cruz clara e a fita verde de missal no canto.

Uso: python ferramentas\\gerar_icone.py   (precisa do Pillow)
"""
from pathlib import Path

from PIL import Image, ImageDraw

APP = Path(__file__).resolve().parent.parent / "app"
TINTA, PAPEL, FITA = "#1c1a17", "#f1ece2", "#2f6b3a"


def desenhar(lado: int) -> Image.Image:
    escala = 4   # desenha grande e reduz: borda lisa
    s = lado * escala
    k = s / 64
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, s - 1, s - 1), radius=int(14 * k), fill=TINTA)
    d.polygon([(44 * k, 0), (52 * k, 0), (52 * k, 22 * k), (48 * k, 19 * k), (44 * k, 22 * k)], fill=FITA)
    grossura = max(1, int(5 * k))
    d.rounded_rectangle((32 * k - grossura / 2, 13 * k, 32 * k + grossura / 2, 51 * k), radius=grossura // 2, fill=PAPEL)
    d.rounded_rectangle((22 * k, 25 * k - grossura / 2, 42 * k, 25 * k + grossura / 2), radius=grossura // 2, fill=PAPEL)
    return im.resize((lado, lado), Image.LANCZOS)


def main() -> None:
    desenhar(180).convert("RGB").save(APP / "icone-180.png")
    tamanhos = [16, 24, 32, 48, 64, 128, 256]
    desenhar(256).save(APP / "icone.ico", sizes=[(t, t) for t in tamanhos])
    print("icone-180.png e icone.ico gerados em", APP)


if __name__ == "__main__":
    main()
