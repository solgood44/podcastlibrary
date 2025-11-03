import SwiftUI

struct LibraryGridView: View {
    @State private var podcasts: [Podcast] = []
    @State private var isLoading = true
    @State private var errorMessage: String? = nil

    private let columns = [GridItem(.adaptive(minimum: 110), spacing: 12)]

    var body: some View {
        NavigationStack {
            ZStack {
                if isLoading {
                    ProgressView("Loading podcasts...")
                } else if let error = errorMessage {
                    VStack(spacing: 16) {
                        Text("Error loading podcasts")
                            .font(.headline)
                        Text(error)
                            .font(.caption)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding()
                        Button("Retry") {
                            loadPodcasts()
                        }
                    }
                } else if podcasts.isEmpty {
                    Text("No podcasts available")
                        .foregroundColor(.secondary)
                } else {
                    ScrollView {
                        LazyVGrid(columns: columns, spacing: 12) {
                            ForEach(podcasts) { p in
                                NavigationLink(value: p) {
                                    RemoteImage(url: p.image_url)
                                        .frame(width: 110, height: 110)
                                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                        .overlay(alignment: .bottomLeading) {
                                            LinearGradient(colors: [.clear, .black.opacity(0.6)], startPoint: .center, endPoint: .bottom)
                                                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                                            Text(p.title ?? "")
                                                .font(.caption2)
                                                .foregroundColor(.white)
                                                .padding(6)
                                        }
                                }
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .navigationDestination(for: Podcast.self) { p in
                PodcastDetailView(podcast: p)
            }
            .navigationTitle("Library")
            .refreshable {
                await loadPodcastsAsync()
            }
            .task {
                await loadPodcastsAsync()
            }
        }
    }
    
    private func loadPodcasts() {
        Task {
            await loadPodcastsAsync()
        }
    }
    
    private func loadPodcastsAsync() async {
        isLoading = true
        errorMessage = nil
        do {
            podcasts = try await APIService.shared.fetchPodcasts()
        } catch {
            errorMessage = error.localizedDescription
            print("Error fetching podcasts: \(error)")
        }
        isLoading = false
    }
}

