# Agentic AI Improvement Plan for Urban Manual

## What is Agentic AI?

**Agentic AI** = AI systems that can:
- ✅ **Take autonomous actions** (not just respond)
- ✅ **Use tools/APIs** (maps, booking, weather, etc.)
- ✅ **Plan multi-step tasks** (trip planning, itinerary building)
- ✅ **Learn from context** (user preferences, history)
- ✅ **Make decisions** (which places to recommend, when to notify)

---

## Current AI State

### ✅ What You Have (Reactive AI)
- **Search**: Intent analysis → Search → Return results
- **Recommendations**: User profile → Score destinations → Return top N
- **Chat**: User query → Generate response → Display
- **Enrichment**: Destination → Fetch data → Store

**Limitation**: All are **reactive** - they wait for user input and respond.

---

## How Agentic AI Can Improve Your Flows

### 🎯 **1. Autonomous Travel Planning Agent** ⭐⭐⭐ HIGHEST IMPACT

**Current Flow:**
```
User: "Plan a trip to Tokyo"
→ System: Shows search results
→ User: Manually selects places
→ User: Manually creates itinerary
→ User: Manually checks weather/booking
```

**Agentic Flow:**
```
User: "Plan a 3-day trip to Tokyo in April"
→ Agent: 
  1. Analyzes user preferences (saved places, visited history)
  2. Fetches weather for April in Tokyo
  3. Searches for top destinations matching preferences
  4. Checks opening hours and availability
  5. Optimizes route using Google Maps
  6. Creates day-by-day itinerary
  7. Checks booking availability
  8. Suggests alternatives if booked
  9. Presents complete plan with maps, times, booking links
```

**Implementation:**
```typescript
// New: app/api/agents/travel-planner/route.ts
class TravelPlanningAgent {
  async planTrip(userQuery: string, userId: string) {
    // Step 1: Understand intent
    const intent = await this.analyzeIntent(userQuery);
    
    // Step 2: Gather context (autonomous)
    const [userProfile, weather, events] = await Promise.all([
      this.getUserProfile(userId),
      this.fetchWeather(intent.city, intent.dates),
      this.fetchEvents(intent.city, intent.dates)
    ]);
    
    // Step 3: Search destinations (autonomous)
    const candidates = await this.searchDestinations({
      city: intent.city,
      preferences: userProfile,
      dates: intent.dates
    });
    
    // Step 4: Optimize itinerary (autonomous)
    const itinerary = await this.optimizeItinerary({
      destinations: candidates,
      days: intent.days,
      preferences: userProfile
    });
    
    // Step 5: Enrich with real-time data (autonomous)
    const enriched = await this.enrichItinerary(itinerary);
    
    // Step 6: Check availability (autonomous)
    const availability = await this.checkAvailability(enriched);
    
    // Step 7: Generate final plan
    return this.generatePlan(enriched, availability);
  }
}
```

**Benefits:**
- ✅ Saves user 30+ minutes of manual planning
- ✅ Considers weather, events, availability automatically
- ✅ Optimizes routes and timing
- ✅ Proactive suggestions (alternatives if booked)

---

### 🎯 **2. Proactive Recommendation Agent** ⭐⭐ HIGH IMPACT

**Current Flow:**
```
User visits homepage
→ System: Shows generic recommendations
→ User: Searches manually
```

**Agentic Flow:**
```
User visits homepage
→ Agent:
  1. Analyzes user's recent activity
  2. Checks weather in user's location
  3. Checks time of day
  4. Checks user's calendar (if connected)
  5. Proactively suggests:
     - "It's 6pm and sunny - perfect for rooftop bars"
     - "You're in Paris - here are 3 places near you open now"
     - "Based on your saved places, you might like..."
```

**Implementation:**
```typescript
// New: app/api/agents/proactive-recommendations/route.ts
class ProactiveRecommendationAgent {
  async getProactiveSuggestions(userId: string, location?: {lat, lng}) {
    // Step 1: Gather context (autonomous)
    const [userProfile, weather, timeOfDay, nearby] = await Promise.all([
      this.getUserProfile(userId),
      location ? this.fetchWeather(location) : null,
      this.getTimeOfDay(),
      location ? this.findNearbyPlaces(location) : null
    ]);
    
    // Step 2: Generate contextual suggestions
    const suggestions = await this.generateSuggestions({
      profile: userProfile,
      weather,
      timeOfDay,
      nearby,
      savedPlaces: userProfile.saved,
      visitedPlaces: userProfile.visited
    });
    
    // Step 3: Rank by relevance
    return this.rankSuggestions(suggestions);
  }
}
```

**Benefits:**
- ✅ Reduces search friction
- ✅ Context-aware (weather, time, location)
- ✅ Proactive (suggests before user asks)

---

### 🎯 **3. Smart Itinerary Builder Agent** ⭐⭐⭐ HIGHEST IMPACT

