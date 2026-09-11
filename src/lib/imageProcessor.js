export const SUPPORTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/pjpeg",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/x-ms-bmp",
  "image/avif",
  "image/x-icon",
  "image/vnd.microsoft.icon",
]);

const SUPPORTED_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "bmp",
  "avif",
  "ico",
]);

const UNSUPPORTED_MESSAGE = "仅支持浏览器可读取的常见位图格式。";
export const BROWSER_DECODE_MESSAGE =
  "当前浏览器无法读取此图片格式，请换用 PNG、JPG、WebP、GIF、BMP 或 AVIF。";

function fileExtension(name = "") {
  return name.toLowerCase().match(/\.([^.]+)$/)?.[1] || "";
}

export function validateImageFile(file) {
  const supportedMime = file && SUPPORTED_TYPES.has(file.type);
  const supportedUntypedFile = file
    && !file.type
    && SUPPORTED_EXTENSIONS.has(fileExtension(file.name));

  return supportedMime || supportedUntypedFile
    ? { ok: true }
    : { ok: false, message: UNSUPPORTED_MESSAGE };
}

export function getContainRect(sourceWidth, sourceHeight, targetSize = 60) {
  const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  return {
    x: Math.round((targetSize - width) / 2),
    y: Math.round((targetSize - height) / 2),
    width,
    height,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function colorDistance(r, g, b, background) {
  return Math.hypot(r - background.r, g - background.g, b - background.b);
}

export function estimateCornerBackground(data, width, height) {
  const blockSize = Math.max(1, Math.min(8, Math.floor(Math.min(width, height) / 6)));
  const samples = [];
  const origins = [
    [0, 0],
    [Math.max(0, width - blockSize), 0],
    [0, Math.max(0, height - blockSize)],
    [Math.max(0, width - blockSize), Math.max(0, height - blockSize)],
  ];

  for (const [originX, originY] of origins) {
    for (let y = originY; y < originY + blockSize; y += 1) {
      for (let x = originX; x < originX + blockSize; x += 1) {
        const offset = (y * width + x) * 4;
        samples.push({ r: data[offset], g: data[offset + 1], b: data[offset + 2] });
      }
    }
  }

  const background = {
    r: median(samples.map((sample) => sample.r)),
    g: median(samples.map((sample) => sample.g)),
    b: median(samples.map((sample) => sample.b)),
  };
  const matchingSamples = samples.filter(
    (sample) => colorDistance(sample.r, sample.g, sample.b, background) <= 24,
  ).length;

  return { ...background, confidence: matchingSamples / samples.length };
}

export function removeConnectedBackground(imageData, background, tolerance) {
  const { width, height } = imageData;
  const data = new Uint8ClampedArray(imageData.data);
  const visited = new Uint8Array(width * height);
  const queue = [];
  let head = 0;

  const enqueue = (x, y) => {
    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) return;
    visited[pixelIndex] = 1;

    const offset = pixelIndex * 4;
    const distance = colorDistance(data[offset], data[offset + 1], data[offset + 2], background);
    if (distance <= tolerance + 18) queue.push([x, y, distance]);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    if (height > 1) enqueue(x, height - 1);
  }
  for (let y = 1; y < height - 1; y += 1) {
    enqueue(0, y);
    if (width > 1) enqueue(width - 1, y);
  }

  while (head < queue.length) {
    const [x, y, distance] = queue[head];
    head += 1;
    const offset = (y * width + x) * 4;
    const feather = distance <= tolerance ? 0 : (distance - tolerance) / 18;
    data[offset + 3] = Math.round(data[offset + 3] * feather);

    if (x > 0) enqueue(x - 1, y);
    if (x + 1 < width) enqueue(x + 1, y);
    if (y > 0) enqueue(x, y - 1);
    if (y + 1 < height) enqueue(x, y + 1);
  }

  return { data, width, height };
}

const WEBP_QUALITIES = [0.92, 0.82, 0.72, 0.6, 0.48, 0.36];
const JPEG_QUALITIES = [0.9, 0.8, 0.7, 0.58, 0.46, 0.34];

export function selectEncodingCandidates(hasTransparency, { forcePng = false } = {}) {
  if (forcePng) return [{ type: "image/png", qualities: [undefined] }];

  const candidates = [
    { type: "image/png", qualities: [undefined] },
    { type: "image/webp", qualities: WEBP_QUALITIES },
  ];

  if (!hasTransparency) {
    candidates.push({ type: "image/jpeg", qualities: JPEG_QUALITIES });
  }

  return candidates;
}

export function shouldFillOutputBackground(hasTransparency) {
  return !hasTransparency;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("浏览器无法生成图片。"));
      },
      type,
      quality,
    );
  });
}

function hasTransparentPixels(imageData) {
  for (let offset = 3; offset < imageData.data.length; offset += 4) {
    if (imageData.data[offset] < 255) return true;
  }
  return false;
}

