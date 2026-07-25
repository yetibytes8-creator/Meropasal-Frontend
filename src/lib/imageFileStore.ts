const MAX_IMAGE_BYTES = 2_000_000;

export function fileToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Image must be 2 MB or smaller.");

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not save image file."));
    reader.readAsDataURL(file);
  });
}

export async function imageUrlToDataUrl(imageUrl: string): Promise<string> {
  const cleanUrl = imageUrl.trim();
  if (!cleanUrl) throw new Error("Image URL is required.");
  if (cleanUrl.startsWith("data:image/")) return cleanUrl;

  const response = await fetch(cleanUrl, { mode: "cors" });
  if (!response.ok) throw new Error("Image download failed.");

  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("URL must point to an image file.");
  if (blob.size > MAX_IMAGE_BYTES) throw new Error("Image must be 2 MB or smaller.");

  return fileToDataUrl(new File([blob], "product-image", { type: blob.type }));
}
