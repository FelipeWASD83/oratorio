// conteudo/guias.js: os guias (primeira vez na igreja, depois da conversão, confissão). Sem DOM.
//
// No texto, {cic:1415} vira um link para o § do Catecismo e {bib:MAT.5.23-24} para o
// trecho da Bíblia (numeração da Ave-Maria). Todo § citado tem uma palavra em CONFERIDOS
// que o teste procura no texto de verdade do Catecismo: § citado de memória não passa.
//
// Blocos: { p } parágrafo; { passos: [...] } lista numerada; { lista: [...] } lista;
// { missa: [...] } a Missa em etapas (postura, o que acontece, o que o povo responde);
// { aviso } destaque.

export const CONFERIDOS = {
  1212: 'iniciação cristã', 1213: 'fundamento de toda a vida cristã', 1247: 'catecumenato', 1248: 'catecúmenos',
  1265: 'purifica de todos os pecados', 1271: 'fundamento da comunhão entre todos os cristãos', 1306: 'Confirmação',
  1324: 'fonte e cume', 1346: 'dois grandes momentos', 1374: 'presença', 1385: 'exame de consciência',
  1387: 'jejum', 1389: 'uma vez em cada ano', 1415: 'estado de graça', 1422: 'perdão', 1427: 'convertei-vos',
  1428: 'segunda conversão', 1431: 'conversão a Deus', 1446: 'pecado grave', 1451: 'contrição',
  1453: 'atrição', 1456: 'pecados mortais', 1457: 'uma vez ao ano', 1458: 'pecados veniais', 1459: 'reparar',
  1467: 'segredo absoluto', 2042: 'primeiro preceito', 2043: 'quarto preceito', 2180: 'participar na missa',
  2181: 'pecado grave', 2559: 'elevação da alma', 2697: 'vida do coração novo', 2720: 'oração regular',
  2111: 'superstição', 1862: 'pecado venial', 1857: 'três condições', 2354: 'pornografia',
};

