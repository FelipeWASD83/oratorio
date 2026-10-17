// Oratório como app de janela (Electron). Sobe o servidor Python do próprio Oratório (servidor/iniciar.py, que
// também cuida da atualização pelo GitHub), espera ele responder e abre a janela em http://127.0.0.1:8074.
// Fechar a janela para o servidor que este app subiu; se o servidor já estava no ar (preview, outro app),
// ele é aproveitado e deixado como estava.
//
// Argumentos úteis nos testes: --porta N, --modo demo e --dados <pasta> (vão para o servidor);
// ORATORIO_ELECTRON_DADOS troca a pasta onde o Electron guarda o tamanho da janela, e ORATORIO_TESTE_EXTERNO
// (um arquivo) recebe os links de fora em vez de abrirem o navegador.
const { app, BrowserWindow, Menu, dialog, shell, session } = require('electron');
const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const ORIGEM_LOCAL = /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/;

function argumento(nome, padrao) {
  const i = process.argv.indexOf(nome);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : padrao;
}
const PORTA = Number(argumento('--porta', process.env.ORATORIO_PORTA || 8074));
const MODO = argumento('--modo', '');
const DADOS = argumento('--dados', '');
const URL = `http://127.0.0.1:${PORTA}/`;

if (process.env.ORATORIO_ELECTRON_DADOS) app.setPath('userData', process.env.ORATORIO_ELECTRON_DADOS);

let janela = null;
let filho = null;       // o servidor que este app subiu (null = já estava no ar)
let saindo = false;

function respondendo() {
  return new Promise((resolver) => {
    const req = http.get({ host: '127.0.0.1', port: PORTA, path: '/api/saude', timeout: 1500 }, (res) => {
      let corpo = '';
      res.on('data', (c) => { corpo += c; });
      res.on('end', () => resolver(corpo.includes('"oratorio"')));
    });
    req.on('error', () => resolver(false));
    req.on('timeout', () => { req.destroy(); resolver(false); });
  });
}

async function esperarServidor(ms) {
  const fim = Date.now() + ms;
  while (Date.now() < fim) {
    if (await respondendo()) return true;
    if (filho && filho.exitCode !== null && filho.exitCode !== 3) return false;
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

function subirServidor() {
  const argumentos = [path.join(RAIZ, 'servidor', 'iniciar.py'), '--sem-janela', '--porta', String(PORTA)];
  if (MODO) argumentos.push('--modo', MODO);
  if (DADOS) argumentos.push('--dados', DADOS);
  filho = spawn(process.env.ORATORIO_PYTHON || 'python', argumentos, { cwd: RAIZ, windowsHide: true, stdio: 'ignore' });
  filho.on('error', (erro) => {
    dialog.showErrorBox('Oratório', `Não consegui abrir o Python (${erro.message}). Ele precisa estar instalado e no PATH.`);
    sair();
  });
  filho.on('exit', (codigo) => {
    filho = null;
    if (!saindo && codigo !== 0) {
      dialog.showErrorBox('Oratório', `O servidor do Oratório parou (código ${codigo}). Abra o Oratório de novo; se repetir, veja dados\\supervisor.log.`);
      sair();
    }
  });
}

function pararServidor() {
  if (filho && filho.pid) {
    // iniciar.py tem o servidor como filho: derruba a árvore toda
    spawnSync('taskkill', ['/PID', String(filho.pid), '/T', '/F'], { windowsHide: true });
    filho = null;
  }
}

function sair() {
  saindo = true;
  pararServidor();
  app.quit();
}

function arquivoDaJanela() {
  return path.join(app.getPath('userData'), 'janela.json');
}

function lerJanela() {
  try {
    const j = JSON.parse(fs.readFileSync(arquivoDaJanela(), 'utf8'));
    if (j && Number(j.width) >= 360 && Number(j.height) >= 400) return j;
  } catch { /* primeira vez */ }
  return { width: 1440, height: 900 };
}

function guardarJanela() {
  if (!janela || janela.isDestroyed() || janela.isMinimized() || janela.isFullScreen()) return;
  try {
    const { x, y, width, height } = janela.getNormalBounds();
    fs.mkdirSync(path.dirname(arquivoDaJanela()), { recursive: true });
    fs.writeFileSync(arquivoDaJanela(), JSON.stringify({ x, y, width, height, maximizada: janela.isMaximized() }));
  } catch { /* só não lembra */ }
}

function abrirJanela() {
  const salva = lerJanela();
  janela = new BrowserWindow({
    ...salva,
    minWidth: 360,
    minHeight: 480,
    backgroundColor: '#1c1a17',
    title: 'Oratório',
    icon: path.join(RAIZ, 'app', 'icone.ico'),
    autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, nodeIntegration: false, spellcheck: true },
  });
  if (salva.maximizada) janela.maximize();
  janela.loadURL(URL);
  janela.on('close', guardarJanela);
  janela.on('closed', () => { janela = null; });

  // Fora do Oratório (bible.com, CNBB, GitHub...): no navegador de verdade, nunca dentro desta janela.
  const paraFora = (url) => {
    if (!/^https?:\/\//.test(url) || ORIGEM_LOCAL.test(url)) return;
    // Só nos testes: em vez de abrir o navegador dele, anota o endereço num arquivo.
    if (process.env.ORATORIO_TESTE_EXTERNO) fs.appendFileSync(process.env.ORATORIO_TESTE_EXTERNO, url + '\n');
    else shell.openExternal(url);
  };
  janela.webContents.setWindowOpenHandler(({ url }) => { paraFora(url); return { action: 'deny' }; });
  janela.webContents.on('will-navigate', (evento, url) => {
    if (!ORIGEM_LOCAL.test(url)) { evento.preventDefault(); paraFora(url); }
  });

  // Atalhos de navegador que sem menu deixariam de existir: recarregar, zoom e tela cheia.
  janela.webContents.on('before-input-event', (evento, entrada) => {
    if (entrada.type !== 'keyDown') return;
    const ctrl = entrada.control || entrada.meta;
    const tecla = entrada.key;
    const wc = janela.webContents;
    if (tecla === 'F5' || (ctrl && tecla.toLowerCase() === 'r')) { wc.reload(); evento.preventDefault(); }
    else if (tecla === 'F11') { janela.setFullScreen(!janela.isFullScreen()); evento.preventDefault(); }
    else if (ctrl && (tecla === '+' || tecla === '=')) { wc.setZoomLevel(Math.min(wc.getZoomLevel() + 0.5, 3)); evento.preventDefault(); }
    else if (ctrl && tecla === '-') { wc.setZoomLevel(Math.max(wc.getZoomLevel() - 0.5, -3)); evento.preventDefault(); }
    else if (ctrl && tecla === '0') { wc.setZoomLevel(0); evento.preventDefault(); }
  });
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (janela) { if (janela.isMinimized()) janela.restore(); janela.focus(); }
  });

  app.whenReady().then(async () => {
    Menu.setApplicationMenu(null);
    // A página só precisa de cópia para a área de transferência (que não pede permissão); o resto fica negado.
    session.defaultSession.setPermissionRequestHandler((_wc, _permissao, resposta) => resposta(false));
    if (!(await respondendo())) {
      subirServidor();
      if (!(await esperarServidor(30000))) {
        dialog.showErrorBox('Oratório', 'O servidor do Oratório não respondeu em 30 segundos. Veja dados\\supervisor.log na pasta do app.');
        sair();
        return;
      }
    }
    abrirJanela();
  });

  app.on('window-all-closed', sair);
  app.on('before-quit', () => { saindo = true; pararServidor(); });
}
