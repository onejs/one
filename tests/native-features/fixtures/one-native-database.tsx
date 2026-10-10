import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One } from 'one'

const name = 'one-native-conformance.sqlite'

export default function OneNativeDatabase() {
  const [persisted, setPersisted] = useState('pending')
  const [kv, setKv] = useState('pending')
  const [negative, setNegative] = useState('idle')
  const [results, setResults] = useState<string[]>([])
  const [status, setStatus] = useState('idle')

  const run = async () => {
    setStatus('running')
    setResults([])
    try {
      const db = One.Database.open({ name })
      try {
        db.executeSync('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)')
        db.executeSync('DELETE FROM notes')
        db.executeSync('INSERT INTO notes (id, body) VALUES (?, ?)', [1, "quote's ?"])
        const rows = db.executeSync('SELECT body FROM notes WHERE id = ?', [1]).rows
        setResults((current) => [...current, `Sync: ${rows[0]?.body ?? 'missing'}`])
      } finally {
        db.close()
      }
      const asyncDb = await One.Database.openAsync({ name })
      try {
        const rows = (await asyncDb.execute('SELECT body FROM notes WHERE id = ?', [1])).rows
        setResults((current) => [...current, `Async: ${rows[0]?.body ?? 'missing'}`])
        await asyncDb.execute('DELETE FROM notes WHERE id = ?', [1])
        const deleted = (await asyncDb.execute('SELECT body FROM notes WHERE id = ?', [1])).rows
        setResults((current) => [...current, `Deleted: ${deleted.length}`])
        await asyncDb.execute('INSERT INTO notes (id, body) VALUES (?, ?)', [2, 'kept'])
      } finally {
        asyncDb.close()
      }
      setStatus('done')
    } catch (error) {
      setStatus(`failed ${String(error)}`)
    }
  }

  const readPersisted = () => {
    try {
      const db = One.Database.open({ name })
      try {
        const table = db.executeSync(
          "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'notes'"
        ).rows
        const value = table.length
          ? db.executeSync('SELECT body FROM notes WHERE id = ?', [2]).rows[0]?.body
          : undefined
        setPersisted(String(value ?? 'missing'))
      } finally {
        db.close()
      }
    } catch (error) {
      setPersisted(`failed ${String(error)}`)
    }
  }

  const clear = () => {
    const db = One.Database.open({ name })
    try {
      db.executeSync('CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY, body TEXT NOT NULL)')
      db.executeSync('DELETE FROM notes')
      setPersisted('missing')
      setStatus('cleared')
    } finally {
      db.close()
    }
  }

  const runKeyValue = () => {
    const store = One.Database.openKeyValue({ name: 'one-native-kv' })
    try {
      store.clear()
      store.setItem('reloadTarget', 'update-1')
      store.setItem('reloadTarget', 'update-2')
      const first = store.getItem('reloadTarget')
      const keys = store.getAllKeys().join(',')
      store.close()
      const reopened = One.Database.openKeyValue({ name: 'one-native-kv' })
      try {
        const second = reopened.getItem('reloadTarget')
        reopened.removeItem('reloadTarget')
        const removed = reopened.getItem('reloadTarget')
        setKv(`${first}|${keys}|${second}|${removed}`)
      } finally {
        reopened.close()
      }
    } catch (error) {
      setKv(`failed ${String(error)}`)
    }
  }

  const rejectMissingTable = () => {
    setNegative('running')
    try {
      const db = One.Database.open({ name })
      try {
        db.executeSync('SELECT * FROM one_native_missing_table')
      } finally {
        db.close()
      }
      setNegative('unexpectedly resolved')
    } catch (error) {
      setNegative(`rejected: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return (
    <View style={styles.screen} testID="one-native-database-screen">
      <Text>{`Status: ${status}`}</Text>
      <Text>{`Persisted: ${persisted}`}</Text>
      <Text testID="one-native-kv-result">{`KV: ${kv}`}</Text>
      <Text>{`Negative: ${negative}`}</Text>
      {results.map((result) => <Text key={result}>{result}</Text>)}
      <Pressable testID="one-native-database-run" style={styles.button} onPress={run}>
        <Text>Run database checks</Text>
      </Pressable>
      <Pressable testID="one-native-database-read" style={styles.button} onPress={readPersisted}>
        <Text>Read persisted row</Text>
      </Pressable>
      <Pressable testID="one-native-database-clear" style={styles.button} onPress={clear}>
        <Text>Clear database</Text>
      </Pressable>
      <Pressable testID="one-native-kv-run" style={styles.button} onPress={runKeyValue}>
        <Text>Run key-value checks</Text>
      </Pressable>
      <Pressable testID="one-native-database-reject-missing-table" style={styles.button} onPress={rejectMissingTable}>
        <Text>Reject missing table query</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8, alignSelf: 'flex-start' },
})
