export type QrMenuAd = {
  id: string;
  title: string;
  subtitle: string;
  image: string;
  link: string;
  active: boolean;
  sortOrder: number;
};

export const QR_MENU_ADS_STORAGE_KEY = "mero-pasal-qr-menu-ads";

export const defaultQrMenuAds: QrMenuAd[] = [
  {
    id: "welcome-offer",
    title: "Today's Special Offer",
    subtitle: "Fresh combo deals are available for dine-in and takeaway.",
    image: "",
    link: "",
    active: true,
    sortOrder: 1,
  },
];

export const readQrMenuAds = (): QrMenuAd[] => {
  if (typeof window === "undefined") return defaultQrMenuAds;
  try {
    const raw = window.localStorage.getItem(QR_MENU_ADS_STORAGE_KEY);
    if (!raw) return defaultQrMenuAds;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultQrMenuAds;
  } catch {
    return defaultQrMenuAds;
  }
};

export const writeQrMenuAds = (ads: QrMenuAd[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QR_MENU_ADS_STORAGE_KEY, JSON.stringify(ads));
};

export const activeQrMenuAds = (ads: QrMenuAd[]) =>
  ads
    .filter((ad) => ad.active && (ad.title.trim() || ad.subtitle.trim() || ad.image.trim()))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title));
