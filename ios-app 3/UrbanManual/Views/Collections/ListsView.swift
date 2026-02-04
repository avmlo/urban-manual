//
//  ListsView.swift
//  UrbanManual
//
//  User lists view
//

import SwiftUI

struct ListsView: View {
    @StateObject private var viewModel = ListsViewModel()
    @State private var showingCreateList = false
    @State private var newListName = ""
    @State private var newListDescription = ""
    
    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading {
                    ProgressView("Loading your lists...")
                } else if viewModel.lists.isEmpty {
                    emptyState
                } else {
                    listGrid
                }
            }
            .navigationTitle("Lists")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        showingCreateList = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateList) {
                createListSheet
            }
            .task {
                await viewModel.fetchLists()
            }
            .refreshable {
                await viewModel.fetchLists()
            }
        }
    }
    
    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "list.bullet.rectangle")
                .font(.system(size: 60))
                .foregroundColor(.gray)
            
            Text("No Lists Yet")
                .font(.title2)
                .fontWeight(.semibold)
            
            Text("Create lists to organize your favorite destinations")
                .font(.body)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 40)
            
            Button {
                showingCreateList = true
            } label: {
                Label("Create List", systemImage: "plus.circle.fill")
                    .font(.headline)
                    .padding()
                    .background(Color.accentColor)
                    .foregroundColor(.white)
                    .cornerRadius(10)
            }
            .padding(.top, 8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
    
    private var listGrid: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: 16) {
                ForEach(viewModel.lists) { list in
                    NavigationLink(destination: ListDetailView(list: list)) {
                        ListCard(list: list)
                    }
                    .contextMenu {
                        Button(role: .destructive) {
                            Task {
                                await viewModel.deleteList(list)
                            }
                        } label: {
                            Label("Delete List", systemImage: "trash")
                        }
                    }
                }
            }
            .padding()
        }
    }
    
    private var createListSheet: some View {
        NavigationStack {
            Form {
                Section(header: Text("List Details")) {
                    TextField("Name", text: $newListName)
                    TextField("Description (optional)", text: $newListDescription)
                }
            }
            .navigationTitle("New List")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        showingCreateList = false
                        newListName = ""
                        newListDescription = ""
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Create") {
                        Task {
                            await viewModel.createList(
                                name: newListName,
                                description: newListDescription.isEmpty ? nil : newListDescription
                            )
                            showingCreateList = false
                            newListName = ""
                            newListDescription = ""
                        }
                    }
                    .disabled(newListName.isEmpty)
                }
            }
        }
    }
}

// List Card Component
struct ListCard: View {
    let list: List
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(list.name)
                .font(.headline)
                .foregroundColor(.primary)
                .lineLimit(2)
            
            if let description = list.description {
                Text(description)
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
            }
            
            HStack {
                Image(systemName: "mappin.and.ellipse")
                    .font(.caption2)
                Text("\(list.items?.count ?? 0) places")
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

// List Detail View (placeholder for now)
struct ListDetailView: View {
    let list: List
    @StateObject private var viewModel = ListsViewModel()
    @State private var listItems: [ListItem] = []
    
    var body: some View {
        ScrollView {
            if listItems.isEmpty {
                VStack(spacing: 16) {
                    Image(systemName: "tray")
                        .font(.system(size: 50))
                        .foregroundColor(.gray)
                    Text("No destinations in this list")
                        .foregroundColor(.secondary)
                }
                .frame(maxHeight: .infinity)
                .padding(.top, 100)
            } else {
                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: 16) {
                    ForEach(listItems) { item in
                        if let destination = item.destination {
                            NavigationLink(destination: DestinationDetailView(destination: destination)) {
                                DestinationCard(destination: destination)
                            }
                        }
                    }
                }
                .padding()
            }
        }
        .navigationTitle(list.name)
        .task {
            listItems = await viewModel.getListItems(for: list.id)
        }
    }
}

