// codegen/sdk/app.ts
import { createHash as createHash2 } from "node:crypto";
import { copyFileSync, existsSync as existsSync2, mkdirSync as mkdirSync4, readdirSync as readdirSync2, readFileSync as readFileSync2, rmSync as rmSync2, writeFileSync as writeFileSync4 } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { dirname, join as join5 } from "node:path";
import { fileURLToPath } from "node:url";

// codegen/sdk/types.ts
var PUNCTUATION = ["...", "->", "?", "!", "[", "]", ":", ",", "<", ">", "(", ")", ".", "&", "="];
function tokenize(fragments) {
  const out = [];
  for (const fragment of fragments) {
    if (fragment.kind === "typeIdentifier") {
      out.push({ k: "id", text: fragment.spelling, usr: fragment.preciseIdentifier });
      continue;
    }
    if (fragment.kind === "attribute") {
      out.push({ k: "attr", text: fragment.spelling });
      continue;
    }
    if (fragment.kind === "keyword") {
      out.push({ k: "kw", text: fragment.spelling.trim() });
      continue;
    }
    let text = fragment.spelling;
    while (text.length) {
      const space = /^\s+/.exec(text);
      if (space) {
        text = text.slice(space[0].length);
        continue;
      }
      const attr = /^@\w+(\([^)]*\))?/.exec(text);
      if (attr) {
        out.push({ k: "attr", text: attr[0] });
        text = text.slice(attr[0].length);
        continue;
      }
      const punct = PUNCTUATION.find((p) => text.startsWith(p));
      if (punct) {
        out.push({ k: "p", text: punct });
        text = text.slice(punct.length);
        continue;
      }
      const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text);
      if (word) {
        const keyword = ["any", "some", "inout", "async", "throws", "rethrows", "Type", "Protocol", "borrowing", "consuming", "sending", "isolated", "each", "repeat"].includes(word[0]);
        out.push(keyword ? { k: "kw", text: word[0] } : { k: "id", text: word[0] });
        text = text.slice(word[0].length);
        continue;
      }
      out.push({ k: "p", text: text[0] });
      text = text.slice(1);
    }
  }
  return out;
}

class TypeParseError extends Error {
}

class Parser {
  tokens;
  i = 0;
  constructor(tokens) {
    this.tokens = tokens;
  }
  peek(offset = 0) {
    return this.tokens[this.i + offset];
  }
  is(k, text, offset = 0) {
    const token = this.peek(offset);
    return !!token && token.k === k && (text === undefined || token.text === text);
  }
  take(k, text) {
    if (!this.is(k, text))
      throw new TypeParseError(`expected ${text ?? k} at ${this.describe()}`);
    return this.tokens[this.i++];
  }
  describe() {
    return this.tokens.slice(this.i, this.i + 6).map((t) => t.text).join(" ");
  }
  type() {
    const attrs = [];
    for (;; ) {
      if (this.is("attr"))
        attrs.push(this.take("attr").text);
      else if (this.is("p", "@") && this.is("id", undefined, 1)) {
        this.i++;
        attrs.push(`@${this.take("id").text}`);
      } else
        break;
    }
    for (const modifier of ["borrowing", "consuming", "sending", "isolated"]) {
      if (this.is("kw", modifier))
        this.i++;
    }
    if (this.is("kw", "inout")) {
      this.i++;
      return { k: "inout", t: this.type() };
    }
    if (this.is("kw", "any") || this.is("kw", "some")) {
      const some = this.take("kw").text === "some";
      return this.suffixes({ k: "existential", some, t: this.composed() }, attrs);
    }
    return this.suffixes(this.composed(attrs), attrs);
  }
  composed(attrs = []) {
    const first = this.primary(attrs);
    if (!this.is("p", "&"))
      return first;
    const items = [first];
    while (this.is("p", "&")) {
      this.i++;
      items.push(this.primary([]));
    }
    return { k: "composition", items };
  }
  suffixes(base, attrs) {
    let t = base;
    for (;; ) {
      if (this.is("p", "?") || this.is("p", "!")) {
        t = { k: "optional", t, implicit: this.take("p").text === "!" };
      } else if (this.is("p", "...")) {
        this.i++;
        t = { k: "variadic", t };
      } else if (this.is("p", ".") && (this.is("kw", "Type", 1) || this.is("kw", "Protocol", 1))) {
        this.i += 2;
        t = { k: "metatype", t };
      } else
        break;
    }
    return t;
  }
  primary(attrs) {
    if (this.is("p", "[")) {
      this.i++;
      const key = this.type();
      if (this.is("p", ":")) {
        this.i++;
        const value = this.type();
        this.take("p", "]");
        return { k: "dictionary", key, value };
      }
      this.take("p", "]");
      return { k: "array", t: key };
    }
    if (this.is("p", "("))
      return this.parenthesized(attrs);
    if (this.is("id"))
      return this.named();
    if (this.is("p") && /^[0-9]$/.test(this.peek().text)) {
      let digits = "";
      while (this.is("p") && /^[0-9]$/.test(this.peek().text))
        digits += this.take("p").text;
      return { k: "named", name: digits, args: [] };
    }
    if (this.is("kw", "Any") || this.is("kw", "Self") || this.is("kw", "AnyObject"))
      return this.named();
    if (this.is("kw", "each") || this.is("kw", "repeat")) {
      const keyword = this.take("kw").text;
      const pack = this.type();
      return { k: "named", name: `${keyword} ${typeText(pack)}`, args: [] };
    }
    if (this.is("kw", "Type") || this.is("kw", "Protocol")) {
      return { k: "named", name: this.take("kw").text, args: [] };
    }
    throw new TypeParseError(`unexpected ${this.describe()}`);
  }
  named() {
    const parts = [];
    let usr;
    const args = [];
    const segments = [];
    for (;; ) {
      const token = this.is("kw") ? this.take("kw") : this.take("id");
      parts.push(token.text);
      usr = token.usr;
      const start = args.length;
      if (this.is("p", "<")) {
        this.i++;
        args.push(this.type());
        while (this.is("p", ",")) {
          this.i++;
          args.push(this.type());
        }
        this.take("p", ">");
      }
      segments.push(args.length - start);
      if (this.is("p", ".") && this.is("id", undefined, 1)) {
        this.i++;
        continue;
      }
      break;
    }
    const nested = segments.slice(0, -1).some(Boolean);
    return { k: "named", name: parts.join("."), usr, args, ...nested && { segments } };
  }
  parenthesized(attrs) {
    this.take("p", "(");
    const items = [];
    while (!this.is("p", ")")) {
      let label;
      if (this.is("id") && this.is("p", ":", 1)) {
        label = this.take("id").text;
        this.take("p", ":");
      } else if (this.is("id") && this.is("id", undefined, 1) && this.is("p", ":", 2)) {
        label = this.take("id").text;
        this.i++;
        this.take("p", ":");
      }
      items.push({ label, t: this.type() });
      if (this.is("p", ","))
        this.i++;
      else if (!this.is("p", ")"))
        throw new TypeParseError(`expected , or ) at ${this.describe()}`);
    }
    this.take("p", ")");
    let isAsync = false;
    let isThrows = false;
    if (this.is("kw", "async")) {
      this.i++;
      isAsync = true;
    }
    if (this.is("kw", "throws") || this.is("kw", "rethrows")) {
      this.i++;
      isThrows = true;
      if (this.is("p", "(")) {
        this.take("p", "(");
        this.type();
        this.take("p", ")");
      }
    }
    if (this.is("p", "->")) {
      this.i++;
      const result = this.type();
      return {
        k: "function",
        params: items,
        result,
        async: isAsync,
        throws: isThrows,
        escaping: attrs.some((a) => a === "@escaping"),
        sendable: attrs.some((a) => a === "@Sendable")
      };
    }
    if (items.length === 1 && items[0].label === undefined)
      return items[0].t;
    return { k: "tuple", items };
  }
}
function parseType(fragments) {
  const parser = new Parser(tokenize(fragments));
  const type = parser.type();
  if (parser.i !== parser.tokens.length)
    throw new TypeParseError(`trailing ${parser.describe()}`);
  return type;
}
function parameterType(fragments) {
  const colon = fragments.findIndex((f) => f.kind === "text" && f.spelling.includes(":"));
  if (colon < 0)
    return parseType(fragments);
  const rest = fragments.slice(colon);
  const head = rest[0];
  const after = head.spelling.slice(head.spelling.indexOf(":") + 1);
  const body = [...after.trim() ? [{ ...head, spelling: after }] : [], ...rest.slice(1)];
  const equals = body.findIndex((f) => f.kind === "text" && /(^|\s)=\s/.test(f.spelling));
  return parseType(equals < 0 ? body : [
    ...body.slice(0, equals),
    { ...body[equals], spelling: body[equals].spelling.split(/\s=\s/)[0] }
  ]);
}
function parameterDefaults(declaration) {
  const keyword = declaration.findIndex((f) => f.kind === "keyword" && ["init", "func", "subscript", "macro"].includes(f.spelling));
  const named = ["func", "macro"].includes(declaration[keyword]?.spelling);
  const name = named ? declaration.findIndex((f, i) => i > keyword && f.kind === "identifier") : keyword;
  const source = declaration.slice(name + 1).map((f) => f.spelling).join("");
  const defaults = [];
  let depth = 0;
  let quoted = false;
  let start = -1;
  let equals = -1;
  for (let i = 0;i < source.length; i++) {
    const c = source[i];
    if (quoted) {
      if (c === "\\")
        i++;
      else if (c === '"')
        quoted = false;
      continue;
    }
    if (c === '"')
      quoted = true;
    else if (c === "-" && source[i + 1] === ">")
      i++;
    else if ("([{<".includes(c)) {
      depth++;
      if (c === "(" && depth === 1 && start < 0)
        start = i + 1;
    } else if (")]}>".includes(c) || c === "," && depth === 1) {
      if (depth === 1 && start >= 0) {
        if (source.slice(start, i).trim())
          defaults.push(equals < 0 ? undefined : source.slice(equals + 1, i).trim());
        equals = -1;
        if (c === ")")
          return defaults;
        start = i + 1;
      }
      if (c !== ",")
        depth--;
    } else if (c === "=" && depth === 1 && source[i - 1] === " " && source[i + 1] === " ")
      equals = i;
  }
  return defaults;
}
function namedText(type, text) {
  const list = (args) => args.length ? `<${args.map(text).join(", ")}>` : "";
  if (!type.segments)
    return type.name + list(type.args);
  let at = 0;
  return type.name.split(".").map((part, i) => part + list(type.args.slice(at, at += type.segments[i]))).join(".");
}
function typeText(type) {
  switch (type.k) {
    case "named":
      return namedText(type, typeText);
    case "optional":
      return `${typeText(type.t)}?`;
    case "array":
      return `[${typeText(type.t)}]`;
    case "dictionary":
      return `[${typeText(type.key)}: ${typeText(type.value)}]`;
    case "tuple":
      return `(${type.items.map((i) => (i.label ? `${i.label}: ` : "") + typeText(i.t)).join(", ")})`;
    case "function":
      return `(${type.params.map((p) => typeText(p.t)).join(", ")})${type.async ? " async" : ""}${type.throws ? " throws" : ""} -> ${typeText(type.result)}`;
    case "existential":
      return `${type.some ? "some" : "any"} ${typeText(type.t)}`;
    case "composition":
      return type.items.map(typeText).join(" & ");
    case "variadic":
      return `${typeText(type.t)}...`;
    case "inout":
      return `inout ${typeText(type.t)}`;
    case "metatype":
      return `${typeText(type.t)}.Type`;
  }
}

