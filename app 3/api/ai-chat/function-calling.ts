/**
 * Function calling definitions for OpenAI
 * Allows AI to call your APIs directly
 */

export const FUNCTION_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'search_destinations',
      description: 'Search for destinations (restaurants, hotels, attractions) by city, category, and filters. Use this when the user wants to find places.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query or keywords to find destinations'
          },
          city: {
            type: 'string',
            description: 'City name (e.g., "tokyo", "paris", "new-york")'
          },
          category: {
            type: 'string',
            description: 'Category (e.g., "Restaurant", "Hotel", "Culture", "Bar", "Cafe")'
          },
          priceLevel: {
            type: 'number',
            description: 'Price level (1-4, where 1 is budget and 4 is luxury)',
            minimum: 1,
            maximum: 4
          },
          minRating: {
            type: 'number',
            description: 'Minimum rating (0-5)',
            minimum: 0,
            maximum: 5
          },
          michelinStars: {
            type: 'number',
            description: 'Minimum Michelin stars (0-3)',
            minimum: 0,
            maximum: 3
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'save_destination',
      description: 'Save a destination to the user\'s saved places. Use this when the user wants to save or bookmark a place.',
      parameters: {
        type: 'object',
        properties: {
          destinationSlug: {
            type: 'string',
            description: 'Destination slug or ID to save'
          }
        },
        required: ['destinationSlug']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'mark_visited',
      description: 'Mark a destination as visited. Use this when the user says they\'ve been to a place or want to mark it as visited.',
      parameters: {
        type: 'object',
        properties: {
          destinationSlug: {
            type: 'string',
            description: 'Destination slug or ID to mark as visited'
          }
        },
        required: ['destinationSlug']
      }
    }
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_destination_details',
      description: 'Get detailed information about a specific destination. Use this when the user asks about a specific place.',
      parameters: {
        type: 'object',
        properties: {
          destinationSlug: {
            type: 'string',
            description: 'Destination slug or ID'
          }
        },
        required: ['destinationSlug']
      }
    }
  }
];

/**
 * Handle function calls from OpenAI
 */
export async function handleFunctionCall(
  functionName: string,
  args: any,
  userId?: string
): Promise<any> {
  switch (functionName) {
    case 'search_destinations':
      // This would call your search API
      // For now, return a placeholder
      return {
        results: [],
        message: 'Search function called with: ' + JSON.stringify(args)
      };
    
    case 'save_destination':
      // This would save to Supabase
      // For now, return success
      return {
        success: true,
        message: `Destination ${args.destinationSlug} saved`
      };
    
    case 'mark_visited':
      // This would mark as visited in Supabase
      return {
        success: true,
        message: `Destination ${args.destinationSlug} marked as visited`
      };
    
    case 'get_destination_details':
      // This would fetch from Supabase
      return {
        destination: {
          slug: args.destinationSlug,
          name: 'Destination',
          // ... other details
        }
      };
    
    default:
      return {
        error: `Unknown function: ${functionName}`
      };
  }
}

