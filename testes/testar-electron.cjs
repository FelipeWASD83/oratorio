// Abre o app de Electron de verdade (uma janela aparece por uns segundos), com porta, modo demonstração e dados
// temporários, e confere pela depuração remota: a janela abre no Oratório, o servidor sobe junto, links de fora
// não navegam dentro da janela, e fechar a janela para o servidor que o app subiu. Não usa a porta 8074.
//
//   node testes\testar-electron.js
const path = require('path');
const fs = require('fs');
const os = require('os');
const http = require('http');
const { spawn, spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const ELECTRON = path.join(RAIZ, 'node_modules', 'electron', 'dist', 'electron.exe');
const PORTA = 8976;
const DEPURACAO = 9340;
const resultados = [];
function anotar(nome, ok, obtido) {
  resultados.push({ nome, ok });
  console.log((ok ? '  OK   ' : '  FALHA') + ' | ' + nome.padEnd(70) + ' | ' + JSON.stringify(obtido ?? null).slice(0, 120));
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));
const pegar = (url) => new Promise((resolver) => {
  http.get(url, { timeout: 2000 }, (res) => { let c = ''; res.on('data', (x) => { c += x; }); res.on('end', () => resolver({ status: res.statusCode, corpo: c })); })
    .on('error', () => resolver(null)).on('timeout', function () { this.destroy(); resolver(null); });
});

(async () => {
  if (!fs.existsSync(ELECTRON)) { console.log('Sem o Electron instalado (rode o abrir.bat uma vez).'); process.exit(0); }
  const dados = fs.mkdtempSync(path.join(os.tmpdir(), 'oratorio-electron-'));
  const externo = path.join(dados, 'links-de-fora.txt');
  const app = spawn(ELECTRON, ['.', `--remote-debugging-port=${DEPURACAO}`, '--porta', String(PORTA), '--modo', 'demo', '--dados', path.join(dados, 'app')],
    { cwd: RAIZ, stdio: 'ignore', env: { ...process.env, ORATORIO_ELECTRON_DADOS: path.join(dados, 'electron'), ORATORIO_TESTE_EXTERNO: externo } });
  let saiu = false;
  app.on('exit', () => { saiu = true; });
  try {
    let pagina = null;
    for (let i = 0; i < 80 && !pagina; i++) {
      await dormir(400);
      const r = await pegar(`http://127.0.0.1:${DEPURACAO}/json`);
      if (r) pagina = JSON.parse(r.corpo).find((p) => p.type === 'page' && p.url.startsWith(`http://127.0.0.1:${PORTA}/`));
    }
    anotar('a janela abre no Oratório (e não numa página de erro)', !!pagina, pagina && { titulo: pagina.title, url: pagina.url });
    const saude = await pegar(`http://127.0.0.1:${PORTA}/api/saude`);
    anotar('o servidor subiu junto com o app', !!saude && saude.status === 200 && saude.corpo.includes('"oratorio"'));

    // CDP mínimo: avalia uma expressão na página
    const WebSocket = global.WebSocket;
    const avaliar = (expressao) => new Promise((resolver, rejeitar) => {
      const ws = new WebSocket(pagina.webSocketDebuggerUrl);
      ws.onopen = () => ws.send(JSON.stringify({ id: 1, method: 'Runtime.evaluate', params: { expression: expressao, awaitPromise: true, returnByValue: true } }));
      ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id === 1) { ws.close(); resolver(d.result && d.result.result ? d.result.result.value : null); } };
      ws.onerror = (e) => rejeitar(e);
    });
    if (pagina) {
      await dormir(1500);
      anotar('o título da janela é o da vista aberta ("Hoje · Oratório")', /Orat/.test(await avaliar('document.title')));
      anotar('a casca do app desenhou (lateral e o dia litúrgico)', await avaliar("!!document.querySelector('#lateral') && document.querySelector('#lateralDia b').textContent.length > 3"));
      anotar('sem o ouvinte da extensão: a página não depende dela', await avaliar("typeof window.__oratorio === 'object' && !('extensao' in window.__oratorio.ctx)"));
      anotar('cor litúrgica aplicada ao app', await avaliar("/^#/.test(getComputedStyle(document.documentElement).getPropertyValue('--lit').trim())"));
      const antes = pagina.url;
      await avaliar("(() => { const a = document.createElement('a'); a.href = 'https://example.org/'; a.target = '_self'; document.body.append(a); a.click(); return true; })()");
      await dormir(800);
      const depois = JSON.parse((await pegar(`http://127.0.0.1:${DEPURACAO}/json`)).corpo).find((p) => p.type === 'page');
      const anotados = fs.existsSync(externo) ? fs.readFileSync(externo, 'utf8').trim() : '';
      anotar('link de fora não navega dentro da janela e vai para o navegador de verdade', depois && depois.url.startsWith(`http://127.0.0.1:${PORTA}/`) && anotados === 'https://example.org/', { janela: depois && depois.url, anotado: anotados });
    }
    // fechar a janela: o app sai e leva o servidor
    spawnSync('taskkill', ['/PID', String(app.pid)], { windowsHide: true });   // fecha as janelas, como o X
    for (let i = 0; i < 25 && !saiu; i++) await dormir(300);
    await dormir(1500);
    anotar('fechar a janela encerra o app', saiu);
    anotar('e o servidor que o app subiu para junto', (await pegar(`http://127.0.0.1:${PORTA}/api/saude`)) === null);
  } finally {
    if (!saiu) spawnSync('taskkill', ['/PID', String(app.pid), '/T', '/F'], { windowsHide: true });
    await dormir(500);
    fs.rmSync(dados, { recursive: true, force: true });
  }
  const falhas = resultados.filter((r) => !r.ok).length;
  console.log(`\n${resultados.length - falhas}/${resultados.length} passaram`);
  console.log(falhas ? 'FALHOU' : 'Tudo passou');
  process.exit(falhas ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
