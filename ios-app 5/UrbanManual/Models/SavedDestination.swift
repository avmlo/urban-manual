//
//  SavedDestination.swift
//  UrbanManual
//
//  Saved destination model
//

import Foundation

struct SavedDestination: Codable, Identifiable {
    let id: UUID
    let userId: UUID
    let destinationId: UUID
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case destinationId = "destination_id"
        case createdAt = "created_at"
    }
}

