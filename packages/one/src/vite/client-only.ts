if (process.env.VITE_ENVIRONMENT !== 'client') {
  throw new Error(`This file should only be imported on the client! Current environment: ${process.env.VITE_ENVIRONMENT}`)
}

export {}