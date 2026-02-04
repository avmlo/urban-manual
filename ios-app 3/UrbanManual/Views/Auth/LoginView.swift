//
//  LoginView.swift
//  UrbanManual
//
//  Login and sign up view
//

import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var email = ""
    @State private var password = ""
    @State private var isSignUp = false
    
    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Logo
                Image(systemName: "map.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.blue)
                    .padding(.bottom, 20)
                
                Text("Urban Manual")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                Text("Discover exceptional places")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                    .padding(.bottom, 40)
                
                // Email field
                TextField("Email", text: $email)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(.emailAddress)
                    .autocapitalization(.none)
                    .keyboardType(.emailAddress)
                
                // Password field
                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)
                    .textContentType(isSignUp ? .newPassword : .password)
                
                // Error message
                if let error = authViewModel.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }
                
                // Sign in/up button
                Button(action: {
                    Task {
                        if isSignUp {
                            await authViewModel.signUp(email: email, password: password)
                        } else {
                            await authViewModel.signIn(email: email, password: password)
                        }
                    }
                }) {
                    if authViewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(.circular)
                            .tint(.white)
                    } else {
                        Text(isSignUp ? "Sign Up" : "Sign In")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(authViewModel.isLoading || email.isEmpty || password.isEmpty)
                
                // Toggle sign up/in
                Button(action: {
                    isSignUp.toggle()
                    authViewModel.errorMessage = nil
                }) {
                    Text(isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up")
                        .font(.subheadline)
                        .foregroundColor(.blue)
                }
                
                Spacer()
            }
            .padding()
            .navigationTitle(isSignUp ? "Sign Up" : "Sign In")
            .navigationBarTitleDisplayMode(.inline)
        }
    }
}

