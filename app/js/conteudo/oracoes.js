// conteudo/oracoes.js: as orações prontas (texto tradicional, de domínio público, na forma usada no Brasil)
// e os mistérios do terço. Sem DOM.
//
// Linha que começa com "V." é do dirigente e "R." é a resposta; o resto é rezado por todos.

export const GRUPOS = [
  { id: 'basicas', nome: 'As de todo dia' },
  { id: 'maria', nome: 'Nossa Senhora' },
  { id: 'momentos', nome: 'Momentos do dia' },
  { id: 'arrependimento', nome: 'Arrependimento e luta' },
  { id: 'espirito', nome: 'Espírito Santo e anjos' },
];

export const ORACOES = [
  { id: 'sinal-da-cruz', grupo: 'basicas', nome: 'Sinal da cruz',
    texto: 'Pelo sinal da santa cruz, livrai-nos, Deus, nosso Senhor, dos nossos inimigos.\nEm nome do Pai e do Filho e do Espírito Santo. Amém.' },
  { id: 'pai-nosso', grupo: 'basicas', nome: 'Pai-Nosso', biblia: 'MAT.6.9-13',
    texto: 'Pai nosso que estais nos céus, santificado seja o vosso nome; venha a nós o vosso reino; seja feita a vossa vontade, assim na terra como no céu.\nO pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.' },
  { id: 'ave-maria', grupo: 'basicas', nome: 'Ave-Maria', biblia: 'LUK.1.28',
    texto: 'Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus.\nSanta Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora de nossa morte. Amém.' },
  { id: 'gloria', grupo: 'basicas', nome: 'Glória ao Pai',
    texto: 'Glória ao Pai e ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.' },
  { id: 'credo', grupo: 'basicas', nome: 'Creio (Símbolo dos Apóstolos)', nota: 'A forma curta do Creio, a do terço.',
    texto: 'Creio em Deus Pai todo-poderoso, criador do céu e da terra.\nE em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus, está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos.\nCreio no Espírito Santo, na santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne, na vida eterna. Amém.' },
  { id: 'credo-niceno', grupo: 'basicas', nome: 'Creio (Niceno-Constantinopolitano)', nota: 'A forma longa, rezada na Missa de domingo.',
    texto: 'Creio em um só Deus, Pai todo-poderoso, criador do céu e da terra, de todas as coisas visíveis e invisíveis.\nCreio em um só Senhor, Jesus Cristo, Filho Unigênito de Deus, nascido do Pai antes de todos os séculos: Deus de Deus, luz da luz, Deus verdadeiro de Deus verdadeiro; gerado, não criado, consubstancial ao Pai. Por ele todas as coisas foram feitas. E por nós, homens, e para nossa salvação, desceu dos céus: e se encarnou pelo Espírito Santo, no seio da Virgem Maria, e se fez homem. Também por nós foi crucificado sob Pôncio Pilatos; padeceu e foi sepultado. Ressuscitou ao terceiro dia, conforme as Escrituras, e subiu aos céus, onde está sentado à direita do Pai. E de novo há de vir, em sua glória, para julgar os vivos e os mortos; e o seu reino não terá fim.\nCreio no Espírito Santo, Senhor que dá a vida, e procede do Pai e do Filho; e com o Pai e o Filho é adorado e glorificado: ele que falou pelos profetas.\nCreio na Igreja, una, santa, católica e apostólica. Professo um só batismo para remissão dos pecados. E espero a ressurreição dos mortos e a vida do mundo que há de vir. Amém.' },
  { id: 'salve-rainha', grupo: 'maria', nome: 'Salve-Rainha',
    texto: 'Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva. A vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei. E depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre. Ó clemente, ó piedosa, ó doce sempre Virgem Maria.\nV. Rogai por nós, santa Mãe de Deus.\nR. Para que sejamos dignos das promessas de Cristo. Amém.' },
  { id: 'angelus', grupo: 'maria', nome: 'O Anjo do Senhor (Angelus)', nota: 'Tradicionalmente às 6h, ao meio-dia e às 18h. No Tempo Pascal, reza-se a Rainha do Céu no lugar.',
    texto: 'V. O Anjo do Senhor anunciou a Maria.\nR. E ela concebeu do Espírito Santo.\nAve Maria...\nV. Eis aqui a serva do Senhor.\nR. Faça-se em mim segundo a vossa palavra.\nAve Maria...\nV. E o Verbo se fez carne.\nR. E habitou entre nós.\nAve Maria...\nV. Rogai por nós, santa Mãe de Deus.\nR. Para que sejamos dignos das promessas de Cristo.\nOremos: Infundi, Senhor, nós vos pedimos, a vossa graça em nossas almas, para que, conhecendo pela anunciação do Anjo a encarnação de Jesus Cristo, vosso Filho, cheguemos, por sua paixão e cruz, à glória da ressurreição. Por Cristo, nosso Senhor. Amém.' },
  { id: 'rainha-do-ceu', grupo: 'maria', nome: 'Rainha do Céu (Regina Caeli)', nota: 'No lugar do Angelus, da Páscoa a Pentecostes.',
    texto: 'Rainha do céu, alegrai-vos, aleluia!\nPorque quem merecestes trazer em vosso seio, aleluia!\nRessuscitou como disse, aleluia!\nRogai a Deus por nós, aleluia!\nV. Alegrai-vos e exultai, ó Virgem Maria, aleluia!\nR. Porque o Senhor ressuscitou verdadeiramente, aleluia!\nOremos: Ó Deus, que vos dignastes alegrar o mundo com a ressurreição do vosso Filho, nosso Senhor Jesus Cristo, concedei-nos, por sua Mãe, a Virgem Maria, alcançar as alegrias da vida eterna. Por Cristo, nosso Senhor. Amém.' },
  { id: 'lembrai-vos', grupo: 'maria', nome: 'Lembrai-vos (Memorare)',
    texto: 'Lembrai-vos, ó piíssima Virgem Maria, que nunca se ouviu dizer que algum daqueles que têm recorrido à vossa proteção, implorado a vossa assistência e reclamado o vosso socorro, fosse por vós desamparado. Animado eu, pois, com igual confiança, a vós, ó Virgem entre todas singular, como a Mãe recorro, de vós me valho e, gemendo sob o peso dos meus pecados, me prostro a vossos pés. Não desprezeis as minhas súplicas, ó Mãe do Verbo de Deus humanado, mas dignai-vos de as ouvir propícia e de me alcançar o que vos rogo. Amém.' },
  { id: 'magnificat', grupo: 'maria', nome: 'Magnificat (o cântico de Maria)', biblia: 'LUK.1.46-55', daBiblia: true,
    nota: 'O texto vem direto da Bíblia escolhida (Lucas 1,46-55).' },
  { id: 'oferecimento', grupo: 'momentos', nome: 'Oferecimento do dia',
    texto: 'Ofereço-vos, ó meu Deus, em união com o Coração de Jesus, por meio do Coração Imaculado de Maria, as orações, obras, sofrimentos e alegrias deste dia, em reparação das nossas ofensas e por todas as intenções pelas quais o Coração de Jesus se oferece continuamente no altar. Amém.' },
  { id: 'antes-refeicao', grupo: 'momentos', nome: 'Antes das refeições',
    texto: 'Abençoai-nos, Senhor, e a estes dons que vamos receber da vossa bondade. Por Cristo, nosso Senhor. Amém.' },
  { id: 'depois-refeicao', grupo: 'momentos', nome: 'Depois das refeições',
    texto: 'Nós vos damos graças, Deus todo-poderoso, por todos os vossos benefícios. Vós que viveis e reinais pelos séculos dos séculos. Amém.' },
  { id: 'alma-de-cristo', grupo: 'momentos', nome: 'Alma de Cristo', nota: 'Boa para depois da comunhão.',
    texto: 'Alma de Cristo, santificai-me.\nCorpo de Cristo, salvai-me.\nSangue de Cristo, inebriai-me.\nÁgua do lado de Cristo, lavai-me.\nPaixão de Cristo, confortai-me.\nÓ bom Jesus, ouvi-me.\nDentro de vossas chagas, escondei-me.\nNão permitais que eu me separe de vós.\nDo espírito maligno, defendei-me.\nNa hora da minha morte, chamai-me e mandai-me ir para vós, para que com os vossos santos vos louve, por todos os séculos dos séculos. Amém.' },
  { id: 'sao-francisco', grupo: 'momentos', nome: 'Oração pela paz ("de São Francisco")', nota: 'Leva o nome de São Francisco, mas apareceu na França em 1912. É bonita do mesmo jeito.',
    texto: 'Senhor, fazei-me instrumento de vossa paz.\nOnde houver ódio, que eu leve o amor; onde houver ofensa, que eu leve o perdão; onde houver discórdia, que eu leve a união; onde houver dúvida, que eu leve a fé; onde houver erro, que eu leve a verdade; onde houver desespero, que eu leve a esperança; onde houver tristeza, que eu leve a alegria; onde houver trevas, que eu leve a luz.\nÓ Mestre, fazei que eu procure mais consolar que ser consolado; compreender que ser compreendido; amar que ser amado. Pois é dando que se recebe, é perdoando que se é perdoado, e é morrendo que se vive para a vida eterna.' },
  { id: 'ato-de-contricao', grupo: 'arrependimento', nome: 'Ato de contrição', nota: 'Rezado na confissão, depois de dizer os pecados (há outras formas; qualquer uma serve).',
    texto: 'Meu Deus, eu me arrependo de todo o coração de vos ter ofendido, porque sois infinitamente bom e amável, e eu detesto o pecado. Proponho firmemente, com o auxílio da vossa graça, emendar-me e evitar as ocasiões de pecado. Senhor, tende piedade de mim, pecador. Amém.' },
  { id: 'o-meu-jesus', grupo: 'arrependimento', nome: 'Ó meu Jesus (Fátima)', nota: 'Rezada no terço, depois de cada Glória.',
    texto: 'Ó meu Jesus, perdoai-nos, livrai-nos do fogo do inferno, levai as almas todas para o céu e socorrei principalmente as que mais precisarem.' },
  { id: 'sao-miguel', grupo: 'arrependimento', nome: 'São Miguel Arcanjo', nota: 'Para a hora da tentação.',
    texto: 'São Miguel Arcanjo, defendei-nos no combate, sede o nosso refúgio contra a maldade e as ciladas do demônio. Ordene-lhe Deus, instantemente o pedimos, e vós, príncipe da milícia celeste, pela virtude divina, precipitai no inferno a Satanás e aos outros espíritos malignos que andam pelo mundo para perder as almas. Amém.' },
  { id: 'misericordia', grupo: 'arrependimento', nome: 'Terço da Misericórdia', nota: 'Também dá para rezar contando pelo terço interativo.',
    texto: 'No começo: Pai-Nosso, Ave-Maria e Creio.\nNas contas grandes: Eterno Pai, eu vos ofereço o Corpo e Sangue, Alma e Divindade de vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e dos do mundo inteiro.\nNas contas pequenas (10 vezes): Pela sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.\nNo fim (3 vezes): Deus Santo, Deus Forte, Deus Imortal, tende piedade de nós e do mundo inteiro.' },
  { id: 'vinde-espirito', grupo: 'espirito', nome: 'Vinde, Espírito Santo',
    texto: 'Vinde, Espírito Santo, enchei os corações dos vossos fiéis e acendei neles o fogo do vosso amor.\nV. Enviai o vosso Espírito e tudo será criado.\nR. E renovareis a face da terra.\nOremos: Ó Deus, que instruístes os corações dos vossos fiéis com a luz do Espírito Santo, concedei-nos que, no mesmo Espírito, saibamos o que é reto e gozemos sempre da sua consolação. Por Cristo, nosso Senhor. Amém.' },
  { id: 'santo-anjo', grupo: 'espirito', nome: 'Santo Anjo',
    texto: 'Santo Anjo do Senhor, meu zeloso guardador, se a ti me confiou a piedade divina, sempre me rege, me guarda, me governa e me ilumina. Amém.' },
];

