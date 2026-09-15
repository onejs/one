import React, { useState } from 'react';
import { View, Text, Button, TextInput } from '../runtime';

export function App() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState('Hello from React on Main Thread!');
  const [pin, setPin] = useState('');

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#090d16',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 40,
        flexDirection: 'column',
        justifyContent: 'flex-start',
      }}
    >
      {/* App Header */}
      <View style={{ marginBottom: 20 }}>
        <Text
          style={{
            fontSize: 26,
            fontWeight: 'bold',
            color: '#38bdf8',
            marginBottom: 4,
          }}
        >
          One Native Prototype
        </Text>
        <Text
          style={{
            fontSize: 14,
            color: '#94a3b8',
          }}
        >
          React 19 running directly on iOS CFRunLoopMain
        </Text>
      </View>

      {/* Card 1: Interactive Button & Counter */}
      <View
        style={{
          backgroundColor: '#131c2e',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#1e293b',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#38bdf8',
            marginBottom: 8,
          }}
        >
          1. INTERACTIVE BUTTON & SYNC STATE
        </Text>

        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 16, color: '#f1f5f9' }}>Current Count:</Text>
          <View
            style={{
              backgroundColor: '#1e293b',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 4,
            }}
          >
            <Text
              style={{
                fontSize: 20,
                fontWeight: 'bold',
                color: '#22c55e',
              }}
            >
              {String(count)}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button
            title="Increment (+1)"
            onPress={() => setCount((c) => c + 1)}
            style={{
              flex: 1,
              height: 44,
              backgroundColor: '#2563eb',
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            titleStyle={{ color: '#ffffff', fontWeight: 'bold', fontSize: 15 }}
          />

          <Button
            title="Reset"
            onPress={() => setCount(0)}
            style={{
              width: 80,
              height: 44,
              backgroundColor: '#334155',
              borderRadius: 10,
              justifyContent: 'center',
              alignItems: 'center',
            }}
            titleStyle={{ color: '#cbd5e1', fontWeight: '600', fontSize: 14 }}
          />
        </View>
      </View>

      {/* Card 2: Controlled TextInput */}
      <View
        style={{
          backgroundColor: '#131c2e',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#1e293b',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#a855f7',
            marginBottom: 8,
          }}
        >
          2. CONTROLLED TEXTINPUT (ZERO CURSOR LAG)
        </Text>

        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Type message here..."
          placeholderTextColor="#64748b"
          style={{
            height: 46,
            backgroundColor: '#0f172a',
            borderRadius: 10,
            paddingHorizontal: 12,
            color: '#ffffff',
            fontSize: 15,
            borderWidth: 1,
            borderColor: '#334155',
            marginBottom: 10,
          }}
        />

        <View
          style={{
            backgroundColor: '#0b1120',
            borderRadius: 8,
            padding: 10,
          }}
        >
          <Text style={{ fontSize: 12, color: '#64748b' }}>Live State Value:</Text>
          <Text
            style={{
              fontSize: 14,
              color: '#38bdf8',
              marginTop: 2,
            }}
          >
            {text || '(empty)'}
          </Text>
        </View>
      </View>

      {/* Card 3: Synchronous UIKit Delegate Conformance */}
      <View
        style={{
          backgroundColor: '#131c2e',
          borderRadius: 16,
          padding: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: '#1e293b',
        }}
      >
        <Text
          style={{
            fontSize: 12,
            fontWeight: '700',
            color: '#f59e0b',
            marginBottom: 4,
          }}
        >
          3. SYNC UIKIT DELEGATE VALIDATION
        </Text>
        <Text
          style={{
            fontSize: 12,
            color: '#94a3b8',
            marginBottom: 10,
          }}
        >
          Only digits allowed. UITextFieldDelegate asks JS synchronously before inserting:
        </Text>

        <TextInput
          value={pin}
          onChangeText={setPin}
          placeholder="Enter numeric PIN (rejects letters)"
          placeholderTextColor="#64748b"
          filterRegex="^[0-9]*$"
          keyboardType="number-pad"
          style={{
            height: 46,
            backgroundColor: '#0f172a',
            borderRadius: 10,
            paddingHorizontal: 12,
            color: '#f59e0b',
            fontSize: 16,
            fontWeight: 'bold',
            borderWidth: 1,
            borderColor: '#334155',
            marginBottom: 8,
          }}
        />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 12, color: '#64748b' }}>PIN State: {pin || '(none)'}</Text>
          <Text style={{ fontSize: 12, color: '#10b981' }}>Synchronous: YES</Text>
        </View>
      </View>

      {/* Card 4: Architecture Status */}
      <View
        style={{
          backgroundColor: '#0f172a',
          borderRadius: 12,
          padding: 12,
          borderWidth: 1,
          borderColor: '#1e293b',
          flexDirection: 'row',
          justifyContent: 'space-around',
        }}
      >
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#64748b' }}>THREAD</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#38bdf8' }}>Main Loop</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#64748b' }}>REFRESH</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#a855f7' }}>DisplayLink</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 11, color: '#64748b' }}>BRIDGE</Text>
          <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#22c55e' }}>Direct JSI</Text>
        </View>
      </View>
    </View>
  );
}
