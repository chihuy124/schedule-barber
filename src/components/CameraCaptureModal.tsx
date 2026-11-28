"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Loader2,
  RefreshCw,
  RotateCcw,
  X,
} from "lucide-react";

interface CameraCaptureModalProps {
  open: boolean;
  uploading?: boolean;
  onClose: () => void;
  onCaptureFile: (file: File) => Promise<void> | void;
}

export function CameraCaptureModal({
  open,
  uploading = false,
  onClose,
  onCaptureFile,
}: CameraCaptureModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<"environment" | "user">(
    "environment"
  );
  const [starting, setStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCapturedFile(null);
  }, []);

  const startCamera = useCallback(
    async (mode: "environment" | "user") => {
      stopStream();
      setStarting(true);
      setCameraError(null);

      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setStarting(false);
        setCameraError(
          "Trình duyệt không hỗ trợ mở camera trực tiếp. Hãy dùng nút Mở camera máy bên dưới."
        );
        return;
      }

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 1280 },
            },
            audio: false,
          });
        } catch {
          // Fallback to any available camera (e.g. desktop laptop webcam)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setCameraError(
          "Không thể mở camera (chưa cấp quyền hoặc thiết bị đang dùng camera ở ứng dụng khác)."
        );
      } finally {
        setStarting(false);
      }
    },
    [stopStream]
  );

  useEffect(() => {
    if (!open) {
      stopStream();
      clearPreview();
      setCameraError(null);
      return;
    }

    if (!previewUrl) {
      startCamera(facingMode);
    }

    return () => {
      stopStream();
    };
  }, [open, facingMode, previewUrl, startCamera, stopStream, clearPreview]);

  if (!open) return null;

  const handleSnap = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) return;

    const maxSide = 1280;
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > maxSide || h > maxSide) {
      if (w >= h) {
        h = Math.round((h * maxSide) / w);
        w = maxSide;
      } else {
        w = Math.round((w * maxSide) / h);
        h = maxSide;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `haircut-${Date.now()}.jpg`, {
          type: "image/jpeg",
        });
        stopStream();
        setCapturedFile(file);
        setPreviewUrl(URL.createObjectURL(blob));
      },
      "image/jpeg",
      0.88
    );
  };

  const handleUsePhoto = async () => {
    if (!capturedFile || uploading) return;
    await onCaptureFile(capturedFile);
    clearPreview();
    onClose();
  };

  const handleNativeCameraInput = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    stopStream();
    await onCaptureFile(file);
    clearPreview();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm">
      <div className="card-classic flex w-full max-w-md flex-col overflow-hidden rounded-3xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-gold" />
            <h3 className="font-serif text-base font-bold text-ivory">
              Chụp Ảnh Kiểu Tóc
            </h3>
          </div>
          <button
            type="button"
            disabled={uploading}
            onClick={() => {
              stopStream();
              clearPreview();
              onClose();
            }}
            className="text-muted hover:text-ivory disabled:opacity-40"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewfinder / Preview */}
        <div className="relative aspect-[3/4] w-full overflow-hidden bg-obsidian">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Ảnh vừa chụp"
              className="h-full w-full object-cover"
            />
          ) : cameraError ? (
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gold/30 bg-gold/10 text-gold">
                <Camera className="h-6 w-6" />
              </div>
              <p className="text-xs leading-relaxed text-muted">{cameraError}</p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-gold px-4 py-2.5 text-xs font-semibold text-obsidian hover:bg-gold-light">
                <Camera className="h-4 w-4" />
                Mở camera của máy
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeCameraInput}
                  className="hidden"
                />
              </label>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`h-full w-full object-cover ${
                  facingMode === "user" ? "-scale-x-100" : ""
                }`}
              />
              {starting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-obsidian/80 text-xs text-muted">
                  <Loader2 className="h-6 w-6 animate-spin text-gold" />
                  Đang mở camera...
                </div>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-2.5 border-t border-white/10 bg-charcoal p-4">
          {previewUrl ? (
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={uploading}
                onClick={() => clearPreview()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border-subtle bg-surface py-3 text-xs font-semibold text-ivory hover:border-gold/40 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Chụp lại
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={handleUsePhoto}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gold py-3 text-xs font-semibold text-obsidian hover:bg-gold-light disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {uploading ? "Đang tải lên..." : "Dùng ảnh này"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={starting || Boolean(cameraError)}
                onClick={() =>
                  setFacingMode((m) =>
                    m === "environment" ? "user" : "environment"
                  )
                }
                className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-3 py-2.5 text-xs font-medium text-ivory hover:border-gold/40 disabled:opacity-40"
              >
                <RefreshCw className="h-3.5 w-3.5 text-gold" />
                Đổi cam
              </button>

              <button
                type="button"
                disabled={starting || Boolean(cameraError)}
                onClick={handleSnap}
                aria-label="Chụp ảnh"
                className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-gold/40 bg-gold text-obsidian shadow-lg shadow-gold/25 transition hover:bg-gold-light disabled:opacity-40"
              >
                <Camera className="h-6 w-6" />
              </button>

              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5 text-xs font-medium text-gold-light hover:bg-gold hover:text-obsidian">
                Cam máy
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleNativeCameraInput}
                  className="hidden"
                />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
