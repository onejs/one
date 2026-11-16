extension KeyboardMovementObserver {
  func initializeAnimation(fromValue: Double, toValue: Double) {
    for key in ["position", "opacity"] {
      if let keyboardAnimation = keyboardTrackingView.view?.layer.presentation()?.animation(forKey: key) {
        if let springAnimation = keyboardAnimation as? CASpringAnimation {
          animation = SpringAnimation(animation: springAnimation, fromValue: fromValue, toValue: toValue)
        } else if let basicAnimation = keyboardAnimation as? CABasicAnimation {
          animation = TimingAnimation(animation: basicAnimation, fromValue: fromValue, toValue: toValue)
        }
        return
      }
    }
  }
}
