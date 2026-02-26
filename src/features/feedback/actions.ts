"use server";

import { supabaseAdmin } from "@/lib/supabase";
import type { FeedbackRating } from "@/types/database";

interface SubmitFeedbackInput {
  summaryId: string;
  rating: FeedbackRating;
  comment?: string;
}

export async function submitFeedback(input: SubmitFeedbackInput) {
  const { summaryId, rating, comment } = input;

  // Validate rating
  if (rating !== "thumbs_up" && rating !== "thumbs_down") {
    return { error: "Invalid rating. Must be thumbs_up or thumbs_down." };
  }

  // Validate comment length
  if (comment && comment.length > 500) {
    return { error: "Comment must be 500 characters or fewer." };
  }

  // Verify summary exists
  const { data: summary, error: summaryError } = await supabaseAdmin
    .from("summaries")
    .select("id")
    .eq("id", summaryId)
    .single();

  if (summaryError || !summary) {
    return { error: "Summary not found." };
  }

  // Upsert feedback (update if already exists for this summary)
  const { error: upsertError } = await supabaseAdmin
    .from("feedback")
    .upsert(
      {
        summary_id: summaryId,
        rating,
        comment: comment?.trim() || null,
      },
      { onConflict: "summary_id" }
    );

  if (upsertError) {
    console.error("Failed to save feedback:", upsertError);
    return { error: "Failed to save feedback." };
  }

  return { success: true };
}