**Current Flow:**
```
User: Adds destinations to itinerary
→ System: Lists them
→ User: Manually arranges by day/time
→ User: Manually checks distances
→ User: Manually optimizes route
```

**Agentic Flow:**
```
User: "Add these 10 places to my Tokyo trip"
→ Agent:
  1. Analyzes destinations (categories, locations, hours)
  2. Groups by proximity and category
  3. Optimizes route using Google Maps
  4. Schedules by opening hours
  5. Adds travel time between places
  6. Suggests meal breaks
  7. Checks for conflicts (closed days, events)
  8. Creates optimized day-by-day plan
  9. Allows user to adjust, then re-optimizes
```

**Implementation:**
```typescript
// New: app/api/agents/itinerary-builder/route.ts
class ItineraryBuilderAgent {
  async buildItinerary(destinations: Destination[], preferences: UserPreferences) {
    // Step 1: Analyze destinations (autonomous)
    const analysis = await this.analyzeDestinations(destinations);
    
    // Step 2: Group by day (autonomous)
    const days = await this.groupByDay(destinations, preferences.days);
    
    // Step 3: Optimize routes (autonomous)
    const optimized = await Promise.all(
      days.map(day => this.optimizeRoute(day.destinations))
    );
    
    // Step 4: Schedule by time (autonomous)
    const scheduled = await this.scheduleByTime(optimized, preferences);
    
    // Step 5: Add context (autonomous)
    const enriched = await this.enrichWithContext(scheduled);
    
    return enriched;
  }
  
  async optimizeRoute(destinations: Destination[]) {
    // Use Google Maps API to find optimal route
    const route = await this.googleMaps.optimizeRoute(destinations);
    return route;
  }
}
```

**Benefits:**
- ✅ Saves hours of manual planning
- ✅ Optimizes travel time automatically
- ✅ Considers opening hours, weather, events
- ✅ Real-time route optimization

---

### 🎯 **4. Content Curation Agent** ⭐ MEDIUM IMPACT

**Current Flow:**
```
Admin: Manually curates destinations
→ System: Stores in database
```

**Agentic Flow:**
```
Agent (runs daily):
  1. Scans social media for trending places
  2. Checks Google Trends for emerging destinations
  3. Analyzes user search patterns
  4. Identifies gaps in coverage
  5. Suggests new destinations to add
  6. Auto-enriches with Google Places API
  7. Presents to admin for approval
```

**Implementation:**
```typescript
// New: app/api/agents/content-curator/route.ts
class ContentCurationAgent {
  async curateNewDestinations() {
    // Step 1: Find trending places (autonomous)
    const trending = await this.findTrendingPlaces();
    
    // Step 2: Check coverage gaps (autonomous)
    const gaps = await this.identifyCoverageGaps();
    
    // Step 3: Enrich candidates (autonomous)
    const enriched = await this.enrichCandidates(trending);
    
    // Step 4: Score by relevance (autonomous)
    const scored = await this.scoreDestinations(enriched);
    
    // Step 5: Present to admin
    return this.presentForApproval(scored);
  }
}
```

**Benefits:**
- ✅ Keeps content fresh automatically
- ✅ Identifies trending places early
- ✅ Reduces manual curation time

---

### 🎯 **5. Personalization Learning Agent** ⭐⭐ HIGH IMPACT

**Current Flow:**
```
User: Visits places
→ System: Stores visit data
→ System: Uses for recommendations (static)
```

**Agentic Flow:**
```
User: Visits places
→ Agent:
  1. Analyzes visit patterns (autonomous)
  2. Updates user profile automatically
  3. Learns preferences (categories, price, style)
  4. Adjusts recommendations in real-time
  5. Suggests similar places proactively
  6. Identifies new interests
  7. Adapts to changing preferences
```

**Implementation:**
```typescript
// New: app/api/agents/personalization-agent/route.ts
class PersonalizationAgent {
  async learnFromUserActivity(userId: string) {
    // Step 1: Analyze activity (autonomous)
    const patterns = await this.analyzeActivity(userId);
    
    // Step 2: Update profile (autonomous)
    await this.updateProfile(userId, patterns);
    
    // Step 3: Adjust recommendations (autonomous)
    await this.adjustRecommendations(userId, patterns);
    
    // Step 4: Identify new interests (autonomous)
    const newInterests = await this.identifyNewInterests(patterns);
    
    return { updated: true, newInterests };
  }
}
```

**Benefits:**
- ✅ Gets smarter over time
- ✅ Adapts to user preferences automatically
- ✅ No manual profile updates needed

---

### 🎯 **6. Multi-Tool Orchestration Agent** ⭐⭐⭐ HIGHEST IMPACT

**Current Flow:**
```
User: Wants to book a place
→ User: Clicks booking link
→ User: Manually navigates to booking site
→ User: Manually checks availability
→ User: Manually books
```

