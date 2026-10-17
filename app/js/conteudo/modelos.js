// conteudo/modelos.js: modelos para começar uma oração própria. Escritos para este app; editar à vontade.
// O que está entre [colchetes] é para trocar pelo seu.

export const MODELOS = [
  { id: 'em-branco', nome: 'Em branco', texto: '' },
  { id: 'acts', nome: 'As quatro partes (louvor, perdão, gratidão, pedido)', dica: 'A estrutura clássica: cada parágrafo é uma atitude da oração (CIC 2626-2643).',
    texto: 'Senhor, [um louvor: quem Deus é para você].\n\nPeço perdão por [o que deu errado].\n\nObrigado por [três coisas de hoje].\n\nTe peço [o seu pedido] e rezo por [alguém].\n\nPor Cristo, nosso Senhor. Amém.' },
  { id: 'manha', nome: 'Oração da manhã', texto: 'Senhor, obrigado por mais este dia.\nTe ofereço tudo o que eu fizer hoje: o trabalho, o estudo, as conversas e o cansaço.\nMe ajuda a [o que vai ser difícil hoje].\nQue eu te encontre nas pessoas que eu vou ver.\nNossa Senhora, me acompanha. Amém.' },
  { id: 'noite', nome: 'Oração da noite', dica: 'Um exame curto: agradecer, reconhecer, entregar.',
    texto: 'Senhor, obrigado por hoje, principalmente por [algo bom do dia].\nPeço perdão por [onde eu falhei].\nEntrego nas tuas mãos [a preocupação de amanhã].\nGuarda esta casa e quem eu amo durante a noite.\nEm tuas mãos, Senhor, entrego o meu espírito. Amém.' },
  { id: 'tentacao', nome: 'Na hora da tentação', dica: 'Curta de propósito: é para rezar no momento.',
    texto: 'Jesus, eu sou teu.\nNão me deixa cair em tentação, me livra do mal.\nMe dá força agora, porque sozinho eu não consigo.\nSão Miguel, me defende. Nossa Senhora, me cobre com o teu manto.\nAmém.' },
  { id: 'familia', nome: 'Pela família', texto: 'Senhor, te entrego a minha família: [nomes].\nAbençoa cada um no que mais precisa, principalmente [um pedido].\nOnde houver briga, coloca paz; onde houver distância, aproxima.\nSagrada Família de Nazaré, cuida da nossa. Amém.' },
  { id: 'estudo', nome: 'Antes de estudar ou trabalhar', texto: 'Espírito Santo, ilumina a minha mente.\nMe dá concentração, memória e vontade para [a tarefa].\nQue eu faça bem feito, com honestidade, e que isto sirva para o bem.\nAmém.' },
  { id: 'gratidao', nome: 'De gratidão', texto: 'Senhor, hoje eu só quero agradecer.\nPor [primeira coisa].\nPor [segunda coisa].\nPor [terceira coisa].\nE até pelo que eu ainda não entendo.\nBendito seja o teu nome. Amém.' },
  { id: 'doente', nome: 'Por alguém doente', texto: 'Senhor Jesus, que curaste tantos doentes, olha para [nome].\nAlivia a dor, dá força para o tratamento e sabedoria para quem cuida.\nSe for da tua vontade, devolve a saúde; e em tudo, dá paz.\nNossa Senhora da Saúde, rogai por [nome]. Amém.' },
  { id: 'antes-confissao', nome: 'Antes da confissão', texto: 'Vinde, Espírito Santo, mostrai-me os meus pecados como Deus os vê, sem exagero e sem desculpa.\nDai-me arrependimento sincero, coragem para dizer tudo e confiança na tua misericórdia.\nAmém.' },
  { id: 'depois-comunhao', nome: 'Depois da comunhão', texto: 'Jesus, tu estás em mim agora.\nObrigado por vir, mesmo eu sendo quem eu sou.\nFica comigo [o que você quer entregar a ele].\nQue eu leve você para onde eu for hoje.\nAmém.' },
];
