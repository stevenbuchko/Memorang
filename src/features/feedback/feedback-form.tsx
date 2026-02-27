"use client";

import { useState, useTransition } from "react";
import { ThumbsUp, ThumbsDown, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitFeedback } from "@/features/feedback/actions";
import type { Feedback, FeedbackRating } from "@/types/database";

interface FeedbackFormProps {
  summaryId: string;
  existingFeedback: Feedback | null;
}

export function FeedbackForm({ summaryId, existingFeedback }: FeedbackFormProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(
    existingFeedback?.rating ?? null
  );
  const [comment, setComment] = useState(existingFeedback?.comment ?? "");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleRating(value: FeedbackRating) {
    setRating(value);
    setSubmitted(false);
    setError(null);
  }

  function handleSubmit() {
    if (!rating) return;

    startTransition(async () => {
      const result = await submitFeedback({
        summaryId,
        rating,
        comment: comment.trim() || undefined,
      });

      if (result.error) {
        setError(result.error);
      } else {
        setSubmitted(true);
        setError(null);
      }
    });
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Feedback</h4>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={rating === "thumbs_up" ? "default" : "outline"}
          size="sm"
          className="min-h-[44px]"
          onClick={() => handleRating("thumbs_up")}
          disabled={isPending}
        >
          <ThumbsUp className="h-4 w-4 mr-1" />
          Helpful
        </Button>
        <Button
          variant={rating === "thumbs_down" ? "default" : "outline"}
          size="sm"
          className="min-h-[44px]"
          onClick={() => handleRating("thumbs_down")}
          disabled={isPending}
        >
          <ThumbsDown className="h-4 w-4 mr-1" />
          Not helpful
        </Button>
        {submitted && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle2 className="h-3 w-3" />
            Feedback submitted
          </span>
        )}
      </div>

      {rating && (
        <div className="space-y-2">
          <Textarea
            placeholder="Optional comment (max 500 characters)"
            value={comment}
            onChange={(e) => setComment(e.target.value.slice(0, 500))}
            rows={3}
            disabled={isPending}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {comment.length}/500
            </span>
            <Button size="sm" className="min-h-[44px]" onClick={handleSubmit} disabled={isPending || !rating}>
              {isPending && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {existingFeedback && !submitted ? "Update" : "Submit"}
            </Button>
          </div>
          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      )}
    </div>
  );
}
