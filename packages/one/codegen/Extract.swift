import Foundation
import SwiftParser
import SwiftSyntax

struct Parameter: Codable {
  let label: String
  let name: String
  let type: String
  let defaultValue: String?
}
struct Declaration: Codable {
  let module: String
  let owner: String
  let kind: String
  let name: String
  let attributes: [String]
  let requirements: [String]
  let parameters: [Parameter]
  let type: String?
  let line: Int
  let inheritedTypes: [String]?
  let generic: Bool?
  let enumCase: Bool?
  let stored: Bool?
  let writable: Bool?
  let isStatic: Bool?
  let failable: Bool?
}
// generic requirement elements carry their trailing comma; selectors compare on the text alone.
func requirementText(_ requirement: GenericRequirementSyntax) -> String {
  let text = requirement.trimmedDescription
  return text.hasSuffix(",") ? String(text.dropLast()) : text
}
final class Inventory: SyntaxVisitor {
  let module: String
  let location: SourceLocationConverter
  var owners: [String] = []
  var availability: [[String]] = []
  var requirements: [[String]] = []
  var declarations: [Declaration] = []

  init(module: String, file: String, tree: SourceFileSyntax) {
    self.module = module
    location = SourceLocationConverter(fileName: file, tree: tree)
    super.init(viewMode: .sourceAccurate)
  }
  func attributes(_ attrs: AttributeListSyntax) -> [String] {
    attrs.compactMap { $0.as(AttributeSyntax.self)?.trimmedDescription }
  }
  func record(_ node: some SyntaxProtocol, kind: String, name: String, attrs: AttributeListSyntax, parameters: FunctionParameterListSyntax? = nil, type: String? = nil, whereClause: GenericWhereClauseSyntax? = nil, inheritedTypes: [String]? = nil, generic: Bool? = nil, enumCase: Bool? = nil, stored: Bool? = nil, writable: Bool? = nil, isStatic: Bool? = nil, failable: Bool? = nil) {
    declarations.append(Declaration(module: module, owner: owners.joined(separator: "."), kind: kind, name: name.replacingOccurrences(of: "`", with: ""),
      attributes: availability.flatMap { $0 } + attributes(attrs),
      requirements: requirements.flatMap { $0 } + (whereClause?.requirements.map(requirementText) ?? []),
      parameters: parameters?.map { Parameter(label: $0.firstName.text, name: $0.secondName?.text ?? $0.firstName.text, type: $0.type.trimmedDescription, defaultValue: $0.defaultValue?.value.trimmedDescription) } ?? [],
      type: type, line: location.location(for: node.positionAfterSkippingLeadingTrivia).line,
      inheritedTypes: inheritedTypes, generic: generic, enumCase: enumCase, stored: stored, writable: writable, isStatic: isStatic, failable: failable))
  }
  override func visit(_ node: StructDeclSyntax) -> SyntaxVisitorContinueKind {
    record(node, kind: "struct", name: node.name.text, attrs: node.attributes,
      inheritedTypes: node.inheritanceClause?.inheritedTypes.map { $0.type.trimmedDescription },
      generic: node.genericParameterClause != nil)
    owners.append(node.name.text); availability.append(attributes(node.attributes)); requirements.append(node.genericWhereClause?.requirements.map(requirementText) ?? []); return .visitChildren
  }
  override func visitPost(_ node: StructDeclSyntax) { owners.removeLast(); availability.removeLast(); requirements.removeLast() }
  override func visit(_ node: ClassDeclSyntax) -> SyntaxVisitorContinueKind {
    record(node, kind: "class", name: node.name.text, attrs: node.attributes,
      inheritedTypes: node.inheritanceClause?.inheritedTypes.map { $0.type.trimmedDescription },
      generic: node.genericParameterClause != nil)
    owners.append(node.name.text); availability.append(attributes(node.attributes)); requirements.append(node.genericWhereClause?.requirements.map(requirementText) ?? []); return .visitChildren
  }
  override func visitPost(_ node: ClassDeclSyntax) { owners.removeLast(); availability.removeLast(); requirements.removeLast() }
  override func visit(_ node: EnumDeclSyntax) -> SyntaxVisitorContinueKind {
    record(node, kind: "enum", name: node.name.text, attrs: node.attributes)
    owners.append(node.name.text); availability.append(attributes(node.attributes)); requirements.append(node.genericWhereClause?.requirements.map(requirementText) ?? []); return .visitChildren
  }
  override func visitPost(_ node: EnumDeclSyntax) { owners.removeLast(); availability.removeLast(); requirements.removeLast() }
  override func visit(_ node: ExtensionDeclSyntax) -> SyntaxVisitorContinueKind {
    if let inherited = node.inheritanceClause?.inheritedTypes.map({ $0.type.trimmedDescription }) {
      record(node, kind: "conformance", name: node.extendedType.trimmedDescription,
        attrs: node.attributes, inheritedTypes: inherited)
    }
    owners.append(node.extendedType.trimmedDescription); availability.append(attributes(node.attributes)); requirements.append(node.genericWhereClause?.requirements.map(requirementText) ?? []); return .visitChildren
  }
  override func visitPost(_ node: ExtensionDeclSyntax) { owners.removeLast(); availability.removeLast(); requirements.removeLast() }
  override func visit(_ node: TypeAliasDeclSyntax) -> SyntaxVisitorContinueKind {
    if node.modifiers.contains(where: { $0.name.text == "public" }) {
      record(node, kind: "typealias", name: node.name.text, attrs: node.attributes,
        type: node.initializer.value.trimmedDescription)
    }
    return .skipChildren
  }
  override func visit(_ node: EnumCaseDeclSyntax) -> SyntaxVisitorContinueKind {
    for element in node.elements {
      if let clause = element.parameterClause {
        declarations.append(Declaration(module: module, owner: owners.joined(separator: "."), kind: "case", name: element.name.text,
          attributes: availability.flatMap { $0 } + attributes(node.attributes),
          requirements: requirements.flatMap { $0 },
          parameters: clause.parameters.map {
            Parameter(label: $0.firstName?.text ?? "_", name: $0.secondName?.text ?? $0.firstName?.text ?? "_",
              type: $0.type.trimmedDescription, defaultValue: nil)
          },
          type: owners.last, line: location.location(for: element.positionAfterSkippingLeadingTrivia).line,
          inheritedTypes: nil, generic: nil, enumCase: true, stored: nil, writable: nil, isStatic: nil, failable: nil))
      } else {
        record(element, kind: "static", name: element.name.text, attrs: node.attributes, type: owners.last, enumCase: true)
      }
    }
    return .skipChildren
  }
  override func visit(_ node: FunctionDeclSyntax) -> SyntaxVisitorContinueKind {
    if node.modifiers.contains(where: { $0.name.text == "public" }) {
      record(node, kind: "func", name: node.name.text, attrs: node.attributes, parameters: node.signature.parameterClause.parameters, type: node.signature.returnClause?.type.trimmedDescription, whereClause: node.genericWhereClause,
        isStatic: node.modifiers.contains(where: { $0.name.text == "static" || $0.name.text == "class" }))
    }
    return .skipChildren
  }
  override func visit(_ node: InitializerDeclSyntax) -> SyntaxVisitorContinueKind {
    if node.modifiers.contains(where: { $0.name.text == "public" }) {
      record(node, kind: "init", name: "init", attrs: node.attributes, parameters: node.signature.parameterClause.parameters, whereClause: node.genericWhereClause,
        failable: node.optionalMark != nil)
    }
    return .skipChildren
  }
  override func visit(_ node: VariableDeclSyntax) -> SyntaxVisitorContinueKind {
    if node.modifiers.contains(where: { $0.name.text == "public" }) {
      for binding in node.bindings {
        let writable: Bool
        if let accessorBlock = binding.accessorBlock {
          switch accessorBlock.accessors {
          case .accessors(let list): writable = list.contains { $0.accessorSpecifier.text == "set" }
          case .getter: writable = false
          @unknown default: writable = false
          }
        } else {
          writable = false
        }
        record(node, kind: node.modifiers.contains(where: { $0.name.text == "static" }) ? "static" : "var",
          name: binding.pattern.trimmedDescription, attrs: node.attributes, type: binding.typeAnnotation?.type.trimmedDescription,
          stored: binding.accessorBlock == nil, writable: writable)
      }
    }
    return .skipChildren
  }
}
var declarations: [Declaration] = []
for file in CommandLine.arguments.dropFirst() {
  let module = URL(fileURLWithPath: file).deletingLastPathComponent().lastPathComponent.replacingOccurrences(of: ".swiftmodule", with: "")
  let source = try String(contentsOfFile: file, encoding: .utf8)
  let tree = Parser.parse(source: source)
  if tree.hasError { fatalError("could not parse \(file)") }
  let inventory = Inventory(module: module, file: file, tree: tree)
  inventory.walk(tree)
  declarations += inventory.declarations
}
let encoder = JSONEncoder()
encoder.outputFormatting = [.sortedKeys]
FileHandle.standardOutput.write(try encoder.encode(declarations))
