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

Environment.baseURL = 'http://localhost:3000'

interface Options {
  timeBetweenRequests: number
  outputDataPath: string
  sampleFolder: string
}

export class SyncRunTester {
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
    const pusher = new Pusher(functionFolder, this.username, 'tiagonapoli', { logger: console, outputToStdout: true })
    await pusher.addToHermes(true, this.token, 'production')
  }

  private run = async (filename: string) => {
    const outStream = await RunDatasource.createSyncRun(
      this.username,
      {
        functionOwner: this.username,
        functionName: this.hermesConfig.functionName,
        functionVersion: this.hermesConfig.functionVersion,
      },
      await this.getFileStream('in', filename),
      this.token
    )

    const output = await getStream(outStream)
    const expected = await getStream(await this.getFileStream('out', filename))
    if (expected !== output) throw new Error(`Different output\nExpected\n${expected}\n\nGot\n${output}`)
  }

  public loop = async () => {
    while (this.loopFlag) {
      const inputFiles = fs.readdirSync(path.join(this.opts.sampleFolder, 'in'))
      for (let i = 0; i < inputFiles.length; i += 1) {
        await timeMeasurer(() => this.run(inputFiles[i]), this.logger)
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
