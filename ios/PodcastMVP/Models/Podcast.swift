import Foundation

struct Podcast: Identifiable, Decodable {
    let id: String
    let feed_url: String
    let title: String?
    let author: String?
    let image_url: String?
}

