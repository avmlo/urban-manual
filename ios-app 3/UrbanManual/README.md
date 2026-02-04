# Urban Manual iOS App

Native Swift iOS app for Urban Manual travel curation platform.

## Setup Instructions

### 1. Create Xcode Project

1. Open Xcode
2. Create new iOS App project
3. Product Name: "UrbanManual"
4. Interface: SwiftUI
5. Language: Swift
6. Minimum iOS: 17.0

### 2. Add Package Dependencies

In Xcode:
1. File > Add Package Dependencies
2. Add: `https://github.com/supabase/supabase-swift` (version 2.0.0+)
3. Add: `https://github.com/onevcat/Kingfisher` (version 7.0.0+)

### 3. Configure Supabase

1. Add your Supabase URL and anon key to `Core/Config/SupabaseConfig.swift`
2. Or use environment variables/Xcode configuration

### 4. Copy Files

Copy all Swift files from this directory structure into your Xcode project maintaining the folder structure.

### 5. Database Setup

Run the SQL migrations in `migrations/` folder in your Supabase database:
- `010_visited_countries_table.sql` (from web app)
- Additional migrations as needed

## Project Structure

The app follows MVVM architecture with clear separation of concerns:
- **Models**: Data structures
- **ViewModels**: Business logic and state management
- **Views**: SwiftUI UI components
- **Repositories**: Data access layer
- **Core**: Configuration and utilities

## Features

- ✅ User authentication
- ✅ Browse destinations
- ✅ Search and filter
- ✅ Save destinations
- ✅ Map view
- ✅ User lists
- ✅ Profile management

## Build Requirements

- Xcode 15.0+
- iOS 17.0+
- Swift 5.9+

