'use strict';

const aws = require('aws-sdk');
const _ = require('highland');
const uuid = require('uuid');

if (process.env.IS_OFFLINE) { //for serverless offline
  process.env.STREAM_NAME = process.env.OFFLINE_STREAM_NAME
}

//createTransaction is available offline
module.exports.createTransaction = (event, context, callback) => {
  console.log('event: %j', event)

  const item = JSON.parse(event.body)

  const streamEvent = {
    id: uuid.v1(),
    type: 'transaction-created',
    timestamp: Date.now(),
    item
  };

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: item.id,
    Data: new Buffer.from(JSON.stringify(streamEvent)),
  };

  console.log('command kinesis params: %j', params)

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

module.exports.createMailbox = (event, context, callback) => {
  console.log('createMailbox stream event: %j', event);

  _(event.Records)
    .map(mapRecordToUow)
    .tap(uow => console.log('createMailbox record ==> Uow: %j', uow))
    .filter(filterForFileCreated)
    //.tap(itsAllGonePeteTong)
    .flatMap(processMailbox)
    .flatMap(publishMailboxCreated)
    .collect()
    .toCallback(callback);
}

const mapRecordToUow = (record) => ({ event: JSON.parse(new Buffer.from(record.kinesis.data, 'base64')) })

const filterForFileCreated = (uow) => uow.event.type === 'listing-created' || uow.event.type === 'transaction-created'

const itsAllGonePeteTong = () => {
  throw new Error('This probably synchronous and all did not happen :\'(')
}

const processMailbox = (uow) => {
  console.log('CREATING MAILBOX')

  const mailbox = `${uow.event.item.address.replace(/\s/g,'')}${uow.event.item.iterator || ''}@skyslope.com`

  uow.mailbox = mailbox

  return _(Promise.resolve(uow))
}

const publishMailboxCreated = (uow) => {
  const item = {
    id: uow.event.item.id,
    mailbox: uow.mailbox
  }

  const event = {
    id: uuid.v1(),
    type: 'mailbox-created',
    timestamp: Date.now(),
    item
  };

  const params = {
    StreamName: process.env.STREAM_NAME,
    PartitionKey: item.id,
    Data: new Buffer.from(JSON.stringify(event)),
  };

  console.log('mailbox created event: %j', event)
  console.log('mailbox created kinesis params: %j', params)

  const kinesis = new aws.Kinesis()

  return _(kinesis.putRecord(params).promise())
}

module.exports.updateTransaction = (event, context, callback) => {
  _(event.Records)
    .map(mapRecordToUow)
    .tap(uow => console.log('updateTransaction record ==> UoW: %j', uow))
    .filter(filterForMailboxCreated)
    .flatMap(updateTransactionWithMailbox)
    .collect()
    .toCallback(callback);
}

const filterForMailboxCreated = (uow) => uow.event.type === 'mailbox-created'

const updateTransactionWithMailbox = (uow) => {
  //TODO:Update listing's mailbox
  console.log('UPDATING TRANSACTION WITH MAILBOX')

  return _(Promise.resolve({}))
}