# Reddit Gremlins/Imposter API

The base URL is `https://gremlins-api.reddit.com/`. All responses are JSON encoded.

All of the `/test` stuff seems to be a test for authentication and CSRF token refreshing.


## Archival data

* [Internet Archive (gremlins-api.reddit.com)](https://web.archive.org/web/sitemap/gremlins-api.reddit.com)
* [Internet Archive (redditstatic.com/gremlins)](https://web.archive.org/web/sitemap/www.redditstatic.com/gremlins)
* [github.com/notderw/redditAFD2020](https://github.com/notderw/redditAFD2020) - Contains data dumped by notderw

See also the Archive sections under each endpoint.


## Authentication

### `[auth]`

Endpoints marked with `[auth]` require some form of authentication passed through headers.

Confirmed methods of authentication are:

* The `Cookie` header with the `reddit_session` cookie.

If no authentication is sent, the API will reply with HTTP status 403 and the string:

```
<!doctype html>
<html>

  <head>
    <title>PERMISSION DENIED</title>
  </head>

  <body>
    Ah ah ah...
    <br>
    You didn't say the magic word!
  </body>

</html>
```

### `[CSRF]`

Endpoints marked with `[CSRF]` require a CSRF token to be included in the request body. The token is injected as a hidden field with the name `csrf_token`.

If an invalid CSRF token is sent, the API will reply with HTTP status 400 and the string:

```
400 Bad CSRF Token

Access is denied.  This server can not verify that your cross-site request forgery token belongs to your login session.  Either you supplied the wrong cross-site request forgery token or your session no longer exists.  This may be due to session timeout or because browser is not supplying the credentials required, as can happen when the browser has cookies turned off.


check_csrf_token(): Invalid token


```


## Endpoints

### GET `/room` [auth]

Shows the question and possible answers. Choosing an answer sends a request to `POST /submit_guess`.

#### Archive

01/04/2020:
[index.js (includes comments)](https://web.archive.org/web/20200401172138/https://www.redditstatic.com/gremlins/client/index-410918c5.js),
[client.js (includes comments)](https://web.archive.org/web/20200401172225/https://www.redditstatic.com/gremlins/client/client-f7ec2416.js)

#### Query

* `nightmode` - If set, enables dark theme.
* `platform` - Platform the page is being loaded from. `desktop` makes the buttons smaller.

#### Response

An HTML document including some custom, Polymer based elements:

##### `<gremlin-app>`

Parameters:

* `csrf="x"` - CSRF token required to be sent with the response.
* `nightmode` - Enables the dark theme.
* `platform="x"` - URL encoded value of the `platform` query parameter.

##### `<gremlin-prompt>`

Element containing the question.

Children:

* `<gremlin-meta>` - Contains the question.
* `<gremlin-note>` - Each contains one of the possible answers.

##### `<gremlin-note>`

Contains one of the answers. Includes a unique ID of that answer.

Parameters:

* `id` - A UUID (including dashes) identifying the answer.

Children:

* The answer text.


### POST `/submit_guess` [auth] [CSRF]

Sent when the user chooses their answer. Response value `next` is used to redirect the user to the appropriate page.

#### Request body

Uses WWW form encoding.

* `note_id` - The UUID of the note the user has chosen.

#### Response

```js
{
	"success": boolean, // `true` if the request was successfully executed.
	"result": "LOSE" | "WIN", // Whether the user has answered correctly or not.
	"next": String, // URL to redirect the user to. Example: `/results?prev_result=LOSE`
}
```


### GET `/results` [auth]

Shows the user's and global statistics.

#### Response

An HTML page.

#### Query

* `prev_result` - `LOSE` if the user has lost the previous guess, `WIN` otherwise.
* `nightmode` - If set, enables dark theme.
* `platform` - Platform the page is being loaded from. `desktop` makes the buttons smaller.


### GET `/create_note` [auth]

Allows the users to set their answer. Sends a request to `POST /create_note`

#### Response

An HTML document with an input form.


### POST `/create_note` [auth] [CSRF]

Used to set the user's answer.

#### Request body

Uses WWW form encoding.

* `note` - The new answer for this user. Must to be between 20 and 100 characters (this is enforced by the backend).

#### Response

```js
{
	"success": true, // true if the request is a success.
	"note_id": String, // String containing the UUID of the user's answer.
	"prepared_note_text": String, // The normalized answer string.
}
```

If the note is too short, error 400 is returned with the following text:
```html
<!doctype html>
<html>

  <head>
    <title>Something went wrong</title>
  </head>

  <body>
    Please try again in a minute.
    <br><br>
    Error 400: INVALID_NOTE
    <br>
     The note is too short. Must be at least 20 characters 
  </body>

</html>
```

If the note is too long, error 400 is returned with the following text:
```html
<!doctype html>
<html>

  <head>
    <title>Something went wrong</title>
  </head>

  <body>
    Please try again in a minute.
    <br><br>
    Error 400: INVALID_NOTE
    <br>
     The note is too long. Must be less than 100 characters 
  </body>

</html>
```


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


### GET `/test` [404]

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


### POST `/test` [404] [CSRF]

#### Request body

Uses the WWW form encoding.

`test_val` - Response entered by the user


### GET `/test2` [404]

According to the version saved on the Internet Archive, this page is functionally identical to `/test`.

#### Archive

24/03/2020:
[Normal](https://web.archive.org/web/20200324011229/https://gremlins-api.reddit.com/test2),
[nightmode=1](https://web.archive.org/web/20200324013439/https://gremlins-api.reddit.com/test2?nightmode=1)

#### Query

* `nightmode` - Enables a dark theme if set to `1`.


### GET `/test_content` [404]

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

Returns an HTML document containing the current global statistics.

#### Query

* `fullscreen` - If set, the elements become aligned to the top of the screen.
* `nightmode` - Enables a dark theme if set to `1`.


### GET `/refresh_csrf` [auth]

Returns a new [CSRF token](https://en.wikipedia.org/wiki/Cross-site_request_forgery).

#### Response

An HTML document. Exact string with the token replaced with `x`:

```html
<gremlin-csrf token="x"></gremlin-csrf>
```


### GET `/status` [404]

Currently down, but used to return data for the wrong user, most likely due to caching.

#### Response

```js
{
	"global_score": 0.26248261177037435,
	"imposter_score": 0.7375173882296256,
	"imposter_score_pretty": "74%",
	"total_games": 128679,
	"correct_guesses": 33776,
	"total_notes": 9793,
	"third_stat": 0.1111111111111111,
	"has_current_note": true,
	"my_note_shown": 7,
	"my_note_picked": 1,
	"my_note_score": 0.14285714285714285,
	"flair_type": null,
	"games_played": 4,
	"games_won": 1,
	"user_score": 0.25,
	"user_score_pretty": "25%",
	"max_lose_streak": 2,
	"lose_streak": 2,
	"max_win_streak": 1,
	"win_streak": 0,
	"third_stat_pretty": "11%",
	"third_stat_display": "percent",
	"logged_in": true,
	"prev_result": "None",
	"current_note_text": "i got some weird squishy things inside me and im a walking anxiety machine.",
	"can_submit_note": true,
	"username": "the-masta-owl",
	"next": "/room",
}
```
