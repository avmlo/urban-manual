

# Urban Manual: The UX Algorithm Plan

**Date:** October 31, 2025  
**Author:** Manus AI  
**Status:** Strategic Plan

---

## 1. Executive Summary

To elevate Urban Manual from a high-quality content platform to an indispensable, personalized travel co-pilot, we must implement a sophisticated suite of UX algorithms. This document outlines a comprehensive plan to intelligently personalize content, power recommendations, rank search results, and dynamically deliver the right experience to the right user at the right time.

Our strategy is centered around a unified scoring system called the **"Manual Score,"** a weighted algorithm that calculates a relevance score for every piece of content for every user. This score will be the engine that drives personalization across the entire platform.

This plan details the architecture of five interconnected algorithm systems:
1.  **Personalization & User Profiling:** To understand user tastes.
2.  **Recommendation Engine:** To suggest relevant content.
3.  **Search & Ranking Algorithm:** To deliver intelligent search results.
4.  **Dynamic Content Delivery:** To adapt the UI in real-time.
5.  **Engagement & Gamification:** To encourage repeat usage.

By implementing this algorithmic framework, we will dramatically increase user engagement, session length, and conversion to our premium "Pro" membership, creating a deeply defensible competitive advantage.

---

## 2. The Core Algorithm: The "Manual Score"

The foundation of our entire UX strategy is the **Manual Score**. This is a dynamic, personalized score that every destination, city, and article will have for each individual user. It answers the question: "How relevant is this piece of content to this specific user right now?"

The score is calculated using a weighted formula:

**Manual Score = (P-Score * w1) + (C-Score * w2) + (Q-Score * w3) + (T-Score * w4)**

Where:

| Component | Name | Description | Weight |
| :--- | :--- | :--- | :--- |
| **P-Score** | **Personalization Score** | How well the content matches the user's explicit and implicit interests (e.g., taste profile, saved items, browsing history). | 40% |
| **C-Score** | **Context Score** | How relevant the content is to the user's current situation (e.g., time of day, location, current trip). | 30% |
| **Q-Score** | **Quality Score** | The intrinsic quality and popularity of the content, based on editorial ratings, user ratings, and engagement metrics. | 20% |
| **T-Score** | **Temporal Score** | How timely or new the content is. Newer content and seasonal events get a temporary boost. | 10% |

This unified score will be used to rank content on the homepage, in search results, in recommendation carousels, and in email newsletters, ensuring a consistently personalized experience across all touchpoints.



---

## 3. System 1: Personalization & User Profiling

**Objective:** To build a deep, nuanced understanding of each user's travel style and preferences.

### 3.1. The User Taste Profile

We will create a `taste_profile` table in Supabase for each user. This profile will be a JSON object that stores their preferences across several dimensions. It will be built from two sources: explicit and implicit data.

**Explicit Data (Onboarding & Settings):**
- During onboarding, we will ask users a short series of questions:
  1. "What's your travel style?" (e.g., Luxury, Budget, Adventure, Relaxation)
  2. "What are your primary interests?" (e.g., Food, Art, History, Nightlife, Shopping)
  3. "Who do you usually travel with?" (e.g., Solo, Partner, Family, Friends)

**Implicit Data (Behavioral Tracking):**
- We will track user actions to infer their preferences:
  - **Destinations Viewed:** Every view contributes to their interest profile.
  - **Destinations Saved/Liked:** A strong signal of preference.
  - **Searches Performed:** The keywords they use reveal their intent.
  - **Time Spent on Page:** Longer time indicates higher interest.

### 3.2. The P-Score (Personalization Score) Algorithm

The P-Score measures the affinity between a user's taste profile and a piece of content.

```
function calculatePScore(userProfile, contentItem) {
  let score = 0;

  // Match interests
  const interestOverlap = userProfile.interests.filter(i => contentItem.tags.includes(i));
  score += interestOverlap.length * 10; // 10 points per matching interest

  // Match travel style
  if (userProfile.travelStyle === contentItem.style) {
    score += 20; // 20 points for matching style
  }

  // Boost for past interactions
  if (userHasViewed(userProfile, contentItem)) score += 5;
  if (userHasSaved(userProfile, contentItem)) score += 25;

  return score;
}
```

---

## 4. System 2: Recommendation Engine

**Objective:** To proactively suggest relevant content to users, driving discovery and engagement.

We will implement three types of recommendations:

### 4.1. Collaborative Filtering: "Users who liked this also liked..."

- **How it works:** We analyze the behavior of all users to find patterns. If User A and User B have both saved many of the same destinations, we can recommend other destinations that User B saved to User A.
- **Implementation:** We can use a pre-built library like `implicit` in Python to run this analysis offline as a nightly batch job.

### 4.2. Content-Based Filtering: "Because you liked [Destination]..."

