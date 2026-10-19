// pure sdk-to-spec mappings for the ios device backend. the generated
// bindings report apple's raw values; these convert them to the OneDevice
// spec terms, matching the nitro swift they replace.
export function unicodeCalendar(identifier: string): string {
  switch (identifier) {
    case 'gregorian':
      return 'gregory'
    case 'ethiopicAmeteMihret':
      return 'ethiopic'
    case 'ethiopicAmeteAlem':
      return 'ethioaa'
    case 'islamicCivil':
      return 'islamic-civil'
    case 'islamicTabular':
      return 'islamic-tbla'
    case 'islamicUmmAlQura':
      return 'islamic-umalqura'
    case 'republicOfChina':
      return 'roc'
    default:
      return identifier
  }
}

// foundation identifies these as metric/ussystem/uksystem, not expo's
// metric/us/uk. unknown values fall back to metric, as the swift does.
export function measurementSystemName(identifier: string): 'us' | 'uk' | 'metric' {
  switch (identifier) {
    case 'ussystem':
      return 'us'
    case 'uksystem':
      return 'uk'
    default:
      return 'metric'
  }
}

// xcode stamps the simulator model into every simulated app's environment;
// devices never carry the key. this is the runtime half of the swift's
// targetEnvironment(simulator) check.
export function isSimulatorEnvironment(environment: Record<string, string>): boolean {
  return environment['SIMULATOR_MODEL_IDENTIFIER'] !== undefined
}

export function textDirectionName(direction: string): 'rtl' | 'ltr' {
  return direction === 'rightToLeft' ? 'rtl' : 'ltr'
}

// identifierForVendor bridges as a uuid string in either case; the swift
// reports uuidString, which is uppercase with hyphens.
export function normalizeVendorId(value: string | null | undefined): string | undefined {
  return value == null ? undefined : value.toUpperCase()
}
