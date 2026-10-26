/**
 * Universal, robust file downloader for browser environments.
 * Fixes Chrome issue where downloads save as extensionless UUIDs (e.g. ab9c747d-f45d-4e95...)
 * instead of the desired filename and extension.
 */
export function triggerFileDownload(blob, fileName) {
  if (typeof window === 'undefined' || !blob) return;

  // Use File object where supported to embed the native file name directly into blob metadata
  let fileOrBlob = blob;
  try {
    fileOrBlob = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
  } catch {
    fileOrBlob = blob;
  }

  const url = URL.createObjectURL(fileOrBlob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  link.download = fileName;
  link.rel = 'noopener';
  link.style.display = 'none';
  link.style.position = 'fixed';
  link.style.top = '-9999px';
  link.style.left = '-9999px';

  document.body.appendChild(link);

  // Dispatch native MouseEvent to guarantee Chrome recognizes the download attribute
  try {
    link.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        view: window
      })
    );
  } catch {
    link.click();
  }

  // CRITICAL: Do NOT remove element synchronously!
  // Chromium's download manager resolves the 'download' attribute asynchronously.
  // Removing it immediately causes Chrome to drop the filename and save as raw UUID with no extension.
  setTimeout(() => {
    try {
      if (link.parentNode) {
        link.parentNode.removeChild(link);
      }
    } catch {}

    // Revoke object URL after 10 minutes so downloads and previews complete without file corruption
    setTimeout(() => {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }, 600000);
  }, 10000);
}
