import type { StyleField } from './catalog'
import type { DerivedModifier, DerivedViewSlot, EventValueSchema } from './deriveSDK'
import { eventValueType } from './emitControls'
import { sdkGuard } from './sdkGuard'

const eventValueSwift = (value: EventValueSchema, expression: string): string => {
  if (value.kind === 'number') return `Double(${expression})`
  if (value.kind === 'description') return `String(describing: ${expression})`
  if (value.kind === 'string' || value.kind === 'boolean') return expression
  if (value.kind === 'point')
    return `(["x": Double(${expression}.x), "y": Double(${expression}.y)] as [String: Any])`
  if (value.kind === 'size')
    return `(["width": Double(${expression}.width), "height": Double(${expression}.height)] as [String: Any])`
  if (value.kind === 'enum')
    return `({ () -> String in switch ${expression} { ${value.cases.map((item) => `case .${item}: return ${JSON.stringify(item)}`).join(' ')}${value.open ? ' @unknown default: return "unknown"' : ''} } })()`
  if (value.kind === 'optional')
    return `(${expression}.map { inner -> Any in ${eventValueSwift(value.value, 'inner')} } ?? NSNull())`
  if (value.kind === 'array')
    return `${expression}.map { item -> Any in ${eventValueSwift(value.value, 'item')} }`
  if (value.kind === 'verification')
    return `({ () -> [String: Any] in
      switch ${expression} {
      case .verified: return ["case": "verified", "jwsRepresentation": ${expression}.jwsRepresentation, "error": NSNull()]
      case .unverified(_, let error): return ["case": "unverified", "jwsRepresentation": ${expression}.jwsRepresentation, "error": String(describing: error)]
      }
    })()`
  if (value.kind === 'result')
    return `({ () -> [String: Any] in
      switch ${expression} {
      case .success(let item): return ["case": "success", "value": ${eventValueSwift(value.value, 'item')}]
      case .failure(let error): return ["case": "failure", "error": String(describing: error)]
      }
    })()`
  if (value.kind === 'associatedEnum')
    return `({ () -> [String: Any] in
      switch ${expression} {
${value.cases.map((item) => `      case .${item.name}${item.values.length ? `(${item.values.map((_, index) => `let value${index}`).join(', ')})` : ''}: return ["case": ${JSON.stringify(item.name)}, "values": [${item.values.map((nested, index) => eventValueSwift(nested, `value${index}`)).join(', ')}]]`).join('\n')}
${value.open ? '      @unknown default: return ["case": "unknown", "values": []]' : ''}
      }
    })()`
  return `([${value.fields.map((field) => `${JSON.stringify(field.name)}: ${eventValueSwift(field.value, `${expression}.${field.name}`)}`).join(', ')}] as [String: Any])`
}

