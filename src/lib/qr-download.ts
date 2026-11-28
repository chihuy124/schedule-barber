/**
 * Downloads a QR image (VietQR SVG/PNG or uploaded static QR) as a real PNG file
 * so customers on iOS/Android can save it to Photos and scan directly in banking apps.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Không thể tải ảnh mã QR."));
    img.src = src;
  });
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function downloadQrImageAsPng(
  qrUrl: string,
  filename: string
): Promise<void> {
  const safeFilename = filename.endsWith(".png") ? filename : `${filename}.png`;
  let tempObjectUrl: string | null = null;

  try {
    let imageSrc = qrUrl;

    // Fetch remote URLs (e.g. img.vietqr.io which redirects to SVG) as a same-origin blob
    // so drawing onto <canvas> works reliably across Chrome, Safari, and mobile browsers.
    if (/^https?:\/\//i.test(qrUrl)) {
      const res = await fetch(qrUrl, { mode: "cors" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const fetchedBlob = await res.blob();
      tempObjectUrl = URL.createObjectURL(fetchedBlob);
      imageSrc = tempObjectUrl;
    }

    const img = await loadImage(imageSrc);
    const naturalW = img.naturalWidth || 540;
    const naturalH = img.naturalHeight || 640;

    // Upscale modestly for crisp QR edges while capping at 1280px
    const scale = Math.min(2, Math.max(1, 1080 / Math.max(naturalW, naturalH)));
    const drawW = Math.round(naturalW * scale);
    const drawH = Math.round(naturalH * scale);
    const pad = Math.round(Math.min(drawW, drawH) * 0.04);

    const canvas = document.createElement("canvas");
    canvas.width = drawW + pad * 2;
    canvas.height = drawH + pad * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unavailable");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, pad, pad, drawW, drawH);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("PNG export failed"))),
        "image/png"
      );
    });

    triggerBlobDownload(pngBlob, safeFilename);
  } catch {
    // Graceful fallback if an in-app webview blocks blob/canvas download
    window.open(qrUrl, "_blank", "noopener,noreferrer");
  } finally {
    if (tempObjectUrl) {
      URL.revokeObjectURL(tempObjectUrl);
    }
  }
}
