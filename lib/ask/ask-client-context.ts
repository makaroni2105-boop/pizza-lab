/**
 * Ask UI — localStorage から ResearchContextInput 用データを収集。
 * 読取のみ。DIE / Learning / Lab storage ロジックは変更しない。
 */

import { applyStoredLearningToProfile } from "@/lib/learning/learning-storage";
import { listLearningRunsByShopId } from "@/lib/learning/learning-storage";
import { listFlourBlendsByShopId } from "@/lib/lab/blend-storage";
import { listComparisonRunsByShopId } from "@/lib/lab/comparison-storage";
import { listDoughDNAByShopId } from "@/lib/lab/dna-storage";
import { listDoughJournalsByShopId } from "@/lib/lab/journal-storage";
import { listLabSessionsByShopId } from "@/lib/lab/lab-storage";
import {
  DEMO_SHOP_ID,
  getBrowserStorage,
  getProfile,
  getQuickShopOptions,
  getSelectedShopId,
  type StorageLike,
} from "@/lib/profile/profile-storage";
import { getDemoShopProfile } from "@/lib/profile/demo-profiles";
import type { ResearchContextInput } from "@/types/ai";
import type { ShopProfile } from "@/types/profile";

export interface AskClientContextSummary {
  shopId: string;
  profileName: string | null;
  labSessions: number;
  doughDnas: number;
  flourBlends: number;
  journals: number;
  comparisons: number;
  learningRuns: number;
}

/** 選択中 shopId — 未選択時は demo shop */
export function resolveAskClientShopId(storage?: StorageLike): string {
  const store = storage ?? getBrowserStorage();
  const selected = store ? getSelectedShopId(store) : null;

  if (selected) {
    return selected;
  }

  return DEMO_SHOP_ID;
}

function resolveProfileForAsk(shopId: string, storage: StorageLike): ShopProfile | null {
  const options = getQuickShopOptions(storage);
  const option = options.find((item) => item.shopId === shopId);

  if (option?.profile) {
    return applyStoredLearningToProfile(option.profile, storage);
  }

  const stored = getProfile(shopId, storage);

  if (stored) {
    return applyStoredLearningToProfile(stored, storage);
  }

  if (shopId === DEMO_SHOP_ID) {
    const demo = getDemoShopProfile(DEMO_SHOP_ID);

    if (demo) {
      return applyStoredLearningToProfile(demo, storage);
    }
  }

  return null;
}

/** shop スコープの Lab / Learning / Profile データを ResearchContextInput 用に収集 */
export function buildAskClientContextPayload(
  shopId: string,
  storage?: StorageLike,
): Omit<ResearchContextInput, "question"> {
  const store = storage ?? getBrowserStorage();

  if (!store) {
    return { shopId };
  }

  const profile = resolveProfileForAsk(shopId, store);

  return {
    shopId,
    profile,
    learningRuns: listLearningRunsByShopId(shopId, store),
    labSessions: listLabSessionsByShopId(shopId, store),
    doughDnas: listDoughDNAByShopId(shopId, store),
    flourBlends: listFlourBlendsByShopId(shopId, store),
    journals: listDoughJournalsByShopId(shopId, store),
    comparisons: listComparisonRunsByShopId(shopId, store),
  };
}

export function summarizeAskClientContext(
  payload: Omit<ResearchContextInput, "question">,
): AskClientContextSummary {
  return {
    shopId: payload.shopId,
    profileName: payload.profile?.name ?? null,
    labSessions: payload.labSessions?.length ?? 0,
    doughDnas: payload.doughDnas?.length ?? 0,
    flourBlends: payload.flourBlends?.length ?? 0,
    journals: payload.journals?.length ?? 0,
    comparisons: payload.comparisons?.length ?? 0,
    learningRuns: payload.learningRuns?.length ?? 0,
  };
}
