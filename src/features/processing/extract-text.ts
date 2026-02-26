"use server";

import { PDFParse } from "pdf-parse";
import { supabaseAdmin } from "@/lib/supabase";

export interface TextExtractionResult {
  text: string;
  pageCount: number;
  success: boolean;
  error?: string;
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
      };
    }

    const arrayBuffer = await data.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    let textResult;
    let parser: PDFParse | null = null;
    try {
      parser = new PDFParse({ data: uint8Array });
      textResult = await parser.getText();
    } catch (parseError: unknown) {
      const message =
        parseError instanceof Error ? parseError.message : String(parseError);

      if (message.toLowerCase().includes("password")) {
        return {
          text: "",
          pageCount: 0,
          success: false,
          error: "PDF is password-protected and cannot be parsed",
        };
      }

      return {
        text: "",
        pageCount: 0,
        success: false,
        error: `Failed to parse PDF: ${message}`,
      };
    } finally {
      if (parser) {
        await parser.destroy().catch(() => {});
      }
    }

    const text = textResult.text?.trim() ?? "";
    const pageCount = textResult.total ?? 0;

    if (text.length < MIN_TEXT_LENGTH) {
      return {
        text,
        pageCount,
        success: false,
        error:
          text.length === 0
            ? "No text could be extracted (likely a scanned PDF)"
            : `Only ${text.length} characters extracted (likely a scanned PDF)`,
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
    };
  }
}
