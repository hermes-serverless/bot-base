import { Environment, RunDatasource, Pusher } from '@hermes-serverless/cli-resources'
import { HermesFunctionProto } from '@hermes-serverless/cli-resources/build/globalTypes'
import { parseHermesConfig } from '@hermes-serverless/cli-resources/build/utils/functionUtils'
import { createFsReadStream } from '@hermes-serverless/fs-utils'
import fs from 'fs'
import getStream from 'get-stream'
import path from 'path'
import wtf from 'wtfnode'
import { getToken, timeMeasurer, sleep } from './utils'
import { createDataLogger } from './logger'
import winston from 'winston'
import { Waiter } from '@hermes-serverless/custom-promises'
import retry from 'async-retry'

Environment.baseURL = 'http://localhost:3000'

interface Options {
  timeBetweenRequests: number
  outputDataPath: string
  sampleFolder: string
}

export class AsyncRunTester {
  public token: string
  private username: string
  private logger: winston.Logger
  public hermesConfig: HermesFunctionProto

  public renewTokenTimer: NodeJS.Timeout
  public loopFlag = true

  constructor(public name: string, private opts: Options) {
    this.username = `hermes_bot_${name}`
    this.logger = createDataLogger(opts.outputDataPath)
  }

  public init = async () => {
    this.token = await getToken(this.username, '123', this.logger)
    this.logger.info(`Token: ${this.token}`)
    this.renewTokenTimer = setInterval(async () => await getToken(this.username, '123', this.logger), 3600 * 1000)
    const functionFolder = path.join(this.opts.sampleFolder, 'function')
    this.hermesConfig = parseHermesConfig(functionFolder)
    // const pusher = new Pusher(functionFolder, this.username, 'tiagonapoli', { logger: console, outputToStdout: true })
    // await pusher.addToHermes(true, this.token, 'production')
  }

  private run = async (filename: string) => {
    const runData = await RunDatasource.createAsyncRun(
      this.username,
      {
        functionOwner: this.username,
        functionName: this.hermesConfig.functionName,
        functionVersion: this.hermesConfig.functionVersion,
      },
      await this.getFileStream('in', filename),
      this.token
    )
    return runData
  }

  private checkStatus = async (runID: string, expectedOutput: string) => {
    const status = await RunDatasource.getRunStatus(this.username, runID, this.token, [])
    this.logger.info(status)
    if (!status.status) throw new Error('Status invalid')
    if (status.status === 'error') throw new Error('Error run')
    if (status.status === 'success') {
      const output = await retry(
        async () => {
          const output = await RunDatasource.getRunResultOutput(this.username, runID, this.token)
          return output
        },
        { retries: 3, minTimeout: 2000 }
      )

      if (expectedOutput !== output) {
        throw new Error(`Different output\nExpected\n${expectedOutput}\n\nGot\n${status.out}`)
      }
      return true
    }
    return false
  }

  public loop = async (statusInterval: number) => {
    while (this.loopFlag) {
      const inputFiles = fs.readdirSync(path.join(this.opts.sampleFolder, 'in'))
      for (let i = 0; i < inputFiles.length; i += 1) {
        const runData = await this.run(inputFiles[i])
        const waiter = new Waiter()
        const expected = await getStream(await this.getFileStream('out', inputFiles[i]))
        const checkerInterval = setInterval(async () => {
          try {
            if (await this.checkStatus(runData.runID, expected)) waiter.resolve()
          } catch (err) {
            waiter.reject(err)
          }
        }, statusInterval)
        try {
          await waiter.finish()
        } catch (err) {
          console.log(err)
          process.exit(1)
        }
        this.logger.info('FINISHED')
        clearInterval(checkerInterval)
        await sleep(this.opts.timeBetweenRequests)
      }
    }
  }

  public stop = async () => {
    this.loopFlag = false
    clearInterval(this.renewTokenTimer)
  }

  private getFileStream = (type: 'out' | 'in', filename: string) => {
    return createFsReadStream(path.join(this.opts.sampleFolder, type, filename))
  }
}
