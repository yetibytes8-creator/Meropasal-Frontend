import burgerImg from "@/assets/menu/burger.jpg";
import cappuccinoImg from "@/assets/menu/cappuccino.jpg";
import cakeImg from "@/assets/menu/chocolate-cake.jpg";
import friesImg from "@/assets/menu/fries.jpg";
import chickenImg from "@/assets/menu/grilled-chicken.jpg";
import icedLatteImg from "@/assets/menu/iced-latte.jpg";
import pizzaImg from "@/assets/menu/pizza.jpg";
import saladImg from "@/assets/menu/salad.jpg";

const genericImageSources = ["picsum.photos", "placehold.co", "placeholder.com", "dummyimage.com"];

export function menuFoodImage(name: string, category: string, image?: string | null) {
  const cleanImage = image?.trim();
  if (cleanImage && !genericImageSources.some((source) => cleanImage.includes(source))) {
    return cleanImage;
  }

  const key = `${name} ${category}`.toLowerCase();
  if (key.includes("tea") || key.includes("chai") || key.includes("coffee") || key.includes("latte") || key.includes("espresso") || key.includes("cappuccino")) {
    return key.includes("ice") ? icedLatteImg : cappuccinoImg;
  }
  if (key.includes("cake") || key.includes("dessert") || key.includes("sweet")) return cakeImg;
  if (key.includes("burger") || key.includes("sandwich") || key.includes("toast") || key.includes("snack")) return burgerImg;
  if (key.includes("fries") || key.includes("chips")) return friesImg;
  if (key.includes("chicken") || key.includes("meal") || key.includes("dal") || key.includes("bhat")) return chickenImg;
  if (key.includes("pizza")) return pizzaImg;
  if (key.includes("salad") || key.includes("veg")) return saladImg;
  return cappuccinoImg;
}

export function applyMenuImageFallback(img: HTMLImageElement, name: string, category: string) {
  if (img.dataset.fallbackApplied === "true") return;
  img.dataset.fallbackApplied = "true";
  img.src = menuFoodImage(name, category, null);
}
