//
//  UrbanManualApp_MINIMAL.swift
//  UrbanManual
//
//  MINIMAL VERSION - Use this if the full app doesn't build
//  Rename to UrbanManualApp.swift to use
//

import SwiftUI

@main
struct UrbanManualApp: App {
    var body: some Scene {
        WindowGroup {
            NavigationStack {
                VStack(spacing: 20) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 60))
                        .foregroundColor(.blue)
                    
                    Text("Urban Manual")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    
                    Text("iOS App")
                        .font(.title2)
                        .foregroundColor(.secondary)
                    
                    Text("Ready to build!")
                        .font(.subheadline)
                        .foregroundColor(.green)
                }
                .padding()
                .navigationTitle("Welcome")
            }
        }
    }
}

