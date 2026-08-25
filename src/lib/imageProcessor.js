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
