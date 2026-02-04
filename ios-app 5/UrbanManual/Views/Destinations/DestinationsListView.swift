//
//  DestinationsListView.swift
//  UrbanManual
//
//  Main destinations list view
//

import SwiftUI

struct DestinationsListView: View {
    @StateObject private var viewModel = DestinationsViewModel()
    @State private var showFilters = false
    
    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 16) {
                    ForEach(viewModel.filteredDestinations) { destination in
                        NavigationLink(destination: DestinationDetailView(destination: destination)) {
                            DestinationCard(destination: destination)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding()
            }
            .navigationTitle("Discover")
            .searchable(text: $viewModel.searchQuery, prompt: "Search destinations")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showFilters.toggle() }) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                    }
                }
            }
            .overlay {
                if viewModel.isLoading {
                    ProgressView()
                }
            }
            .task {
                await viewModel.fetchDestinations()
            }
            .refreshable {
                await viewModel.fetchDestinations()
            }
        }
    }
}

