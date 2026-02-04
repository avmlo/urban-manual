/**
 * Gemini File Search API
 * Endpoints for uploading files, creating stores, and querying with File Search
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createFileSearchStore,
  uploadFile,
  importFilesToStore,
  searchFiles,
  uploadDestinationGuide,
  queryDestinationInfo,
} from '@/lib/gemini-file-search';

/**
 * POST /api/gemini/file-search/store
 * Create a new File Search store
 */
export async function POST(request: NextRequest) {
  try {
    const { action, ...params } = await request.json();

    switch (action) {
      case 'create_store': {
        const { displayName } = params;
        if (!displayName) {
          return NextResponse.json(
            { error: 'displayName is required' },
            { status: 400 }
          );
        }

        const store = await createFileSearchStore(displayName);
        return NextResponse.json({ store });
      }

      case 'upload_file': {
        const { fileData, fileName, mimeType } = params;
        if (!fileData || !fileName || !mimeType) {
          return NextResponse.json(
            { error: 'fileData, fileName, and mimeType are required' },
            { status: 400 }
          );
        }

        // Convert base64 to buffer if needed
        const buffer = Buffer.from(fileData, 'base64');
        const uploadedFile = await uploadFile(buffer, fileName, mimeType);
        return NextResponse.json({ file: uploadedFile });
      }

      case 'import_files': {
        const { storeName, fileUris } = params;
        if (!storeName || !fileUris || !Array.isArray(fileUris)) {
          return NextResponse.json(
            { error: 'storeName and fileUris array are required' },
            { status: 400 }
          );
        }

        await importFilesToStore(storeName, fileUris);
        return NextResponse.json({ success: true });
      }

      case 'search': {
        const { storeName, query, maxResults, temperature, maxOutputTokens } = params;
        if (!storeName || !query) {
          return NextResponse.json(
            { error: 'storeName and query are required' },
            { status: 400 }
          );
        }

        const result = await searchFiles(storeName, query, {
          maxResults,
          temperature,
          maxOutputTokens,
        });
        return NextResponse.json({ result });
      }

      case 'upload_guide': {
        const { storeName, fileData, fileName } = params;
        if (!storeName || !fileData || !fileName) {
          return NextResponse.json(
            { error: 'storeName, fileData, and fileName are required' },
            { status: 400 }
          );
        }

        const buffer = Buffer.from(fileData, 'base64');
        const uploadedFile = await uploadDestinationGuide(storeName, buffer, fileName);
        return NextResponse.json({ file: uploadedFile });
      }

      case 'query_destination': {
        const { storeName, query } = params;
        if (!storeName || !query) {
          return NextResponse.json(
            { error: 'storeName and query are required' },
            { status: 400 }
          );
        }

        const result = await queryDestinationInfo(storeName, query);
        return NextResponse.json({ result });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action. Valid actions: create_store, upload_file, import_files, search, upload_guide, query_destination' },
          { status: 400 }
        );
    }
  } catch (error: any) {
    console.error('[File Search API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

