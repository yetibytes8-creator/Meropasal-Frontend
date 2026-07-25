import gardenHoseImg from "@/assets/products/garden-hose.jpg";
import ledBulbsImg from "@/assets/products/led-bulbs.jpg";
import oliveOilImg from "@/assets/products/olive-oil.jpg";
import paracetamolImg from "@/assets/products/paracetamol.jpg";
import riceImg from "@/assets/products/rice.jpg";
import tshirtImg from "@/assets/products/tshirt.jpg";
import usbCableImg from "@/assets/products/usb-cable.jpg";
import wirelessMouseImg from "@/assets/products/wireless-mouse.jpg";

const externalPlaceholderSources = [
  "source.unsplash.com",
  "images.unsplash.com",
  "picsum.photos",
  "placehold.co",
  "placeholder.com",
  "dummyimage.com",
];

function isLocalOrUploadedImage(image?: string | null) {
  const clean = image?.trim();
  if (!clean) return false;
  if (clean.startsWith("data:image/")) return true;
  if (clean.startsWith("/")) return true;
  if (clean.startsWith("blob:")) return true;
  return !externalPlaceholderSources.some((source) => clean.includes(source));
}

export function productImage(name: string, category: string, image?: string | null) {
  const cleanImage = image?.trim();
  if (isLocalOrUploadedImage(cleanImage)) return cleanImage;

  const key = `${name} ${category}`.toLowerCase();

  if (/(mouse|keyboard|cable|charger|earbud|audio|mobile accessor|computer accessor|ssd|ram|memory|router|network|printer|scanner|pos|monitor|desktop|laptop|ups|cctv|security|phone|mobile)/.test(key)) {
    if (/(mouse|earbud|keyboard|ssd|ram|router|monitor|desktop|laptop|printer|scanner|pos|ups|cctv|phone|mobile)/.test(key)) return wirelessMouseImg;
    return usbCableImg;
  }

  if (/(rice|grain|grocery|sugar|dal|noodle|biscuit|soap|tea|oil)/.test(key)) {
    if (/(oil|soap)/.test(key)) return oliveOilImg;
    return riceImg;
  }

  if (/(medicine|pharmacy|tablet|capsule|paracetamol|drug|medical)/.test(key)) return paracetamolImg;
  if (/(cloth|clothes|shirt|tshirt|t-shirt|jeans|shoe|footwear|fashion|apparel)/.test(key)) return tshirtImg;
  if (/(hardware|hose|pipe|garden|tool|bolt|paint|wire|led|bulb|electrical)/.test(key)) {
    if (/(led|bulb|electrical|wire)/.test(key)) return ledBulbsImg;
    return gardenHoseImg;
  }

  return wirelessMouseImg;
}
