const fs = require('fs');
const path = require('path');
const cron = require('cron');
const tabletop = require('tabletop');


const opts = require('./app-config');
const flic = require('./js/flickr');
const twitter = require('./js/twitter');
const twitterReplies = require('./js/twitter-replies');
const downloadImage = require('./js/download-image');
// let lookup = require('./assets/lookup-table.json');


var app = {
	init: () => {
		console.log('Starting up the bot... ' + new Date());
		// setup a cache
		app.cache = {};
		app.cache.noTagReplies = twitterReplies.no_tags;
		
		// fetch & cache lookup table data (hashtags, photoset_ids, etc)
		// TO DO: Refactor as Promise
		app.initTabletop(opts.lookupTableUrl);

		// start listening for Twitter events
		// var stream = twitter.stream();

		// // reply to tweets to the bot
		// stream.on('tweet', app.replyToTweet);

		// // reply to follows
		// stream.on('follow', app.replyToFollow);

		// // log errors
		// stream.on('error', app.logTwitterError);
	},
	appendHashtags: (title) => {
		let hashString = '';
		// split the tags string into an array, append the '#' and append to the image title
		const tags = app.cache.hashtags[0].split(',');
		
		if (tags.length > 0 && tags[0] !== '') {
			tags.forEach(d => {
				hashString += ' #' + d.trim();
			});
		}

		return hashString;
	},
	// redo this as promise/await
	cacheLookupTable: (data) => {
		// cache the lookup table
		app.lookup = data;
		app.cache.tags = [];
		const tags = app.cache.tags;
	
		// build an array of tags to check requests against
		data.forEach((d) => {
			var hashtags = d.hashtags.split(',');
			
			hashtags.forEach(d => {
				const tag = d.trim();
				if (tags.indexOf(tag) === -1) {
					tags.push(tag);	
				}
			});
		});

		// startup the crob job for random image tweets
		app.cronRandomImage();
	},
	cronPhotoset: () => {
		// cron job to fetch list of photosets
		const cronJob = cron.job(opts.cron.fetch_photosets, () => {
			console.log('Running cron to fetch photosets...');
			app.getPhotosets(opts.flickr.nsid);
		});

		cronJob.start();
	},
	cronRandomImage: () => {
		// cron job to trigger new post
		const cronJob = cron.job(opts.cron.random_image, () => {
			console.log('Running cron to fetch random image...');
			
			// get a random photoset
			const photoset = app.getRandomItem(app.lookup);
			// cache photoset hashtags for later use
			app.cache.hashtags = app.getHashtags(photoset.id);
			// grab random image from selected photoset
			app.getRandomPhotosetImage(photoset.id, opts.flickr.nsid);
		});

		cronJob.start();
	},
	downloadImage: (res) => {
		// filepath for the temp image file
		const filepath = path.resolve(__dirname, opts.image.dir, opts.image.filename);
		// select a size to download
		var img = res.body.sizes.size.filter(size => size.label == opts.flickr.photo_label);
		/*
			save temp file to disk then upload to twitter

			NOTE: Should figure out how to feed downloaded image string directly into twitter without needing to write it to disk first.
		*/

		downloadImage(img[0].source, filepath)
			.then((res) => {
				console.log('image saved!');
				
				// post media to twitter
				twitter.postMedia(filepath, app.cache);
			});
	},
	getHashtags: (photoset_id) => {
		return app.lookup
			.filter(photoset => photoset.id === photoset_id)
			.map(photoset => { return photoset.hashtags });
	},
	getPhotosets: (id) => {
		const filepath = path.resolve(__dirname, opts.photoset.dir + opts.photoset.filename);

		flic.getPhotosets(id)
			.then((res) => {
				// pipe the result stream into a file on disc
				res.text.pipe(fs.createWriteStream(filepath));
			});
	},
	getRandomItem: (array) => {
		return array[Math.floor(Math.random() * array.length)];
	},
	getRandomPhotosetImage: (ps_id, nsid) => {
		flic.getPhotosetImages(ps_id, nsid)
			.then(res => {
				// grab a random photo from the photoset array
				const photo = app.getRandomItem(JSON.parse(res.text).photoset.photo);

				// cache title for later use as twitter status
				app.cache.status = photo.title;

				// add hashtags to the title & cache for later
				// app.cache.status += app.appendHashtags(photo.title);

				console.log(`Fetching photo ID: ${photo.id} from photoset ID: ${ps_id}`);

				// download the image
				flic.getPhoto(photo.id)
					.then((res) => {
						app.downloadImage(res);
					})
					.catch((err) => {
						throw new Error(err);
					});
			}).catch((err) => {
				throw new Error(err);
			});
	},
	initTabletop: (url) => {
		return tabletop.init({
			key: url,
			callback: app.cacheLookupTable,
			simpleSheet: true
		});
	},
	logTwitterError(err, data, response) {
		console.log('STREAM ERROR: ', err);
	},
	parseTweet(text) {
		let query;
		const words = text.split(/\s/g)

		// check if any of the words array match the tags array
		// if yes --> get list of photosets with matching tags
		// if no --> return the no_tags responses
		// console.log(words)
		// console.log(app.lookup)

		return query;
	},
	replyToFollow(event) {
		console.log('FOLLOWING!  ', event);
		let params = {};

		params.name = event.source.screen_name;
		params.status = `${twitterReplies.follow.reply_01}${params.name}!`;
		
		// post reply
		twitter.postReply(params);

		setTimeout(() => {
			params.status = `@${params.name} ${twitterReplies.follow.reply_02}`;
			twitter.postReply(params);
		}, 2000);
	},
	replyToTweet(tweet) {
		// ignore tweets posted by the bot
		// if (tweet.user.id === config.twitter_user_id) { return; }

		console.log('Incoming tweet from @', tweet.user.id);
		// set the params object
		let params = {};

		// strip handle from tweet
		const tweetText = tweet.text.replace(`@${tweet.in_reply_to_screen_name}`, '').trim();
		
		// extract the requested category from the tweet
		params.query = app.parseTweet(tweetText);

		// set the screen name & ID for replies
		params.in_reply_to_status_id = tweet.id_str;
		params.name = tweet.user.screen_name;

		// 
		// params.url_params = contentApi.assignUrlParams(query, config.ap.url_params.replySortBy);

		//
		// if (params.url_params.query !== undefined) {
		// 	// constructURL
		// 	params.url = contentApi.constructSearchUrl(params);

		// 	console.log('URL: ', params.url)

		// 	// call to AP Content API
		// 	contentApi.fetchContent(params, Twitter);

		// 	// console.log('CATEGORY: ', params);
		// } else {
		// 	Twitter.postReply({ status: twitterReplies.noCategory });
		// 	// console.log('NO CATEGORY: ', params);
		// }
	}
};

// start it up!
app.init();

