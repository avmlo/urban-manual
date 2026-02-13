// Trip Feature - Consolidated trip/trips components
// All trip-related functionality lives here

// Main components
export * from "./components/TripCard";
export * from "./components/TripHeader";
export * from "./components/TripStats";
export * from "./components/TripItemCard";
export * from "./components/TripBucketList";
export * from "./components/TripHero";
export * from "./components/TripInteractiveMap";
export * from "./components/TripPlannerMap";
export * from "./components/TripSettingsBox";
// TripSetupWizard removed - replaced by TripModal in components/TripModal.tsx
export * from "./components/TripWidgets";
export * from "./components/TripInfoCards";
export * from "./components/TripDaySection";
export * from "./components/TripBuilderPanel";
export * from "./components/TripsDrawer";
export * from "./components/TripIndicator";

// Cards
export * from "./components/FlightCard";
export * from "./components/FlightStatusCard";
export * from "./components/HotelCard";
export * from "./components/HotelBreakfastCard";
export * from "./components/HotelCheckInCard";
export * from "./components/HotelCheckOutCard";
export * from "./components/HotelNightCard";
export * from "./components/LodgingCard";
export * from "./components/ActivityCard";
export * from "./components/EventCard";
export * from "./components/MealCard";
export * from "./components/PlaceCard";
export * from "./components/TransportCard";

// Drawers
export * from "./components/AddFlightDrawer";
export * from "./components/AddHotelDrawer";
export * from "./components/TripOverviewDrawer";
export * from "./components/TripOverviewQuickDrawer";
export * from "./components/TripSettingsDrawer";
export * from "./components/TripListDrawer";
export * from "./components/EventDetailDrawer";
export * from "./components/POIEditorDrawer";
export * from "./components/AISuggestionsDrawer";
export * from "./components/PlaceSelectorDrawer";

// Timeline & Planning
export * from "./components/TimelineCanvas";
export * from "./components/TimeBlockCard";
export * from "./components/TimelineBlock";
export * from "./components/DayTimeline";
export * from "./components/DayHeader";
export * from "./components/DayDropZone";
export * from "./components/DayTabNav";
export * from "./components/DayIntelligence";
export * from "./components/ItineraryView";

// Intelligence & Suggestions
export * from "./components/SmartSuggestions";
export * from "./components/SuggestionCard";
export * from "./components/PersonalizedPick";
export * from "./components/EmptyDaySuggestions";
export * from "./components/NearbyDiscoveries";

// Maps
export * from "./components/MapDrawer";
export * from "./components/MapSidebarCard";
export * from "./components/RouteMapBox";
export * from "./components/FullscreenMapOverlay";
export * from "./components/InteractiveMapCard";

// Weather & Alerts
export * from "./components/WeatherSwapAlert";
export * from "./components/TripWeatherForecast";
export * from "./components/TripSafetyAlerts";
export * from "./components/TripHealthIndicator";
export * from "./components/AlertsDropdown";

// Utilities
export * from "./components/AddToTripButton";
export * from "./components/AddPlaceBox";
export * from "./components/AddPlacePanel";
export * from "./components/CrowdIndicator";
export * from "./components/TransitConnector";
export * from "./components/TransitOptions";
export * from "./components/FloatingActionBar";
export * from "./components/QuickActions";
export * from "./components/SavingFeedback";
export * from "./components/UndoToast";
export * from "./components/ItemStatus";
export * from "./components/NeighborhoodBreakdown";
export * from "./components/LocalEvents";
export * from "./components/OpeningHoursIndicator";
export * from "./components/AvailabilityAlert";
export * from "./components/BestTimeToVisitWidget";

// AI Components
export * from "./components/AIPlannerBar";
export * from "./components/NaturalLanguageInput";
export * from "./components/TravelAISidebar";
export * from "./components/CompanionPanel";

// Editors
export * from "./components/TripNotesEditor";
export * from "./components/ItemNotesEditor";
export * from "./components/TripCoverImage";
export * from "./components/TripMapView";
export * from "./components/DestinationBox";