// codegen/sdk/bridge.ts
var OBSERVABLE = "s:11Observation10ObservableP";
var ASYNC_SEQUENCE = "s:Sci";
var PUBLISHER = "s:7Combine9PublisherP";
var constraintsOf = (symbol) => {
  const constraints = [...symbol?.swiftGenerics?.constraints ?? []];
  const declaration = symbol?.declarationFragments?.map((f) => f.spelling).join("") ?? "";
  const clause = /\bwhere\s+([^{}]+)/.exec(declaration)?.[1];
  const params = new Set(symbol?.swiftGenerics?.parameters?.map((p) => p.name));
  for (const part of clause?.split(",") ?? []) {
    const bound = /^\s*([A-Za-z_]\w*)\s*:\s*(?:Swift\.)?AnyObject\s*$/.exec(part);
    if (!bound || !params.has(bound[1]))
      continue;
    if (!constraints.some((c) => c.kind === "conformance" && c.lhs === bound[1] && c.rhs.split(".").at(-1) === "AnyObject"))
      constraints.push({ kind: "conformance", lhs: bound[1], rhs: "AnyObject" });
  }
  return constraints;
};
var TYPE_KINDS = new Set(["swift.class", "swift.struct", "swift.enum", "swift.protocol", "swift.typealias", "swift.actor", "swift.associatedtype"]);
var VALUES = {
  "s:Sb": "boolean",
  "s:Si": "number",
  "s:Su": "number",
  "s:Sd": "number",
  "s:Sf": "number",
  "s:s4Int8V": "number",
  "s:s5Int16V": "number",
  "s:s5Int32V": "number",
  "s:s5Int64V": "number",
  "s:s5UInt8V": "number",
  "s:s6UInt16V": "number",
  "s:s6UInt32V": "number",
  "s:s6UInt64V": "number",
  "s:s7Float16V": "number",
  "s:14CoreFoundation7CGFloatV": "number",
  "s:12CoreGraphics7CGFloatV": "number",
  "c:@T@NSTimeInterval": "number",
  "c:@T@NSInteger": "number",
  "c:@T@NSUInteger": "number",
  "s:SS": "string",
  "s:SJ": "string",
  "s:Ss": "string",
  "s:10Foundation4DateV": "Date",
  "s:10Foundation3URLV": "string",
  "s:10Foundation4DataV": "ArrayBuffer",
  "s:10Foundation4UUIDV": "string",
  "s:s4Voida": "void",
  "s:s5NeverO": "never",
  "s:s5ErrorP": "NativeError",
  "c:@S@CGPoint": "{ x: number; y: number }",
  "c:@S@CGSize": "{ width: number; height: number }",
  "c:@S@CGRect": "{ x: number; y: number; width: number; height: number }",
  "c:@S@CGVector": "{ dx: number; dy: number }",
  "c:@S@_NSRange": "{ location: number; length: number }",
  "c:@S@UIEdgeInsets": "{ top: number; left: number; bottom: number; right: number }",
  "c:@S@NSDirectionalEdgeInsets": "{ top: number; leading: number; bottom: number; trailing: number }",
  "c:@S@CLLocationCoordinate2D": "{ latitude: number; longitude: number }"
};
var VALUE_NAMES = {
  Bool: "s:Sb",
  Int: "s:Si",
  UInt: "s:Su",
  Double: "s:Sd",
  Float: "s:Sf",
  String: "s:SS",
  Void: "s:s4Voida",
  Never: "s:s5NeverO",
  Error: "s:s5ErrorP",
  CGFloat: "s:14CoreFoundation7CGFloatV",
  TimeInterval: "c:@T@NSTimeInterval",
  Date: "s:10Foundation4DateV",
  URL: "s:10Foundation3URLV",
  Data: "s:10Foundation4DataV",
  UUID: "s:10Foundation4UUIDV",
  Character: "s:SJ",
  Substring: "s:Ss"
};
var PICKED_VALUES = new Set(["Bool", "Int", "UInt", "Double", "Float", "String", "CGFloat", "Date", "URL", "Data", "UUID"]);
var BOOLEAN_NAMES = new Set(["ObjCBool", "DarwinBoolean", "CBool"]);
function outPointee(type) {
  const pointer = type.k === "optional" ? type.t : type;
  if (pointer.k !== "named")
    return;
  const name = pointer.name.split(".").at(-1);
  const element = pointer.args[0];
  if (!element || name !== "AutoreleasingUnsafeMutablePointer" && name !== "UnsafeMutablePointer")
    return;
  if (name === "AutoreleasingUnsafeMutablePointer" || element.k === "optional")
    return element;
  return element.k === "named" && BOOLEAN_NAMES.has(element.name.split(".").at(-1)) ? element : undefined;
}
function cErrorOut(written) {
  const unmanaged = written.k === "optional" && written.t.k === "named" && written.t.name.split(".").at(-1) === "Unmanaged" ? written.t.args[0] : undefined;
  if (!unmanaged || unmanaged.k !== "named" || unmanaged.name.split(".").at(-1) !== "CFError")
    return;
  return { k: "optional", t: unmanaged, implicit: false };
}
function unmanagedReturn(type, base) {
  const wrapped = type.k === "optional" ? type.t : type;
  const pointee = wrapped.k === "named" && wrapped.name.split(".").at(-1) === "Unmanaged" ? wrapped.args[0] : undefined;
  if (!pointee || pointee.k !== "named")
    return;
  const inner = type.k === "optional" ? { k: "optional", t: pointee, implicit: false } : pointee;
  if (/Create|Copy/.test(base))
    return { inner, retained: true };
  if (/Get/.test(base))
    return { inner, retained: false };
  return;
}
var C_ALIASES = {
  CChar: "Int8",
  CSignedChar: "Int8",
  CUnsignedChar: "UInt8",
  CShort: "Int16",
  CUnsignedShort: "UInt16",
  CInt: "Int32",
  CUnsignedInt: "UInt32",
  CLong: "Int",
  CUnsignedLong: "UInt",
  CLongLong: "Int64",
  CUnsignedLongLong: "UInt64",
  CFloat: "Float",
  CDouble: "Double",
  CWideChar: "Int32",
  CChar16: "UInt16",
  CChar32: "UInt32",
  OSStatus: "Int32"
};
var TYPED_ARRAYS = {
  Int8: "Int8Array",
  UInt8: "Uint8Array",
  Int16: "Int16Array",
  UInt16: "Uint16Array",
  Int32: "Int32Array",
  UInt32: "Uint32Array",
  Int64: "BigInt64Array",
  Int: "BigInt64Array",
  UInt64: "BigUint64Array",
  UInt: "BigUint64Array",
  Float: "Float32Array",
  Double: "Float64Array",
  CGFloat: "Float64Array"
};
var POINTERS = /^(Unsafe(Mutable)?(Raw)?(Buffer)?Pointer|OpaquePointer|AutoreleasingUnsafeMutablePointer|CVaListPointer)$/;
var APP_STORE_REJECTED = /UIWebView|UIWebPagination/;
var appStoreRejected = (usr) => usr && APP_STORE_REJECTED.test(usr) ? { ok: false, reason: "rejected by App Store processing" } : undefined;
var UNBRIDGEABLE_NAMES = {
  Selector: "selector",
  NSZone: "pointer",
  ObjectIdentifier: "identity",
  Hasher: "hashing",
  AnyKeyPath: "key path",
  PartialKeyPath: "key path",
  KeyPath: "key path",
  WritableKeyPath: "key path",
  ReferenceWritableKeyPath: "key path"
};
function effectsOf(decl) {
  const open = decl.indexOf("(");
  if (open < 0)
    return { isAsync: false, throws: false };
  let depth = 0;
  let close = decl.length;
  for (let i = open;i < decl.length; i++) {
    if (decl[i] === "(")
      depth++;
    if (decl[i] === ")" && --depth === 0) {
      close = i;
      break;
    }
  }
  const tail = decl.slice(close + 1).split(/->|\{|\bwhere\b/)[0];
  return { isAsync: /\basync\b/.test(tail), throws: /\b(re)?throws\b/.test(tail) };
}
function collectFacts(graph) {
  const facts = { declarations: [], members: [], optionSets: [], requirements: [], conformances: [], properties: [], specializations: [], zeroInitializers: [] };
  const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]));
  const parents = new Map(graph.relationships.filter((r) => r.kind === "inheritsFrom").map((r) => [r.source, r.target]));
  for (const symbol of graph.symbols) {
    if (!TYPE_KINDS.has(symbol.kind.identifier))
      continue;
    if (APP_STORE_REJECTED.test(symbol.identifier.precise))
      continue;
    facts.declarations.push({
      usr: symbol.identifier.precise,
      module: graph.module,
      path: symbol.pathComponents,
      kind: symbol.kind.identifier.slice("swift.".length),
      superclass: parents.get(symbol.identifier.precise),
      genericParameters: symbol.swiftGenerics?.parameters?.map((p) => p.name),
      alias: symbol.kind.identifier === "swift.typealias" ? aliasTarget(symbol) : undefined
    });
  }
  for (const symbol of graph.symbols) {
    const fragments = [
      ...symbol.declarationFragments ?? [],
      ...(symbol.functionSignature?.parameters ?? []).flatMap((p) => p.declarationFragments),
      ...symbol.functionSignature?.returns ?? []
    ];
    for (let i = 0;i + 3 < fragments.length; i++) {
      const owner = fragments[i];
      const open = fragments[i + 1];
      const arg = fragments[i + 2];
      const close = fragments[i + 3];
      if (owner.kind === "typeIdentifier" && owner.preciseIdentifier && open.kind === "text" && open.spelling === "<" && arg.kind === "typeIdentifier" && arg.preciseIdentifier && close.kind === "text" && close.spelling.startsWith(">")) {
        facts.specializations.push({ owner: owner.preciseIdentifier, arg: arg.preciseIdentifier });
      }
    }
  }
  for (const rel of graph.relationships) {
    if (rel.kind === "conformsTo" || rel.kind === "inheritsFrom")
      facts.conformances.push({ source: rel.source, target: rel.target });
    if (rel.kind === "conformsTo" && rel.target === "s:s9OptionSetP")
      facts.optionSets.push(rel.source);
    const member = byUsr.get(rel.source);
    if (!member)
      continue;
    const name = member.pathComponents.at(-1);
    const kind = member.kind.identifier;
    if (rel.kind === "memberOf") {
      if (kind === "swift.init" && rel.target.startsWith("c:@S@")) {
        const parameters = member.functionSignature?.parameters ?? [];
        if (name === "init()") {
          const name = rel.target.slice("c:@S@".length);
          const usr = member.identifier.precise;
          facts.zeroInitializers.push({
            owner: rel.target,
            usr,
            imported: usr === `s:So${name.length}${name}VABycfc` && !member.swiftExtension && !member.synthesizedInit && !parameters.length && member.declarationFragments?.map((f) => f.spelling).join("") === "init()" && /\.(h|hh|hpp)$/.test(member.location?.uri ?? "")
          });
        }
      }
      if (kind === "swift.property" && ["public", "open"].includes(member.accessLevel)) {
        const decl = (member.declarationFragments ?? []).map((f) => f.spelling).join("");
        try {
          const fragments = member.declarationFragments ?? [];
          const nameAt = fragments.findIndex((f) => f.kind === "identifier");
          const colon = fragments.findIndex((f, i) => i > nameAt && f.kind === "text" && f.spelling.includes(":"));
          if (colon >= 0 && !/\b(async|throws)\b|@MainActor/.test(decl)) {
            const tail = fragments.slice(colon);
            const body = [{ ...tail[0], spelling: tail[0].spelling.slice(tail[0].spelling.indexOf(":") + 1) }, ...tail.slice(1)];
            const end = body.findIndex((f) => f.kind === "text" && /[{=]/.test(f.spelling));
            const type = parseType(end < 0 ? body : [...body.slice(0, end), { ...body[end], spelling: body[end].spelling.split(/[{=]/)[0] }]);
            facts.properties.push({ owner: rel.target, name, type, writable: /\bset\b/.test(decl) && !/private\(set\)/.test(decl) });
          }
        } catch (error) {
          if (!(error instanceof TypeParseError))
            throw error;
        }
      }
      if (kind === "swift.enum.case") {
        const payload = (member.declarationFragments ?? []).some((f) => f.spelling.includes("("));
        facts.members.push({ owner: rel.target, kind: payload ? "payloadCase" : "case", name });
      } else if (kind === "swift.property" && name === "rawValue") {
        const type = member.declarationFragments?.find((f) => f.kind === "typeIdentifier");
        facts.members.push({ owner: rel.target, kind: "rawValue", name, raw: type?.preciseIdentifier === "s:SS" ? "string" : "number" });
      } else if (kind === "swift.init" && name === "init(rawValue:)") {
        const type = member.functionSignature?.parameters?.[0]?.declarationFragments?.find((f) => f.kind === "typeIdentifier");
        facts.members.push({ owner: rel.target, kind: "rawInit", name, raw: type?.preciseIdentifier === "s:SS" ? "string" : "number" });
      } else if (kind === "swift.type.property" && member.declarationFragments?.some((f) => f.kind === "typeIdentifier" && f.preciseIdentifier === rel.target)) {
        facts.members.push({ owner: rel.target, kind: "constant", name });
      }
    }
    if (rel.kind === "requirementOf" || rel.kind === "optionalRequirementOf") {
      const returns = member.functionSignature?.returns ?? [];
      const returnsVoid = !returns.length || ["()", "Void"].includes(returns.map((f) => f.spelling).join("").trim());
      const effects = effectsOf((member.declarationFragments ?? []).map((f) => f.spelling).join(""));
      const fragments = [...(member.functionSignature?.parameters ?? []).flatMap((p) => p.declarationFragments), ...returns];
      const answersLater = effects.isAsync && effects.throws && (member.swiftGenerics?.parameters ?? []).every((p) => p.name === "Self") && !fragments.some((f) => /^Self\b/.test(f.spelling) || byUsr.get(f.preciseIdentifier ?? "")?.kind.identifier === "swift.associatedtype");
      facts.requirements.push({
        owner: rel.target,
        associated: kind === "swift.associatedtype",
        blocks: rel.kind === "requirementOf" && (kind !== "swift.method" || !(returnsVoid || answersLater))
      });
    }
  }
  return facts;
}
function buildIndex(all) {
  const index = new Map;
  const rawRepresentable = new Set(all.flatMap((facts) => (facts.conformances ?? []).filter((rel) => rel.target === "s:SY").map((rel) => rel.source)));
  for (const facts of all)
    for (const d of facts.declarations)
      index.set(d.usr, { ...d, cZeroInit: undefined });
  const zeros = new Map;
  for (const facts of all)
    for (const init of facts.zeroInitializers ?? []) {
      zeros.set(init.owner, [...zeros.get(init.owner) ?? [], init]);
    }
  for (const [usr, initializers] of zeros) {
    const owner = index.get(usr);
    if (owner && initializers.every((init) => init.imported && init.usr === initializers[0].usr))
      owner.cZeroInit = initializers[0].usr;
  }
  for (const facts of all) {
    for (const property of facts.properties ?? []) {
      const owner = index.get(property.owner);
      if (owner)
        owner.properties = [...owner.properties ?? [], property];
    }
    for (const rel of facts.conformances ?? []) {
      const protocol = index.get(rel.target);
      if (protocol)
        protocol.conformers = [...new Set([...protocol.conformers ?? [], rel.source])];
      const conformer = index.get(rel.source);
      if (conformer)
        conformer.conformsTo = [...new Set([...conformer.conformsTo ?? [], rel.target])];
    }
    for (const usr of facts.optionSets) {
      const info = index.get(usr);
      if (info)
        info.optionSet = true;
    }
    for (const m of facts.members) {
      const owner = index.get(m.owner);
      if (!owner)
        continue;
      if (m.kind === "rawInit") {
        if (rawRepresentable.has(m.owner))
          owner.rawValue ??= m.raw;
        continue;
      }
      if (m.kind === "case" || m.kind === "payloadCase") {
        owner.cases = [...owner.cases ?? [], m.name];
        if (m.kind === "payloadCase")
          owner.payload = true;
      } else if (m.kind === "rawValue")
        owner.rawValue = m.raw;
      else
        owner.constants = [...owner.constants ?? [], m.name];
    }
    for (const r of facts.requirements) {
      const owner = index.get(r.owner);
      if (!owner)
        continue;
      if (r.associated)
        owner.associatedTypes = true;
      owner.implementable = (owner.implementable ?? true) && !r.blocks;
    }
    for (const s of facts.specializations ?? []) {
      const owner = index.get(s.owner);
      const arg = index.get(s.arg);
      if (!owner || !owner.usr.startsWith("c:objc") || owner.genericParameters?.length !== 1)
        continue;
      if (!arg || !["class", "struct", "enum", "actor"].includes(arg.kind) || arg.genericParameters?.length || arg.path.some((p) => p.startsWith("_")))
        continue;
      owner.objcWitnesses = [...new Set([...owner.objcWitnesses ?? [], s.arg])].sort();
    }
  }
  return index;
}
var NO_GENERICS = { params: new Set, resolved: new Map, classes: new Set, owned: new Set, objcOpen: new Set };
var COLLECTIONS = new Set(["Sequence", "Collection", "BidirectionalCollection", "RandomAccessCollection", "MutableCollection", "RangeReplaceableCollection", "AccelerateBuffer", "AccelerateMutableBuffer"]);
var INTEGERS = new Set(["BinaryInteger", "FixedWidthInteger", "SignedInteger", "UnsignedInteger"]);
var FLOATS = new Set(["BinaryFloatingPoint", "FloatingPoint"]);
var PASSIVE = new Set(["Sendable", "Equatable", "Hashable", "Codable", "Decodable", "Encodable", "CustomStringConvertible", "Plottable"]);
var NUMERIC = new Set([...PASSIVE, "Comparable", "Numeric", "SignedNumeric", "AdditiveArithmetic", "Strideable", "SIMDScalar", "ExpressibleByIntegerLiteral"]);
var INTEGER_OK = new Set([...NUMERIC, ...INTEGERS, "ExpressibleByIntegerLiteral"]);
var FLOAT_OK = new Set([...NUMERIC, ...FLOATS, "ExpressibleByFloatLiteral", "MLShapedArrayScalar"]);
var STRING_OK = new Set([...PASSIVE, "StringProtocol", "Comparable", "ExpressibleByStringLiteral"]);
var DATA_PROTOCOLS = new Set(["DataProtocol", "MutableDataProtocol", "ContiguousBytes"]);
var DATA_OK = new Set([...PASSIVE, ...DATA_PROTOCOLS]);
var ERASERS = {
  View: "SwiftUI.AnyView",
  ShapeStyle: "SwiftUI.AnyShapeStyle",
  Shape: "SwiftUI.AnyShape",
  Layout: "SwiftUI.AnyLayout"
};

class Bridge {
  index;
  aliasDepth = 0;
  witnesses = new Map;
  constructor(index) {
    this.index = index;
  }
  substitute(type, generics, active = new Set) {
    const sub = (t) => this.substitute(t, generics, active);
    switch (type.k) {
      case "named": {
        if (!active.has(type.name)) {
          const replacement = generics.resolved.get(type.name);
          if (replacement)
            return this.substitute(replacement, generics, new Set([...active, type.name]));
          const [root, ...members] = type.name.split(".");
          const base = generics.resolved.get(root);
          if (base && members.length) {
            const resolved = this.substitute(base, generics, new Set([...active, root]));
            if (members.join(".") === "Element" && resolved.k === "array")
              return resolved.t;
            return { k: "named", name: `${typeText(resolved)}.${members.join(".")}`, args: type.args.map(sub) };
          }
        }
        return { ...type, args: type.args.map(sub) };
      }
      case "dictionary":
        return { ...type, key: sub(type.key), value: sub(type.value) };
      case "tuple":
        return { ...type, items: type.items.map((i) => ({ ...i, t: sub(i.t) })) };
      case "function":
        return { ...type, params: type.params.map((p) => ({ ...p, t: sub(p.t) })), result: sub(type.result) };
      case "composition":
        return { ...type, items: type.items.map(sub) };
      default:
        return { ...type, t: sub(type.t) };
    }
  }
  aliasOf(type, info = type.usr ? this.index.get(type.usr) : undefined) {
    if (!info?.alias)
      return;
    const params = info.genericParameters ?? [];
    if (!params.length)
      return info.alias;
    if (type.args.length !== params.length)
      return;
    return this.substitute(info.alias, { ...NO_GENERICS, resolved: new Map(params.map((p, i) => [p, type.args[i]])) });
  }
  functions(type, depth = 0) {
    if (depth > 12)
      return type;
    const map = (t) => this.functions(t, depth + 1);
    switch (type.k) {
      case "named": {
        const alias = this.aliasOf(type);
        if (alias) {
          const expanded = map(alias);
          if (expanded.k === "function" || expanded.k === "optional" && expanded.t.k === "function")
            return expanded;
          if (outPointee(expanded))
            return expanded;
        }
        return { ...type, args: type.args.map(map) };
      }
      case "function":
        return { ...type, params: type.params.map((p) => ({ ...p, t: map(p.t) })), result: map(type.result) };
      case "dictionary":
        return { ...type, key: map(type.key), value: map(type.value) };
      case "tuple":
        return { ...type, items: type.items.map((p) => ({ ...p, t: map(p.t) })) };
      case "composition":
        return { ...type, items: type.items.map(map) };
      default:
        return { ...type, t: map(type.t) };
    }
  }
  protocolWitness(protocols) {
    const key = protocols.map((c) => c.rhsPrecise ?? c.rhs).sort().join("&");
    if (this.witnesses.has(key))
      return this.witnesses.get(key) ?? undefined;
    const infos = protocols.map((c) => c.rhsPrecise ? this.index.get(c.rhsPrecise) : undefined);
    const pools = infos.map((info) => new Set(info?.conformers ?? []));
    const usrs = [...pools[0] ?? []].filter((usr) => pools.every((p) => p.has(usr)));
    const scalar = ["Double", "Float", "Int", "UInt", "String", "Data"].find((name) => usrs.includes(VALUE_NAMES[name]));
    const concrete = usrs.map((usr) => this.index.get(usr)).filter((info) => !!info && ["class", "struct", "enum", "actor"].includes(info.kind) && !info.genericParameters?.length && !info.path.some((p) => p.startsWith("_")));
    const info = concrete.length === 1 ? concrete[0] : undefined;
    const witness = scalar ? { k: "named", name: scalar, usr: VALUE_NAMES[scalar], args: [] } : info ? { k: "named", name: `${info.module}.${info.path.join(".")}`, usr: info.usr, args: [] } : undefined;
    this.witnesses.set(key, witness ?? null);
    return witness;
  }
  pickable(requirements, limit = 24) {
    const values = Object.entries(VALUE_NAMES).filter(([name]) => PICKED_VALUES.has(name));
    const pools = requirements.map((c) => {
      const info = c.rhsPrecise ? this.index.get(c.rhsPrecise) : undefined;
      if (!info && PASSIVE.has(c.rhs.split(".").at(-1)))
        return new Set(values.map(([, usr]) => usr));
      return new Set(info?.conformers ?? []);
    });
    const usrs = [...pools[0] ?? []].filter((usr) => pools.every((p) => p.has(usr)));
    const named = values.filter(([, usr]) => usrs.includes(usr)).map(([name]) => ({ name, swift: name }));
    const types = usrs.map((usr) => this.index.get(usr)).filter((info) => !!info && ["class", "struct", "enum", "actor"].includes(info.kind) && !info.genericParameters?.length && !info.path.some((p) => p.startsWith("_")) && !Object.values(VALUE_NAMES).includes(info.usr) && this.type({ k: "named", name: `${info.module}.${info.path.join(".")}`, usr: info.usr, args: [] }, "output", NO_GENERICS).ok).map((info) => ({ name: tsName(`${info.module}.${info.path.join(".")}`), swift: `${info.module}.${info.path.map((p) => /^[A-Za-z_]\w*$/.test(p) ? p : `\`${p}\``).join(".")}` })).sort((a, b) => a.name < b.name ? -1 : 1);
    return types.length > limit ? named : [...named, ...types];
  }
  type(type, position, generics) {
    switch (type.k) {
      case "optional": {
        const inner = this.type(type.t, position, generics);
        return inner.ok ? { ok: true, ts: `${inner.ts} | null` } : inner;
      }
      case "array":
      case "variadic": {
        const inner = this.type(type.t, position, generics);
        return inner.ok ? { ok: true, ts: `${wrap(inner.ts)}[]` } : inner;
      }
      case "dictionary": {
        const key = this.type(type.key, position, generics);
        if (!key.ok)
          return key;
        if (key.ts !== "string" && key.ts !== "number" && !/^'/.test(key.ts)) {
          return { ok: true, ts: `NativeMap<${key.ts}, ${this.must(type.value, position, generics)}>` };
        }
        const value = this.type(type.value, position, generics);
        return value.ok ? { ok: true, ts: `Record<${key.ts}, ${value.ts}>` } : value;
      }
      case "tuple": {
        if (!type.items.length)
          return { ok: true, ts: "void" };
        const items = type.items.map((item) => ({ label: item.label, b: this.type(item.t, position, generics) }));
        const bad = items.find((item) => !item.b.ok);
        if (bad)
          return bad.b;
        return {
          ok: true,
          ts: items.every((item) => item.label) ? `{ ${items.map((item) => `${item.label}: ${item.b.ts}`).join("; ")} }` : `[${items.map((item) => item.b.ts).join(", ")}]`
        };
      }
      case "function":
        return this.callback(type, position, generics);
      case "existential": {
        const info = !type.some && type.t.k === "named" && !type.t.args.length && type.t.usr ? this.index.get(type.t.usr) : undefined;
        if (info?.associatedTypes)
          return { ok: true, ts: `Handle<'${tsName(`${info.module}.${info.path.join(".")}`)}'>` };
        return this.protocolType(type.t, position, generics);
      }
      case "composition": {
        const items = type.items.map((item) => this.protocolType(item, position, generics));
        const bad = items.find((item) => !item.ok);
        return bad ?? { ok: true, ts: items.map((item) => item.ts).join(" & ") };
      }
      case "inout":
        return this.type(type.t, position, generics);
      case "metatype":
        return this.metatype(type.t, generics);
      case "named":
        return this.named(type, position, generics);
    }
  }
  must(type, position, generics) {
    const b = this.type(type, position, generics);
    return b.ok ? b.ts : "unknown";
  }
  named(type, position, generics) {
    const last = type.name.split(".").at(-1);
    if (/^(each|repeat) /.test(type.name))
      return { ok: false, reason: "parameter pack" };
    const generic = this.generic(type.name, position, generics);
    if (generic)
      return generic;
    if (POINTERS.test(last))
      return this.pointer(type, position, generics);
    if (last === "AnyClass" || last === "Protocol")
      return { ok: true, ts: "string" };
    if (BOOLEAN_NAMES.has(last))
      return { ok: true, ts: "boolean" };
    if (C_ALIASES[last] && !this.index.has(type.usr ?? ""))
      return { ok: true, ts: "number" };
    if (["KeyPath", "WritableKeyPath", "ReferenceWritableKeyPath", "PartialKeyPath", "AnyKeyPath"].includes(last)) {
      const args = type.args.map((arg) => this.type(arg, position, generics));
      const bad = args.find((arg) => !arg.ok);
      if (bad)
        return bad;
      const erased = handle(`Swift.${last}`, args.map((arg) => arg.ts));
      const names = position === "input" ? this.keyPaths(type, generics).map((p) => `'${p.name}'`) : [];
      return { ok: true, ts: names.length ? `${names.join(" | ")} | ${erased}` : erased };
    }
    if (UNBRIDGEABLE_NAMES[last])
      return { ok: false, reason: UNBRIDGEABLE_NAMES[last] };
    const usr = type.usr ?? VALUE_NAMES[type.name];
    const rejected = appStoreRejected(usr);
    if (rejected)
      return rejected;
    if (usr && VALUES[usr])
      return { ok: true, ts: VALUES[usr] };
    if (type.name === "Any" || type.name === "AnyObject" || type.name === "AnyHashable") {
      return { ok: true, ts: "unknown" };
    }
    if (usr === "s:Sq" || type.name === "Optional") {
      return type.args[0] ? this.type({ k: "optional", t: type.args[0], implicit: false }, position, generics) : { ok: false, reason: "generic" };
    }
    if (usr === "s:Sa" || usr === "s:Sh" || type.name === "Array" || type.name === "Set" || type.name === "ContiguousArray") {
      return type.args[0] ? this.type({ k: "array", t: type.args[0] }, position, generics) : { ok: false, reason: "generic" };
    }
    if (usr === "s:SD" || type.name === "Dictionary") {
      return type.args.length === 2 ? this.type({ k: "dictionary", key: type.args[0], value: type.args[1] }, position, generics) : { ok: false, reason: "generic" };
    }
    if (type.name === "InlineArray" && type.args.length === 2) {
      return this.type({ k: "array", t: type.args[1] }, position, generics);
    }
    const args = [];
    for (const arg of type.args) {
      if (arg.k === "named" && !arg.args.length && generics.owned.has(arg.name) && !generics.resolved.has(arg.name)) {
        args.push(arg.name);
        continue;
      }
      const b = this.type(arg, position, generics);
      if (!b.ok)
        return b;
      args.push(b.ts);
    }
    const info = usr ? this.index.get(usr) : undefined;
    if (info?.kind === "typealias" && info.alias && !info.genericParameters?.length && this.aliasDepth < 16) {
      this.aliasDepth++;
      try {
        return this.type(info.alias, position, NO_GENERICS);
      } finally {
        this.aliasDepth--;
      }
    }
    if (info?.kind === "typealias" && info.genericParameters?.length && !this.aliasOf(type, info)) {
      return { ok: false, reason: "generic" };
    }
    const name = tsName(info ? `${info.module}.${info.path.join(".")}` : type.name);
    if (info?.kind === "enum" && info.cases?.length && !info.payload) {
      return { ok: true, ts: info.cases.map((c) => `'${c}'`).join(" | ") };
    }
    if (info?.optionSet) {
      return { ok: true, ts: info.constants?.length ? `(${info.constants.map((c) => `'${c}'`).join(" | ")})[]` : "string[]" };
    }
    if (info?.rawValue && info.kind === "struct") {
      return { ok: true, ts: [...(info.constants ?? []).map((c) => `'${c}'`), `(${info.rawValue} & {})`].join(" | ") };
    }
    if (info?.kind === "protocol")
      return this.protocolType(type, position, generics);
    if (info?.kind === "associatedtype")
      return { ok: false, reason: "generic" };
    return { ok: true, ts: handle(name, args) };
  }
  generic(name, position, generics) {
    const direct = generics.resolved.get(name);
    const resolved = direct ?? (name.includes(".") && generics.resolved.has(name.split(".")[0]) ? this.substitute({ k: "named", name, args: [] }, generics) : undefined);
    if (resolved) {
      return this.type(resolved, position, { ...generics, resolved: new Map });
    }
    const root = name.split(".")[0];
    if (generics.objcOpen.has(root) && !name.includes("."))
      return { ok: true, ts: root };
    if (generics.params.has(root) || root === "Self")
      return { ok: false, reason: `generic: no canonical witness for ${name}` };
    return;
  }
  pointer(type, position, generics) {
    const name = type.name.split(".").at(-1);
    if (name === "OpaquePointer")
      return { ok: true, ts: handle(name, []) };
    if (name === "CVaListPointer")
      return { ok: false, reason: "variadic argument list" };
    const written = outPointee(type);
    if (written) {
      const error = cErrorOut(written);
      const unmanaged = !error && written.k === "optional" && written.t.k === "named" && written.t.name.split(".").at(-1) === "Unmanaged";
      if (position !== "input" || unmanaged)
        return { ok: false, reason: "pointer out-parameter" };
      const value = this.type(error ?? written, "output", generics);
      return value.ok ? { ok: true, ts: `NativeOut<${value.ts}>` } : value;
    }
    const sized = name.includes("Buffer");
    let memory;
    const raw = name.includes("Raw");
    let elementTs = "";
    if (raw)
      memory = "ArrayBuffer";
    else {
      const element = type.args[0];
      if (!element)
        return { ok: false, reason: "pointer out-parameter" };
      const bare = element.k === "optional" ? undefined : element;
      const pointee = bare?.k === "named" ? bare.name.split(".").at(-1) : "";
      if (!bare || BOOLEAN_NAMES.has(pointee) || pointee === "Unmanaged")
        return { ok: false, reason: "pointer out-parameter" };
      if (POINTERS.test(pointee))
        return { ok: false, reason: "pointer to pointer" };
      const value = this.type(bare, "input", generics);
      if (!value.ok)
        return value;
      memory = this.typedArray(bare) ?? `${wrap(value.ts)}[]`;
      elementTs = value.ts;
    }
    const erased = handle(name, raw ? [] : [elementTs]);
    if (sized)
      return { ok: true, ts: memory };
    return { ok: true, ts: position === "input" ? `${memory} | ${erased}` : erased };
  }
  typedArray(type, depth = 0) {
    if (type.k !== "named" || depth > 8)
      return;
    const last = type.name.split(".").at(-1);
    if (TYPED_ARRAYS[last])
      return TYPED_ARRAYS[last];
    if (C_ALIASES[last])
      return TYPED_ARRAYS[C_ALIASES[last]];
    const alias = this.aliasOf(type);
    return alias ? this.typedArray(alias, depth + 1) : undefined;
  }
  metatype(type, generics) {
    if (type.k === "existential")
      return this.metatype(type.t, generics);
    if (type.k === "named") {
      const resolved = generics.resolved.get(type.name);
      if (resolved && resolved.k === "named" && resolved.name !== type.name)
        return this.metatype(resolved, generics);
      if (generics.classes.has(type.name) || type.name === "AnyObject")
        return { ok: true, ts: "string" };
      const info = type.usr ? this.index.get(type.usr) : undefined;
      if (info?.kind === "class")
        return { ok: true, ts: "string" };
      if (info?.kind === "protocol" && type.usr?.startsWith("c:objc(pl)"))
        return { ok: true, ts: "string" };
    }
    return { ok: false, reason: "metatype" };
  }
  generics(symbol, owner, own = []) {
    const g = { params: new Set, resolved: new Map, classes: new Set, owned: new Set(own), objcOpen: new Set };
    for (const p of symbol.swiftGenerics?.parameters ?? [])
      g.params.add(p.name);
    for (const p of owner?.swiftGenerics?.parameters ?? []) {
      g.params.add(p.name);
      g.owned.add(p.name);
    }
    const constraints = [...constraintsOf(symbol), ...constraintsOf(owner), ...symbol.swiftExtension?.constraints ?? []];
    const heads = new Set([...g.params, ...constraints.map((c) => c.lhs)]);
    for (const head of heads) {
      const specialized = this.specialize(head, constraints, g.params);
      if (specialized)
        g.resolved.set(head, specialized.type);
      if (specialized?.class)
        g.classes.add(head);
    }
    if (owner?.identifier.precise.startsWith("c:objc") && owner.swiftGenerics?.parameters?.length === 1) {
      const witnesses = this.index.get(owner.identifier.precise)?.objcWitnesses;
      if (witnesses?.length) {
        for (const p of owner.swiftGenerics.parameters) {
          if (g.params.has(p.name) && !g.resolved.has(p.name))
            g.objcOpen.add(p.name);
        }
      }
    }
    if (owner) {
      const info = this.index.get(owner.identifier.precise);
      const name = info ? `${info.module}.${info.path.join(".")}` : owner.pathComponents.join(".");
      g.resolved.set("Self", { k: "named", name, usr: owner.identifier.precise, args: (owner.swiftGenerics?.parameters ?? []).map((p) => g.resolved.get(p.name) ?? { k: "named", name: p.name, args: [] }) });
    } else if (symbol.swiftExtension && symbol.pathComponents.length > 1) {
      const name = `${symbol.swiftExtension.extendedModule}.${symbol.pathComponents.slice(0, -1).join(".")}`;
      g.resolved.set("Self", { k: "named", name, args: [] });
    }
    return g;
  }
  specialize(head, constraints, params, active = new Set) {
    if (active.has(head))
      return;
    const next = new Set([...active, head]);
    const equal = new Set([head]);
    for (let changed = true;changed; ) {
      changed = false;
      for (const c of constraints)
        if (c.kind === "sameType" && (equal.has(c.lhs) || equal.has(c.rhs))) {
          for (const name of [c.lhs, c.rhs])
            if (!equal.has(name)) {
              equal.add(name);
              changed = true;
            }
        }
    }
    const mine = constraints.filter((c) => equal.has(c.lhs));
    const concrete = (name) => !params.has(name.split(/[.<]/)[0]) && !name.startsWith("Self.");
    const parse = (name, usr) => {
      try {
        const t = parseType([{ kind: "text", spelling: name }]);
        if (t.k === "named" && usr) {
          const info = this.index.get(usr);
          return { ...t, usr, name: info ? `${info.module}.${info.path.join(".")}` : t.name };
        }
        return t;
      } catch {
        return;
      }
    };
    const same = [...equal].find((name) => name !== head && concrete(name));
    if (same) {
      const type = parse(same, constraints.find((c) => c.rhs === same)?.rhsPrecise);
      return type ? { type } : undefined;
    }
    const base = mine.find((c) => c.kind === "superclass" && concrete(c.rhs));
    if (base) {
      const type = parse(base.rhs, base.rhsPrecise);
      return type ? { type, class: true } : undefined;
    }
    const requirements = mine.filter((c) => c.kind === "conformance");
    const protocols = requirements.map((c) => c.rhs.split(".").at(-1));
    const only = (allowed) => protocols.every((p) => allowed.has(p));
    const std = (name) => ({ k: "named", name, usr: VALUE_NAMES[name], args: [] });
    const associated = (member) => {
      for (const name of equal) {
        const value = this.specialize(`${name}.${member}`, constraints, params, next);
        if (value)
          return value.type;
      }
      return;
    };
    if (protocols.some((p) => COLLECTIONS.has(p))) {
      if (!only(new Set([...COLLECTIONS, ...PASSIVE])))
        return;
      const element = associated("Element");
      return element ? { type: { k: "array", t: element } } : undefined;
    }
    if (protocols.includes("RangeExpression")) {
      const bound = associated("Bound");
      return bound ? { type: { k: "named", name: "Swift.Range", args: [bound] } } : undefined;
    }
    const integer = protocols.some((p) => INTEGERS.has(p));
    const floating = protocols.some((p) => FLOATS.has(p));
    if (integer || floating) {
      if (integer && floating)
        return;
      return only(integer ? INTEGER_OK : FLOAT_OK) ? { type: std(protocols.includes("UnsignedInteger") ? "UInt" : integer ? "Int" : "Double") } : undefined;
    }
    if (protocols.some((p) => ["Numeric", "SignedNumeric", "AdditiveArithmetic"].includes(p))) {
      return only(FLOAT_OK) ? { type: std("Double") } : undefined;
    }
    if (protocols.includes("StringProtocol"))
      return only(STRING_OK) ? { type: std("String") } : undefined;
    if (protocols.some((p) => DATA_PROTOCOLS.has(p)))
      return only(DATA_OK) ? { type: std("Data") } : undefined;
    const erased = protocols.find((p) => ERASERS[p]);
    if (erased)
      return only(new Set([...PASSIVE, erased])) ? { type: { k: "named", name: ERASERS[erased], args: [] } } : undefined;
    if (protocols.includes("AnyObject") && only(new Set(["AnyObject", "Sendable"])))
      return { type: { k: "named", name: "Foundation.NSObject", args: [] }, class: true };
    if (protocols.includes("Error"))
      return only(new Set(["Error", "Sendable"])) ? { type: std("Error") } : undefined;
    if (protocols.length && only(PASSIVE))
      return { type: std("Int") };
    if (requirements.length) {
      const witness = this.protocolWitness(requirements);
      return witness ? { type: witness } : undefined;
    }
    if (params.has(head))
      return { type: std("Any") };
    return;
  }
  protocolType(type, position, generics) {
    if (type.k !== "named")
      return this.type(type, position, generics);
    const rejected = appStoreRejected(type.usr);
    if (rejected)
      return rejected;
    const info = type.usr ? this.index.get(type.usr) : undefined;
    if (type.name === "Error" || type.usr === "s:s5ErrorP")
      return { ok: true, ts: "NativeError" };
    if (type.name === "AnyObject" || type.name === "Any")
      return { ok: true, ts: "unknown" };
    const generic = this.generic(type.name, position, generics);
    if (generic)
      return generic;
    const name = tsName(info ? `${info.module}.${info.path.join(".")}` : type.name);
    if (info?.associatedTypes)
      return { ok: false, reason: "protocol with associated types" };
    if (position === "input") {
      return info?.implementable === false ? { ok: true, ts: `Handle<'${name}'>` } : { ok: true, ts: `Implements<'${name}'> | Handle<'${name}'>` };
    }
    return { ok: true, ts: `Handle<'${name}'>` };
  }
  keyPaths(type, generics) {
    const [root, value] = type.args.map((t) => this.substitute(t, generics));
    const info = root?.k === "named" && root.usr ? this.index.get(root.usr) : undefined;
    if (!info || info.genericParameters?.length)
      return [];
    const writable = type.name.split(".").at(-1) !== "KeyPath" && !type.name.endsWith("PartialKeyPath");
    const signature = (t) => t.k === "named" ? `${t.usr ?? t.name}<${t.args.map(signature).join(",")}>` : t.k === "optional" ? `${signature(t.t)}?` : typeText(t);
    return (info.properties ?? []).filter((p) => (!writable || p.writable) && (!value || signature(p.type) === signature(value)));
  }
  callback(type, position, generics) {
    if (position === "output")
      for (const p of type.params) {
        const callback = p.t.k === "optional" ? p.t.t : p.t;
        if (callback.k === "function" && (callback.async || callback.throws || !(callback.result.k === "named" && callback.result.name === "Void" || callback.result.k === "tuple" && !callback.result.items.length))) {
          return { ok: false, reason: "callable handle requires an asynchronous JS callback result" };
        }
      }
    const argPosition = position === "input" ? "output" : "input";
    const resultPosition = position === "input" ? "input" : "output";
    const params = type.params.map((p) => {
      const out = position === "input" ? callbackOut(p.t) : undefined;
      const b = this.type(out ?? p.t, argPosition, generics);
      return out && b.ok ? { ok: true, ts: `NativeOut<${b.ts}>` } : b;
    });
    const bad = params.find((p) => !p.ok);
    if (bad)
      return bad;
    const result = this.type(type.result, resultPosition, generics);
    if (!result.ok)
      return result;
    if (position === "input" && result.ts !== "void" && !type.async && !type.throws) {
      return { ok: false, reason: "callback cannot propagate synchronous failure" };
    }
    if (position === "input" && type.result.k === "function")
      return { ok: false, reason: "callback returns a function" };
    const args = params.map((p, i) => `a${i}: ${p.ts}`).join(", ");
    return { ok: true, ts: `(${args}) => ${type.async || position === "output" ? `Promise<${result.ts}>` : result.ts}` };
  }
}
function callbackOut(type) {
  if (type.k !== "named" || type.name.split(".").at(-1) !== "UnsafeMutablePointer")
    return;
  const t = type.args[0];
  return t?.k === "named" && ["ObjCBool", "Bool"].includes(t.name.split(".").at(-1)) ? t : undefined;
}
function handle(name, args) {
  return args.length ? `Handle<'${name}', [${args.join(", ")}]>` : `Handle<'${name}'>`;
}
function wrap(ts) {
  return /[|&]/.test(ts) && !/^Handle</.test(ts) ? `(${ts})` : ts;
}
function tsName(qualified) {
  return qualified.replace(/[^A-Za-z0-9_.]/g, "_");
}
var SKIP_NAMES = new Set(["hash(into:)", "hashValue", "init(from:)", "encode(to:)"]);
function inUniverse(symbol, requirementUsrs) {
  if (symbol.accessLevel !== "public" && symbol.accessLevel !== "open")
    return false;
  if (symbol.identifier.precise.includes("::SYNTHESIZED::"))
    return false;
  if (symbol.kind.identifier === "swift.func.op" || symbol.kind.identifier === "swift.macro")
    return false;
  if (symbol.pathComponents.some((p) => p.startsWith("_")))
    return false;
  if (SKIP_NAMES.has(symbol.pathComponents.at(-1)))
    return false;
  if (requirementUsrs.has(symbol.identifier.precise))
    return false;
  if (APP_STORE_REJECTED.test(symbol.identifier.precise))
    return false;
  const ios = symbol.availability?.find((a) => a.domain === "iOS");
  if (ios?.isUnconditionallyUnavailable || ios?.obsoleted)
    return false;
  const anyUnavailable = symbol.availability?.find((a) => a.domain === "*" && a.isUnconditionallyUnavailable);
  if (anyUnavailable)
    return false;
  if (symbol.availability?.length && !ios && symbol.availability.every((a) => a.domain !== "*" && a.domain !== "iOS" && a.domain !== "iPadOS" && a.domain !== "macCatalyst" && !a.domain.startsWith("Swift")))
    return false;
  return true;
}
function aliasFragments(symbol) {
  const fragments = symbol.declarationFragments ?? [];
  const eq = fragments.findIndex((f) => f.kind === "text" && f.spelling.includes("="));
  if (eq < 0)
    return;
  const head = fragments[eq];
  const rest = [{ ...head, spelling: head.spelling.slice(head.spelling.indexOf("=") + 1) }, ...fragments.slice(eq + 1)];
  const where = rest.findIndex((f) => f.kind === "keyword" && f.spelling.trim() === "where");
  return where < 0 ? rest : rest.slice(0, where);
}
function aliasTarget(symbol) {
  const fragments = aliasFragments(symbol);
  try {
    return fragments && parseType(fragments);
  } catch (error) {
    if (error instanceof TypeParseError)
      return;
    throw error;
  }
}
function pickOf(bridge, symbol, owner, generics) {
  const own = [...generics.params].filter((name) => !generics.owned.has(name));
  if (own.length !== 1 || owner?.swiftGenerics?.parameters?.length || symbol.kind.identifier === "swift.init")
    return;
  const name = own[0];
  const requirements = [...constraintsOf(symbol), ...symbol.swiftExtension?.constraints ?? []];
  if (!requirements.length || !requirements.every((c) => c.kind === "conformance" && c.lhs === name))
    return;
  const param = (symbol.functionSignature?.parameters ?? []).findIndex((p) => {
    try {
      const t = parameterType(p.declarationFragments);
      return t.k === "metatype" && t.t.k === "named" && t.t.name === name;
    } catch {
      return false;
    }
  });
  if (param < 0)
    return;
  const choices = bridge.pickable(requirements);
  if (choices.length < 2)
    return;
  const types = requirements.map((c) => {
    const info = c.rhsPrecise ? bridge.index.get(c.rhsPrecise) : undefined;
    return info ? `${info.module}.${info.path.join(".")}` : c.rhs;
  });
  return { name, param, choices, requirements: types };
}
function judge(bridge, symbol, owner) {
  if (symbol.identifier.precise === "c:@kColorSyncPreferredCMM") {
    return { covered: false, reason: "unavailable on iOS: ColorSyncTransform.h declares kColorSyncPreferredCMM CS_UNAVAILABLE_EMBEDDED" };
  }
  if (symbol.identifier.precise === "c:@kCFAllocatorUseContext") {
    return { covered: false, reason: "non-object C pointer sentinel cannot be retained as an SDK handle" };
  }
  const kind = symbol.kind.identifier;
  const own = kind === "swift.typealias" ? (symbol.swiftGenerics?.parameters ?? []).map((p) => p.name) : [];
  const generics = bridge.generics(symbol, owner, own);
  try {
    if (kind === "swift.class" || kind === "swift.struct" || kind === "swift.actor")
      return { covered: true };
    if (kind === "swift.enum")
      return { covered: true };
    if (kind === "swift.protocol") {
      const info = bridge.index.get(symbol.identifier.precise);
      return info?.associatedTypes ? { covered: false, reason: "protocol with associated types" } : { covered: true };
    }
    if (kind === "swift.associatedtype")
      return { covered: false, reason: "generic" };
    if (kind === "swift.typealias") {
      const fragments = aliasFragments(symbol);
      if (!fragments)
        return { covered: true };
      const b = bridge.type(parseType(fragments), "output", generics);
      return b.ok ? { covered: true } : { covered: false, reason: b.reason };
    }
    if (kind === "swift.enum.case")
      return { covered: true };
    if (kind === "swift.property" || kind === "swift.type.property" || kind === "swift.var") {
      const fragments = symbol.declarationFragments ?? [];
      const name = fragments.findIndex((f) => f.kind === "identifier");
      const colon = fragments.findIndex((f, i) => i > name && f.kind === "text" && f.spelling.includes(":"));
      if (colon < 0)
        return { covered: true };
      const head = fragments[colon];
      const body = [{ ...head, spelling: head.spelling.slice(head.spelling.indexOf(":") + 1) }, ...fragments.slice(colon + 1)];
      const brace = body.findIndex((f) => f.kind === "text" && /[{=]/.test(f.spelling));
      const typeFragments = brace < 0 ? body : [...body.slice(0, brace), { ...body[brace], spelling: body[brace].spelling.split(/[{=]/)[0] }];
      const b = bridge.type(parseType(typeFragments), "output", generics);
      return b.ok ? { covered: true } : { covered: false, reason: b.reason };
    }
    if (kind === "swift.method" || kind === "swift.type.method" || kind === "swift.func" || kind === "swift.init" || kind === "swift.subscript" || kind === "swift.type.subscript") {
      const signature = symbol.functionSignature;
      const defaults = parameterDefaults(symbol.declarationFragments ?? []);
      const pick = pickOf(bridge, symbol, owner, generics);
      for (const [i, parameter] of (signature?.parameters ?? []).entries()) {
        if (pick?.param === i)
          continue;
        const b = bridge.type(parameterType(parameter.declarationFragments), "input", generics);
        if (!b.ok && defaults[i] === undefined)
          return { covered: false, reason: b.reason };
      }
      if (signature?.returns?.length && kind !== "swift.init") {
        const text = signature.returns.map((f) => f.spelling).join("").trim();
        if (text && text !== "()" && text !== "Void") {
          const b = bridge.type(parseType(signature.returns), "output", generics);
          if (!b.ok)
            return { covered: false, reason: b.reason };
        }
      }
      return { covered: true };
    }
    return { covered: false, reason: `kind ${kind}` };
  } catch (error) {
    if (error instanceof TypeParseError) {
      if (process.env.SDK_PARSE_DEBUG)
        console.error(symbol.pathComponents.join("."), error.message);
      return { covered: false, reason: "unparsed type" };
    }
    throw error;
  }
}
// codegen/sdk/graph.ts
import { execFile, execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
var run = promisify(execFile);
var sdkPath = (sdk = "iphonesimulator") => execFileSync("xcrun", ["--sdk", sdk, "--show-sdk-path"], { encoding: "utf8" }).trim();
var sdkVersion = () => execFileSync("xcrun", ["--sdk", "iphonesimulator", "--show-sdk-version"], { encoding: "utf8" }).trim();
var SWIFT_LIBRARIES = ["Dispatch", "Distributed", "ObjectiveC", "Observation", "RegexBuilder", "Spatial", "Synchronization", "System"];
function sdkModules(sdk = sdkPath()) {
  const dir = join(sdk, "System/Library/Frameworks");
  const frameworks = readdirSync(dir).filter((entry) => entry.endsWith(".framework")).map((entry) => entry.slice(0, -".framework".length)).filter((module) => existsSync(join(dir, `${module}.framework/Modules`)));
  const libraries = SWIFT_LIBRARIES.filter((module) => existsSync(join(sdk, `usr/lib/swift/${module}.swiftmodule`)));
  return [...frameworks, ...libraries].sort();
}
function cacheDir(version) {
  const dir = join(homedir(), ".cache", "one", "sdk-graphs", version);
  mkdirSync(dir, { recursive: true });
  return dir;
}
async function extractGraphs(modules, { concurrency = 6, minimumIos = "18.0" } = {}) {
  const sdk = sdkPath();
  const dir = cacheDir(sdkVersion());
  const cached = new Set(readdirSync(dir).map((file) => file.split(/[.@]/)[0]));
  const pending = modules.filter((module) => !cached.has(module));
  const failed = [];
  const extracted = [];
  let next = 0;
  const worker = async () => {
    while (next < pending.length) {
      const module = pending[next++];
      try {
        await run("xcrun", [
          "swift-symbolgraph-extract",
          "-module-name",
          module,
          "-target",
          `arm64-apple-ios${minimumIos}-simulator`,
          "-sdk",
          sdk,
          "-output-dir",
          dir,
          "-minimum-access-level",
          "public"
        ], { maxBuffer: 64 * 1024 * 1024 });
        extracted.push(module);
      } catch (error) {
        const text = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
        failed.push({ module, error: text.split(`
`).find((line) => line.includes("error")) ?? text.slice(0, 200) });
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return { extracted, failed };
}
function loadGraph(module) {
  const dir = cacheDir(sdkVersion());
  const files = readdirSync(dir).filter((file) => (file === `${module}.symbols.json` || file.startsWith(`${module}@`)) && file.endsWith(".symbols.json")).map((file) => join(dir, file));
  if (!files.length)
    return null;
  const graph = { module, symbols: [], relationships: [] };
  for (const file of files) {
    const data = JSON.parse(readFileSync(file, "utf8"));
    graph.symbols.push(...data.symbols);
    graph.relationships.push(...data.relationships ?? []);
  }
  addInheritedInitializers(graph);
  return graph;
}
function addInheritedInitializers(graph) {
  const subclasses = new Set(graph.relationships.filter((r) => r.kind === "inheritsFrom").map((r) => r.source));
  const declared = new Set(graph.symbols.filter((s) => s.kind.identifier === "swift.init" && s.pathComponents.at(-1) === "init()").map((s) => s.pathComponents.slice(0, -1).join(".")));
  for (const owner of graph.symbols.filter((s) => s.kind.identifier === "swift.class")) {
    const usr = owner.identifier.precise;
    if (!usr.startsWith("c:objc(cs)") || !subclasses.has(usr) || declared.has(owner.pathComponents.join(".")))
      continue;
    const init = `${usr}(im)init`;
    graph.symbols.push({
      kind: { identifier: "swift.init" },
      identifier: { precise: init },
      pathComponents: [...owner.pathComponents, "init()"],
      names: { title: "init()" },
      accessLevel: owner.accessLevel,
      declarationFragments: [{ kind: "keyword", spelling: "init" }, { kind: "text", spelling: "()" }],
      functionSignature: { parameters: [] },
      synthesizedInit: true
    });
    graph.relationships.push({ kind: "memberOf", source: init, target: usr });
  }
}

// codegen/sdk/emit-protocols.ts
var text = (fragments = []) => fragments.map((f) => f.spelling).join("");
var quoted = (name) => `\`${name.replace(/`/g, "")}\``;
var SYNC_REASON = "synchronous protocol result requires an active JS-thread call; delegate invocations can escape it";
var MARKERS = new Set(["s:s8SendableP", "s:s16SendableMetatypeP"]);
function emitProtocols(graph, bridge, all, exclude, skipped) {
  const graphs = new Map([[graph.module, graph]]);
  const imports = new Set;
  let protocolImports = new Set;
  const getGraph = (module) => {
    if (!graphs.has(module)) {
      const loaded = loadGraph(module);
      if (loaded)
        graphs.set(module, loaded);
    }
    return graphs.get(module);
  };
  const qualify = (fragments) => fragments.map((f, i) => {
    const info = f.preciseIdentifier && bridge.index.get(f.preciseIdentifier);
    if (info && f.kind === "typeIdentifier" && !f.spelling.includes(".") && !text(fragments.slice(0, i)).endsWith(".")) {
      protocolImports.add(info.module);
      return `${info.module}.${info.path.map(quoted).join(".")}`;
    }
    return f.spelling;
  }).join("");
  const versionOf = (symbol) => symbol?.availability?.find((a) => a.domain === "iOS")?.introduced;
  const newest = (a, b) => !a || b && (b.major > a.major || b.major === a.major && (b.minor ?? 0) > (a.minor ?? 0)) ? b : a;
  const nonescaping = (type) => type.k === "function" && !type.escaping;
  const blocks = [];
  const protocols = new Map(graph.symbols.filter((s) => s.kind.identifier === "swift.protocol").map((s) => [s.identifier.precise, s]));
  for (const [usr, symbol] of protocols) {
    if (!inUniverse(symbol, new Set))
      continue;
    const key = `implementation:${usr}`;
    const path = `protocol implementation ${symbol.pathComponents.join(".")}`;
    const drop = (reason) => skipped.push({ usr: key, path, reason });
    const info = bridge.index.get(usr);
    protocolImports = new Set;
    if (exclude.has(key)) {
      drop(exclude.get(key));
      continue;
    }
    if (info?.associatedTypes) {
      drop("protocol with associated types");
      continue;
    }
    const requirements = new Map;
    const visited = new Set;
    let reason;
    let classVersion = versionOf(symbol);
    const collect = (id) => {
      if (visited.has(id) || id === "c:objc(pl)NSObject" || MARKERS.has(id))
        return;
      visited.add(id);
      const owner = bridge.index.get(id);
      classVersion = newest(classVersion, versionOf(all.get(id)));
      if (owner?.associatedTypes) {
        reason = "protocol with associated types";
        return;
      }
      const source = owner ? getGraph(owner.module) : undefined;
      if (!source) {
        reason = "inherited protocol graph unavailable";
        return;
      }
      const symbols = new Map(source.symbols.map((s) => [s.identifier.precise, s]));
      for (const rel of source.relationships) {
        if (rel.source === id && (rel.kind === "inheritsFrom" || rel.kind === "conformsTo"))
          collect(rel.target);
        if (rel.target !== id || !["requirementOf", "optionalRequirementOf"].includes(rel.kind))
          continue;
        const member = symbols.get(rel.source);
        if (member && inUniverse(member, new Set))
          requirements.set(rel.source, { symbol: member, optional: rel.kind === "optionalRequirementOf" });
      }
    };
    collect(usr);
    for (const requirement of requirements.values()) {
      if (!requirement.optional)
        classVersion = newest(classVersion, versionOf(requirement.symbol));
    }
    const objc = usr.startsWith("c:") && usr.includes("objc(pl)");
    const methods = [];
    const selectors = [];
    const required = [];
    const accepted = [];
    const name = `OneSDKImpl_${graph.module}_${symbol.pathComponents.join("_").replace(/[^a-zA-Z0-9_]/g, "_")}`;
    for (const { symbol: requirement, optional } of requirements.values()) {
      const title = requirement.names.title;
      const decl = text(requirement.declarationFragments);
      const returns = text(requirement.functionSignature?.returns).trim();
      const effects = effectsOf(decl);
      const awaitsReply = effects.isAsync && effects.throws;
      let unsupported;
      if (requirement.kind.identifier !== "swift.method")
        unsupported = "non-method protocol requirement";
      else if (returns && !["()", "Void"].includes(returns) && !awaitsReply)
        unsupported = SYNC_REASON;
      else if (requirement.swiftGenerics?.parameters?.length || /\b(Self|inout|rethrows)\b/.test(decl))
        unsupported = "generic or mutable protocol requirement";
      else if (effects.isAsync && !effects.throws)
        unsupported = "async protocol requirement cannot propagate callback failure";
      else if (requirement.functionSignature?.parameters?.some((p) => nonescaping(bridge.functions(parameterType(p.declarationFragments)))))
        unsupported = "nonescaping protocol callback cannot use the async dispatcher";
      if (unsupported) {
        if (optional)
          skipped.push({ usr: `${key}:${requirement.identifier.precise}`, path: `${path}.${title}`, reason: unsupported });
        else
          reason = unsupported;
        continue;
      }
      const open = title.indexOf("(");
      const base = title.slice(0, open);
      const labels = title.slice(open + 1, -1).split(":").slice(0, -1);
      const params = requirement.functionSignature?.parameters ?? [];
      const types = [];
      const args = params.map((p, i) => {
        const fragments = qualify(p.declarationFragments);
        const type = fragments.slice(fragments.indexOf(":") + 1).trim().replace(/\s=\s.*$/s, "");
        types.push(type.replace(/^@escaping\s+/, ""));
        return `${labels[i] === "_" ? "_" : quoted(labels[i] ?? p.name)} p${i}: ${type}`;
      });
      const values = params.map((p, i) => outputValue(bridge.functions(parameterType(p.declarationFragments)), `p${i}`));
      const methodVersion = newest(classVersion, versionOf(requirement));
      const available = methodVersion ? `@available(iOS ${methodVersion.major}.${methodVersion.minor ?? 0}, *)
  ` : "";
      const result = returns && !["()", "Void"].includes(returns) ? qualify(requirement.functionSignature.returns) : undefined;
      const suffix = `${effects.isAsync ? " async" : ""}${effects.throws ? " throws" : ""}${result ? ` -> ${result}` : ""}`;
      const body = awaitsReply ? `guard let method = methods[${JSON.stringify(title)}] else { throw OneSDKError.unsupported("missing protocol method ${title}") }
    ${result ? "return try await method.resultAsync" : "_ = try await method.responseAsync"}([${values.join(", ")}])` : `methods[${JSON.stringify(title)}]?(${values.join(", ")})`;
      methods.push(`  ${available}func ${quoted(base)}(${args.join(", ")})${suffix} {
    ${body}
  }`);
      accepted.push(title);
      if (!optional) {
        required.push(title);
        classVersion = newest(classVersion, versionOf(requirement));
      }
      if (objc) {
        const reference = `${name}.${quoted(base)}${labels.length ? `(${labels.map((l) => `${l === "_" ? "_" : quoted(l)}:`).join("")})` : ""}`;
        const selector = `#selector(${reference} as (${name}) -> (${types.join(", ")})${effects.isAsync ? " async" : ""}${effects.throws ? " throws" : ""} -> ${result ?? "Void"})`;
        const version = methodVersion;
        const insert = `out[${selector}] = ${JSON.stringify(title)}`;
        selectors.push(version ? `    if #available(iOS ${version.major}.${version.minor ?? 0}, *) { ${insert} }` : `    ${insert}`);
      }
    }
    if (info?.implementable === false && !reason)
      reason = "protocol bridge index is not implementable";
    if (reason) {
      drop(reason);
      continue;
    }
    for (const module of protocolImports)
      imports.add(module);
    const factoryName = `OneSDKFactory_${Buffer.from(usr).toString("hex")}`;
    const type = `${graph.module}.${symbol.pathComponents.map(quoted).join(".")}`;
    const available = classVersion ? `@available(iOS ${classVersion.major}.${classVersion.minor ?? 0}, *)
` : "";
    blocks.push(`// implementation ${key}
${available}final class ${name}: ${objc ? "NSObject, " : ""}${type} {
  private let methods: [String: OneSDKFunction]
  init(_ methods: [String: OneSDKFunction]) { self.methods = methods${objc ? "; super.init()" : ""} }
${methods.join(`
`)}
${objc ? `  private static let selectors: [Selector: String] = {
    var out: [Selector: String] = [:]
${selectors.join(`
`)}
    return out
  }()
  override func responds(to selector: Selector!) -> Bool {
    if let title = Self.selectors[selector] { return methods[title] != nil }
    return super.responds(to: selector)
  }` : ""}
}
@objc(${factoryName}) final class ${factoryName}: NSObject, OneSDKImplementationFactory {
  static func make(_ methods: [String: OneSDKFunction]) throws -> Any {
    ${(() => {
      const v = classVersion;
      return v ? `guard #available(iOS ${v.major}.${v.minor ?? 0}, *) else { throw OneSDKError.unsupported("${type} before iOS ${v.major}.${v.minor ?? 0}") }` : "";
    })()}
    try OneSDKImplementations.validate(methods, required: ${JSON.stringify(required)}, accepted: ${JSON.stringify(accepted)})
    return ${name}(methods)
  }
}
// end implementation`);
  }
  return [...imports].filter((m) => m !== graph.module && m !== "Foundation").sort().map((m) => `import ${m}`).join(`
`) + `

` + blocks.join(`

`);
}

