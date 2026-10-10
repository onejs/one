import { defineBackgroundComputation } from 'one/background'
import { calculate } from './calculate'

export const calculation = defineBackgroundComputation(calculate)
