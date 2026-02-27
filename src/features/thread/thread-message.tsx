"use client";

import { Paperclip } from "lucide-react";
import type { MockUser } from "@/data/mock-thread";

interface ThreadMessageProps {
  user: MockUser;
  content: string;
  timestamp: string;
  mockAttachment?: { filename: string; sizeLabel: string };
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ThreadMessage({
  user,
  content,
  timestamp,
  mockAttachment,
}: ThreadMessageProps) {
  return (
    <div className="flex gap-3">
      <div
        className={`h-9 w-9 shrink-0 rounded-full ${user.color} flex items-center justify-center`}
      >
        <span className="text-xs font-semibold text-white">{user.initials}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold">{user.name}</span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(timestamp)}
          </span>
        </div>
        {content && <p className="text-sm mt-1">{content}</p>}
        {mockAttachment && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-md border bg-background px-3 py-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium truncate max-w-[200px] sm:max-w-none">
              {mockAttachment.filename}
            </span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {mockAttachment.sizeLabel}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