// codegen/sdk/identity.ts
import { createHash } from "node:crypto";
function canonical(value) {
  if (Array.isArray(value))
    return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).filter(([, value]) => value !== undefined).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, value]) => [key, canonical(value)]));
  }
  return value;
}
function assignEntryIds(entries) {
  const seen = new Map;
  for (const entry of entries) {
    const signature = JSON.stringify(canonical({
      key: entry.key,
      kind: entry.kind,
      main: entry.main,
      isAsync: entry.isAsync,
      syncCallbacks: entry.syncCallbacks === true,
      receiver: entry.receiver,
      specialization: entry.specialization,
      params: entry.params.map(({ keyPaths, typeNames, ...parameter }) => ({
        ...parameter,
        keyPaths: keyPaths !== undefined,
        typeNames: typeNames !== undefined
      })),
      returns: entry.returns
    }));
    const id = Number.parseInt(createHash("sha256").update(signature).digest("hex").slice(0, 13), 16);
    if (seen.has(id)) {
      throw new Error(`duplicate iOS SDK dispatch identity: ${seen.get(id)} and ${entry.key}`);
    }
    seen.set(id, entry.key);
    entry.id = id;
  }
}

// codegen/sdk/emit.ts
var text2 = (fragments = []) => fragments.map((f) => f.spelling).join("");
var AFTER_DOT = new Set(["init", "self", "Self", "Type", "Protocol"]);
var LABELS = new Set(["inout", "var", "let"]);
var KEYWORDS = new Set([
  "associatedtype",
  "class",
  "deinit",
  "enum",
  "extension",
  "fileprivate",
  "func",
  "import",
  "init",
  "inout",
  "internal",
  "let",
  "open",
  "operator",
  "private",
  "protocol",
  "public",
  "rethrows",
  "static",
  "struct",
  "subscript",
  "typealias",
  "var",
  "break",
  "case",
  "continue",
  "default",
  "defer",
  "do",
  "else",
  "fallthrough",
  "for",
  "guard",
  "if",
  "in",
  "repeat",
  "return",
  "switch",
  "where",
  "while",
  "as",
  "Any",
  "catch",
  "false",
  "is",
  "nil",
  "super",
  "self",
  "Self",
  "throw",
  "throws",
  "true",
  "try",
  "Type",
  "Protocol"
]);
var escape = (name, reserved) => {
  const bare = name.replace(/`/g, "");
  return reserved.has(bare) ? `\`${bare}\`` : bare;
};
var quote = (name) => escape(name, KEYWORDS);
var member = (name) => escape(name, AFTER_DOT);
var label = (name) => escape(name, LABELS);
function splitTitle(title) {
  const open = title.indexOf("(");
  if (open < 0)
    return { base: title, labels: [] };
  const inner = title.slice(open + 1, title.lastIndexOf(")"));
  return { base: title.slice(0, open), labels: inner ? inner.split(":").slice(0, -1) : [] };
}
function isVoid(fragments) {
  const t = text2(fragments).trim();
  return !t || t === "()" || t === "Void";
}
function swiftTypeText(fragments) {
  return text2(fragments).trim().replace(/^@escaping\s*/, "").replace(/\b(__owned|__shared|borrowing|consuming|sending)\s+/g, "").replace(/([\w\])>])!/g, "$1?").trim();
}
function parameterTypeFragments(fragments) {
  const colon = fragments.findIndex((f) => f.kind === "text" && f.spelling.includes(":"));
  const rest = colon < 0 ? fragments : fragments.slice(colon);
  const head = rest[0];
  const after = colon < 0 ? head.spelling : head.spelling.slice(head.spelling.indexOf(":") + 1);
  return [...after.trim() ? [{ ...head, spelling: after }] : [], ...rest.slice(1)];
}
function functionOf(type) {
  if (type.k === "function")
    return { fn: type, optional: false };
  if (type.k === "optional" && type.t.k === "function")
    return { fn: type.t, optional: true };
  return null;
}
function swiftType(type) {
  if (type.k === "optional")
    return `(${swiftType(type.t)})?`;
  if (type.k === "function")
    return `${type.sendable ? "@Sendable " : ""}(${type.params.map((p) => `${p.t.k === "function" && p.t.escaping ? "@escaping " : ""}${swiftType(p.t)}`).join(", ")})${type.async ? " async" : ""}${type.throws ? " throws" : ""} -> ${swiftType(type.result)}`;
  if (type.k === "array")
    return `[${swiftType(type.t)}]`;
  if (type.k === "dictionary")
    return `[${swiftType(type.key)}: ${swiftType(type.value)}]`;
  if (type.k === "tuple")
    return `(${type.items.map((p) => `${p.label ? `${p.label}: ` : ""}${swiftType(p.t)}`).join(", ")})`;
  if (type.k === "named")
    return namedText(type, swiftType);
  return typeText(type);
}
function observedGetter(e) {
  return `let o: ${swiftType(e.receiver)} = try c.receiver(); return c.out(${e.main ? "await " : ""}o.${member(e.name)})`;
}
function needsOutputConversion(type) {
  if (type.k === "function" || type.k === "tuple")
    return true;
  if (type.k === "array" || type.k === "optional")
    return needsOutputConversion(type.t);
  if (type.k === "dictionary")
    return needsOutputConversion(type.value);
  return false;
}
function usesObjcOpen(type, open) {
  switch (type.k) {
    case "named":
      return !type.args.length && open.has(type.name) || type.args.some((a) => usesObjcOpen(a, open));
    case "optional":
    case "array":
    case "variadic":
    case "inout":
    case "metatype":
    case "existential":
      return usesObjcOpen(type.t, open);
    case "dictionary":
      return usesObjcOpen(type.key, open) || usesObjcOpen(type.value, open);
    case "tuple":
      return type.items.some((i) => usesObjcOpen(i.t, open));
    case "function":
      return type.params.some((p) => usesObjcOpen(p.t, open)) || usesObjcOpen(type.result, open);
    case "composition":
      return type.items.some((i) => usesObjcOpen(i, open));
  }
}
function outputValue(type, value) {
  if (!needsOutputConversion(type))
    return value;
  if (type.k === "optional" || type.k === "array")
    return `(${value}).map { v in ${outputValue(type.t, "v")} }`;
  if (type.k === "dictionary")
    return `(${value}).mapValues { v in ${outputValue(type.value, "v")} }`;
  if (type.k === "tuple") {
    if (!type.items.length)
      return "c.void";
    const values = type.items.map((item, i) => `c.out(${outputValue(item.t, `v.${i}`)})`);
    const named = type.items.every((item) => item.label);
    const encoded = named ? `[${values.map((v, i) => `${JSON.stringify(type.items[i].label)}: ${v}`).join(", ")}] as [String: Any]` : `[${values.join(", ")}] as [Any]`;
    return `({ (v: ${swiftType(type)}) in ${encoded} })(${value})`;
  }
  if (type.k !== "function")
    return value;
  const args = type.params.map((p, i) => {
    const callback = functionOf(p.t);
    if (callback) {
      const names = callback.fn.params.map((_, n) => `a${n}`);
      const closure = `({ [f = try c.callback(${i})] ${names.length ? `${names.join(", ")} in ` : "in "}f(${names.map((n, at) => outputValue(callback.fn.params[at].t, n)).join(", ")}) } as ${swiftType(callback.fn)})`;
      return callback.optional ? `(c.has(${i}) ? ${closure} : nil)` : closure;
    }
    return `(try c.arg(${i}) as ${swiftType(p.t)})`;
  });
  const invoke = `${type.throws ? "try " : ""}await f(${args.join(", ")})`;
  const voidResult = type.result.k === "named" && type.result.name === "Void" || type.result.k === "tuple" && !type.result.items.length;
  const body = voidResult ? `${invoke}; return c.void` : `let r = ${invoke}; return c.out(${outputValue(type.result, "r")})`;
  return `OneSDKCallable.capture(${value}) { f, c in ${body} }`;
}
function introducedOn(symbol) {
  const ios = symbol?.availability?.find((a) => a.domain === "iOS")?.introduced;
  return ios ? `${ios.major}.${ios.minor ?? 0}` : undefined;
}
function laterVersion(a, b) {
  if (!a)
    return b;
  if (!b)
    return a;
  const [am, an] = a.split(".").map(Number);
  const [bm, bn] = b.split(".").map(Number);
  return am > bm || am === bm && an >= bn ? a : b;
}
var MINIMUM_IOS = "17.0";
var needsCheck = (version) => !!version && laterVersion(version, MINIMUM_IOS) !== MINIMUM_IOS;
function typeUsrs(type, out = []) {
  switch (type.k) {
    case "named":
      if (type.usr)
        out.push(type.usr);
      type.args.forEach((a) => typeUsrs(a, out));
      break;
    case "optional":
    case "array":
    case "variadic":
    case "inout":
    case "metatype":
      typeUsrs(type.t, out);
      break;
    case "existential":
      typeUsrs(type.t, out);
      break;
    case "dictionary":
      typeUsrs(type.key, out);
      typeUsrs(type.value, out);
      break;
    case "tuple":
      type.items.forEach((i) => typeUsrs(i.t, out));
      break;
    case "function":
      type.params.forEach((p) => typeUsrs(p.t, out));
      typeUsrs(type.result, out);
      break;
    case "composition":
      type.items.forEach((i) => typeUsrs(i, out));
      break;
  }
  return out;
}
function declarationText(symbol) {
  return text2(symbol.declarationFragments);
}
function isMainActor(symbol) {
  return !!symbol && /@MainActor\b/.test(declarationText(symbol));
}
function emitModule(graph, bridge, all, exclude = new Map, { conformancesOnly = false, table = graph.module } = {}) {
  const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]));
  const ownerOf = new Map;
  const requirements = new Set;
  const members = new Map;
  for (const rel of graph.relationships) {
    if (rel.kind === "memberOf") {
      ownerOf.set(rel.source, rel.target);
      members.set(rel.target, [...members.get(rel.target) ?? [], rel.source]);
    }
    if (rel.kind === "requirementOf" || rel.kind === "optionalRequirementOf")
      requirements.add(rel.source);
  }
  const entries = [];
  const skipped = [];
  const conformances = [];
  const opened = new Map;
  const seen = new Set;
  const imports = new Set([graph.module]);
  const byPath = new Map;
  for (const info of bridge.index.values()) {
    if (info.module === graph.module)
      byPath.set(info.path.join("."), info.usr);
  }
  for (const symbol of graph.symbols) {
    const usr = symbol.identifier.precise;
    if (!ownerOf.has(usr) && symbol.pathComponents.length > 1) {
      const owner = byPath.get(symbol.pathComponents.slice(0, -1).join("."));
      if (owner)
        ownerOf.set(usr, owner);
    }
  }
  const typePaths = new Map([...bridge.index.values()].map((info) => [`${info.module}.${info.path.join(".")}`, info]));
  const lookup = (usr) => byUsr.get(usr) ?? all.get(usr);
  const availableFrom = (usr, types) => {
    let version;
    for (let at = usr;at; at = ownerOf.get(at))
      version = laterVersion(version, introducedOn(lookup(at)));
    for (const type of types)
      for (const ref of typeUsrs(type))
        version = laterVersion(version, introducedOn(lookup(ref)));
    return version;
  };
  const guarded = (version, body) => needsCheck(version) ? `guard #available(iOS ${version}, *) else { throw OneSDKError.unsupported("this api before iOS ${version}") }; ${body}` : body;
  const superclassOf = (usr) => {
    const info = bridge.index.get(usr);
    return info?.kind === "class" ? info.superclass : undefined;
  };
  const mainIsolated = (usr) => {
    for (let at = usr;at; at = ownerOf.get(at)) {
      const seen = new Set;
      for (let type = at;type && !seen.has(type); type = superclassOf(type)) {
        seen.add(type);
        if (isMainActor(byUsr.get(type) ?? all.get(type)))
          return true;
      }
    }
    return false;
  };
  for (const symbol of graph.symbols) {
    const usr = symbol.identifier.precise;
    if (seen.has(usr))
      continue;
    seen.add(usr);
    if (!inUniverse(symbol, requirements))
      continue;
    const kind = symbol.kind.identifier;
    const path = symbol.pathComponents.join(".");
    const ownerUsr = ownerOf.get(usr);
    const ownerInfo = ownerUsr ? bridge.index.get(ownerUsr) : undefined;
    const ownerSymbol = ownerUsr ? byUsr.get(ownerUsr) ?? all.get(ownerUsr) : undefined;
    if (kind === "swift.enum" || kind === "swift.struct") {
      if (exclude.has(usr)) {
        skipped.push({ usr, path, reason: exclude.get(usr) });
        continue;
      }
      const conformance = emitConformance(symbol, bridge, members.get(usr) ?? [], byUsr, requirements, availableFrom(usr, []));
      if (conformance)
        conformances.push(`// conformance ${usr}
${conformance}`);
      continue;
    }
    if (![
      "swift.init",
      "swift.method",
      "swift.type.method",
      "swift.func",
      "swift.property",
      "swift.type.property",
      "swift.var",
      "swift.subscript"
    ].includes(kind))
      continue;
    const verdict = judge(bridge, symbol, ownerSymbol);
    if (!verdict.covered) {
      skipped.push({ usr, path, reason: verdict.reason });
      continue;
    }
    if (ownerUsr && !ownerInfo || !ownerUsr && symbol.pathComponents.length > 1) {
      skipped.push({ usr, path, reason: "owner not in the sdk index" });
      continue;
    }
    const generics = bridge.generics(symbol, ownerSymbol);
    const unresolved = [...generics.params].filter((name) => !generics.resolved.has(name) && !generics.objcOpen.has(name));
    const ownerParams = new Set((ownerSymbol?.swiftGenerics?.parameters ?? []).map((p) => p.name));
    const decl = declarationText(symbol);
    const isStatic = kind === "swift.type.method" || kind === "swift.type.property" || /\b(static|class)\s+(func|var|let|subscript)\b/.test(decl);
    const main = mainIsolated(usr);
    const ownerConstraints = ownerSymbol?.swiftGenerics?.constraints ?? [];
    const openable = !!ownerUsr && !!ownerInfo && ownerParams.size > 0 && ownerInfo.kind !== "protocol" && !isStatic && !main && !ownerUsr.startsWith("c:objc") && [...generics.params].every((name) => ownerParams.has(name)) && [...symbol.swiftGenerics?.constraints ?? [], ...symbol.swiftExtension?.constraints ?? []].every((c) => ownerConstraints.some((o) => JSON.stringify(o) === JSON.stringify(c))) && !exclude.has(`open:${ownerUsr}`);
    const opens = (key) => openable && !exclude.has(`open:${key}`);
    const witnessless = `generic${ownerParams.size ? " owner" : ""}: no canonical witness for ${unresolved.join(", ")}`;
    const bindsOpen = ["swift.method", "swift.subscript", "swift.property"].includes(kind) && openable;
    if (unresolved.length && !bindsOpen) {
      skipped.push({ usr, path, reason: witnessless });
      continue;
    }
    const objcErasure = [...generics.objcOpen].length && ownerInfo?.objcWitnesses?.length ? bridge.index.get(ownerInfo.objcWitnesses[0]) : undefined;
    const swiftGenerics = objcErasure ? { ...generics, resolved: new Map([...generics.resolved, ...[...generics.objcOpen].map((p) => [p, { k: "named", name: `${objcErasure.module}.${objcErasure.path.join(".")}`, usr: objcErasure.usr, args: [] }])]) } : generics;
    const specialization = generics.params.size ? Object.fromEntries(generics.resolved) : undefined;
    const replaceWith = (open) => (source) => {
      const names = [...swiftGenerics.resolved.keys()].filter((name) => !open.has(name)).sort((a, b) => b.length - a.length);
      if (!names.length)
        return source;
      const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
      return source.replace(new RegExp(`(?<![A-Za-z0-9_.])(?:${escaped.join("|")})(?![A-Za-z0-9_])`, "g"), (name) => typeText(bridge.substitute(swiftGenerics.resolved.get(name), swiftGenerics)));
    };
    const replaceTypes = replaceWith(new Set);
    const specializedOwner = (info) => {
      const used = new Set;
      return `${info.module}.${info.path.map((name, i) => {
        const at = typePaths.get(`${info.module}.${info.path.slice(0, i + 1).join(".")}`);
        const params = (at?.genericParameters ?? []).filter((p) => !used.has(p));
        params.forEach((p) => used.add(p));
        return quote(name) + (params.length ? `<${params.map((p) => replaceTypes(p)).join(", ")}>` : "");
      }).join(".")}`;
    };
    const owner = ownerInfo ? specializedOwner(ownerInfo) : undefined;
    const scoped = (expression) => !ownerInfo ? expression : expression.replace(/(?<![\w.])[A-Z]\w*/g, (name) => {
      for (let depth = ownerInfo.path.length;depth > 0; depth--) {
        const path = [...ownerInfo.path.slice(0, depth), name];
        if (typePaths.has(`${ownerInfo.module}.${path.join(".")}`))
          return `${ownerInfo.module}.${path.map(quote).join(".")}`;
      }
      return name;
    });
    const receiver = ownerInfo ? {
      k: "named",
      name: `${ownerInfo.module}.${ownerInfo.path.join(".")}`,
      usr: ownerInfo.usr,
      args: (ownerSymbol?.swiftGenerics?.parameters ?? []).map((p) => bridge.substitute({ k: "named", name: p.name, args: [] }, generics))
    } : undefined;
    if (isStatic && ownerInfo?.kind === "protocol") {
      skipped.push({ usr, path, reason: "static protocol member" });
      continue;
    }
    const valueOwner = ownerInfo && ownerInfo.kind !== "class" && ownerInfo.kind !== "actor" && ownerInfo.kind !== "protocol";
    const receiverType = ownerInfo?.kind === "protocol" ? `any ${owner}` : owner;
    const { base, labels } = splitTitle(symbol.pathComponents.at(-1));
    const push = (entry, open, mutates = false) => {
      if (unresolved.length && !open) {
        skipped.push({ usr, path, reason: exclude.get(`open:${entry.key}`) ?? witnessless });
        return;
      }
      entries.push(entry);
      if (!open)
        return;
      if (!opened.has(ownerUsr))
        opened.set(ownerUsr, { info: ownerInfo, value: !!valueOwner, bodies: new Map });
      opened.get(ownerUsr).bodies.set(entry, { body: entry.swift, mutates });
    };
    if (kind === "swift.property" || kind === "swift.type.property" || kind === "swift.var") {
      const target = kind === "swift.var" ? `${graph.module}.${member(base)}` : isStatic ? `${owner}.${member(base)}` : `o.${member(base)}`;
      const receiverFor = (mutable, open) => kind === "swift.var" || isStatic ? "" : `${mutable ? "var" : "let"} o${open ? " = self" : `: ${receiverType} = try c.receiver()`}; `;
      const propertyFragments = symbol.declarationFragments ?? [];
      const propertyName = propertyFragments.findIndex((f) => f.kind === "identifier");
      const colon = propertyFragments.findIndex((f, i) => i > propertyName && f.kind === "text" && f.spelling.includes(":"));
      const tail = propertyFragments.slice(colon);
      const body = colon < 0 ? [] : [{ ...tail[0], spelling: tail[0].spelling.slice(tail[0].spelling.indexOf(":") + 1) }, ...tail.slice(1)];
      const brace = body.findIndex((f) => f.kind === "text" && /[{=]/.test(f.spelling));
      const propertyType = body.length ? bridge.functions(bridge.substitute(parseType(brace < 0 ? body : [...body.slice(0, brace), { ...body[brace], spelling: body[brace].spelling.split(/[{=]/)[0] }]), generics)) : undefined;
      const propertyVersion = availableFrom(usr, propertyType ? [propertyType] : []);
      const accessor = /\{\s*get\s+([^}]*)\}/.exec(decl)?.[1] ?? "";
      const getAsync = /\basync\b/.test(accessor);
      const getThrows = /\bthrows\b/.test(accessor);
      const getValue = `${getThrows ? "try " : ""}${main || getAsync ? "await " : ""}${target}`;
      const encodedGet = propertyType ? outputValue(propertyType, getValue) : getValue;
      const getOpen = opens(`${usr}:get`);
      if (!exclude.has(`${usr}:get`))
        push({
          id: 0,
          key: `${usr}:get`,
          usr,
          owner,
          name: base,
          kind: "get",
          isAsync: getAsync,
          main,
          params: [],
          returns: propertyType,
          specialization,
          receiver,
          swift: guarded(propertyVersion, `${receiverFor(false, getOpen)}return c.out(${encodedGet})`)
        }, getOpen);
      else
        skipped.push({ usr, path, reason: exclude.get(`${usr}:get`) });
      const readOnly = /\blet\b/.test(decl) || /\{\s*get\b(?![^}]*\bset\b)/.test(decl) || /\bprivate\(set\)/.test(decl);
      if (!readOnly && exclude.has(`${usr}:set`))
        skipped.push({ usr, path, reason: exclude.get(`${usr}:set`) });
      else if (!readOnly) {
        const setOpen = opens(`${usr}:set`);
        const writeBack = valueOwner && !isStatic && kind !== "swift.var" ? setOpen ? "; self = o" : "; c.setReceiver(o)" : "";
        const fn = propertyType && functionOf(propertyType);
        if (fn && (fn.fn.async || fn.fn.throws || !(fn.fn.result.k === "named" && fn.fn.result.name === "Void" || fn.fn.result.k === "tuple" && !fn.fn.result.items.length) || fn.fn.params.some((p) => callbackOut(p.t)))) {
          skipped.push({ usr, path, reason: "closure property answers its caller" });
          continue;
        }
        const names = fn ? fn.fn.params.map((_, n) => `p${n}`) : [];
        const closure = fn ? `{ ${names.length ? `${names.join(", ")} in ` : ""}f(${names.map((n, at) => outputValue(fn.fn.params[at].t, n)).join(", ")}) }` : "";
        const fetch = !fn ? "" : fn.optional ? `let v: ${swiftType(propertyType)}; if c.has(0) { let f = try c.callback(0); v = ${closure} } else { v = nil }; ` : `let f = try c.callback(0); let v: ${swiftType(fn.fn)} = ${closure}; `;
        const value = fn ? "v" : "try c.arg(0)";
        push({
          id: 0,
          key: `${usr}:set`,
          usr,
          owner,
          name: base,
          kind: "set",
          isAsync: false,
          main,
          params: propertyType ? [{ label: "_", name: "value", type: propertyType, optional: propertyType.k === "optional", hasDefault: false }] : [],
          specialization,
          receiver,
          swift: guarded(propertyVersion, `${receiverFor(!!valueOwner, setOpen)}${fetch}${target} = ${value}${writeBack}; return c.void`)
        }, setOpen, !!valueOwner);
      }
      continue;
    }
    const mutating = /\bmutating\b/.test(decl);
    const open = (kind === "swift.method" || kind === "swift.subscript") && opens(usr);
    const writeBack = open ? "self = o" : "c.setReceiver(o)";
    const parameters = symbol.functionSignature?.parameters ?? [];
    if (kind === "swift.init" && [...generics.objcOpen].length && ownerInfo?.objcWitnesses?.length) {
      const genericAt = parameters.flatMap((p, i) => {
        try {
          const t = parameterType(p.declarationFragments);
          return t.k === "named" && !t.args.length && generics.objcOpen.has(t.name) ? [i] : [];
        } catch {
          return [];
        }
      });
      if (genericAt.length === 1) {
        const witnesses = ownerInfo.objcWitnesses.map((u) => bridge.index.get(u)).filter((i) => !!i);
        if (witnesses.length === ownerInfo.objcWitnesses.length) {
          const at = genericAt[0];
          const defaults = parameterDefaults(symbol.declarationFragments ?? []);
          const entryParams = [];
          const hoisted = [];
          const fixed = [];
          let simple = true;
          parameters.forEach((parameter, i) => {
            const argLabel = labels[i] ?? "_";
            const prefix = argLabel === "_" ? "" : `${label(argLabel)}: `;
            const name = parameter.internalName ?? parameter.name;
            if (i === at) {
              entryParams.push({ label: argLabel, name, type: parameterType(parameter.declarationFragments), optional: false, hasDefault: false });
              hoisted.push(`let v${i}: Any = try c.arg(${entryParams.length - 1})`);
              return;
            }
            let type;
            try {
              type = bridge.functions(bridge.substitute(parameterType(parameter.declarationFragments), generics));
            } catch {
              simple = false;
              return;
            }
            if (usesObjcOpen(type, generics.objcOpen) || type.k === "function" || type.k === "variadic" || type.k === "inout" || outPointee(type)) {
              simple = false;
              return;
            }
            const defaultValue = defaults[i];
            if (defaultValue?.startsWith("#") || !bridge.type(parameterType(parameter.declarationFragments), "input", generics).ok) {
              simple = false;
              return;
            }
            const spelled = replaceTypes(swiftTypeText(parameterTypeFragments(parameter.declarationFragments)).replace(/^inout\s+/, ""));
            for (const ref of typeUsrs(type)) {
              const module = bridge.index.get(ref)?.module;
              if (module)
                imports.add(module);
            }
            entryParams.push({ label: argLabel, name, type, optional: type.k === "optional", hasDefault: defaultValue !== undefined });
            const value = defaultValue !== undefined ? `try c.arg(${entryParams.length - 1}, or: ${replaceTypes(scoped(defaultValue))})` : `try c.arg(${entryParams.length - 1})`;
            hoisted.push(`let a${i} = (${value} as ${spelled})`);
            fixed.push(`${prefix}a${i}`);
          });
          if (simple) {
            for (const w of witnesses)
              imports.add(w.module);
            const qualified = (w) => `${w.module}.${w.path.map(quote).join(".")}`;
            const ownerBase = `${ownerInfo.module}.${ownerInfo.path.map(quote).join(".")}`;
            const valueLabel = labels[at] ?? "_";
            const valuePrefix = valueLabel === "_" ? "" : `${label(valueLabel)}: `;
            const branchArgs = (w) => parameters.map((_, i) => {
              if (i === at)
                return `${valuePrefix}x`;
              const fixedAt = fixed[parameters.slice(0, i).filter((_, j) => j !== at).length];
              return fixedAt;
            }).join(", ");
            const expected = witnesses.map((w) => w.path.join(".")).join(" | ");
            const cases = witnesses.map((w) => `case let x as ${qualified(w)}: return c.out(${ownerBase}<${qualified(w)}>(${branchArgs(qualified(w))}))`).join("; ");
            const body = [...hoisted, `switch v${at} { ${cases}; default: throw OneSDKError.badArgument(index: ${at}, expected: ${JSON.stringify(expected)}, got: String(describing: type(of: v${at}))) }`].join("; ");
            push({
              id: 0,
              key: usr,
              usr,
              owner,
              name: base,
              kind: "init",
              isAsync: false,
              main,
              params: entryParams,
              specialization,
              receiver,
              swift: guarded(availableFrom(usr, [...entryParams.map((p) => p.type), ...witnesses.map((w) => ({ k: "named", name: `${w.module}.${w.path.join(".")}`, usr: w.usr, args: [] }))]), body)
            }, false);
            continue;
          }
        }
        skipped.push({ usr, path, reason: "objc generic init needs witnesses" });
        continue;
      } else if (genericAt.length > 1) {
        skipped.push({ usr, path, reason: "objc generic init needs a single value" });
        continue;
      }
    }
    if ((kind === "swift.method" || kind === "swift.subscript") && [...generics.objcOpen].length && parameters.some((p) => {
      try {
        return usesObjcOpen(parameterType(p.declarationFragments), generics.objcOpen);
      } catch {
        return false;
      }
    })) {
      skipped.push({ usr, path, reason: "objc generic method needs a witness switch" });
      continue;
    }
    const pickable = pickOf(bridge, symbol, ownerSymbol, generics);
    const pick = pickable && !exclude.has(`pick:${usr}`) ? pickable : undefined;
    if (pickable && !pick && parameterDefaults(symbol.declarationFragments ?? [])[pickable.param] === undefined) {
      skipped.push({ usr, path, reason: exclude.get(`pick:${usr}`) });
      continue;
    }
    const replace = open ? replaceWith(new Set([...ownerParams, "Self"])) : pick ? replaceWith(new Set([pick.name])) : replaceTypes;
    let pickAt = -1;
    const hoisted = [];
    const args = [];
    const outs = [];
    const params = [];
    let reason = "";
    let syncCallbacks = false;
    const defaults = parameterDefaults(symbol.declarationFragments ?? []);
    parameters.forEach((parameter, i) => {
      const defaultValue = defaults[i];
      if (pick && i === pick.param) {
        pickAt = params.length;
        const argLabel = labels[i] ?? "_";
        params.push({
          label: argLabel,
          name: parameter.internalName ?? parameter.name,
          type: parameterType(parameter.declarationFragments),
          optional: false,
          hasDefault: defaultValue !== undefined,
          typeNames: pick.choices.map((c) => c.name)
        });
        args.push(`${argLabel === "_" ? "" : `${label(argLabel)}: `}t`);
        return;
      }
      if (defaultValue?.startsWith("#") || !bridge.type(parameterType(parameter.declarationFragments), "input", generics).ok)
        return;
      const at = params.length;
      const fragments = parameterTypeFragments(parameter.declarationFragments);
      const parsed = bridge.functions(bridge.substitute(parameterType(parameter.declarationFragments), generics));
      const type = parsed.k === "inout" ? parsed.t : parsed;
      const argLabel = labels[i] ?? "_";
      const prefix = argLabel === "_" ? "" : `${label(argLabel)}: `;
      const spelled = replace(swiftTypeText(fragments)).replace(/^inout\s+/, "");
      if (/\bsome\b/.test(spelled))
        reason = "opaque parameter";
      for (const ref of typeUsrs(type)) {
        const module = bridge.index.get(ref)?.module;
        if (module)
          imports.add(module);
      }
      const name = parameter.internalName ?? parameter.name;
      const isInOut = parsed.k === "inout" || new RegExp(`\\b${name}\\s*:\\s*inout\\b`).test(decl);
      if (isInOut) {
        hoisted.push(`var in${i}: ${spelled} = try c.arg(${at})`);
        outs.push(`${JSON.stringify(name)}: in${i}`);
        params.push({ label: argLabel, name, type, optional: type.k === "optional", hasDefault: defaultValue !== undefined, inout: true });
        args.push(`${prefix}&in${i}`);
        return;
      }
      const written = outPointee(type);
      if (written) {
        const pointee = /^(?:Autoreleasing)?Unsafe\w*Pointer<(.*)>[?!]?$/s.exec(spelled)?.[1] ?? typeText(written);
        hoisted.push(`var out${i}: ${pointee} = ${written.k === "optional" ? "nil" : "false"}`);
        outs.push(cErrorOut(written) ? `${JSON.stringify(name)}: out${i}?.takeRetainedValue()` : `${JSON.stringify(name)}: out${i}`);
        params.push({ label: argLabel, name, type, optional: true, hasDefault: true, out: true });
        args.push(`${prefix}&out${i}`);
        return;
      }
      params.push({ label: argLabel, name, type, optional: type.k === "optional", hasDefault: defaultValue !== undefined });
      const fn = functionOf(type);
      if (fn) {
        if (fn.fn.async && !fn.fn.throws)
          reason = "async callback: nonthrowing, so a rejected promise cannot reach swift";
        const names = fn.fn.params.map((_, n) => `p${n}`);
        const fetch = fn.optional ? `c.has(${at}) ? try c.callback(${at}) : nil` : `try c.callback(${at})`;
        hoisted.push(`let f${i} = ${fetch}`);
        const outputs = fn.fn.params.map((p, n) => ({ n, type: callbackOut(p.t) })).filter((p) => !!p.type);
        const callbackVoid = fn.fn.result.k === "named" && fn.fn.result.name === "Void" || fn.fn.result.k === "tuple" && !fn.fn.result.items.length;
        const canSync = !main && !effectsOf(decl).isAsync && !fn.fn.escaping && !new RegExp(`\\b${name}\\s*:[^(),]*@escaping\\b`).test(decl);
        const needsSync = outputs.length > 0 || !callbackVoid || fn.fn.throws && canSync;
        const values = names.map((n, at) => {
          const written = outputs.find((p) => p.n === at);
          const value = written ? `${n}.pointee${written.type.k === "named" && written.type.name.split(".").at(-1) === "ObjCBool" ? ".boolValue" : ""}` : outputValue(fn.fn.params[at].t, n);
          return written ? `["$out": ${value}]` : value;
        });
        let body;
        if (fn.fn.async) {
          if (outputs.length)
            reason = "async callback: output parameters";
          const target = `f${i}${fn.optional ? "!" : ""}`;
          body = callbackVoid ? `_ = try await ${target}.responseAsync([${values.join(", ")}])` : `return try await ${target}.resultAsync([${values.join(", ")}])`;
        } else if (needsSync) {
          syncCallbacks = true;
          if (!canSync)
            reason = "synchronous callback requires a nonescaping JS-thread call";
          const target = `f${i}${fn.optional ? "!" : ""}`;
          if (outputs.length) {
            if (!(fn.fn.result.k === "named" && fn.fn.result.name === "Void" || fn.fn.result.k === "tuple" && !fn.fn.result.items.length))
              reason = "stop callback also returns a value";
            const writes = outputs.map(({ n, type }) => `p${n}.pointee = ${type.k === "named" && type.name.split(".").at(-1) === "ObjCBool" ? `ObjCBool(try r.arg(${n + 1}) as Bool)` : `try r.arg(${n + 1})`}`).join("; ");
            const stops = outputs.map(({ n, type }) => `p${n}.pointee = ${type.k === "named" && type.name.split(".").at(-1) === "ObjCBool" ? "ObjCBool(true)" : "true"}`).join("; ");
            body = `do { let r = try ${target}.response([${values.join(", ")}]); ${writes} } catch { c.failCallback(error); ${stops} }`;
          } else if (fn.fn.result.k === "named" && fn.fn.result.name === "Void" || fn.fn.result.k === "tuple" && !fn.fn.result.items.length)
            body = `_ = try ${target}.response([${values.join(", ")}])`;
          else
            body = `return try ${target}.result([${values.join(", ")}])`;
        } else
          body = `f${i}${fn.optional ? "?" : ""}(${values.join(", ")})`;
        const closure = `{ ${names.length ? `${names.join(", ")} in ` : ""}${body} }`;
        const bare = spelled.replace(/^\((.*)\)\?$/s, "$1");
        args.push(`${prefix}${fn.optional ? `(f${i} == nil ? nil : (${closure} as ${bare}))` : `(${closure} as ${spelled})`}`);
        return;
      }
      if (type.k === "variadic") {
        reason = "variadic";
        return;
      }
      if (type.k === "named" && ["KeyPath", "WritableKeyPath", "ReferenceWritableKeyPath", "PartialKeyPath"].includes(type.name.split(".").at(-1))) {
        const paths = bridge.keyPaths(type, generics);
        if (paths.length) {
          const root = swiftType(type.args[0]);
          const table = paths.map((p) => `${JSON.stringify(p.name)}: \\${root}.${member(p.name)}`).join(", ");
          params[params.length - 1].keyPaths = paths.map((p) => p.name);
          args.push(`${prefix}(try c.keyPath(${at}, [${table}] as [String: ${spelled}]) as ${spelled})`);
          return;
        }
      }
      const value = defaultValue !== undefined ? `try c.arg(${at}, or: ${replace(scoped(defaultValue))})` : `try c.arg(${at})`;
      args.push(`${prefix}(${value} as ${spelled})`);
    });
    if (!reason && exclude.has(usr))
      reason = exclude.get(usr);
    if (reason) {
      skipped.push({ usr, path, reason });
      continue;
    }
    const { isAsync, throws } = effectsOf(decl);
    const returnsVoid = kind === "swift.init" ? false : isVoid(symbol.functionSignature?.returns);
    let call;
    let entryKind;
    if (kind === "swift.init") {
      if (!owner || ownerInfo?.kind === "protocol") {
        skipped.push({ usr, path, reason: "protocol initializer" });
        continue;
      }
      const fields = (members.get(ownerUsr) ?? []).flatMap((usr) => {
        const field = lookup(usr);
        return field?.kind.identifier === "swift.property" && usr.startsWith(`${ownerUsr}@FI@`) ? [field] : [];
      });
      const fieldNames = new Set(fields.map((field) => field.pathComponents.at(-1)));
      const cZeroInit = (members.get(ownerUsr) ?? []).some((usr) => {
        const initializer = lookup(usr);
        return usr === ownerInfo?.cZeroInit && initializer?.kind.identifier === "swift.init" && !initializer.swiftExtension && !initializer.synthesizedInit && !initializer.functionSignature?.parameters?.length && judge(bridge, initializer, ownerSymbol).covered;
      });
      const cMemberwise = ownerUsr?.startsWith("c:@S@") && usr.startsWith("s:So") && !symbol.swiftExtension && cZeroInit && parameters.length > 0 && fields.length === parameters.length && fields.every((field) => /^var\s/.test(text2(field.declarationFragments ?? []))) && params.length === parameters.length && !hoisted.length && !outs.length && !isAsync && !throws && !syncCallbacks && params.every((p) => p.label === p.name && fieldNames.has(p.name) && !p.hasDefault);
      if (cMemberwise) {
        hoisted.push(`var aggregate = (${owner}.init as () -> ${owner})()`);
        params.forEach((p, i) => hoisted.push(`aggregate.${member(p.name)} = ${args[i].slice(`${label(p.label)}: `.length)}`));
        call = "aggregate";
      } else
        call = `${owner}(${args.join(", ")})`;
      entryKind = "init";
    } else if (kind === "swift.subscript") {
      call = usr === "s:So15NSManagedObjectC8CoreDataEyypSgSScip" ? `o.value(forKey: ${args[0]})` : `${isStatic ? owner : "o"}[${args.join(", ")}]`;
      entryKind = "subscript";
    } else if (kind === "swift.func") {
      call = `${graph.module}.${member(base)}(${args.join(", ")})`;
      entryKind = "function";
    } else {
      call = `${isStatic ? owner : "o"}.${member(base)}(${args.join(", ")})`;
      entryKind = isStatic ? "static" : "method";
    }
    const returnType = !returnsVoid && kind !== "swift.init" ? bridge.functions(bridge.substitute(parseType(symbol.functionSignature?.returns ?? []), generics)) : undefined;
    if (graph.module === "CoreNFC" && owner === "CoreNFC.NFCISO15693Tag" && isAsync && ["authenticate", "keyUpdate", "readBuffer", "sendRequest"].includes(base)) {
      const result = replace(swiftTypeText(symbol.functionSignature.returns));
      const inputs = args.map((arg, i) => {
        const argLabel = labels[i] ?? "_";
        const prefix = argLabel === "_" ? "" : `${label(argLabel)}: `;
        hoisted.push(`let a${i} = ${arg.slice(prefix.length)}`);
        return `${prefix}a${i}`;
      });
      call = `withCheckedThrowingContinuation { (continuation: CheckedContinuation<${result}, any Error>) in o.${member(base)}(${[...inputs, "resultHandler: { continuation.resume(with: $0) }"].join(", ")}) }`;
    }
    if (specialization && returnType)
      call = `(${call} as ${replace(swiftTypeText(symbol.functionSignature?.returns ?? []))})`;
    const needsReceiver = (entryKind === "method" || entryKind === "subscript") && !isStatic;
    const lines = [
      ...needsReceiver ? [`${mutating ? "var" : "let"} o${open ? " = self" : `: ${receiverType} = try c.receiver()`}`] : [],
      ...hoisted
    ];
    const effects = `${throws ? "try " : ""}${isAsync || main ? "await " : ""}`;
    const unmanaged = returnType ? unmanagedReturn(returnType, base) : undefined;
    const taken = unmanaged ? `r${returnType.k === "optional" ? "?" : ""}.take${unmanaged.retained ? "Retained" : "Unretained"}Value()` : "r";
    const returned = returnType ? outputValue(unmanaged?.inner ?? returnType, unmanaged ? taken : "r") : "r";
    if (outs.length) {
      lines.push(returnsVoid ? `${effects}${call}` : `let r = ${effects}${call}`);
      if (syncCallbacks)
        lines.push("try c.checkCallbacks()");
      if (mutating)
        lines.push(writeBack);
      lines.push(`return c.outs(${returnsVoid ? "nil" : returned}, [${outs.join(", ")}])`);
    } else if (returnsVoid) {
      lines.push(`${effects}${call}`);
      if (syncCallbacks)
        lines.push("try c.checkCallbacks()");
      if (mutating)
        lines.push(writeBack);
      lines.push("return c.void");
    } else if (unmanaged || mutating || syncCallbacks || returnType && needsOutputConversion(returnType)) {
      lines.push(`let r = ${effects}${call}`);
      if (syncCallbacks)
        lines.push("try c.checkCallbacks()");
      if (mutating)
        lines.push(writeBack);
      lines.push(`return c.out(${returned})`);
    } else {
      lines.push(`return c.out(${effects}${call})`);
    }
    let body = lines.join("; ");
    let entrySpecialization = specialization;
    let entryReturns = returnType;
    if (pick && pickAt >= 0) {
      const any = { k: "named", name: "Any", args: [] };
      const chosen = { ...generics, resolved: new Map([...generics.resolved, [pick.name, any]]) };
      entrySpecialization = Object.fromEntries(chosen.resolved);
      entryReturns = returnType && bridge.functions(bridge.substitute(parseType(symbol.functionSignature?.returns ?? []), chosen));
      const waits = isAsync || main;
      const fallback = pick.choices.find((c) => c.name === "String") ?? pick.choices[0];
      const name = defaults[pick.param] !== undefined ? `try c.arg(${pickAt}, or: ${JSON.stringify(fallback.name)}) as String` : `try c.arg(${pickAt}) as String`;
      body = `func oneSDKPick<${pick.name}: ${pick.requirements.join(" & ")}>(_ t: ${pick.name}.Type) ${waits ? "async " : ""}throws -> Any { ${body} }; ` + `let type: String = ${name}; switch type { ${pick.choices.map((c) => `case ${JSON.stringify(c.name)}: return try ${waits ? "await " : ""}oneSDKPick(${c.swift}.self)`).join("; ")}; ` + `default: throw OneSDKError.badArgument(index: ${pickAt}, expected: ${JSON.stringify(pick.choices.map((c) => c.name).join(" | "))}, got: type) }`;
    }
    push({
      id: 0,
      key: usr,
      usr,
      owner,
      name: base,
      kind: entryKind,
      isAsync,
      main,
      params,
      specialization: entrySpecialization,
      receiver,
      syncCallbacks: syncCallbacks || undefined,
      returns: entryReturns,
      swift: guarded(availableFrom(usr, [...params.map((p) => p.type), ...returnType ? [returnType] : [], ...Object.values(open || pick ? {} : specialization ?? {})]), body)
    }, open, mutating);
  }
  entries.sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  assignEntryIds(entries);
  const openings = [...opened].map(([ownerUsr, { info, value, bodies }]) => {
    const protocol = `OneSDKOpen_${graph.module}_${info.path.join("_").replace(/\W/g, "_")}`;
    const method = ({ isAsync }, mutates) => `${mutates ? "Mutate" : ""}${isAsync ? "Async" : mutates ? "" : "Sync"}`;
    const witness = (name) => `oneSDK${name}_${graph.module}`;
    const signature = (name, conforming) => `${name.startsWith("Mutate") && (value || !conforming) ? "mutating " : ""}func ${witness(name)}(_ id: Int, _ c: OneSDKCall) ${name.endsWith("Async") ? "async " : ""}throws -> Any`;
    const names = ["Sync", "Async", "Mutate", "MutateAsync"];
    const methods = names.map((name) => {
      const cases = [...bodies].filter(([entry, { mutates }]) => method(entry, mutates) === name).sort(([a], [b]) => a.id - b.id).map(([entry, { body }]) => `    case ${entry.id}: ${body}`);
      return `  ${signature(name, true)} {
    switch id {
${cases.map((line) => `${line}
`).join("")}    default: throw OneSDKError.unknownSymbol("${graph.module}.\\(id)")
    }
  }`;
    });
    for (const [entry, { mutates }] of bodies) {
      const call = `try ${entry.isAsync ? "await " : ""}o.${witness(method(entry, mutates))}(${entry.id}, c)`;
      entry.swift = mutates ? `var o: any ${protocol} = try c.receiver(); let r = ${call}; c.setReceiver(o); return r` : `let o: any ${protocol} = try c.receiver(); return ${call}`;
    }
    const version = availableFrom(ownerUsr, []);
    return `// open ${ownerUsr}
protocol ${protocol} {
${names.map((name) => `  ${signature(name, false)}`).join(`
`)}
}
${needsCheck(version) ? `@available(iOS ${version}, *)
` : ""}extension ${info.module}.${info.path.map(quote).join(".")}: ${protocol} {
${methods.join(`
`)}
}`;
  });
  for (const e of entries) {
    if (e.kind !== "get" || e.isAsync || e.receiver?.k !== "named" || !e.swift.includes(observedGetter(e)))
      continue;
    if (e.usr.startsWith("c:objc("))
      e.observation = "kvo";
    else if (bridge.index.get(e.receiver.usr ?? "")?.conformsTo?.includes(OBSERVABLE))
      e.observation = "tracking";
  }
  return { module: graph.module, entries, skipped, swift: renderSwift(graph.module, table, [...imports].sort(), conformancesOnly ? [] : entries, [...conformances, ...conformancesOnly ? [] : openings], () => emitProtocols(graph, bridge, all, exclude, skipped)) };
}
function emitConformance(symbol, bridge, memberUsrs, byUsr, requirements, typeVersion) {
  const info = bridge.index.get(symbol.identifier.precise);
  if (!info || symbol.swiftGenerics?.parameters?.length)
    return null;
  const type = `${info.module}.${info.path.map(quote).join(".")}`;
  const visible = memberUsrs.map((usr) => byUsr.get(usr)).filter((m) => !!m && inUniverse(m, requirements));
  const versionOf = new Map(visible.map((m) => [m.pathComponents.at(-1), introducedOn(m)]));
  const list = (names) => {
    const always = names.filter((n) => !needsCheck(laterVersion(versionOf.get(n), typeVersion)) || laterVersion(typeVersion, versionOf.get(n)) === typeVersion);
    const later = names.filter((n) => !always.includes(n));
    const literal = (ns) => `[${ns.map((n) => `(${JSON.stringify(n)}, .${member(n)})`).join(", ")}]`;
    if (!later.length)
      return literal(always);
    return `{ var out: [(String, Self)] = ${literal(always)}; ${later.map((n) => `if #available(iOS ${versionOf.get(n)}, *) { out.append((${JSON.stringify(n)}, .${member(n)})) }`).join("; ")}; return out }()`;
  };
  const available = needsCheck(typeVersion) ? `@available(iOS ${typeVersion}, *)
` : "";
  if (info.kind === "enum" && info.cases?.length && !info.payload) {
    const cases = visible.filter((m) => m.kind.identifier === "swift.enum.case").map((m) => m.pathComponents.at(-1));
    if (!cases.length)
      return null;
    return `${available}extension ${type}: @retroactive OneSDKNamedCases {
  public static var oneSDKCases: [(String, Self)] { ${list(cases)} }
}`;
  }
  const constants = visible.filter((m) => m.kind.identifier === "swift.type.property" && m.declarationFragments?.some((f) => f.kind === "typeIdentifier" && f.preciseIdentifier === info.usr)).map((m) => m.pathComponents.at(-1));
  if (info.optionSet) {
    return `${available}extension ${type}: @retroactive OneSDKNamedOptions {
  public static var oneSDKOptions: [(String, Self)] { ${list(constants)} }
}`;
  }
  if (info.rawValue && info.kind === "struct") {
    return `${available}extension ${type}: @retroactive OneSDKNamedConstants {
  public static var oneSDKConstants: [(String, Self)] { ${list(constants)} }
}`;
  }
  return null;
}
var CHUNK = 200;
var argumentNames = (e) => e.kind === "set" ? [e.name] : e.params.filter((p) => !p.out).map((p) => p.name);
function renderSwift(module, table, imports, entries, conformances, protocols) {
  entries = [...entries].sort((a, b) => a.id - b.id);
  const name = `OneSDK_${module}`;
  const sync = entries.filter((e) => !e.isAsync && !e.main);
  const async = entries.filter((e) => e.isAsync || e.main);
  const syncCallbackIds = sync.filter((e) => e.syncCallbacks).map((e) => e.id);
  const chunks = (list, isAsync) => {
    const out = [];
    for (let at = 0;at < list.length; at += CHUNK) {
      const slice = list.slice(at, at + CHUNK);
      out.push(`  static func ${isAsync ? "async" : "sync"}${at / CHUNK}(_ id: Int, _ c: OneSDKCall) ${isAsync ? "async " : ""}throws -> Any {
    switch id {
${slice.map((e) => `    case ${e.id}: ${e.main ? `return try await { @MainActor in ${e.swift} }()` : e.swift}`).join(`
`)}
    default: ${isAsync ? "return try await OneSDKBackground.run { try sync(id, c) }" : `throw OneSDKError.unknownSymbol("${module}.\\(id)")`}
    }
  }`);
    }
    return out;
  };
  const observed = entries.flatMap((e) => {
    if (!e.observation || !e.receiver)
      return [];
    const type = swiftType(e.receiver);
    const path = String.fromCharCode(92) + type + "." + member(e.name);
    const swift = e.swift.replace(observedGetter(e), `let o: ${type} = try c.receiver(); return try OneSDKObservations.${e.observation}(o, ${path}, emit)`);
    return swift === e.swift ? [] : [{ ...e, swift }];
  });
  const observations = [];
  for (let at = 0;at < observed.length; at += CHUNK) {
    const slice = observed.slice(at, at + CHUNK);
    observations.push(`  @MainActor static func observe${at / CHUNK}(_ id: Int, _ c: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription {
    switch id {
${slice.map((e) => `    case ${e.id}: ${e.swift}`).join(`
`)}
    default: throw OneSDKError.unsupported("observable property ${module}.\\(id)")
    }
  }`);
  }
  const named = entries.filter((e) => argumentNames(e).length);
  const names = [];
  for (let at = 0;at < named.length; at += CHUNK) {
    const slice = named.slice(at, at + CHUNK);
    names.push(`  static func names${at / CHUNK}(_ id: Int) -> [String]? {
    switch id {
${slice.map((e) => `    case ${e.id}: return ${JSON.stringify(argumentNames(e))}`).join(`
`)}
    default: return nil
    }
  }`);
  }
  const dispatch = (list, isAsync) => {
    const groups = [];
    for (let at = 0;at < list.length; at += CHUNK) {
      const slice = list.slice(at, at + CHUNK);
      groups.push(`    if id >= ${slice[0].id} && id <= ${slice.at(-1).id} { return try ${isAsync ? "await " : ""}${isAsync ? "async" : "sync"}${at / CHUNK}(id, c) }`);
    }
    return groups;
  };
  return `// generated by packages/one/codegen/sdk/emit.ts; do not edit
import Foundation
import One
${imports.filter((m) => m !== "Foundation").map((m) => `import ${m}`).join(`
`)}

${conformances.join(`

`)}

@objc(OneSDKTable_${table}) final class OneSDKTable_${module}: NSObject, OneSDKTable {
  @MainActor func observe(_ id: Int, _ call: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription { try ${name}.observe(id, call, emit) }
  func argumentNames(_ id: Int) -> [String] { ${name}.argumentNames(id) }
  func sync(_ id: Int, _ call: OneSDKCall) throws -> Any { try ${name}.sync(id, call) }
  func async(_ id: Int, _ call: OneSDKCall) async throws -> Any { try await ${name}.async(id, call) }
}

enum ${name} {
  @MainActor static func observe(_ id: Int, _ c: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription {
${observations.map((_, i) => {
    const slice = observed.slice(i * CHUNK, (i + 1) * CHUNK);
    return `    if id >= ${slice[0].id} && id <= ${slice.at(-1).id} { return try observe${i}(id, c, emit) }`;
  }).join(`
`)}
    throw OneSDKError.unsupported("observable property ${module}.\\(id)")
  }

  static func argumentNames(_ id: Int) -> [String] {
${names.map((_, i) => {
    const slice = named.slice(i * CHUNK, (i + 1) * CHUNK);
    return `    if id >= ${slice[0].id} && id <= ${slice.at(-1).id} { return names${i}(id) ?? [] }`;
  }).join(`
`)}
    return []
  }

${syncCallbackIds.length ? `  static let syncCallbackIds: Set<Int> = [${syncCallbackIds.join(", ")}]

` : ""}  static func sync(_ id: Int, _ c: OneSDKCall) throws -> Any {
${dispatch(sync, false).join(`
`)}
    throw OneSDKError.unknownSymbol("${module}.\\(id)")
  }

  static func async(_ id: Int, _ c: OneSDKCall) async throws -> Any {
${syncCallbackIds.length ? `    if syncCallbackIds.contains(id) { throw OneSDKError.unsupported("async ${module}.\\(id) with synchronous callbacks") }
` : ""}${dispatch(async, true).join(`
`)}
    return try await OneSDKBackground.run { try sync(id, c) }
  }

${[...names, ...observations, ...chunks(sync, false), ...chunks(async, true)].join(`

`)}
}

${protocols()}
`;
}