export function emitStyle(
  header: string,
  outputs: Map<string, string>,
  styleFields: readonly StyleField[],
  derived: readonly DerivedModifier[],
  slots: readonly DerivedViewSlot[]
) {
  outputs.set('src/generated/viewSlots.ts', header + `import type { SDKEventValueShape } from './swiftStyleNative'
export const viewSlotAvailability = ${JSON.stringify(Object.fromEntries(slots.map((slot) => [slot.name, slot.ios])))} as const
export type ViewSlotName = keyof typeof viewSlotAvailability
export const viewSlotArguments = ${JSON.stringify(Object.fromEntries(slots.map((slot) => [slot.name, slot.arguments.map((argument) => ({ field: argument.field, kind: argument.kind, ...(argument.cases ? { cases: Object.fromEntries(argument.cases.map((item) => [item.name, item.ios])) } : {}) }))])))} as const
export const viewSlotEvents: Record<string, SDKEventValueShape> = ${JSON.stringify(Object.fromEntries(slots.filter((slot) => slot.preferenceEvent).map((slot) => [slot.name, slot.preferenceEvent])))}
export type ViewSlotConfiguration =
${slots.map((slot) => `  | { name: ${JSON.stringify(slot.name)}; ${slot.arguments.length || slot.preferenceEvent ? `options: { ${[...slot.arguments.map((argument) => `${argument.field}: ${argument.kind === 'bindingBoolean' ? '{ value: boolean; onChange: (value: boolean) => void }' : argument.kind === 'bindingString' ? '{ value: string; onChange: (value: string) => void }' : argument.kind === 'boolean' ? 'boolean' : argument.kind === 'string' ? 'string' : argument.cases!.map((item) => JSON.stringify(item.name)).join(' | ')}`), ...(slot.preferenceEvent ? [`onValue: (value: ${eventValueType(slot.preferenceEvent)}) => void`] : [])].join('; ')} }` : 'options?: never'} }`).join('\n')}
export const tabViewSlotAvailability = ${JSON.stringify(Object.fromEntries(slots.filter((slot) => /^tabView[A-Z]/.test(slot.name)).map((slot) => [slot.name, slot.ios])))} as const
export type TabViewSlotName = keyof typeof tabViewSlotAvailability
`)
  outputs.set('ios/Generated/OneNativeViewSlots.swift', header + `import SwiftUI
${[...new Set(slots.filter((slot) => slot.module.startsWith('_')).map((slot) => slot.module.slice(1, -'_SwiftUI'.length)))].map((framework) => `import ${framework}`).join('\n')}

enum OneNativeViewSlotName {
${slots.map((slot) => `  static let ${slot.name} = ${JSON.stringify(slot.name)}`).join('\n')}
  static let names = [${slots.map((slot) => slot.name).join(', ')}]
}

extension View {
  func oneNativeViewSlot(_ name: String, values: String = "[]", emit: @escaping (String, String) -> Void = { _, _ in }, content: @escaping () -> AnyView) -> AnyView {
    switch name {
${slots.map((slot) => `    case OneNativeViewSlotName.${slot.name}:${sdkGuard(slot.ios, `      if #available(iOS ${slot.ios}, *) {
${slot.arguments.length ? `        guard let data = values.data(using: .utf8),
          let decoded = try? JSONDecoder().decode([String].self, from: data),
          decoded.count == ${slot.arguments.length} else { preconditionFailure("invalid ${slot.name} slot values") }
${slot.arguments.map((argument, index) => argument.kind === 'bindingBoolean'
  ? `        guard decoded[${index}] == "true" || decoded[${index}] == "false" else { preconditionFailure("invalid ${slot.name}.${argument.field}") }
        let argument${index} = Binding<Bool>(get: { decoded[${index}] == "true" }, set: { emit(${JSON.stringify(slot.name)}, String($0)) })`
  : argument.kind === 'bindingString'
    ? `        let argument${index} = Binding<String>(get: { decoded[${index}] }, set: { emit(${JSON.stringify(slot.name)}, $0) })`
  : argument.kind === 'boolean'
    ? `        guard decoded[${index}] == "true" || decoded[${index}] == "false" else { preconditionFailure("invalid ${slot.name}.${argument.field}") }
        let argument${index} = decoded[${index}] == "true"`
  : argument.kind === 'string'
    ? `        let argument${index} = ${argument.type === 'SwiftUICore.Text' ? `Text(decoded[${index}])` : `decoded[${index}]`}`
  : `        let argument${index}: ${argument.type} = {
          switch decoded[${index}] {
${argument.cases!.map((item) => `          case ${JSON.stringify(item.name)}: ${item.ios > slot.ios ? `${sdkGuard(item.ios, `if #available(iOS ${item.ios}, *) { return ${argument.type}.${item.name} }`, '')}
            preconditionFailure("unavailable ${slot.name}.${argument.field}")` : `return ${argument.type}.${item.name}`}`).join('\n')}
          default: preconditionFailure("invalid ${slot.name}.${argument.field}")
          }
        }()`).join('\n')}
` : ''}        ${slot.preferenceKey ? `return AnyView(self.${slot.sdkName ?? slot.name}(${slot.preferenceKey}.self, alignment: .center) { _ in content() }
          .onPreferenceChange(${slot.preferenceKey}.self) { value in
            let payload = ${eventValueSwift(slot.preferenceEvent!, 'value')}
            guard let data = try? JSONSerialization.data(withJSONObject: payload, options: .fragmentsAllowed),
              let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${slot.name} preference") }
            emit(${JSON.stringify(slot.name)}, encoded)
          })` : `return AnyView(self.${slot.sdkName ?? slot.name}(${[...slot.arguments.map((argument, index) => `${argument.label === '_' ? '' : `${argument.label}: `}argument${index}`), `${slot.label === '_' ? '' : `${slot.label}: `}${slot.directValue ? 'content()' : slot.closureInputs ? `{ ${slot.closureInputs.map(() => '_').join(', ')} in content() }` : slot.contentWrapper ? `{ ${slot.contentWrapper} { content() } }` : 'content'}`].join(', ')}))`}
      }`, '')}
      return AnyView(self)`).join('\n')}
    default: preconditionFailure("unknown view slot: \\(name)")
    }
  }
}
`)
  // fabric runs processColor only on a top-level ColorValue prop, through the view
  // config; a color inside a struct prop reaches the native parser raw, and it reads an
  // unprocessed string as clear. every swiftStyle color is processed on the way out.
  const colorFields = styleFields.filter((field) => field.kind === 'color')
  const frameworkImports = [
    ...new Set(
      derived.flatMap((modifier) => [
        ...(modifier.framework ? [modifier.framework] : []),
        ...(modifier.sharedParameter ? [modifier.sharedParameter.type.split('.')[0]] : []),
        ...(modifier.arguments?.some((argument) => argument.type.includes('UniformTypeIdentifiers.'))
          ? ['UniformTypeIdentifiers'] : []),
        ...(modifier.kind === 'asyncObjectRequest' ? ['CoreLocation'] : []),
      ])
    ),
  ]
  const generatedCalls = derived
    .map(
      (modifier) =>
        `      case ${JSON.stringify(modifier.name)}: view = AnyView(view.oneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}(value, emit: emit))`
    )
    .join('\n')
  const generatedMethods = derived
    .map((modifier) => {
      const helper = `oneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}`
      const apply = (value: string, version: number, fullArguments = false) => {
        const argument = modifier.environmentKey
          ? modifier.environmentTransform
            ? modifier.environmentTransform === 'toggle'
              ? `\\.${modifier.environmentKey}, transform: { environmentValue in if ${value} { environmentValue.toggle() } }`
              : `\\.${modifier.environmentKey}, transform: { environmentValue in environmentValue += ${value} }`
            : `\\.${modifier.environmentKey}, ${value}` :
          modifier.preferenceKey ? modifier.preferenceOperation === 'set'
            ? `key: ${modifier.preferenceKey}.self, value: ${value}`
            : modifier.preferenceOperation === 'transform'
              ? `${modifier.preferenceKey}.self, { current in current = ${value} }`
              : `${modifier.preferenceKey}.self, perform: ${value}` :
          !fullArguments && modifier.label && modifier.label !== '_' ? `${modifier.label}: ${value}` : value
        return version > 17
          ? sdkGuard(version, `if #available(iOS ${version}, *) { self.${modifier.sdkName ?? modifier.name}(${argument}) } else { self }`, 'self')
          : `self.${modifier.sdkName ?? modifier.name}(${argument})`
      }
      const construct = (value: string, constructor = modifier.scalarConstructor, type = modifier.type) => {
        if (!constructor) return value
        const baseType = type.replace(/\?$/, '')
        const call = `${baseType}(${constructor.label}: ${value})`
        return constructor.failable
          ? `(${call} ?? { () -> ${baseType} in preconditionFailure("invalid ${modifier.name}") }())`
          : call
      }
      const expression = (template: string | undefined, value: string) => template?.replace('$value', value)
      if (modifier.kind === 'phaseAnimation')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let config: OneNativeSDKPhaseAnimation = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(OneNativeSDKPhaseAnimation.self, from: data),
        decoded.phases.count >= 2, decoded.duration.isFinite, decoded.duration > 0,
        decoded.phases.allSatisfy({ OneNativeSDKScalarEffect.valid(decoded.effect, $0) }) else {
        preconditionFailure("invalid ${modifier.name}")
      }
      return decoded
    }()
    self.${modifier.sdkName ?? modifier.name}(config.phases) { content, phase in
      content.modifier(OneNativeSDKScalarEffect(effect: config.effect, value: phase))
    } animation: { _ in .easeInOut(duration: config.duration) }
  }`
      if (modifier.kind === 'keyframeAnimation')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let config: OneNativeSDKKeyframeAnimation = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(OneNativeSDKKeyframeAnimation.self, from: data),
        !decoded.frames.isEmpty,
        OneNativeSDKScalarEffect.valid(decoded.effect, decoded.initialValue),
        decoded.frames.allSatisfy({ OneNativeSDKScalarEffect.valid(decoded.effect, $0.value) &&
          $0.duration.isFinite && $0.duration > 0 }) else {
        preconditionFailure("invalid ${modifier.name}")
      }
      return decoded
    }()
    self.${modifier.sdkName ?? modifier.name}(initialValue: config.initialValue, repeating: config.repeating ?? true) { content, current in
      content.modifier(OneNativeSDKScalarEffect(effect: config.effect, value: current))
    } keyframes: { _ in
      KeyframeTrack(\\.self) {
        for frame in config.frames {
          LinearKeyframe(frame.value, duration: frame.duration)
        }
      }
    }
  }`
      if (modifier.kind === 'seedKeyframeAnimation')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let config: OneNativeSDKSeedKeyframeAnimation = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(OneNativeSDKSeedKeyframeAnimation.self, from: data),
        !decoded.frames.isEmpty,
        decoded.frames.allSatisfy({ $0.value.isFinite && $0.duration.isFinite && $0.duration > 0 }) else {
        preconditionFailure("invalid ${modifier.name}")
      }
      return decoded
    }()
    switch config.property {
${modifier.cases!.map((field) => `    case ${JSON.stringify(field.name)}:
      self.${modifier.sdkName ?? modifier.name}(trigger: config.trigger) { _ in
        KeyframeTrack(\\.${field.name}) {
          for frame in config.frames {
            LinearKeyframe(frame.value, duration: frame.duration)
          }
        }
      }`).join('\n')}
    default: preconditionFailure("invalid ${modifier.name} property")
    }
  }`
      if (modifier.kind === 'registeredValue')
        return modifier.registeredFactory ? `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    if #available(iOS ${modifier.ios}, *) {
      let registered: OneNativeRegisteredModifier = {
        guard let found = OneNativeRegisteredValue.value(value) as? OneNativeRegisteredModifier else {
          preconditionFailure("missing ${modifier.name} registered value: \\(value)")
        }
        return found
      }()
      let _ = precondition(registered.kind == .${modifier.registeredFactory}, "invalid ${modifier.name} registered value: \\(value)")
      registered.apply(AnyView(self))
    } else { self }
  }` : modifier.registeredProtocol ? `  @available(iOS ${modifier.ios}, *)
  fileprivate func ${helper}Registered<T: ${modifier.registeredProtocol}>(_ registered: T) -> some View {
    self.${modifier.sdkName ?? modifier.name}(registered)
  }

  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    if #available(iOS ${modifier.ios}, *) {
      let registered: any ${modifier.registeredProtocol} = {
        guard let found = OneNativeRegisteredValue.value(value) as? any ${modifier.registeredProtocol} else {
          preconditionFailure("missing ${modifier.name} registered value: \\(value)")
        }
        return found
      }()
      AnyView(${helper}Registered(registered))
    } else { self }
  }` : `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    if #available(iOS ${modifier.ios}, *) {
      let registered: ${modifier.registeredType} = {
        guard let found = OneNativeRegisteredValue.value(value) as? ${modifier.registeredType} else {
          preconditionFailure("missing ${modifier.name} registered value: \\(value)")
        }
        return found
      }()
      AnyView(self.${modifier.sdkName ?? modifier.name}(registered))
    } else { self }
  }`
      if (modifier.preferenceKey === 'OneNativeSDKRectAnchorKey')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    self.${modifier.sdkName ?? modifier.name}(key: OneNativeSDKRectAnchorKey.self, value: .bounds) ${modifier.preferenceOperation === 'transform'
      ? '{ current, anchor in current = anchor }'
      : '{ anchor in anchor }'}
      .backgroundPreferenceValue(OneNativeSDKRectAnchorKey.self) { anchor in
        GeometryReader { geometry in
          Color.clear.onGeometryChange(for: CGRect.self) { _ in
            anchor.map { geometry[$0] } ?? .zero
          } action: { rect in
            let payload = ${eventValueSwift(modifier.eventValue!, 'rect')}
            guard let data = try? JSONSerialization.data(withJSONObject: payload),
              let encoded = String(data: data, encoding: .utf8) else {
              preconditionFailure("invalid ${modifier.name} event")
            }
            emit(${JSON.stringify(modifier.name)}, encoded)
          }
        }
      }
  }`
      if (modifier.kind === 'chartDescriptor')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let descriptor: OneNativeSDKChartDescriptor = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(OneNativeSDKChartDescriptor.self, from: data) else {
        preconditionFailure("invalid ${modifier.name}")
      }
      return decoded
    }()
    ${apply('descriptor', modifier.ios)}
  }`
      if (modifier.kind === 'record') {
        const argumentsFromSDK = modifier.arguments!
        const parsedArguments = argumentsFromSDK.map((argument, index) => {
          const variable = `argument${index}`
          const raw = `values[${index}]`
          const baseType = argument.type.replace(/\?$/, '')
          if (argument.kind === 'enum') {
            const cases = argument.cases!.map((item) =>
              `      case ${JSON.stringify(item.name)}:${item.ios > 17 ? `\n${sdkGuard(item.ios, `if #available(iOS ${item.ios}, *) { return ${baseType}.${item.name} }`, '')}\n        preconditionFailure("unavailable ${modifier.name}.${argument.field}: \\(raw)")` : ` return ${baseType}.${item.name}`}`
            ).join('\n')
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw} else { ${argument.optional ? 'return nil' : `preconditionFailure("missing ${modifier.name}.${argument.field}")`} }
      switch raw {
${cases}
      default: preconditionFailure("invalid ${modifier.name}.${argument.field}: \\(raw)")
      }
    }()`
          }
          if (argument.kind === 'boolean')
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw} else { ${argument.optional ? 'return nil' : `preconditionFailure("missing ${modifier.name}.${argument.field}")`} }
      guard raw == "true" || raw == "false" else { preconditionFailure("invalid ${modifier.name}.${argument.field}: \\(raw)") }
      return ${construct('raw == "true"', argument.scalarConstructor, argument.type)}
    }()`
          if (argument.kind === 'bindingBoolean')
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw}, raw == "true" || raw == "false" else { preconditionFailure("invalid ${modifier.name}.${argument.field}") }
      return Binding<Bool>(get: { raw == "true" }, set: { emit(${JSON.stringify(`${modifier.name}.${argument.field}`)}, String($0)) })
    }()`
          if (argument.kind === 'bindingOptionalURL')
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw}, let data = raw.data(using: .utf8),
        let decoded = try? JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed),
        decoded is NSNull || decoded is String else { preconditionFailure("invalid ${modifier.name}.${argument.field}") }
      let current: Foundation.URL?
      if let text = decoded as? String {
        guard let url = Foundation.URL(string: text) else { preconditionFailure("invalid ${modifier.name}.${argument.field} URL") }
        current = url
      } else { current = nil }
      return Binding<Foundation.URL?>(get: { current }, set: { changed in
        guard let data = try? JSONEncoder().encode(changed?.absoluteString),
          let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name}.${argument.field} event") }
        emit(${JSON.stringify(`${modifier.name}.${argument.field}`)}, encoded)
      })
    }()`
          if ((argument.kind === 'resultURL' || argument.kind === 'resultURLArray') &&
            argumentsFromSDK.some((item) => item.field === 'allowedContentTypes' &&
              item.type === '[UniformTypeIdentifiers.UTType]'))
            return `    let ${variable}: (Swift.Result<${argument.kind === 'resultURL' ? 'Foundation.URL' : '[Foundation.URL]'}, any Swift.Error>) -> Swift.Void = { result in
      DispatchQueue.global(qos: .utility).async {
        let payload: [String: Any]
        switch result {
        case .success(let urls):
          do { payload = ["success": ${argument.kind === 'resultURL' ? 'try oneNativeCopyToCaches(urls).absoluteString' : 'try urls.map(oneNativeCopyToCaches).map(\\.absoluteString)'}] }
          catch { payload = ["failure": String(describing: error)] }
        case .failure(let error): payload = ["failure": String(describing: error)]
        }
        guard let data = try? JSONSerialization.data(withJSONObject: payload),
          let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name}.${argument.field} result") }
        DispatchQueue.main.async { emit(${JSON.stringify(`${modifier.name}.${argument.field}`)}, encoded) }
      }
    }`
          if (argument.kind === 'resultURL' || argument.kind === 'resultURLArray')
            return `    let ${variable}: (Swift.Result<${argument.kind === 'resultURL' ? 'Foundation.URL' : '[Foundation.URL]'}, any Swift.Error>) -> Swift.Void = { result in
      let payload: [String: Any]
      switch result {
      case .success(let urls): payload = ["success": ${argument.kind === 'resultURL' ? 'urls.absoluteString' : 'urls.map(\\.absoluteString)'}]
      case .failure(let error): payload = ["failure": String(describing: error)]
      }
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name}.${argument.field} result") }
      emit(${JSON.stringify(`${modifier.name}.${argument.field}`)}, encoded)
    }`
          if (argument.kind === 'eventStruct') {
            const input = /^@escaping \((?:_ [A-Za-z]\w*: )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> (?:Swift\.Void|\(\))$/.exec(argument.type)![1]
            return `    let ${variable}: (${input}) -> Void = { item in
      let payload = ${eventValueSwift(argument.eventValue!, 'item')}
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name}.${argument.field} event") }
      emit(${JSON.stringify(`${modifier.name}.${argument.field}`)}, encoded)
    }`
          }
          if (argument.kind === 'classUpdate' || argument.kind === 'structUpdate') {
            const input = /^@escaping \((?:inout )?([A-Za-z_]\w*(?:\.[A-Za-z_]\w*)+)\) -> (?:Swift\.Void|\(\))$/.exec(argument.type)![1]
            const assignments = argument.fields!.map((field) => {
              const assignment = field.type === 'Swift.String?' ? `if raw is NSNull { item.${field.name} = nil }
        else if let string = raw as? String { item.${field.name} = string }
        else { preconditionFailure("invalid ${modifier.name}.${argument.field}.${field.name}") }` : `guard let value = raw as? ${field.type === 'Swift.Bool' ? 'Bool' : 'String'} else { preconditionFailure("invalid ${modifier.name}.${argument.field}.${field.name}") }
        item.${field.name} = value`
              const guarded = field.ios && field.ios > modifier.ios
                ? `if #available(iOS ${field.ios}, *) {
        ${assignment}
        }` : assignment
              return `      if let raw = updated[${JSON.stringify(field.name)}] {
        ${guarded}
      }`
            }).join('\n')
            return `    let ${variable}: (${argument.kind === 'structUpdate' ? 'inout ' : ''}${input}) -> Void = {
      guard let raw = ${raw}, let data = raw.data(using: .utf8),
        let updated = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
        !updated.isEmpty else { preconditionFailure("invalid ${modifier.name}.${argument.field}") }
      return { item in
${assignments}
      }
    }()`
          }
          if (argument.kind === 'number') {
            const scalarType = argument.scalarConstructor?.type ?? baseType
            const value = scalarType === 'CoreFoundation.CGFloat' ? 'CGFloat(number)' : scalarType === 'Swift.Float' ? 'Float(number)' : scalarType === 'Swift.Int' ? 'Int(number)' : 'number'
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw} else { ${argument.optional ? 'return nil' : `preconditionFailure("missing ${modifier.name}.${argument.field}")`} }
      guard let number = Double(raw), number.isFinite else { preconditionFailure("invalid ${modifier.name}.${argument.field}: \\(raw)") }
      return ${construct(value, argument.scalarConstructor, argument.type)}
    }()`
          }
          if (argument.kind === 'url')
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw} else { ${argument.optional ? 'return nil' : `preconditionFailure("missing ${modifier.name}.${argument.field}")`} }
      guard let url = Foundation.URL(string: raw) else { preconditionFailure("invalid ${modifier.name}.${argument.field}: \\(raw)") }
      return url
    }()`
          if (argument.kind === 'stringArray' || argument.kind === 'stringSet')
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw} else { ${argument.optional ? 'return nil' : `preconditionFailure("missing ${modifier.name}.${argument.field}")`} }
      guard let data = raw.data(using: .utf8), let strings = try? JSONDecoder().decode([String].self, from: data) else { preconditionFailure("invalid ${modifier.name}.${argument.field}: \\(raw)") }
      return ${expression(argument.swiftExpression, 'strings') ?? (argument.kind === 'stringSet' ? 'Set(strings)' : baseType === '[SwiftUICore.Text]' ? 'strings.map { Text($0) }' : 'strings')}
    }()`
          if (argument.kind === 'numericStruct' || argument.kind === 'numericTuple') {
            const fields = argument.fields!
            const validated = fields.map((field, fieldIndex) =>
              `let field${fieldIndex} = decoded[${JSON.stringify(field.name)}], field${fieldIndex}.isFinite${field.type === 'Swift.Int' ? `, Int(exactly: field${fieldIndex}) != nil` : field.type === 'Swift.Float' ? `, Float(field${fieldIndex}).isFinite` : ''}`).join(',\n        ')
            const converted = fields.map((field, fieldIndex) =>
              `${field.label}: ${field.type === 'CoreFoundation.CGFloat' ? `CGFloat(field${fieldIndex})` : field.type === 'Swift.Float' ? `Float(field${fieldIndex})` : field.type === 'Swift.Int' ? `Int(field${fieldIndex})` : `field${fieldIndex}`}`).join(', ')
            return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw} else { ${argument.optional ? 'return nil' : `preconditionFailure("missing ${modifier.name}.${argument.field}")`} }
      guard let data = raw.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String: Double].self, from: data),
        ${validated} else { preconditionFailure("invalid ${modifier.name}.${argument.field}: \\(raw)") }
      return ${argument.kind === 'numericStruct' ? `${baseType}(${argument.wrappedType ? `${argument.wrappedType}(${converted})` : converted})` : `(${converted})`}
    }()`
          }
          return `    let ${variable}: ${argument.type} = {
      guard let raw = ${raw} else { ${argument.optional ? 'return nil' : `preconditionFailure("missing ${modifier.name}.${argument.field}")`} }
      return ${expression(argument.swiftExpression, 'raw') ?? (baseType === 'SwiftUICore.Text' ? 'Text(raw)' : baseType === 'SwiftUICore.Image' ? 'Image(systemName: raw)' : construct('raw', argument.scalarConstructor, argument.type))}
    }()`
        }).join('\n')
        const callArguments = argumentsFromSDK.slice(0, modifier.factoryParameter?.argumentOffset).map((argument, index) =>
          `${argument.label === '_' ? '' : `${argument.label}: `}${argument.closureInput ? `{ (_: ${argument.closureInput}) in argument${index} }` : `argument${index}`}`
        )
        if (modifier.factoryParameter) {
          const constructor = argumentsFromSDK.slice(modifier.factoryParameter.argumentOffset)
            .map((argument, index) =>
              `${argument.label === '_' ? '' : `${argument.label}: `}argument${modifier.factoryParameter!.argumentOffset + index}`)
            .join(', ')
          callArguments.splice(modifier.factoryParameter.index, 0,
            `${modifier.factoryParameter.label === '_' ? '' : `${modifier.factoryParameter.label}: `}{ ${modifier.factoryParameter.type}(${constructor}) }`)
        }
        if (modifier.namespaceParameter)
          callArguments.splice(modifier.namespaceParameter.index, 0,
            `${modifier.namespaceParameter.label === '_' ? '' : `${modifier.namespaceParameter.label}: `}OneNativeNamespace.id`)
        if (modifier.sharedParameter)
          callArguments.splice(modifier.sharedParameter.index, 0,
            `${modifier.sharedParameter.label === '_' ? '' : `${modifier.sharedParameter.label}: `}${modifier.sharedParameter.type}.${modifier.sharedParameter.factoryName ?? 'shared'}()`)
        if (modifier.fixedParameter)
          callArguments.splice(modifier.fixedParameter.index, 0,
            `${modifier.fixedParameter.label === '_' ? '' : `${modifier.fixedParameter.label}: `}${modifier.fixedParameter.expression}`)
        const call = modifier.constructorParameter
          ? `${modifier.constructorParameter.label === '_' ? '' : `${modifier.constructorParameter.label}: `}${modifier.constructorParameter.type}(${callArguments.join(', ')})`
          : callArguments.join(', ')
        const body = `let values: [String?] = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String?].self, from: data),
        decoded.count == ${argumentsFromSDK.length} else { preconditionFailure("invalid ${modifier.name}: \\(value)") }
      return decoded
    }()
${parsedArguments}
    ${apply(call, 17, true)}`
        const generated = `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${modifier.ios > 17 ? sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      ${body}
    } else { self }`, 'self') : body}
  }`
        return modifier.sharedParameter ? generated.replace(/^    $/gm, '') : generated
      }
      if (modifier.kind === 'gesture')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    switch value {
${modifier.gestureOptions!.map((option) => {
          const ended = option.eventValue
            ? `{ item in
        let payload = ${eventValueSwift(option.eventValue, 'item')}
        guard let data = try? JSONSerialization.data(withJSONObject: payload, options: .fragmentsAllowed),
          let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name}.${option.name} event") }
        emit(${JSON.stringify(modifier.name)}, encoded)
      }`
            : `{ _ in emit(${JSON.stringify(modifier.name)}, "") }`
          const call = `self.${modifier.sdkName ?? modifier.name}(${option.type}().onEnded(${ended}))`
          return `    case ${JSON.stringify(option.name)}:
      ${option.ios > 17 ? sdkGuard(option.ios, `if #available(iOS ${option.ios}, *) { ${call} } else { self }`, 'self') : call}`
        }).join('\n')}
    default: preconditionFailure("invalid ${modifier.name}: \\(value)")
    }
  }`
      if (modifier.kind === 'bindingFocusBoolean') {
        const holder = `OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}FocusBinding`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")
    ${modifier.ios > 17 ? sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      self.modifier(${holder}(value: value == "true", emit: emit))
    } else { self }`, 'self') : `self.modifier(${holder}(value: value == "true", emit: emit))`}
  }`
      }
      if (modifier.uiRecognizer)
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${apply(`OneNativeSDKTapRecognizer(onTap: { emit(${JSON.stringify(modifier.name)}, "") })`, modifier.ios).trimStart()}
  }`
      if (modifier.kind === 'defaultFocusBoolean') {
        const holder = `OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}FocusBinding`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")
    if value == "true" {
      ${modifier.ios > 17 ? sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) { self.modifier(${holder}()) } else { self }`, 'self') : `self.modifier(${holder}())`}
    } else { self }
  }`
      }
      if (modifier.kind === 'bindingPoint') {
        const type = modifier.bindingType!
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {${sdkGuard(modifier.ios, `
    if #available(iOS ${modifier.ios}, *) {
      let point: CGPoint? = {
        if value == "null" { return nil }
        guard let data = value.data(using: .utf8),
          let coordinates = try? JSONDecoder().decode([String: Double].self, from: data),
          coordinates.count == 2,
          let x = coordinates["x"], x.isFinite,
          let y = coordinates["y"], y.isFinite else { preconditionFailure("invalid ${modifier.name}: \\(value)") }
        return CGPoint(x: x, y: y)
      }()
      self.${modifier.sdkName ?? modifier.name}(${modifier.label && modifier.label !== '_' ? `${modifier.label}: ` : ''}Binding<${type}>(get: {
        point.map { ${type}(point: $0) } ?? ${type}()
      }, set: { position in
        let changed = position.point.map { ["x": Double($0.x), "y": Double($0.y)] }
        guard let data = try? JSONEncoder().encode(changed),
          let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} event") }
        emit(${JSON.stringify(modifier.name)}, encoded)
      }))
    } else { self }`, 'self')}
  }`
      }
      if (modifier.kind === 'bindingTextSelection') {
        const selection = modifier.textSelection!
        const event = JSON.stringify(modifier.name)
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {${sdkGuard(modifier.ios, `
    if #available(iOS ${modifier.ios}, *) {
      let fields: [String] = {
        guard let data = value.data(using: .utf8),
          let decoded = try? JSONDecoder().decode([String].self, from: data),
          decoded.count == 2 else { preconditionFailure("invalid ${modifier.name} fields") }
        return decoded
      }()
      let text = fields[0]
      let offsets: [[Int]]? = {
        if fields[1] == "null" { return nil }
        guard let data = fields[1].data(using: .utf8),
          let decoded = try? JSONDecoder().decode([[Int]].self, from: data),
          !decoded.isEmpty else { preconditionFailure("invalid ${modifier.name} ranges") }
        return decoded
      }()
      let selection: ${selection.selectionType}? = {
        guard let offsets else { return nil }
        let limit = text.utf16.count
        var previousEnd = -1
        let indexed = offsets.map { pair -> Range<String.Index> in
          guard pair.count == 2, pair[0] >= 0, pair[0] <= pair[1], pair[1] <= limit,
            pair[0] > previousEnd, offsets.count == 1 || pair[0] < pair[1] else {
            preconditionFailure("invalid ${modifier.name} range")
          }
          previousEnd = pair[1]
          return String.Index(utf16Offset: pair[0], in: text)..<String.Index(utf16Offset: pair[1], in: text)
        }
        if indexed.count == 1 {
          let range = indexed[0]
          if range.isEmpty { return ${selection.selectionType}(${selection.insertionLabel}: range.lowerBound) }
          return ${selection.selectionType}(${selection.rangeLabel}: range)
        }
        var ranges = RangeSet<String.Index>()
        for range in indexed { ranges.insert(contentsOf: range) }
        return ${selection.selectionType}(${selection.rangesLabel}: ranges)
      }()
      self.${modifier.sdkName ?? modifier.name}(${modifier.label && modifier.label !== '_' ? `${modifier.label}: ` : ''}Binding(get: { selection }, set: { changed in
        let result: [[Int]]?
        if let changed {
          switch changed.${selection.indicesMember} {
          case .${selection.singleCase}(let range):
            result = [[range.lowerBound.utf16Offset(in: text), range.upperBound.utf16Offset(in: text)]]
          case .${selection.multiCase}(let ranges):
            result = ranges.ranges.map { [$0.lowerBound.utf16Offset(in: text), $0.upperBound.utf16Offset(in: text)] }
          @unknown default: preconditionFailure("unsupported ${modifier.name} case")
          }
        } else { result = nil }
        guard let data = try? JSONEncoder().encode(result),
          let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} event") }
        emit(${event}, encoded)
      }))
    } else { self }`, 'self')}
  }`
      }
      if (modifier.kind === 'sessionRequest') {
        const request = modifier.sessionRequest!
        const call = [...request.defaults.map((parameter) =>
          `${parameter.label === '_' ? '' : `${parameter.label}: `}${parameter.value}`),
          `${request.actionLabel === '_' ? '' : `${request.actionLabel}: `}{ session in
      let payload: [String: Any]
      do {
        let response = try await session.${request.method}(value)
        payload = [${[...request.outputFields.map((field) => `${JSON.stringify(field)}: response.${field}`), '"error": NSNull()'].join(', ')}]
      } catch {
        payload = [${[...request.outputFields.map((field) => `${JSON.stringify(field)}: NSNull()`), '"error": String(describing: error)'].join(', ')}]
      }
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} response") }
      emit(${JSON.stringify(modifier.name)}, encoded)
    }`].join(', ')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${apply(call, modifier.ios, true)}
  }`
      }
      if (modifier.kind === 'equatableKey') {
        const wrapper = `OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}KeyView`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
${sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      ${wrapper}(key: value, content: self).${modifier.sdkName ?? modifier.name}()
    } else { self }`, 'self')}
  }`
      }
      if (modifier.kind === 'pickerSelection') {
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let (presented, title): (Bool, String?) = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String?].self, from: data),
        decoded.count == 2, let presented = decoded[0],
        presented == "true" || presented == "false" else { preconditionFailure("invalid ${modifier.name} picker") }
      return (presented == "true", decoded[1])
    }()
${sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      self.modifier(OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}Picker(
        presented: presented, title: title, emit: emit))
    } else { self }`, 'self')}
  }`
      }
      if (modifier.kind === 'transferSelection') {
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name} presentation")
${sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      self.modifier(OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}Transfer(
        presented: value == "true", emit: emit))
    } else { self }`, 'self')}
  }`
      }
      if (modifier.kind === 'eventReturnArray') {
        const call = modifier.callArguments!.map((argument) =>
          `${argument.label === '_' ? '' : `${argument.label}: `}${argument.bridge ? 'action' : argument.defaultValue}`
        ).join(', ')
        const body = `let items: [String] = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String].self, from: data) else { preconditionFailure("invalid ${modifier.name}: \\(value)") }
      return decoded
    }()
    let action: () -> [String] = {
      emit(${JSON.stringify(modifier.name)}, "")
      return items
    }
    ${apply(call, 17, true)}`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${modifier.ios > 17 ? sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      ${body}
    } else { self }`, 'self') : body}
  }`
      }
      if (modifier.kind === 'eventReturnEnum') {
        const body = `let selected: ${modifier.resultType} = {
      switch value {
${modifier.cases!.map((item) => `      case ${JSON.stringify(item.name)}: return ${modifier.resultConstructor ? `${modifier.resultType}(${modifier.resultConstructor.label === '_' ? '' : `${modifier.resultConstructor.label}: `}${modifier.resultConstructor.type}.${item.name})` : `${modifier.resultType}.${item.name}`}`).join('\n')}
      default: preconditionFailure("invalid ${modifier.name}: \\(value)")
      }
    }()
    let action: (${modifier.eventInputType}) -> ${modifier.resultType} = { item in
      let payload = ${eventValueSwift(modifier.eventValue!, 'item')}
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} event") }
      emit(${JSON.stringify(modifier.name)}, encoded)
      return selected
    }
    ${apply(`${modifier.label && modifier.label !== '_' ? `${modifier.label}: ` : ''}action`, 17, true)}`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${modifier.ios > 17 ? sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      ${body}
    } else { self }`, 'self') : body}
  }`
      }
      if (modifier.kind === 'eventValueString')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${apply(`${modifier.label === '_' ? '' : `${modifier.label}: `}value, ${modifier.callbackLabel === '_' ? '' : `${modifier.callbackLabel}: `}{ changed in emit(${JSON.stringify(modifier.name)}, changed) }`, modifier.ios, true)}
  }`
      if (modifier.kind === 'bindingCodable') {
        const type = modifier.bindingType!
        const optional = modifier.type.endsWith('?')
        const defaultValue = optional && modifier.bindingDefault
        const call = modifier.callArguments?.map((argument) =>
          `${argument.label === '_' ? '' : `${argument.label}: `}${argument.bridge ? 'binding' : argument.defaultValue}`
        ).join(', ') ?? 'binding'
        const decode = `guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(${type}.self, from: data) else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
        const body = `let binding: Binding<${type}>${optional && !defaultValue ? '?' : ''} = {
      ${defaultValue ? `let decoded: ${type} = {
        if value == "null" { return ${type}() }
        ${decode}
        return decoded
      }()` : `${optional ? 'if value == "null" { return nil }' : ''}
      ${decode}`}
      return Binding<${type}>(get: { decoded }, set: { changed in
        guard let data = try? JSONEncoder().encode(changed),
          let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} binding event") }
        emit(${JSON.stringify(modifier.name)}, encoded)
      })
    }()
    ${apply(call, 17, modifier.callArguments !== undefined)}`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${modifier.ios > 17 ? sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) {
      ${body}
    } else { self }`, 'self') : body}
  }`
      }
      if (modifier.kind === 'eventAsync')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${apply(`{ await OneNativeAsyncAction.wait(name: ${JSON.stringify(modifier.name)}, emit: emit) }`, modifier.ios)}
  }`
      if (modifier.kind === 'dragContainer')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let enabled: Bool = {
      guard value == "true" || value == "false" else { preconditionFailure("invalid ${modifier.name}: \\(value)") }
      return value == "true"
    }()
    if enabled {
      ${apply('for: String.self, itemID: \\.self, in: OneNativeNamespace.id, { ids in ids }', modifier.ios, true).trimStart()}
    } else { self }
  }`
      if (modifier.kind === 'dragSelection')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let ids: [String] = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String].self, from: data) else { preconditionFailure("invalid ${modifier.name} IDs") }
      return decoded
    }()
    ${apply('ids, containerNamespace: OneNativeNamespace.id', modifier.ios, true).trimStart()}
  }`
      if (modifier.kind === 'dragItemID')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${apply('containerItemID: value, containerNamespace: OneNativeNamespace.id', modifier.ios, true).trimStart()}
  }`
      if (modifier.kind === 'asyncObjectRequest') {
        const wrapper = `OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}Request`
        const call = `self.modifier(${wrapper}(latitude: config.1, longitude: config.2, presented: config.0, emit: emit))`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let config: (Bool, Double, Double) = {
      guard let data = value.data(using: .utf8),
        let values = try? JSONDecoder().decode([String].self, from: data), values.count == 3,
        (values[0] == "true" || values[0] == "false"),
        let latitude = Double(values[1]), (-90...90).contains(latitude),
        let longitude = Double(values[2]), (-180...180).contains(longitude) else {
        preconditionFailure("invalid ${modifier.name} request")
      }
      return (values[0] == "true", latitude, longitude)
    }()
    ${modifier.ios > 17 ? sdkGuard(modifier.ios, `if #available(iOS ${modifier.ios}, *) { ${call} } else { self }`, 'self').trimStart() : call}
  }`
      }
      if (modifier.kind === 'eventDrop')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let types: [String] = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String].self, from: data),
        !decoded.isEmpty else { preconditionFailure("invalid ${modifier.name} types") }
      return decoded
    }()
    ${apply(`of: types, isTargeted: nil, perform: { providers in
      var accepted = false
      for provider in providers {
        guard let type = types.first(where: { provider.hasItemConformingToTypeIdentifier($0) }) else { continue }
        accepted = true
        provider.loadDataRepresentation(forTypeIdentifier: type) { data, _ in
          guard let data,
            let encodedData = try? JSONSerialization.data(withJSONObject: ["type": type, "data": data.base64EncodedString()]),
            let encoded = String(data: encodedData, encoding: .utf8) else { return }
          DispatchQueue.main.async { emit(${JSON.stringify(modifier.name)}, encoded) }
        }
      }
      return accepted
    }`, modifier.ios, true)}
  }`
      if (modifier.kind === 'eventNotification')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${apply(`NotificationCenter.default.publisher(for: Notification.Name(value)), perform: { _ in emit(${JSON.stringify(modifier.name)}, "") }`, modifier.ios, true)}
  }`
      if (modifier.kind === 'eventAsyncStruct')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${modifier.arguments?.length ? `let decoded: [String] = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String].self, from: data),
        decoded.count == ${modifier.arguments.length} else { preconditionFailure("invalid ${modifier.name} arguments") }
      return decoded
    }()
