"use server";

import { supabaseAdmin } from "@/lib/supabase";
import { triggerProcessing } from "@/features/processing/actions";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

interface UploadResult {
  id: string;
  filename: string;
  status: "processing";
}

interface UploadError {
  error: string;
}

export async function uploadDocument(
  formData: FormData
): Promise<UploadResult | UploadError> {
  const file = formData.get("file") as File | null;
  const projectContext = (formData.get("projectContext") as string | null) || null;
  const source = (formData.get("source") as string | null) || "thread";

  if (!file) {
    return { error: "No file provided" };
  }

  if (file.type !== "application/pdf") {
    return { error: "Only PDF files are accepted" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "File must be 20MB or smaller" };
  }

  const documentId = randomUUID();
  const filePath = `documents/${documentId}/${file.name}`;

  // Upload file to Supabase Storage
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: storageError } = await supabaseAdmin.storage
    .from("documents")
    .upload(filePath, buffer, {
      contentType: "application/pdf",
      upsert: false,
    });

  if (storageError) {
    return { error: `Storage upload failed: ${storageError.message}` };
  }

  // Create document record with status "uploading"
  const { error: insertError } = await supabaseAdmin
    .from("documents")
    .insert({
      id: documentId,
      filename: file.name,
      file_path: filePath,
      file_size: file.size,
      mime_type: "application/pdf",
      status: "uploading",
      extraction_success: false,
      project_context: projectContext,
      source,
    });

  if (insertError) {
    // Clean up storage on DB failure
    await supabaseAdmin.storage.from("documents").remove([filePath]);
    return { error: `Database insert failed: ${insertError.message}` };
  }

  // Update status to "processing"
  const { error: updateError } = await supabaseAdmin
    .from("documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  if (updateError) {
    return { error: `Failed to update document status: ${updateError.message}` };
  }

  // Trigger processing in the background (fire-and-forget)
  triggerProcessing(documentId).catch((err) =>
    console.error(`Background processing failed for ${documentId}:`, err)
  );

  return {
    id: documentId,
    filename: file.name,
    status: "processing",
  };
}