// codegen/sdk/emit-ts.ts
var quote2 = (value) => JSON.stringify(value);
var cleanOwner = (name) => {
  let depth = 0;
  let out = "";
  for (const char of name) {
    if (char === "<")
      depth++;
    else if (char === ">")
      depth--;
    else if (!depth && char !== "`")
      out += char;
  }
  return out;
};
var identifier = (name) => name.replace(/[^A-Za-z0-9_$]/g, "_").replace(/^(?=\d)/, "_") || "value";
var cap = (s) => s ? s[0].toUpperCase() + s.slice(1) : "";
var labelName = (base, labels) => identifier(base + labels.filter((l) => l !== "_").map(cap).join(""));
var localName = (path) => identifier(path.join("_"));
var runtimeName = (info) => info.usr.startsWith("c:objc(cs)") ? info.usr.slice("c:objc(cs)".length) : `${info.module}.${info.path.join(".")}`;
var constructorProperties = new Set([
  "name",
  "length",
  "prototype",
  "caller",
  "arguments"
]);
var reserved = new Set([
  "default",
  "new",
  "class",
  "function",
  "var",
  "let",
  "const",
  "delete",
  "return",
  "in",
  "instanceof",
  "typeof",
  "void",
  "yield",
  "await",
  "this",
  "super",
  "arguments",
  "eval",
  "with",
  "switch",
  "case",
  "throw",
  "try",
  "catch",
  "finally",
  "break",
  "continue",
  "do",
  "else",
  "export",
  "extends",
  "for",
  "if",
  "import",
  "while",
  "enum",
  "implements",
  "interface",
  "package",
  "private",
  "protected",
  "public",
  "static"
]);
var parameterName = (name, i) => {
  const value = identifier(name === "_" ? `arg${i}` : name);
  return reserved.has(value) ? `${value}_` : value;
};
var stableNumber = (key) => {
  let hash = 2166136261;
  for (let i = 0;i < key.length; i++)
    hash = Math.imul(hash ^ key.charCodeAt(i), 16777619);
  return ((hash >>> 0) % 1e5).toString();
};
function facadeNames(entries) {
  const groups = new Map;
  for (const e of entries) {
    const scope = `${cleanOwner(e.owner ?? "")}:${e.name}`;
    groups.set(scope, [...groups.get(scope) ?? [], e]);
  }
  const names = new Map;
  const scopes = new Map;
  for (const group of groups.values()) {
    const overloaded = new Set(group.map((e) => e.usr)).size > 1;
    for (const e of group) {
      const scope = cleanOwner(e.owner ?? "");
      const used = scopes.get(scope) ?? new Map;
      scopes.set(scope, used);
      let name = overloaded && !["get", "set"].includes(e.kind) ? labelName(e.name, e.params.map((p) => p.label)) : identifier(e.name);
      if (name === "constructor" || name === "$handle")
        name += "Value";
      if (!e.owner && reserved.has(name))
        name += "Value";
      const base = name;
      for (let suffix = 0;used.has(name) && used.get(name) !== e.usr; suffix++)
        name = `${base}${stableNumber(e.usr)}${suffix || ""}`;
      used.set(name, e.usr);
      names.set(e.key, name);
    }
  }
  return names;
}

