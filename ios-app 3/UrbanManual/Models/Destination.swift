//
//  Destination.swift
//  UrbanManual
//
//  Destination model matching Supabase schema
//

import Foundation
import CoreLocation

struct Destination: Codable, Identifiable, Hashable {
    let id: UUID
    let name: String
    let slug: String
    let description: String?
    let city: String
    let category: String
    let address: String?
    let latitude: Double?
    let longitude: Double?
    let image: String?  // Changed from imageUrl to match Supabase column name
    let michelinStars: Int
    let crown: Bool?  // Changed from isFeatured to match Supabase column name
    let googlePlaceId: String?
    let googleRating: Double?
    let googlePhone: String?
    let googleWebsite: String?
    let instagramUrl: String?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, name, slug, description, city, category, address
        case latitude, longitude
        case image
        case michelinStars = "michelin_stars"
        case crown
        case googlePlaceId = "google_place_id"
        case googleRating = "google_rating"
        case googlePhone = "google_phone"
        case googleWebsite = "google_website"
        case instagramUrl = "instagram_url"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

extension Destination {
    var coordinate: CLLocationCoordinate2D? {
        guard let lat = latitude, let lon = longitude else { return nil }
        return CLLocationCoordinate2D(latitude: lat, longitude: lon)
    }
    
    var categoryEmoji: String {
        switch category.lowercased() {
        case "restaurant", "dining": return "🍽️"
        case "cafe": return "☕"
        case "bar": return "🍷"
        case "bakery": return "🥐"
        case "museum": return "🏛️"
        case "gallery": return "🖼️"
        case "hotel": return "🏨"
        case "shop": return "🛍️"
        default: return "📍"
        }
    }
    
    var isFeatured: Bool {
        crown ?? false
    }
    
    var imageUrl: String? {
        image
    }
}

