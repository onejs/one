export const jsCases: Record<string, () => number> = {
  json() {
    const source = JSON.stringify(Array.from({ length: 1000 }, (_, id) => ({ id, title: `Row ${id}`, active: id % 3 === 0 })))
    let sum = 0
    for (let i = 0; i < 100; i++) sum += JSON.stringify(JSON.parse(source)).length
    return sum
  },
  regex() {
    const text = 'alpha@example.com beta@example.org invalid-address '.repeat(1000)
    let sum = 0
    for (let i = 0; i < 100; i++) sum += [...text.matchAll(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/g)].length
    return sum
  },
  sort() {
    let sum = 0
    for (let i = 0; i < 100; i++) {
      const values = Array.from({ length: 5000 }, (_, j) => (j * 7919 + i) % 5003)
      values.sort((a, b) => a - b)
      sum += values[2500]
    }
    return sum
  },
  'object-churn'() {
    let sum = 0
    for (let i = 0; i < 200; i++) {
      const rows = Array.from({ length: 5000 }, (_, id) => ({ id, label: `item-${id}`, value: id + i }))
      sum += rows.filter(row => row.id % 2 === 0).reduce((n, row) => n + row.value, 0)
    }
    return sum
  },
  intl() {
    const date = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', dateStyle: 'long' })
    const number = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })
    let sum = 0
    for (let i = 0; i < 10000; i++) sum += date.format(1700000000000 + i * 1000).length + number.format(i / 7).length
    return sum
  },
  strings() {
    let sum = 0
    for (let i = 0; i < 20000; i++) sum += `Row ${i}: Hello world, café 🚀`.repeat(10).toUpperCase().split(' ').join('-').length
    return sum
  },
}
