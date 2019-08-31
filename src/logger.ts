import winston from 'winston'

export const createDataLogger = (outputPath: string) => {
  return winston.createLogger({
    transports: [new winston.transports.File({ filename: outputPath }), new winston.transports.Console()],
  })
}
