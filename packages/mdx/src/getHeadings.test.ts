import { expect, test } from 'vitest'
import { getHeadings } from './getHeadings'

test('ignores # lines inside fenced code', () => {
  const source = [
    '# Install',
    '```bash',
    '# install deps',
    'bun install',
    '```',
    '~~~sh',
    '# run it',
    '~~~',
    '## Usage',
    '#not-a-heading',
  ].join('\n')

  expect(getHeadings(source)).toEqual([
    { title: 'Install', priority: 1, id: 'install' },
    { title: 'Usage', priority: 2, id: 'usage' },
  ])
})
