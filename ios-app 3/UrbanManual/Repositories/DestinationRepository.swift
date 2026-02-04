//
//  DestinationRepository.swift
//  UrbanManual
//
//  Repository for destination data operations
//

import Foundation
import Supabase

class DestinationRepository {
    private let client = SupabaseConfig.client
    
    // Fetch all destinations
    func fetchDestinations(
        city: String? = nil,
        category: String? = nil,
        limit: Int = 50,
        offset: Int = 0
    ) async throws -> [Destination] {
        var query = client
            .from("destinations")
            .select()
            .order("name")
            .limit(limit)
            .range(from: offset, to: offset + limit - 1)
        
        if let city = city {
            query = query.eq("city", value: city)
        }
        
        if let category = category {
            query = query.eq("category", value: category)
        }
        
        let response: [Destination] = try await query.execute().value
        return response
    }
    
    // Fetch destination by ID
    func fetchDestination(id: UUID) async throws -> Destination {
        let response: [Destination] = try await client
            .from("destinations")
            .select()
            .eq("id", value: id)
            .execute()
            .value
        
        guard let destination = response.first else {
            throw NetworkError.notFound
        }
        
        return destination
    }
    
    // Fetch destination by slug
    func fetchDestination(slug: String) async throws -> Destination {
        let response: [Destination] = try await client
            .from("destinations")
            .select()
            .eq("slug", value: slug)
            .execute()
            .value
        
        guard let destination = response.first else {
            throw NetworkError.notFound
        }
        
        return destination
    }
    
    // Search destinations
    func searchDestinations(query: String) async throws -> [Destination] {
        let response: [Destination] = try await client
            .from("destinations")
            .select()
            .ilike("name", pattern: "%\(query)%")
            .order("name")
            .limit(50)
            .execute()
            .value
        
        return response
    }
    
    // Fetch featured destinations
    func fetchFeaturedDestinations() async throws -> [Destination] {
        let response: [Destination] = try await client
            .from("destinations")
            .select()
            .eq("crown", value: true)
            .order("name")
            .limit(20)
            .execute()
            .value
        
        return response
    }
    
    // Fetch unique cities
    func fetchCities() async throws -> [String] {
        let response: [[String: String]] = try await client
            .from("destinations")
            .select("city")
            .execute()
            .value
        
        let cities = Set(response.compactMap { $0["city"] })
        return Array(cities).sorted()
    }
    
    // Fetch destinations with Michelin stars
    func fetchMichelinDestinations() async throws -> [Destination] {
        let response: [Destination] = try await client
            .from("destinations")
            .select()
            .gte("michelin_stars", value: 1)
            .order("michelin_stars", ascending: false)
            .execute()
            .value
        
        return response
    }
}

