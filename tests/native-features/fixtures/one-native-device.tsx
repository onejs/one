import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { One, useCalendars, useLocales } from 'one'

type DeviceInfo = Awaited<ReturnType<typeof One.Device.getInfo>>
type LocalizationInfo = Awaited<ReturnType<typeof One.Device.getLocalizationInfo>>

export default function OneNativeDevice() {
  const [info, setInfo] = useState<DeviceInfo | null>(null)
  const [localization, setLocalization] = useState<LocalizationInfo | null>(null)
  const [error, setError] = useState('none')
  const locales = useLocales()
  const calendars = useCalendars()

  const read = async () => {
    try {
      setInfo(await One.Device.getInfo())
      setLocalization(await One.Device.getLocalizationInfo())
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
    }
  }

  return (
    <View style={styles.screen}>
      <Text>{`Model: ${info?.model ?? 'pending'}`}</Text>
      <Text>{`System: ${info ? `${info.systemName} ${info.systemVersion}` : 'pending'}`}</Text>
      <Text>{`Idiom: ${info?.interfaceIdiom ?? 'pending'}`}</Text>
      <Text>{`Simulator: ${info ? String(info.isSimulator) : 'pending'}`}</Text>
      <Text>{`Vendor: ${info?.vendorIdentifier ?? 'none'}`}</Text>
      <Text>{`Locale: ${localization?.localeIdentifier ?? 'pending'}`}</Text>
      <Text>{`Language: ${localization?.preferredLanguages[0] ?? 'pending'}`}</Text>
      <Text>{`LanguageCount: ${localization?.preferredLanguages.length ?? 'pending'}`}</Text>
      <Text>{`Calendar: ${localization?.calendarIdentifier ?? 'pending'}`}</Text>
      <Text>{`TimeZone: ${localization?.timeZoneIdentifier ?? 'pending'}`}</Text>
      <Text>{`OffsetSeconds: ${localization?.timeZoneOffsetSeconds ?? 'pending'}`}</Text>
      <Text>{`Currency: ${localization?.currencyCode ?? 'none'}`}</Text>
      <Text>{`SyncLocale: ${One.Localization.getLocales()[0].languageTag}`}</Text>
      <Text>{`SyncCalendar: ${One.Localization.getCalendars()[0].calendar ?? 'none'}`}</Text>
      <Text>{`Locales: ${locales.map((locale) => locale.languageTag).join(',')}`}</Text>
      <Text>{`LocaleCurrency: ${locales[0].currencyCode ?? 'none'}`}</Text>
      <Text>{`Direction: ${locales[0].textDirection}`}</Text>
      <Text>{`Calendars: ${calendars.map((calendar) => calendar.calendar ?? 'none').join(',')}`}</Text>
      <Text>{`CalendarZone: ${calendars[0].timeZone ?? 'none'}`}</Text>
      <Text>{`Error: ${error}`}</Text>
      <Pressable testID="one-native-device-read" style={styles.button} onPress={read}>
        <Text>Read device</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16, gap: 8 },
  button: { padding: 12, backgroundColor: '#eee', borderRadius: 8 },
})
