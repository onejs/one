import Foundation
import NitroModules
import StoreKit
import UIKit

final class HybridOnePurchases: HybridOnePurchasesSpec {
  private var listeners: [UUID: (PurchaseUpdate) -> Void] = [:]
  private var updatesTask: Task<Void, Never>?

  deinit { updatesTask?.cancel() }

  func getProducts(productIds: [String]) throws -> Promise<[PurchaseProduct]> {
    let promise = Promise<[PurchaseProduct]>()
    guard !productIds.isEmpty, productIds.count <= 100,
      productIds.allSatisfy({ !$0.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }),
      Set(productIds).count == productIds.count else {
      promise.reject(withError: Self.error("E_PURCHASE_INPUT", "Purchases.getProducts: expected 1 to 100 distinct product ids"))
      return promise
    }
    Task { @MainActor in
      do {
        let products = try await Product.products(for: productIds)
        let byId = Dictionary(uniqueKeysWithValues: products.map { ($0.id, $0) })
        promise.resolve(withResult: productIds.compactMap { byId[$0].map(Self.product) })
      } catch {
        promise.reject(withError: Self.error("E_PURCHASE_PRODUCTS", "Purchases.getProducts: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func purchase(productId: String, appAccountToken: String?) throws -> Promise<PurchaseResult> {
    let promise = Promise<PurchaseResult>()
    guard !productId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      promise.reject(withError: Self.error("E_PURCHASE_INPUT", "Purchases.purchase: product id is required"))
      return promise
    }
    let token: UUID?
    if let appAccountToken {
      guard let parsed = UUID(uuidString: appAccountToken) else {
        promise.reject(withError: Self.error("E_PURCHASE_INPUT", "Purchases.purchase: appAccountToken must be a UUID"))
        return promise
      }
      token = parsed
    } else {
      token = nil
    }
    Task { @MainActor in
      guard UIApplication.shared.applicationState == .active else {
        promise.reject(withError: Self.error("E_PURCHASE_INACTIVE", "Purchases.purchase: app must be active"))
        return
      }
      do {
        guard let product = try await Product.products(for: [productId]).first else {
          promise.reject(withError: Self.error("E_PURCHASE_PRODUCT", "Purchases.purchase: product not found"))
          return
        }
        let options: Set<Product.PurchaseOption> = token.map { [.appAccountToken($0)] } ?? []
        let result = try await product.purchase(options: options)
        switch result {
        case .success(let verification):
          switch verification {
          case .verified(let transaction):
            promise.resolve(withResult: PurchaseResult(status: .purchased,
              transaction: Self.transaction(transaction, jws: verification.jwsRepresentation)))
          case .unverified(_, let error):
            promise.reject(withError: Self.error("E_PURCHASE_UNVERIFIED", "Purchases.purchase: \(error.localizedDescription)"))
          }
        case .userCancelled:
          promise.resolve(withResult: PurchaseResult(status: .cancelled, transaction: nil))
        case .pending:
          promise.resolve(withResult: PurchaseResult(status: .pending, transaction: nil))
        @unknown default:
          promise.reject(withError: Self.error("E_PURCHASE_RESULT", "Purchases.purchase: unknown StoreKit result"))
        }
      } catch {
        promise.reject(withError: Self.error("E_PURCHASE_FAILED", "Purchases.purchase: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  func getCurrentEntitlements() throws -> Promise<[PurchaseTransaction]> {
    let promise = Promise<[PurchaseTransaction]>()
    Task { @MainActor in
      var transactions: [PurchaseTransaction] = []
      for await verification in StoreKit.Transaction.currentEntitlements {
        switch verification {
        case .verified(let transaction):
          transactions.append(Self.transaction(transaction, jws: verification.jwsRepresentation))
        case .unverified(_, let error):
          promise.reject(withError: Self.error("E_PURCHASE_UNVERIFIED", "Purchases.getCurrentEntitlements: \(error.localizedDescription)"))
          return
        }
      }
      promise.resolve(withResult: transactions)
    }
    return promise
  }

  func getUnfinishedTransactions() throws -> Promise<[PurchaseTransaction]> {
    let promise = Promise<[PurchaseTransaction]>()
    Task { @MainActor in
      var transactions: [PurchaseTransaction] = []
      for await verification in StoreKit.Transaction.unfinished {
        switch verification {
        case .verified(let transaction):
          transactions.append(Self.transaction(transaction, jws: verification.jwsRepresentation))
        case .unverified(_, let error):
          promise.reject(withError: Self.error("E_PURCHASE_UNVERIFIED", "Purchases.getUnfinishedTransactions: \(error.localizedDescription)"))
          return
        }
      }
      promise.resolve(withResult: transactions)
    }
    return promise
  }

  func finishTransaction(transactionId: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    guard let id = UInt64(transactionId) else {
      promise.reject(withError: Self.error("E_PURCHASE_INPUT", "Purchases.finishTransaction: transaction id must be a uint64 string"))
      return promise
    }
    Task { @MainActor in
      for await verification in StoreKit.Transaction.unfinished {
        switch verification {
        case .verified(let transaction) where transaction.id == id:
          await transaction.finish()
          promise.resolve(withResult: ())
          return
        case .unverified(let transaction, _) where transaction.id == id:
          promise.reject(withError: Self.error("E_PURCHASE_UNVERIFIED", "Purchases.finishTransaction: transaction could not be verified"))
          return
        default:
          continue
        }
      }
      promise.reject(withError: Self.error("E_PURCHASE_NOT_UNFINISHED", "Purchases.finishTransaction: no unfinished transaction with that id"))
    }
    return promise
  }

  func addTransactionListener(onUpdate: @escaping (PurchaseUpdate) -> Void) throws -> () -> Void {
    let id = UUID()
    DispatchQueue.main.async {
      self.listeners[id] = onUpdate
      if self.updatesTask == nil {
        self.updatesTask = Task { @MainActor [weak self] in
          for await verification in StoreKit.Transaction.updates {
            guard let self, !Task.isCancelled else { break }
            let update: PurchaseUpdate
            switch verification {
            case .verified(let transaction):
              update = PurchaseUpdate(status: .verified,
                transaction: Self.transaction(transaction, jws: verification.jwsRepresentation), error: nil)
            case .unverified(_, let error):
              update = PurchaseUpdate(status: .unverified, transaction: nil, error: error.localizedDescription)
            }
            for listener in self.listeners.values { listener(update) }
          }
        }
      }
    }
    return { [weak self] in
      DispatchQueue.main.async {
        guard let self else { return }
        self.listeners.removeValue(forKey: id)
        if self.listeners.isEmpty {
          self.updatesTask?.cancel()
          self.updatesTask = nil
        }
      }
    }
  }

  func sync() throws -> Promise<Void> {
    let promise = Promise<Void>()
    Task { @MainActor in
      do {
        try await AppStore.sync()
        promise.resolve(withResult: ())
      } catch {
        promise.reject(withError: Self.error("E_PURCHASE_SYNC", "Purchases.sync: \(error.localizedDescription)"))
      }
    }
    return promise
  }

  private static func product(_ product: Product) -> PurchaseProduct {
    PurchaseProduct(id: product.id, type: productType(product.type),
      displayName: product.displayName, description: product.description,
      displayPrice: product.displayPrice, currencyCode: product.priceFormatStyle.currencyCode)
  }

  private static func transaction(_ transaction: StoreKit.Transaction, jws: String) -> PurchaseTransaction {
    PurchaseTransaction(id: String(transaction.id), originalId: String(transaction.originalID),
      productId: transaction.productID, productType: productType(transaction.productType),
      purchaseDateMs: transaction.purchaseDate.timeIntervalSince1970 * 1000,
      expirationDateMs: transaction.expirationDate.map { $0.timeIntervalSince1970 * 1000 },
      revocationDateMs: transaction.revocationDate.map { $0.timeIntervalSince1970 * 1000 },
      jws: jws)
  }

  private static func productType(_ type: Product.ProductType) -> PurchaseProductType {
    switch type {
    case .consumable: return .consumable
    case .nonConsumable: return .nonconsumable
    case .nonRenewable: return .nonrenewable
    case .autoRenewable: return .autorenewable
    default: return .other
    }
  }

  private static func error(_ code: String, _ message: String) -> RuntimeError {
    oneNativeError(code, message)
  }
}
