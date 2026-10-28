// Browser-side photo prep shared by the capture screen and the public /try demo:
// decode (HEIC included, on Safari), downscale and re-encode to JPEG so the
// vision model can read it and uploads stay small. Browser-only (canvas).

// Media types Claude's vision API accepts. Anything else has to be transcoded
// before upload or the analysis will fail server-side.
const CLAUDE_READABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

// Longest edge we keep. Inspection defects are legible well below camera
// resolution, and a 4032px iPhone original costs upload time and vision
// latency for no diagnostic gain.
const MAX_EDGE = 2048;
const JPEG_QUALITY = 0.85;

// Re-encode a camera file into something Claude can read, at a sane size.
//
// The important case is HEIC: it's the iPhone default, Claude rejects it, and
// the old code passed it straight through — the inspector got a bare "AI
// failed". Safari decodes HEIC natively, so canvas transcoding fixes it on the
// devices that actually produce it. Browsers that can't decode the file throw
// here; we fall back to the original bytes and let the server return its
// specific "this is a HEIC" message rather than guessing in the dark.
export async function prepareImage(file: File): Promise<File> {
  const needsTranscode = !CLAUDE_READABLE.has(file.type.toLowerCase());

  const decoded = await decodeImage(file);
  if (!decoded) return file;
  const { source, width: srcW, height: srcH, release } = decoded;

  const scale = Math.min(1, MAX_EDGE / Math.max(srcW, srcH));
  if (!needsTranscode && scale === 1) {
    release();
    return file;
  }

  const width = Math.max(1, Math.round(srcW * scale));
  const height = Math.max(1, Math.round(srcH * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    release();
    return file;
  }
  ctx.drawImage(source, 0, 0, width, height);
  release();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
  );
  if (!blob) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "") || "photo";
  return new File([blob], `${baseName}.jpg`, {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  release: () => void;
};

// Decode a photo for canvas re-encoding. createImageBitmap with
// imageOrientation "from-image" is the preferred path, but older Safari
// versions reject that option value (or lack createImageBitmap for some
// files) and throw. Before, any throw meant the photo went up un-resized and,
// if it was HEIC, un-converted. An <img> element is the most widely supported
// decoder (Safari decodes HEIC with it, and applies EXIF orientation when
// drawing), so fall back to that before giving up.
async function decodeImage(file: File): Promise<DecodedImage | null> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        release: () => bitmap.close?.(),
      };
    } catch {
      // fall through to <img>
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("image decode failed"));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) {
      URL.revokeObjectURL(url);
      return null;
    }
    return {
      source: img,
      width: img.naturalWidth,
      height: img.naturalHeight,
      release: () => URL.revokeObjectURL(url),
    };
  } catch {
    URL.revokeObjectURL(url);
    return null;
  }
}
