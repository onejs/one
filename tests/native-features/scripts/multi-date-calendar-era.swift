// Run with: swift tests/native-features/scripts/multi-date-calendar-era.swift
// This probes the Foundation calendar conversion used at the MultiDatePicker
// bridge boundary. The SwiftUI control is exercised separately on iOS 27.
import Foundation

var gregorian = Calendar(identifier: .gregorian)
gregorian.timeZone = TimeZone(secondsFromGMT: 0)!
let dates = [(1911, 12, 31), (1912, 1, 1), (1966, 9, 10), (2026, 9, 10)]
let calendars: [(String, Calendar.Identifier)] = [
  ("gregorian", .gregorian),
  ("buddhist", .buddhist),
  ("chinese", .chinese),
  ("dangi", .dangi),
  ("japanese", .japanese),
  ("roc", .republicOfChina),
  ("coptic", .coptic),
  ("ethiopic", .ethiopicAmeteMihret),
]

for (name, identifier) in calendars {
  var native = Calendar(identifier: identifier)
  native.timeZone = gregorian.timeZone
  for (year, month, day) in dates {
    guard let date = gregorian.date(from: DateComponents(year: year, month: month, day: day, hour: 12)) else {
      fatalError("invalid test date")
    }
    let mapped = native.dateComponents([.era, .year, .month, .day, .isLeapMonth], from: date)
    var components = DateComponents(
      era: mapped.era, year: mapped.year, month: mapped.month, day: mapped.day, hour: 12
    )
    components.isLeapMonth = mapped.isLeapMonth
    guard let converted = native.date(from: components) else {
      fatalError("\(name) could not resolve \(year)-\(month)-\(day)")
    }
    let checked = gregorian.dateComponents([.year, .month, .day], from: converted)
    guard (checked.year, checked.month, checked.day) == (year, month, day) else {
      fatalError("\(name) moved \(year)-\(month)-\(day) to \(checked)")
    }
    if name == "roc" && year == 1911 { precondition(mapped.era == 0) }
    if name == "roc" && year == 1912 { precondition(mapped.era == 1) }
    print("PASS \(name) \(year)-\(month)-\(day) era=\(mapped.era ?? -1)")
  }
}
