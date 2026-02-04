//
//  NetworkError.swift
//  UrbanManual
//
//  Network error handling
//

import Foundation

enum NetworkError: LocalizedError {
    case invalidURL
    case noData
    case decodingError(Error)
    case serverError(String)
    case unauthorized
    case notFound
    case unknown(Error)
    
    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .noData:
            return "No data received"
        case .decodingError(let error):
            return "Failed to decode data: \(error.localizedDescription)"
        case .serverError(let message):
            return "Server error: \(message)"
        case .unauthorized:
            return "Unauthorized. Please sign in."
        case .notFound:
            return "Resource not found"
        case .unknown(let error):
            return "Unknown error: \(error.localizedDescription)"
        }
    }
}

