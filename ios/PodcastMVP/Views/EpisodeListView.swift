import SwiftUI
import AVFoundation

struct EpisodeListView: View {
    let podcast: Podcast
    @State private var episodes: [Episode] = []
    @State private var player: AVPlayer? = nil
    @State private var nowPlaying: Episode? = nil
    @State private var isLoading = true
    @State private var errorMessage: String? = nil
    @State private var isPlaying = false

    var body: some View {
        ZStack {
            if isLoading {
                ProgressView("Loading episodes...")
            } else if let error = errorMessage {
                VStack(spacing: 16) {
                    Text("Error loading episodes")
                        .font(.headline)
                    Text(error)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)
                        .padding()
                    Button("Retry") {
                        loadEpisodes()
                    }
                }
            } else if episodes.isEmpty {
                Text("No episodes available")
                    .foregroundColor(.secondary)
            } else {
                List(episodes) { ep in
                    EpisodeRow(episode: ep, isPlaying: nowPlaying?.id == ep.id && isPlaying)
                        .contentShape(Rectangle())
                        .onTapGesture {
                            playEpisode(ep)
                        }
                }
            }
        }
        .overlay(alignment: .bottom) {
            if let ep = nowPlaying {
                PlayerBar(episode: ep, player: player, isPlaying: $isPlaying)
            }
        }
        .task {
            loadEpisodes()
        }
    }
    
    private func loadEpisodes() {
        Task {
            isLoading = true
            errorMessage = nil
            do {
                episodes = try await APIService.shared.fetchEpisodes(podcastId: podcast.id)
            } catch {
                errorMessage = error.localizedDescription
                print("Error fetching episodes: \(error)")
            }
            isLoading = false
        }
    }
    
    private func playEpisode(_ episode: Episode) {
        if let urlStr = episode.audio_url, let url = URL(string: urlStr) {
            // If same episode, toggle play/pause
            if nowPlaying?.id == episode.id {
                if isPlaying {
                    player?.pause()
                } else {
                    player?.play()
                }
                isPlaying.toggle()
            } else {
                // New episode - create new player
                player = AVPlayer(url: url)
                player?.play()
                nowPlaying = episode
                isPlaying = true
            }
        }
    }
}

struct EpisodeRow: View {
    let episode: Episode
    let isPlaying: Bool
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text(episode.title ?? "Episode")
                    .font(.headline)
                    .foregroundColor(isPlaying ? .blue : .primary)
                Spacer()
                if isPlaying {
                    Image(systemName: "waveform")
                        .foregroundColor(.blue)
                        .font(.caption)
                }
            }
            HStack {
                if let dateStr = episode.pub_date, let date = parseDate(dateStr) {
                    Text(formatDate(date))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                if let d = episode.duration_seconds, d > 0 {
                    if episode.pub_date != nil {
                        Text(" • ")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    Text(formatDuration(d))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private func parseDate(_ dateString: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: dateString) ?? formatter.date(from: dateString.replacingOccurrences(of: "Z", with: "+00:00"))
    }
    
    private func formatDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .none
        return formatter.string(from: date)
    }
    
    private func formatDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        } else {
            return "\(minutes)m"
        }
    }
}

struct PlayerBar: View {
    let episode: Episode
    let player: AVPlayer?
    @Binding var isPlaying: Bool
    
    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(episode.title ?? "Now Playing")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                Spacer()
            }
            HStack {
                Button(action: {
                    if isPlaying {
                        player?.pause()
                    } else {
                        player?.play()
                    }
                    isPlaying.toggle()
                }) {
                    Image(systemName: isPlaying ? "pause.circle.fill" : "play.circle.fill")
                        .font(.title2)
                        .foregroundColor(.blue)
                }
                Spacer()
                if let duration = episode.duration_seconds, duration > 0 {
                    Text(formatDuration(duration))
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
        .background(.thinMaterial)
        .shadow(radius: 8)
    }
    
    private func formatDuration(_ seconds: Int) -> String {
        let hours = seconds / 3600
        let minutes = (seconds % 3600) / 60
        let secs = seconds % 60
        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, secs)
        } else {
            return String(format: "%d:%02d", minutes, secs)
        }
    }
}

