//
//  SavedViewModel.swift
//  UrbanManual
//
//  ViewModel for managing saved destinations
//

import Foundation
import Supabase

@MainActor
class SavedViewModel: ObservableObject {
    @Published var savedDestinations: [SavedDestination] = []
    @Published var isLoading = false
    @Published var error: NetworkError?
    
    private let repository = SavedRepository()
    private let destinationRepository = DestinationRepository()
    
    // Fetch saved destinations for the current user
    func fetchSaved() async {
        isLoading = true
        error = nil
        
        do {
            savedDestinations = try await repository.fetchSaved()
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
        
        isLoading = false
    }
    
    // Unsave a destination
    func unsave(_ destinationId: UUID) async {
        do {
            try await repository.unsave(destinationId: destinationId)
            // Remove from local array
            savedDestinations.removeAll { $0.destinationId == destinationId }
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
    }
    
    // Get full destination details for a saved item
    func getDestination(for saved: SavedDestination) async -> Destination? {
        do {
            return try await destinationRepository.fetchById(saved.destinationId)
        } catch {
            return nil
        }
    }
    
    // Sort saved destinations
    func sortBy(_ criteria: SortCriteria) {
        switch criteria {
        case .dateAdded:
            savedDestinations.sort { $0.createdAt > $1.createdAt }
        case .name:
            savedDestinations.sort { ($0.destination?.name ?? "") < ($1.destination?.name ?? "") }
        case .city:
            savedDestinations.sort { ($0.destination?.city ?? "") < ($1.destination?.city ?? "") }
        }
    }
    
    enum SortCriteria {
        case dateAdded
        case name
        case city
    }
}