function createCanvas(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function drawIntermediate(sourceCanvas) {
  const maxDimension = Math.max(sourceCanvas.width, sourceCanvas.height);
  if (maxDimension <= 240) return sourceCanvas;

  const scale = 240 / maxDimension;
  const canvas = createCanvas(
    Math.max(1, Math.round(sourceCanvas.width * scale)),
    Math.max(1, Math.round(sourceCanvas.height * scale)),
  );
  const context = canvas.getContext("2d");
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function waitForImageLoad(image) {
  if (typeof image.decode === "function") return image.decode();

  return new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error(BROWSER_DECODE_MESSAGE));
  });
}

export async function decodeImageSource(file, adapters = {}) {
  const createBitmap = adapters.createBitmap ?? globalThis.createImageBitmap;

  if (typeof createBitmap === "function") {
    try {
      const bitmap = await createBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        cleanup: () => bitmap.close?.(),
      };
    } catch {
      // Fall through to the image-element decoder for broader browser compatibility.
    }
  }

  const createObjectURL = adapters.createObjectURL
    ?? globalThis.URL?.createObjectURL?.bind(globalThis.URL);
  const revokeObjectURL = adapters.revokeObjectURL
    ?? globalThis.URL?.revokeObjectURL?.bind(globalThis.URL);
  const ImageCtor = adapters.ImageCtor ?? globalThis.Image;
  let objectUrl;

  try {
    if (
      typeof createObjectURL !== "function"
      || typeof revokeObjectURL !== "function"
      || typeof ImageCtor !== "function"
    ) {
      throw new Error(BROWSER_DECODE_MESSAGE);
    }

    objectUrl = createObjectURL(file);
    const image = new ImageCtor();
    image.src = objectUrl;
    await waitForImageLoad(image);

    if (!image.naturalWidth || !image.naturalHeight) {
      throw new Error(BROWSER_DECODE_MESSAGE);
    }

    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      cleanup: () => revokeObjectURL(objectUrl),
    };
  } catch {
    if (objectUrl && typeof revokeObjectURL === "function") revokeObjectURL(objectUrl);
    throw new Error(BROWSER_DECODE_MESSAGE);
  }
}

export async function processImage(file, options = {}) {
  const validation = validateImageFile(file);
  if (!validation.ok) throw new Error(validation.message);

  const { removeBackground = false, tolerance = 28, forcePng = false } = options;
  let decoded;
  let sourceCanvas;
  let intermediateCanvas;

  try {
    decoded = await decodeImageSource(file);
    sourceCanvas = createCanvas(decoded.width, decoded.height);
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    sourceContext.drawImage(decoded.source, 0, 0);

    let sourcePixels = sourceContext.getImageData(0, 0, decoded.width, decoded.height);
    let backgroundConfidence = null;

    if (removeBackground && file.type === "image/png") {
      const background = estimateCornerBackground(
        sourcePixels.data,
        decoded.width,
        decoded.height,
      );
      backgroundConfidence = background.confidence;
      const cleared = removeConnectedBackground(sourcePixels, background, tolerance);
      sourcePixels.data.set(cleared.data);
      sourceContext.putImageData(sourcePixels, 0, 0);
    }

    const sourceHasTransparency = hasTransparentPixels(sourcePixels);
    intermediateCanvas = drawIntermediate(sourceCanvas);
    const targetCanvas = createCanvas(60, 60);
    const targetContext = targetCanvas.getContext("2d", { willReadFrequently: true });

    if (shouldFillOutputBackground(sourceHasTransparency)) {
      targetContext.fillStyle = "#ffffff";
      targetContext.fillRect(0, 0, 60, 60);
    }

    targetContext.imageSmoothingEnabled = true;
    targetContext.imageSmoothingQuality = "high";
    const rect = getContainRect(intermediateCanvas.width, intermediateCanvas.height);
    targetContext.drawImage(intermediateCanvas, rect.x, rect.y, rect.width, rect.height);

    const outputHasTransparency = hasTransparentPixels(targetContext.getImageData(0, 0, 60, 60));
    for (const candidate of selectEncodingCandidates(outputHasTransparency, { forcePng })) {
      for (const quality of candidate.qualities) {
        const blob = await canvasToBlob(targetCanvas, candidate.type, quality);
        if (blob.size < 10240) {
          return {
            blob,
            url: URL.createObjectURL(blob),
            width: 60,
            height: 60,
            type: blob.type || candidate.type,
            bytes: blob.size,
            backgroundConfidence,
          };
        }
      }
    }

    throw new Error(
      forcePng
        ? "无法将这张图片以 PNG 格式压缩到 10KB 以下。"
        : "无法将这张图片压缩到 10KB 以下。",
    );
  } catch (error) {
    if (error instanceof Error && error.message) throw error;
    throw new Error("图片可能已损坏，无法读取。");
  } finally {
    decoded?.cleanup();
    if (intermediateCanvas && intermediateCanvas !== sourceCanvas) {
      intermediateCanvas.width = 0;
      intermediateCanvas.height = 0;
    }
    if (sourceCanvas) {
      sourceCanvas.width = 0;
      sourceCanvas.height = 0;
    }
  }
}

export function revokeProcessedImage(result) {
  if (result?.url) URL.revokeObjectURL(result.url);
}
