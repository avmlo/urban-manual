'use client';

import type { EnrichedItineraryItem } from '@/lib/hooks/useTripEditor';
import {
  FlightCard,
  RestaurantCard,
  AttractionCard,
  MinimalActivityCard,
  OvernightCard,
  TransportCard,
  CustomCard,
} from '../cards';
import LogisticalIndicators from '../cards/LogisticalIndicators';

interface ItineraryCardProps {
  item: EnrichedItineraryItem;
  isActive?: boolean;
  onClick?: () => void;
  mapIndex?: number;
}

/**
 * ItineraryCard - Dispatches to the appropriate card type based on item category.
 * Wraps each card with logistical micro-indicators for attachments, cost, and group data.
 */
export default function ItineraryCard({
  item,
  isActive = false,
  onClick,
  mapIndex,
}: ItineraryCardProps) {
  const category = item.parsedNotes?.category || item.parsedNotes?.type || '';
  const type = item.parsedNotes?.type;
  const notes = item.parsedNotes;

  // Derive logistical flags from item data
  const hasAttachments = !!(
    notes?.confirmationNumber ||
    notes?.hotelConfirmation ||
    notes?.ticketConfirmation ||
    notes?.confirmation
  );
  const costEstimate = notes?.costEstimate;
  const currency = notes?.currency;
  const bookingStatus = notes?.bookingStatus;
  const partySize = notes?.partySize;

  // Determine the card type to render
  let card: React.ReactNode;

  if (type === 'flight') {
    card = (
      <FlightCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  } else if (type === 'hotel') {
    card = (
      <OvernightCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  } else if (type === 'train' || type === 'drive' || category === 'transport') {
    card = (
      <TransportCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  } else if (category === 'hotel_activity' || category === 'airport_activity') {
    card = (
      <MinimalActivityCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  } else if (category === 'restaurant' || category === 'bar' || category === 'cafe') {
    card = (
      <RestaurantCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  } else if (category === 'attraction' || category === 'museum' || category === 'landmark') {
    card = (
      <AttractionCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  } else {
    card = (
      <CustomCard
        item={item}
        isSelected={isActive}
        onSelect={onClick || (() => {})}
      />
    );
  }

  return (
    <div className="relative">
      {card}
      {/* Logistical micro-indicators - positioned at bottom-right of each card */}
      <LogisticalIndicators
        hasAttachments={hasAttachments}
        costEstimate={costEstimate}
        currency={currency}
        bookingStatus={bookingStatus}
        partySize={partySize}
        className="absolute bottom-2 right-2"
      />
    </div>
  );
}
