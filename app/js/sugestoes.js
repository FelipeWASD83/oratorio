// sugestoes.js: as dicas enquanto ele escreve uma oração (sem IA, sem rede e sem DOM).
//
// Regras simples, ditas com cuidado: nenhuma "corrige" a oração, só aponta o que
// pode melhorar. O revisor de IA (no servidor) é quem olha o texto inteiro.

const sem = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const ATITUDES = [
  { id: 'louvor', nome: 'louvor', dica: 'Que tal começar louvando quem Deus é (bondade, fidelidade, grandeza)?',
    re: /\b(louv|bendit|adoro|adoramos|gloria|glorific|santo e|grande e|bom e|maravilh|exalt|bendizer|bendigo)/ },
  { id: 'perdao', nome: 'pedido de perdão', dica: 'Um pedido de perdão sincero, mesmo curto, deixa a oração mais verdadeira.',
    re: /\b(perdo|perdao|pequei|arrepend|misericordia|piedade de mim|culpa|desculpa)/ },
  { id: 'gratidao', nome: 'ação de graças', dica: 'Você ainda não agradeceu nada. Uma linha de gratidão muda o tom da oração.',
    re: /\b(obrigad|agradec|gracas|grato|grata)/ },
  { id: 'pedido', nome: 'pedido', dica: 'Pode pedir sem medo: a súplica também é oração (e rezar pelos outros, intercessão).',
    re: /\b(peco|pedimos|rogo|rogai|ajud|da-me|dai-me|concede|conceda|proteg|abencoa|abencoe|cuida|olha por|intercede|fica comigo|me da|me de|livra|guarda)/ },
];
const COMECOS = /^\s*(senhor|pai|deus|jesus|meu deus|meu senhor|espirito santo|santissima|maria|nossa senhora|mae|sao |santa |santo |querido|amado|o deus|vinde|oh?\b|ó)/;
const VAZIAS = new Set('que para pelo pela pelos pelas como mais mas esta esse essa isso isto voce minha meus minhas tudo todo toda todos todas quando onde porque senhor'.split(' '));

/** Lista de { id, tipo: 'dica'|'cuidado'|'ok', texto, trecho? } para o texto atual. */
export function sugerir(texto) {
  const t = String(texto || '');
  const limpo = sem(t);
  const palavras = limpo.match(/[a-z]+/g) || [];
  const saida = [];
  if (palavras.length < 6) {
    return [{ id: 'comeco', tipo: 'dica', texto: 'Escreva do seu jeito, como se estivesse falando com alguém que te ama. As dicas aparecem aqui conforme o texto cresce.' }];
  }

  if (!COMECOS.test(limpo)) {
    saida.push({ id: 'chamar', tipo: 'dica', texto: 'Comece chamando por quem você está falando ("Senhor", "Pai", "Jesus", "Nossa Senhora"...). A oração é uma conversa.' });
  }
  const faltam = ATITUDES.filter((a) => !a.re.test(limpo));
  if (palavras.length >= 25 && faltam.length) {
    const prioridade = ['gratidao', 'louvor', 'perdao', 'pedido'];
    const a = faltam.sort((x, y) => prioridade.indexOf(x.id) - prioridade.indexOf(y.id))[0];
    saida.push({ id: 'atitude-' + a.id, tipo: 'dica', texto: a.dica });
  }
  if (faltam.length === 0) saida.push({ id: 'completa', tipo: 'ok', texto: 'Tem louvor, perdão, gratidão e pedido: as quatro atitudes da oração estão aqui.' });

  // Santos e Nossa Senhora intercedem: o pedido vai "a Deus por meio deles".
  const santo = /(nossa senhora|maria|sao [a-z]+|santa [a-z]+|santo [a-z]+)[^.!?\n]{0,40}\b(me salva|salva-me|me perdoa|perdoa-me|me da a graca)/.exec(limpo);
  if (santo) {
    saida.push({ id: 'intercessao', tipo: 'cuidado', trecho: santo[0],
      texto: 'Nossa Senhora e os santos intercedem por nós junto de Deus: fica mais certo pedir "rogai por mim" ou "intercede por mim" do que pedir a eles a salvação ou o perdão.' });
  }
  if (/\b(exijo|tem que me|voce tem que|tens que|eu mereco)/.test(limpo)) {
    saida.push({ id: 'exigir', tipo: 'cuidado', texto: 'Na oração a gente pede e confia; não exige. "Se for da tua vontade" deixa o pedido nas mãos de Deus.' });
  }
  if (/(infalivel|garantid|corrente de oracao|repasse|senao acontece|se nao rezar)/.test(limpo)) {
    saida.push({ id: 'supersticao', tipo: 'cuidado', texto: 'Nenhuma oração funciona como fórmula mágica: o que vale é a fé e o coração, não o número de vezes ou passar adiante (CIC 2111).' });
  }

  // tu e vós misturados
  const tu = /\b(tu|te|teu|tua|teus|tuas|contigo|es|estas)\b/.test(limpo);
  const vos = /\b(vos|vosso|vossa|vossos|vossas|convosco|sois|estais)\b/.test(limpo);
  if (tu && vos) {
    saida.push({ id: 'tratamento', tipo: 'dica', texto: 'O texto mistura "tu" (te, teu) e "vós" (vos, vosso). Os dois servem; escolher um deixa a leitura mais fluida.' });
  }

  // palavra repetida
  const contagem = new Map();
  for (const p of palavras) if (p.length >= 5 && !VAZIAS.has(p)) contagem.set(p, (contagem.get(p) || 0) + 1);
  const [repetida, vezes] = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  if (vezes >= 4 && vezes / palavras.length > 0.03) {
    saida.push({ id: 'repeticao', tipo: 'dica', trecho: repetida, texto: `"${repetida}" aparece ${vezes} vezes. Repetir pode ser de propósito (como numa ladainha); se não for, vale variar.` });
  }

  // frase longa demais
  const frases = t.split(/[.!?\n]+/).map((f) => f.trim()).filter(Boolean);
  const longa = frases.find((f) => (f.match(/\S+/g) || []).length > 45);
  if (longa) saida.push({ id: 'frase-longa', tipo: 'dica', trecho: longa.slice(0, 50), texto: 'Tem uma frase muito comprida. Quebrar em duas ajuda a rezar com calma.' });

  if (!/\bamem\b/.test(limpo.slice(-60))) {
    saida.push({ id: 'amem', tipo: 'dica', texto: 'Para fechar, um "Amém" (ou "por Cristo, nosso Senhor. Amém").' });
  }
  return saida;
}
