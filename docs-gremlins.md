# Reddit Gremlins API

The base URL is `https://gremlins-api.reddit.com/`. All responses are JSON encoded.

All of the `/test` stuff seems to be a test for authentication and CSRF token refreshing.


## Authentication

Endpoints marked with `[auth]` require some form of authentication passed through headers.

Endpoints marked with `[CSRF]` require a CSRF token to be included in the request body. The token is injected as a hidden field with the name `csrf_token`.


## Endpoints

### GET `/constants`

Returns a list of global settings that allow the Reddit admins to adjust things on the fly.

#### Response

(As of 01/04/2020 14:42 UTC)
```js
{
	"name": null,
	"button_name": null,
	"is_live": false,
	"cache_ttl_sec": 1800.0,
	"subreddit_name": null,
	"helper_subreddit_name": null,
	"subreddit_id": "t5_2ft66x",
	"second_subreddit_id": "t5_2hhaz5",
}
```

(As of 26/03/2020 12:33 UTC)
```js
{
	"name": "Gremlins",
	"button_name": "agitate",
	"is_live": false,
	"cache_ttl_sec": 259200,
	"subreddit_id": "t5_2ry8k",
	"second_subreddit_id": "t5_2rowv",
}
```


### GET `/test`

A test page titled `Let's test POST` for the project. Includes buttons `Refresh the page`, `Force app callback`, and `Make api call with auth`.

The page source includes inlined authentication controller code.

#### Archive

24/03/2020:
[Normal](https://web.archive.org/web/20200324011004/https://gremlins-api.reddit.com/test),
[nightmode=1](https://web.archive.org/web/20200324013437/https://gremlins-api.reddit.com/test?nightmode=1),
[index.js](https://web.archive.org/web/20200324011004js_/https://gremlins-api.reddit.com/static/client/index-625d0049.js),
[test.js](https://web.archive.org/web/20200324011004js_/https://gremlins-api.reddit.com/static/client/test-c5c646a6.js)

#### Query

* `nightmode` - Enables a dark theme if set to `1`.


### POST `/test` [CSRF]

#### Request body

Uses the WWW form encoding.

`test_val` - Response entered by the user


### GET `/test2`

According to the version saved on the Internet Archive, this page is functionally identical to `/test`.

#### Archive

24/03/2020:
[Normal](https://web.archive.org/web/20200324011229/https://gremlins-api.reddit.com/test2),
[nightmode=1](https://web.archive.org/web/20200324013439/https://gremlins-api.reddit.com/test2?nightmode=1)

#### Query

* `nightmode` - Enables a dark theme if set to `1`.


### GET `/test_content`

Unknown.

#### Archive
24/03/2020: [Normal](https://web.archive.org/web/20200324013430/https://gremlins-api.reddit.com/test_content)


### GET `/health`

#### Response

```js
{
	"healthy?!": true,
}
```


### GET `/embed`

Unknown.

#### Query

* `fullscreen` - Can be set to `1`.


### GET `/refresh_csrf` [auth]

Returns a new [CSRF token](https://en.wikipedia.org/wiki/Cross-site_request_forgery).
