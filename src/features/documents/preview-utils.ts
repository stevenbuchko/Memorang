import type { Tag } from "@/types/database";

export function getCategoryColor(category: Tag["category"]): string {
  switch (category) {
    case "topic":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "document_type":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "entity":
      return "bg-green-100 text-green-800 border-green-200";
    case "methodology":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "domain":
      return "bg-pink-100 text-pink-800 border-pink-200";
  }
}

export function getCategoryLabel(category: Tag["category"]): string {
  switch (category) {
    case "topic":
      return "Topics";
    case "document_type":
      return "Document Type";
    case "entity":
      return "Entities";
    case "methodology":
      return "Methodology";
    case "domain":
      return "Domain";
  }
}

export function getScoreColor(score: number): string {
  if (score >= 7) return "text-green-600";
  if (score >= 4) return "text-yellow-600";
  return "text-red-600";
}

export function getScoreBadgeColor(score: number): string {
  if (score >= 7) return "bg-green-100 text-green-800 border-green-200";
  if (score >= 4) return "bg-yellow-100 text-yellow-800 border-yellow-200";
  return "bg-red-100 text-red-800 border-red-200";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
