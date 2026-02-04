//
//  ListItem.swift
//  UrbanManual
//
//  List item model
//

import Foundation

struct ListItem: Codable, Identifiable {
    let id: UUID
    let listId: UUID
    let destinationId: UUID
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id
        case listId = "list_id"
        case destinationId = "destination_id"
        case createdAt = "created_at"
    }
}

