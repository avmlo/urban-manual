//
//  DestinationCard.swift
//  UrbanManual
//
//  Destination card component
//

import SwiftUI
import Kingfisher

struct DestinationCard: View {
    let destination: Destination
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Image
            if let imageUrl = destination.imageUrl, let url = URL(string: imageUrl) {
                KFImage(url)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 200)
                    .clipped()
                    .cornerRadius(12)
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 200)
                    .cornerRadius(12)
                    .overlay(
                        Image(systemName: "photo")
                            .font(.largeTitle)
                            .foregroundColor(.gray)
                    )
            }
            
            // Content
            VStack(alignment: .leading, spacing: 6) {
                // Category & Michelin stars
                HStack {
                    Text(destination.categoryEmoji)
                    Text(destination.category)
                        .font(.caption)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    if destination.michelinStars > 0 {
                        HStack(spacing: 2) {
                            ForEach(0..<destination.michelinStars, id: \.self) { _ in
                                Image(systemName: "star.fill")
                                    .font(.caption2)
                                    .foregroundColor(.red)
                            }
                        }
                    }
                    
                    if destination.isFeatured {
                        Image(systemName: "crown.fill")
                            .font(.caption)
                            .foregroundColor(.yellow)
                    }
                }
                
                // Name
                Text(destination.name)
                    .font(.headline)
                    .lineLimit(2)
                
                // City
                HStack {
                    Image(systemName: "mappin.circle.fill")
                        .font(.caption)
                        .foregroundColor(.blue)
                    Text(destination.city)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                // Google rating
                if let rating = destination.googleRating {
                    HStack(spacing: 4) {
                        Image(systemName: "star.fill")
                            .font(.caption)
                            .foregroundColor(.orange)
                        Text(String(format: "%.1f", rating))
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                }
            }
            .padding(.horizontal, 4)
        }
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: .black.opacity(0.1), radius: 8, x: 0, y: 4)
    }
}

