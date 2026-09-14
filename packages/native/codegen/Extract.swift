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
  func record(_ node: some SyntaxProtocol, kind: String, name: String, attrs: AttributeListSyntax, parameters: FunctionParameterListSyntax? = nil, type: String? = nil, whereClause: GenericWhereClauseSyntax? = nil) {
    declarations.append(Declaration(module: module, owner: owners.joined(separator: "."), kind: kind, name: name.replacingOccurrences(of: "`", with: ""),
      attributes: availability.flatMap { $0 } + attributes(attrs),
      requirements: requirements.flatMap { $0 } + (whereClause?.requirements.map(requirementText) ?? []),
      parameters: parameters?.map { Parameter(label: $0.firstName.text, name: $0.secondName?.text ?? $0.firstName.text, type: $0.type.trimmedDescription, defaultValue: $0.defaultValue?.value.trimmedDescription) } ?? [],
      type: type, line: location.location(for: node.positionAfterSkippingLeadingTrivia).line))
  }
  override func visit(_ node: StructDeclSyntax) -> SyntaxVisitorContinueKind {
    record(node, kind: "struct", name: node.name.text, attrs: node.attributes)
    owners.append(node.name.text); availability.append(attributes(node.attributes)); requirements.append(node.genericWhereClause?.requirements.map(requirementText) ?? []); return .visitChildren
  }
  override func visitPost(_ node: StructDeclSyntax) { owners.removeLast(); availability.removeLast(); requirements.removeLast() }
  override func visit(_ node: EnumDeclSyntax) -> SyntaxVisitorContinueKind {
    record(node, kind: "enum", name: node.name.text, attrs: node.attributes)
    owners.append(node.name.text); availability.append(attributes(node.attributes)); requirements.append(node.genericWhereClause?.requirements.map(requirementText) ?? []); return .visitChildren
  }
  override func visitPost(_ node: EnumDeclSyntax) { owners.removeLast(); availability.removeLast(); requirements.removeLast() }
  override func visit(_ node: ExtensionDeclSyntax) -> SyntaxVisitorContinueKind {
    owners.append(node.extendedType.trimmedDescription); availability.append(attributes(node.attributes)); requirements.append(node.genericWhereClause?.requirements.map(requirementText) ?? []); return .visitChildren
  }
  override func visitPost(_ node: ExtensionDeclSyntax) { owners.removeLast(); availability.removeLast(); requirements.removeLast() }
  override func visit(_ node: EnumCaseDeclSyntax) -> SyntaxVisitorContinueKind {
    for element in node.elements where element.parameterClause == nil {
      record(element, kind: "static", name: element.name.text, attrs: node.attributes, type: owners.last)
    }
    return .skipChildren
  }
  override func visit(_ node: FunctionDeclSyntax) -> SyntaxVisitorContinueKind {
    if node.modifiers.contains(where: { $0.name.text == "public" }) {
      record(node, kind: "func", name: node.name.text, attrs: node.attributes, parameters: node.signature.parameterClause.parameters, type: node.signature.returnClause?.type.trimmedDescription, whereClause: node.genericWhereClause)
    }
    return .skipChildren
  }
  override func visit(_ node: InitializerDeclSyntax) -> SyntaxVisitorContinueKind {
    if node.modifiers.contains(where: { $0.name.text == "public" }) {
      record(node, kind: "init", name: "init", attrs: node.attributes, parameters: node.signature.parameterClause.parameters, whereClause: node.genericWhereClause)
    }
    return .skipChildren
  }
  override func visit(_ node: VariableDeclSyntax) -> SyntaxVisitorContinueKind {
    if node.modifiers.contains(where: { $0.name.text == "public" }) {
      for binding in node.bindings {
        record(node, kind: node.modifiers.contains(where: { $0.name.text == "static" }) ? "static" : "var",
          name: binding.pattern.trimmedDescription, attrs: node.attributes, type: binding.typeAnnotation?.type.trimmedDescription)
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
