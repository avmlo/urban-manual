# Gemini File Search Implementation

## Overview

Gemini File Search provides a **managed RAG (Retrieval-Augmented Generation)** system that allows you to:
- Upload files (PDFs, DOCX, TXT, JSON, images)
- Automatically index them with semantic search
- Query them with natural language
- Get responses with automatic citations

## Why Use File Search?

### Current Use Cases
1. **Destination Guide Enrichment**: Upload guidebook PDFs to enrich destination data
2. **Structured Data Processing**: Import JSON/CSV files with destination information
3. **Image Analysis**: Upload destination photos for visual analysis
4. **Document Q&A**: Answer questions about uploaded travel guides

### Benefits
- ✅ **Free storage** and query-time embeddings
- ✅ **Automatic chunking** and indexing
- ✅ **Built-in citations** for transparency
- ✅ **Semantic search** (understands meaning, not just keywords)
- ✅ **Low cost**: $0.15 per 1M tokens for indexing only

## Implementation Status

### ✅ Completed
- [x] Core service module (`lib/gemini-file-search.ts`)
- [x] API endpoints (`app/api/gemini/file-search/route.ts`)
- [x] Helper functions for common use cases

### ⚠️ Pending REST API Integration

**Important**: The current implementation includes placeholder functions. Gemini File Search requires **REST API calls** for:
- Creating stores
- Importing files to stores

The SDK methods (`uploadFile`, `generateContent` with `fileSearch` tool) work, but store management requires REST API.

### Required REST API Endpoints

1. **Create Store**:
   ```bash
   POST https://generativelanguage.googleapis.com/v1beta/files:createFileSearchStore
   ```

2. **Import Files**:
   ```bash
   POST https://generativelanguage.googleapis.com/v1beta/{store}/files:import
   ```

## Usage Examples

### 1. Upload a Destination Guide PDF

```typescript
import { uploadDestinationGuide } from '@/lib/gemini-file-search';

const pdfBuffer = await fetch('/path/to/guide.pdf').then(r => r.arrayBuffer());
const file = await uploadDestinationGuide(
  'stores/tokyo-guides',
  Buffer.from(pdfBuffer),
  'tokyo-travel-guide.pdf'
);
```

### 2. Query Destination Information

```typescript
import { queryDestinationInfo } from '@/lib/gemini-file-search';

const result = await queryDestinationInfo(
  'stores/tokyo-guides',
  'What are the best contemporary cafes in Daikanyama?'
);

console.log(result.content); // AI-generated response
console.log(result.citations); // Sources used
```

### 3. Upload Structured Data

```typescript
import { uploadDestinationData } from '@/lib/gemini-file-search';

const destinationData = {
  destinations: [
    { name: 'Café Kitsuné', neighborhood: 'Daikanyama', style: 'contemporary' },
    // ...
  ]
};

await uploadDestinationData(
  'stores/tokyo-data',
  destinationData,
  'tokyo-destinations.json'
);
```

## Integration with Existing Features

### Enrichment Pipeline
File Search can enhance the existing `enrichDestination` function:

```typescript
// In lib/enrichment.ts
export async function enrichDestinationWithFileSearch(
  name: string,
  city: string,
  storeName: string
): Promise<EnrichedData> {
  const query = `Provide detailed information about ${name} in ${city}. Include: description, style, price level, neighborhood, and notable features.`;
  
  const result = await queryDestinationInfo(storeName, query);
  
  // Parse result.content and merge with existing enrichment data
  return parseFileSearchResult(result);
}
```

### AI Chat Integration
Enhance the AI chat endpoint to use File Search for more accurate responses:

```typescript
// In app/api/ai-chat/route.ts
if (data.intent.city && fileSearchStore) {
  const fileSearchResult = await queryDestinationInfo(
    fileSearchStore,
    query
  );
  // Use fileSearchResult.content to enhance response
}
```

## Next Steps

1. **Complete REST API Integration**: Implement actual REST API calls for store management
2. **Add File Upload UI**: Create admin interface for uploading guide PDFs
3. **Integrate with Enrichment**: Use File Search in destination enrichment pipeline
4. **Add Citation Display**: Show citations in UI when File Search is used
5. **Create Store Management**: Admin interface for managing File Search stores

## Cost Considerations

- **Storage**: Free
- **Query-time embeddings**: Free
- **Indexing**: $0.15 per 1M tokens (one-time cost per file)
- **Generation**: Standard Gemini API pricing

For a typical destination guide PDF (~100 pages):
- Indexing cost: ~$0.01-0.05 per guide
- Very cost-effective for enrichment use cases

## References

- [Gemini File Search Documentation](https://ai.google.dev/gemini-api/docs/file-search)
- [File Search Blog Post](https://blog.google/technology/developers/file-search-gemini-api/)

