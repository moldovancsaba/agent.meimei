// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "MeiMei",
  platforms: [.macOS(.v13)],
  products: [
    .executable(name: "MeiMei", targets: ["MeiMei"])
  ],
  targets: [
    .executableTarget(
      name: "MeiMei",
      path: "Sources"
    )
  ]
)
