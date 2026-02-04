//
//  DestinationsViewModel.swift
//  UrbanManual
//
//  Destinations list view model
//

import Foundation

@MainActor
class DestinationsViewModel: ObservableObject {
    @Published var destinations: [Destination] = []
    @Published var filteredDestinations: [Destination] = []
    @Published var isLoading = false
    @Published var errorMessage: String?
    
    @Published var selectedCity: String?
    @Published var selectedCategory: String?
    @Published var searchQuery = ""
    
    private let repository = DestinationRepository()
    
    init() {
        // Will implement search debounce if needed
    }
    
    func fetchDestinations() async {
        isLoading = true
        errorMessage = nil
        
        do {
            destinations = try await repository.fetchDestinations(
                city: selectedCity,
                category: selectedCategory
            )
            applyFilters()
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    func searchDestinations() async {
        guard !searchQuery.isEmpty else {
            applyFilters()
            return
        }
        
        isLoading = true
        
        do {
            let results = try await repository.searchDestinations(query: searchQuery)
            filteredDestinations = results
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
    
    private func applyFilters() {
        var filtered = destinations
        
        if let city = selectedCity {
            filtered = filtered.filter { $0.city == city }
        }
        
        if let category = selectedCategory {
            filtered = filtered.filter { $0.category.lowercased() == category.lowercased() }
        }
        
        filteredDestinations = filtered
    }
    
    func clearFilters() {
        selectedCity = nil
        selectedCategory = nil
        searchQuery = ""
        applyFilters()
    }
}