${modifier.arguments.map((argument, index) => argument.kind === 'stringArray'
  ? `    let argument${index}: [String] = {
      guard let data = decoded[${index}].data(using: .utf8),
        let items = try? JSONDecoder().decode([String].self, from: data) else { preconditionFailure("invalid ${modifier.name}.${argument.field}") }
      return items
    }()` : '').filter(Boolean).join('\n')}
    ` : ''}${apply(`${modifier.arguments?.length ? `${modifier.arguments.map((argument, index) => `${argument.label === '_' ? '' : `${argument.label}: `}${argument.kind === 'stringArray' ? `argument${index}` : `decoded[${index}]`}`).join(', ')}, ${modifier.label === '_' ? '' : `${modifier.label}: `}` : ''}{ ${modifier.eventInputs?.join(', ') ?? 'item'} in
      let payload = ${modifier.eventInputs && modifier.eventValue?.kind === 'object'
        ? `([${modifier.eventValue.fields.map((field, index) => `${JSON.stringify(field.name)}: ${eventValueSwift(field.value, modifier.eventInputs![index])}`).join(', ')}] as [String: Any])`
        : eventValueSwift(modifier.eventValue!, 'item')}
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} async event") }
      await OneNativeAsyncAction.wait(name: ${JSON.stringify(modifier.name)}, value: encoded, emit: emit)
    }`, modifier.ios, Boolean(modifier.arguments?.length))}
  }`
      if (modifier.kind === 'eventAsyncString') {
        const inputs = modifier.eventInputs!
        const fields = modifier.eventValue!.kind === 'object' ? modifier.eventValue!.fields : []
        const payload = `([${fields.map((field, index) =>
          `${JSON.stringify(field.name)}: ${eventValueSwift(field.value, inputs[index])}`).join(', ')}] as [String: Any])`
        const decision = modifier.selectionMember
          ? `let selected = value`
          : `let enabled: Bool = {
      guard value == "true" || value == "false" else { preconditionFailure("invalid ${modifier.name}: \\(value)") }
      return value == "true"
    }()`
        const predicate = modifier.selectionMember
          ? `{ ${inputs.slice(0, -1).join(', ')} in ${inputs[modifier.selectionInputIndex!]}.${modifier.selectionMember}.first { $0.id == selected } }`
          : `{ ${inputs.map(() => '_').join(', ')} in enabled }`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${decision}
    ${apply(`${modifier.predicateLabel}: ${predicate}, ${modifier.callbackLabel}: { ${inputs.join(', ')} in
      let payload = ${payload}
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} async string event") }
      return try await OneNativeAsyncAction.waitForString(name: ${JSON.stringify(modifier.name)}, value: encoded, emit: emit)
    }`, modifier.ios, true)}
  }`
      }
      if (modifier.kind === 'visualEffect')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let decoded: [String] = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String].self, from: data),
        decoded.count == 2 else { preconditionFailure("invalid ${modifier.name} visual effect") }
      return decoded
    }()
    let amount: Double = {
      guard let amount = Double(decoded[1]), amount.isFinite else { preconditionFailure("invalid ${modifier.name} amount") }
      return amount
    }()
    switch decoded[0] {
    case "opacity": ${apply(modifier.visualPhase
      ? 'transition: { effect, phase in effect.opacity(1 - (1 - amount) * abs(phase.value)) }'
      : '{ effect, _ in effect.opacity(amount) }', modifier.ios, Boolean(modifier.visualPhase))}
    case "scaleEffect": ${apply(modifier.visualPhase
      ? 'transition: { effect, phase in effect.scaleEffect(CGFloat(1 - (1 - amount) * abs(phase.value))) }'
      : '{ effect, _ in effect.scaleEffect(CGFloat(amount)) }', modifier.ios, Boolean(modifier.visualPhase))}
    default: preconditionFailure("invalid ${modifier.name} visual effect kind")
    }
  }`
      if (modifier.kind === 'optionSet')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let decoded: [String: String] = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String: String].self, from: data) else { preconditionFailure("invalid ${modifier.name} options") }
      return decoded
    }()
    let options: [${modifier.resultType}] = {
      var options: [${modifier.resultType}] = []
${modifier.arguments!.map((argument) => `      if let raw = decoded[${JSON.stringify(argument.field)}] {
${argument.kind === 'number' ? `        guard let parsed = Int(raw) else { preconditionFailure("invalid ${modifier.name}.${argument.field}") }` : argument.kind === 'boolean' ? `        guard raw == "true" || raw == "false" else { preconditionFailure("invalid ${modifier.name}.${argument.field}") }` : ''}
        options.append(${modifier.resultType}.${argument.field}(${argument.label === '_' ? '' : `${argument.label}: `}${argument.kind === 'number' ? 'parsed' : argument.kind === 'boolean' ? 'raw == "true"' : 'raw'}))
      }`).join('\n')}
      return options
    }()
    ${apply('{ _ in Set(options) }', modifier.ios)}
  }`
      if (modifier.kind === 'selectionID')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${apply('{ _, _, eligible in eligible.first { $0.id == value } }', modifier.ios)}
  }`
      if (modifier.kind === 'selectionIndex')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let selected: Int = {
      guard let index = Int(value), index >= 0 else { preconditionFailure("invalid ${modifier.name}: \\(value)") }
      return index
    }()
    ${apply(`{ _, input in input.${modifier.selectionMember}.indices.contains(selected) ? input.${modifier.selectionMember}[selected] : nil }`, modifier.ios)}
  }`
      if (modifier.kind === 'caseSet')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let selected: Set<${modifier.resultType}> = {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONDecoder().decode([String].self, from: data) else { preconditionFailure("invalid ${modifier.name} values") }
      return Set(decoded.map { item in
        switch item {
${modifier.cases!.map((item) => `        case ${JSON.stringify(item.name)}: return ${modifier.resultType}.${item.name}`).join('\n')}
        default: preconditionFailure("invalid ${modifier.name} value: \\(item)")
        }
      })
    }()
    ${apply('selected', modifier.ios)}
  }`
      if (modifier.kind.startsWith('event') || modifier.kind.startsWith('binding')) {
        const bridge = modifier.kind.startsWith('event')
          ? modifier.kind === 'event'
            ? `{ emit(${JSON.stringify(modifier.name)}, "") }`
            : modifier.kind === 'eventEnum'
              ? `{ value in emit(${JSON.stringify(modifier.name)}, String(describing: value)) }`
              : modifier.kind === 'eventAssociatedEnum'
                ? `{ item in
      let payload: [String: Any]
      switch item {
${modifier.associatedCases!.map((item) => `      case .${item.name}${item.values.length ? `(${item.values.map((_, index) => `let value${index}`).join(', ')})` : ''}:
        payload = ["case": ${JSON.stringify(item.name)}, "values": [${item.values.map((value, index) => eventValueSwift(value, `value${index}`)).join(', ')}]]`).join('\n')}
      }
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} event") }
      emit(${JSON.stringify(modifier.name)}, encoded)
    }`
              : modifier.kind === 'eventStruct'
                ? modifier.eventPair
                  ? `{ oldValue, newValue in
      let payload = (["oldValue": ${eventValueSwift(modifier.eventValue!.kind === 'object' ? modifier.eventValue!.fields[0].value : modifier.eventValue!, 'oldValue')}, "newValue": ${eventValueSwift(modifier.eventValue!.kind === 'object' ? modifier.eventValue!.fields[1].value : modifier.eventValue!, 'newValue')}] as [String: Any])
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} event") }
      emit(${JSON.stringify(modifier.name)}, encoded)
    }`
                  : modifier.eventInputs
                    ? `{ ${modifier.eventInputs.join(', ')} in
      let payload = ([${(modifier.eventValue!.kind === 'object' ? modifier.eventValue!.fields : []).map((field) => `${JSON.stringify(field.name)}: ${eventValueSwift(field.value, field.name)}`).join(', ')}] as [String: Any])
      guard let data = try? JSONSerialization.data(withJSONObject: payload),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} event") }
      emit(${JSON.stringify(modifier.name)}, encoded)
    }`
                  : `{ item in
      let payload = ${eventValueSwift(modifier.eventValue!, 'item')}
      guard let data = try? JSONSerialization.data(withJSONObject: payload, options: .fragmentsAllowed),
        let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} event") }
      emit(${JSON.stringify(modifier.name)}, encoded)
    }`
              : modifier.kind === 'eventEnumPair'
                ? `{ oldValue, newValue in
      if let data = try? JSONEncoder().encode([String(describing: oldValue), String(describing: newValue)]),
        let payload = String(data: data, encoding: .utf8) { emit(${JSON.stringify(modifier.name)}, payload) }
    }`
            : `{ value in emit(${JSON.stringify(modifier.name)}, ${modifier.type.includes('Foundation.URL') ? 'value.absoluteString' : 'String(value)'}) }`
          : modifier.kind === 'bindingOptionalString'
            ? `Binding<${modifier.type.includes('Foundation.URL?') ? 'Foundation.URL' : 'String'}?>(get: {
      guard let data = value.data(using: .utf8),
        let decoded = try? JSONSerialization.jsonObject(with: data, options: .fragmentsAllowed),
        decoded is NSNull || decoded is String else { preconditionFailure("invalid ${modifier.name}: \\(value)") }
      ${modifier.type.includes('Foundation.URL?') ? `if let raw = decoded as? String {
        guard let url = Foundation.URL(string: raw) else { preconditionFailure("invalid ${modifier.name} URL") }
        return url
      }
      return nil` : 'return decoded as? String'}
    }, set: { changed in
      guard let data = try? JSONEncoder().encode(${modifier.type.includes('Foundation.URL?') ? 'changed?.absoluteString' : 'changed'}), let encoded = String(data: data, encoding: .utf8) else { preconditionFailure("invalid ${modifier.name} binding event") }
      emit(${JSON.stringify(modifier.name)}, encoded)
    })`
            : `Binding(get: { ${modifier.kind === 'bindingBoolean' ? 'value == "true"' : 'value'} }, set: { emit(${JSON.stringify(modifier.name)}, String($0)) })`
        const validation = modifier.kind === 'bindingBoolean'
          ? `    let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")\n`
          : ''
        const argumentsFromSDK = modifier.callArguments?.map((parameter) =>
          `${parameter.label === '_' ? '' : `${parameter.label}: `}${parameter.bridge ? bridge : parameter.defaultValue}`
        ).join(', ')
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
${validation}    ${apply(argumentsFromSDK ?? bridge, modifier.ios, argumentsFromSDK !== undefined)}
  }`
      }
      if (modifier.zeroArgument) {
        const argument = modifier.namespaceParameter
          ? `${modifier.namespaceParameter.label === '_' ? '' : `${modifier.namespaceParameter.label}: `}OneNativeNamespace.id`
          : ''
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")
    if value == "true" { ${apply(argument, modifier.ios)} } else { self }
  }`
      }
      if (modifier.kind === 'url' || modifier.kind === 'optionalURL') {
        const parsed = `if let data = value.data(using: .utf8),
      let decoded = try? JSONDecoder().decode(String.self, from: data),
      let url = Foundation.URL(string: decoded) {
      ${apply('url', modifier.ios)}
    } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    ${modifier.kind === 'optionalURL' ? `if value == "null" { ${apply('nil as Foundation.URL?', modifier.ios)} } else { ${parsed} }` : `if let url = Foundation.URL(string: value) { ${apply('url', modifier.ios)} } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`}
  }`
      }
      if (modifier.kind === 'optionalBoolean' || modifier.kind === 'optionalNumber' || modifier.kind === 'optionalString') {
        const nil = `nil as ${modifier.type}`
        const parsed = modifier.kind === 'optionalBoolean'
          ? `if value == "true" || value == "false" { ${apply(construct('value == "true"'), modifier.ios)} } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
          : modifier.kind === 'optionalNumber'
            ? `if let number = Double(value), number.isFinite {
      ${apply(construct((modifier.scalarConstructor?.type ?? modifier.type) === 'CoreFoundation.CGFloat' || modifier.type === 'CoreFoundation.CGFloat?' ? 'CGFloat(number)' : modifier.type === 'Swift.Float?' ? 'Float(number)' : modifier.type === 'Swift.Int?' ? 'Int(number)' : 'number'), modifier.ios)}
    } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
            : `if let data = value.data(using: .utf8), let decoded = try? JSONDecoder().decode(String.self, from: data) {
      ${apply(modifier.rawString ? `${modifier.type.replace(/\?$/, '')}(rawValue: decoded)` : expression(modifier.swiftExpression, 'decoded') ?? (modifier.type === 'SwiftUICore.Text?' ? 'Text(decoded)' : modifier.type === 'SwiftUICore.Image?' ? 'Image(systemName: decoded)' : construct('decoded')), modifier.ios)}
    } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    if value == "null" { ${apply(nil, modifier.ios)} } else { ${parsed} }
  }`
      }
      if (modifier.cases) {
        return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
    switch value {
${modifier.kind === 'optionalEnum' ? `      case "null": ${apply(`nil as ${modifier.type}`, modifier.ios)}` : ''}
${modifier.cases
  .map((item) => {
    const call = apply(modifier.kind === 'style' ? `.${item.name}` : `${modifier.type.replace(/\?$/, '')}.${item.name}`, Math.max(modifier.ios, item.ios))
    return `      case ${JSON.stringify(item.name)}:${call.startsWith('\n') ? '' : ' '}${call}`
  })
  .join('\n')}
    default: preconditionFailure("invalid ${modifier.name}: \\(value)")
    }
  }`
      }
      const parsed =
        modifier.kind === 'boolean'
          ? `      let _ = precondition(value == "true" || value == "false", "invalid ${modifier.name}: \\(value)")
      ${apply(modifier.type.startsWith('Foundation.Predicate<') ? `#Predicate<${modifier.predicateInput}> { _ in value == "true" }` : modifier.predicateInput ? `{ (_: ${modifier.predicateInput}) in value == "true" }` : construct('value == "true"'), modifier.ios)}`
          : modifier.kind === 'number'
            ? `      if let number = Double(value), number.isFinite {
        ${apply(construct(
          (modifier.scalarConstructor?.type ?? modifier.type) === 'CoreFoundation.CGFloat'
            ? 'CGFloat(number)'
            : (modifier.scalarConstructor?.type ?? modifier.type) === 'Swift.Float'
              ? 'Float(number)'
              : (modifier.scalarConstructor?.type ?? modifier.type) === 'Swift.Int'
                ? 'Int(number)'
                : 'number'),
          modifier.ios
        )}
      } else { preconditionFailure("invalid ${modifier.name}: \\(value)") }`
            : `      ${apply(modifier.rawString ? `${modifier.type}(rawValue: value)` : expression(modifier.swiftExpression, 'value') ?? (modifier.type === 'SwiftUICore.Text' ? 'Text(value)' : modifier.type === 'SwiftUICore.Image' ? 'Image(systemName: value)' : construct('value')), modifier.ios)}`
      return `  @ViewBuilder fileprivate func ${helper}(_ value: String, emit: @escaping (String, String) -> Void) -> some View {
${parsed.replace(/[ \t]+$/gm, '')}
  }`
    })
    .join('\n\n')
  const focusBindings = derived.filter((modifier) => modifier.kind === 'bindingFocusBoolean' || modifier.kind === 'defaultFocusBoolean').map((modifier) => {
    const holder = `OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}FocusBinding`
    const accessibility = modifier.type.includes('AccessibilityFocusState')
    if (modifier.kind === 'defaultFocusBoolean')
      return `${modifier.ios > 17 ? `@available(iOS ${modifier.ios}, *)\n` : ''}private struct ${holder}: ViewModifier {
  @${accessibility ? 'AccessibilityFocusState' : 'FocusState'} private var focused: Bool

  func body(content: Content) -> some View {
    content.${accessibility ? 'accessibilityFocused' : 'focused'}($focused)
      .${modifier.sdkName ?? modifier.name}($focused, true)
  }
}`
    return `${modifier.ios > 17 ? `@available(iOS ${modifier.ios}, *)\n` : ''}private struct ${holder}: ViewModifier {
  @${accessibility ? 'AccessibilityFocusState' : 'FocusState'} private var focused: Bool
  let value: Bool
  let emit: (String, String) -> Void

  func body(content: Content) -> some View {
    content.${modifier.sdkName ?? modifier.name}($focused)
      .onChange(of: focused) { _, next in
        if next != value { emit(${JSON.stringify(modifier.name)}, String(next)) }
      }
      .onChange(of: value) { _, next in
        if focused != next { focused = next }
      }
      .onAppear {
        if focused != value { focused = value }
      }
  }
}`
  }).join('\n\n')
  outputs.set(
    'src/generated/swiftStyleNative.ts',
    header +
      `import { NativeModules, processColor, type ColorValue, type ProcessedColorValue } from 'react-native'
