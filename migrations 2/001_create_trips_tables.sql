-- Migration: Create trips and itinerary_items tables
-- Run this migration to add trip planning functionality

-- Create trips table
CREATE TABLE IF NOT EXISTS `trips` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `destination` VARCHAR(255),
  `start_date` DATETIME,
  `end_date` DATETIME,
  `status` VARCHAR(50) NOT NULL DEFAULT 'planning',
  `is_public` INT NOT NULL DEFAULT 0,
  `cover_image` VARCHAR(500),
  `created_at` DATETIME NOT NULL,
  `updated_at` DATETIME NOT NULL,
  INDEX `idx_trips_user_id` (`user_id`),
  INDEX `idx_trips_status` (`status`),
  INDEX `idx_trips_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create itinerary_items table
CREATE TABLE IF NOT EXISTS `itinerary_items` (
  `id` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `trip_id` INT NOT NULL,
  `destination_slug` VARCHAR(255),
  `day` INT NOT NULL,
  `order_index` INT NOT NULL,
  `time` VARCHAR(50),
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `notes` TEXT,
  `created_at` DATETIME NOT NULL,
  INDEX `idx_itinerary_items_trip_id` (`trip_id`),
  INDEX `idx_itinerary_items_day` (`day`),
  INDEX `idx_itinerary_items_destination_slug` (`destination_slug`),
  FOREIGN KEY (`trip_id`) REFERENCES `trips`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
