export const keyboardTypes = [
  'default',
  'asciiCapable',
  'numbersAndPunctuation',
  'url',
  'numberPad',
  'phonePad',
  'namePhonePad',
  'emailAddress',
  'decimalPad',
  'twitter',
  'webSearch',
  'asciiCapableNumberPad',
] as const
export type KeyboardType = (typeof keyboardTypes)[number]

export const textContentTypes = [
  'none',
  'URL',
  'addressCity',
  'addressCityAndState',
  'addressState',
  'countryName',
  'creditCardNumber',
  'creditCardExpiration',
  'creditCardExpirationMonth',
  'creditCardExpirationYear',
  'creditCardSecurityCode',
  'creditCardType',
  'creditCardName',
  'creditCardGivenName',
  'creditCardMiddleName',
  'creditCardFamilyName',
  'emailAddress',
  'familyName',
  'fullStreetAddress',
  'givenName',
  'jobTitle',
  'location',
  'middleName',
  'name',
  'namePrefix',
  'nameSuffix',
  'nickname',
  'organizationName',
  'postalCode',
  'streetAddressLine1',
  'streetAddressLine2',
  'sublocality',
  'telephoneNumber',
  'username',
  'password',
  'newPassword',
  'oneTimeCode',
  'birthdate',
  'birthdateDay',
  'birthdateMonth',
  'birthdateYear',
  'cellularEID',
  'cellularIMEI',
  'dateTime',
  'flightNumber',
  'shipmentTrackingNumber',
] as const
export type TextContentType = (typeof textContentTypes)[number]

export function assertTextInputOptions(owner: string, keyboardType: string, textContentType: string) {
  if (keyboardType && !keyboardTypes.includes(keyboardType as KeyboardType))
    throw new Error(`${owner} keyboardType must be a supported UIKit keyboard type`)
  if (textContentType && !textContentTypes.includes(textContentType as TextContentType))
    throw new Error(`${owner} textContentType must be a supported UIKit text content type`)
}
