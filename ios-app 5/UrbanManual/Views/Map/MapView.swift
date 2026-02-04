//
//  MapView.swift
//  UrbanManual
//
//  Interactive map view showing destinations
//

import SwiftUI
import MapKit

struct MapView: View {
    @StateObject private var viewModel = MapViewModel()
    @State private var selectedCity: String?
    
    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                map
                
                if let selected = viewModel.selectedDestination {
                    destinationPreview(selected)
                }
            }
            .navigationTitle("Map")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Menu {
                        Button {
                            viewModel.centerOnUserLocation()
                        } label: {
                            Label("My Location", systemImage: "location.fill")
                        }
                        
                        Divider()
                        
                        Button {
                            selectedCity = nil
                            Task {
                                await viewModel.fetchDestinations()
                            }
                        } label: {
                            Label("All Cities", systemImage: "globe")
                        }
                    } label: {
                        Image(systemName: "slider.horizontal.3")
                    }
                }
            }
            .task {
                await viewModel.fetchDestinations()
                viewModel.requestLocationPermission()
            }
        }
    }
    
    private var map: some View {
        Map(coordinateRegion: $viewModel.region, annotationItems: viewModel.destinations) { destination in
            MapAnnotation(coordinate: destination.coordinate ?? CLLocationCoordinate2D()) {
                destinationPin(destination)
            }
        }
        .edgesIgnoringSafeArea(.all)
    }
    
    private func destinationPin(_ destination: Destination) -> some View {
        Button {
            viewModel.centerOnDestination(destination)
        } label: {
            ZStack {
                Circle()
                    .fill(destination.isFeatured ? Color.yellow : Color.accentColor)
                    .frame(width: 30, height: 30)
                
                if destination.michelinStars > 0 {
                    Image(systemName: "star.fill")
                        .font(.caption2)
                        .foregroundColor(.white)
                } else {
                    Image(systemName: "mappin.circle.fill")
                        .font(.caption)
                        .foregroundColor(.white)
                }
            }
            .shadow(radius: 3)
        }
        .scaleEffect(viewModel.selectedDestination?.id == destination.id ? 1.2 : 1.0)
        .animation(.spring(), value: viewModel.selectedDestination?.id)
    }
    
    private func destinationPreview(_ destination: Destination) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text(destination.name)
                        .font(.headline)
                    
                    HStack {
                        Text(destination.city)
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                        
                        if destination.michelinStars > 0 {
                            HStack(spacing: 2) {
                                ForEach(0..<destination.michelinStars, id: \.self) { _ in
                                    Image(systemName: "star.fill")
                                        .font(.caption2)
                                        .foregroundColor(.yellow)
                                }
                            }
                        }
                    }
                }
                
                Spacer()
                
                Button {
                    viewModel.selectedDestination = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundColor(.gray)
                }
            }
            
            NavigationLink(destination: DestinationDetailView(destination: destination)) {
                Text("View Details")
                    .font(.subheadline)
                    .foregroundColor(.accentColor)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(radius: 5)
        .padding()
        .transition(.move(edge: .bottom))
        .animation(.spring(), value: viewModel.selectedDestination)
    }
}
