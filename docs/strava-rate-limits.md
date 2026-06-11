Strava
Developers
Rate Limits
Strava API usage is limited on a per-application basis using both a 15-minute and daily request limit. Applications have an overall rate limit as well as a separate rate limit associated with the endpoints we consider “non-upload” endpoints. The default overall rate limit allows 200 requests every 15 minutes, with up to 2,000 requests per day. The default “non-upload” rate limit allows 100 requests every 15 minutes, with up to 1,000 requests per day.

What we consider to fall under the “non-upload” rate limit will encompass all endpoints with the exception of:

POST activities (activities#create)
POST uploads (uploads#create)
activities#upload_media
As an application grows, its rate limit may need to be adjusted.

An application’s 15-minute limit is reset at natural 15-minute intervals corresponding to 0, 15, 30 and 45 minutes after the hour. The daily limit resets at midnight UTC. Requests exceeding the limit will return 429 Too Many Requests along with a JSON error message. Note that requests violating the short term limit will still count toward the long term limit.

An application’s limits and usage are reported on the API application settings page as well as returned with every API request as part of the HTTP Headers:

X-RateLimit-Limit
integer, integer
two comma-separated values 15-minute limit, followed by daily limit.
X-RateLimit-Usage
integer, integer
two comma-separated values 15-minute usage, followed by daily usage.
X-ReadRateLimit-Limit
integer, integer
two comma-separated values 15-minute limit, followed by daily limit.
X-ReadRateLimit-Usage
integer, integer
two comma-separated values 15-minute usage, followed by daily usage.

Below is an example request to the Strava API using HTTPie, along with sample response headers for a successful and rate-limited request:

Example request
$ http 'https://www.strava.com/api/v3/athlete' \
 'Authorization:Bearer 83ebeabdec09f6670863766f792ead24d61fe3f9'
Example successful response headers
HTTP/1.1 200 OK
Content-Type: application/json; charset=utf-8
Date: Tue, 10 Oct 2020 20:11:01 GMT
X-Ratelimit-Limit: 600,30000
X-Ratelimit-Usage: 314,27536
Example rate-limited response headers
HTTP/1.1 429 Too Many Requests
Content-Type: application/json; charset=utf-8
Date: Tue, 10 Oct 2020 20:11:05 GMT
X-Ratelimit-Limit: 600,30000
X-Ratelimit-Usage: 692,29300
Athlete Capacity
All newly created apps will have an athlete capacity of 1, aka “Single Player Mode”. Developers in Single Player Mode can use their app solely for themselves, and can access their own data.

Once your app is configured, you can upgrade your access directly from your API Settings Dashboard. This raises your access to:

Athlete capacity of 10
Read read limits: 200 requests / 15min & 2,000 requests / day
Overall rate limits: 400 requests / 15min & 4,000 requests / day
If you want to scale beyond 10 connected athletes you’ll need to submit your app for review. Until your app has been reviewed, you won’t be able to authenticate any additional athletes to your app. Your application’s athlete capacity will be visible in your API Settings Dashboard.

Adjustment Requests
There are four steps

1. Create Demand
   We only raise rate limits for apps that are approaching capacity. Check the API page to be sure you qualify.

https://www.strava.com/settings/api

If you have fewer than 100 users, the problem is most likely inefficient usage of the API. Common culprits are:

Problem Solution
Activity polling is causing you to hit your daily rate limits Implement webhooks
Backfill is causing you to hit your 15-minute rate limits Check API response headers (see above) and throttle back requests when necessary

2. Review API Terms
   Our API Agreement was last updated June 1, 2026. Please be sure to review this before building your app.

https://www.strava.com/legal/api

3. Comply with Brand Guidelines
   All apps have to be in compliance with Strava brand guidelines, make sure your app meets those standards.

https://developers.strava.com/guidelines

4. Submit for Review
   Please complete our Developer Program form for review and be sure to include screenshots of all the places Strava data is shown and the “Connect with Strava” button in your application. Please note: increased access is not a guarantee. This should be something you keep in mind when building with our API.
