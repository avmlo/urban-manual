//
//  DestinationDetailView.swift
//  UrbanManual
//
//  Destination detail view
//

import SwiftUI
import MapKit
import Kingfisher

struct DestinationDetailView: View {
    @StateObject private var viewModel: DestinationDetailViewModel
    
    init(destination: Destination) {
        _viewModel = StateObject(wrappedValue: DestinationDetailViewModel(destination: destination))
    }
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Hero Image
                if let imageUrl = viewModel.destination.imageUrl, let url = URL(string: imageUrl) {
                    KFImage(url)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(height: 300)
                        .clipped()
                } else {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .frame(height: 300)
                }
                
                VStack(alignment: .leading, spacing: 16) {
                    // Header
                    HStack(alignment: .top) {
                        VStack(alignment: .leading, spacing: 8) {
                            // Category
                            HStack {
                                Text(viewModel.destination.categoryEmoji)
                                Text(viewModel.destination.category)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                            
                            // Name
                            Text(viewModel.destination.name)
                                .font(.title)
                                .fontWeight(.bold)
                            
                            // City
                            HStack {
                                Image(systemName: "mappin.circle.fill")
                                    .foregroundColor(.blue)
                                Text(viewModel.destination.city)
                                    .font(.subheadline)
                                    .foregroundColor(.secondary)
                            }
                        }
                        
                        Spacer()
                        
                        // Save button
                        Button(action: {
                            Task {
                                await viewModel.toggleSaved()
                            }
                        }) {
                            Image(systemName: viewModel.isSaved ? "heart.fill" : "heart")
                                .font(.title2)
                                .foregroundColor(viewModel.isSaved ? .red : .gray)
                        }
                    }
                    
                    // Michelin stars
                    if viewModel.destination.michelinStars > 0 {
                        HStack(spacing: 4) {
                            ForEach(0..<viewModel.destination.michelinStars, id: \.self) { _ in
                                Image(systemName: "star.fill")
                                    .foregroundColor(.red)
                            }
                            Text("Michelin")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .background(Color.red.opacity(0.1))
                        .cornerRadius(8)
                    }
                    
                    // Featured badge
                    if viewModel.destination.isFeatured {
                        HStack {
                            Image(systemName: "crown.fill")
                                .foregroundColor(.yellow)
                            Text("Featured")
                                .font(.subheadline)
                                .fontWeight(.medium)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                        .background(Color.yellow.opacity(0.2))
                        .cornerRadius(8)
                    }
                    
                    Divider()
                    
                    // Description
                    if let description = viewModel.destination.description {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("About")
                                .font(.headline)
                            Text(description)
                                .font(.body)
                                .foregroundColor(.secondary)
                        }
                        
                        Divider()
                    }
                    
                    // Contact Info
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Information")
                            .font(.headline)
                        
                        // Address
                        if let address = viewModel.destination.address {
                            Button(action: { viewModel.openInMaps() }) {
                                HStack {
                                    Image(systemName: "mappin.circle.fill")
                                        .foregroundColor(.blue)
                                    Text(address)
                                        .font(.subheadline)
                                    Spacer()
                                    Image(systemName: "arrow.right")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                        
                        // Phone
                        if let phone = viewModel.destination.googlePhone {
                            Button(action: { viewModel.callPhone() }) {
                                HStack {
                                    Image(systemName: "phone.fill")
                                        .foregroundColor(.green)
                                    Text(phone)
                                        .font(.subheadline)
                                    Spacer()
                                    Image(systemName: "arrow.right")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                        
                        // Website
                        if let website = viewModel.destination.googleWebsite {
                            Button(action: { viewModel.openWebsite() }) {
                                HStack {
                                    Image(systemName: "globe")
                                        .foregroundColor(.blue)
                                    Text("Visit Website")
                                        .font(.subheadline)
                                    Spacer()
                                    Image(systemName: "arrow.right")
                                        .font(.caption)
                                        .foregroundColor(.gray)
                                }
                            }
                            .buttonStyle(.plain)
                        }
                        
                        // Google Rating
                        if let rating = viewModel.destination.googleRating {
                            HStack {
                                Image(systemName: "star.fill")
                                    .foregroundColor(.orange)
                                Text(String(format: "%.1f", rating))
                                    .font(.subheadline)
                                Text("Google Rating")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    
                    Divider()
                    
                    // Map
                    if let coordinate = viewModel.destination.coordinate {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Location")
                                .font(.headline)
                            
                            Map(initialPosition: .region(MKCoordinateRegion(
                                center: coordinate,
                                span: MKCoordinateSpan(latitudeDelta: 0.01, longitudeDelta: 0.01)
                            ))) {
                                Marker(viewModel.destination.name, coordinate: coordinate)
                            }
                            .frame(height: 200)
                            .cornerRadius(12)
                        }
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                ShareLink(item: "Check out \(viewModel.destination.name) on Urban Manual!")
            }
        }
    }
}

