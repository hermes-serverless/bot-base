import { SyncRunTester } from '../../SyncRunTester'
import path from 'path'
import wtf from 'wtfnode'

const bot = new SyncRunTester('charPrinter', {
  timeBetweenRequests: 2000,
  outputDataPath: path.join(__dirname, '..', '..', '..', 'tmp', 'char-printer-2000'),
  sampleFolder: path.join(__dirname, '..', '..', '..', 'samples', 'char-printer'),
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
