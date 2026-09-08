const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

function baseName(filename) {
  return filename.replace(/\.[^.]+$/, "").trim() || "icon";
}

export function createUploadId(filename, index) {
  const slug = baseName(filename)
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "icon";
  return `${slug}-${index}`;
}

export function isSupportedImage(file) {
  return ALLOWED_TYPES.has(file?.type);
}

export function optimizeImageToPng(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const scale = Math.min(1, 720 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const dataUrl = canvas.toDataURL("image/png");
      resolve({ dataUrl, content: dataUrl.replace(/^data:image\/png;base64,/, "") });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Invalid image"));
    };
    image.src = objectUrl;
  });
}

export async function prepareUploadEntry(file, category, index, convertImage = optimizeImageToPng) {
  if (!isSupportedImage(file)) throw new Error("Unsupported image type");

  const id = createUploadId(file.name, index);
  const optimized = await convertImage(file);
  const name = baseName(file.name);

  return {
    id,
    name,
    nameZh: name,
    category,
    filename: `${id}.png`,
    src: optimized.dataUrl,
    content: optimized.content,
  };
}
