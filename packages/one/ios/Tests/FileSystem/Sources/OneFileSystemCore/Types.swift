// stand-ins for generated nitro value types; no filesystem behavior.
class HybridOneFileSystemSpec {}
enum FileEncoding { case utf8, base64 }
struct FileDirectories { let documents: String; let cache: String; let applicationSupport: String; let temporary: String }
struct FileInfo { let uri: String; let exists: Bool; let isDirectory: Bool; let size: Double?; let modifiedAt: Double? }
struct FileEntry { let name: String; let uri: String; let isDirectory: Bool }
