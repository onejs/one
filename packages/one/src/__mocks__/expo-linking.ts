// Mock for expo-linking used in vitest tests

export const createURL = (path: string) => `exp://localhost/${path}`
export const parse = (url: string) => ({ path: url })
export const addEventListener = () => ({ remove: () => {} })
export const getInitialURL = async () => null
