import UIKit

open class ReactNativeLiteViewManager {
    public weak var host: ReactNativeLiteHost?
    public internal(set) var views: [Int: UIView] = [:]
    public internal(set) var childrenMap: [Int: [Int]] = [:]
    public internal(set) var parentMap: [Int: Int] = [:]

    public init(host: ReactNativeLiteHost? = nil) {
        self.host = host
    }

    open func registerRoot(view: UIView, id: Int) {
        precondition(Thread.isMainThread, "registerRoot must be called on the main thread")
        views[id] = view
        if childrenMap[id] == nil {
            childrenMap[id] = []
        }
    }

    open func createView(type: String, id: Int) {
        precondition(Thread.isMainThread, "createView must be called on the main thread")
        let v: UIView
        switch type.lowercased() {
        case "button":
            v = ReactNativeLiteButtonView(nodeId: id, host: host)
        case "textinput":
            v = ReactNativeLiteTextInputView(nodeId: id, host: host)
        case "text":
            v = ReactNativeLiteTextView(nodeId: id)
        default:
            v = ReactNativeLiteContainerView(nodeId: id)
        }
        views[id] = v
        childrenMap[id] = []
    }

    open func setProp(id: Int, key: String, value: Any) {
        precondition(Thread.isMainThread, "setProp must be called on the main thread")
        guard let view = views[id] as? ReactNativeLiteBaseView else { return }
        view.applyProp(key: key, value: value)
    }

    open func appendChild(parentId: Int, childId: Int) {
        precondition(Thread.isMainThread, "appendChild must be called on the main thread")
        guard let parent = views[parentId], let child = views[childId] else { return }
        parent.addSubview(child)
        var list = childrenMap[parentId] ?? []
        list.removeAll { $0 == childId }
        list.append(childId)
        childrenMap[parentId] = list
        parentMap[childId] = parentId
    }

    open func removeChild(parentId: Int, childId: Int) {
        precondition(Thread.isMainThread, "removeChild must be called on the main thread")
        guard let child = views[childId] else { return }
        child.removeFromSuperview()
        if var list = childrenMap[parentId] {
            list.removeAll { $0 == childId }
            childrenMap[parentId] = list
        }
        parentMap.removeValue(forKey: childId)
    }

    open func insertBefore(parentId: Int, childId: Int, beforeId: Int) {
        precondition(Thread.isMainThread, "insertBefore must be called on the main thread")
        guard let parent = views[parentId], let child = views[childId], let before = views[beforeId] else { return }
        parent.insertSubview(child, belowSubview: before)
        var list = childrenMap[parentId] ?? []
        list.removeAll { $0 == childId }
        if let idx = list.firstIndex(of: beforeId) {
            list.insert(childId, at: idx)
        } else {
            list.append(childId)
        }
        childrenMap[parentId] = list
        parentMap[childId] = parentId
    }

    open func destroyView(id: Int) {
        precondition(Thread.isMainThread, "destroyView must be called on the main thread")
        if let view = views[id] {
            view.removeFromSuperview()
            views.removeValue(forKey: id)
        }
        if let pId = parentMap[id], var list = childrenMap[pId] {
            list.removeAll { $0 == id }
            childrenMap[pId] = list
        }
        parentMap.removeValue(forKey: id)
        childrenMap.removeValue(forKey: id)
    }