import type { OneNativeStyle } from './controlTypes'

export type OneNativeStyleNative = Readonly<{
${styleFields
  .map(
    (field) =>
      `  ${field.name}?: ${field.kind === 'number' ? 'number' : field.kind === 'boolean' ? 'boolean' : field.kind === 'color' ? 'ProcessedColorValue' : 'string'}`
  )
  .join('\n')}
  sdkModifiers?: string
}>

const colorFields = [${colorFields.map((field) => `'${field.name}'`).join(', ')}] as const
const sdkKinds = ${JSON.stringify(Object.fromEntries(derived.map((modifier) => [modifier.name, modifier.kind])))} as const
const sdkSeedKeyframeFields: Record<string, readonly string[]> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'seedKeyframeAnimation').map((modifier) => [modifier.name, modifier.cases!.map((item) => item.name)])))}
${derived.some((modifier) => modifier.kind === 'phaseAnimation' || modifier.kind === 'keyframeAnimation') ? `function validScalarEffect(effect: unknown, value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false
  if (effect === 'opacity') return value >= 0 && value <= 1
  return (effect === 'scale' || effect === 'blur') && value >= 0
}
` : ''}
const sdkEventCases: Record<string, readonly string[]> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'eventEnum' || modifier.kind === 'eventEnumPair' || modifier.kind === 'eventReturnEnum' || modifier.kind === 'caseSet').map((modifier) => [modifier.name, modifier.cases!.map((item) => item.name)])))}
const sdkVisualEffects: Record<string, readonly string[]> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'visualEffect').map((modifier) => [modifier.name, modifier.cases!.map((item) => item.name)])))}
const sdkOptionSets: Record<string, readonly { field: string; kind: string }[]> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'optionSet').map((modifier) => [modifier.name, modifier.arguments!.map((argument) => ({ field: argument.field, kind: argument.kind }))])))}
export type SDKEventValueShape =
  | { kind: 'number' | 'string' | 'boolean' | 'point' | 'size' | 'description' }
  | { kind: 'enum'; cases: readonly string[]; open?: true }
  | { kind: 'optional' | 'array'; value: SDKEventValueShape }
  | { kind: 'object'; fields: readonly { name: string; value: SDKEventValueShape }[] }
  | { kind: 'result'; value: SDKEventValueShape }
  | { kind: 'verification' }
  | { kind: 'associatedEnum'; cases: readonly { name: string; values: readonly SDKEventValueShape[] }[]; open?: true }
const sdkAssociatedCases: Record<string, Record<string, readonly SDKEventValueShape[]>> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'eventAssociatedEnum').map((modifier) => [modifier.name, Object.fromEntries(modifier.associatedCases!.map((item) => [item.name, item.values]))])))}
const sdkEventStructs: Record<string, SDKEventValueShape> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'eventStruct' || modifier.kind === 'eventDrop' || modifier.kind === 'eventAsyncStruct' || modifier.kind === 'eventAsyncString' || modifier.kind === 'eventReturnEnum').map((modifier) => [modifier.name, modifier.eventValue])))}
const sdkAsyncArguments: Record<string, readonly { field: string; kind: string }[]> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'eventAsyncStruct' && modifier.arguments?.length).map((modifier) => [modifier.name, modifier.arguments!.map((argument) => ({ field: argument.field, kind: argument.kind }))])))}
const sdkAsyncStringFields: Record<string, { predicate: string; callback: string; selects: boolean }> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'eventAsyncString').map((modifier) => [modifier.name, { predicate: modifier.predicateLabel, callback: modifier.callbackLabel, selects: Boolean(modifier.selectionMember) }]))) }
const sdkSessionRequests: Record<string, { inputField: string; outputFields: readonly string[] }> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'sessionRequest').map((modifier) => [modifier.name, { inputField: modifier.sessionRequest!.inputField, outputFields: modifier.sessionRequest!.outputFields }]))) }
const sdkAsyncObjectRequestBindings: Record<string, string> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'asyncObjectRequest').map((modifier) => [modifier.name, modifier.predicateLabel])))}
const sdkGestureOptions: Record<string, Record<string, SDKEventValueShape | null>> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'gesture').map((modifier) => [modifier.name, Object.fromEntries(modifier.gestureOptions!.map((option) => [option.name, option.eventValue ?? null]))])))}
const sdkCodableOptional: Record<string, boolean> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'bindingCodable').map((modifier) => [modifier.name, modifier.type.endsWith('?')]))) }
const sdkRecords: Record<string, readonly { field: string; kind: string; optional: boolean; unique?: boolean; fields?: readonly { name: string; type: string; integer: boolean }[]; eventValue?: SDKEventValueShape }[]> = ${JSON.stringify(Object.fromEntries(derived.filter((modifier) => modifier.kind === 'record').map((modifier) => [modifier.name, modifier.arguments!.map(({ field, kind, optional, unique, fields, eventValue }) => ({ field, kind, optional, ...(unique ? { unique } : {}), ...(fields ? { fields: fields.map((item) => ({ name: item.name, type: item.type, integer: item.type === 'Swift.Int' })) } : {}), ...(eventValue ? { eventValue } : {}) }))])))}

export function validSDKEventValue(value: unknown, shape: SDKEventValueShape): boolean {
  if (shape.kind === 'optional') return value === null || validSDKEventValue(value, shape.value)
  if (shape.kind === 'array') return Array.isArray(value) && value.every((item) => validSDKEventValue(item, shape.value))
  if (shape.kind === 'number') return typeof value === 'number' && Number.isFinite(value)
  if (shape.kind === 'string' || shape.kind === 'description' || shape.kind === 'boolean')
    return typeof value === (shape.kind === 'description' ? 'string' : shape.kind)
  if (shape.kind === 'enum') return typeof value === 'string' &&
    (shape.cases.includes(value) || shape.open === true && value === 'unknown')
  if (shape.kind === 'verification') return Boolean(value && typeof value === 'object' &&
    ((value as { case?: unknown }).case === 'verified' || (value as { case?: unknown }).case === 'unverified') &&
    typeof (value as { jwsRepresentation?: unknown }).jwsRepresentation === 'string' &&
    ((value as { case: string; error?: unknown }).case === 'verified'
      ? (value as { error?: unknown }).error === null
      : typeof (value as { error?: unknown }).error === 'string'))
  if (shape.kind === 'result') return Boolean(value && typeof value === 'object' &&
    ((value as { case?: unknown }).case === 'success'
      ? validSDKEventValue((value as { value?: unknown }).value, shape.value)
      : (value as { case?: unknown }).case === 'failure' &&
        typeof (value as { error?: unknown }).error === 'string'))
  if (shape.kind === 'associatedEnum') {
    if (!value || typeof value !== 'object') return false
    if (shape.open && (value as { case?: unknown }).case === 'unknown')
      return Array.isArray((value as { values?: unknown }).values) &&
        (value as { values: unknown[] }).values.length === 0
    const item = shape.cases.find((entry) => entry.name === (value as { case?: unknown }).case)
    return Boolean(item && Array.isArray((value as { values?: unknown }).values) &&
      (value as { values: unknown[] }).values.length === item.values.length &&
      item.values.every((nested, index) => validSDKEventValue((value as { values: unknown[] }).values[index], nested)))
  }
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (shape.kind === 'point')
    return typeof record.x === 'number' && Number.isFinite(record.x) &&
      typeof record.y === 'number' && Number.isFinite(record.y)
  if (shape.kind === 'size')
    return typeof record.width === 'number' && Number.isFinite(record.width) &&
      typeof record.height === 'number' && Number.isFinite(record.height)
  if (shape.kind !== 'object') return false
  return shape.fields.every((field) => Object.hasOwn(record, field.name) &&
    validSDKEventValue(record[field.name], field.value))
}

