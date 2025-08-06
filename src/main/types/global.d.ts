import { BrowserWindow } from 'electron';

declare global {
  var log: any;
  var win: BrowserWindow | null;
  var sendStatusToWindow: (text: string) => void;
}
