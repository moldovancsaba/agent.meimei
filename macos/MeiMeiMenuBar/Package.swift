// swift-tools-version: 5.9
import PackageDescription

let package = Package(
  name: "MeiMeiMenuBar",
  platforms: [.macOS(.v13)],
  products: [
    .executable(name: "MeiMeiMenuBar", targets: ["MeiMeiMenuBar"])
  ],
  targets: [
    .executableTarget(
      name: "MeiMeiMenuBar",
      path: "Sources"
    )
  ]
)