    open func measureNode(id: Int, maxWidth: CGFloat) -> CGSize {
        guard let view = views[id] else { return .zero }
        let base = view as? ReactNativeLiteBaseView
        let style = base?.styleProps ?? [:]

        var explicitW: CGFloat?
        var explicitH: CGFloat?
        if let w = style["width"] as? NSNumber {
            explicitW = CGFloat(w.doubleValue)
        } else if let wStr = style["width"] as? String, let d = Double(wStr) {
            explicitW = CGFloat(d)
        }
        if let h = style["height"] as? NSNumber {
            explicitH = CGFloat(h.doubleValue)
        } else if let hStr = style["height"] as? String, let d = Double(hStr) {
            explicitH = CGFloat(d)
        }

        if let w = explicitW, let h = explicitH {
            return CGSize(width: w, height: h)
        }

        let children = childrenMap[id] ?? []
        if children.isEmpty {
            let fitConstraint = CGSize(width: explicitW ?? maxWidth, height: CGFloat.greatestFiniteMagnitude)
            let natural = view.sizeThatFits(fitConstraint)
            let finalW = explicitW ?? max(natural.width, (view is UITextField ? 120 : 0))
            let finalH = explicitH ?? max(natural.height, (view is UITextField ? 44 : (view is UIButton ? 44 : 20)))
            return CGSize(width: finalW, height: finalH)
        }

        let isRow = (style["flexDirection"] as? String) == "row"
        let pLeft = CGFloat((style["paddingLeft"] as? NSNumber)?.doubleValue ?? (style["paddingHorizontal"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let pRight = CGFloat((style["paddingRight"] as? NSNumber)?.doubleValue ?? (style["paddingHorizontal"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let pTop = CGFloat((style["paddingTop"] as? NSNumber)?.doubleValue ?? (style["paddingVertical"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let pBottom = CGFloat((style["paddingBottom"] as? NSNumber)?.doubleValue ?? (style["paddingVertical"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let gap = CGFloat((style["gap"] as? NSNumber)?.doubleValue ?? 0)

        var contentW: CGFloat = 0
        var contentH: CGFloat = 0

        for (idx, cId) in children.enumerated() {
            let cSize = measureNode(id: cId, maxWidth: maxWidth)
            let cView = views[cId] as? ReactNativeLiteBaseView
            let cStyle = cView?.styleProps ?? [:]
            let mTop = CGFloat((cStyle["marginTop"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)
            let mBottom = CGFloat((cStyle["marginBottom"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)
            let mLeft = CGFloat((cStyle["marginLeft"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)
            let mRight = CGFloat((cStyle["marginRight"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)

            if isRow {
                contentW += cSize.width + mLeft + mRight + (idx > 0 ? gap : 0)
                contentH = max(contentH, cSize.height + mTop + mBottom)
            } else {
                contentW = max(contentW, cSize.width + mLeft + mRight)
                contentH += cSize.height + mTop + mBottom + (idx > 0 ? gap : 0)
            }
        }

        let finalW = explicitW ?? (contentW + pLeft + pRight)
        let finalH = explicitH ?? (contentH + pTop + pBottom)
        return CGSize(width: finalW, height: finalH)
    }

    open func calculateLayout(rootId: Int, width: CGFloat, height: CGFloat) {
        precondition(Thread.isMainThread, "calculateLayout must be called on the main thread")
        guard let rootView = views[rootId] else { return }
        let targetSize = CGSize(
            width: width > 0 ? width : rootView.bounds.width,
            height: height > 0 ? height : rootView.bounds.height
        )
        layoutNode(id: rootId, bounds: CGRect(origin: .zero, size: targetSize))
    }

    open func layoutNode(id: Int, bounds: CGRect) {
        precondition(Thread.isMainThread, "layoutNode must be called on the main thread")
        guard let view = views[id] else { return }
        view.frame = bounds

        guard let children = childrenMap[id], !children.isEmpty else { return }

        let base = view as? ReactNativeLiteBaseView
        let style = base?.styleProps ?? [:]

        let isRow = (style["flexDirection"] as? String) == "row"
        let paddingLeft = CGFloat((style["paddingLeft"] as? NSNumber)?.doubleValue ?? (style["paddingHorizontal"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let paddingRight = CGFloat((style["paddingRight"] as? NSNumber)?.doubleValue ?? (style["paddingHorizontal"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let paddingTop = CGFloat((style["paddingTop"] as? NSNumber)?.doubleValue ?? (style["paddingVertical"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let paddingBottom = CGFloat((style["paddingBottom"] as? NSNumber)?.doubleValue ?? (style["paddingVertical"] as? NSNumber)?.doubleValue ?? (style["padding"] as? NSNumber)?.doubleValue ?? 0)
        let gap = CGFloat((style["gap"] as? NSNumber)?.doubleValue ?? 0)
        let justifyContent = (style["justifyContent"] as? String) ?? "flex-start"
        let alignItems = (style["alignItems"] as? String) ?? (isRow ? "center" : "stretch")

        let contentWidth = max(0, bounds.width - paddingLeft - paddingRight)
        let contentHeight = max(0, bounds.height - paddingTop - paddingBottom)

        struct MeasuredChild {
            let id: Int
            let flex: CGFloat
            var size: CGSize
            var margins: UIEdgeInsets
        }

        var measuredList: [MeasuredChild] = []
        var totalFixedMain: CGFloat = 0
        var totalFlex: CGFloat = 0

        for cId in children {
            guard let cView = views[cId] else { continue }
            let cBase = cView as? ReactNativeLiteBaseView
            let cStyle = cBase?.styleProps ?? [:]

            let flex = CGFloat((cStyle["flex"] as? NSNumber)?.doubleValue ?? 0)
            let mTop = CGFloat((cStyle["marginTop"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)
            let mBottom = CGFloat((cStyle["marginBottom"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)
            let mLeft = CGFloat((cStyle["marginLeft"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)
            let mRight = CGFloat((cStyle["marginRight"] as? NSNumber)?.doubleValue ?? (cStyle["margin"] as? NSNumber)?.doubleValue ?? 0)
            let margins = UIEdgeInsets(top: mTop, left: mLeft, bottom: mBottom, right: mRight)

            let maxAvailableChildW = max(0, contentWidth - margins.left - margins.right)
            var cSize = measureNode(id: cId, maxWidth: maxAvailableChildW)

            if !isRow && (alignItems == "stretch" || cStyle["width"] == nil) {
                if let wNum = cStyle["width"] as? NSNumber {
                    cSize.width = CGFloat(wNum.doubleValue)
                } else {
                    cSize.width = maxAvailableChildW
                }
            } else if isRow && (alignItems == "stretch" || cStyle["height"] == nil) {
                if let hNum = cStyle["height"] as? NSNumber {
                    cSize.height = CGFloat(hNum.doubleValue)
                } else {
                    cSize.height = max(0, contentHeight - margins.top - margins.bottom)
                }
            }

            if isRow {
                if flex == 0 {
                    totalFixedMain += cSize.width + margins.left + margins.right
                }
            } else {
                if flex == 0 {
                    totalFixedMain += cSize.height + margins.top + margins.bottom
                }
            }
            totalFlex += flex
            measuredList.append(MeasuredChild(id: cId, flex: flex, size: cSize, margins: margins))
        }

        let totalGaps = CGFloat(max(0, measuredList.count - 1)) * gap
        let availableMain = (isRow ? contentWidth : contentHeight) - totalGaps
        let flexRemaining = max(0, availableMain - totalFixedMain)

        // Assign flex sizes
        for i in 0..<measuredList.count {
            if measuredList[i].flex > 0 && totalFlex > 0 {
                let flexShare = (measuredList[i].flex / totalFlex) * flexRemaining
                if isRow {
                    measuredList[i].size.width = max(0, flexShare - measuredList[i].margins.left - measuredList[i].margins.right)
                } else {
                    measuredList[i].size.height = max(0, flexShare - measuredList[i].margins.top - measuredList[i].margins.bottom)
                }
            }
        }

        // Layout positioning
        var mainOffset: CGFloat = isRow ? paddingLeft : paddingTop
        var effectiveGap = gap

        if totalFlex == 0 {
            let usedMain = totalFixedMain + totalGaps
            let extra = max(0, (isRow ? contentWidth : contentHeight) - usedMain)
            switch justifyContent {
            case "center":
                mainOffset += extra / 2.0
            case "flex-end":
                mainOffset += extra
            case "space-between":
                if measuredList.count > 1 {
                    effectiveGap = gap + (extra / CGFloat(measuredList.count - 1))
                }
            case "space-around":
                if !measuredList.isEmpty {
                    let share = extra / CGFloat(measuredList.count)
                    mainOffset += share / 2.0
                    effectiveGap = gap + share
                }
            default:
                break
            }
        }

        for item in measuredList {
            var childX: CGFloat
            var childY: CGFloat
            var childW = item.size.width
            var childH = item.size.height

            if isRow {
                childX = mainOffset + item.margins.left
                mainOffset += childW + item.margins.left + item.margins.right + effectiveGap

                switch alignItems {
                case "center":
                    childY = paddingTop + item.margins.top + max(0, (contentHeight - childH - item.margins.top - item.margins.bottom) / 2.0)
                case "flex-end":
                    childY = paddingTop + contentHeight - childH - item.margins.bottom
                case "stretch":
                    childY = paddingTop + item.margins.top
                    childH = max(0, contentHeight - item.margins.top - item.margins.bottom)
                default:
                    childY = paddingTop + item.margins.top
                }
            } else {
                childY = mainOffset + item.margins.top
                mainOffset += childH + item.margins.top + item.margins.bottom + effectiveGap

                switch alignItems {
                case "center":
                    childX = paddingLeft + item.margins.left + max(0, (contentWidth - childW - item.margins.left - item.margins.right) / 2.0)
                case "flex-end":
                    childX = paddingLeft + contentWidth - childW - item.margins.right
                case "stretch":
                    childX = paddingLeft + item.margins.left
                    childW = max(0, contentWidth - item.margins.left - item.margins.right)
                default:
                    childX = paddingLeft + item.margins.left
                }
            }

            let childBounds = CGRect(x: childX, y: childY, width: childW, height: childH)
            layoutNode(id: item.id, bounds: childBounds)
        }
    }

    open func teardown() {
        precondition(Thread.isMainThread, "teardown must be called on the main thread")
        for (_, view) in views {
            view.removeFromSuperview()
        }
        views.removeAll()
        childrenMap.removeAll()
        parentMap.removeAll()
    }
}
