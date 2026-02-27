// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - import from lib directly to avoid pdf-parse's test file auto-loading
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { supabaseAdmin } from "@/lib/supabase";
import type { ExtractionErrorType } from "@/types/database";

export interface TextExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
  errorType?: ExtractionErrorType;
}

const MIN_TEXT_LENGTH = 50;

export async function extractTextFromPdf(
  filePath: string
): Promise<TextExtractionResult> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("documents")
      .download(filePath);

    if (error || !data) {
      return {
        text: "",
        pageCount: 0,
        success: false,
        error: `Failed to download file from storage: ${error?.message ?? "No data returned"}`,
        errorType: "storage_error",
      };
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let result;
    try {
      result = await pdfParse(buffer);
    } catch (parseError: unknown) {
      const message =
        parseError instanceof Error ? parseError.message : String(parseError);

      if (message.toLowerCase().includes("password")) {
        return {
          text: "",
          pageCount: 0,
          success: false,
          error: "PDF is password-protected and cannot be parsed",
          errorType: "password_protected",
        };
      }

      return {
        text: "",
        pageCount: 0,
        success: false,
        error: `Failed to parse PDF: ${message}`,
        errorType: "corrupted",
      };
    }

    const text = result.text?.trim() ?? "";
    const pageCount = result.numpages ?? 0;

    if (text.length < MIN_TEXT_LENGTH) {
      return {
        text,
        pageCount,
        success: false,
        error:
          text.length === 0
            ? "No text could be extracted (likely a scanned PDF)"
            : `Only ${text.length} characters extracted (likely a scanned PDF)`,
        errorType: "no_text",
      };
    }

    return { text, pageCount, success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      text: "",
      pageCount: 0,
      success: false,
      error: `Unexpected error during text extraction: ${message}`,
      errorType: "unknown",
    };
  }
}
