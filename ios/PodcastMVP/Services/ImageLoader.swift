import SwiftUI

struct RemoteImage: View {
    let url: String?
    var body: some View {
        if let u = url, let imageURL = URL(string: u) {
            AsyncImage(url: imageURL) { phase in
                switch phase {
                case .empty: Color.gray.opacity(0.15)
                case .success(let img): img.resizable().scaledToFill()
                case .failure(_): Color.gray.opacity(0.15)
                @unknown default: Color.gray.opacity(0.15)
                }
            }
        } else {
            Color.gray.opacity(0.15)
        }
    }
}