class Facade {
  output;
  bridge;
  names;
  imports = new Map;
  infos;
  graph;
  symbols;
  graphs = new Map;
  usedProtocols = new Map;
  sharedTypes = new Map;
  deduplicateTypes = false;
  published = new Set;
  getters;
  constructor(output, bridge) {
    this.output = output;
    this.bridge = bridge;
    this.names = facadeNames(output.entries);
    this.getters = new Set(output.entries.filter((e) => e.kind === "get").map((e) => e.usr));
    this.infos = new Map([...bridge.index.values()].map((info) => [
      `${info.module}.${info.path.join(".")}`,
      info
    ]));
    this.graph = loadGraph(output.module);
    if (this.graph)
      this.graphs.set(output.module, this.graph);
    this.symbols = new Map(this.graph?.symbols.map((s) => [s.identifier.precise, s]) ?? []);
    for (const e of output.entries) {
      const name = this.names.get(e.key);
      if (constructorProperties.has(name) && this.static(e))
        this.names.set(e.key, `${name}Value`);
    }
    this.allocateNames(output.entries, (e) => `${cleanOwner(e.owner ?? "")}:${this.valueOwner(e) ? "value" : this.static(e)}`);
  }
  allocateNames(entries, scope) {
    const scopes = new Map;
    for (const e of entries) {
      const key = scope(e);
      const used = scopes.get(key) ?? new Map;
      scopes.set(key, used);
      const base = this.names.get(e.key);
      let name = base;
      for (let suffix = 0;; suffix++) {
        const member = this.memberName(e, name);
        const previous = used.get(member);
        if (!previous || previous.usr === e.usr && previous.kind !== e.kind && ["get", "set"].includes(previous.kind) && ["get", "set"].includes(e.kind)) {
          used.set(member, e);
          this.names.set(e.key, name);
          break;
        }
        name = `${base}${stableNumber(e.usr)}${suffix || ""}`;
      }
    }
  }
  source(module) {
    if (!this.graphs.has(module)) {
      const graph = loadGraph(module);
      if (graph)
        this.graphs.set(module, graph);
    }
    return this.graphs.get(module);
  }
  implementable(info) {
    return info.implementable !== false && !this.output.skipped.some((s) => s.usr === `implementation:${info.usr}`);
  }
  element(info) {
    const requirement = info.conformsTo?.includes(ASYNC_SEQUENCE) ? "Element" : info.conformsTo?.includes(PUBLISHER) ? "Output" : undefined;
    if (!requirement)
      return;
    if (info.genericParameters?.includes(requirement))
      return requirement;
    const alias = this.infos.get(`${info.module}.${[...info.path, requirement].join(".")}`);
    if (alias)
      return this.type({ k: "named", name: `${alias.module}.${alias.path.join(".")}`, usr: alias.usr, args: [] });
  }
  info(type) {
    return this.bridge.index.get(type.usr ?? "") ?? this.infos.get(type.name) ?? this.infos.get(`${this.output.module}.${type.name}`);
  }
  reference(info) {
    const name = localName(info.path);
    if (info.module === this.output.module)
      return name;
    const alias = `_${identifier(info.module)}_${name}`;
    const imports = this.imports.get(info.module) ?? new Map;
    imports.set(name, alias);
    this.imports.set(info.module, imports);
    return alias;
  }
  type(type, input = false, depth = 0) {
    const value = this.inlineType(type, input, depth);
    if (!this.deduplicateTypes || depth || value.length < 24 || !["<", "{", "[", "|", "&", "=>"].some((token) => value.includes(token)))
      return value;
    let name = this.sharedTypes.get(value);
    if (!name) {
      name = `$SDK${this.sharedTypes.size}`;
      this.sharedTypes.set(value, name);
    }
    return name;
  }
  inlineType(type, input = false, depth = 0) {
    if (!type)
      return "void";
    if (depth > 20)
      return "unknown";
    const sub = (t, incoming = input) => this.type(t, incoming, depth + 1);
    switch (type.k) {
      case "optional":
        return `(${sub(type.t)}) | null`;
      case "array":
      case "variadic":
        return `Array<${sub(type.t)}>`;
      case "inout":
        return sub(type.t);
      case "existential":
        return sub(type.t);
      case "metatype":
        return "string";
      case "composition":
        return type.items.map((t) => `(${sub(t)})`).join(" & ");
      case "dictionary": {
        const key = sub(type.key);
        return key === "number" || key === "string" || /^['"]/.test(key) ? `Record<${key}, ${sub(type.value)}>` : `NativeMap<${key}, ${sub(type.value)}>`;
      }
      case "tuple":
        return !type.items.length ? "void" : type.items.every((i) => i.label) ? `{ ${type.items.map((i) => `${quote2(i.label)}: ${sub(i.t)}`).join("; ")} }` : `[${type.items.map((i) => sub(i.t)).join(", ")}]`;
      case "function": {
        const params = type.params.map((p, i) => {
          const out = input ? callbackOut(p.t) : undefined;
          return `arg${i}: ${out ? `NativeOut<${sub(out, false)}>` : sub(p.t, !input)}`;
        }).join(", ");
        const result = sub(type.result, input);
        return `((${params}) => ${!input || type.async ? `Promise<${result}>` : result})`;
      }
      case "named": {
        const name = type.name.split(".").at(-1);
        if (name === "Optional" && type.args[0])
          return sub({ k: "optional", t: type.args[0], implicit: false });
        if (["Array", "Set", "ContiguousArray"].includes(name) && type.args[0])
          return `Array<${sub(type.args[0])}>`;
        if (name === "Dictionary" && type.args.length === 2)
          return sub({ k: "dictionary", key: type.args[0], value: type.args[1] });
        const info = this.info(type);
        const alias = info && this.bridge.aliasOf(type, info);
        if (alias)
          return sub(alias);
        const mapped = this.bridge.type(type, input ? "input" : "output", NO_GENERICS);
        if (mapped.ok && !/\b(?:Handle|Implements|NativeOut|NativeMap)</.test(mapped.ts) && !(info?.cases?.length || info?.optionSet || info?.rawValue))
          return mapped.ts.replace(/\bDate\b/g, "globalThis.Date");
        if (info?.kind === "associatedtype")
          return "unknown";
        if (info) {
          const ref = this.reference(info);
          if (info.kind === "protocol")
            return input && this.implementable(info) ? `Implements<${ref}> | SDKHandle` : "SDKHandle";
          const count = info.genericParameters?.length ?? 0;
          return ref + (count ? `<${Array.from({ length: count }, (_, i) => type.args[i] ? sub(type.args[i]) : "unknown").join(", ")}>` : "");
        }
        if (mapped.ok) {
          if (mapped.ts.includes("Handle<")) {
            if (["AsyncStream", "AsyncThrowingStream"].includes(name) && type.args[0])
              return `SDKSequence<${sub(type.args[0])}>`;
            const paths = this.bridge.keyPaths(type, NO_GENERICS);
            return [...paths.map((p) => quote2(p.name)), "SDKHandle"].join(" | ");
          }
          return mapped.ts;
        }
        return "unknown";
      }
    }
  }
  concrete(e, type) {
    return this.bridge.substitute(type, {
      ...NO_GENERICS,
      resolved: new Map(Object.entries(e.specialization ?? {}))
    });
  }
  objcParam(e, type) {
    if (type.k !== "named" || type.args.length || type.usr)
      return;
    const info = this.infos.get(cleanOwner(e.owner ?? ""));
    const witnesses = info && this.bridge.index.get(info.usr)?.objcWitnesses;
    if (!info?.genericParameters?.includes(type.name) || !witnesses?.length)
      return;
    return type.name;
  }
  objcInit(e) {
    if (e.kind !== "init")
      return;
    const info = this.infos.get(cleanOwner(e.owner ?? ""));
    const witnesses = info && this.bridge.index.get(info.usr)?.objcWitnesses;
    if (!info?.genericParameters?.length || !witnesses?.length)
      return;
    if (!e.params.some((p) => this.objcParam(e, this.concrete(e, p.type))))
      return;
    const names = witnesses.map((u) => {
      const w = this.bridge.index.get(u);
      return w ? this.reference(w) : "SDKHandle";
    });
    return {
      union: names.join(" | "),
      result: names.map((name) => `T extends ${name} ? ${name} : `).join("") + "never"
    };
  }
  result(e) {
    const concrete = e.returns ? this.concrete(e, e.returns) : undefined;
    const unwrapped = (concrete && unmanagedReturn(concrete, e.name)?.inner) ?? concrete;
    const openName = unwrapped && (this.objcParam(e, unwrapped) ?? (unwrapped.k === "optional" ? this.objcParam(e, unwrapped.t) : undefined));
    let result = openName ? unwrapped.k === "optional" ? `(${openName}) | null` : openName : unwrapped ? this.type(unwrapped) : "void";
    if (e.kind === "init") {
      const info = e.receiver?.k === "named" ? this.info(e.receiver) : this.infos.get(cleanOwner(e.owner ?? ""));
      const objc = this.objcInit(e);
      result = objc && info ? `${this.reference(info)}<${objc.result}>` : e.receiver ? this.type(e.receiver) : info ? this.reference(info) : "SDKHandle";
      const declaration = this.symbols.get(e.usr)?.declarationFragments?.map((f) => f.spelling).join("") ?? "";
      if (/\binit\?/.test(declaration))
        result = `(${result}) | null`;
    }
    const out = e.params.filter((p) => p.out || p.inout);
    if (!out.length)
      return result;
    const written = (p) => {
      const pointee = outPointee(p.type) ?? (p.type.k === "inout" ? p.type.t : p.type);
      return cErrorOut(pointee) ?? pointee;
    };
    return `{ $ret: ${result === "void" ? "null" : result}; $out: { ${out.map((p) => `${quote2(p.name)}: ${this.type(this.concrete(e, written(p)))}`).join("; ")} } }`;
  }
  params(e) {
    const params = e.params.filter((p) => !p.out);
    const used = new Set;
    return params.map((p, i) => {
      let name = parameterName(p.name, i);
      if (used.has(name))
        name += i;
      used.add(name);
      const optional = (p.hasDefault || p.optional) && params.slice(i + 1).every((p) => p.hasDefault || p.optional);
      const open = this.objcParam(e, this.concrete(e, p.type));
      let type = open ? e.kind === "init" || e.kind === "static" ? "T" : open : this.type(this.concrete(e, p.type), true);
      if (p.keyPaths?.length)
        type = [...p.keyPaths.map(quote2), "SDKHandle"].join(" | ");
      if (p.typeNames?.length)
        type = p.typeNames.map(quote2).join(" | ");
      return {
        name,
        declaration: `${name}${optional ? "?" : ""}: ${type}`,
        hint: this.hint(this.concrete(e, p.type))
      };
    });
  }
  hint(type, depth = 0) {
    if (depth > 16)
      return null;
    if (["optional", "inout", "existential"].includes(type.k))
      return this.hint(type.t, depth + 1);
    if (type.k === "function")
      return {
        callback: { out: type.params.flatMap((p, i) => callbackOut(p.t) ? [i] : []) }
      };
    if (type.k === "array" || type.k === "variadic") {
      const hint = this.hint(type.t, depth + 1);
      return hint ? { array: hint } : null;
    }
    if (type.k === "dictionary") {
      const hint = this.hint(type.value, depth + 1);
      return hint ? { dictionary: hint } : null;
    }
    if (type.k === "named") {
      const info = this.info(type);
      const alias = info && this.bridge.aliasOf(type, info);
      if (alias)
        return this.hint(alias, depth + 1);
      if (info?.kind === "protocol" && this.implementable(info)) {
        this.usedProtocols.set(info.usr, info);
        return { protocol: info.usr };
      }
      const name = type.name.split(".").at(-1);
      if (["Array", "Set", "ContiguousArray", "Optional"].includes(name) && type.args[0]) {
        const hint = this.hint(type.args[0], depth + 1);
        return hint && name !== "Optional" ? { array: hint } : hint;
      }
      if (name === "Dictionary" && type.args[1]) {
        const hint = this.hint(type.args[1], depth + 1);
        return hint ? { dictionary: hint } : null;
      }
    }
    return null;
  }
  static(e) {
    const symbol = this.symbols.get(e.usr);
    return e.kind === "static" || e.kind === "init" || !!symbol && (symbol.kind.identifier.startsWith("swift.type.") || /\b(static|class)\s+(var|let|func)/.test(symbol.declarationFragments?.map((f) => f.spelling).join("") ?? ""));
  }
  valueOwner(e) {
    const info = e.owner && this.infos.get(cleanOwner(e.owner));
    return !!info && !!(info.cases?.length && !info.payload || info.optionSet || info.rawValue && info.kind === "struct");
  }
  memberName(e, name = this.names.get(e.key)) {
    if (!e.owner)
      return name;
    if (this.valueOwner(e) && !this.static(e)) {
      if (e.kind === "get")
        return `get${cap(name)}`;
      if (e.kind === "set")
        return `set${cap(name)}`;
    }
    return e.kind === "set" && (e.main || e.isAsync) ? `set${cap(name)}` : name;
  }
  valueSignature(e) {
    const name = this.names.get(e.key);
    const result = this.result(e);
    const returned = e.isAsync || e.main ? `Promise<${result}>` : result;
    const params = this.params(e).map((p) => p.declaration);
    if (this.static(e)) {
      if (e.kind === "get")
        return `get ${name}(): ${returned}`;
      if (e.kind === "set" && !e.main && !e.isAsync)
        return `set ${name}(${params.map((p) => p.replace("?:", ":")).join(", ")})`;
    } else {
      const info = this.infos.get(cleanOwner(e.owner));
      params.unshift(`$self: ${localName(info.path)}`);
    }
    const method = this.memberName(e);
    return `${method}(${params.join(", ")}): ${returned}`;
  }
  signature(e) {
    if (this.valueOwner(e))
      return this.valueSignature(e);
    const name = this.names.get(e.key);
    const result = this.result(e);
    const returned = e.isAsync || e.main ? `Promise<${result}>` : result;
    if (e.kind === "get") {
      if (!e.owner)
        return this.output.entries.some((s) => s.kind === "set" && s.usr === e.usr) ? `${name}.value: ${returned}` : `const ${name}: ${returned}`;
      return `${this.static(e) ? "static " : ""}get ${name}(): ${returned}`;
    }
    if (e.kind === "set" && !e.owner)
      return e.main || e.isAsync ? `${name}.setValue(${this.params(e).map((p) => p.declaration).join(", ")}): ${returned}` : `${name}.value: ${this.params(e)[0]?.declaration.split(": ").slice(1).join(": ") ?? "unknown"}`;
    if (e.kind === "set" && !e.main && !e.isAsync)
      return `${this.static(e) ? "static " : ""}set ${name}(${this.params(e).map((p) => p.declaration.replace("?:", ":")).join(", ")})`;
    const objc = this.objcInit(e);
    const typeParams = objc ? `<T extends ${objc.union}>` : "";
    return `${this.static(e) ? "static " : ""}${this.memberName(e)}${typeParams}(${this.params(e).map((p) => p.declaration).join(", ")}): ${returned}`;
  }
  slots(e) {
    const params = this.params(e);
    let at = 0;
    return e.params.map((p) => p.out ? { name: null, index: null, hint: null } : { name: params[at].name, index: at, hint: params[at++].hint });
  }
  invoke(e, self) {
    this.published.add(e.key);
    const slots = this.slots(e);
    const args = slots.map((s) => s.name ?? "null");
    const hints = slots.map((s) => s.hint);
    const sync = !!e.syncCallbacks;
    const receiver = self ?? (e.owner && !this.static(e) ? "this" : "undefined");
    return `${e.isAsync || e.main ? "callSDKAsync" : "callSDK"}<${this.result(e)}>(${quote2(this.output.table ?? this.output.module)}, ${e.id}, ${receiver}, [${args.join(", ")}]${hints.some(Boolean) || sync ? `, ${quote2(hints)}` : ""}${sync ? ", true" : ""})`;
  }
  jsdoc(usr) {
    const symbol = this.symbols.get(usr);
    if (!symbol)
      return "";
    const declaration = symbol.declarationFragments?.map((f) => f.spelling).join("") ?? symbol.names.title;
    const availability = symbol.availability?.filter((a) => a.domain === "iOS").flatMap((a) => [
      a.introduced && `@availability iOS ${a.introduced.major}.${a.introduced.minor ?? 0}+`,
      a.deprecated && `@deprecated iOS ${a.deprecated.major}.${a.deprecated.minor ?? 0}`,
      a.isUnconditionallyDeprecated && "@deprecated"
    ].filter(Boolean)) ?? [];
    const lines = [declaration, ...availability].map((line) => String(line).replace(/\*\//g, "* /"));
    if (lines.length === 1 && !declaration.includes(`
`))
      return `/** ${lines[0]} */
`;
    return `/**
 * ${lines.join(`
 * `)}
 */
`;
  }
  memberDoc(e) {
    if (e.kind === "set" && this.getters.has(e.usr))
      return "";
    return this.jsdoc(e.usr);
  }
  protocol(info) {
    const members = new Map;
    const seen = new Set;
    const collect = (owner) => {
      if (seen.has(owner.usr))
        return;
      seen.add(owner.usr);
      const graph = this.source(owner.module);
      const symbols = new Map(graph?.symbols.map((s) => [s.identifier.precise, s]));
      for (const rel of graph?.relationships ?? []) {
        if (rel.source === owner.usr && ["inheritsFrom", "conformsTo"].includes(rel.kind)) {
          const parent = this.bridge.index.get(rel.target);
          if (parent && parent.usr !== "c:objc(pl)NSObject")
            collect(parent);
        }
        if (rel.target === owner.usr && ["requirementOf", "optionalRequirementOf"].includes(rel.kind)) {
          const symbol = symbols.get(rel.source);
          if (symbol)
            members.set(rel.source, symbol);
        }
      }
    };
    collect(info);
    const methods = {};
    const declarations = [];
    const signatures = new Map;
    for (const symbol of members.values()) {
      if (!symbol.functionSignature)
        continue;
      if (this.output.skipped.some((s) => s.usr === `implementation:${info.usr}:${symbol.identifier.precise}`))
        continue;
      const title = symbol.pathComponents.at(-1);
      const { base, labels } = splitTitle(title);
      let name = labelName(base, labels);
      if (methods[name] && methods[name] !== title)
        name += String(signatures.size);
      const params = (symbol.functionSignature.parameters ?? []).map((p) => this.type(parameterType(p.declarationFragments)));
      const returns = symbol.functionSignature.returns;
      const value = returns?.length ? this.type(parseType(returns), true) : "void";
      const result = value !== "void" && effectsOf(symbol.declarationFragments?.map((f) => f.spelling).join("") ?? "").isAsync ? `Promise<${value}>` : value;
      methods[name] = title;
      const signature = signatures.get(name) ?? {
        symbol,
        params: [],
        results: new Set
      };
      signature.params.push(params);
      signature.results.add(result);
      signatures.set(name, signature);
    }
    for (const [name, signature] of signatures) {
      const params = signature.params[0].map((_, i) => `arg${i}: ${[...new Set(signature.params.map((p) => p[i] ?? "undefined"))].join(" | ")}`).join(", ");
      declarations.push(`  ${this.jsdoc(signature.symbol.identifier.precise).replace(/\n/g, `
  `)}${quote2(name)}?: (${params}) => ${[...signature.results].join(" | ")};`);
    }
    return {
      declaration: `${this.jsdoc(info.usr)}export interface ${localName(info.path)} {
${declarations.join(`
`)}
}`,
      registration: `registerSDKProtocol(${quote2(info.usr)}, ${quote2(methods)});`
    };
  }
  deduplicate(content) {
    const occurrences = new Map;
    const signatures = content.replace(/\{ (?:return )?callSDK[^\n]*; \}/g, "").replace(/ = callSDK[^\n]*;/g, ";");
    for (const match of signatures.matchAll(/\$SDK\d+\b/g))
      occurrences.set(match[0], (occurrences.get(match[0]) ?? 0) + 1);
    const replacements = new Map;
    const aliases = [];
    for (const [type, name] of this.sharedTypes) {
      const count = occurrences.get(name) ?? 0;
      const declaration = `type ${name} = ${type};`;
      if (count * (type.length - name.length) > declaration.length + 2) {
        aliases.push(declaration);
        replacements.set(name, name);
      } else
        replacements.set(name, type);
    }
    content = content.replace(/\$SDK\d+\b/g, (name) => replacements.get(name));
    return [...aliases, content].join(`

`);
  }
  emit() {
    this.deduplicateTypes = true;
    const declarations = [];
    const registrations = [];
    const infos = [...this.bridge.index.values()].filter((i) => i.module === this.output.module && i.kind !== "associatedtype");
    const owners = new Map;
    for (const e of this.output.entries)
      if (e.owner) {
        const owner = cleanOwner(e.owner);
        owners.set(owner, [...owners.get(owner) ?? [], e]);
      }
    for (const owner of owners.keys()) {
      const info = this.infos.get(owner);
      if (info && info.module !== this.output.module)
        infos.push(info);
    }
    const parents = new Map;
    for (const rel of this.graph?.relationships ?? []) {
      if (rel.kind !== "inheritsFrom")
        continue;
      const parent = this.bridge.index.get(rel.target);
      if (parent?.module === this.output.module && parent.kind === "class")
        parents.set(rel.source, parent);
    }
    const ordered = [];
    const visited = new Set;
    const visit = (info) => {
      if (visited.has(info.usr))
        return;
      visited.add(info.usr);
      const parent = parents.get(info.usr);
      if (parent)
        visit(parent);
      ordered.push(info);
    };
    for (const info of infos.sort((a, b) => a.path.join(".").localeCompare(b.path.join("."))))
      visit(info);
    const classMembers = new Map;
    const observableNames = new Map;
    const emitted = new Set;
    for (const info of ordered) {
      const name = localName(info.path);
      if (emitted.has(name))
        continue;
      emitted.add(name);
      const entries = owners.get(`${info.module}.${info.path.join(".")}`) ?? [];
      const used = new Set;
      const generics = info.genericParameters?.length ? `<${info.genericParameters.map((p, i) => {
        const base = parameterName(p, i);
        let name = base;
        for (let suffix = i;used.has(name); suffix++)
          name = `${base}${suffix}`;
        used.add(name);
        return `${name} = unknown`;
      }).join(", ")}>` : "";
      if (info.kind === "typealias") {
        const type = {
          k: "named",
          name: `${info.module}.${info.path.join(".")}`,
          usr: info.usr,
          args: (info.genericParameters ?? []).map(() => ({ k: "named", name: "Any", args: [] }))
        };
        declarations.push(`${this.jsdoc(info.usr)}export type ${name}${generics} = ${info.alias ? this.type(type) : "SDKHandle"};`);
        continue;
      }
      const value = info.cases?.length && !info.payload || info.optionSet || info.rawValue && info.kind === "struct";
      if (value) {
        const values = info.cases?.length && !info.payload ? info.cases : info.constants ?? [];
        const open = !info.optionSet && !(info.cases?.length && !info.payload);
        const union = open ? [...values.map(quote2), `(${info.rawValue} & {})`].join(" | ") : values.length ? values.map(quote2).join(" | ") : info.rawValue ?? "string";
        declarations.push(`${this.jsdoc(info.usr)}export type ${name}${generics} = ${info.optionSet ? `Array<${union}>` : union};`);
        if (entries.length) {
          const members = entries.map((e) => {
            const setter = this.static(e) && e.kind === "set" && !e.main && !e.isAsync;
            return `  ${this.memberDoc(e).replace(/\n/g, `
  `)}${this.valueSignature(e)} { ${setter ? "" : "return "}${this.invoke(e, this.static(e) ? "undefined" : "$self")}; }`;
          });
          declarations.push(`export const ${name} = {
${members.join(`,
`)}
};`);
        }
        continue;
      }
      if (info.kind === "protocol") {
        const protocol = this.protocol(info);
        declarations.push(protocol.declaration);
        registrations.push(protocol.registration);
        continue;
      }
      const parent = parents.get(info.usr);
      const inherited = parent ? classMembers.get(parent.usr) ?? [] : [];
      const ownNames = new Set(entries.map((e) => `${this.static(e)}:${this.names.get(e.key)}`));
      const names = this.names;
      this.names = new Map(names);
      const accessor = (e) => e.kind === "get" || e.kind === "set" && !e.main && !e.isAsync;
      const aliases = inherited.filter(({ entry, name }) => !this.static(entry) && (!ownNames.has(`${this.static(entry)}:${name}`) || entries.some((own) => !this.static(own) && this.names.get(own.key) === name && accessor(own) !== accessor(entry))));
      for (const { entry, name } of aliases)
        this.names.set(entry.key, name);
      this.allocateNames([...entries, ...aliases.map(({ entry }) => entry)], (e) => String(this.static(e)));
      const renamed = aliases.filter(({ entry, name }) => this.names.get(entry.key) !== name).map(({ entry }) => entry);
      const own = [...entries, ...renamed];
      const key = (entry, name) => `${this.static(entry)}:${this.memberName(entry, name)}`;
      const overridden = new Set(own.map((entry) => key(entry, this.names.get(entry.key))));
      const instanceOmissions = [];
      const staticOmissions = [];
      for (const { entry, name } of inherited) {
        if (!overridden.has(key(entry, name)))
          continue;
        const omitted = this.static(entry) ? staticOmissions : instanceOmissions;
        omitted.push(this.memberName(entry, name));
      }
      let base = parent ? localName(parent.path) : "SDKHandle";
      if (parent && (instanceOmissions.length || staticOmissions.length)) {
        const omit = (type, keys) => keys.length ? `Omit<${type}, ${[...new Set(keys)].map(quote2).join(" | ")}>` : type;
        base = `(${base} as unknown as ${omit(`typeof ${base}`, [...staticOmissions, "prototype"])} & (new ($handle: SDKHandle['$handle']) => ${omit(localName(parent.path), instanceOmissions)}))`;
      }
      const members = own.map((e) => `  ${this.memberDoc(e).replace(/\n/g, `
  `)}${this.signature(e)} { ${e.kind === "set" && !e.main && !e.isAsync ? "" : "return "}${this.invoke(e)}; }`);
      const identities = new Set;
      let ancestor = info;
      while (ancestor && !identities.has(ancestor.usr)) {
        identities.add(ancestor.usr);
        const parent = ancestor.superclass && this.bridge.index.get(ancestor.superclass);
        if (!parent) {
          if (ancestor.superclass)
            identities.add(ancestor.superclass);
          break;
        }
        ancestor = parent;
      }
      members.push(`  declare readonly $type: { ${[...identities].map((usr) => `${quote2(usr)}: true`).join("; ")} };`);
      classMembers.set(info.usr, [
        ...inherited.filter(({ entry, name }) => !overridden.has(key(entry, name))),
        ...own.map((entry) => ({ entry, name: this.names.get(entry.key) }))
      ]);
      const observedProperties = Object.fromEntries(own.filter((e) => e.observation).map((e) => [this.names.get(e.key), e.id]));
      const methods = Object.fromEntries(own.filter((e) => e.owner && !this.static(e) && !["init", "get", "set"].includes(e.kind) && !e.syncCallbacks).map((e) => {
        const slots = this.slots(e);
        const entry = { id: e.id };
        if (e.params.some((p) => p.out))
          entry.args = slots.map((s) => s.index);
        const hints = slots.map((s) => s.hint);
        if (hints.some((h) => h !== null))
          entry.hints = hints;
        return [this.memberName(e), entry];
      }));
      const observable = [
        ...parent ? observableNames.get(parent.usr) ?? [] : [],
        ...classMembers.get(info.usr).filter(({ entry }) => entry.observation).map(({ name }) => name)
      ];
      observableNames.set(info.usr, observable);
      if (observable.length)
        members.push(`  declare readonly $observable: { ${[...new Set(observable)].map((n) => `${quote2(n)}: true`).join("; ")} };`);
      const element = this.element(info);
      if (element)
        members.push(`  declare readonly $element: ${element};`);
      this.names = names;
      declarations.push(`${this.jsdoc(info.usr)}export class ${name}${generics} extends ${base} {
${members.join(`
`)}
}`);
      registrations.push(`registerSDKClass(${quote2(runtimeName(info))}, ${name}, { module: ${quote2(this.output.table ?? this.output.module)}, properties: ${quote2(observedProperties)}${Object.keys(methods).length ? `, methods: ${quote2(methods)}` : ""} }${info.module !== this.output.module ? ", true" : ""});`);
    }
    const globals = this.output.entries.filter((e) => !e.owner);
    for (const e of globals.filter((e) => !["get", "set"].includes(e.kind))) {
      declarations.push(`${this.jsdoc(e.usr)}export function ${this.signature(e)} { return ${this.invoke(e)}; }`);
    }
    for (const e of globals.filter((e) => e.kind === "get")) {
      const setter = globals.find((s) => s.kind === "set" && s.usr === e.usr);
      if (!setter)
        declarations.push(`${this.jsdoc(e.usr)}export ${this.signature(e)} = ${this.invoke(e)};`);
      else {
        const params = this.params(setter).map((p) => p.declaration.replace("?:", ":")).join(", ");
        const write = setter.main || setter.isAsync ? `setValue(${params}): Promise<void> { return ${this.invoke(setter)}; }` : `set value(${params}) { ${this.invoke(setter)}; }`;
        declarations.push(`${this.jsdoc(e.usr)}export const ${this.names.get(e.key)} = {
  get value(): ${e.main || e.isAsync ? `Promise<${this.result(e)}>` : this.result(e)} { return ${this.invoke(e)}; },
  ${write}
};`);
      }
    }
    for (const info of this.usedProtocols.values()) {
      if (info.module !== this.output.module)
        registrations.push(this.protocol(info).registration);
    }
    const imports = [...this.imports].sort(([a], [b]) => a.localeCompare(b)).map(([module, names]) => `import type { ${[...names].map(([name, alias]) => `${name} as ${alias}`).join(", ")} } from ${quote2(`one/ios/${module}`)};`);
    const content = this.deduplicate(declarations.join(`

`));
    return `// generated by packages/one/codegen/sdk/emit-ts.ts; do not edit
import { SDKHandle, callSDK, callSDKAsync, registerSDKClass, registerSDKProtocol, type Implements, type SDKSequence, type NativeOut, type NativeMap, type NativeError } from 'one/ios-runtime';
${imports.join(`
`)}

${content}

${registrations.join(`
`)}
`;
  }
}
function emitFacade(output, bridge) {
  return new Facade(output, bridge).emit();
}

// codegen/sdk/generate.ts
import { execFile as execFile2, execFileSync as execFileSync3 } from "node:child_process";
import { mkdtempSync as mkdtempSync2, writeFileSync as writeFileSync3 } from "node:fs";
import { tmpdir as tmpdir2 } from "node:os";
import { join as join4, resolve } from "node:path";
import { promisify as promisify2 } from "node:util";

// codegen/sdk/inherited-inits.ts
import { execFileSync as execFileSync2 } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as join2 } from "node:path";
var defaultRunner = (args, source) => {
  const dir = mkdtempSync(join2(tmpdir(), "one-sdk-inits-"));
  try {
    const file = join2(dir, "probe.m");
    writeFileSync(file, source);
    try {
      execFileSync2("xcrun", ["clang", ...args, file], { encoding: "utf8", stdio: ["ignore", "ignore", "pipe"] });
      return { status: 0, stderr: "" };
    } catch (error) {
      const e = error;
      return { status: e.status ?? 1, stderr: String(e.stderr ?? "") };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};
var PROVEN = new Set([
  "c:objc(cs)NSCache(im)init",
  "c:objc(cs)NSMapTable(im)init",
  "c:objc(cs)NSHashTable(im)init"
]);
function synthesized(graph) {
  const owners = new Map(graph.relationships.filter((r) => r.kind === "memberOf").map((r) => [r.source, r.target]));
  const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]));
  const out = [];
  for (const s of graph.symbols.filter((s) => s.synthesizedInit && s.kind.identifier === "swift.init")) {
    const ownerUsr = owners.get(s.identifier.precise);
    const owner = ownerUsr ? byUsr.get(ownerUsr) : undefined;
    const name = ownerUsr ? /^c:objc\(cs\)([^()]+)$/.exec(ownerUsr)?.[1] : undefined;
    if (!ownerUsr || !owner || !name)
      throw new Error(`synthesized ${s.identifier.precise} has no objective-c owner`);
    const custom = graph.symbols.filter((d) => d.kind.identifier === "swift.init" && owners.get(d.identifier.precise) === ownerUsr && d.identifier.precise !== s.identifier.precise && !d.synthesizedInit && !/\(im\)initWithCoder:/.test(d.identifier.precise)).length;
    out.push({ usr: s.identifier.precise, name, custom });
  }
  return out;
}
function checkInheritedInits(module, graph, { runner = defaultRunner, sdk } = {}) {
  const rejected = new Map;
  const pending = [];
  for (const init of synthesized(graph)) {
    if (init.custom && !PROVEN.has(init.usr)) {
      rejected.set(init.usr, `inherited init: cannot prove legal (class declares ${init.custom} custom initializer${init.custom === 1 ? "" : "s"})`);
    } else
      pending.push(init);
  }
  if (!pending.length)
    return rejected;
  const source = [`@import ${module};`, ...pending.map(({ name }, i) => `#line 1 "one-sdk-init-${i}"
static void oneSDKInitProbe${i}(void) { (void)[[${name} alloc] init]; }`)].join(`
`);
  const args = [
    "-fsyntax-only",
    "-ferror-limit=0",
    "-x",
    "objective-c",
    "-fmodules",
    "-isysroot",
    sdk ?? sdkPath(),
    "-target",
    `arm64-apple-ios${MINIMUM_IOS}-simulator`
  ];
  const { status, stderr } = runner(args, source);
  const errors = stderr.split(`
`).filter((line) => / error: /.test(line));
  if (status !== 0 && !errors.length)
    throw new Error(`inherited-init probe for ${module} failed without errors: ${stderr.slice(0, 500)}`);
  for (const error of errors) {
    const match = /^one-sdk-init-(\d+):\d+:\d+: error: (.*)$/.exec(error);
    const init = match ? pending[Number(match[1])] : undefined;
    if (!init)
      throw new Error(`unexplained inherited-init error for ${module}: ${error}`);
    if (/use of undeclared identifier|unknown receiver|unknown type name/.test(match[2])) {
      if (!rejected.has(init.usr))
        rejected.set(init.usr, `inherited init: cannot probe (${match[2].slice(0, 120)})`);
      continue;
    }
    if (!/unavailable/i.test(match[2]))
      throw new Error(`unexplained inherited-init error for ${module}: ${error}`);
    if (!rejected.has(init.usr))
      rejected.set(init.usr, `inherited init: clang: ${match[2]}`);
  }
  return rejected;
}

// codegen/sdk/c-linkage.ts
import { mkdirSync as mkdirSync2, writeFileSync as writeFileSync2 } from "node:fs";
import { join as join3 } from "node:path";
var FRAMEWORKS = ["CarPlay", "GameController", "AVFoundation", "AuthenticationServices"];
function cLinkageSwiftFlags(moduleMap, sdkRoot) {
  return ["-Xcc", `-fmodule-map-file=${moduleMap}`, ...FRAMEWORKS.flatMap((framework) => [
    "-Xcc",
    "-iapinotes-modules",
    "-Xcc",
    join3(sdkRoot, "System/Library/Frameworks", `${framework}.framework/Headers`)
  ])];
}
function writeCLinkageModules(dir, sdkRoot) {
  mkdirSync2(dir, { recursive: true });
  const path = join3(dir, "module.modulemap");
  writeFileSync2(path, FRAMEWORKS.map((framework) => `framework module ${framework} [system] [extern_c] {
  umbrella header ${JSON.stringify(join3(sdkRoot, "System/Library/Frameworks", `${framework}.framework/Headers`, `${framework}.h`))}
  link framework "${framework}"
  export *
  module * { export * }
}
`).join(`
`));
  return path;
}

// codegen/sdk/generate.ts
var run2 = promisify2(execFile2);
var RUNTIME = resolve(import.meta.dirname, "../../ios/SDK/OneSDKRuntime.swift");
var CXX_INTEROP = ["-cxx-interoperability-mode=default", "-Xcc", "-std=c++20"];
var SDKS = [
  { sdk: "iphonesimulator", suffix: "-simulator" },
  { sdk: "iphoneos", suffix: "" }
];
var targetArgs = new Map;
var target = (sdk) => {
  let configuration = targetArgs.get(sdk);
  if (!configuration) {
    const path = execFileSync3("xcrun", ["--sdk", sdk.sdk, "--show-sdk-path"], { encoding: "utf8" }).trim();
    configuration = { sdkRoot: path, args: [
      "-swift-version",
      "5",
      "-sdk",
      path,
      "-target",
      `arm64-apple-ios${MINIMUM_IOS}${sdk.suffix}`,
      "-explicit-module-build",
      ...CXX_INTEROP
    ] };
    targetArgs.set(sdk, configuration);
  }
  return configuration;
};
var runtimeModules = new Map;
function oneModule(sdk) {
  let module = runtimeModules.get(sdk);
  if (!module) {
    module = (async () => {
      const dir = mkdtempSync2(join4(tmpdir2(), "one-sdk-runtime-"));
      const moduleMap = writeCLinkageModules(join4(dir, "CLinkage"), target(sdk).sdkRoot);
      await run2("xcrun", [
        "swiftc",
        "-emit-module",
        "-parse-as-library",
        "-module-name",
        "One",
        ...target(sdk).args,
        ...cLinkageSwiftFlags(moduleMap, target(sdk).sdkRoot),
        "-emit-module-path",
        join4(dir, "One.swiftmodule"),
        RUNTIME
      ]);
      return dir;
    })();
    runtimeModules.set(sdk, module);
  }
  return module;
}
async function typecheck(files) {
  const errors = await Promise.all(SDKS.map(async (sdk) => {
    try {
      const dir = await oneModule(sdk);
      await run2("xcrun", [
        "swiftc",
        "-emit-sil",
        "-o",
        "/dev/null",
        ...target(sdk).args,
        ...cLinkageSwiftFlags(join4(dir, "CLinkage/module.modulemap"), target(sdk).sdkRoot),
        "-I",
        dir,
        ...files
      ], { maxBuffer: 256 * 1024 * 1024 });
      return [];
    } catch (error) {
      const stderr = error instanceof Error && "stderr" in error ? String(error.stderr) : String(error);
      return stderr.split(`
`).filter((line) => / error: /.test(line));
    }
  }));
  return errors.flat();
}
function prepare() {
  const symbols = new Map;
  const facts = [];
  for (const module of sdkModules()) {
    const graph = loadGraph(module);
    if (!graph)
      continue;
    facts.push(collectFacts(graph));
    for (const s of graph.symbols) {
      if (s.kind.identifier === "swift.class" || s.kind.identifier === "swift.protocol" || s.kind.identifier === "swift.struct" || s.kind.identifier === "swift.enum")
        symbols.set(s.identifier.precise, s);
    }
  }
  const imports = new Map;
  return { bridge: new Bridge(buildIndex(facts)), symbols, imports };
}
var IMPLEMENTATION_DETAIL = /module '([^']+)' is an implementation detail of '[^']+'; import '([^']+)' instead/;
function withImports(swift, imports) {
  return swift.replace(/^import (\S+)$/gm, (line, module) => imports.has(module) ? `import ${imports.get(module)}` : line);
}
function rejected(swift, output, errors) {
  const lines = swift.split(`
`);
  const out = new Map;
  for (const error of errors) {
    const match = /:(\d+):\d+: error: (.*)$/.exec(error);
    if (!match)
      continue;
    const line = Number(match[1]) - 1;
    const reason = `compile: ${match[2]}`;
    let implementation;
    for (let at = line;at >= 0; at--) {
      if (lines[at] === "// end implementation" || lines[at].startsWith("enum OneSDK_"))
        break;
      const marker = /^\/\/ implementation (.+)$/.exec(lines[at]);
      if (marker) {
        implementation = marker[1];
        break;
      }
    }
    if (implementation) {
      if (!out.has(implementation))
        out.set(implementation, reason);
      continue;
    }
    let opening;
    for (let at = line;at >= 0 && !lines[at].startsWith("@objc(") && !lines[at].startsWith("// conformance "); at--) {
      const marker = /^\/\/ open (.+)$/.exec(lines[at]);
      if (marker) {
        opening = marker[1];
        break;
      }
    }
    const entryCase = /^\s+case (\d+): /.exec(lines[line] ?? "");
    if (entryCase) {
      const entry = output.entries.find((e) => e.id === Number(entryCase[1]));
      const key = entry && (opening ? `open:${entry.key}` : lines[line].includes("func oneSDKPick<") ? `pick:${entry.key}` : entry.key);
      if (key && !out.has(key))
        out.set(key, reason);
      continue;
    }
    if (opening) {
      if (!out.has(`open:${opening}`))
        out.set(`open:${opening}`, reason);
      continue;
    }
    for (let at = line;at >= 0 && !lines[at].startsWith("enum OneSDK_"); at--) {
      const conformance = /^\/\/ conformance (.+)$/.exec(lines[at]);
      if (conformance) {
        if (!out.has(conformance[1]))
          out.set(conformance[1], reason);
        break;
      }
    }
  }
  return out;
}
async function generateModule(module, prepared, out, { table } = {}, passes = 3) {
  const graph = loadGraph(module);
  if (!graph)
    return null;
  const exclude = new Map;
  for (const [usr, reason] of checkInheritedInits(module, graph))
    exclude.set(usr, reason);
  const file = join4(out, `OneSDK_${module}.swift`);
  for (let pass = 0;; pass++) {
    const output = emitModule(graph, prepared.bridge, prepared.symbols, exclude, { table });
    output.swift = withImports(output.swift, prepared.imports);
    writeFileSync3(file, output.swift);
    const errors = await typecheck([file]);
    let learned = false;
    for (const error of errors) {
      const match = IMPLEMENTATION_DETAIL.exec(error);
      if (match && !prepared.imports.has(match[1])) {
        prepared.imports.set(match[1], match[2]);
        learned = true;
      }
    }
    if (learned)
      continue;
    const found = rejected(output.swift, output, errors);
    if (!errors.length || pass === passes || !found.size)
      return { output, errors, file };
    for (const [key, reason] of found)
      exclude.set(key, reason);
  }
}
if (false) {}

