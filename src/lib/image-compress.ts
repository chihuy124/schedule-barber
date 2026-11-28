/**
 * Client-side image compressor using HTML5 Canvas.
 * Shrinks multi-megabyte phone photos (3-8 MB) to ~50-90 KB WebP/JPEG
 * before uploading — prevents hitting Vercel Serverless 4.5 MB body limits
 * and keeps database/bandwidth usage ultra-low.
 */
export async function compressImageFile(
  file: File,
  options: { maxDimension?: number; quality?: number } = {}
): Promise<File> {
  const maxDimension = options.maxDimension ?? 960;
  const quality = options.quality ?? 0.78;

  if (typeof window === "undefined" || !file.type.startsWith("image/")) {
    return file;
  }

  // Already tiny & in a web-safe format -> keep as-is
  const webSafe = ["image/jpeg", "image/png", "image/webp"].includes(file.type);
  if (webSafe && file.size <= 90 * 1024) {
    return file;
  }

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const finalize = (blob: Blob | null) => {
        if (!blob) {
          resolve(file);
          return;
        }
        const finalType = blob.type || "image/jpeg";
        const ext = finalType === "image/webp" ? ".webp" : ".jpg";
        const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
        const compressed = new File([blob], `${baseName}${ext}`, {
          type: finalType,
        });
        if (!webSafe) {
          resolve(compressed);
          return;
        }
        resolve(compressed.size < file.size ? compressed : file);
      };

      // Prefer WebP; if browser falls back to uncompressed PNG (e.g. older Safari), encode JPEG instead
      canvas.toBlob(
        (blob) => {
          if (blob && blob.type === "image/webp") {
            finalize(blob);
          } else {
            canvas.toBlob(finalize, "image/jpeg", quality);
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
