import { mysqlTable, varchar, int, timestamp, text, datetime } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  avatar: varchar("avatar", { length: 500 }),
  createdAt: datetime("created_at"),
  lastSignedIn: datetime("last_signed_in"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const savedPlaces = mysqlTable("saved_places", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }).notNull(),
  savedAt: timestamp("saved_at").notNull(),
  notes: text("notes"),
});

export const visitedPlaces = mysqlTable("visited_places", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }).notNull(),
  visitedAt: timestamp("visited_at").notNull(),
  rating: int("rating"), // Optional rating 1-5
  notes: text("notes"),
});

export const userPreferences = mysqlTable("user_preferences", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull().unique(),
  favoriteCategories: text("favorite_categories"), // JSON array
  favoriteCities: text("favorite_cities"), // JSON array
  interests: text("interests"), // JSON array
  updatedAt: timestamp("updated_at").notNull(),
});

export const userActivity = mysqlTable("user_activity", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // 'view', 'search', 'save', 'unsave'
  timestamp: timestamp("timestamp").notNull(),
  metadata: text("metadata"), // JSON for additional context
});

export const trips = mysqlTable("trips", {
  id: int("id").primaryKey().autoincrement(),
  userId: varchar("user_id", { length: 255 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  destination: varchar("destination", { length: 255 }), // Main city/destination
  startDate: datetime("start_date"),
  endDate: datetime("end_date"),
  status: varchar("status", { length: 50 }).notNull().default("planning"), // 'planning', 'upcoming', 'ongoing', 'completed'
  isPublic: int("is_public").notNull().default(0), // 0 = private, 1 = public
  coverImage: varchar("cover_image", { length: 500 }),
  createdAt: datetime("created_at").notNull(),
  updatedAt: datetime("updated_at").notNull(),
});

export type Trip = typeof trips.$inferSelect;
export type InsertTrip = typeof trips.$inferInsert;

export const itineraryItems = mysqlTable("itinerary_items", {
  id: int("id").primaryKey().autoincrement(),
  tripId: int("trip_id").notNull(),
  destinationSlug: varchar("destination_slug", { length: 255 }),
  day: int("day").notNull(), // Day number in the trip (1-indexed)
  orderIndex: int("order_index").notNull(), // Order within the day
  time: varchar("time", { length: 50 }), // e.g., "9:00 AM", "Morning", "Afternoon"
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  notes: text("notes"), // User's personal notes
  createdAt: datetime("created_at").notNull(),
});

export type ItineraryItem = typeof itineraryItems.$inferSelect;
export type InsertItineraryItem = typeof itineraryItems.$inferInsert;

