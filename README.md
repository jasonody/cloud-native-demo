# Event Streaming Demo
Event streaming demo for SkySlope

## Steps
1. Execute `npm install`
2. Execute `sls deploy -v`
3. Execute `curl -d '{"id":"112233", "email":"123GrantSt@skyslope.com"}' -H "Content-Type: application/json" -X POST {replace this with the POST endpoint that is outputted from the Serverless deploy} -H "x-api-key: some-key"`
  - POST endpoint example: https://z0zxbak5d1.execute-api.us-east-1.amazonaws.com/dev/producers