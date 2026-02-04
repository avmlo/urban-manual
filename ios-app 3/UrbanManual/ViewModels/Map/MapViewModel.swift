//
//  MapViewModel.swift
//  UrbanManual
//
//  ViewModel for managing map view and location
//

import Foundation
import MapKit
import CoreLocation

@MainActor
class MapViewModel: ObservableObject {
    @Published var destinations: [Destination] = []
    @Published var selectedDestination: Destination?
    @Published var region = MKCoordinateRegion(
        center: CLLocationCoordinate2D(latitude: 51.5074, longitude: -0.1278), // London default
        span: MKCoordinateSpan(latitudeDelta: 0.1, longitudeDelta: 0.1)
    )
    @Published var isLoading = false
    @Published var error: NetworkError?
    
    private let repository = DestinationRepository()
    private let locationManager = CLLocationManager()
    
    init() {
        locationManager.desiredAccuracy = kCLLocationAccuracyBest
    }
    
    // Fetch destinations for map display
    func fetchDestinations(city: String? = nil) async {
        isLoading = true
        error = nil
        
        do {
            destinations = try await repository.fetchAll(city: city, limit: 1000)
            
            // If we have destinations, center on the first one
            if let first = destinations.first, let coordinate = first.coordinate {
                centerOn(coordinate: coordinate)
            }
        } catch let networkError as NetworkError {
            error = networkError
        } catch {
            self.error = .unknown(error)
        }
        
        isLoading = false
    }
    
    // Center map on a specific destination
    func centerOnDestination(_ destination: Destination) {
        selectedDestination = destination
        if let coordinate = destination.coordinate {
            centerOn(coordinate: coordinate, span: 0.01)
        }
    }
    
    // Center map on coordinates
    func centerOn(coordinate: CLLocationCoordinate2D, span: Double = 0.1) {
        withAnimation {
            region = MKCoordinateRegion(
                center: coordinate,
                span: MKCoordinateSpan(latitudeDelta: span, longitudeDelta: span)
            )
        }
    }
    
    // Filter destinations by visible region
    func destinationsInRegion() -> [Destination] {
        destinations.filter { destination in
            guard let coordinate = destination.coordinate else { return false }
            
            let minLat = region.center.latitude - region.span.latitudeDelta / 2
            let maxLat = region.center.latitude + region.span.latitudeDelta / 2
            let minLon = region.center.longitude - region.span.longitudeDelta / 2
            let maxLon = region.center.longitude + region.span.longitudeDelta / 2
            
            return coordinate.latitude >= minLat &&
                   coordinate.latitude <= maxLat &&
                   coordinate.longitude >= minLon &&
                   coordinate.longitude <= maxLon
        }
    }
    
    // Request user location permission
    func requestLocationPermission() {
        locationManager.requestWhenInUseAuthorization()
    }
    
    // Center on user location
    func centerOnUserLocation() {
        if let userLocation = locationManager.location?.coordinate {
            centerOn(coordinate: userLocation, span: 0.05)
        }
    }
    
    // Group nearby destinations for clustering
    func clusteredDestinations(minDistance: Double = 0.001) -> [[Destination]] {
        var clusters: [[Destination]] = []
        var remaining = destinations
        
        while !remaining.isEmpty {
            let first = remaining.removeFirst()
            guard let firstCoord = first.coordinate else {
                clusters.append([first])
                continue
            }
            
            var cluster = [first]
            
            remaining.removeAll { destination in
                guard let coord = destination.coordinate else { return false }
                let distance = sqrt(
                    pow(coord.latitude - firstCoord.latitude, 2) +
                    pow(coord.longitude - firstCoord.longitude, 2)
                )
                
                if distance < minDistance {
                    cluster.append(destination)
                    return true
                }
                return false
            }
            
            clusters.append(cluster)
        }
        
        return clusters
    }
}
