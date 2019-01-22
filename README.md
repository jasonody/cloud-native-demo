# Event Streaming Demo for SkySlope

## Steps
1. Execute `npm install`
2. Execute `sls deploy -v`
3. Execute `curl -d '{"id":"112233", "address":"123 Grant St", "iterator": 1}' -H "Content-Type: application/json" -X POST {replace this with the POST endpoint that is outputted from the Serverless deploy} -H "x-api-key: some-key"`
  - POST endpoint example: https://z0zxbak5d1.execute-api.us-east-1.amazonaws.com/dev/transaction

## Lambda Functions
### ar-event-streaming-demo-dev-command
This Lambda receives the POST request to `/command` and publishes a "listing-created" event. In a real world example, this event would be published by the command that handles the creation of the listing. This lamdba simulates this.

### ar-event-streaming-demo-dev-createMailbox
This Lambda reacts to the "listing-created" event and creates a new mailbox based on the data included in the event. Once the mailbox is created, it signals this by publishing a "mailbox-created" event and includes details of the new mailbox.

### ar-event-streaming-demo-dev-updateListing
This Lambda reacts to the "mailbox-created" event and updates the specified listing with the mailbox details included in the event.

## Servless Offline Steps
1. Execute `npm install`
2. Execute `sls deploy -v`
3. Execute `npm run offline`
4. Execute `curl -d '{"id":"112233", "address":"123 Grant St", "iterator": 1}' -H "Content-Type: application/json" -X POST http://localhost:3000/transaction -H "x-api-key: some-key"`