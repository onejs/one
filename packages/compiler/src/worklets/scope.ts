/**
 * Lexical scope analysis and free variable capture for worklets.
 * Builds an authentic lexical scope tree to correctly handle variable shadowing,
 * block scoping (let/const), function hoisting, and catch parameters.
 */

interface ScopeFrame {
  parent: ScopeFrame | null
  isFunction: boolean
  bindings: Set<string> // block-scoped declarations (let, const, class, params, catch)
  varBindings: Set<string> // function-scoped declarations (var, top-level function declarations)
}

export function getClosureVariables(fnNode: any, globals: Set<string>): string[] {
  const rootScope: ScopeFrame = {
    parent: null,
    isFunction: true,
    bindings: new Set<string>(),
    varBindings: new Set<string>(),
  }

  let currentScope: ScopeFrame = rootScope
  const freeVariables = new Set<string>()

  // Function name itself if named (in recursive worklets, fn can refer to itself)
  if (fnNode.id && fnNode.id.name) {
    rootScope.bindings.add(fnNode.id.name)
  }

  function pushScope(isFunction: boolean): ScopeFrame {
    const newScope: ScopeFrame = {
      parent: currentScope,
      isFunction,
      bindings: new Set<string>(),
      varBindings: isFunction ? new Set<string>() : currentScope.varBindings,
    }
    currentScope = newScope
    return newScope
  }

  function popScope() {
    if (currentScope.parent) {
      currentScope = currentScope.parent
    }
  }

  function addBindings(pattern: any, targetSet: Set<string>) {
    if (!pattern) return
    switch (pattern.type) {
      case 'Identifier':
        targetSet.add(pattern.name)
        break
      case 'AssignmentPattern':
        addBindings(pattern.left, targetSet)
        walk(pattern.right)
        break
      case 'RestElement':
        addBindings(pattern.argument, targetSet)
        break
      case 'ArrayPattern':
        for (const el of pattern.elements) {
          if (el) addBindings(el, targetSet)
        }
        break
      case 'ObjectPattern':
        for (const prop of pattern.properties) {
          if (prop.type === 'Property') {
            if (prop.computed) walk(prop.key)
            addBindings(prop.value, targetSet)
          } else if (prop.type === 'RestElement') {
            addBindings(prop.argument, targetSet)
          }
        }
        break
    }
  }

  // Parameters belong to the root function scope
  if (fnNode.params) {
    for (const param of fnNode.params) {
      addBindings(param, rootScope.bindings)
    }
  }

  function isDeclaredInScopes(name: string, fromScope: ScopeFrame): boolean {
    let s: ScopeFrame | null = fromScope
    while (s) {
      if (s.bindings.has(name) || s.varBindings.has(name)) {
        return true
      }
      s = s.parent
    }
    return false
  }

  function resolveIdentifier(name: string) {
    if (!isDeclaredInScopes(name, currentScope) && !globals.has(name)) {
      freeVariables.add(name)
    }
  }

  function walk(node: any) {
    if (!node || typeof node !== 'object') return

    // Skip TypeScript type annotations entirely
    if (
      node.type === 'TSTypeAnnotation' ||
      node.type === 'TSTypeReference' ||
      node.type === 'TSTypeAliasDeclaration' ||
      node.type === 'TSInterfaceDeclaration' ||
      node.type === 'TSTypeParameterDeclaration' ||
      node.type === 'TSTypeParameterInstantiation' ||
      node.type === 'TSTypeQuery' ||
      node.type === 'TSQualifiedName'
    ) {
      return
    }

    // TS type wrapper expressions: only walk the runtime expression
    if (
      node.type === 'TSAsExpression' ||
      node.type === 'TSSatisfiesExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'TSNonNullExpression' ||
      node.type === 'TSInstantiationExpression'
    ) {
      walk(node.expression)
      return
    }

    switch (node.type) {
      case 'BlockStatement': {
        const isRootBody = node === fnNode.body
        if (!isRootBody) {
          pushScope(false)
        }
        for (const stmt of node.body) {
          walk(stmt)
        }
        if (!isRootBody) {
          popScope()
        }
        return
      }

      case 'VariableDeclaration': {
        const isVar = node.kind === 'var'
        const targetSet = isVar ? currentScope.varBindings : currentScope.bindings
        for (const decl of node.declarations) {
          addBindings(decl.id, targetSet)
          if (decl.init) walk(decl.init)
        }
        return
      }

      case 'FunctionDeclaration':
      case 'FunctionExpression': {
        if (node.id && node.id.name) {
          currentScope.bindings.add(node.id.name)
        }
        pushScope(true)
        if (node.params) {
          for (const param of node.params) {
            addBindings(param, currentScope.bindings)
          }
        }
        walk(node.body)
        popScope()
        return
      }

      case 'ArrowFunctionExpression': {
        pushScope(true)
        if (node.params) {
          for (const param of node.params) {
            addBindings(param, currentScope.bindings)
          }
        }
        walk(node.body)
        popScope()
        return
      }

      case 'CatchClause': {
        pushScope(false)
        if (node.param) {
          addBindings(node.param, currentScope.bindings)
        }
        walk(node.body)
        popScope()
        return
      }

      case 'ForStatement': {
        pushScope(false)
        if (node.init) walk(node.init)
        if (node.test) walk(node.test)
        if (node.update) walk(node.update)
        walk(node.body)
        popScope()
        return
      }

      case 'ForInStatement':
      case 'ForOfStatement': {
        pushScope(false)
        walk(node.left)
        walk(node.right)
        walk(node.body)
        popScope()
        return
      }

      case 'ClassDeclaration':
      case 'ClassExpression': {
        if (node.id && node.id.name) {
          currentScope.bindings.add(node.id.name)
        }
        if (node.superClass) walk(node.superClass)
        pushScope(false)
        walk(node.body)
        popScope()
        return
      }

      case 'MemberExpression': {
        walk(node.object)
        if (node.computed) {
          walk(node.property)
        }
        return
      }

      case 'Property': {
        if (node.computed) {
          walk(node.key)
        }
        walk(node.value)
        return
      }

      case 'MethodDefinition': {
        if (node.computed) {
          walk(node.key)
        }
        walk(node.value)
        return
      }

      case 'Identifier': {
        resolveIdentifier(node.name)
        return
      }

      case 'JSXElement': {
        if (node.openingElement) {
          const nameNode = node.openingElement.name
          if (nameNode.type === 'JSXIdentifier') {
            if (/^[A-Z]/.test(nameNode.name)) {
              resolveIdentifier(nameNode.name)
            }
          } else if (nameNode.type === 'JSXMemberExpression') {
            let root = nameNode.object
            while (root.type === 'JSXMemberExpression') {
              root = root.object
            }
            if (root.type === 'JSXIdentifier') {
              resolveIdentifier(root.name)
            }
          }
          if (node.openingElement.attributes) {
            for (const attr of node.openingElement.attributes) {
              walk(attr)
            }
          }
        }
        if (node.children) {
          for (const child of node.children) {
            walk(child)
          }
        }
        return
      }

      case 'JSXAttribute': {
        if (node.value) {
          walk(node.value)
        }
        return
      }

      case 'JSXExpressionContainer': {
        walk(node.expression)
        return
      }

      case 'BreakStatement':
      case 'ContinueStatement':
      case 'LabeledStatement': {
        if (node.body) walk(node.body)
        return
      }
    }

    // Default recursive traversal
    for (const key of Object.keys(node)) {
      if (key === 'start' || key === 'end' || key === 'loc' || key === 'range') continue
      const child = node[key]
      if (Array.isArray(child)) {
        for (const item of child) {
          walk(item)
        }
      } else if (child && typeof child === 'object') {
        walk(child)
      }
    }
  }

  walk(fnNode.body)

  return Array.from(freeVariables).sort()
}
