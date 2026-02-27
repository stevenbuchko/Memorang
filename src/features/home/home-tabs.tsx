"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare, Library } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThreadView } from "@/features/thread/thread-view";
import { KBView } from "@/features/knowledge-base/kb-view";
import type { Document, Summary, Evaluation, Feedback } from "@/types/database";

type DocumentWithSummaries = Document & {
  summaries: (Summary & { evaluation: Evaluation | null; feedback: Feedback | null })[];
};

interface HomeTabsProps {
  documents: DocumentWithSummaries[];
}

export function HomeTabs({ documents }: HomeTabsProps) {
  const router = useRouter();
  const processingDocs = documents.filter(
    (d) => d.status === "processing" || d.status === "uploading"
  );

  const pollProcessing = useCallback(async () => {
    for (const doc of processingDocs) {
      try {
        const res = await fetch(`/api/documents/${doc.id}`);
        if (!res.ok) continue;
        const data = await res.json();
        if (data.status === "completed") {
          toast.success(`${doc.filename} analyzed`);
          router.refresh();
          return;
        } else if (data.status === "failed") {
          toast.error(`Analysis failed for ${doc.filename}`);
          router.refresh();
          return;
        }
      } catch {
        // Silently fail — polling will retry
      }
    }
  }, [processingDocs, router]);

  useEffect(() => {
    if (processingDocs.length === 0) return;
    const interval = setInterval(pollProcessing, 3000);
    return () => clearInterval(interval);
  }, [processingDocs.length, pollProcessing]);

  return (
    <Tabs defaultValue="thread" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="thread" className="gap-1.5">
          <MessageSquare className="h-4 w-4" />
          Thread
        </TabsTrigger>
        <TabsTrigger value="knowledge-base" className="gap-1.5">
          <Library className="h-4 w-4" />
          Knowledge Base
        </TabsTrigger>
      </TabsList>
      <TabsContent value="thread" className="mt-4">
        <ThreadView documents={documents} />
      </TabsContent>
      <TabsContent value="knowledge-base" className="mt-4">
        <KBView documents={documents} />
      </TabsContent>
    </Tabs>
  );
}
