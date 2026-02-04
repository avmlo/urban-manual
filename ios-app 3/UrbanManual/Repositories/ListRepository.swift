//
//  ListRepository.swift
//  UrbanManual
//
//  Repository for user lists operations
//

import Foundation
import Supabase

class ListRepository {
    private let client = SupabaseConfig.client
    
    // Fetch user's lists
    func fetchLists(userId: UUID) async throws -> [List] {
        let response: [List] = try await client
            .from("lists")
            .select()
            .eq("user_id", value: userId)
            .order("updated_at", ascending: false)
            .execute()
            .value
        
        return response
    }
    
    // Create new list
    func createList(userId: UUID, name: String, description: String?, isPublic: Bool) async throws -> List {
        let newList = List(
            id: UUID(),
            userId: userId,
            name: name,
            description: description,
            isPublic: isPublic,
            createdAt: Date(),
            updatedAt: Date()
        )
        
        let response: [List] = try await client
            .from("lists")
            .insert(newList)
            .select()
            .execute()
            .value
        
        guard let list = response.first else {
            throw NetworkError.noData
        }
        
        return list
    }
    
    // Delete list
    func deleteList(listId: UUID) async throws {
        try await client
            .from("lists")
            .delete()
            .eq("id", value: listId)
            .execute()
    }
    
    // Fetch destinations in a list
    func fetchListDestinations(listId: UUID) async throws -> [Destination] {
        let response: [[String: Any]] = try await client
            .from("list_items")
            .select("*, destinations(*)")
            .eq("list_id", value: listId)
            .execute()
            .value
        
        let destinations = response.compactMap { dict -> Destination? in
            guard let destData = dict["destinations"] as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: destData),
                  let destination = try? JSONDecoder().decode(Destination.self, from: jsonData) else {
                return nil
            }
            return destination
        }
        
        return destinations
    }
    
    // Add destination to list
    func addDestinationToList(listId: UUID, destinationId: UUID) async throws {
        let item = ListItem(
            id: UUID(),
            listId: listId,
            destinationId: destinationId,
            createdAt: Date()
        )
        
        try await client
            .from("list_items")
            .insert(item)
            .execute()
    }
    
    // Remove destination from list
    func removeDestinationFromList(listId: UUID, destinationId: UUID) async throws {
        try await client
            .from("list_items")
            .delete()
            .eq("list_id", value: listId)
            .eq("destination_id", value: destinationId)
            .execute()
    }
}

