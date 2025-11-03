import SwiftUI

struct PodcastDetailView: View {
    let podcast: Podcast
    var body: some View {
        EpisodeListView(podcast: podcast)
            .navigationTitle(podcast.title ?? "Podcast")
            .navigationBarTitleDisplayMode(.inline)
    }
}

