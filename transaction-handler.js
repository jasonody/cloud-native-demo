'use strict'

const aws = require('aws-sdk')
const _ = require('highland')
const uuid = require('uuid')

module.exports.command = (event, context, callback) => {
  console.log('event: %j', event)

  const item = JSON.parse(event.body)
  item.id = uuid.v4()

  const streamEvent = {
    id: uuid.v1(),
    type: 'transaction-created',
    timestamp: Date.now(),
    item
  }

  console.log('kinesis event: %j', streamEvent)

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: item.id,
    Data: new Buffer.from(JSON.stringify(streamEvent)),
  }

  const kinesis = new aws.Kinesis()

  kinesis.putRecord(params).promise()
    .then(resp => callback(null, {
      statusCode: 201,
      headers: {
        'access-control-allow-origin': '*', // CORS support
        'cache-control': 'no-cache',
      },
    }))
    .catch(err => callback(err))
}

module.exports.publish = (event, context, callback) => {
}

module.exports.subscribe = (event, context, callback) => {

}