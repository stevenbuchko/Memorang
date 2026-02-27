"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { uploadDocument } from "@/features/upload/actions";
import type { DocumentSource } from "@/types/database";

interface ThreadUploadZoneProps {
  source?: DocumentSource;
}

export function ThreadUploadZone({ source = "thread" }: ThreadUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  async function handleFile(file: File) {
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are accepted");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be 20MB or smaller");
      return;
    }

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);
      const result = await uploadDocument(formData);

      if ("error" in result) {
        toast.error(result.error);
      } else {
        toast.success("Document uploaded. Processing started...");
        router.refresh();
      }
    });
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${
        isDragOver
          ? "border-primary bg-primary/5"
          : "border-muted-foreground/25 hover:border-muted-foreground/40"
      }`}
    >
      <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="text-sm text-muted-foreground flex-1">
        {isPending
          ? "Uploading..."
          : source === "knowledge_base"
            ? "Upload a PDF to the knowledge base..."
            : "Attach a PDF to this thread..."}
      </span>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={onFileSelect}
        className="hidden"
      />
      <Button
        variant="ghost"
        size="sm"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
        className="min-h-[36px]"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "Browse"
        )}
      </Button>
    </div>
  );
}
