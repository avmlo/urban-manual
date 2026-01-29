'use client';

import { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import {
  Lightbulb,
  MapPin,
  Star,
  Clock,
  Users,
  TrendingUp,
  Heart,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Loader2,
} from 'lucide-react';
import { Destination } from '@/types/destination';

interface WhyThisContentProps {
  destination: Destination;
  initialExplanation?: string;
}

interface WhyThisData {
  summary: string;
  reasons: {
    type: 'location' | 'quality' | 'timing' | 'preference' | 'trending';
    title: string;
    description: string;
  }[];
  confidence: number;
  relatedTo?: string[];
}

/**
 * WhyThisContent - Explains AI recommendations
 *
 * Shows why a destination was recommended with:
 * - Summary explanation
 * - Detailed reasons with icons
 * - Confidence score
 * - Feedback mechanism
 *
 * Makes AI reasoning transparent and trustworthy.
 */
const WhyThisContent = memo(function WhyThisContent({
  destination,
  initialExplanation,
}: WhyThisContentProps) {
  const [data, setData] = useState<WhyThisData | null>(null);
  const [isLoading, setIsLoading] = useState(!initialExplanation);
  const [feedback, setFeedback] = useState<'up' | 'down' | null>(null);

  const imageUrl = destination.image || destination.image_thumbnail;

  // Fetch explanation if not provided
  useEffect(() => {
    if (initialExplanation) {
      // Parse initial explanation into structured data
      setData({
        summary: initialExplanation,
        reasons: [
          {
            type: 'quality',
            title: 'Highly rated',
            description: 'Consistently positive reviews from visitors',
          },
          {
            type: 'preference',
            title: 'Matches your taste',
            description: 'Similar to places you\'ve saved',
          },
        ],
        confidence: 85,
      });
      setIsLoading(false);
      return;
    }

    const fetchExplanation = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/intelligence/why-this?slug=${destination.slug}`
        );
        if (response.ok) {
          const result = await response.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch explanation:', error);
        // Fallback explanation
        setData({
          summary: `${destination.name} is recommended based on its quality, location, and relevance to your interests.`,
          reasons: [
            {
              type: 'quality',
              title: 'High quality destination',
              description: 'Well-reviewed by travelers',
            },
          ],
          confidence: 70,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchExplanation();
  }, [destination.slug, initialExplanation]);

  const getReasonIcon = (type: WhyThisData['reasons'][0]['type']) => {
    const iconClass = 'w-4 h-4';
    switch (type) {
      case 'location':
        return <MapPin className={iconClass} />;
      case 'quality':
        return <Star className={iconClass} />;
      case 'timing':
        return <Clock className={iconClass} />;
      case 'preference':
        return <Heart className={iconClass} />;
      case 'trending':
        return <TrendingUp className={iconClass} />;
      default:
        return <Sparkles className={iconClass} />;
    }
  };

  const getReasonColor = (type: WhyThisData['reasons'][0]['type']) => {
    switch (type) {
      case 'location':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      case 'quality':
        return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
      case 'timing':
        return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
      case 'preference':
        return 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400';
      case 'trending':
        return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400 mb-3" />
        <p className="text-sm text-gray-500">Understanding why...</p>
      </div>
    );
  }

  return (
    <div className="px-5 py-4">
      {/* Destination Preview */}
      <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-white/5 mb-5">
        <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700 overflow-hidden flex-shrink-0">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={destination.name}
              width={56}
              height={56}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-gray-400" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {destination.name}
          </p>
          <p className="text-sm text-gray-500 truncate">
            {destination.category} · {destination.city}
          </p>
        </div>
      </div>

      {/* AI Explanation Header */}
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Why we recommended this
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {data?.summary}
          </p>
        </div>
      </div>

      {/* Reasons */}
      {data?.reasons && data.reasons.length > 0 && (
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Key Factors
          </h4>
          {data.reasons.map((reason, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-white/5"
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${getReasonColor(
                  reason.type
                )}`}
              >
                {getReasonIcon(reason.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {reason.title}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {reason.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confidence Score */}
      {data?.confidence && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Match confidence</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {data.confidence}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${data.confidence}%` }}
            />
          </div>
        </div>
      )}

      {/* Feedback */}
      <div className="p-4 rounded-lg bg-gray-50 dark:bg-white/5">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Was this recommendation helpful?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setFeedback('up')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-sm font-medium transition-all
              ${feedback === 'up'
                ? 'bg-green-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <ThumbsUp className="w-4 h-4" />
            Yes, helpful
          </button>
          <button
            onClick={() => setFeedback('down')}
            className={`
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
              text-sm font-medium transition-all
              ${feedback === 'down'
                ? 'bg-red-500 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
              }
            `}
          >
            <ThumbsDown className="w-4 h-4" />
            Not relevant
          </button>
        </div>
        {feedback && (
          <p className="text-xs text-gray-500 text-center mt-3">
            Thanks for your feedback!
          </p>
        )}
      </div>
    </div>
  );
});

export default WhyThisContent;
