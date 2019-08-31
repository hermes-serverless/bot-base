import { AuthDatasource } from '@hermes-serverless/cli-resources'
import { Waiter } from '@hermes-serverless/custom-promises'
import winston from 'winston'

export const getToken = async (username: string, password: string, logger: winston.Logger) => {
  try {
    const { auth, token } = await AuthDatasource.login({ username, password })
    if (!auth) throw new Error('Login Error')
    return token
  } catch (err) {
    logger.error((err.response && err.response.data) || err)
  }

  try {
    const { auth, token } = await AuthDatasource.register({ username, password })
    if (!auth) throw new Error('Register Error')
    logger.info('Registered')
    return token
  } catch (err) {
    logger.error((err.response && err.response.data) || err)
    throw err
  }
}

export const timeMeasurer = async (fn: any, logger: winston.Logger) => {
  const MS_PER_SEC = 1e3
  const NS_PER_MS = 1e6

  const start = process.hrtime()
  try {
    await fn()
  } catch (err) {
    logger.error(err)
    throw err
  }
  const diff = process.hrtime(start)
  const ms = diff[0] * MS_PER_SEC + Math.round(diff[1] / NS_PER_MS)
  logger.info(`Time (ms): ${ms}`)
}

export const sleep = (ms: number) => {
  const wait = new Waiter()
  setTimeout(wait.resolve, ms)
  return wait.finish()
}
