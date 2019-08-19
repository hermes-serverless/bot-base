import { Environment, RunDatasource, Pusher } from '@hermes-serverless/cli-resources'
import { HermesFunctionProto } from '@hermes-serverless/cli-resources/build/globalTypes'
import { parseHermesConfig } from '@hermes-serverless/cli-resources/build/utils/functionUtils'
import { createFsReadStream } from '@hermes-serverless/fs-utils'
import fs from 'fs'
import getStream from 'get-stream'
import path from 'path'
import wtf from 'wtfnode'
import { getToken, timeMeasurer, sleep } from './utils'

Environment.baseURL = 'http://localhost:3000'

interface Options {
  timeBetweenRequests: number
  randomizeTime: number
  outputDataPath: string
  sampleFolder: string
}

export class SyncRunTester {
  public token: string
  private username: string
  public hermesConfig: HermesFunctionProto

  public renewTokenTimer: NodeJS.Timeout
  public loopFlag = true

  constructor(public name: string, private opts: Options) {
    this.username = `hermes_bot_${name}`
  }

  public init = async () => {
    this.token = await getToken(this.username, '123')
    console.log(this.token)
    this.renewTokenTimer = setInterval(async () => await getToken(this.username, '123'), 3600 * 1000)
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
        timeMeasurer(() => this.run(inputFiles[i]))
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

const bot = new SyncRunTester('charPrinter', {
  timeBetweenRequests: 800,
  randomizeTime: 0,
  outputDataPath: '',
  sampleFolder: path.join(__dirname, '..', 'samples', 'char-printer'),
})

bot.init().then(() => {
  bot.loop().catch(err => {
    console.log(err)
    bot.stop()
    wtf.dump()
  })
})

process.on('SIGINT', function() {
  console.log('Caught interrupt signal')
  bot.stop()
})
