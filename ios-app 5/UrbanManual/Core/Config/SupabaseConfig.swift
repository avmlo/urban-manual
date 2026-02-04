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
    static let url = URL(string: ProcessInfo.processInfo.environment["SUPABASE_URL"] ?? "https://avdnefdfwvpjkuanhdwk.supabase.co")!
    
    // TODO: Replace with your Supabase anon key
    static let anonKey = ProcessInfo.processInfo.environment["SUPABASE_ANON_KEY"] ?? "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZG5lZmRmd3Zwamt1YW5oZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM3MTg4MzMsImV4cCI6MjA2OTI5NDgzM30.imGFTDynzDG5bK0w_j5pgwMPBeT9rkXm8ZQ18W6A-nw"
    
    // Singleton Supabase client
    static let client: SupabaseClient = {
        SupabaseClient(
            supabaseURL: url,
            supabaseKey: anonKey
        )
    }()
}

