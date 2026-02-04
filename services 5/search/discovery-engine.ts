import { DocumentServiceClient, SearchServiceClient, RecommendationServiceClient, UserEventServiceClient } from '@google-cloud/discoveryengine';

/**
 * Google Discovery Engine Service
 * Handles search, recommendations, and data management for Discovery Engine
 */
export class DiscoveryEngineService {
  private documentClient: DocumentServiceClient | null = null;
  private searchClient: SearchServiceClient | null = null;
  private recommendationClient: RecommendationServiceClient | null = null;
  private userEventClient: UserEventServiceClient | null = null;
  private dataStorePath: string;
  private projectId: string;
  private location: string;
  private dataStoreId: string;
  private collectionId: string;

  private clientsInitialized = false;
  private initializationError: Error | null = null;

  constructor() {
    // Get configuration from environment variables
    this.projectId = process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.GCP_PROJECT_ID || '';
    this.location = process.env.GOOGLE_CLOUD_LOCATION || 'global';
    this.dataStoreId = process.env.DISCOVERY_ENGINE_DATA_STORE_ID || 'urban-manual-destinations';
    this.collectionId = process.env.DISCOVERY_ENGINE_COLLECTION_ID || 'default_collection';

    // Construct data store path
    // Format: projects/{project}/locations/{location}/collections/{collection}/dataStores/{data_store}
    this.dataStorePath = `projects/${this.projectId}/locations/${this.location}/collections/${this.collectionId}/dataStores/${this.dataStoreId}`;

    // Don't initialize clients in constructor - do it lazily when needed
    // This prevents unhandled promise rejections from credential loading
  }

  /**
   * Lazy initialization of clients - only when needed
   */
  private async initializeClients(): Promise<void> {
    if (this.clientsInitialized || this.initializationError) {
      return;
    }

    if (!this.projectId) {
      this.initializationError = new Error('GOOGLE_CLOUD_PROJECT_ID is not set');
      return;
    }

    try {
      // Check if we have explicit credentials
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const credentialsJson = process.env.GOOGLE_CLOUD_CREDENTIALS_JSON;

      const clientOptions: any = {};

      // If we have explicit credentials JSON, use it
      if (credentialsJson) {
        try {
          clientOptions.credentials = JSON.parse(credentialsJson);
        } catch (parseError) {
          console.warn('[Discovery Engine] Failed to parse GOOGLE_CLOUD_CREDENTIALS_JSON:', parseError);
        }
      } else if (credentialsPath) {
        // If we have a path to credentials, the client will load it automatically
        // Just set the path in the options
        clientOptions.keyFilename = credentialsPath;
      }
      // Otherwise, let it try default credentials (but we'll catch the error)

      // Initialize clients - they will load credentials lazily on first use
      // We create them here but errors will be caught when they're actually used
      this.documentClient = new DocumentServiceClient(clientOptions);
      this.searchClient = new SearchServiceClient(clientOptions);
      this.recommendationClient = new RecommendationServiceClient(clientOptions);
      this.userEventClient = new UserEventServiceClient(clientOptions);

      // Test that credentials work by making a simple call (but catch errors)
      // We'll test with a simple operation that doesn't require actual API calls
      // Just verify the client can be created without immediate credential errors

      this.clientsInitialized = true;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.warn('[Discovery Engine] Client initialization failed:', errorMessage);
      this.initializationError = error instanceof Error ? error : new Error(errorMessage);
      
      // Set all clients to null to indicate failure
      this.documentClient = null;
      this.searchClient = null;
      this.recommendationClient = null;
      this.userEventClient = null;
    }
  }

  /**
   * Check if Discovery Engine is configured and available
   */
  isAvailable(): boolean {
    // Check if we have the required configuration
    if (!this.projectId || !this.dataStoreId) {
      return false;
    }

    // If clients haven't been initialized yet, they're not available
    // (but we don't want to trigger initialization here as it's async)
    // Return false if we know initialization failed
    if (this.initializationError) {
      return false;
    }

    // If clients are initialized and exist, we're available
    return this.clientsInitialized && this.documentClient !== null && this.searchClient !== null;
  }