// ── o terço ──────────────────────────────────────────────────

export const MISTERIOS = {
  gozosos: { nome: 'Mistérios gozosos', dias: [1, 6], itens: [
    { nome: 'A anunciação do Anjo a Maria', biblia: 'LUK.1.26-38', meditar: 'O sim de Maria. Onde Deus está me pedindo um sim?' },
    { nome: 'A visitação de Maria a Isabel', biblia: 'LUK.1.39-45', meditar: 'Maria vai às pressas servir. Quem precisa de mim agora?' },
    { nome: 'O nascimento de Jesus em Belém', biblia: 'LUK.2.1-14', meditar: 'Deus escolhe a pobreza e o escondido.' },
    { nome: 'A apresentação de Jesus no Templo', biblia: 'LUK.2.22-35', meditar: 'Simeão esperou a vida inteira e reconheceu o Senhor.' },
    { nome: 'O encontro de Jesus no Templo', biblia: 'LUK.2.41-52', meditar: 'Procurar Jesus quando parece que ele sumiu.' },
  ] },
  luminosos: { nome: 'Mistérios luminosos', dias: [4], itens: [
    { nome: 'O batismo de Jesus no Jordão', biblia: 'MAT.3.13-17', meditar: '"Este é o meu Filho amado." Pelo Batismo, eu também sou filho.' },
    { nome: 'As bodas de Caná', biblia: 'JHN.2.1-11', meditar: '"Fazei tudo o que ele vos disser."' },
    { nome: 'O anúncio do Reino e o convite à conversão', biblia: 'MRK.1.14-15', meditar: 'Converter-se não é uma vez só: é todo dia.' },
    { nome: 'A transfiguração', biblia: 'LUK.9.28-36', meditar: 'A glória que espera do outro lado da cruz.' },
    { nome: 'A instituição da Eucaristia', biblia: 'MAT.26.26-29', meditar: 'Jesus fica com a gente de verdade, no pão e no vinho consagrados.' },
  ] },
  dolorosos: { nome: 'Mistérios dolorosos', dias: [2, 5], itens: [
    { nome: 'A agonia de Jesus no Horto', biblia: 'LUK.22.39-46', meditar: '"Vigiai e orai, para não cairdes em tentação."' },
    { nome: 'A flagelação de Jesus', biblia: 'JHN.19.1', meditar: 'Ele sofreu no corpo pelos pecados que a gente comete com o corpo.' },
    { nome: 'A coroação de espinhos', biblia: 'MAT.27.27-31', meditar: 'A humilhação aceita por amor.' },
    { nome: 'Jesus carrega a cruz', biblia: 'LUK.23.26-32', meditar: 'Simão de Cirene ajudou a carregar. Qual cruz eu ajudo a carregar?' },
    { nome: 'A crucifixão e a morte de Jesus', biblia: 'LUK.23.33-46', meditar: '"Pai, perdoa-lhes." E ao ladrão: "Hoje estarás comigo no paraíso."' },
  ] },
  gloriosos: { nome: 'Mistérios gloriosos', dias: [0, 3], itens: [
    { nome: 'A ressurreição de Jesus', biblia: 'MAT.28.1-10', meditar: 'A morte não tem a última palavra.' },
    { nome: 'A ascensão de Jesus ao céu', biblia: 'ACT.1.6-11', meditar: 'Ele vai na frente e prepara um lugar.' },
    { nome: 'A vinda do Espírito Santo', biblia: 'ACT.2.1-11', meditar: 'Os apóstolos com medo viram testemunhas corajosas.' },
    { nome: 'A assunção de Maria ao céu', biblia: 'REV.12.1', meditar: 'O que aconteceu com Maria é a promessa para nós.' },
    { nome: 'A coroação de Maria, Rainha do céu e da terra', biblia: 'REV.12.1', meditar: 'Mãe e Rainha, que intercede pelos filhos.' },
  ] },
};

