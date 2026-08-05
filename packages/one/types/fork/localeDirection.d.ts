import type { LocaleDirection } from '@react-navigation/native';
/**
 * Web is always ltr here: this only feeds react-navigation's LocaleDirContext,
 * which drives native gestures and animations, and reading the document on the
 * client would render differently than SSR. Style your rtl layout with css.
 * The .native sibling reads the real value from I18nManager.
 */
export declare function getLocaleDirection(): LocaleDirection;
//# sourceMappingURL=localeDirection.d.ts.map