- **How it works:** If a user frequently views or saves destinations with the "Japanese" and "Fine Dining" tags, we will recommend other destinations that also have these tags.
- **Implementation:** This is a direct application of the **P-Score**. We simply find items with the highest P-Score for the user that they haven't interacted with yet.

### 4.3. Contextual Recommendations: "Popular Near You"

- **How it works:** Using the user's current location (with their permission), we can recommend highly-rated destinations nearby. This uses the **C-Score** (Context Score).
- **Implementation:** Combine the Google Geolocation API to get the user's location with a Supabase query to find destinations within a certain radius, ordered by their **Q-Score** (Quality Score).

### 4.4. Recommendation UI

We will display these recommendations in several places:
- **Homepage:** A "For You" carousel.
- **Destination Pages:** A "You Might Also Like" section.
- **Email Newsletters:** A personalized list of recommended spots.



---

## 5. System 3: Search & Ranking Algorithm

**Objective:** To deliver highly relevant, personalized search results that go beyond simple keyword matching.

Our search ranking will be a direct application of the **Manual Score**.

### 5.1. The Search Process

1.  **Initial Retrieval:** First, we perform a full-text search in Supabase (or preferably, the Google Discovery Engine API) to get a list of all documents that match the user's query.
2.  **Personalized Ranking:** For each result, we calculate its **Manual Score** for the current user.
3.  **Re-ranking:** We then sort the entire result set by the Manual Score in descending order.

This ensures that the most personally relevant results always appear at the top.

### 5.2. Example

A user searches for "pasta."

- **Without Personalization:** The results would be a simple list of all restaurants that mention "pasta."
- **With Manual Score Ranking:**
  - A user whose taste profile shows a preference for "Fine Dining" and "Italian" will see expensive, highly-rated Italian restaurants at the top.
  - A user whose taste profile shows a preference for "Budget" and "Quick Bites" will see affordable, casual pasta spots first.

### 5.3. Implementation: Google Discovery Engine

While we can implement a basic version of this with Supabase, the ideal solution is to use the **Google Discovery Engine API**. It has built-in support for semantic search and personalized ranking, which would handle the heavy lifting of this system.

---

## 6. System 4: Dynamic Content Delivery

**Objective:** To adapt the user interface and content in real-time based on the user's context.

This system primarily uses the **C-Score (Context Score)**.

### 6.1. Contextual Factors

- **Location:** Is the user at home planning a trip, or are they in a new city exploring?
- **Time of Day:** Are they looking for breakfast, lunch, dinner, or nightlife?
- **Device:** Are they on a desktop (planning) or mobile (exploring)?
- **Trip Status:** Is their next trip in 3 months, or is it tomorrow?

### 6.2. Dynamic UI Examples

- **Homepage Adaptation:**
  - If it's morning, the homepage hero might feature "Best Breakfast Spots in [City]."
  - If the user is detected to be in a new city, the homepage will automatically switch to showing content for that city, with a "Near Me" section at the top.
- **Destination Page Adaptation:**
  - If a user views a restaurant page at 8 PM, we can show a "Book a Table" button more prominently.
  - If a user views a museum page, we can show the opening hours for today at the top.

---

## 7. System 5: Engagement & Gamification

**Objective:** To encourage repeat usage, content contribution, and a sense of community.

### 7.1. The "Urban Explorer" Score

We will introduce a points system to reward users for their activity.

| Action | Points Awarded |
| :--- | :--- |
| Save a destination | 5 points |
| Create a list | 10 points |
| Complete a trip (visit saved spots) | 50 points |
| Write a review | 25 points |
| Upload a photo | 10 points |

### 7.2. Levels & Badges

- Users will progress through levels (e.g., Novice, Local, Globetrotter) as they earn points.
- They can also earn badges for specific achievements (e.g., "Tokyo Expert" for visiting 10 spots in Tokyo, "Foodie" for visiting 20 restaurants).

### 7.3. Leaderboards

- We can introduce city-specific leaderboards to create friendly competition among users.

> **Implementation:** This system can be built with a `gamification` table in Supabase that tracks user points and achievements. The logic can be handled with Supabase Edge Functions that trigger on user actions.

---

## 8. Implementation Roadmap

This is a long-term vision. We will implement it in phases.

1.  **Phase 1 (Now):** Implement the basic **User Taste Profile** and the **P-Score** and **Q-Score** components of the Manual Score. Use this to create a personalized "For You" section on the homepage.
2.  **Phase 2 (Next Quarter):** Build out the **Search & Ranking Algorithm** using the full Manual Score. Implement the **Contextual Recommendations** ("Near Me").
3.  **Phase 3 (6-12 Months):** Develop the **Gamification** system (points, badges). Build the **Collaborative Filtering** recommendation model.
4.  **Phase 4 (Long Term):** Integrate the **Google Discovery Engine** for a truly state-of-the-art search experience.

By methodically building out these interconnected systems, we will create a deeply engaging and personalized user experience that will be difficult for any competitor to replicate.

