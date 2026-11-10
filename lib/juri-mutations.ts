"use client";

import { createClient } from "@/lib/supabase/client";

type ReviewAction =
  | "start"
  | "heartbeat"
  | "finish"
  | "mark_done"
  | "unmark_done";

async function callRpc(
  name:
    | "juri_review_action"
    | "juri_toggle_candidate"
    | "juri_set_rank"
    | "juri_clear_rank",
  args: Record<string, unknown>,
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.rpc(name, args);
  if (error) {
    throw new Error(error.message);
  }
}

export async function saveJuriReview(
  karyaId: string,
  action: ReviewAction,
): Promise<void> {
  await callRpc("juri_review_action", {
    p_karya_id: karyaId,
    p_action: action,
  });
}

export async function toggleJuriCandidate(
  karyaId: string,
  selected: boolean,
  deleteRank = false,
): Promise<void> {
  await callRpc("juri_toggle_candidate", {
    p_karya_id: karyaId,
    p_selected: selected,
    p_delete_rank: deleteRank,
  });
}

export async function setJuriRank(
  karyaId: string,
  rank: number,
  replaceOccupant = false,
): Promise<void> {
  await callRpc("juri_set_rank", {
    p_karya_id: karyaId,
    p_rank: rank,
    p_replace_occupant: replaceOccupant,
  });
}

export async function clearJuriRank(karyaId: string): Promise<void> {
  await callRpc("juri_clear_rank", { p_karya_id: karyaId });
}
