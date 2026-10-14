import type { CalendarInfo, LocaleInfo } from '../specs/OneDevice.nitro';
import type { Calendar, Locale } from './types';
export declare function toLocale(info: LocaleInfo): Locale;
export declare function toCalendar(info: CalendarInfo): Calendar;
export declare const FALLBACK_LOCALE: Locale;
export declare const FALLBACK_CALENDAR: Calendar;
export declare function toLocales(infos: LocaleInfo[]): [Locale, ...Locale[]];
export declare function toCalendars(infos: CalendarInfo[]): [Calendar, ...Calendar[]];
//# sourceMappingURL=map.d.ts.map