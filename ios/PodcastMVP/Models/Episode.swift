import Foundation

struct Episode: Identifiable, Decodable {
    let id: String
    let podcast_id: String
    let title: String?
    let description: String?
    let audio_url: String?
    let pub_date: String?
    let duration_seconds: Int?
}

