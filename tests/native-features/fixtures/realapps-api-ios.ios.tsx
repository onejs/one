import { useState } from 'react'
import { One, useRouter, type Href } from 'one'
import { ScrollView, Text, View } from 'react-native'
import { Action, Boundary, Results, assert, useResults, type Report } from './realapps-api-report'

import { iosAPIs } from './realapps-api-coverage'

function NativeTabs({ report }: { report: Report }) {
  const [selection, setSelection] = useState('first')
  const record = (api: string) =>
    report(api, 'passed', { action: 'native press', selection })
  return (
    <One.iOS.Tabs
      testID="realapps-api-native-tabs"
      selection={selection}
      onSelectionChange={(next) => {
        setSelection(next)
        report(
          'One.iOS.Tabs',
          'passed',
          { selection: next },
          'native selection callback; runner returns to first'
        )
        report(
          'One.iOS.Tab',
          'passed',
          { selection: next },
          'selected tab shows corresponding native-hosted content'
        )
      }}
      style={{ height: 320 }}
    >
      <One.iOS.Tab id="first" title="First" systemImage="1.circle">
        <View>
          <Text testID="realapps-api-tab-first">First native tab</Text>
        </View>
      </One.iOS.Tab>
      <One.iOS.Tab id="second" title="Second" systemImage="2.circle">
        <View>
          <Text testID="realapps-api-tab-second">Second native tab</Text>
        </View>
      </One.iOS.Tab>
      <One.iOS.Toolbar>
        <One.iOS.ToolbarItem placement="bottomBar">
          <One.iOS.Button
            testID="realapps-api-swift-toolbar-hit"
            label="Item hit"
            onPress={() => {
              record('One.iOS.Toolbar')
              record('One.iOS.ToolbarItem')
              record('One.iOS.Button')
            }}
          />
        </One.iOS.ToolbarItem>
        <One.iOS.ToolbarItemGroup placement="bottomBar">
          <One.iOS.Button
            testID="realapps-api-swift-group-hit"
            label="Group hit"
            onPress={() => {
              record('One.iOS.Toolbar')
              record('One.iOS.ToolbarItemGroup')
              record('One.iOS.Button')
            }}
          />
        </One.iOS.ToolbarItemGroup>
      </One.iOS.Toolbar>
    </One.iOS.Tabs>
  )
}

