import * as mupdf from "mupdf";
import { supabaseAdmin } from "@/lib/supabase";

export interface PdfToImagesResult {
  images: string[];
  pageCount: number;
  success: boolean;
  error?: string;
}

const DEFAULT_MAX_PAGES = 5;

export async function convertPdfToImages(
  filePath: string,
  maxPages: number = DEFAULT_MAX_PAGES
): Promise<PdfToImagesResult> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from("documents")
      .download(filePath);

    if (error || !data) {
      return {
        images: [],
        pageCount: 0,
        success: false,
        error: `Failed to download file from storage: ${error?.message ?? "No data returned"}`,
      };
    }

    const arrayBuffer = await data.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    let doc: mupdf.Document;
    try {
      doc = mupdf.Document.openDocument(buffer, "application/pdf");
    } catch (openError: unknown) {
      const message =
        openError instanceof Error ? openError.message : String(openError);

      if (message.toLowerCase().includes("password")) {
        return {
          images: [],
          pageCount: 0,
          success: false,
          error: "PDF is password-protected and cannot be rendered to images",
        };
      }

      return {
        images: [],
        pageCount: 0,
        success: false,
        error: `Failed to open PDF for image conversion: ${message}`,
      };
    }

    const totalPages = doc.countPages();
    const pagesToRender = Math.min(totalPages, maxPages);
    const images: string[] = [];

    for (let i = 0; i < pagesToRender; i++) {
      try {
        const page = doc.loadPage(i);
        const pixmap = page.toPixmap(
          mupdf.Matrix.identity,
          mupdf.ColorSpace.DeviceRGB,
          false
        );
        const pngBytes = pixmap.asPNG();
        const base64 = Buffer.from(pngBytes).toString("base64");
        images.push(base64);
      } catch (pageError: unknown) {
        const message =
          pageError instanceof Error ? pageError.message : String(pageError);
        console.error(`Failed to render page ${i + 1}: ${message}`);
        // Skip failed pages but continue with the rest
      }
    }

    if (images.length === 0) {
      return {
        images: [],
        pageCount: totalPages,
        success: false,
        error: "Failed to render any pages from the PDF",
      };
    }

    return {
      images,
      pageCount: totalPages,
      success: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      images: [],
      pageCount: 0,
      success: false,
      error: `Unexpected error during PDF-to-image conversion: ${message}`,
    };
  }
}
