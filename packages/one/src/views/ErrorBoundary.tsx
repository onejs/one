import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs'
import React from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import type { ErrorBoundaryProps } from './Try'

/**
 * Default error boundary component for native platforms.
 * Shows a user-friendly error message with retry capability.
 *
 * This component is used when:
 * - A route doesn't export its own ErrorBoundary
 * - An error occurs during rendering
 *
 * Users can override this by exporting their own ErrorBoundary from a route.
 */
export function ErrorBoundary({ error, retry, route }: ErrorBoundaryProps) {
  const inTabBar = React.useContext(BottomTabBarHeightContext)
  const Wrapper = inTabBar ? View : SafeAreaView
  const isDev = process.env.NODE_ENV === 'development'

  console.error('[One] Error in route:', route?.routeName || 'unknown', error)

  return (
    <Wrapper style={styles.container}>
      <View style={styles.content}>
        {/* Error icon */}
        <View style={styles.iconContainer}>
          <Text style={styles.iconText}>!</Text>
        </View>

        {/* Title */}
        <Text style={styles.title}>Something went wrong</Text>

        {/* Route info */}
        {route?.routeName && (
          <Text style={styles.routeInfo}>on route: {route.routeName}</Text>
        )}

        {/* Error message */}
        <View style={styles.errorBox}>
          <Text style={styles.errorMessage}>
            {error?.message || 'An unexpected error occurred'}
          </Text>
        </View>

        {/* Stack trace (dev only) */}
        {isDev && error?.stack && (
          <ScrollView style={styles.stackContainer}>
            <Text style={styles.stackTitle}>Stack trace:</Text>
            <Text style={styles.stackText}>{error.stack}</Text>
          </ScrollView>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            onPress={() => retry()}
            style={({ pressed }) => [
              styles.button,
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.primaryButtonText}>Try Again</Text>
          </Pressable>
        </View>
      </View>
    </Wrapper>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  iconContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#ef4444',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  iconText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#e8e8e8',
    marginBottom: 8,
    textAlign: 'center',
  },
  routeInfo: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  errorBox: {
    backgroundColor: '#1a1a2e',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    width: '100%',
    maxWidth: 400,
  },
  errorMessage: {
    fontFamily: 'monospace',
    fontSize: 14,
    lineHeight: 20,
    color: '#f87171',
    textAlign: 'center',
  },
  stackContainer: {
    maxHeight: 150,
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#16162a',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  stackTitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
  },
  stackText: {
    fontFamily: 'monospace',
    fontSize: 10,
    lineHeight: 16,
    color: '#a0a0a0',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  buttonPressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
})