function SplitDetail() {
  return (
    <View style={{ flex: 1 }}>
      <Text testID="realapps-api-split-detail">Split detail</Text>
    </View>
  )
}
export default function IOSPrimitives() {
  const { results, report, run } = useResults(iosAPIs)
  const router = useRouter()
  const [scene, setScene] = useState('leaves')
  const [glass, setGlass] = useState(true)
  return (
    <View style={{ flex: 1 }} testID="realapps-api-ios">
      <Results results={results} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {['leaves', 'tabs', 'split', 'arrangement', 'toolbar'].map((name) => (
          <Action key={name} id={`ios-${name}`} onPress={() => setScene(name)}>
            {name}
          </Action>
        ))}
      </View>
      {scene === 'leaves' ? (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 12 }}>
          <One.iOS.Host
            style={{ height: 50 }}
            onLayout={({ nativeEvent }) =>
              report(
                'One.iOS.Text',
                'observed',
                nativeEvent.layout,
                'native text host mounted; runner captures rendered text'
              )
            }
          >
            <One.iOS.Text text="Matrix SwiftUI text" testID="realapps-api-swift-text" />
          </One.iOS.Host>
          <View
            testID="realapps-api-color"
            style={{ height: 40, backgroundColor: One.iOS.Color.systemBlue }}
            onLayout={({ nativeEvent }) =>
              report(
                'One.iOS.Color',
                'observed',
                { color: One.iOS.Color.systemBlue, layout: nativeEvent.layout },
                'native semantic color resolved and laid out; screenshot retained'
              )
            }
          />
          <Boundary api="One.iOS.Button" report={report}>
            <One.iOS.Host style={{ height: 70 }}>
              <One.iOS.Button
                label="Native button"
                testID="realapps-api-native-button"
                onPress={() => report('One.iOS.Button', 'passed', { pressed: true })}
              />
            </One.iOS.Host>
          </Boundary>
          <Boundary api="One.iOS.Image" report={report}>
            <One.iOS.Host
              style={{ height: 60 }}
              onLayout={({ nativeEvent }) =>
                report(
                  'One.iOS.Image',
                  'observed',
                  {
                    systemName: 'checkmark.circle.fill',
                    layout: nativeEvent.layout,
                  },
                  'native symbol host laid out; screenshot retained'
                )
              }
            >
              <One.iOS.Image
                systemName="checkmark.circle.fill"
                testID="realapps-api-symbol"
              />
            </One.iOS.Host>
          </Boundary>
          <Boundary api="One.iOS.Glass" report={report}>
            <View style={{ height: 90, backgroundColor: '#48a' }}>
              <Text>GLASS ||||||||||||</Text>
              {glass ? (
                <One.iOS.Glass
                  testID="realapps-api-glass"
                  children={null}
                  style={{ height: 50 }}
                />
              ) : (
                <Text>Glass removed</Text>
              )}
            </View>
          </Boundary>
          <Action
            id="glass-toggle"
            onPress={() => {
              setGlass(!glass)
              report(
                'One.iOS.Glass',
                'observed',
                { mounted: !glass },
                'native glass mounted then removed; screenshots retained'
              )
            }}
          >
            Toggle native glass
          </Action>
          <Boundary api="One.iOS.SignInWithAppleButton" report={report}>
            <One.iOS.Host style={{ height: 60 }}>
              <One.iOS.SignInWithAppleButton
                testID="realapps-api-apple-signin"
                label="signIn"
                onCompletion={(completion) =>
                  void run(
                    'One.iOS.SignInWithAppleButton',
                    () => {
                      assert(
                        completion.type === 'failed' &&
                          completion.message.includes(
                            'com.apple.AuthenticationServices.AuthorizationError error 1000'
                          ),
                        'account-free simulator must return the native provider error after Close',
                        completion
                      )
                      return completion
                    },
                    'observed',
                    'account-free simulator dialog asserted before Close; native provider error forwarded, credentials not tested'
                  )
                }
              />
            </One.iOS.Host>
          </Boundary>
          <Boundary api="One.iOS.ZoomTransitionSource" report={report}>
            <One.iOS.ZoomTransitionSource identifier="realapps-api-zoom">
              <Action id="zoom-open" onPress={() => router.push('/realapps-api-zoom' as Href)}>
                Open zoom destination
              </Action>
            </One.iOS.ZoomTransitionSource>
          </Boundary>
          <Text>
            Image, glass, color and zoom need parent pixel/transition evidence. Rendering
            never grants a pass.
          </Text>
        </ScrollView>
      ) : null}
      {scene === 'tabs' ? (
        <Boundary api="One.iOS.Tabs" report={report}>
          <NativeTabs report={report} />
        </Boundary>
      ) : null}
      {scene === 'split' ? (
        <Boundary api="One.iOS.SplitView" report={report}>
          <One.iOS.SplitView slot={SplitDetail}>
            <One.iOS.SplitView.Column>
              <View>
                <Action
                  id="split-hit"
                  onPress={() =>
                    report(
                      'One.iOS.SplitView',
                      'observed',
                      { pressed: true },
                      'native column button callback exercised; compact phone screenshot retained'
                    )
                  }
                >
                  Split column hit
                </Action>
              </View>
            </One.iOS.SplitView.Column>
          </One.iOS.SplitView>
        </Boundary>
      ) : null}
      {scene === 'arrangement' ? (
        <Boundary api="One.iOS.ArrangementView" report={report}>
          <One.iOS.ArrangementView
            arrangementViewStyle="split"
            style={{ flex: 1 }}
            primary={
              <View
                style={{ flex: 1, backgroundColor: '#acf' }}
                onLayout={({ nativeEvent }) =>
                  report(
                    'One.iOS.ArrangementView.primary',
                    'observed',
                    nativeEvent.layout
                  )
                }
              >
                <Action
                  id="arrangement-hit"
                  onPress={() => void run('One.iOS.ArrangementView', () => {
                    const primary = results['One.iOS.ArrangementView.primary']?.value as { width: number; height: number } | undefined
                    const secondary = results['One.iOS.ArrangementView.secondary']?.value as { width: number; height: number } | undefined
                    assert(primary && primary.width > 0 && primary.height > 0, 'primary pane must have positive bounds', primary)
                    assert(secondary && secondary.width > 0 && secondary.height > 0, 'secondary pane must have positive bounds', secondary)
                    return { pressed: true, primary, secondary }
                  }, 'passed', 'both native panes laid out with positive bounds; primary callback exercised')}
                >
                  Arrangement primary hit
                </Action>
              </View>
            }
            secondary={
              <View
                style={{ flex: 1, backgroundColor: '#fca' }}
                onLayout={({ nativeEvent }) =>
                  report(
                    'One.iOS.ArrangementView.secondary',
                    'observed',
                    nativeEvent.layout
                  )
                }
              >
                <Text testID="realapps-api-arrangement-secondary">Secondary pane</Text>
              </View>
            }
          />
        </Boundary>
      ) : null}
      {scene === 'toolbar' ? (
        <Boundary api="One.iOS.ToolbarHost" report={report}>
          <View>
            <One.iOS.ToolbarHost>
              <One.iOS.BarButtonItem
                identifier="realapps-api-bar-hit"
                title="Bar hit"
                accessibilityLabel="realapps API bar hit"
                onSelected={() => {
                  report('One.iOS.BarButtonItem', 'passed', { selected: 'bar' })
                  report(
                    'One.iOS.ToolbarHost',
                    'passed',
                    { selected: 'bar' },
                    'UIKit BarButtonItem invoked native host callback'
                  )
                }}
              />
              <One.iOS.MenuAction
                identifier="realapps-api-menu"
                title="Menu"
                label="Menu"
              >
                <One.iOS.MenuAction
                  identifier="realapps-api-menu-hit"
                  title="Menu hit"
                  onSelected={() => {
                    report('One.iOS.MenuAction', 'passed', {
                      selected: 'menu',
                    })
                    report('One.iOS.ToolbarHost', 'passed', {
                      selected: 'menu',
                    })
                  }}
                />
              </One.iOS.MenuAction>
            </One.iOS.ToolbarHost>
            <Text>UIKit toolbar actions retain their native callbacks.</Text>
          </View>
        </Boundary>
      ) : null}
    </View>
  )
}

export function ZoomDestination() {
  const router = useRouter()
  const { results, report } = useResults([
    'One.iOS.ZoomTransitionEnabler',
    'One.iOS.ZoomTransitionSource',
  ])
  return (
    <View
      testID="realapps-api-zoom-destination"
      style={{ flex: 1, backgroundColor: '#acf' }}
      onLayout={({ nativeEvent }) => {
        report(
          'One.iOS.ZoomTransitionEnabler',
          'observed',
          nativeEvent.layout,
          'destination mounted; parent captures native transition, then returns'
        )
        report(
          'One.iOS.ZoomTransitionSource',
          'observed',
          { navigated: true },
          'parent captures source/destination transition'
        )
      }}
    >
      <One.iOS.ZoomTransitionEnabler zoomTransitionSourceIdentifier="realapps-api-zoom" />
      <Results results={results} />
      <Action id="zoom-back" onPress={() => router.back()}>
        Return from zoom
      </Action>
    </View>
  )
}
