# Oratório

Um app da fé católica que roda no seu PC e, pelo servidor de casa, no celular. Junta num lugar só:

- **Hoje**: o dia litúrgico (tempo, semana, ano A/B/C, cor do dia, santo, preceito, jejum), o versículo do dia (o mesmo do Vigia), a leitura do plano, o terço do dia e os dias limpo.
- **Bíblia**: os 73 livros na Ave-Maria (e NTLH, ARA, ARC, NAA e NVI, se estiverem no PC), busca sem acento, destaque e nota por versículo, tamanho da letra.
- **Plano de leitura**: 19 etapas numa ordem fácil, Salmos e Provérbios em paralelo, marcar capítulo e livro inteiro. É o mesmo plano do balão Bíblia da nova aba: o que marca num aparece no outro.
- **Catecismo**: os 2.865 parágrafos com busca, e o § citado abre do lado.
- **Árvore da Bíblia** e **Colinha de pecados**: os dois projetos, dentro do app.
- **Orações**: 23 orações da tradição, o terço conta por conta (os quatro mistérios e o da Misericórdia), suas intenções com "graça alcançada".
- **Escrever oração**: modelos para começar, dicas enquanto escreve e um revisor de IA.
- **Isso é pecado?**: a IA responde com o Catecismo como base e a Bíblia como apoio, mostrando o texto de cada § citado.
- **Guias**: primeira vez na igreja (a Missa passo a passo, com as respostas do Missal de 2023), depois da conversão e como se confessar.
- **Calendário litúrgico**: o mês com a cor de cada dia, as datas móveis e o próprio do Brasil.
- **Dias limpo**: o contador do Vigia, com "Tô com vontade" e "Recaí".

A cor de destaque do app inteiro é a **cor litúrgica do dia** (verde, roxo, branco, vermelho ou rosa), e a fita na cabeça de cada tela também.

## Abrir no PC

Pelo atalho **Oratório** do Menu Iniciar: ele sobe o servidor sem janela e abre `http://localhost:8074` no Brave, que é onde mora a nova aba (de onde vêm os dias limpo e o plano). Se já estiver aberto, só abre o navegador. Para parar o servidor, o botão "parar" do widget Projetos da nova aba. O atalho é criado (ou refeito, se a pasta mudar de lugar) por `powershell -ExecutionPolicy Bypass -File .\ferramentas\criar-atalho.ps1`.

Também dá para abrir pelo `abrir.bat` (servidor numa janela minimizada "Oratorio"; fechar a janela para o servidor).

Na primeira vez, baixe os textos (uma vez só; ficam na pasta `cache`, fora do git):

```powershell
python ferramentas\baixar_biblia.py
python ferramentas\baixar_catecismo.py
```

E as chaves de IA (para as perguntas e o revisor), coladas sem aparecer na tela:

```powershell
powershell -ExecutionPolicy Bypass -File .\implantar\configurar-chaves.ps1
```

## No celular

O Oratório roda no servidor de casa (o mini PC) e o celular abre `http://192.168.1.214:8076` na rede de casa. O PC e o servidor trocam os dados sozinhos (plano, notas, orações, colinha, o retrato do Vigia).

```powershell
powershell -ExecutionPolicy Bypass -File .\implantar\enviar.ps1                 # manda o app (e os textos) para o mini PC
powershell -ExecutionPolicy Bypass -File .\implantar\configurar-sincronia.ps1   # liga este PC ao servidor (uma vez)
powershell -ExecutionPolicy Bypass -File .\implantar\ver-registro.ps1           # o que o servidor anda fazendo
```

No iPhone, "Adicionar à Tela de Início" no Safari deixa ele com cara de app.

## Cadeado

Só ficam trancados: os **dias limpo**, o que você **salvou na colinha** e o **histórico de perguntas à IA**. No PC vale a senha do cadeado (tranca com 15 minutos parado); no servidor de casa, a mesma senha, com acesso que dura 400 dias naquele navegador. O resto do app é aberto.

## O que fica onde

- Seus dados: `dados/oratorio.db` (no PC) e `~/oratorio/dados` (no servidor). Fora do git.
- A Bíblia e o Catecismo: `cache/`. Têm direito autoral: só para uso pessoal, nunca publicados.
- A colinha e a árvore: cópias em `app/vendor`, feitas por `python ferramentas\sincronizar_vendor.py` (a fonte continua sendo cada projeto).

## Testes

```powershell
node --test "testes/*.test.js"
cd servidor; python -m unittest discover -s testes -t .
```

A ponte com a nova aba tem o teste dela na `brave-nova-aba`: `node testes\testar-oratorio.js` e `node testes\testar-oratorio-navegador.js`.

## Licença

Código sob a licença MIT. A Bíblia e o Catecismo não fazem parte do repositório (veja Ajustes > Fontes e licenças no app).