/** Os mistérios do dia da semana (0 = domingo). */
export function misteriosDoDia(diaSemana) {
  return Object.entries(MISTERIOS).find(([, m]) => m.dias.includes(diaSemana));
}

/**
 * As contas do terço, em ordem: cada uma é { tipo, texto, misterio? }.
 * tipo: 'cruz' | 'pai' | 'ave' | 'gloria' | 'anuncio' | 'final'.
 */
export function contasDoTerco(chave) {
  const m = MISTERIOS[chave];
  const contas = [
    { tipo: 'cruz', oracao: 'sinal-da-cruz' }, { tipo: 'cruz', oracao: 'credo' }, { tipo: 'pai', oracao: 'pai-nosso' },
    { tipo: 'ave', oracao: 'ave-maria', nota: 'pela fé' }, { tipo: 'ave', oracao: 'ave-maria', nota: 'pela esperança' },
    { tipo: 'ave', oracao: 'ave-maria', nota: 'pela caridade' }, { tipo: 'gloria', oracao: 'gloria' },
  ];
  m.itens.forEach((item, i) => {
    contas.push({ tipo: 'anuncio', misterio: i, texto: `${i + 1}º mistério: ${item.nome}` });
    contas.push({ tipo: 'pai', oracao: 'pai-nosso', misterio: i });
    for (let k = 1; k <= 10; k++) contas.push({ tipo: 'ave', oracao: 'ave-maria', misterio: i, numero: k });
    contas.push({ tipo: 'gloria', oracao: 'gloria', misterio: i });
    contas.push({ tipo: 'gloria', oracao: 'o-meu-jesus', misterio: i });
  });
  contas.push({ tipo: 'final', oracao: 'salve-rainha' });
  return contas;
}

/** As contas do Terço da Misericórdia. */
export function contasDaMisericordia() {
  const grande = 'Eterno Pai, eu vos ofereço o Corpo e Sangue, Alma e Divindade de vosso diletíssimo Filho, Nosso Senhor Jesus Cristo, em expiação dos nossos pecados e dos do mundo inteiro.';
  const pequena = 'Pela sua dolorosa Paixão, tende misericórdia de nós e do mundo inteiro.';
  const fim = 'Deus Santo, Deus Forte, Deus Imortal, tende piedade de nós e do mundo inteiro.';
  const contas = [{ tipo: 'cruz', oracao: 'sinal-da-cruz' }, { tipo: 'pai', oracao: 'pai-nosso' }, { tipo: 'ave', oracao: 'ave-maria' }, { tipo: 'cruz', oracao: 'credo' }];
  for (let d = 0; d < 5; d++) {
    contas.push({ tipo: 'pai', texto: grande, misterio: d });
    for (let k = 1; k <= 10; k++) contas.push({ tipo: 'ave', texto: pequena, misterio: d, numero: k });
  }
  for (let k = 1; k <= 3; k++) contas.push({ tipo: 'final', texto: fim, numero: k });
  return contas;
}
