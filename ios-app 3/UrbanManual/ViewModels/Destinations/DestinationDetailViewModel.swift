//
//  DestinationDetailViewModel.swift
//  UrbanManual
//
//  Destination detail view model
//

import Foundation
import MapKit

@MainActor
class DestinationDetailViewModel: ObservableObject {
    @Published var destination: Destination
    @Published var isSaved = false
    @Published var isLoading = false
    
    private let savedRepository = SavedRepository()
    private let authRepository = AuthRepository()
    
    init(destination: Destination) {
        self.destination = destination
        Task {
            await checkIfSaved()
        }
    }
    
    func checkIfSaved() async {
        guard let user = try? await authRepository.getCurrentUser() else { return }
        
        do {
            isSaved = try await savedRepository.isDestinationSaved(
                userId: user.id,
                destinationId: destination.id
            )
        } catch {
            print("Error checking saved status: \(error)")
        }
    }
    
    func toggleSaved() async {
        guard let user = try? await authRepository.getCurrentUser() else { return }
        
        isLoading = true
        
        do {
            if isSaved {
                try await savedRepository.unsaveDestination(
                    userId: user.id,
                    destinationId: destination.id
                )
                isSaved = false
            } else {
                try await savedRepository.saveDestination(
                    userId: user.id,
                    destinationId: destination.id
                )
                isSaved = true
            }
        } catch {
            print("Error toggling saved: \(error)")
        }
        
        isLoading = false
    }
    
    func openInMaps() {
        guard let coordinate = destination.coordinate else { return }
        
        let mapItem = MKMapItem(placemark: MKPlacemark(coordinate: coordinate))
        mapItem.name = destination.name
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeWalking
        ])
    }
    
    func openWebsite() {
        guard let urlString = destination.googleWebsite,
              let url = URL(string: urlString) else { return }
        UIApplication.shared.open(url)
    }
    
    func callPhone() {
        guard let phone = destination.googlePhone,
              let url = URL(string: "tel://\(phone)") else { return }
        UIApplication.shared.open(url)
    }
}

