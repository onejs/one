import StoreKitTest
import XCTest

@MainActor
final class OneDerivedStoreViewsUITests: XCTestCase {
  private func withCatalog(_ body: (XCUIApplication) -> Void) throws {
    let session = try SKTestSession(configurationFileNamed: "OnePurchases")
    session.disableDialogs = true
    let app = XCUIApplication()
    app.launch()
    defer { app.terminate() }
    guard app.descendants(matching: .any)["home-screen"].waitForExistence(timeout: 30) else {
      XCTFail(app.debugDescription)
      return
    }
    app.open(URL(string: "nativefeatures:///one-native-derived-behavior")!)
    XCTAssertTrue(app.descendants(matching: .any)["derived-behavior-screen"].waitForExistence(timeout: 30), app.debugDescription)
    body(app)
    withExtendedLifetime(session) {}
  }

  private func catalogText(_ app: XCUIApplication, _ text: String) -> XCUIElement {
    app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", text)).firstMatch
  }

  private func subscriptionOption(_ app: XCUIApplication, _ title: String) -> XCUIElement {
    app.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", title)).firstMatch
  }

  func testProductViewLoadsCatalogAndRejectsMissingProduct() throws {
    try withCatalog { app in
      app.descendants(matching: .any)["derived-example-product"].tap()
      XCTAssertTrue(app.descendants(matching: .any)["derived-product"].waitForExistence(timeout: 30), app.debugDescription)
      let title = catalogText(app, "Native Proof Unlock")
      XCTAssertTrue(title.waitForExistence(timeout: 30), app.debugDescription)
      app.descendants(matching: .any)["derived-store-missing"].tap()
      XCTAssertTrue(title.waitForNonExistence(timeout: 30), app.debugDescription)
      XCTAssertTrue(app.descendants(matching: .any)["derived-product"].exists, app.debugDescription)
    }
  }

  func testStoreViewLoadsCatalogAndRejectsMissingProduct() throws {
    try withCatalog { app in
      app.descendants(matching: .any)["derived-example-store"].tap()
      XCTAssertTrue(app.descendants(matching: .any)["derived-store"].waitForExistence(timeout: 30), app.debugDescription)
      let title = catalogText(app, "Native Proof Unlock")
      XCTAssertTrue(title.waitForExistence(timeout: 30), app.debugDescription)
      app.descendants(matching: .any)["derived-store-missing"].tap()
      XCTAssertTrue(title.waitForNonExistence(timeout: 30), app.debugDescription)
      XCTAssertTrue(app.descendants(matching: .any)["derived-store"].exists, app.debugDescription)
    }
  }

  func testSubscriptionStoreViewLoadsBothConstructorsAndRejectsMissingGroup() throws {
    try withCatalog { app in
      app.descendants(matching: .any)["derived-example-subscriptions"].tap()
      XCTAssertTrue(app.staticTexts["Constructor: productIDs"].waitForExistence(timeout: 30), app.debugDescription)
      let title = subscriptionOption(app, "Native Derived Monthly")
      XCTAssertTrue(title.waitForExistence(timeout: 30), app.debugDescription)
      let yearly = subscriptionOption(app, "Native Derived Yearly")
      XCTAssertFalse(yearly.exists, app.debugDescription)
      app.descendants(matching: .any)["derived-subscriptions-group"].tap()
      XCTAssertTrue(app.staticTexts["Constructor: groupID"].waitForExistence(timeout: 30), app.debugDescription)
      XCTAssertTrue(yearly.waitForExistence(timeout: 30), app.debugDescription)
      XCTAssertTrue(title.waitForExistence(timeout: 30), app.debugDescription)
      app.descendants(matching: .any)["derived-store-missing"].tap()
      XCTAssertTrue(title.waitForNonExistence(timeout: 30), app.debugDescription)
      XCTAssertTrue(yearly.waitForNonExistence(timeout: 30), app.debugDescription)
      XCTAssertTrue(app.descendants(matching: .any)["derived-subscriptions"].exists, app.debugDescription)
    }
  }
}
