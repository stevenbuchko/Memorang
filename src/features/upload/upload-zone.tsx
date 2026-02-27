"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileWarning, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { uploadDocument } from "./actions";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

type UploadState = "idle" | "uploading" | "error";

const CONTEXT_PRESETS: { label: string; text: string }[] = [
  {
    label: "Medical Education",
    text: "This document is part of a medical education curriculum. Evaluate its relevance to clinical training, patient care concepts, and medical terminology comprehension.",
  },
  {
    label: "Legal Compliance",
    text: "This document relates to legal compliance and regulatory requirements. Assess its coverage of compliance obligations, policy implications, and regulatory standards.",
  },
  {
    label: "Software Engineering",
    text: "This document is related to a software engineering project. Evaluate its relevance to technical architecture, development practices, and implementation guidance.",
  },
  {
    label: "Financial Reporting",
    text: "This document pertains to financial reporting and analysis. Assess its coverage of financial metrics, reporting standards, and fiscal data accuracy.",
  },
];

export function UploadZone() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [projectContext, setProjectContext] = useState("");

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (file.type !== "application/pdf") {
        setError("Only PDF files are accepted.");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("File must be 20MB or smaller.");
        return;
      }

      setUploadState("uploading");

      const formData = new FormData();
      formData.append("file", file);
      if (projectContext.trim()) {
        formData.append("projectContext", projectContext.trim());
      }

      const result = await uploadDocument(formData);

      if ("error" in result) {
        setError(result.error);
        setUploadState("error");
        return;
      }

      router.push(`/documents/${result.id}`);
    },
    [router, projectContext]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <Card
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 sm:py-12">
          {uploadState === "uploading" ? (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin mb-4" />
              <p className="text-sm font-medium">Uploading...</p>
              <p className="text-xs text-muted-foreground mt-1">
                This may take a moment
              </p>
            </>
          ) : (
            <>
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium">
                Drop a PDF here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF files up to 20MB
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />

      <button
        type="button"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px]"
        onClick={() => setShowContext(!showContext)}
      >
        {showContext ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
        Add project context (optional)
      </button>

      {showContext && (
        <div className="space-y-3">
          <Textarea
            placeholder="Describe the project this document belongs to..."
            value={projectContext}
            onChange={(e) => setProjectContext(e.target.value)}
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            {CONTEXT_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => setProjectContext(preset.text)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <FileWarning className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
