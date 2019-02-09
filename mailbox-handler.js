'use strict'

const aws = require('aws-sdk')
const _ = require('highland')
const uuid = require('uuid')

const db = new aws.DynamoDB.DocumentClient()
const kinesis = new aws.Kinesis()

module.exports.publish = (event, context, callback) => {
  _(event.Records)
    .map(convertDynamoDBRecordToUoW)
    .tap(uow => console.log('uow: %j', uow))
    .filter(filterForInsert)
    .flatMap(publishEvent)
    .collect()
    .toCallback(callback)
}

const convertDynamoDBRecordToUoW = (record) => {
  const uow = {
    event: record,
    item: {
      keys: aws.DynamoDB.Converter.unmarshall(record.dynamodb.Keys),
      oldImage: aws.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage),
      newImage: aws.DynamoDB.Converter.unmarshall(record.dynamodb.NewImage)
    }
  }

  return uow
}

const filterForInsert = (uow) => uow.event.eventName === 'INSERT'

const publishEvent = (uow) => {
  const streamEvent = {
    id: uuid.v1(),
    type: 'mailbox-created',
    timestamp: Date.now(),
    item: uow.item
  }

  console.log('kinesis event: %j', streamEvent)

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: uow.item.newImage.id,
    Data: new Buffer.from(JSON.stringify(streamEvent)),
  }

  return _(kinesis.putRecord(params).promise())
}

module.exports.subscribe = (event, context, callback) => {
  _(event.Records)
    .map(convertKinesisRecordToUow)
    .filter(filterForFileCreated)
    .tap(uow => console.log('uow: %j', uow))
    //.tap(itsAllGonePeteTong)
    .flatMap(createMailbox)
    .collect()
    .toCallback(callback)
}

const convertKinesisRecordToUow = (record) => ({ event: JSON.parse(new Buffer.from(record.kinesis.data, 'base64')) })

const filterForFileCreated = (uow) => uow.event.type === 'listing-created' || uow.event.type === 'transaction-created'

const itsAllGonePeteTong = () => {
  throw new Error('Something went wrong... :\'(')
}

const createMailbox = (uow) => {
  const randomNumber = Math.floor(Math.random() * (9999-1000) + 1000)

  const mailbox = `${uow.event.item.newImage.address.replace(/\s/g,'')}${randomNumber}@skyslope.com`

  const item = {
    mailbox,
    id: uow.event.item.newImage.id,
    address: uow.event.item.newImage.address
  }

  console.log('new mailbox: %j', item)

  const params = {
    TableName: process.env.MAILBOX_TABLE,
    Item: item,
  }

  return _(db.put(params).promise())
}