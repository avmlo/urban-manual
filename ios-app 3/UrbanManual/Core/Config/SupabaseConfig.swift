//
//  SupabaseConfig.swift
//  UrbanManual
//
//  Supabase configuration and client setup
//

import Foundation
import Supabase

enum SupabaseConfig {
    // TODO: Replace with your Supabase project URL
    static let url = URL(string: ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "YOUR_SUPABASE_URL")!
    
    // TODO: Replace with your Supabase anon key
    static let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "YOUR_SUPABASE_ANON_KEY"
    
    // Singleton Supabase client
    static let client: SupabaseClient = {
        SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey
        )
    }()
}

