// ==UserScript==
// @name         opl's Multisource r/Imposter Script
// @namespace    https://bopl.cf
// @version      1.0
// @description  Remove known answers from Reddit r/imposter
// @author       opl
// @match        https://gremlins-api.reddit.com/room
// @match        https://gremlins-api.reddit.com/results
// @grant        none
// ==/UserScript==

(async () => {
	'use strict';
	/**
	 * LED
	 */
	let led = new WebSocket('ws://127.0.0.1:9001');
	function ledShow() {
		try {
			led.send('{"t":"show"}');
		} catch (ex) {}
	}
	function ledPixel(pos, color) {
		try {
			led.send(JSON.stringify({
				t: 'setPixel',
				pos,
				color,
			}));
		} catch (ex) {}
	}
	function ledClear(color = 0) {
		try {
			led.send(JSON.stringify({
				t: 'clear',
				color,
			}));
		} catch (ex) {}
	}
	function log(data) {
		try {
			led.send(JSON.stringify({
				t: 'log',
				d: JSON.stringify(data),
			}));
		} catch (ex) {}
	}

	function parseElement(element) {
		return {
			id: element.id,
			text: element.textContent.trim(),
		};
	}

	function formatResult(result) {
		const str = result.error ? 'Error' : !result.found ? '<span class="o-none">Not found</span>' : result.correct ? '<span class="o-imposter">Imposter</span>' : '<span class="o-human">Human</span>';
		return str + (result.guessReal !== undefined ? ` r${Math.round(result.guessReal * 1000) / 10}, f${Math.round(result.guessFake * 1000) / 10}` : '');
	}

	function el(tag, attr, children) {
		if (arguments.length === 2) {
			children = attr;
			attr = undefined;
		}

		const element = document.createElement(tag);

		if (attr) {
			if (attr.class) (typeof attr.class === 'string' ? [attr.class] : attr.class).forEach((c) => element.classList.add(c));
			if (attr.type) element.type = attr.type;
			if (attr.events) Object.entries(attr.events).forEach(([name, handler]) => element.addEventListener(name, handler));
		}

		function setContent(content) {
			if (typeof content === 'string') {
				element.innerHTML = content;
			} else if (Array.isArray(content)) {
				content.forEach((child) => element.appendChild(child));
			}
		}

		if (children && typeof children.then === 'function') {
			children.then(setContent).catch(() => setContent('[error]'));
		} else {
			setContent(children);
		}

		return element;
	}

	async function fetchAnswerSneknet(parsedAnswers) {
		const req = await fetch('https://api.snakeroom.org/y20/query', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				options: parsedAnswers.map((answer) => answer.text),
			}),
		});
		const data = await req.json();

		return data.answers.reduce((acc, answer) => {
			acc[answer.i] = {
				found: true,
				correct: answer.correct,
			};

			return acc;
		}, parsedAnswers.map(() => ({found: false})));
	}

	async function submitAnswerSneknet(parsedAnswers, chosenAnswer, guessCorrect) {
		const req = await fetch('https://api.snakeroom.org/y20/submit', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: '[REDACTED]',
			},
			body: JSON.stringify({
				tag: 'opl-v1',
				options: guessCorrect ? parsedAnswers.map((answer) => ({
					message: answer.text,
					correct: answer.id === chosenAnswer.id,
				})) : [{
					message: chosenAnswer.text,
					correct: false,
				}],
			}),
		});

		return req;
	}

	async function fetchAnswerOcean(parsed) {
		const req = await fetch(`https://wave.ocean.rip/answers/answer?text=${encodeURIComponent(parsed.text)}`);
		const data = await req.json();

		return {
			found: data.status === 200,
			correct: data.answer ? data.answer.is_correct : null,
		};
	}

	async function fetchAnswerSpacescience(parsed) {
		const req = await fetch(`https://spacescience.tech/check.php?id=${encodeURIComponent(parsed.id)}`);
		const data = await req.json();

		if (data.slow === 'yes') return {
			found: false,
			correct: null,
		};

		const sortedKeys = Object.keys(data).filter((key) => !['slow', 'fast', 'code'].includes(key) && `${parseInt(key, 10)}` === key).map((key) => parseInt(key, 10)).sort();

		// idk what happened in their backend, but it was returning just `{"code":"ok"}`
		if (sortedKeys.length === 0) return {found: false};

		// yup. undefined is an option. there seems to be no data validation.
		const latest = sortedKeys.map((key) => data[`${key}`]).filter((d) => !['INVALID', undefined].includes(d.result) && d.answer === parsed.text);

		return {
			found: data.code === 'ok',
			correct: latest.result === 'WIN',
		};
	}

	/* async function submitAnswerSpacescience(parsedAnswers, chosenAnswer, guessCorrect) {
		const form = new FormData();

		form.append('answer', '');
		form.append('result', guessCorrect ? 'WIN' : 'LOSE');

		const req = await fetch('https://spacescience.tech/api.php', {
			method: 'POST',
			body: form,
		});

		return req;
	} */

	async function fetchAnswerAbraDetector(parsed) {
		const req = await fetch(`https://detector.abra.me/?${encodeURIComponent(parsed.text)}`);
		const data = await req.json();

		return {
			found: true,
			guessReal: data.real_probability,
			guessFake: data.fake_probability,
			correct: data.real_probability < data.fake_probability,
		};
	}

	async function fetchAnswerAbraLibrarian(parsedAnswers) {
		const req = await fetch('https://librarian.abra.me/check', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				texts: parsedAnswers.map((parsed) => parsed.text),
			}),
		});
		const data = await req.json();

		return data.results.map((result) => ({
			found: result !== 'unknown',
			correct: result === 'unknown' ? null : result === 'known human' ? false : result === 'known fake' ? true : result,
		}));
	}

	async function submitAnswerAbraLibrarian(parsedAnswers, chosenAnswer, guessCorrect) {
		const req = await fetch('https://librarian.abra.me/submit', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
			},
			body: JSON.stringify({
				chosen_text: chosenAnswer.text,
				option_texts: parsedAnswers.map((parsed) => parsed.text),
				result: guessCorrect ? 'WIN' : 'LOSE',
			}),
		});

		return req;
	}

	async function fetchAnswerHuggingfaceDetector(parsed) {
		const req = await fetch(`https://huggingface.co/openai-detector/?${encodeURIComponent(parsed.text)}`);
		const data = await req.json();

		// real - human, fake - AI (imposter)
		return {
			found: true,
			guessReal: data.real_probability,
			guessFake: data.fake_probability,
			correct: data.real_probability < data.fake_probability,
		};
	}

	function doFetch(func, batch, parsedAnswers) {
		if (!batch) return parsedAnswers.map(func);

		const promises = parsedAnswers.map(() => {
			let resolve;
			let reject;
			const promise = new Promise((r, rj) => {
				resolve = r;
				reject = rj;
			});
			return {promise, resolve, reject};
		});

		func(parsedAnswers).then((results) => {
			results.forEach((result, index) => promises[index].resolve(result))
		}).catch((ex) => {
			promises.forEach(({reject}) => reject(ex));
		});

		return promises.map(({promise}) => promise);
	}

	// DO NOT change the order, or the logs will become unusable. Yup, I didn't use a key for those. Oops.
	const SOURCES = [{
		id: 'sneknet',
		title: 'Sneknet',
		batch: true,
		func: fetchAnswerSneknet,
		submit: submitAnswerSneknet,
	}, {
		id: 'ocean',
		title: 'Ocean',
		func: fetchAnswerOcean,
	}, {
		id: 'spacescience',
		title: 'SpaceScience',
		func: fetchAnswerSpacescience,
	}, {
		id: 'abralibrarian',
		title: 'Abra Librarian',
		ignore: true,
		batch: true,
		func: fetchAnswerAbraLibrarian,
		// submit: submitAnswerAbraLibrarian,
	}, {
		id: 'abradetector',
		disable: true,
		ignore: true,
		title: 'Abra Detector',
		func: fetchAnswerAbraDetector,
	}, {
		id: 'huggingfacedetector',
		disable: true,
		ignore: true,
		title: 'Huggingface Detector',
		func: fetchAnswerHuggingfaceDetector,
	}].filter((source) => !source.disable);

	function fetchAnswers(parsedAnswers) {
		const answerPromises = parsedAnswers.map(() => []);

		SOURCES.map((source) => {
			doFetch(source.func, source.batch, parsedAnswers).map(
				(promise, index) => answerPromises[index].push(promise),
			);
		});

		return answerPromises;
	}

	function submitAnswers(parsedAnswers, chosenAnswer, guessCorrect) {
		return Promise.all(SOURCES.map(async (source) => {
			if (!source.submit) return;

			const req = await source.submit(parsedAnswers, chosenAnswer, guessCorrect);
			log({
				t: 'submit',
				s: source.title,
				h: req.status,
				d: await req.text(),
			});
		}));
	}

	const style = document.createElement('style');
	style.innerText = `.o-hint-table {
		position: fixed;
		top: 20px;
		left: 20px;
	}

	.o-hint-table td {
		min-width: 90px;
	}

	.o-status {
		position: fixed;
		bottom: 20px;
		left: 20px;
	}

	div.o-hint {
		/*position: absolute;
		top: 0;
		left: calc(100% + 40px);
		width: 200px;
		padding: 4px;
		border: 1px solid #ffffff30;
		border-radius: 10px;*/
		display: flex;
		flex-direction: row;
	}

	div.o-hint>* {
		margin: 4px;
	}

	.o-imposter {
		color: #22ff22;
	}

	.o-human {
		color: #ff2222;
	}`;
	document.head.appendChild(style);

	function renderAnswerTable(answerPromises) {
		return el('table', {
			class: 'o-hint-table',
		}, [
			el('tr', [el('th'), ...SOURCES.map((source) => el('th', source.title))]),
			...answerPromises.map((promises, index) => {
				return el('tr', [el('th', `#${index + 1}`), ...promises.map((promise) => el('td', promise.then(formatResult)))]);
			}),
		]);
	}

	async function handleRoom() {
		const notes = [...document.getElementsByTagName('gremlin-note')];
		const parsedAnswers = notes.map((note) => parseElement(note));

		notes.forEach((note, index) => note.prepend(`#${index + 1}: `));

		const answerPromises = fetchAnswers(parsedAnswers);

		document.body.appendChild(renderAnswerTable(answerPromises));

		answerPromises.forEach((promises, index) => {
			Promise.all(promises).then((results) => {
				if (results.some((result, index) => SOURCES[index].ignore !== true && result.correct === false)) notes[index].style.opacity = 0.4;
			});
		});
	}

	/*
	 * AUTOPLAY
	 */

	async function redditFetchParsed() {
		const page = await fetch('https://gremlins-api.reddit.com/room?nightmode=1&platform=desktop');
		const content = await page.text();

		const parsedAnswers = [];

		const csrfTokenMatch = /csrf="([^"]+?)"/.exec(content);
		if (csrfTokenMatch === null) return {error: new Error('No CSRF token')};
		const csrfToken = csrfTokenMatch[1];

		const re = /<gremlin-note id="([^"]+?)">([^<]+?)<\/gremlin-note>/g;
		let match;
		while (match = re.exec(content)) {
			parsedAnswers.push({
				id: match[1].trim(),
				text: match[2].trim(),
			});
		}

		if (parsedAnswers.length !== 5) return {error: new Error(`Didn't get exactly 5 answers: ${JSON.stringify(parsedAnswers)}`)};

		return {
			csrfToken,
			parsedAnswers,
		};
	}

	async function redditSubmitGuess(csrfToken, uuid) {
		const res = await fetch('https://gremlins-api.reddit.com/submit_guess', {
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded',
			},
			body: `note_id=${encodeURIComponent(uuid)}&csrf_token=${encodeURIComponent(csrfToken)}`,
		});

		const data = await res.json();

		if (!data.success) throw new Error('guess submission failed');

		return data.result === 'WIN';
	}

	function chooseAnswer(parsedAnswers, allAnswersIn) {
		const allAnswers = allAnswersIn.map((answers, index) => [answers, parsedAnswers[index]]);

		const possible = allAnswers.filter(([answers]) => !answers.filter((a, index) => SOURCES[index].ignore !== true).some((a) => a.found === true && a.correct === false));
		const certain = possible.filter(([answers]) => answers.some((a) => a.found === true && a.correct === true));

		log({
			t: 'choosing',
			parsedAnswers,
			allAnswers: allAnswersIn,
		});

		// TODO: sneknet at some point inserted everything as human .-. account for that if only snek is saying human?
		// TODO: doorman claims that spacescience win data is unreliable
		if (certain.length > 1) {
			return new Error('More than 1 certain.');
		} else if (certain.length === 1) {
			console.log('Sending certain:', certain[0]);
			return certain[0][1];
		} else if (possible.length === 1) {
			console.log('Sending by elimination:', possible[0]);
			return possible[0][1];
		} else if (possible.length > 1) {
			console.log('Not enough data');
			return false;
		}

		return new Error('Entered invalid state.');
	}

	let doAutoplay = false;
	let autoplayRunning = false;

	async function autoplay() {
		if (!doAutoplay) return;
		autoplayRunning = true;

		const parsedPage = await redditFetchParsed();
		if (parsedPage.error) {
			console.log('Parsing the /room page returned an error:', parsedPage.error);
			return setTimeout(() => autoplay(), 5000);
		}

		const {csrfToken, parsedAnswers} = parsedPage;
		const answerPromises = fetchAnswers(parsedAnswers);

		[...document.getElementsByClassName('o-hint-table')].forEach((element) => element.remove());

		try {
			ledClear();
			ledShow();

			answerPromises.forEach((promises, answerIndex) => {
				promises.forEach((promise, sourceIndex) => {
					promise.then((result) => {
						ledPixel(answerIndex * 8 + sourceIndex, result.found === false ? 0x000005 : result.correct === false ? 0x050000 : result.correct === true ? 0x000500 : 0);
						ledShow();
					});
				});
			});
		} catch (ex) {}

		document.body.appendChild(renderAnswerTable(answerPromises));

		let allAnswers;

		try {
			allAnswers = await Promise.all(answerPromises.map((promises) => Promise.all(promises)));
		} catch (ex) {
			console.error('error while getting answers:', ex);
			return setTimeout(() => autoplay(), 5000);
		}

		try {
			const chosenAnswer = chooseAnswer(parsedAnswers, allAnswers);

			if (chosenAnswer instanceof Error) {
				console.error('invalid state:', chosenAnswer);
				ledClear(0x050005);
				ledShow();
			} else if (chosenAnswer === false) {
				const wait = 4000 + (Math.random() * 2000);
				console.log(`Not enough data. Waiting ${Math.round(wait)}ms...`);
				ledPixel(63, 0x050005);
				ledShow();

				setTimeout(() => autoplay(), wait);
			} else if (chosenAnswer.id) {
				console.log(chosenAnswer);

				const guessResult = await redditSubmitGuess(csrfToken, chosenAnswer.id);
				log({
					t: 'guess',
					parsedAnswers,
					allAnswers,
					chosenAnswer,
					guessResult,
				});

				console.log(`Our guess was %c${guessResult ? 'correct' : 'wrong'}`, guessResult ? 'color: green;' : 'color: red;');
				ledClear(guessResult ? 0x000500 : 0x050000);
				ledShow();

				submitAnswers(parsedAnswers, chosenAnswer, guessResult).catch((ex) => {
					console.error('error submiting answers to databases:', ex);
				});

				setTimeout(() => autoplay(), 100);
			} else {
				console.error('chooseAnswer returned invalid choice:', chooseAnswer);
				ledClear(0x050000);
				ledShow();
			}
		} catch (ex) {
			console.error('error while picking answers:', ex);
		}

		autoplayRunning = false;
	}

	async function redditFetchStatus() {
		return await (await fetch('https://gremlins-api.reddit.com/status')).json();
	}

	function renderStatusTable(status) {
		return el('div', {class: ['o-status']}, [
			el('div', `Wins: ${status.games_won} (streak: ${status.win_streak}, max. ${status.max_win_streak})`),
			el('div', `Loses: ${status.games_played - status.games_won} (streak: ${status.lose_streak}, max. ${status.max_lose_streak})`),
		]);
	}

	async function updateStatus() {
		const status = await redditFetchStatus();
		log({
			t: 'status',
			status,
		});

		[...document.getElementsByClassName('o-status')].forEach((element) => element.remove());
		document.body.appendChild(renderStatusTable(status));
	}

	async function handleResults() {
		const autoplayBox = el('label', [el('input', {
			type: 'checkbox',
			events: {
				change() {
					doAutoplay = this.checked;

					if (!autoplayRunning) autoplay();
				},
			},
		}, []), el('span', 'Autoplay')]);
		document.getElementsByTagName('gremlin-prompt')[0].appendChild(autoplayBox);

		updateStatus();
		setInterval(updateStatus, 60000);
	}

	if (window.location.pathname === '/room') handleRoom();
	else if (window.location.pathname === '/results') handleResults();
})();
