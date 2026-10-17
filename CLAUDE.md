# CLAUDE.md: oratorio

O "super app da Bíblia" do Felipe (pedido de 17/10/2026): tudo de útil da fé católica num app
que roda no PC e, pelo servidor de casa, no celular. O `CLAUDE.md` da raiz vale aqui; este
arquivo só acrescenta o que é deste projeto. O `README.md` explica o uso.

## 1. Decisões dele (não desfazer sem ele pedir)

- **Público** (repositório e licença MIT): "mantém tudo possível público". Por isso nenhum texto
  com direito autoral entra no git nem na release: a Bíblia e o Catecismo são baixados por
  `ferramentas\baixar_biblia.py` e `ferramentas\baixar_catecismo.py` para `cache/` (fora do git).
- **Cadeado só em três coisas**: a parte do Vigia (dias limpo), os dados salvos da colinha (a colinha
  em si fica aberta) e, por juízo meu, o histórico de perguntas à IA (diz o que ele fez; a coleção
  está em `TRANCADAS` do `servidor/armazem.py`, tirar de lá destranca). O app NÃO entra no
  `cadeado/privados.json`.
- **Versão no servidor de casa para o celular** (porta 8076, serviço `oratorio` do systemd do
  usuário `elipe`). Celular entra neste projeto por pedido dele.
- **A IA usa o Catecismo como base principal e a Bíblia como secundária**: o servidor busca os §
  (BM25 em `servidor/textos.py`), uma chamada barata gera consultas melhores, e a resposta vem com
  cada § e cada versículo conferidos contra o texto de verdade (`conferir_citacoes` em `ia.py`).
  Nunca dá veredito de pecado mortal (CIC 1857: três condições), igual à colinha.
- **Escrever oração** com modelos, dicas enquanto escreve (sem IA, `app/js/sugestoes.js`) e revisor
  de IA.
- Os quatro acréscimos que propus e ele aprovou: orações e terço, calendário litúrgico, Catecismo
  com busca e guia da confissão.

## 2. Como as peças se ligam

- **Servidor** (`servidor/`, só biblioteca padrão): `servidor.py` (rotas), `armazem.py` (SQLite com
  sincronia "a última mudança vence" por item), `sincronia.py` (o PC chama o servidor de casa),
  `portao.py` (cadeado: no PC o `trava.py` da pasta `cadeado`; no servidor de casa o hash em
  `dados/senha.json`, que o `instalar.sh` copia do P.AI, e cookie de 400 dias), `ia.py` (GPT e
  Claude com reserva por crédito; a chamada veio do `tradutor-ln`), `textos.py` (Bíblia e
  Catecismo do cache), `atualizador.py` e `iniciar.py` (vieram do `clave`).
  `provedor.py` é CÓPIA IDÊNTICA do mestre `contato-ia/contato/provedor.py` (não editar aqui).
- **Três modos**: `pc` (127.0.0.1:8074), `servidor` (0.0.0.0:8076, com senha e token),
  `demo` (8075, dados em %TEMP%\oratorio-demo, IA de mentira, sem cadeado; é o preview).
- **Página** (`app/`, módulos ES sem build): `main.js` (rotas por hash e a ALTERNÂNCIA DOS BLOCOS:
  a primeira seção é escura e elas se alternam, o rodapé fica com o tom oposto ao da última; nenhuma
  vista escolhe fundo à mão), `contexto.js` (estado, cor do dia, cadeado, gaveta das citações,
  sincronia com a nova aba e com o Vigia), `liturgia.js` (o calendário), `plano.js` (o plano e a
  conversão de numeração), `vistas/*.js` (uma por tela), `conteudo/*.js` (orações, terço, guias,
  modelos; texto escrito à mão).
- **Ponte com a nova aba** (`app/js/ponte.js` aqui, `oratorio.js` e `js/oratorio/ponte.js` lá): só
  na origem `localhost:8074` e `192.168.1.214:8076`, e só cinco pedidos: ler o contador do Vigia,
  recair, vontade vencida, ler e gravar os capítulos lidos. **Ligar, desligar e liberar site do
  Vigia nunca passam por ela** (seção 0 do `brave-nova-aba/CLAUDE.md`). No celular não há
  extensão: a recaída vira `vigia/pendente:*` e o PC entrega ao Vigia quando abre o Oratório.
- **Colinha e árvore** são cópias em `app/vendor/` (`ferramentas\sincronizar_vendor.py`; `--conferir`
  diz se estão velhas, e o `publicar-versao.ps1` recusa publicar com elas velhas). A colinha recebe
  o armazém de fora (`globalThis.colinhaArmazem`, mudança de uma linha no `main.js` dela) e o
  `app/js/colinha-ponte.js` guarda no servidor, atrás do cadeado. A árvore usa as fontes do Google
  (a CSP libera só para `/vendor/arvore/`).

## 3. Regras de conteúdo

1. **Todo § citado nos guias tem palavra conferida** em `CONFERIDOS` (`conteudo/guias.js`), e o teste
   procura a palavra no texto do Catecismo baixado. § novo: conferir no texto, nunca de memória.
