//
//  ListsViewModel.swift
//  UrbanManual
//
//  ViewModel for managing user lists
//

import Foundation
import Supabase

@MainActor
class ListsViewModel: ObservableObject {
    @Published var lists: [List] = []
    @Published var isLoading = false
    @Published var error: NetworkError?
    
    private let repository = ListRepository()
    
    // Fetch all lists for the current user
    func fetchLists() async {
        isLoading = true
        error = nil
        
        do {
            lists = try await repository.fetchLists()
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
        
        isLoading = false
    }
    
    // Create a new list
    func createList(name: String, description: String? = nil) async {
        do {
            let newList = try await repository.createList(name: name, description: description)
            lists.append(newList)
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
    }
    
    // Update a list
    func updateList(_ list: List, name: String, description: String?) async {
        do {
            let updatedList = try await repository.updateList(list.id, name: name, description: description)
            if let index = lists.firstIndex(where: { $0.id == list.id }) {
                lists[index] = updatedList
            }
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
    }
    
    // Delete a list
    func deleteList(_ list: List) async {
        do {
            try await repository.deleteList(list.id)
            lists.removeAll { $0.id == list.id }
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
    }
    
    // Add destination to list
    func addToList(listId: UUID, destinationId: UUID) async {
        do {
            try await repository.addToList(listId: listId, destinationId: destinationId)
            // Optionally refresh the specific list
            await fetchLists()
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
    }
    
    // Remove destination from list
    func removeFromList(listId: UUID, destinationId: UUID) async {
        do {
            try await repository.removeFromList(listId: listId, destinationId: destinationId)
            await fetchLists()
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
    }
    
    // Get items for a specific list
    func getListItems(for listId: UUID) async -> [ListItem] {
        do {
            return try await repository.fetchListItems(listId: listId)
        } catch {
            return []
        }
    }
}
