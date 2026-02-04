//
//  ProfileView.swift
//  UrbanManual
//
//  User profile view
//

import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 20) {
                if let user = authViewModel.currentUser {
                    Text(user.email)
                        .font(.title2)
                    
                    Button("Sign Out") {
                        Task {
                            await authViewModel.signOut()
                        }
                    }
                    .buttonStyle(.borderedProminent)
                }
            }
            .navigationTitle("Profile")
        }
    }
}