${derived.some((modifier) => modifier.kind === 'bindingTextSelection') ? `type OneNativeTextRanges = readonly (readonly [start: number, end: number])[] | null

function validTextRanges(value: unknown, text: string): value is OneNativeTextRanges {
  if (value === null) return true
  if (!Array.isArray(value) || value.length === 0) return false
  let previousEnd = -1
  for (const pair of value) {
    if (!Array.isArray(pair) || pair.length !== 2) return false
    const [start, end] = pair
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || start > end || end > text.length || start <= previousEnd ||
      (value.length > 1 && start === end)) return false
    for (const offset of [start, end]) {
      const before = text.charCodeAt(offset - 1)
      const after = text.charCodeAt(offset)
      if (before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff)
        return false
    }
    previousEnd = end
  }
  return true
}

` : ''}export function swiftStyleNative(style: OneNativeStyle | undefined): OneNativeStyleNative | undefined {
  if (!style) return undefined
  const native: Record<string, unknown> = {}
  const sdkModifiers: [string, string][] = []
  for (const [name, value] of Object.entries(style)) {
    if (value === undefined) continue
    if (Object.hasOwn(sdkKinds, name)) {
      const kind = sdkKinds[name as keyof typeof sdkKinds]
      if (kind === 'record') {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error(name + ' must be a record')
        const record = value as Record<string, unknown>
        const values = sdkRecords[name].map((argument) => {
          const item = record[argument.field]
          if (argument.optional && item === null) return null
          if (argument.kind === 'bindingBoolean') {
            if (!item || typeof item !== 'object' || typeof (item as { value?: unknown }).value !== 'boolean' ||
              typeof (item as { onChange?: unknown }).onChange !== 'function')
              throw new Error(name + '.' + argument.field + ' must be a boolean binding')
            return String((item as { value: boolean }).value)
          }
          if (argument.kind === 'bindingOptionalURL') {
            if (!item || typeof item !== 'object' ||
              ((item as { value?: unknown }).value !== null && typeof (item as { value?: unknown }).value !== 'string') ||
              typeof (item as { onChange?: unknown }).onChange !== 'function')
              throw new Error(name + '.' + argument.field + ' must be a URL binding')
            return JSON.stringify((item as { value: string | null }).value)
          }
          if (argument.kind === 'resultURL' || argument.kind === 'resultURLArray' || argument.kind === 'eventStruct') {
            if (typeof item !== 'function') throw new Error(name + '.' + argument.field + ' must be a callback')
            return ''
          }
          if (argument.kind === 'classUpdate' || argument.kind === 'structUpdate') {
            if (!item || typeof item !== 'object' || Array.isArray(item) ||
              Object.keys(item).length === 0 || Object.entries(item).some(([key, fieldValue]) => {
                const field = argument.fields?.find((entry) => entry.name === key)
                return !field || (field.type === 'Swift.Bool' ? typeof fieldValue !== 'boolean' :
                  field.type.endsWith('?') && fieldValue === null ? false : typeof fieldValue !== 'string')
              })) throw new Error(name + '.' + argument.field + (argument.kind === 'classUpdate' ? ' must be an SDK class update' : ' must be an SDK struct update'))
            return JSON.stringify(item)
          }
          if (argument.kind === 'number' && (typeof item !== 'number' || !Number.isFinite(item))) throw new Error(name + '.' + argument.field + ' must be finite')
          if (argument.kind === 'boolean' && typeof item !== 'boolean') throw new Error(name + '.' + argument.field + ' must be a boolean')
          if ((argument.kind === 'string' || argument.kind === 'url' || argument.kind === 'enum') && typeof item !== 'string') throw new Error(name + '.' + argument.field + ' must be a string')
          if ((argument.kind === 'stringArray' || argument.kind === 'stringSet') && (!Array.isArray(item) || item.some((element) => typeof element !== 'string'))) throw new Error(name + '.' + argument.field + ' must be a string array')
          if (argument.unique && new Set(item as string[]).size !== (item as string[]).length) throw new Error(name + '.' + argument.field + ' must contain distinct strings')
          if (argument.kind === 'numericStruct' || argument.kind === 'numericTuple') {
            if (!item || typeof item !== 'object' || Array.isArray(item) ||
              Object.keys(item).length !== argument.fields!.length ||
              argument.fields!.some((field) => {
                const number = (item as Record<string, unknown>)[field.name]
                return typeof number !== 'number' || !Number.isFinite(number) || (field.integer && !Number.isSafeInteger(number))
              })) throw new Error(name + '.' + argument.field + ' must be a numeric object')
            return JSON.stringify(item)
          }
          return argument.kind === 'stringArray' || argument.kind === 'stringSet' ? JSON.stringify(item) : String(item)
        })
        sdkModifiers.push([name, JSON.stringify(values)])
        continue
      }
      if (kind === 'gesture') {
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          typeof (value as { kind?: unknown }).kind !== 'string' ||
          !Object.hasOwn(sdkGestureOptions[name], (value as { kind: string }).kind) ||
          typeof (value as { onEnded?: unknown }).onEnded !== 'function')
          throw new Error(name + ' must be an SDK gesture and callback')
        sdkModifiers.push([name, (value as { kind: string }).kind])
        continue
      }
      if (kind === 'visualEffect') {
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          typeof (value as { kind?: unknown }).kind !== 'string' ||
          !sdkVisualEffects[name].includes((value as { kind: string }).kind) ||
          typeof (value as { value?: unknown }).value !== 'number' ||
          !Number.isFinite((value as { value: number }).value))
          throw new Error(name + ' must be a visual effect and finite value')
        sdkModifiers.push([name, JSON.stringify([(value as { kind: string }).kind,
          String((value as { value: number }).value)])])
        continue
      }
      if (kind === 'optionSet') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error(name + ' must be an SDK option set')
        const record = value as Record<string, unknown>
        const options: Record<string, string> = {}
        for (const [field, item] of Object.entries(record)) {
          const argument = sdkOptionSets[name].find((entry) => entry.field === field)
          if (!argument) throw new Error(name + '.' + field + ' is not an SDK option')
          if (argument.kind === 'number' && (typeof item !== 'number' || !Number.isSafeInteger(item)))
            throw new Error(name + '.' + field + ' must be finite')
          if (argument.kind === 'boolean' && typeof item !== 'boolean')
            throw new Error(name + '.' + field + ' must be a boolean')
          if (argument.kind === 'string' && typeof item !== 'string')
            throw new Error(name + '.' + field + ' must be a string')
          options[field] = String(item)
        }
        sdkModifiers.push([name, JSON.stringify(options)])
        continue
      }
      if (kind === 'caseSet') {
        if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || !sdkEventCases[name].includes(item)))
          throw new Error(name + ' must be public SDK values')
        sdkModifiers.push([name, JSON.stringify(value)])
        continue
      }
      if (kind === 'bindingTextSelection') {
        const binding = value as { text?: unknown; value?: unknown; onChange?: unknown } | undefined
        if (!binding || typeof binding.text !== 'string' ||
          !validTextRanges(binding.value, binding.text) ||
          typeof binding.onChange !== 'function')
          throw new Error(name + ' must have search text, UTF-16 ranges, and an onChange callback')
        sdkModifiers.push([name, JSON.stringify([binding.text, JSON.stringify(binding.value)])])
        continue
      }
      if (kind === 'chartDescriptor') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error(name + ' must be a chart descriptor')
        const chart = value as Record<string, unknown>
        if ((chart.title !== undefined && typeof chart.title !== 'string') ||
          (chart.summary !== undefined && typeof chart.summary !== 'string') ||
          !Array.isArray(chart.series) || chart.series.some((series) => {
            if (!series || typeof series !== 'object' || Array.isArray(series)) return true
            const item = series as Record<string, unknown>
            return typeof item.name !== 'string' || typeof item.isContinuous !== 'boolean' ||
              !Array.isArray(item.points) || item.points.some((point) => {
                if (!point || typeof point !== 'object' || Array.isArray(point)) return true
                const coordinate = point as Record<string, unknown>
                return typeof coordinate.x !== 'number' || !Number.isFinite(coordinate.x) ||
                  (coordinate.y !== undefined && (typeof coordinate.y !== 'number' || !Number.isFinite(coordinate.y))) ||
                  (coordinate.label !== undefined && typeof coordinate.label !== 'string')
              })
          }) || [chart.xAxis, chart.yAxis].some((axis, index) => {
            if (index === 1 && axis === undefined) return false
            if (!axis || typeof axis !== 'object' || Array.isArray(axis)) return true
            const item = axis as Record<string, unknown>
            return typeof item.title !== 'string' || !Array.isArray(item.range) || item.range.length !== 2 ||
              item.range.some((bound) => typeof bound !== 'number' || !Number.isFinite(bound)) ||
              item.range[0] > item.range[1] ||
              (item.gridlinePositions !== undefined && (!Array.isArray(item.gridlinePositions) ||
                item.gridlinePositions.some((position) => typeof position !== 'number' || !Number.isFinite(position))))
          })) throw new Error(name + ' must contain finite axes and series points')
        sdkModifiers.push([name, JSON.stringify(value)])
        continue
      }
      if (kind === 'phaseAnimation') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error(name + ' must be a scalar phase animation')
        const config = value as Record<string, unknown>
        if (!Array.isArray(config.phases) || config.phases.length < 2 ||
          config.phases.some((phase) => !validScalarEffect(config.effect, phase)) ||
          typeof config.duration !== 'number' || !Number.isFinite(config.duration) || config.duration <= 0)
          throw new Error(name + ' must have finite phases and positive duration')
        sdkModifiers.push([name, JSON.stringify(value)])
        continue
      }
      if (kind === 'keyframeAnimation') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error(name + ' must be a scalar keyframe animation')
        const config = value as Record<string, unknown>
        if (!validScalarEffect(config.effect, config.initialValue) ||
          (config.repeating !== undefined && typeof config.repeating !== 'boolean') ||
          !Array.isArray(config.frames) || !config.frames.length ||
          config.frames.some((frame) => {
            if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return true
            const item = frame as Record<string, unknown>
            return !validScalarEffect(config.effect, item.value) ||
              typeof item.duration !== 'number' || !Number.isFinite(item.duration) || item.duration <= 0
          })) throw new Error(name + ' must have finite keyframes and positive durations')
        sdkModifiers.push([name, JSON.stringify(value)])
        continue
      }
      if (kind === 'seedKeyframeAnimation') {
        if (!value || typeof value !== 'object' || Array.isArray(value))
          throw new Error(name + ' must be a numeric keyframe animation')
        const config = value as Record<string, unknown>
        if (typeof config.trigger !== 'string' ||
          typeof config.property !== 'string' || !sdkSeedKeyframeFields[name]?.includes(config.property) ||
          !Array.isArray(config.frames) || !config.frames.length ||
          config.frames.some((frame) => {
            if (!frame || typeof frame !== 'object' || Array.isArray(frame)) return true
            const item = frame as Record<string, unknown>
            return typeof item.value !== 'number' || !Number.isFinite(item.value) ||
              typeof item.duration !== 'number' || !Number.isFinite(item.duration) || item.duration <= 0
          })) throw new Error(name + ' must have a trigger, numeric property and timed keyframes')
        sdkModifiers.push([name, JSON.stringify(value)])
        continue
      }
      if (kind === 'registeredValue') {
        if (typeof value !== 'string' || !value)
          throw new Error(name + ' must name a registered native Swift value')
        sdkModifiers.push([name, value])
        continue
      }
      if (kind === 'eventAsyncStruct' && sdkAsyncArguments[name]) {
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          typeof (value as { onAction?: unknown }).onAction !== 'function')
          throw new Error(name + ' must be an async SDK callback and arguments')
        const record = value as Record<string, unknown>
        const argumentsFromSDK = sdkAsyncArguments[name].map(({ field, kind }) => {
          const item = record[field]
          if (kind === 'stringArray') {
            if (!Array.isArray(item) || item.some((value) => typeof value !== 'string'))
              throw new Error(name + '.' + field + ' must be a string array')
            return JSON.stringify(item)
          }
          if (typeof item !== 'string') throw new Error(name + '.' + field + ' must be a string')
          return item
        })
        sdkModifiers.push([name, JSON.stringify(argumentsFromSDK)])
        continue
      }
      if (kind === 'eventAsyncString') {
        const fields = sdkAsyncStringFields[name]
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          typeof (value as Record<string, unknown>)[fields.predicate] !== (fields.selects ? 'string' : 'boolean') ||
          typeof (value as Record<string, unknown>)[fields.callback] !== 'function')
          throw new Error(name + ' must be an async string callback and SDK decision')
        sdkModifiers.push([name, String((value as Record<string, unknown>)[fields.predicate])])
        continue
      }
      if (kind === 'sessionRequest') {
        const inputField = sdkSessionRequests[name].inputField
        if (!value || typeof value !== 'object' || Array.isArray(value) ||
          typeof (value as Record<string, unknown>)[inputField] !== 'string' ||
          typeof (value as { onResult?: unknown }).onResult !== 'function')
          throw new Error(name + ' must have source text and an onResult callback')
        sdkModifiers.push([name, (value as Record<string, string>)[inputField]])
        continue
      }
      if (kind === 'pickerSelection') {
        const picker = value as { isPresented?: { value?: unknown; onChange?: unknown };
          title?: unknown; onSelection?: unknown } | undefined
        if (!picker || typeof picker !== 'object' ||
          typeof picker.isPresented?.value !== 'boolean' ||
          typeof picker.isPresented.onChange !== 'function' ||
          (picker.title !== undefined && typeof picker.title !== 'string') ||
          typeof picker.onSelection !== 'function')
          throw new Error(name + ' must have a presentation binding and selection callback')
        sdkModifiers.push([name, JSON.stringify([String(picker.isPresented.value), picker.title ?? null])])
        continue
      }
      if (kind === 'transferSelection') {
        const picker = value as { isPresented?: { value?: unknown; onChange?: unknown };
          onSelection?: unknown; onError?: unknown } | undefined
        if (!picker || typeof picker !== 'object' ||
          typeof picker.isPresented?.value !== 'boolean' ||
          typeof picker.isPresented.onChange !== 'function' ||
          typeof picker.onSelection !== 'function' || typeof picker.onError !== 'function')
          throw new Error(name + ' must have a presentation binding, selection callback, and error callback')
        sdkModifiers.push([name, String(picker.isPresented.value)])
        continue
      }
      if (kind === 'eventDrop') {
        const record = value as { of?: unknown; onDrop?: unknown } | undefined
        if (!record || !Array.isArray(record.of) || record.of.length === 0 ||
          record.of.some((item) => typeof item !== 'string' || !item) ||
          typeof record.onDrop !== 'function')
          throw new Error(name + ' must have content types and an onDrop callback')
        sdkModifiers.push([name, JSON.stringify(record.of)])
        continue
      }
      if (kind === 'eventNotification') {
        const record = value as { name?: unknown; onAction?: unknown } | undefined
        if (!record || typeof record.name !== 'string' || !record.name ||
          typeof record.onAction !== 'function')
          throw new Error(name + ' must have a notification name and an onAction callback')
        sdkModifiers.push([name, record.name])
        continue
      }
      if (kind === 'dragSelection') {
        if (!Array.isArray(value) || value.some((item) => typeof item !== 'string'))
          throw new Error(name + ' must be an array of string IDs')
        sdkModifiers.push([name, JSON.stringify(value)])
        continue
      }
      if (kind === 'asyncObjectRequest') {
        const record = value as Record<string, unknown> | undefined
        const binding = record?.[sdkAsyncObjectRequestBindings[name]] as { value?: unknown; onChange?: unknown } | undefined
        if (!record || !binding || typeof binding.value !== 'boolean' ||
          typeof binding.onChange !== 'function' ||
          typeof record.latitude !== 'number' || !Number.isFinite(record.latitude) ||
          record.latitude < -90 || record.latitude > 90 ||
          typeof record.longitude !== 'number' || !Number.isFinite(record.longitude) ||
          record.longitude < -180 || record.longitude > 180)
          throw new Error(name + ' must have a presentation binding and valid coordinates')
        sdkModifiers.push([name, JSON.stringify([String(binding.value), String(record.latitude), String(record.longitude)])])
        continue
      }
      if (kind === 'number' && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(name + ' must be finite')
      if (kind === 'optionalNumber' && value !== null && (typeof value !== 'number' || !Number.isFinite(value))) throw new Error(name + ' must be finite or null')
      if ((kind === 'boolean' || kind === 'defaultFocusBoolean') && typeof value !== 'boolean') throw new Error(name + ' must be a boolean')
      if (kind === 'dragContainer' && typeof value !== 'boolean') throw new Error(name + ' must be a boolean')
      if (kind === 'dragItemID' && typeof value !== 'string') throw new Error(name + ' must be a string ID')
      if (kind === 'optionalBoolean' && value !== null && typeof value !== 'boolean') throw new Error(name + ' must be a boolean or null')
      if (kind === 'string' && typeof value !== 'string') throw new Error(name + ' must be a string')
      if (kind === 'equatableKey' && typeof value !== 'string') throw new Error(name + ' must be an equality key')
      if (kind === 'selectionID' && typeof value !== 'string') throw new Error(name + ' must be a string')
      if (kind === 'selectionIndex' && (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)) throw new Error(name + ' must be a nonnegative index')
      if (kind === 'url' && typeof value !== 'string') throw new Error(name + ' must be a URL string')
      if (kind === 'optionalURL' && value !== null && typeof value !== 'string') throw new Error(name + ' must be a URL string or null')
      if (kind === 'optionalEnum' && value !== null && typeof value !== 'string') throw new Error(name + ' must be a string or null')
      if (kind === 'optionalString' && value !== null && typeof value !== 'string') throw new Error(name + ' must be a string or null')
      if (kind.startsWith('event') && kind !== 'eventValueString' && kind !== 'eventReturnArray' && kind !== 'eventReturnEnum' && typeof value !== 'function') throw new Error(name + ' must be a callback')
      if (kind === 'eventValueString' && (typeof value !== 'object' || value === null || typeof (value as { value?: unknown }).value !== 'string' || typeof (value as { onChange?: unknown }).onChange !== 'function')) throw new Error(name + ' must be a string value and callback')
      if (kind === 'eventReturnArray' && (typeof value !== 'object' || value === null || !Array.isArray((value as { items?: unknown }).items) ||
        !(value as { items: unknown[] }).items.every((item) => typeof item === 'string') || typeof (value as { onAction?: unknown }).onAction !== 'function'))
        throw new Error(name + ' must be a string array and callback')
      if (kind === 'eventReturnEnum' && (typeof value !== 'object' || value === null ||
        typeof (value as { result?: unknown }).result !== 'string' ||
        !sdkEventCases[name].includes((value as { result: string }).result) ||
        typeof (value as { onAction?: unknown }).onAction !== 'function'))
        throw new Error(name + ' must be an SDK result and callback')
      if ((kind === 'bindingBoolean' || kind === 'bindingFocusBoolean' || kind === 'bindingString' || kind === 'bindingOptionalString' || kind === 'bindingCodable') &&
        (typeof value !== 'object' || value === null || typeof (value as { onChange?: unknown }).onChange !== 'function' ||
        (kind === 'bindingOptionalString' || kind === 'bindingCodable' && sdkCodableOptional[name] ? (value as { value?: unknown }).value !== null && typeof (value as { value?: unknown }).value !== 'string' :
          typeof (value as { value?: unknown }).value !== (kind === 'bindingBoolean' || kind === 'bindingFocusBoolean' ? 'boolean' : 'string'))))
        throw new Error(name + ' must be a binding')
      if (kind === 'bindingCodable' && (value as { value: string | null }).value !== null) JSON.parse((value as { value: string }).value)
      if (kind === 'bindingPoint' &&
        (typeof value !== 'object' || value === null || typeof (value as { onChange?: unknown }).onChange !== 'function' ||
          ((value as { value?: unknown }).value !== null &&
            !validSDKEventValue((value as { value?: unknown }).value, { kind: 'point' }))))
        throw new Error(name + ' must be a point binding')
      sdkModifiers.push([name, kind === 'eventValueString' ? (value as { value: string }).value : kind === 'eventReturnArray' ? JSON.stringify((value as { items: string[] }).items) : kind === 'eventReturnEnum' ? (value as { result: string }).result : kind.startsWith('event') ? '' : kind === 'bindingOptionalString' || kind === 'bindingPoint' ? JSON.stringify((value as { value: unknown }).value) : kind === 'bindingCodable' && (value as { value: string | null }).value === null ? 'null' : kind.startsWith('binding') ? String((value as { value: unknown }).value) : kind === 'optionalString' || kind === 'optionalURL' ? JSON.stringify(value) as string : String(value)])
    } else if (colorFields.includes(name as (typeof colorFields)[number])) {
      native[name] = processColor(value as ColorValue) ?? undefined
    } else {
      native[name] = value
    }
  }
  if (sdkModifiers.length) native.sdkModifiers = JSON.stringify(sdkModifiers)
  return native as OneNativeStyleNative
}

