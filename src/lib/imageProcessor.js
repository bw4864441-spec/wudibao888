export const SUPPORTED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

const UNSUPPORTED_MESSAGE = "仅支持 PNG、JPG、JPEG 或 WebP 图片。";

export function validateImageFile(file) {
  return file && SUPPORTED_TYPES.has(file.type)
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

export async function processImage(file, options = {}) {
  const validation = validateImageFile(file);
  if (!validation.ok) throw new Error(validation.message);

  const { removeBackground = false, tolerance = 28, forcePng = false } = options;
  let bitmap;
  let sourceCanvas;
  let intermediateCanvas;

  try {
    bitmap = await createImageBitmap(file);
    sourceCanvas = createCanvas(bitmap.width, bitmap.height);
    const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
    sourceContext.drawImage(bitmap, 0, 0);

    let sourcePixels = sourceContext.getImageData(0, 0, bitmap.width, bitmap.height);
    let backgroundConfidence = null;

    if (removeBackground && file.type === "image/png") {
      const background = estimateCornerBackground(sourcePixels.data, bitmap.width, bitmap.height);
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
    bitmap?.close();
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
