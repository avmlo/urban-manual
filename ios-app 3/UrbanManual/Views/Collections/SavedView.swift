//
//  SavedView.swift
//  UrbanManual
//
//  Saved destinations view
//

import SwiftUI

struct SavedView: View {
    @StateObject private var viewModel = SavedViewModel()
    @State private var sortCriteria: SavedViewModel.SortCriteria = .dateAdded
    @State private var showingSortOptions = false
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading saved destinations...")
                } else if viewModel.savedDestinations.isEmpty {
                    emptyState
                } else {
                    savedList
                }
            }
            .navigationTitle("Saved")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingSortOptions = true
                    } label: {
                        Image(systemName: "arrow.up.arrow.down")
                    }
                }
            }
            .confirmationDialog("Sort By", isPresented: $showingSortOptions) {
                Button("Date Added") {
                    sortCriteria = .dateAdded
                    viewModel.sortBy(.dateAdded)
                }
                Button("Name") {
                    sortCriteria = .name
                    viewModel.sortBy(.name)
                }
                Button("City") {
                    sortCriteria = .city
                    viewModel.sortBy(.city)
                }
                Button("Cancel", role: .cancel) {}
            }
            .task {
                await viewModel.fetchSaved()
            }
            .refreshable {
                await viewModel.fetchSaved()
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "heart")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Saved Destinations")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Start saving your favorite places to see them here")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var savedList: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(viewModel.savedDestinations) { saved in
                    if let destination = saved.destination {
                        NavigationLink(destination: DestinationDetailView(destination: destination)) {
                            DestinationCard(destination: destination)
                        }
                        .contextMenu {
                            Button(role: .destructive) {
                                Task {
                                    await viewModel.unsave(saved.destinationId)
                                }
                            } label: {
                                Label("Remove from Saved", systemImage: "heart.slash")
                            }
                        }
                    }
                }
            }
            .padding()
        }
    }
}

