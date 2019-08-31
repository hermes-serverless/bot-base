import path from 'path'
import wtf from 'wtfnode'
import { AsyncRunTester } from '../../AsyncRunTester'

const bot = new AsyncRunTester('waiter', {
  timeBetweenRequests: 30000,
  outputDataPath: path.join(__dirname, '..', '..', '..', 'tmp', 'async-waiter'),
  sampleFolder: path.join(__dirname, '..', '..', '..', 'samples', 'waiter'),
})

bot.init().then(() => {
  bot.loop(5000).catch(err => {
    console.log(err)
    bot.stop()
    wtf.dump()
  })
})

process.on('SIGINT', function() {
  console.log('Caught interrupt signal')
  bot.stop()
})
