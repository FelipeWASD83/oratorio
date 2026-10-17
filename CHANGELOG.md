# Changelog: Oratório

A versão mais nova fica em cima. Ela mora aqui, no `versao.json` e no `package.json`.

## 2.0.2 (17/10/2026)

### Corrigido
- **Árvore da Bíblia sem barra de rolagem a mais.** Ela ainda rolava a página inteira por dentro, além da lista e da ficha. Agora a árvore ocupa a tela, com o rodapé numa faixa fina, e só a lista e a ficha rolam.

## 2.0.1 (17/10/2026)

### Corrigido
- **Colinha de pecados e Árvore da Bíblia com uma barra de rolagem só.** Elas apareciam dentro de uma página do Oratório que também rolava, e ficavam duas barras brigando. Agora a janela fica parada e só a colinha (ou a árvore) rola, ocupando o resto da tela. Na colinha, o cabeçalho grande virou uma faixa fina com o aviso do cadeado e o botão "Como se confessar".

## 2.0.0 (17/10/2026)

Recarregue a nova aba do Brave (1.5.0) em `brave://extensions` e abra o Oratório de novo pelo atalho do Menu Iniciar.

### Mudou
- **Virou um app de janela (Electron)**, como você pediu: o atalho do Menu Iniciar abre a janela do app, que sobe o servidor sozinho e o para quando a janela fecha. Não abre mais numa aba do Brave.
- **O Vigia e o plano da Bíblia sincronizam em segundo plano**: a extensão da nova aba vai até o Oratório de 30 em 30 segundos (com o Brave aberto), em vez de depender de uma página aberta no Brave. "Recaí" e "Tô com vontade" registrados aqui, no PC ou no celular, chegam ao Vigia nessa sincronia.

### Novo
- Atalho de janela com ícone próprio, tamanho da janela lembrado, F5, zoom (Ctrl + e Ctrl -) e F11; links de fora abrem no navegador padrão.

## 1.0.1 (17/10/2026)

### Novo
- **Atalho no Menu Iniciar** ("Oratório", com ícone): abre sem janela de console e, se já estiver aberto, só abre o navegador.

## 1.0.0 (17/10/2026)

Primeira versão.

### Novo
- **Hoje**: o dia litúrgico com a cor do dia, o versículo (o mesmo do Vigia), a leitura do plano, o terço do dia, os dias limpo e as próximas festas.
- **Bíblia** católica completa (Ave-Maria, 73 livros), com as outras traduções do PC, busca, destaque e nota por versículo.
- **Plano de leitura** de 19 etapas, junto com o balão Bíblia da nova aba nos dois sentidos.
- **Catecismo** inteiro com busca.
- **Orações**, **terço** conta por conta, **Terço da Misericórdia** e **intenções**.
- **Escrever oração** com modelos, dicas enquanto escreve e revisor de IA.
- **Isso é pecado?**: IA com o Catecismo como base, mostrando o texto de cada parágrafo citado.
- **Guias**: primeira vez na igreja, depois da conversão e como se confessar.
- **Calendário litúrgico** do Brasil.
- **Colinha de pecados** e **Árvore da Bíblia** dentro do app.
- **Dias limpo** ligados ao Vigia, com "Tô com vontade" e "Recaí".
- **Cadeado** só no Vigia, na colinha salva e nas perguntas; **servidor de casa** para o celular, com sincronia; botão de **atualizar** pelas releases.
