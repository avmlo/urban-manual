/**
 * Gemini File Search Service
 * Provides managed RAG (Retrieval-Augmented Generation) using Gemini's File Search API
 * 
 * Features:
 * - Upload and index files (PDF, DOCX, TXT, JSON, images)
 * - Semantic search across uploaded files
 * - Automatic citations in responses
 * - Free storage and query-time embeddings
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_API_KEY || '';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash-latest';

const genAI = GOOGLE_API_KEY ? new GoogleGenerativeAI(GOOGLE_API_KEY) : null;
const fileManager = GOOGLE_API_KEY ? new GoogleAIFileManager(GOOGLE_API_KEY) : null;

export interface FileSearchStore {
  name: string;
  displayName?: string;
}

export interface UploadedFile {
  fileUri: string;
  name: string;
  mimeType: string;
  sizeBytes?: number;
}

export interface FileSearchResult {
  content: string;
  citations?: Array<{
    fileUri: string;
    chunkIndex?: number;
  }>;
}

/**
 * Create a new File Search store
 * A store is a container for your processed files
 */
export async function createFileSearchStore(displayName: string): Promise<FileSearchStore> {
  const payload = { displayName };
  const response = await callGeminiRest<{
    fileSearchStore?: { name?: string; displayName?: string };
    name?: string;
    displayName?: string;
  }>('/files:createFileSearchStore', payload);

  const store = (response.fileSearchStore ?? response) as {
    name?: string;
    displayName?: string;
  };

  if (!store?.name) {
    throw new Error('Gemini API returned an invalid store response.');
  }

  return {
    name: store.name,
    displayName: store.displayName ?? displayName,
  };
}

/**
 * Upload a file to Gemini File API
 * Returns a file URI that can be used in File Search
 */
export async function uploadFile(
  fileData: Buffer | Uint8Array,
  fileName: string,
  mimeType: string
): Promise<UploadedFile> {
  if (!fileManager) {
    throw new Error('GoogleAIFileManager not initialized. Check GOOGLE_API_KEY.');
  }

  try {
    const buffer = Buffer.isBuffer(fileData) ? fileData : Buffer.from(fileData);
    const file = await fileManager.uploadFile(buffer, {
      mimeType,
      displayName: fileName,
    });

    return {
      fileUri: file.file.uri,
      name: file.file.displayName || fileName,
      mimeType: file.file.mimeType || mimeType,
      sizeBytes: file.file.sizeBytes ? Number(file.file.sizeBytes) : undefined,
    };
  } catch (error) {
    console.error('[File Search] Error uploading file:', error);
    throw error;
  }
}

/**
 * Import files into a File Search store
 * This processes the files (chunking, embedding, indexing)
 */
export async function importFilesToStore(storeName: string, fileUris: string[]): Promise<void> {
  if (!fileUris.length) {
    throw new Error('At least one file URI is required to import.');
  }

  const normalized = normalizeStoreName(storeName);
  await callGeminiRest(`${buildStorePath(normalized)}/files:import`, {
    fileUris,
  });
}

/**
 * Query a File Search store with semantic search
 * Returns content grounded in your uploaded files with citations
 */
export async function searchFiles(
  storeName: string,
  query: string,
  options?: {
    maxResults?: number;
    temperature?: number;
    maxOutputTokens?: number;
  }
): Promise<FileSearchResult> {
  if (!genAI) {
    throw new Error('GoogleGenerativeAI not initialized. Check GOOGLE_API_KEY.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const normalized = normalizeStoreName(storeName);
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: query }] }],
      tools: [{ fileSearch: {} } as any],
      generationConfig: {
        temperature: options?.temperature ?? 0.3,
        maxOutputTokens: options?.maxOutputTokens ?? 2048,
      },
      toolConfig: {
        fileSearch: {
          vectorStoreNames: [normalized],
          maxResultCount: options?.maxResults ?? 5,
        },
      } as any,
    });

    const textResponse = response.response.text();
    const citations = extractCitations(response.response);

    return {
      content: textResponse,
      citations: citations.length ? citations : undefined,
    };
  } catch (error) {
    console.error('[File Search] Error searching files:', error);
    throw error;
  }
}

/**
 * Helper: Upload and index a destination guide PDF
 * Useful for enriching destination data from guidebooks
 */
export async function uploadDestinationGuide(
  storeName: string,
  pdfBuffer: Buffer,
  fileName: string
): Promise<UploadedFile> {
  const uploadedFile = await uploadFile(pdfBuffer, fileName, 'application/pdf');
  await importFilesToStore(storeName, [uploadedFile.fileUri]);
  return uploadedFile;
}

/**
 * Helper: Query destination information from uploaded guides
 * Example: "What are the best restaurants in Shibuya?"
 */
export async function queryDestinationInfo(
  storeName: string,
  query: string
): Promise<FileSearchResult> {
  return searchFiles(storeName, query, {
    maxResults: 5,
    temperature: 0.2, // Lower temperature for factual information
  });
}

/**
 * Helper: Upload structured data (JSON/CSV) for destination enrichment
 */
export async function uploadDestinationData(
  storeName: string,
  data: any,
  fileName: string
): Promise<UploadedFile> {
  const jsonString = JSON.stringify(data, null, 2);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');
  
  const uploadedFile = await uploadFile(jsonBuffer, fileName, 'application/json');
  await importFilesToStore(storeName, [uploadedFile.fileUri]);
  return uploadedFile;
}

function normalizeStoreName(storeName: string): string {
  const trimmed = storeName.trim();
  if (!trimmed) {
    throw new Error('Store name cannot be empty.');
  }
  return trimmed.startsWith('stores/') ? trimmed : `stores/${trimmed}`;
}

function buildStorePath(storeName: string): string {
  return '/' + storeName.split('/').map(encodeURIComponent).join('/');
}

async function callGeminiRest<T>(path: string, body: unknown): Promise<T> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is required for Gemini File Search.');
  }

  const response = await fetch(`${GEMINI_API_BASE}${path}?key=${GOOGLE_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  return response.json() as Promise<T>;
}

function extractCitations(response: any): Array<{ fileUri: string; chunkIndex?: number }> {
  const candidates = response?.candidates ?? [];
  const chunks =
    candidates[0]?.groundingMetadata?.groundingChunks ??
    candidates.flatMap((c: any) => c?.groundingMetadata?.groundingChunks ?? []);

  if (!chunks?.length) {
    return [];
  }

  return chunks
    .map((chunk: any) => {
      const uri = chunk.web?.uri || chunk.retrievedContext?.uri || chunk.chunkMetadata?.source;
      if (!uri) return null;
      return {
        fileUri: uri,
        chunkIndex: chunk.chunkIndex,
      };
    })
    .filter((entry: any): entry is { fileUri: string; chunkIndex?: number } => Boolean(entry));
}