  /**
   * Search destinations using Discovery Engine
   */
  async search(
    query: string,
    options: {
      userId?: string;
      pageSize?: number;
      pageToken?: string;
      filters?: {
        city?: string;
        category?: string;
        priceLevel?: number;
        minRating?: number;
      };
      boostSpec?: {
        condition?: string;
        boost?: number;
      }[];
    } = {}
  ): Promise<{
    results: any[];
    totalSize: number;
    nextPageToken?: string;
  }> {
    // Initialize clients if not already done
    await this.initializeClients();

    if (!this.searchClient || !this.isAvailable()) {
      throw new Error('Discovery Engine is not configured. Please set GOOGLE_CLOUD_PROJECT_ID and DISCOVERY_ENGINE_DATA_STORE_ID');
    }

    const {
      userId,
      pageSize = 20,
      pageToken,
      filters = {},
      boostSpec = [],
    } = options;

    // Build filter string
    const filterParts: string[] = [];
    if (filters.city) {
      filterParts.push(`city:${filters.city}`);
    }
    if (filters.category) {
      filterParts.push(`category:${filters.category}`);
    }
    if (filters.priceLevel !== undefined) {
      filterParts.push(`price_level<=${filters.priceLevel}`);
    }
    if (filters.minRating !== undefined) {
      filterParts.push(`rating>=${filters.minRating}`);
    }

    const filterString = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

    // Build boost specification
    const boostSpecObj = boostSpec.length > 0
      ? {
          conditionBoostSpecs: boostSpec.map((spec) => ({
            condition: spec.condition,
            boost: spec.boost || 1.0,
          })),
        }
      : undefined;

    try {
      const request = {
        servingConfig: `${this.dataStorePath}/servingConfigs/default_search`,
        query,
        pageSize,
        pageToken,
        filter: filterString,
        boostSpec: boostSpecObj,
        userInfo: userId
          ? {
              userId,
            }
          : undefined,
        personalizationSpec: {
          mode: userId ? 'AUTO' : 'DISABLED',
        },
      };

      const [response] = await this.searchClient.search(request).catch((error: any) => {
        // Check if it's a credential error
        if (error?.message?.includes('Could not load the default credentials') || 
            error?.message?.includes('credentials') ||
            error?.code === 'UNKNOWN') {
          // Mark initialization as failed
          this.initializationError = error;
          this.clientsInitialized = false;
          this.documentClient = null;
          this.searchClient = null;
          this.recommendationClient = null;
          this.userEventClient = null;
          throw new Error('Discovery Engine credentials not available. Please configure GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS_JSON');
        }
        throw error;
      });

      const results = ((response as any).results || []).map((result: any) => {
        const document = result.document;
        const structData = document?.structData || {};
        const struct = structData as any;
        
        return {
          id: document?.id || '',
          name: struct.name || '',
          description: struct.description || '',
          city: struct.city || '',
          category: struct.category || '',
          tags: struct.tags || [],
          rating: struct.rating || 0,
          priceLevel: struct.price_level || 0,
          slug: struct.slug || '',
          uri: (document as any)?.uri || '',
          relevanceScore: (result as any).relevanceScore || 0,
        };
      });

      return {
        results,
        totalSize: (response as any).totalSize || 0,
        nextPageToken: (response as any).nextPageToken,
      };
    } catch (error: any) {
      // If it's a credential error, we've already handled it above
      if (error?.message?.includes('credentials not available')) {
        throw error;
      }
      console.error('[Discovery Engine] Search error:', error?.message || error);
      throw new Error(`Discovery Engine search failed: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Get personalized recommendations for a user
   */
  async recommend(
    userId: string,
    options: {
      pageSize?: number;
      filters?: {
        city?: string;
        category?: string;
      };
    } = {}
  ): Promise<any[]> {
    // Initialize clients if not already done
    await this.initializeClients();

    if (!this.recommendationClient || !this.isAvailable()) {
      throw new Error('Discovery Engine is not configured');
    }

    const { pageSize = 10, filters = {} } = options;

    // Build filter string
    const filterParts: string[] = [];
    if (filters.city) {
      filterParts.push(`city:${filters.city}`);
    }
    if (filters.category) {
      filterParts.push(`category:${filters.category}`);
    }

    const filterString = filterParts.length > 0 ? filterParts.join(' AND ') : undefined;

    try {
      const request = {
        servingConfig: `${this.dataStorePath}/servingConfigs/default_recommendation`,
        userEvent: {
          eventType: 'view-item',
          userInfo: {
            userId,
          },
        },
        pageSize,
        filter: filterString,
      };

      const [response] = await this.recommendationClient.recommend(request);

      return (response.results || []).map((result) => {
        const document = result.document;
        const structData = document?.structData || {};
        const struct = structData as any;
        
        return {
          id: document?.id || '',
          name: struct.name || '',
          description: struct.description || '',
          city: struct.city || '',
          category: struct.category || '',
          tags: struct.tags || [],
          rating: struct.rating || 0,
          priceLevel: struct.price_level || 0,
          slug: struct.slug || '',
          uri: (document as any)?.uri || '',
          relevanceScore: (result as any).relevanceScore || 0,
        };
      });
    } catch (error: any) {
      console.error('Discovery Engine recommendation error:', error);
      throw new Error(`Discovery Engine recommendation failed: ${error.message}`);
    }
  }

  /**
   * Transform a destination to Discovery Engine document format
   */
  transformToDocument(destination: any): any {
    // For structured data, content should be an object with mimeType and rawBytes or uri
    // Or we can omit it and use structData only
    const document: any = {
      id: destination.slug || destination.id?.toString(),
      structData: {
        slug: destination.slug || '',
        name: destination.name || '',
        description: destination.description || '',
        city: destination.city || '',
        category: destination.category || '',
        tags: destination.tags || [],
        rating: destination.rating || 0,
        price_level: destination.price_level || 0,
        michelin_stars: destination.michelin_stars || 0,
        coordinates: destination.latitude && destination.longitude
          ? {
              latitude: destination.latitude,
              longitude: destination.longitude,
            }
          : undefined,
        images: destination.images || [],
        metadata: {
          trending_score: destination.trending_score || 0,
          views_count: destination.views_count || 0,
          saves_count: destination.saves_count || 0,
          visits_count: destination.visits_count || 0,
          created_at: destination.created_at || new Date().toISOString(),
          updated_at: destination.updated_at || new Date().toISOString(),
        },
        // Add searchable text content in structData for semantic search
        content: this.buildContent(destination),
      },
      uri: `/destination/${destination.slug || destination.id}`,
    };

    return document;
  }

  /**
   * Import documents in batch to Discovery Engine
   * Uses inlineSource for batch imports (recommended for < 1000 documents)
   */
  async importDocuments(destinations: any[]): Promise<void> {
    // Initialize clients if not already done
    await this.initializeClients();

    if (!this.documentClient || !this.isAvailable()) {
      throw new Error('Discovery Engine is not configured');
    }

    if (destinations.length === 0) {
      return;
    }

    try {
      // Transform destinations to documents
      const documents = destinations.map((dest) => this.transformToDocument(dest));

      // Use branch path for imports
      const branchPath = `${this.dataStorePath}/branches/default_branch`;

      const request = {
        parent: branchPath,
        inlineSource: {
          documents,
        },
        reconciliationMode: 'INCREMENTAL' as const, // Updates existing, adds new
      };

      const [operation] = await this.documentClient.importDocuments(request);
      
      // Wait for the operation to complete
      await operation.promise();
    } catch (error: any) {
      console.error('Discovery Engine import error:', error);
      throw new Error(`Failed to import documents: ${error.message}`);
    }
  }

  /**
   * Track a user event (for personalization)
   */
  async trackEvent(event: {
    userId: string;
    eventType: 'search' | 'view' | 'click' | 'save' | 'visit';
    documentId?: string;
    searchQuery?: string;
  }): Promise<void> {
    // Initialize clients if not already done (but don't throw if it fails)
    try {
      await this.initializeClients();
    } catch (error) {
      // Silently fail - event tracking is optional
      return;
    }

    if (!this.userEventClient || !this.isAvailable()) {
      // Silently fail if not configured - events are optional
      return;
    }

    try {
      const userEvent = {
        eventType: event.eventType.toUpperCase(),
        userInfo: {
          userId: event.userId,
        },
        documentInfo: event.documentId
          ? {
              id: event.documentId,
              uri: `/destination/${event.documentId}`,
            }
          : undefined,
        searchInfo: event.searchQuery
          ? {
              searchQuery: event.searchQuery,
            }
          : undefined,
        eventTime: new Date().toISOString(),
      };

      const request = {
        parent: this.dataStorePath,
        userEvent,
      };

      await this.userEventClient.collectUserEvent(request as any);
    } catch (error: any) {
      // Log but don't throw - event tracking shouldn't break the app
      console.warn('Discovery Engine event tracking failed:', error);
    }
  }

  /**
   * Build searchable content from destination data
   */
  private buildContent(destination: any): string {
    const parts: string[] = [];

    if (destination.name) parts.push(destination.name);
    if (destination.description) parts.push(destination.description);
    if (destination.city) parts.push(`Located in ${destination.city}`);
    if (destination.category) parts.push(`Category: ${destination.category}`);
    if (destination.tags && Array.isArray(destination.tags)) {
      parts.push(`Tags: ${destination.tags.join(', ')}`);
    }
    if (destination.cuisine_type) parts.push(`Cuisine: ${destination.cuisine_type}`);
    if (destination.editorial_note) parts.push(destination.editorial_note);

    return parts.join('. ');
  }

  /**
   * Get data store path (for external use)
   */
  getDataStorePath(): string {
    return this.dataStorePath;
  }
}

// Singleton instance
let discoveryEngineService: DiscoveryEngineService | null = null;

export function getDiscoveryEngineService(): DiscoveryEngineService {
  if (!discoveryEngineService) {
    discoveryEngineService = new DiscoveryEngineService();
  }
  return discoveryEngineService;
}