export function dispatchSDKEvent(style: OneNativeStyle | undefined, name: string, value: string): void {
  const separator = name.indexOf('.')
  if (separator !== -1) {
    const parent = name.slice(0, separator)
    const field = name.slice(separator + 1)
    if (sdkKinds[parent as keyof typeof sdkKinds] === 'pickerSelection') {
      const picker = (style as Record<string, unknown> | undefined)?.[parent] as {
        isPresented: { onChange: (value: boolean) => void }; onSelection: (id: string) => void
      } | undefined
      if (field === 'isPresented') {
        if (value !== 'true' && value !== 'false') throw new Error(name + ' emitted an invalid boolean')
        picker?.isPresented.onChange(value === 'true')
      } else if (field === 'onSelection') picker?.onSelection(value)
      else throw new Error(name + ' emitted an invalid picker event')
      return
    }
    if (sdkKinds[parent as keyof typeof sdkKinds] === 'transferSelection') {
      const picker = (style as Record<string, unknown> | undefined)?.[parent] as {
        isPresented: { onChange: (value: boolean) => void }
        onSelection: (url: string) => void
        onError: (message: string) => void
        onItemIdentifier?: (id: string) => void
      } | undefined
      if (field === 'isPresented') {
        if (value !== 'true' && value !== 'false') throw new Error(name + ' emitted an invalid boolean')
        picker?.isPresented.onChange(value === 'true')
      } else if (field === 'onSelection') picker?.onSelection(value)
      else if (field === 'onError') picker?.onError(value)
      else if (field === 'onItemIdentifier') picker?.onItemIdentifier?.(value)
      else throw new Error(name + ' emitted an invalid transfer event')
      return
    }
    if (sdkRecords[parent]?.some((argument) => argument.field === field && argument.kind === 'bindingBoolean')) {
      if (value !== 'true' && value !== 'false') throw new Error(name + ' emitted an invalid boolean')
      const record = (style as Record<string, unknown> | undefined)?.[parent] as Record<string, unknown> | undefined
      ;(record?.[field] as { onChange: (value: boolean) => void } | undefined)?.onChange(value === 'true')
      return
    }
    if (sdkRecords[parent]?.some((argument) => argument.field === field && argument.kind === 'bindingOptionalURL')) {
      const decoded: unknown = JSON.parse(value)
      if (decoded !== null && typeof decoded !== 'string') throw new Error(name + ' emitted an invalid URL')
      const record = (style as Record<string, unknown> | undefined)?.[parent] as Record<string, unknown> | undefined
      ;(record?.[field] as { onChange: (value: string | null) => void } | undefined)?.onChange(decoded)
      return
    }
    const result = sdkRecords[parent]?.find((argument) => argument.field === field &&
      (argument.kind === 'resultURL' || argument.kind === 'resultURLArray'))
    if (result) {
      const decoded: unknown = JSON.parse(value)
      if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) throw new Error(name + ' emitted an invalid result')
      const payload = decoded as Record<string, unknown>
      const success = payload.success
      const failure = payload.failure
      const validSuccess = result.kind === 'resultURL' ? typeof success === 'string' :
        Array.isArray(success) && success.every((item) => typeof item === 'string')
      if (!(validSuccess && failure === undefined || success === undefined && typeof failure === 'string') ||
        Object.keys(payload).length !== 1) throw new Error(name + ' emitted an invalid result')
      const record = (style as Record<string, unknown> | undefined)?.[parent] as Record<string, unknown> | undefined
      ;(record?.[field] as ((result: unknown) => void) | undefined)?.(payload)
      return
    }
    const event = sdkRecords[parent]?.find((argument) => argument.field === field && argument.kind === 'eventStruct')
    if (event) {
      const payload: unknown = JSON.parse(value)
      if (!validSDKEventValue(payload, event.eventValue!))
        throw new Error(name + ' emitted an invalid struct value')
      const record = (style as Record<string, unknown> | undefined)?.[parent] as Record<string, unknown> | undefined
      ;(record?.[field] as ((value: unknown) => void) | undefined)?.(payload)
      return
    }
  }
  const modifier = (style as Record<string, unknown> | undefined)?.[name]
  const kind = sdkKinds[name as keyof typeof sdkKinds] as string | undefined
  if (kind === 'gesture') {
    const config = modifier as { kind: string; onEnded: (value?: unknown) => void } | undefined
    const shape = config && sdkGestureOptions[name]?.[config.kind]
    if (shape === undefined) throw new Error(name + ' emitted an invalid gesture')
    if (shape === null) {
      if (value !== '') throw new Error(name + ' emitted an invalid gesture event')
      config?.onEnded()
    } else {
      const payload: unknown = JSON.parse(value)
      if (!validSDKEventValue(payload, shape)) throw new Error(name + ' emitted an invalid gesture event')
      config?.onEnded(payload)
    }
  }
  else if (kind === 'event') (modifier as (() => void) | undefined)?.()
  else if (kind === 'eventAsync') {
    const native = NativeModules.OneNativeAsyncActionModule as { complete(identifier: string): void } | undefined
    if (!native) throw new Error('OneNativeAsyncActionModule is unavailable')
    void Promise.resolve().then(() => (modifier as (() => void | Promise<void>) | undefined)?.())
      .finally(() => native.complete(value))
  }
  else if (kind === 'eventAsyncStruct') {
    const native = NativeModules.OneNativeAsyncActionModule as { complete(identifier: string): void } | undefined
    if (!native) throw new Error('OneNativeAsyncActionModule is unavailable')
    const envelope: unknown = JSON.parse(value)
    if (!envelope || typeof envelope !== 'object' ||
      typeof (envelope as { id?: unknown }).id !== 'string' ||
      typeof (envelope as { value?: unknown }).value !== 'string')
      throw new Error(name + ' emitted an invalid async event')
    const identifier = (envelope as { id: string }).id
    const payload: unknown = JSON.parse((envelope as { value: string }).value)
    if (!validSDKEventValue(payload, sdkEventStructs[name]))
      throw new Error(name + ' emitted an invalid async value')
    const action = typeof modifier === 'function' ? modifier :
      (modifier as { onAction?: (value: unknown) => void | Promise<void> } | undefined)?.onAction
    void Promise.resolve().then(() => action?.(payload))
      .finally(() => native.complete(identifier))
  }
  else if (kind === 'eventAsyncString') {
    const native = NativeModules.OneNativeAsyncActionModule as {
      completeString(identifier: string, value: string | null, error: string | null): void
    } | undefined
    if (!native) throw new Error('OneNativeAsyncActionModule is unavailable')
    const envelope: unknown = JSON.parse(value)
    if (!envelope || typeof envelope !== 'object' ||
      typeof (envelope as { id?: unknown }).id !== 'string' ||
      typeof (envelope as { value?: unknown }).value !== 'string')
      throw new Error(name + ' emitted an invalid async string event')
    const identifier = (envelope as { id: string }).id
    try {
      const payload: unknown = JSON.parse((envelope as { value: string }).value)
      if (!validSDKEventValue(payload, sdkEventStructs[name]))
        throw new Error(name + ' emitted an invalid async string value')
      const action = (modifier as Record<string, unknown> | undefined)?.[sdkAsyncStringFields[name].callback] as
        ((value: unknown) => string | Promise<string>) | undefined
      void Promise.resolve().then(() => action?.(payload)).then((result) => {
        if (typeof result !== 'string') throw new Error(name + ' must return a string')
        native.completeString(identifier, result, null)
      }).catch((error) => native.completeString(identifier, null, String(error)))
    } catch (error) {
      native.completeString(identifier, null, String(error))
      throw error
    }
  }
  else if (kind === 'sessionRequest') {
    const payload: unknown = JSON.parse(value)
    if (!payload || typeof payload !== 'object' || Array.isArray(payload))
      throw new Error(name + ' emitted an invalid session response')
    const result = payload as Record<string, unknown>
    const fields = sdkSessionRequests[name].outputFields
    const success = result.error === null && fields.every((field) => typeof result[field] === 'string')
    const failure = typeof result.error === 'string' && fields.every((field) => result[field] === null)
    if (!success && !failure) throw new Error(name + ' emitted an invalid session response')
    ;(modifier as { onResult: (value: unknown) => void } | undefined)?.onResult(result)
  }
  else if (kind === 'eventReturnArray') (modifier as { onAction: () => void } | undefined)?.onAction()
  else if (kind === 'eventReturnEnum') {
    const payload: unknown = JSON.parse(value)
    if (!validSDKEventValue(payload, sdkEventStructs[name]))
      throw new Error(name + ' emitted an invalid result event')
    ;(modifier as { onAction: (value: unknown) => void } | undefined)?.onAction(payload)
  }
  else if (kind === 'eventBoolean') {
    if (value !== 'true' && value !== 'false') throw new Error(name + ' emitted an invalid boolean')
    ;(modifier as ((value: boolean) => void) | undefined)?.(value === 'true')
  }
  else if (kind === 'eventNumber') {
    const number = Number(value)
    if (!Number.isFinite(number)) throw new Error(name + ' emitted an invalid number')
    ;(modifier as ((value: number) => void) | undefined)?.(number)
  }
  else if (kind === 'eventString') (modifier as ((value: string) => void) | undefined)?.(value)
  else if (kind === 'eventEnum') {
    if (!sdkEventCases[name].includes(value)) throw new Error(name + ' emitted an invalid enum value')
    ;(modifier as ((value: string) => void) | undefined)?.(value)
  }
  else if (kind === 'eventEnumPair') {
    const pair: unknown = JSON.parse(value)
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some((item) => typeof item !== 'string' || !sdkEventCases[name].includes(item)))
      throw new Error(name + ' emitted invalid enum values')
    ;(modifier as ((oldValue: string, newValue: string) => void) | undefined)?.(pair[0], pair[1])
  }
  else if (kind === 'eventAssociatedEnum') {
    const payload: unknown = JSON.parse(value)
    if (!payload || typeof payload !== 'object') throw new Error(name + ' emitted an invalid enum payload')
    const event = payload as { case?: unknown; values?: unknown }
    const kinds = typeof event.case === 'string' ? sdkAssociatedCases[name]?.[event.case] : undefined
    if (!kinds || !Array.isArray(event.values) || event.values.length !== kinds.length)
      throw new Error(name + ' emitted an invalid enum case')
    for (const [index, item] of event.values.entries()) {
      if (!validSDKEventValue(item, kinds[index]))
        throw new Error(name + ' emitted an invalid ' + kinds[index].kind)
    }
    ;(modifier as ((value: unknown) => void) | undefined)?.(event)
  }
  else if (kind === 'eventStruct') {
    const payload: unknown = JSON.parse(value)
    if (!validSDKEventValue(payload, sdkEventStructs[name]))
      throw new Error(name + ' emitted an invalid struct value')
    ;(modifier as ((value: unknown) => void) | undefined)?.(payload)
  }
  else if (kind === 'eventDrop') {
    const payload: unknown = JSON.parse(value)
    if (!validSDKEventValue(payload, sdkEventStructs[name]))
      throw new Error(name + ' emitted an invalid drop value')
    ;(modifier as { onDrop: (value: unknown) => void } | undefined)?.onDrop(payload)
  }
  else if (kind === 'eventNotification') {
    if (value !== '') throw new Error(name + ' emitted an invalid notification event')
    ;(modifier as { onAction: () => void } | undefined)?.onAction()
  }
  else if (kind === 'asyncObjectRequest') {
    if (value !== 'true' && value !== 'false') throw new Error(name + ' emitted an invalid presentation value')
    const binding = (modifier as Record<string, unknown> | undefined)?.[sdkAsyncObjectRequestBindings[name]] as
      { onChange: (value: boolean) => void } | undefined
    binding?.onChange(value === 'true')
  }
  else if (kind === 'bindingBoolean' || kind === 'bindingFocusBoolean') {
    if (value !== 'true' && value !== 'false') throw new Error(name + ' emitted an invalid boolean')
    ;(modifier as { onChange: (value: boolean) => void } | undefined)?.onChange(value === 'true')
  }
  else if (kind === 'bindingString' || kind === 'bindingCodable') (modifier as { onChange: (value: string) => void } | undefined)?.onChange(value)
  else if (kind === 'bindingOptionalString') {
    const decoded: unknown = JSON.parse(value)
    if (decoded !== null && typeof decoded !== 'string') throw new Error(name + ' emitted an invalid optional string')
    ;(modifier as { onChange: (value: string | null) => void } | undefined)?.onChange(decoded)
  }
  else if (kind === 'bindingPoint') {
    const decoded: unknown = JSON.parse(value)
    if (decoded !== null && !validSDKEventValue(decoded, { kind: 'point' }))
      throw new Error(name + ' emitted an invalid point')
    ;(modifier as { onChange: (value: { x: number; y: number } | null) => void } | undefined)?.onChange(decoded as { x: number; y: number } | null)
  }
  else if (kind === 'bindingTextSelection') {
    const binding = modifier as { text: string; onChange: (value: OneNativeTextRanges) => void } | undefined
    if (!binding) return
    const decoded: unknown = JSON.parse(value)
    if (!validTextRanges(decoded, binding.text)) throw new Error(name + ' emitted invalid UTF-16 ranges')
    binding.onChange(decoded)
  }
  else if (kind === 'eventValueString') (modifier as { onChange: (value: string) => void } | undefined)?.onChange(value)
}
`
  )
  const properties = styleFields
    .map((field) => {
      switch (field.kind) {
        case 'number':
          return `  public var ${field.name}: CGFloat?`
        case 'string':
          return `  public var ${field.name}: String?`
        case 'boolean':
          return `  public var ${field.name}: Bool?`
        case 'color':
          return `  public var ${field.name}: UIColor?`
      }
    })
    .join('\n')

  const dictionaryParsers = styleFields
    .map((field) => {
      switch (field.kind) {
        case 'number':
          return `    if let v = dictionary["${field.name}"] as? Double { self.${field.name} = CGFloat(v) }`
        case 'string':
          return `    if let v = dictionary["${field.name}"] as? String, !v.isEmpty { self.${field.name} = v }`
        case 'boolean':
          return `    if let v = dictionary["${field.name}"] as? Bool { self.${field.name} = v }`
        case 'color':
          return `    if let v = dictionary["${field.name}"] as? UIColor { self.${field.name} = v }`
      }
    })
    .join('\n')

  outputs.set(
    'ios/OneNativeStyle.swift',
    header +
      `import SwiftUI
import UIKit
import Combine
${derived.some((modifier) => modifier.registeredProtocol?.includes('Observation.Observable')) ? 'import Observation' : ''}
${frameworkImports.map((framework) => `import ${framework}`).join('\n')}

