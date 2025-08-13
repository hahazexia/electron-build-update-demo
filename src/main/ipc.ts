import { app, ipcMain, BrowserWindow } from 'electron';
import { asarUpdateCheck, exitAndRunBatch } from './update.js';
import { UpdateType } from './types/update.js';
import { fileURLToPath } from 'node:url';
import { exec } from 'node:child_process';
import { logErrorInfo } from './utils.js';
import path from 'node:path';
import log from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function setupIpcEvents(): void {
  ipcMain.on('check-update', async (): Promise<void> => {
    log.info('start check updates');
    if (app.isPackaged) {
      const updataType: UpdateType = await asarUpdateCheck();
      log.info('updataType', updataType);

      if (updataType.type === 'full') {
        global.autoUpdater?.checkForUpdatesAndNotify();
      } else if (updataType.type === 'asar') {
        if (updataType.url) {
          exitAndRunBatch(updataType.url);
        }
      }
    }
  });
  ipcMain.on('get-version', e => {
    let currentVersion = app.getVersion();
    e.returnValue = currentVersion;
  });

  ipcMain.on('exit', (): void => {
    global.win?.hide();
  });
  ipcMain.on('open-synth-window', (): void => {
    const synthWin = new BrowserWindow({
      width: 800,
      height: 600,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    global.synthWin = synthWin;

    const html = path.join(__dirname, 'synth.html');
    synthWin.loadFile(html);
    synthWin.webContents.openDevTools();
  });
  ipcMain.on('exec-win-synth-shell-voices', (): void => {
    const psScript = `
      Add-Type -AssemblyName System.Speech;
      $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer;
      $synth.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }
    `
      .replace(/\n/g, ' ')
      .trim();

    exec(`powershell -Command "${psScript}"`, (err, stdout, stderr) => {
      if (err) {
        logErrorInfo('exec-win-synth-shell', err);
        return;
      }
      if (stderr) {
        logErrorInfo('exec-win-synth-shell stderr', stderr);
        return;
      }

      const voices = stdout.split('\r\n').filter(v => v.trim() !== '');
      log.info(`exec-win-synth-shell voices: ${voices}`);
      global.synthWin?.webContents.send('win-synth-shell-voices', voices);
    });
  });
  ipcMain.on('exec-win-synth-shell-speak', (_, data): void => {
    const { text, voice = undefined, rate = 0, volume = 100 } = data;

    const escapedText = text.replace(/'/g, "''").replace(/\$/g, '`$');
    const escapedVoice = voice
      ? voice.replace(/'/g, "''").replace(/\$/g, '`$')
      : '';
    const psScript = `
      Add-Type -AssemblyName System.Speech;
      $text = '${escapedText}';
      $voice = '${escapedVoice}';
      $rate = ${rate};
      $volume = ${volume};
      $speechSynthesizer = [System.Speech.Synthesis.SpeechSynthesizer]::new();
      $speechSynthesizer.Rate = $rate;
      $speechSynthesizer.Volume = $volume;
      if ($voice -ne '') { $speechSynthesizer.SelectVoice($voice) };
      $speechSynthesizer.Speak($text);
    `
      .replace(/\n/g, ' ')
      .trim();

    exec(`powershell -Command "${psScript}"`, (err, stdout, stderr) => {
      if (err) {
        logErrorInfo('exec-win-synth-shell-speak', err);
        return;
      }
      if (stderr) {
        logErrorInfo('exec-win-synth-shell-speak stderr', stderr);
        return;
      }
    });
  });
}
