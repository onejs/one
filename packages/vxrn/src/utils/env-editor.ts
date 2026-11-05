// vendored from env-editor 1.3.0 by Sindre Sorhus (MIT); see env-editor.LICENSE.
import process from 'node:process'
import path from 'node:path'

function allEditors() {
  return [
    {
      id: 'sublime',
      name: 'Sublime Text',
      binary: 'subl',
      isTerminalEditor: false,
      paths: [
        '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl',
        '/Applications/Sublime Text 2.app/Contents/SharedSupport/bin/subl',
      ],
      keywords: [],
    },
    {
      id: 'atom',
      name: 'Atom',
      binary: 'atom',
      isTerminalEditor: false,
      paths: ['/Applications/Atom.app/Contents/Resources/app/atom.sh'],
      keywords: [],
    },
    {
      id: 'vscode-insiders',
      name: 'Visual Studio Code - Insiders',
      binary: 'code-insiders',
      isTerminalEditor: false,
      paths: [
        '/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders',
      ],
      keywords: ['vs code insiders', 'code insiders', 'insiders'],
    },
    {
      id: 'vscode',
      name: 'Visual Studio Code',
      binary: 'code',
      isTerminalEditor: false,
      paths: ['/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code'],
      keywords: ['vs code'],
    },
    {
      id: 'vscodium',
      name: 'VSCodium',
      binary: 'codium',
      isTerminalEditor: false,
      paths: ['/Applications/VSCodium.app/Contents/Resources/app/bin/codium'],
      keywords: [],
    },
    {
      id: 'webstorm',
      name: 'WebStorm',
      binary: 'webstorm',
      isTerminalEditor: false,
      paths: [],
      keywords: ['wstorm'],
    },
    {
      id: 'phpstorm',
      name: 'PhpStorm',
      binary: 'pstorm',
      isTerminalEditor: false,
      paths: [],
      keywords: ['php'],
    },
    {
      id: 'textmate',
      name: 'TextMate',
      binary: 'mate',
      isTerminalEditor: false,
      paths: [],
      keywords: [],
    },
    {
      id: 'vim',
      name: 'Vim',
      binary: 'vim',
      isTerminalEditor: true,
      paths: [],
      keywords: ['vi'],
    },
    {
      id: 'neovim',
      name: 'NeoVim',
      binary: 'nvim',
      isTerminalEditor: true,
      paths: [],
      keywords: ['vim'],
    },
    {
      id: 'intellij',
      name: 'IntelliJ IDEA',
      binary: 'idea',
      isTerminalEditor: false,
      paths: [],
      keywords: ['idea', 'java', 'jetbrains', 'ide'],
    },
    {
      id: 'nano',
      name: 'GNU nano',
      binary: 'nano',
      isTerminalEditor: true,
      paths: [],
      keywords: [],
    },
    {
      id: 'emacs',
      name: 'GNU Emacs',
      binary: 'emacs',
      isTerminalEditor: true,
      paths: [],
      keywords: [],
    },
    {
      id: 'emacsforosx',
      name: 'GNU Emacs for Mac OS X',
      binary: 'Emacs',
      isTerminalEditor: false,
      paths: ['/Applications/Emacs.app/Contents/MacOS/Emacs'],
      keywords: [],
    },
    {
      id: 'android-studio',
      name: 'Android Studio',
      binary: 'studio',
      isTerminalEditor: false,
      paths: [
        '/Applications/Android Studio.app/Contents/MacOS/studio',
        '/usr/local/Android/android-studio/bin/studio.sh',
        'C:\\Program Files (x86)\\Android\\android-studio\\bin\\studio.exe',
        'C:\\Program Files\\Android\\android-studio\\bin\\studio64.exe',
      ],
      keywords: ['studio'],
    },
    {
      id: 'xcode',
      name: 'Xcode',
      binary: 'xed',
      isTerminalEditor: false,
      paths: [
        '/Applications/Xcode.app/Contents/MacOS/Xcode',
        '/Applications/Xcode-beta.app/Contents/MacOS/Xcode',
      ],
      keywords: ['xed'],
    },
  ]
}

function getEditor(editor: string) {
  editor = editor.trim()

  const needle = editor.toLowerCase()
  const id = needle.split(/[/\\]/).pop()!.replace(/\s/g, '-')
  const binary = id.split('-')[0]

  for (const editor of allEditors()) {
    // Check for exact id, name, or full binary match first
    if (
      needle === editor.id ||
      needle === editor.name.toLowerCase() ||
      id === editor.binary
    ) {
      return editor
    }

    for (const editorPath of editor.paths) {
      if (path.normalize(needle) === path.normalize(editorPath.toLowerCase())) {
        return editor
      }
    }

    for (const keyword of editor.keywords) {
      if (needle === keyword) {
        return editor
      }
    }
  }

  // Fallback to checking the shortened binary if no exact match found
  for (const editor of allEditors()) {
    if (binary === editor.binary) {
      return editor
    }
  }

  return {
    id,
    name: editor,
    binary,
    isTerminalEditor: false,
    paths: [],
    keywords: [],
  }
}

export function defaultEditor() {
  const editor = process.env.EDITOR || process.env.VISUAL

  if (!editor) {
    throw new Error(
      // eslint-disable-next-line indent
      `
Your $EDITOR environment variable is not set.
Set it to the command/path of your editor in ~/.zshenv or ~/.bashrc:

  export EDITOR=atom
`
    )
  }

  return getEditor(editor)
}
