"use server";

import { processDocument } from "./orchestrator";

export async function triggerProcessing(
  documentId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await processDocument(documentId);
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Processing failed for document ${documentId}:`, message);
    return { success: false, error: message };
  }
}
