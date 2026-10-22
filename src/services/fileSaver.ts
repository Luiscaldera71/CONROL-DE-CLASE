import * as XLSX from 'xlsx-js-style';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Guardado de archivos multiplataforma.
 * - Web: descarga normal del navegador.
 * - Android (Capacitor): el WebView no maneja descargas, así que se escribe el archivo
 *   en caché y se abre el menú "Compartir" (guardar en Drive, WhatsApp, correo, etc.).
 */

const isNative = () => Capacitor.isNativePlatform();

async function shareNativeFile(filename: string, base64: string): Promise<void> {
  const written = await Filesystem.writeFile({
    path: filename,
    data: base64,
    directory: Directory.Cache
  });
  await Share.share({
    title: filename,
    dialogTitle: 'Guardar o compartir archivo',
    url: written.uri
  });
}

export function saveWorkbook(wb: XLSX.WorkBook, filename: string): void {
  if (!isNative()) {
    XLSX.writeFile(wb, filename);
    return;
  }
  const base64 = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
  shareNativeFile(filename, base64).catch(err => {
    // Cancelar el menú de compartir no es un error real
    if (!String(err?.message || err).toLowerCase().includes('cancel')) {
      console.warn('No se pudo guardar el archivo en Android:', err);
      alert('No se pudo guardar el archivo. Revisa los permisos e intenta de nuevo.');
    }
  });
}

interface PdfLike {
  save: (filename: string) => unknown;
  output: (type: 'datauristring') => string;
}

export function savePdf(doc: PdfLike, filename: string): void {
  if (!isNative()) {
    doc.save(filename);
    return;
  }
  const dataUri = doc.output('datauristring');
  const base64 = dataUri.substring(dataUri.indexOf('base64,') + 7);
  shareNativeFile(filename, base64).catch(err => {
    if (!String(err?.message || err).toLowerCase().includes('cancel')) {
      console.warn('No se pudo guardar el PDF en Android:', err);
      alert('No se pudo guardar el PDF. Revisa los permisos e intenta de nuevo.');
    }
  });
}

export const isNativeApp = isNative;
