// Port of lib/features/videos/data/saborly_videos.dart
import { Store } from "./store";

export type VideoTag = "videoTagMenu" | "videoTagReview" | "videoTagEvent" | "videoTagGuest" | "videoTagExperience";
export interface SaborlyVideo { id: string; titleKey: string; tag: VideoTag; durationSec: number }
export const videoAsset = (v: SaborlyVideo) => `/assets/videos/optimized/saborly_${v.id}.mp4`;
export const posterAsset = (v: SaborlyVideo) => `/assets/videos/posters/saborly_${v.id}.jpg`;

/** "0:33", "3:17" */
export function formatVideoDuration(sec: number): string {
  const total = Math.trunc(sec);
  return `${Math.trunc(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export const SABORLY_VIDEOS: SaborlyVideo[] = [
  { id: "taste_of_pakistan", titleKey: "videoTitleTasteOfPakistan", tag: "videoTagMenu", durationSec: 11 },
  { id: "friends_and_family", titleKey: "videoTitleFriendsAndFamily", tag: "videoTagExperience", durationSec: 33 },
  { id: "great_value", titleKey: "videoTitleGreatValue", tag: "videoTagReview", durationSec: 13 },
  { id: "nauman_ijaz_visit", titleKey: "videoTitleNaumanIjazVisit", tag: "videoTagGuest", durationSec: 23 },
  { id: "sabadell_fair", titleKey: "videoTitleSabadellFair", tag: "videoTagEvent", durationSec: 13 },
  { id: "food_review", titleKey: "videoTitleFoodReview", tag: "videoTagReview", durationSec: 197 },
  { id: "family_moments", titleKey: "videoTitleFamilyMoments", tag: "videoTagReview", durationSec: 42 },
  { id: "burger_or_pizza", titleKey: "videoTitleBurgerOrPizza", tag: "videoTagMenu", durationSec: 29 },
  { id: "chicken_tacos", titleKey: "videoTitleChickenTacos", tag: "videoTagMenu", durationSec: 10 },
  { id: "orange_blue_mocktail", titleKey: "videoTitleOrangeBlueMocktail", tag: "videoTagMenu", durationSec: 11 },
  { id: "come_eat_now", titleKey: "videoTitleComeEatNow", tag: "videoTagMenu", durationSec: 19 },
  { id: "red_velvet_cake", titleKey: "videoTitleRedVelvetCake", tag: "videoTagMenu", durationSec: 5 },
];

/** VideoReelsViewer.open / isOpen as a store (viewer is rendered once at the app root) */
export const reelsStore = new Store<{ open: boolean; videos: SaborlyVideo[]; index: number }>({ open: false, videos: SABORLY_VIDEOS, index: 0 });
export const openReels = (videos: SaborlyVideo[] = SABORLY_VIDEOS, index = 0) => reelsStore.set({ open: true, videos, index });
export const closeReels = () => reelsStore.set({ open: false });
