# Event Streaming Demo Expanded

## Steps
1. Execute `npm install`
2. Execute `sls deploy -v`
3. Execute `curl -d '{"address":"123 Grant St"}' -H "Content-Type: application/json" -H "x-api-key: some-key" -X POST {replace this with the POST endpoint that is outputted from the Serverless deploy}/transactions`
  - POST endpoint example: https://z0zxbak5d1.execute-api.us-east-1.amazonaws.com/dev

## Lambda Functions
### ar-event-streaming-demo-dev-command
This Lambda receives the POST request to `/command` and publishes a "transaction-created" event. In a real world example, this event would be published by the command that handles the creation of the transaction. This lamdba simulates this.

### ar-event-streaming-demo-dev-createMailbox
This Lambda reacts to the "transaction-created" event and creates a new mailbox based on the data included in the event. Once the mailbox is created, it signals this by publishing a "mailbox-created" event and includes details of the new mailbox.

### ar-event-streaming-demo-dev-updateTransaction
This Lambda reacts to the "mailbox-created" event and updates the specified transaction with the mailbox details included in the event.