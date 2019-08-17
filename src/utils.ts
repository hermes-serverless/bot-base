import { AuthDatasource } from '@hermes-serverless/cli-resources'

export const getToken = async (username: string, password: string) => {
  try {
    const { auth, token } = await AuthDatasource.login({ username, password })
    console.log('Logged')
    if (!auth) throw new Error('Login Error')
    return token
  } catch (err) {
    console.log((err.response && err.response.data) || err)
  }

  try {
    const { auth, token } = await AuthDatasource.register({ username, password })
    if (!auth) throw new Error('Register Error')
    console.log('Registered')
    return token
  } catch (err) {
    console.log((err.response && err.response.data) || err)
    throw err
  }
}

export const timeMeasurer = async (fn: any) => {
  const MS_PER_SEC = 1e3
  const NS_PER_MS = 1e6

  const start = process.hrtime()
  try {
    await fn()
  } catch (err) {
    console.error(err)
    throw err
  }
  const diff = process.hrtime(start)
  const ms = diff[0] * MS_PER_SEC + Math.round(diff[1] / NS_PER_MS)
  console.log(ms)
}
