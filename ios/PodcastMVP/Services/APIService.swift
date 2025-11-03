import Foundation

final class APIService {
    static let shared = APIService()

    private let baseURL = URL(string: "https://YOUR-PROJECT.supabase.co/rest/v1/")!
    private let anonKey = "YOUR_SUPABASE_ANON_KEY" // read-only

    private func request(path: String, query: String = "") -> URLRequest {
        var url = baseURL.appendingPathComponent(path)
        if !query.isEmpty { url = URL(string: url.absoluteString + "?" + query)! }
        var req = URLRequest(url: url)
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        req.setValue("Bearer \(anonKey)", forHTTPHeaderField: "Authorization")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        return req
    }

    func fetchPodcasts() async throws -> [Podcast] {
        let req = request(path: "podcasts", query: "select=id,feed_url,title,author,image_url&order=title.asc")
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode([Podcast].self, from: data)
    }

    func fetchEpisodes(podcastId: String) async throws -> [Episode] {
        let q = "select=id,podcast_id,title,description,audio_url,pub_date,duration_seconds&podcast_id=eq.\(podcastId)&order=pub_date.desc"
        let req = request(path: "episodes", query: q)
        let (data, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode([Episode].self, from: data)
    }
}

