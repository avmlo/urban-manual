//
//  User.swift
//  UrbanManual
//
//  User model
//

import Foundation

struct User: Codable, Identifiable {
    let id: UUID
    let email: String
    let createdAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, email
        case createdAt = "created_at"
    }
}