2. **As respostas da Missa** são as da tradução brasileira da 3ª edição do Missal (em uso desde o
   Advento de 2023), conferidas no PDF de amostra das Edições CNBB ("Rito da missa celebrada com o
   povo") e numa página de participação da Missa. Duas falas ficaram de fora por não achar fonte
   (o "Felizes os convidados" antes do "Eis o Cordeiro" e a ordem dele).
3. **Numeração**: a Ave-Maria numera os Salmos pela Vulgata (o 23 protestante é o 22) e conta o título
   como versículo; Joel tem 4 capítulos e Malaquias 3. A nova aba e o Vigia usam a numeração
   protestante. `plano.js` converte capítulos e `versoParaAveMaria` converte versículos (com
   `app/dados/versificacao.json`, gerado por `ferramentas\gerar_versificacao.py` só com contagens).
4. **Calendário**: os santos vêm do romcal (MIT), por `ferramentas\gerar_calendario.py`
   (`app/dados/santos.json`, versionado); o resto é calculado em `liturgia.js` (Páscoa, tempos,
   semanas, precedência simplificada, as transferências do Brasil). Dias de preceito no Brasil:
   domingos, 1/1, Corpus Christi, 8/12 e Natal (Aparecida é feriado, não preceito).
5. Sem travessão em nada que ele lê (o teste procura).

## 4. Visual: "Livro de Horas"

Escolhido por mim. Papel e tinta alternando, EB Garamond na Escritura e nos títulos, Source Sans 3
na interface, as duas locais em `app/fontes`. **A única cor de ação é a cor litúrgica do dia**
(`--lit` e `--lit-claro`, trocadas por `aplicarCor` em `contexto.js`; o branco litúrgico vira
dourado na tela). O elemento único é a **fita de missal** na cor do dia, pendurada na cabeça de
cada tela. Referências: Apple (uma ideia por seção, navegação fixa) e Linear (rótulos pequenos em
caixa alta, divisores finos). Descartadas: "Vitral" (escuro, cansa na leitura) e "Capela branca".
Conferido em 1440×900, 3440×1440 (o miolo cresce a 136rem), 1080×1920 e 375×812, sem rolagem lateral.

## 5. Rodar e testar

- PC: `abrir.bat` (→ :8074, abre no Brave). Preview: entrada `oratorio-demo` do `launch.json` (:8075).
- `node --test "testes/*.test.js"` (calendário, plano, conteúdo conferido, dicas).
- `cd servidor; python -m unittest discover -s testes -t .` (armazém e sincronia, rotas, cadeado por
  senha, token, a IA contra um servidor FALSO no formato das duas APIs; nunca a API de verdade).
- Na `brave-nova-aba`: `testar-oratorio.js` e `testar-oratorio-navegador.js` (Brave descartável,
  porta 8074 livre; para se o Oratório de verdade estiver aberto).
- Servidor de casa: `implantar\enviar.ps1`, `configurar-sincronia.ps1`, `configurar-chaves.ps1`,
  `ver-registro.ps1`. Os `.ps1` saem do `implantar\_escrever_ps1.py` e o `publicar-versao.ps1` do
  `ferramentas\_escrever_publicar.py` (UTF-8 com BOM: mexa no gerador, não no `.ps1`).
- Versão nova: `versao.json`, `package.json` e `CHANGELOG.md` juntos; publicar a release
  (`ferramentas\publicar-versao.ps1`) é decisão dele.

## 6. Armadilhas

- **Quadro com `100vh` dentro de iframe cresce sem fim**: a colinha tem capa de `100vh` e, com o
  quadro medindo a altura do conteúdo, a capa media 25 mil px. Os dois embutidos têm a altura da
  janela e rolam por dentro.
- `e.target.closest` estoura quando o evento vem do `document` (não é Element): o atalho do terço
  confere `instanceof Element`.
- `Config(cadeado=Path(""))` vira `Path(".")` e procura `trava.py` na pasta atual: "sem cadeado" é
  `cadeado=False`.
- O Catecismo do vatican.va não traz os § 2217 e 2439 separados (colados aos vizinhos no próprio site).
- O ruído "conexão anulada" do Windows quando o navegador fecha antes da resposta é ignorado em
  `Servidor.handle_error`.

## 7. O que não foi verificado

- A IA com chave de verdade (só servidor falso) e a qualidade real das respostas.
- **Servidor de casa: instalado em 17/10/2026** (`implantar\enviar.ps1`), no ar na 8076, com a senha
  do cadeado copiada do P.AI e o token criado lá. Conferido de fora: a página abre, a Bíblia e o
  Catecismo respondem e a parte trancada devolve 423. A sincronia foi testada só lendo (numa pasta
  temporária, 0 itens). **Não verificado:** o celular de verdade e destravar lá com a senha.
- **Falta ele rodar no PC:** `implantar\configurar-sincronia.ps1` (grava o token no `.env`, que é
  protegido para agentes) e `implantar\configurar-chaves.ps1` (as chaves de IA, ele cola).
- A atualização pela release (nenhuma release publicada ainda).
