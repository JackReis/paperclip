export type ProductivityReviewTrigger =
  | "no_comment_streak"
  | "long_active_duration"
  | "high_churn";

export interface ProductivityReviewTriggerSnooze {
  trigger: ProductivityReviewTrigger;
  snoozedUntil: string;
  reason?: string;
}

export interface ProductivityReviewOverride {
  triggerSnoozes?: ProductivityReviewTriggerSnooze[];
}