**Agentic Flow:**
```
User: "Book a table at [Restaurant] for 2 at 7pm tomorrow"
→ Agent:
  1. Searches for restaurant (autonomous)
  2. Checks availability via booking APIs (autonomous)
  3. Finds best time slots (autonomous)
  4. Books automatically (with user confirmation)
  5. Adds to calendar (autonomous)
  6. Sends confirmation (autonomous)
  7. Sets reminder (autonomous)
```

**Implementation:**
```typescript
// New: app/api/agents/booking-agent/route.ts
class BookingAgent {
  async bookDestination(destinationId: string, bookingRequest: BookingRequest) {
    // Step 1: Find destination (autonomous)
    const destination = await this.getDestination(destinationId);
    
    // Step 2: Check booking options (autonomous)
    const options = await this.checkBookingOptions(destination);
    
    // Step 3: Select best option (autonomous)
    const bestOption = await this.selectBestOption(options, bookingRequest);
    
    // Step 4: Book (autonomous, with confirmation)
    const booking = await this.executeBooking(bestOption, bookingRequest);
    
    // Step 5: Add to calendar (autonomous)
    await this.addToCalendar(booking);
    
    // Step 6: Send confirmation (autonomous)
    await this.sendConfirmation(booking);
    
    return booking;
  }
}
```

**Benefits:**
- ✅ Saves user time (no manual booking)
- ✅ Handles multiple booking systems
- ✅ Proactive (suggests alternatives if booked)

---

## Implementation Priority

### Phase 1: Quick Wins (2-3 weeks)
1. ✅ **Proactive Recommendation Agent** - Enhance existing recommendations
2. ✅ **Personalization Learning Agent** - Improve existing personalization

### Phase 2: High Impact (4-6 weeks)
3. ✅ **Smart Itinerary Builder Agent** - Enhance existing itinerary system
4. ✅ **Multi-Tool Orchestration Agent** - Add booking automation

### Phase 3: Strategic (6-8 weeks)
5. ✅ **Autonomous Travel Planning Agent** - Complete trip planning automation
6. ✅ **Content Curation Agent** - Automated content discovery

---

## Technical Architecture

### Agent Framework
```typescript
// New: lib/agents/base-agent.ts
abstract class BaseAgent {
  protected tools: Tool[];
  protected memory: Memory;
  
  abstract async execute(task: Task): Promise<Result>;
  
  protected async useTool(tool: Tool, params: any) {
    // Autonomous tool usage
  }
  
  protected async plan(steps: Step[]): Promise<Plan> {
    // Multi-step planning
  }
}
```

### Tool System
```typescript
// New: lib/agents/tools/index.ts
interface Tool {
  name: string;
  execute(params: any): Promise<any>;
}

const tools = {
  search: new SearchTool(),
  weather: new WeatherTool(),
  maps: new MapsTool(),
  booking: new BookingTool(),
  calendar: new CalendarTool(),
  // ... more tools
};
```

### Memory System
```typescript
// New: lib/agents/memory.ts
class AgentMemory {
  async remember(context: string, data: any) {
    // Store context for future use
  }
  
  async recall(context: string) {
    // Retrieve relevant context
  }
}
```

---

## Integration with Existing Systems

### 1. OpenAI Assistants API
- Use for agent orchestration
- Tool calling for multi-step tasks
- Thread persistence for context

### 2. Google Discovery Engine
- Already integrated
- Use for destination search
- Enhance with agent planning

### 3. Existing APIs
- Reuse: `/api/ai-chat`, `/api/recommendations`, etc.
- Enhance: Add agent orchestration layer

---

## Cost Considerations

### Current AI Costs
- OpenAI GPT-4o-mini: ~$0.15/1M tokens
- Google Gemini: Free tier available
- Discovery Engine: Free tier available

### Agentic AI Costs
- **Planning Agent**: ~$0.50-1.00 per trip (multiple API calls)
- **Recommendation Agent**: ~$0.10 per session (cached)
- **Itinerary Agent**: ~$0.30 per itinerary (route optimization)
- **Booking Agent**: ~$0.20 per booking (API calls)

**Total Estimated**: $1-2 per active user per month

---

## Next Steps

1. **Choose Priority**: Which agent should we build first?
2. **Design API**: Define agent interfaces
3. **Implement Tools**: Build tool system
4. **Build First Agent**: Start with highest impact
5. **Test & Iterate**: Refine based on usage

---

## Recommendation

**Start with: Smart Itinerary Builder Agent** because:
- ✅ High user value (saves hours)
- ✅ Uses existing infrastructure
- ✅ Clear success metrics
- ✅ Can be built incrementally

**Then add: Proactive Recommendation Agent** because:
- ✅ Enhances existing features
- ✅ Low complexity
- ✅ Immediate user benefit

Would you like me to implement one of these agents?

