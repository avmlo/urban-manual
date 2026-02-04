//
//  UrbanManualApp.swift
//  UrbanManual
//
//  App entry point
//

import SwiftUI

@main
struct UrbanManualApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    
    var body: some Scene {
        WindowGroup {
            if authViewModel.isAuthenticated {
                MainTabView()
                    .environmentObject(authViewModel)
            } else {
                LoginView()
                    .environmentObject(authViewModel)
            }
        }
    }
}

