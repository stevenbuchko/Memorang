import { AlertTriangle, XCircle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ExtractionErrorType } from "@/types/database";

interface ExtractionAlertProps {
  errorType: ExtractionErrorType;
  errorMessage?: string | null;
}

export function ExtractionAlert({ errorType, errorMessage }: ExtractionAlertProps) {
  switch (errorType) {
    case "password_protected":
      return (
        <Alert className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle>Password-Protected PDF</AlertTitle>
          <AlertDescription>
            This PDF is password-protected and text could not be extracted.
            Please upload an unlocked version for full analysis. The multimodal
            strategy may still produce results using page images.
          </AlertDescription>
        </Alert>
      );

    case "corrupted":
      return (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Corrupted File</AlertTitle>
          <AlertDescription>
            {errorMessage || "This file couldn\u2019t be read. It may be corrupted or not a valid PDF."}
          </AlertDescription>
        </Alert>
      );

    case "no_text":
      return (
        <Alert className="border-blue-500/50 bg-blue-50 dark:bg-blue-950/20">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle>Limited Text Content</AlertTitle>
          <AlertDescription>
            Limited text was extractable from this document. It may be a scanned
            PDF or image-based document. The multimodal strategy may produce
            better results for this document.
          </AlertDescription>
        </Alert>
      );

    case "storage_error":
      return (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>Storage Error</AlertTitle>
          <AlertDescription>
            {errorMessage || "Failed to retrieve the file from storage."}
          </AlertDescription>
        </Alert>
      );

    default:
      return null;
  }
}