// codegen/sdk/fingerprint.ts
function generatorFingerprint() {
  return "532ffa06eebd2aaddc794f6e2b09d7e2b37725628139fc43e6f6650514737c02";
}
// schema.json
var minimumVersion = 17;

// codegen/sdk/app.ts
var SDK_POD = "OneSDKBindings";
function writeSdkNativeSupport(dir, sdkRoot = sdkPath()) {
  const moduleMap = writeCLinkageModules(dir, sdkRoot);
  return {
    generation: generatorFingerprint().slice(0, 16),
    swiftFlags: cLinkageSwiftFlags(moduleMap, sdkRoot)
  };
}
var SKIP = new Set(["node_modules", "ios", "android", "dist", "build", "types"]);
var SOURCE = /\.(?:[cm]?[jt]sx?)$/;
var IMPORT = /['"]one\/ios\/([A-Za-z_][A-Za-z0-9_]*)['"]/g;
var ONE_IMPORT = /(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)['"]one['"]/;
function importedFrameworks(root, platformRoot = join5(dirname(fileURLToPath(import.meta.url)), "../../src/platform")) {
  const found = new Set;
  let usesOne = false;
  const walk = (dir, unified = false) => {
    for (const entry of readdirSync2(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".") || SKIP.has(entry.name))
        continue;
      const full = join5(dir, entry.name);
      if (entry.isDirectory())
        walk(full, unified);
      else if (SOURCE.test(entry.name) && (!unified || /\.ios\.[jt]sx?$/.test(entry.name))) {
        const source = readFileSync2(full, "utf8");
        for (const match of source.matchAll(IMPORT))
          found.add(match[1]);
        if (!unified && ONE_IMPORT.test(source))
          usesOne = true;
      }
    }
  };
  walk(root);
  if (usesOne)
    walk(platformRoot, true);
  return [...found].sort();
}
function cacheDir2() {
  const version = sdkVersion();
  const generation = generatorFingerprint().slice(0, 16);
  const cacheKey = createHash2("sha256").update(version).update(generation).digest("hex").slice(0, 16);
  const dir = join5(homedir2(), ".cache", "one", "sdk-bindings", `${version}-${cacheKey}`);
  mkdirSync4(dir, { recursive: true });
  return { dir, generation };
}
function entryUsrs(entry) {
  const types = [
    ...entry.params.map((p) => p.type),
    ...entry.returns ? [entry.returns] : [],
    ...Object.values(entry.specialization ?? {}),
    ...entry.receiver ? [entry.receiver] : []
  ];
  return types.flatMap((type) => typeUsrs(type));
}
var current;
var sdkCache = () => current ??= openCache();
function openCache() {
  const known = new Set(sdkModules());
  const { dir: cache, generation } = cacheDir2();
  const tableName = (module) => `${module}_${generation}`;
  const tableFile = (module) => join5(cache, `OneSDK_${module}.swift`);
  const typesFile = (module) => join5(cache, `OneSDK_${module}.types.swift`);
  const facadeFile = (module) => join5(cache, `${module}.ts`);
  const manifest = (module) => join5(cache, `OneSDK_${module}.json`);
  const extractionErrors = new Map;
  let prepared;
  const ready = () => prepared ??= extractGraphs([...known]).then(({ failed }) => {
    for (const { module, error } of failed)
      extractionErrors.set(module, error);
    return prepare();
  });
  const generate = async (module, log) => {
    if (!known.has(module)) {
      throw new Error(`[one] one/ios/${module} names no framework in the iOS ${sdkVersion()} SDK`);
    }
    if (!existsSync2(manifest(module))) {
      log(`[one] generating iOS bindings for ${module}`);
      const result = await generateModule(module, await ready(), cache, { table: tableName(module) });
      if (!result) {
        const error = extractionErrors.get(module);
        throw new Error(`[one] no symbol graph for ${module}${error ? `: swift-symbolgraph-extract failed: ${error}` : ""}`);
      }
      if (result.errors.length)
        throw new Error(`[one] ${module} bindings do not compile:
${result.errors.join(`
`)}`);
      const { entries, skipped } = result.output;
      const { bridge } = await ready();
      const modules = new Set(entries.flatMap((entry) => entryUsrs(entry).map((usr) => bridge.index.get(usr)?.module ?? "")));
      modules.delete("");
      modules.delete(module);
      const cached = { entries: entries.map(({ swift, ...e }) => e), skipped, modules: [...modules].sort() };
      writeFileSync4(facadeFile(module), emitFacade({ module, table: tableName(module), entries: cached.entries, skipped }, bridge));
      writeFileSync4(manifest(module), JSON.stringify(cached));
    }
    return JSON.parse(readFileSync2(manifest(module), "utf8"));
  };
  const tables = new Map;
  const table = (module, log) => {
    if (!tables.has(module))
      tables.set(module, generate(module, log));
    return tables.get(module);
  };
  const types = async (module, log) => {
    if (existsSync2(typesFile(module)))
      return;
    const { skipped } = await table(module, log);
    const { bridge, symbols } = await ready();
    const exclude = new Map(skipped.filter((s) => s.reason.startsWith("compile:")).map((s) => [s.usr, s.reason]));
    writeFileSync4(typesFile(module), emitModule(loadGraph(module), bridge, symbols, exclude, { conformancesOnly: true, table: tableName(module) }).swift);
  };
  return { known, table, types, tableFile, typesFile, facadeFile, generation };
}
async function generateAppSdk(frameworks, log = console.info) {
  const { known, table, types, tableFile, typesFile, facadeFile, generation } = sdkCache();
  const files = new Map;
  const facades = new Map;
  const referenced = new Set;
  for (const module of frameworks) {
    const { modules } = await table(module, log);
    files.set(`OneSDK_${module}.swift`, tableFile(module));
    facades.set(`${module}.ts`, facadeFile(module));
    for (const m of modules)
      referenced.add(m);
  }
  for (const module of [...referenced].sort()) {
    if (frameworks.includes(module) || !known.has(module))
      continue;
    await types(module, log);
    files.set(`OneSDK_${module}.types.swift`, typesFile(module));
  }
  return { files, facades, generation };
}
async function writeAppSdkPod(root, log = console.info) {
  const podDir = join5(root, "ios", "OneSwiftPackages", SDK_POD);
  const frameworks = importedFrameworks(root);
  if (!frameworks.length) {
    rmSync2(podDir, { recursive: true, force: true });
    return [];
  }
  const manifest = JSON.parse(readFileSync2(new URL("../../ios-bindings/manifest.json", import.meta.url), "utf8"));
  if (manifest.generation !== generatorFingerprint().slice(0, 16)) {
    throw new Error("[one] installed iOS facades do not match the SDK generator; regenerate One SDK bindings before building");
  }
  const { files } = await generateAppSdk(frameworks, log);
  const sdkRoots = SDKS.map((target) => ({ name: target.sdk, root: sdkPath(target.sdk) }));
  rmSync2(podDir, { recursive: true, force: true });
  mkdirSync4(join5(podDir, "Sources"), { recursive: true });
  for (const [name, from] of files)
    copyFileSync(from, join5(podDir, "Sources", name));
  for (const sdk of sdkRoots) {
    writeCLinkageModules(join5(podDir, "CLinkage", sdk.name), sdk.root);
  }
  writeFileSync4(join5(podDir, `${SDK_POD}.podspec`), `Pod::Spec.new do |s|
  s.name = '${SDK_POD}'
  s.version = '0.0.0'
  s.summary = 'iOS SDK bindings for ${frameworks.join(", ")}'
  s.homepage = 'https://onestack.dev'
  s.license = 'MIT'
  s.author = 'one'
  s.source = { :path => '.' }
  s.platform = :ios, '${minimumVersion}.0'
  s.swift_version = '5.0'
  s.source_files = 'Sources/*.swift'
  s.preserve_paths = 'CLinkage/**/*'
  s.dependency 'One'
  # the tables import One with c++ interop, which reaches react's headers, so
  # they need One's module policy
  s.pod_target_xcconfig = {
    'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES' => 'YES',
    'OTHER_SWIFT_FLAGS' => '$(inherited) ${CXX_INTEROP.join(" ")} ${cLinkageSwiftFlags("$(PODS_TARGET_SRCROOT)/CLinkage/$(PLATFORM_NAME)/module.modulemap", "$(SDKROOT)").map((flag) => `"${flag}"`).join(" ")} -Xcc -Wno-non-modular-include-in-framework-module',
  }
end
`);
  log(`[one] iOS bindings: ${frameworks.join(", ")} (${files.size} files)`);
  return frameworks;
}
export {
  SDK_POD,
  generateAppSdk,
  importedFrameworks,
  writeAppSdkPod,
  writeSdkNativeSupport
};