export const GUIAS = [
  {
    id: 'primeira-vez', nome: 'Primeira vez na igreja', resumo: 'O que fazer da porta até a bênção final, com o que o povo responde.',
    secoes: [
      { titulo: 'Antes de ir', blocos: [
        { lista: [
          'Veja o horário da Missa no site ou nas redes da paróquia mais perto. A de domingo costuma ser a mais cheia; a de dia de semana é curta (uns 30 minutos) e boa para a primeira vez.',
          'Chegue uns 10 minutos antes. Ninguém vai te perguntar nada.',
          'Roupa simples e discreta, como para um lugar que você respeita. O gesto e a roupa também dizem alguma coisa {cic:1387}.',
          'Se você vai comungar: uma hora sem comer nem beber antes da comunhão (água e remédio podem). É o jejum eucarístico do Código de Direito Canônico, cânon 919 {cic:1387}.',
          'Celular no silencioso.',
        ] },
      ] },
      { titulo: 'Ao entrar', blocos: [
        { passos: [
          'Na porta tem uma pia de água benta. Molhe a ponta dos dedos e faça o sinal da cruz: lembra o Batismo.',
          'Procure a lâmpada vermelha acesa perto de um pequeno armário dourado (o sacrário). Ela avisa que Jesus está presente na Eucaristia guardada ali {cic:1374}.',
          'Antes de entrar no banco, dobre o joelho direito até o chão olhando para o sacrário (a genuflexão). Se não conseguir, uma inclinação profunda serve.',
          'Sente-se ou ajoelhe-se no banco e reze um pouco em silêncio, do seu jeito.',
        ] },
      ] },
      { titulo: 'A Missa, passo a passo', blocos: [
        { p: 'A Missa tem duas grandes partes, a Liturgia da Palavra e a Liturgia Eucarística, com uma abertura e um fim {cic:1346}. Se você se perder, faça o que o povo em volta faz: ninguém repara.' },
        { missa: [
          { parte: 'Ritos iniciais', postura: 'De pé', itens: [
            { o: 'Canto de entrada e procissão. Todos de pé.' },
            { padre: 'Em nome do Pai e do Filho e do Espírito Santo.', povo: 'Amém.' },
            { padre: 'O Senhor esteja convosco.', povo: 'Ele está no meio de nós.', nota: 'Com outras saudações, a resposta é "Bendito seja Deus, que nos reuniu no amor de Cristo."' },
            { o: 'Ato penitencial. Na primeira forma, todos rezam o "Confesso", batendo no peito no "por minha culpa".', texto: 'Confesso a Deus todo-poderoso e a vós, irmãos e irmãs, que pequei muitas vezes por pensamentos e palavras, atos e omissões, por minha culpa, minha culpa, minha tão grande culpa. E peço à Virgem Maria, aos Anjos e Santos e a vós, irmãos e irmãs, que rogueis por mim a Deus, nosso Senhor.' },
            { padre: 'Deus todo-poderoso tenha compaixão de nós, perdoe os nossos pecados e nos conduza à vida eterna.', povo: 'Amém.' },
            { o: '"Senhor, tende piedade de nós", e aos domingos (fora do Advento e da Quaresma) o Glória, cantado.' },
            { o: 'O padre reza a oração do dia ("Oremos..."), e no fim todos respondem "Amém."' },
          ] },
          { parte: 'Liturgia da Palavra', postura: 'Sentado nas leituras, de pé no Evangelho', itens: [
            { o: 'Primeira leitura (sentado).' },
            { padre: 'Palavra do Senhor.', povo: 'Graças a Deus.', quem: 'Leitor' },
            { o: 'Salmo: o povo repete o refrão que o salmista canta ou lê.' },
            { o: 'Aos domingos, segunda leitura, com a mesma resposta.' },
            { o: 'Aclamação ao Evangelho (Aleluia; na Quaresma, outro canto). Todos ficam de pé.' },
            { padre: 'O Senhor esteja convosco.', povo: 'Ele está no meio de nós.' },
            { padre: 'Proclamação do Evangelho de Jesus Cristo segundo...', povo: 'Glória a vós, Senhor.', nota: 'Costuma-se fazer três pequenas cruzes com o polegar: na testa, na boca e no peito.' },
            { padre: 'Palavra da Salvação.', povo: 'Glória a vós, Senhor.' },
            { o: 'Homilia (sentado).' },
            { o: 'Aos domingos, o Creio, de pé (o texto está em Orações). Depois, a oração dos fiéis: o povo responde a cada pedido com o refrão que for dito.' },
          ] },
          { parte: 'Liturgia Eucarística', postura: 'Sentado, de pé, de joelhos na consagração', itens: [
            { o: 'Preparação das oferendas e coleta (sentado). Dar alguma coisa é opcional.' },
            { padre: 'Orai, irmãos e irmãs, para que o meu e o vosso sacrifício seja aceito por Deus Pai todo-poderoso.', povo: 'Receba o Senhor por tuas mãos este sacrifício, para glória do seu nome, para nosso bem e de toda a sua santa Igreja.', nota: 'Fica-se de pé aqui.' },
            { padre: 'O Senhor esteja convosco.', povo: 'Ele está no meio de nós.' },
            { padre: 'Corações ao alto.', povo: 'O nosso coração está em Deus.' },
            { padre: 'Demos graças ao Senhor, nosso Deus.', povo: 'É nosso dever e nossa salvação.' },
            { o: 'O Santo, cantado ou rezado por todos.', texto: 'Santo, Santo, Santo, Senhor, Deus do universo! O céu e a terra proclamam a vossa glória. Hosana nas alturas! Bendito o que vem em nome do Senhor! Hosana nas alturas!' },
            { o: 'Oração eucarística. Na consagração, quando o padre ergue a hóstia e depois o cálice, todos ficam de joelhos (em muitas paróquias, desde depois do Santo). Quem não pode ajoelhar fica de pé e inclina a cabeça.', nota: 'Durante a oração eucarística o povo também diz aclamações curtas, como "Enviai o vosso Espírito Santo!" ou "Lembrai-vos, ó Pai, da vossa Igreja!": dá para acompanhar ouvindo os outros.' },
            { padre: 'Mistério da fé!', povo: 'Anunciamos, Senhor, a vossa morte e proclamamos a vossa ressurreição. Vinde, Senhor Jesus!', nota: 'Se o padre disser "Mistério da fé e do amor!": "Todas as vezes que comemos deste pão e bebemos deste cálice, anunciamos, Senhor, a vossa morte, enquanto esperamos a vossa vinda!". Se disser "Mistério da fé para a salvação do mundo!": "Salvador do mundo, salvai-nos, vós que nos libertastes pela cruz e ressurreição."' },
            { padre: 'Por Cristo, com Cristo, e em Cristo... por todos os séculos dos séculos.', povo: 'Amém.' },
          ] },
          { parte: 'Rito da Comunhão', postura: 'De pé', itens: [
            { o: 'Pai-Nosso, de pé, todos juntos. Depois o padre continua sozinho ("Livrai-nos de todos os males, ó Pai...").', povo: 'Vosso é o reino, o poder e a glória para sempre!' },
            { padre: 'A paz do Senhor esteja sempre convosco.', povo: 'O amor de Cristo nos uniu.', nota: 'Depois, um gesto de paz com quem está do lado (aperto de mão ou aceno).' },
            { o: 'Cordeiro de Deus, cantado.' },
            { padre: 'Eis o Cordeiro de Deus, que tira o pecado do mundo.', povo: 'Senhor, eu não sou digno(a) de que entreis em minha morada, mas dizei uma palavra e serei salvo(a).' },
            { o: 'Comunhão: o povo vai em fila até o ministro. Quem vai comungar ouve "O Corpo de Cristo" e responde "Amém". Pode receber na boca ou na mão (a esquerda sobre a direita; comungue ali mesmo, na frente do ministro).' },
            { o: 'Quem não vai comungar pode ficar no banco ou ir na fila com os braços cruzados sobre o peito, para receber uma bênção. As duas coisas são normais.' },
            { o: 'Depois, um tempo de silêncio para rezar, sentado ou de joelhos.' },
          ] },
          { parte: 'Ritos finais', postura: 'De pé', itens: [
            { padre: 'O Senhor esteja convosco.', povo: 'Ele está no meio de nós.' },
            { padre: 'Abençoe-vos Deus todo-poderoso, Pai e Filho e Espírito Santo.', povo: 'Amém.', nota: 'Todos fazem o sinal da cruz.' },
            { padre: 'Ide em paz, e o Senhor vos acompanhe.', povo: 'Graças a Deus.' },
          ] },
        ] },
        { p: 'As respostas são as da tradução brasileira do Missal Romano (3ª edição), em uso desde o Advento de 2023.' },
      ] },
      { titulo: 'Eu posso comungar?', blocos: [
        { p: 'A comunhão é o próprio Jesus, e por isso a Igreja pede algumas condições {cic:1385}.' },
        { lista: [
          'Ser católico e já ter feito a primeira comunhão. Quem ainda não é católico, ou ainda não fez a primeira comunhão, fica no banco ou pede a bênção (veja acima).',
          'Estar em estado de graça: quem tem consciência de um pecado grave não confessado se confessa antes de comungar {cic:1415}.',
          'O jejum de uma hora {cic:1387}.',
        ] },
        { aviso: 'Na dúvida sobre a sua situação, converse com o padre antes ou depois da Missa. É para isso que ele está lá.' },
      ] },
      { titulo: 'Depois da Missa', blocos: [
        { lista: [
          'Na saída, a secretaria paroquial dá os horários de confissão e de catequese de adultos.',
          'Ir à Missa todo domingo (e nos dias de preceito) é um dos preceitos da Igreja {cic:2180}. Faltar sem motivo sério é pecado grave {cic:2181}; doença, cuidar de alguém ou trabalho que não dá para largar dispensam.',
        ] },
      ] },
    ],
  },
  {
    id: 'conversao', nome: 'Depois da conversão', resumo: 'Os sacramentos que faltam, os preceitos e como começar uma vida de oração sem se perder.',
    secoes: [
      { titulo: 'O que aconteceu', blocos: [
        { p: '"Convertei-vos e crede no Evangelho" foi o primeiro chamado de Jesus {cic:1427} {bib:MRK.1.15}. Converter-se é voltar para Deus com o coração inteiro {cic:1431}, e não acontece uma vez só: é um caminho de toda a vida, a "segunda conversão" de quem já está dentro {cic:1428}.' },
        { p: 'Não precisa resolver tudo hoje. O que segue é uma ordem para os próximos meses.' },
      ] },
      { titulo: '1. Descubra em que pé você está', blocos: [
        { p: 'Os sacramentos da iniciação cristã são três: Batismo, Crisma e Eucaristia {cic:1212}. O próximo passo depende de quais você já recebeu.' },
        { lista: [
          'Nunca foi batizado: procure a paróquia e peça para entrar no catecumenato de adultos (o RICA, Rito de Iniciação Cristã de Adultos). É uma preparação de alguns meses que termina com os três sacramentos juntos, normalmente na Vigília Pascal {cic:1247} {cic:1248}. O Batismo perdoa todos os pecados da vida até ali {cic:1265}.',
          'Foi batizado em outra igreja cristã (com água e em nome do Pai, do Filho e do Espírito Santo): esse Batismo vale e não se repete {cic:1271}. A paróquia prepara você para ser recebido na Igreja Católica, com a confissão, a Crisma e a primeira comunhão.',
          'Foi batizado católico e se afastou: o caminho de volta é a confissão {cic:1446}. Se faltar a Crisma ou a primeira comunhão, existe catequese de adultos para isso {cic:1306}.',
        ] },
      ] },
      { titulo: '2. A confissão', blocos: [
        { p: 'Para quem já é batizado, a confissão é a porta de volta, e todo pecado é perdoado a quem se arrepende {cic:1422}. Tem um guia só dela aqui no Oratório, e a Colinha ajuda no exame de consciência.' },
      ] },
      { titulo: '3. A Missa de domingo', blocos: [
        { p: 'A Eucaristia é "fonte e cume de toda a vida cristã" {cic:1324}. A Missa de domingo e dos dias de preceito é obrigação {cic:2180}, e comungar, quando se está em estado de graça, é o centro dela {cic:1415}.' },
      ] },
      { titulo: '4. Os cinco preceitos da Igreja', blocos: [
        { p: 'É o mínimo que a Igreja pede de todo católico {cic:2042} {cic:2043}:' },
        { passos: [
          'Participar da Missa nos domingos e festas de preceito, e descansar do trabalho nesses dias.',
          'Confessar-se ao menos uma vez por ano {cic:1457}.',
          'Comungar ao menos uma vez por ano, de preferência no tempo da Páscoa {cic:1389}.',
          'Fazer jejum e abstinência nos dias marcados (Quarta-feira de Cinzas e Sexta-feira Santa; abstinência de carne nas sextas, que no Brasil pode ser trocada por outra penitência ou obra de caridade).',
          'Ajudar a Igreja nas suas necessidades.',
        ] },
      ] },
      { titulo: '5. Uma vida de oração', blocos: [
        { p: 'Oração é "a elevação da alma para Deus" {cic:2559}, e a Igreja convida a um ritmo regular: oração de todo dia, Missa de domingo, as festas do ano {cic:2720}. Comece pequeno e mantenha:' },
        { lista: [
          'De manhã, um minuto: o sinal da cruz e o oferecimento do dia.',
          'À noite, cinco minutos: agradecer, pedir perdão pelo que deu errado e um Pai-Nosso.',
          'Um capítulo da Bíblia por dia, pelo plano de leitura (os Evangelhos primeiro é um bom começo).',
          'O terço, quando der: começa com uma dezena só.',
        ] },
        { p: 'Esquecer acontece. Os mestres espirituais insistem em lembrar de Deus em horas certas justamente por isso {cic:2697}.' },
      ] },
      { titulo: '6. Comunidade e formação', blocos: [
        { lista: [
          'Procure um grupo na paróquia (jovens, oração, pastoral). Fé vivida sozinho esfria.',
          'Se puder, peça a um padre para acompanhar você de tempos em tempos (direção espiritual).',
          'O Catecismo responde quase tudo: use a busca aqui no Oratório quando bater uma dúvida.',
        ] },
      ] },
      { titulo: '7. Quando cair', blocos: [
        { p: 'Vai acontecer. O pecado leve enfraquece, mas não corta a amizade com Deus {cic:1862}; o grave se resolve na confissão, e confessar também os leves com frequência ajuda a crescer {cic:1458}. Desânimo não é humildade: levante, confesse e continue.' },
      ] },
    ],
  },
  {
    id: 'confissao', nome: 'Como se confessar', resumo: 'Antes, na hora e depois, com o que o padre diz e o que você responde.',
    secoes: [
      { titulo: 'O que é', blocos: [
        { p: 'É o sacramento em que Deus perdoa os pecados cometidos depois do Batismo e reconcilia a pessoa com a Igreja {cic:1422}. O padre é obrigado a segredo absoluto sobre o que ouve, sem exceção {cic:1467}.' },
      ] },
      { titulo: 'Antes', blocos: [
        { passos: [
          'Peça luz ao Espírito Santo (a oração "Vinde, Espírito Santo" serve).',
          'Faça o exame de consciência: a Colinha de pecados aqui no Oratório percorre os mandamentos com os § do Catecismo.',
          'Arrependa-se de verdade. A contrição é a dor de ter pecado com o propósito de não pecar mais {cic:1451}. Ela não precisa ser perfeita: arrepender-se por medo das consequências também vale para a confissão {cic:1453}.',
          'Veja o horário de confissões da paróquia (ou peça ao padre depois da Missa).',
        ] },
      ] },
      { titulo: 'Na hora', blocos: [
        { missa: [
          { parte: 'Passo a passo', postura: 'Sentado ou de joelhos, como o lugar permitir', itens: [
            { o: 'Faça o sinal da cruz. O padre pode ler um trecho curto da Bíblia ou dizer uma palavra de acolhida.' },
            { o: 'Diga há quanto tempo foi a última confissão (ou que é a primeira).', texto: 'Padre, faz [tempo] que me confessei.' },
            { o: 'Diga os pecados. Os graves com o tipo e mais ou menos quantas vezes {cic:1456}; os leves podem ir junto. Simples e direto, sem contar a história inteira.', nota: 'Se terminar e não lembrar de mais nada: "É isso, padre."' },
            { o: 'O padre dá um conselho e uma penitência (uma oração, uma boa obra).' },
            { o: 'Reze o ato de contrição (o texto está em Orações; qualquer forma serve, até com as suas palavras).' },
            { padre: '... Eu te absolvo dos teus pecados, em nome do Pai e do Filho e do Espírito Santo.', povo: 'Amém.', nota: 'É a absolvição. Faça o sinal da cruz.' },
            { padre: 'Dai graças ao Senhor, porque ele é bom.', povo: 'Porque é eterna a sua misericórdia.', nota: 'Às vezes o padre só diz "Vai em paz".' },
          ] },
        ] },
      ] },
      { titulo: 'Depois', blocos: [
        { lista: [
          'Cumpra a penitência logo. Se o pecado prejudicou alguém, faça o possível para reparar (devolver, desmentir) {cic:1459}.',
          'Esqueceu um pecado sem querer? Foi perdoado junto. Se era grave, diga na próxima confissão.',
          'Esconder de propósito um pecado grave invalida a confissão: aí é preciso voltar e dizer tudo {cic:1456}.',
        ] },
      ] },
      { titulo: 'Com que frequência', blocos: [
        { p: 'O mínimo é uma vez por ano para quem tem pecado grave {cic:1457}, e sempre antes de comungar se houver pecado grave {cic:1415}. A confissão frequente, mesmo só de pecados leves, é muito recomendada {cic:1458}.' },
      ] },
    ],
  },
];
