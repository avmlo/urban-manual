//
//  MainTabView.swift
//  UrbanManual
//
//  Main tab navigation view
//

import SwiftUI

struct MainTabView: View {
    var body: some View {
        TabView {
            DestinationsListView()
                .tabItem {
                    Label("Discover", systemImage: "compass")
                }
            
            MapView()
                .tabItem {
                    Label("Map", systemImage: "map")
                }
            
            SavedView()
                .tabItem {
                    Label("Saved", systemImage: "heart")
                }
            
            ListsView()
                .tabItem {
                    Label("Lists", systemImage: "list.bullet")
                }
            
            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person")
                }
        }
    }
}