${derived.some((modifier) => modifier.kind === 'registeredValue') ? `@MainActor public enum OneNativeRegisteredValue {
  private static var values: [String: Any] = [:]

  public static func register(_ value: Any, for name: String) { values[name] = value }
  public static func unregister(_ name: String) { values.removeValue(forKey: name) }
  static func value(_ name: String) -> Any? { values[name] }
}
` : ''}
${derived.some((modifier) => modifier.registeredFactory) ? `@MainActor public struct OneNativeRegisteredModifier {
  enum Kind { case layoutValue, containerValue }
  let kind: Kind
  let apply: (AnyView) -> AnyView

  @available(iOS 16, *)
  public static func layoutValue<K: LayoutValueKey>(key: K.Type, value: K.Value) -> Self {
    Self(kind: .layoutValue) { AnyView($0.layoutValue(key: key, value: value)) }
  }

  @available(iOS 18, *)
  public static func containerValue<V>(_ keyPath: WritableKeyPath<ContainerValues, V>, _ value: V) -> Self {
    Self(kind: .containerValue) { AnyView($0.containerValue(keyPath, value)) }
  }
}
` : ''}
${derived.some((modifier) => modifier.namespaceParameter || modifier.kind === 'dragContainer' || modifier.kind === 'dragSelection' || modifier.kind === 'dragItemID') ? 'private enum OneNativeNamespace { static let id = Namespace().wrappedValue }\n' : ''}
${derived.some((modifier) => modifier.arguments?.some((argument) => argument.type === '[OneNativeRotorEntry]')) ? 'private struct OneNativeRotorEntry: Identifiable { let id: String; var label: String { id } }\n' : ''}
${derived.filter((modifier) => modifier.kind === 'equatableKey').map((modifier) => sdkGuard(modifier.ios, `@available(iOS ${modifier.ios}, *)
private struct OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}KeyView<Content: View>: View, Equatable {
  let key: String
  let content: Content
  static func == (lhs: Self, rhs: Self) -> Bool { lhs.key == rhs.key }
  var body: some View { content }
}`, '')).join('\n')}
${derived.some((modifier) => modifier.preferenceKey === 'OneNativeSDKRectAnchorKey') ? `private struct OneNativeSDKRectAnchorKey: PreferenceKey {
  static var defaultValue: Anchor<CGRect>? { nil }
  static func reduce(value: inout Anchor<CGRect>?, nextValue: () -> Anchor<CGRect>?) {
    value = nextValue() ?? value
  }
}` : ''}
${derived.some((modifier) => modifier.kind === 'phaseAnimation' || modifier.kind === 'keyframeAnimation') ? `private struct OneNativeSDKScalarEffect: ViewModifier {
  let effect: String
  let value: Double

  static func valid(_ effect: String, _ value: Double) -> Bool {
    value.isFinite && (effect == "opacity" ? value >= 0 && value <= 1 :
      (effect == "scale" || effect == "blur") && value >= 0)
  }

  @ViewBuilder func body(content: Content) -> some View {
    if effect == "opacity" { content.opacity(value) }
    else if effect == "scale" { content.scaleEffect(value) }
    else { content.blur(radius: value) }
  }
}` : ''}
${derived.some((modifier) => modifier.kind === 'phaseAnimation') ? `private struct OneNativeSDKPhaseAnimation: Codable, Sendable {
  let effect: String
  let phases: [Double]
  let duration: Double
}` : ''}
${derived.some((modifier) => modifier.kind === 'keyframeAnimation') ? `private struct OneNativeSDKKeyframeAnimation: Codable, Sendable {
  struct Frame: Codable, Sendable {
    let value: Double
    let duration: Double
  }

  let effect: String
  let initialValue: Double
  let frames: [Frame]
  let repeating: Bool?
}` : ''}
${derived.some((modifier) => modifier.kind === 'seedKeyframeAnimation') ? `private struct OneNativeSDKSeedKeyframeAnimation: Codable, Sendable {
  struct Frame: Codable, Sendable {
    let value: Double
    let duration: Double
  }

  let trigger: String
  let property: String
  let frames: [Frame]
}` : ''}
${derived.some((modifier) => modifier.kind === 'chartDescriptor') ? `private struct OneNativeSDKChartDescriptor: Codable, AXChartDescriptorRepresentable {
  struct Axis: Codable {
    let title: String
    let range: [Double]
    let gridlinePositions: [Double]?

    var descriptor: AXNumericDataAxisDescriptor {
      precondition(range.count == 2 && range[0].isFinite && range[1].isFinite && range[0] <= range[1])
      return AXNumericDataAxisDescriptor(title: title, range: range[0]...range[1],
        gridlinePositions: gridlinePositions ?? []) { String($0) }
    }
  }

  struct Point: Codable {
    let x: Double
    let y: Double?
    let label: String?
  }

  struct Series: Codable {
    let name: String
    let isContinuous: Bool
    let points: [Point]
  }

  let title: String?
  let summary: String?
  let xAxis: Axis
  let yAxis: Axis?
  let series: [Series]

  func makeChartDescriptor() -> AXChartDescriptor {
    AXChartDescriptor(title: title, summary: summary, xAxis: xAxis.descriptor,
      yAxis: yAxis?.descriptor, series: series.map { entry in
        AXDataSeriesDescriptor(name: entry.name, isContinuous: entry.isContinuous,
          dataPoints: entry.points.map { AXDataPoint(x: $0.x, y: $0.y, label: $0.label) })
      })
  }
}` : ''}
${derived.some((modifier) => modifier.uiRecognizer) ? `@available(iOS 18, *)
@MainActor private struct OneNativeSDKTapRecognizer: UIGestureRecognizerRepresentable {
  let onTap: () -> Void
  func makeUIGestureRecognizer(context: Context) -> UITapGestureRecognizer { UITapGestureRecognizer() }
  func handleUIGestureRecognizerAction(_ recognizer: UITapGestureRecognizer, context: Context) {
    if recognizer.state == .ended { onTap() }
  }
}
` : ''}
${derived.filter((modifier) => modifier.kind === 'pickerSelection').map((modifier) => sdkGuard(modifier.ios, `@available(iOS ${modifier.ios}, *)
private struct OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}Picker: ViewModifier {
  let presented: Bool
  let title: String?
  let emit: (String, String) -> Void
  @State private var selection: ${modifier.pickerSelection!.selectionType}? = nil

  func body(content: Content) -> some View {
    content.${modifier.sdkName ?? modifier.name}(
      ${modifier.pickerSelection!.presentedLabel}: Binding(get: { presented }, set: { emit(${JSON.stringify(`${modifier.name}.isPresented`)}, String($0)) }),
      ${modifier.pickerSelection!.titleLabel}: title.map { Text($0) },
      ${modifier.pickerSelection!.selectionLabel}: $selection
    ).onChange(of: selection) { _, next in
      guard let next else { return }
      emit(${JSON.stringify(`${modifier.name}.onSelection`)}, next.${modifier.pickerSelection!.idField}.${modifier.pickerSelection!.rawField})
      selection = nil
    }
  }
}`, '')).join('\n')}
${derived.filter((modifier) => modifier.kind === 'transferSelection').map((modifier) => sdkGuard(modifier.ios, `@available(iOS ${modifier.ios}, *)
private struct OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}Transfer: ViewModifier {
  let presented: Bool
  let emit: (String, String) -> Void
  @State private var selection: ${modifier.transferSelection!.itemType}? = nil

  func body(content: Content) -> some View {
    content.${modifier.sdkName ?? modifier.name}(
      ${modifier.transferSelection!.presentedLabel}: Binding(get: { presented }, set: { emit(${JSON.stringify(`${modifier.name}.isPresented`)}, String($0)) }),
      ${modifier.transferSelection!.selectionLabel}: $selection
    ).onChange(of: selection) { _, next in
      guard let next else { return }
      ${modifier.transferSelection!.identifierField ? `if let id = next.${modifier.transferSelection!.identifierField} {
        emit(${JSON.stringify(`${modifier.name}.onItemIdentifier`)}, id)
      }` : ''}
      selection = nil
      Task { @MainActor in
        do {
          guard let data = try await next.loadTransferable(type: Data.self) else {
            emit(${JSON.stringify(`${modifier.name}.onError`)}, "the picked item carries no data")
            return
          }
          let url = try oneNativePickerFile(data, extension: next.${modifier.transferSelection!.contentTypesField}.first?.preferredFilenameExtension ?? "dat")
          emit(${JSON.stringify(`${modifier.name}.onSelection`)}, url.absoluteString)
        } catch {
          emit(${JSON.stringify(`${modifier.name}.onError`)}, error.localizedDescription)
        }
      }
    }
  }
}`, '')).join('\n')}
${derived.filter((modifier) => modifier.kind === 'asyncObjectRequest').map((modifier) => `@available(iOS ${modifier.ios}, *)
@MainActor private struct OneNativeSDK${modifier.name[0].toUpperCase() + modifier.name.slice(1)}Request: ViewModifier {
  let latitude: Double
  let longitude: Double
  let presented: Bool
  let emit: (String, String) -> Void
  @State private var object: ${modifier.type}

  func body(content: Content) -> some View {
    content
      .task(id: "\\(latitude),\\(longitude),\\(presented)") {
        guard presented else { object = nil; return }
        do {
          let request = ${modifier.requestType}(coordinate: CLLocationCoordinate2D(latitude: latitude, longitude: longitude))
          let next = try await request.${modifier.requestProperty}
          guard !Task.isCancelled else { return }
          object = next
          if next == nil { emit(${JSON.stringify(modifier.name)}, "false") }
        } catch {
          guard !Task.isCancelled else { return }
          object = nil
          emit(${JSON.stringify(modifier.name)}, "false")
        }
      }
      .${modifier.sdkName ?? modifier.name}(${modifier.predicateLabel}: Binding(
        get: { presented && object != nil },
        set: { emit(${JSON.stringify(modifier.name)}, String($0)) }
      ), ${modifier.label}: object)
  }
}`).join('\n\n')}

public struct OneNativeStyle: Equatable {
${properties}
  public var sdkModifiers: [[String]] = []

  public init() {}

  public init(dictionary: [String: Any]) {
${dictionaryParsers}
    if let json = dictionary["sdkModifiers"] as? String {
      guard let data = json.data(using: .utf8),
        let pairs = try? JSONDecoder().decode([[String]].self, from: data),
        pairs.allSatisfy({ $0.count == 2 }) else {
        preconditionFailure("invalid sdk modifiers")
      }
      sdkModifiers = pairs
    }
  }
}

extension View {
  public func oneNativeStyle(_ style: OneNativeStyle, emit: @escaping (String, String) -> Void = { _, _ in }) -> some View {
    var view = AnyView(self
      .oneNativeFont(style)
      .oneNativeForegroundStyle(style.foregroundStyle)
      .oneNativeTint(style.tint)
      .oneNativePadding(style)
      .oneNativeFrame(style)
      .oneNativeBackground(style.background)
      .oneNativeGlassEffect(style)
      .oneNativeCornerRadius(style.cornerRadius)
      .oneNativeOpacity(style.opacity)
      .oneNativeBorder(color: style.borderColor, width: style.borderWidth))
    for pair in style.sdkModifiers {
      let name = pair[0]
      let value = pair[1]
      switch name {
${generatedCalls}
      default: preconditionFailure("unknown sdk modifier: \\(name)")
      }
    }
    return view
  }

  @ViewBuilder fileprivate func oneNativeFont(_ style: OneNativeStyle) -> some View {
    if let font = style.resolveFont() {
      self.font(font)
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeForegroundStyle(_ color: UIColor?) -> some View {
    if let color = color {
      self.foregroundStyle(Color(uiColor: color))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeTint(_ color: UIColor?) -> some View {
    if let color = color {
      self.tint(Color(uiColor: color))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativePadding(_ style: OneNativeStyle) -> some View {
    if let p = style.padding {
      if p < 0 {
        preconditionFailure("invalid padding: \\(p)")
      }
      self.padding(p)
    } else if style.paddingTop != nil || style.paddingLeading != nil || style.paddingBottom != nil || style.paddingTrailing != nil {
      let top = style.paddingTop ?? 0
      let leading = style.paddingLeading ?? 0
      let bottom = style.paddingBottom ?? 0
      let trailing = style.paddingTrailing ?? 0
      if top < 0 || leading < 0 || bottom < 0 || trailing < 0 {
        preconditionFailure("invalid padding insets: (\\(top), \\(leading), \\(bottom), \\(trailing))")
      }
      self.padding(EdgeInsets(top: top, leading: leading, bottom: bottom, trailing: trailing))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeFrame(_ style: OneNativeStyle) -> some View {
    let hasExact = style.width != nil || style.height != nil
    let hasFlexible = style.minWidth != nil || style.idealWidth != nil || style.maxWidth != nil ||
                      style.minHeight != nil || style.idealHeight != nil || style.maxHeight != nil
    if hasExact && hasFlexible {
      self.frame(
        minWidth: style.minWidth,
        idealWidth: style.idealWidth,
        maxWidth: style.maxWidth,
        minHeight: style.minHeight,
        idealHeight: style.idealHeight,
        maxHeight: style.maxHeight
      ).frame(width: style.width, height: style.height)
    } else if hasExact {
      self.frame(width: style.width, height: style.height)
    } else if hasFlexible {
      self.frame(
        minWidth: style.minWidth,
        idealWidth: style.idealWidth,
        maxWidth: style.maxWidth,
        minHeight: style.minHeight,
        idealHeight: style.idealHeight,
        maxHeight: style.maxHeight
      )
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeBackground(_ color: UIColor?) -> some View {
    if let color = color {
      self.background(Color(uiColor: color))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeCornerRadius(_ radius: CGFloat?) -> some View {
    if let radius = radius {
      if radius < 0 {
        preconditionFailure("invalid cornerRadius: \\(radius)")
      }
      self.clipShape(RoundedRectangle(cornerRadius: radius))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeOpacity(_ opacity: CGFloat?) -> some View {
    if let opacity = opacity {
      if opacity < 0.0 || opacity > 1.0 {
        preconditionFailure("invalid opacity: \\(opacity)")
      }
      self.opacity(Double(opacity))
    } else {
      self
    }
  }

  @ViewBuilder fileprivate func oneNativeBorder(color: UIColor?, width: CGFloat?) -> some View {
    if let color = color {
      let w = width ?? 1
      if w < 0 {
        preconditionFailure("invalid borderWidth: \\(w)")
      }
      self.border(Color(uiColor: color), width: w)
    } else if let width = width {
      if width < 0 {
        preconditionFailure("invalid borderWidth: \\(width)")
      }
      self
    } else {
      self
    }
  }
}

extension OneNativeStyle {
  func resolveFont() -> Font? {
    let weight = fontWeight.map(OneNativeStyle.resolveWeight)
    let design = fontDesign.map(OneNativeStyle.resolveDesign)

    if let size = fontSize {
      if size <= 0 {
        preconditionFailure("invalid fontSize: \\(size)")
      }
      return Font.system(size: size, weight: weight, design: design)
    }
    if let textStyleStr = textStyle {
      let textStyle = OneNativeStyle.resolveTextStyle(textStyleStr)
      return Font.system(textStyle, design: design, weight: weight)
    }
    if weight != nil || design != nil {
      return Font.system(size: UIFont.buttonFontSize, weight: weight, design: design)
    }
    return nil
  }

  static func resolveWeight(_ string: String) -> Font.Weight {
    switch string.lowercased() {
    case "ultralight": return .ultraLight
    case "thin": return .thin
    case "light": return .light
    case "regular": return .regular
    case "medium": return .medium
    case "semibold": return .semibold
    case "bold": return .bold
    case "heavy": return .heavy
    case "black": return .black
    default: preconditionFailure("invalid FontWeight: \\(string)")
    }
  }

  static func resolveDesign(_ string: String) -> Font.Design {
    switch string.lowercased() {
    case "default": return .default
    case "serif": return .serif
    case "rounded": return .rounded
    case "monospaced": return .monospaced
    default: preconditionFailure("invalid FontDesign: \\(string)")
    }
  }

  static func resolveTextStyle(_ string: String) -> Font.TextStyle {
    switch string.lowercased() {
    case "largetitle": return .largeTitle
    case "title": return .title
    case "title2": return .title2
    case "title3": return .title3
    case "headline": return .headline
    case "subheadline": return .subheadline
    case "body": return .body
    case "callout": return .callout
    case "footnote": return .footnote
    case "caption": return .caption
    case "caption2": return .caption2
    default: preconditionFailure("invalid TextStyle: \\(string)")
    }
  }
}

extension View {
${generatedMethods}
}
${focusBindings}
`
  )
}
