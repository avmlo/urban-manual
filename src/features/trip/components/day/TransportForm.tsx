'use client';

/**
 * TransportForm - Inline form for adding flights, trains, and hotels
 * Extracted from page.tsx following itskovacs/trip architecture (MIT)
 * https://github.com/itskovacs/trip
 */
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Search, Loader2, Globe, Hotel } from 'lucide-react';

interface TransportFormProps {
  type: 'flight' | 'hotel' | 'train';
  city: string;
  onSubmit: (data: Record<string, string | boolean | number>) => void;
  onCancel: () => void;
  isAdding: boolean;
}

export default function TransportForm({
  type,
  city,
  onSubmit,
  onCancel,
  isAdding,
}: TransportFormProps) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [name, setName] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [arrivalTime, setArrivalTime] = useState('');
  const [airline, setAirline] = useState('');
  const [flightNumber, setFlightNumber] = useState('');
  const [checkIn, setCheckIn] = useState('16:00');
  const [checkOut, setCheckOut] = useState('11:00');
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [address, setAddress] = useState('');
  const [roomType, setRoomType] = useState('');
  const [breakfast, setBreakfast] = useState('');
  const [confirmation, setConfirmation] = useState('');

  // Hotel search state
  const [hotelSearch, setHotelSearch] = useState('');
  const [searchSource, setSearchSource] = useState<'curated' | 'google'>('curated');
  const [searchResults, setSearchResults] = useState<Array<{ id: string | number; name: string; image?: string; category?: string; slug?: string; latitude?: number; longitude?: number; address?: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<{ id: string | number; name: string; image?: string; slug?: string; latitude?: number; longitude?: number; address?: string } | null>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Hotel search effect
  useEffect(() => {
    if (type !== 'hotel' || !hotelSearch.trim()) {
      setSearchResults([]);
      return;
    }

    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    searchTimeout.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        if (searchSource === 'curated') {
          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `hotel ${hotelSearch} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            const hotels = (data.results || []).filter((d: any) =>
              d.category?.toLowerCase().includes('hotel') ||
              d.category?.toLowerCase().includes('accommodation') ||
              d.category?.toLowerCase().includes('lodging')
            );
            setSearchResults(hotels.map((h: any) => ({ id: h.id, name: h.name, image: h.image, category: h.category, slug: h.slug })));
          }
        } else {
          const response = await fetch('/api/google-places-search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: `hotel ${hotelSearch} ${city}` }),
          });
          if (response.ok) {
            const data = await response.json();
            setSearchResults((data.places || []).map((p: any) => ({
              id: p.id,
              name: p.name,
              image: p.image,
              category: p.category,
              latitude: p.latitude,
              longitude: p.longitude,
              address: p.formatted_address || p.address,
            })));
          }
        }
      } catch (err) {
        console.error('Hotel search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [hotelSearch, city, searchSource, type]);

  const selectHotel = (hotel: { id: string | number; name: string; image?: string; slug?: string; latitude?: number; longitude?: number; address?: string }) => {
    setSelectedHotel(hotel);
    setName(hotel.name);
    if (hotel.address) setAddress(hotel.address);
    setHotelSearch('');
    setSearchResults([]);
  };

  const handleSubmit = () => {
    if (type === 'flight') {
      onSubmit({ from, to, departureTime, arrivalTime, airline, flightNumber });
    } else if (type === 'train') {
      onSubmit({ from, to, departureTime, arrivalTime });
    } else {
      onSubmit({
        name,
        address,
        checkInDate,
        checkInTime: checkIn,
        checkOutDate,
        checkOutTime: checkOut,
        roomType,
        breakfastIncluded: breakfast === 'included',
        confirmation,
        ...(selectedHotel?.slug ? { destination_slug: selectedHotel.slug } : {}),
        ...(selectedHotel?.image ? { image: selectedHotel.image } : {}),
        ...(selectedHotel?.latitude ? { latitude: selectedHotel.latitude } : {}),
        ...(selectedHotel?.longitude ? { longitude: selectedHotel.longitude } : {}),
      });
    }
  };

  const canSubmit = type === 'hotel' ? name.trim() : (from.trim() && to.trim());

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--editorial-text-primary)] capitalize">
          Add {type}
        </span>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {type === 'hotel' ? (
        <>
          {/* Search toggle */}
          <div className="flex items-center gap-1 mb-1">
            <button
              onClick={() => { setSearchSource('curated'); setHotelSearch(''); setSearchResults([]); }}
              className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                searchSource === 'curated'
                  ? 'bg-[var(--editorial-accent)] text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Curated
            </button>
            <button
              onClick={() => { setSearchSource('google'); setHotelSearch(''); setSearchResults([]); }}
              className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                searchSource === 'google'
                  ? 'bg-[var(--editorial-accent)] text-white'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Google
            </button>
          </div>

          {/* Hotel search input */}
          <div className="relative">
            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg">
              {isSearching ? (
                <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              ) : searchSource === 'google' ? (
                <Globe className="w-4 h-4 text-gray-400" />
              ) : (
                <Search className="w-4 h-4 text-gray-400" />
              )}
              <input
                type="text"
                value={selectedHotel ? name : hotelSearch}
                onChange={(e) => {
                  if (selectedHotel) {
                    setSelectedHotel(null);
                    setName('');
                  }
                  setHotelSearch(e.target.value);
                }}
                placeholder={searchSource === 'google' ? 'Search hotels on Google...' : 'Search curated hotels...'}
                className="flex-1 bg-transparent text-sm text-[var(--editorial-text-primary)] placeholder-gray-400 outline-none"
                autoFocus
              />
              {selectedHotel && (
                <button onClick={() => { setSelectedHotel(null); setName(''); }} className="text-gray-400 hover:text-gray-600">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search results dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-2xl shadow-lg z-10 max-h-40 overflow-y-auto">
                {searchResults.map((hotel) => (
                  <button
                    key={hotel.id}
                    onClick={() => selectHotel(hotel)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-[var(--editorial-border-subtle)] text-left"
                  >
                    <div className="w-6 h-6 rounded bg-[var(--editorial-bg-elevated)] flex items-center justify-center overflow-hidden flex-shrink-0">
                      {hotel.image ? (
                        <Image src={hotel.image} alt="" width={24} height={24} className="w-full h-full object-cover" />
                      ) : (
                        <Hotel className="w-3 h-3 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[var(--editorial-text-primary)] truncate">{hotel.name}</p>
                      {hotel.category && <p className="text-xs text-gray-400 truncate">{hotel.category}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Or manual entry */}
          {!selectedHotel && !hotelSearch && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Or type hotel name manually"
              className="w-full px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
            />
          )}

          {/* Address */}
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wide">Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 1435 Brickell Ave, Miami"
              className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
            />
          </div>

          {/* Check-in date/time */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Check-in Date</label>
              <input
                type="date"
                value={checkInDate}
                onChange={(e) => setCheckInDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Time</label>
              <select
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              >
                <option value="14:00">2 PM</option>
                <option value="15:00">3 PM</option>
                <option value="16:00">4 PM</option>
                <option value="17:00">5 PM</option>
                <option value="18:00">6 PM</option>
              </select>
            </div>
          </div>

          {/* Check-out date/time */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Check-out Date</label>
              <input
                type="date"
                value={checkOutDate}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Time</label>
              <select
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              >
                <option value="10:00">10 AM</option>
                <option value="11:00">11 AM</option>
                <option value="12:00">12 PM</option>
              </select>
            </div>
          </div>

          {/* Room type and confirmation */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Room Type</label>
              <input
                type="text"
                value={roomType}
                onChange={(e) => setRoomType(e.target.value)}
                placeholder="e.g., Ocean View Suite"
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Confirmation #</label>
              <input
                type="text"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder="Booking ref"
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
          </div>

          {/* Breakfast checkbox */}
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={breakfast === 'included'}
                onChange={(e) => setBreakfast(e.target.checked ? 'included' : '')}
                className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-500"
              />
              <span className="text-xs text-[var(--editorial-text-secondary)]">Breakfast included</span>
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="text"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              placeholder="From (e.g. LHR)"
              className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              autoFocus
            />
            <input
              type="text"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To (e.g. CDG)"
              className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
            />
          </div>
          {type === 'flight' && (
            <div className="flex gap-2">
              <input
                type="text"
                value={airline}
                onChange={(e) => setAirline(e.target.value)}
                placeholder="Airline (e.g. BA)"
                className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
              <input
                type="text"
                value={flightNumber}
                onChange={(e) => setFlightNumber(e.target.value)}
                placeholder="Flight # (e.g. 123)"
                className="flex-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
          )}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Departure</label>
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-400 uppercase tracking-wide">Arrival</label>
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => setArrivalTime(e.target.value)}
                className="w-full mt-1 px-3 py-2 text-sm bg-[var(--editorial-bg-elevated)] border border-[var(--editorial-border)] rounded-lg outline-none"
              />
            </div>
          </div>
        </>
      )}

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isAdding}
        className="w-full py-2 text-sm font-medium text-white bg-[var(--editorial-accent)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
      >
        {isAdding ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Add ${type}`}
      </button>
    </div>
  );
}
