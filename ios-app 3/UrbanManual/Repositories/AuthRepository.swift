//
//  AuthRepository.swift
//  UrbanManual
//
//  Repository for authentication operations
//

import Foundation
import Supabase

class AuthRepository {
    private let client = SupabaseConfig.client
    
    // Sign up
    func signUp(email: String, password: String) async throws {
        try await client.auth.signUp(
            email: email,
            password: password
        )
    }
    
    // Sign in
    func signIn(email: String, password: String) async throws {
        try await client.auth.signIn(
            email: email,
            password: password
        )
    }
    
    // Sign out
    func signOut() async throws {
        try await client.auth.signOut()
    }
    
    // Get current user
    func getCurrentUser() async throws -> User? {
        do {
            let authUser = try await client.auth.user
            
            guard let userId = UUID(uuidString: authUser.id.uuidString) else {
                return nil
            }
            
            return User(
                id: userId,
                email: authUser.email ?? "",
                createdAt: Date()
            )
        } catch {
            return nil
        }
    }
    
    // Listen to auth state changes (simplified)
    func authStateChanges() -> AsyncStream<String> {
        AsyncStream { continuation in
            Task {
                // Simplified implementation - check auth status periodically
                // In a real app, you'd use proper auth state change notifications
                continuation.yield("initial")
                continuation.finish()
            }
        }
    }
}
