import StoreKitTest
import XCTest

final class OnePurchasesUITests: XCTestCase {
  @MainActor
  func testStoreKitConfigurationReachesOne() async throws {
    let session = try SKTestSession(configurationFileNamed: "OnePurchases")
    session.disableDialogs = true
    session.clearTransactions()

    let app = XCUIApplication()
    app.launch()
    guard let url = URL(string: "nativefeatures:///one-native-purchases") else {
      XCTFail("invalid proof route")
      return
    }
    app.open(url)
    XCTAssertTrue(app.staticTexts["Catalog: ready"].waitForExistence(timeout: 30), app.debugDescription)
    try await session.buyProduct(identifier: "dev.vxrn.native.tests.purchases.unlock")
    XCTAssertTrue(app.staticTexts["Updates: 1"].waitForExistence(timeout: 30), app.debugDescription)
    session.clearTransactions()
    app.terminate()
  }
}
