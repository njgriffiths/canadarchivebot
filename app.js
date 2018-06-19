const fs = require('fs');
const path = require('path');
const cron = require('cron');
const tabletop = require('tabletop');


const opts = require('./app-config');
const flic = require('./js/flickr');
const twitter = require('./js/twitter');
const downloadImage = require('./js/download-image');
let lookup = require('./assets/lookup-table.json');


var app = {
	init: () => {
		console.log("Starting up the bot..." + new Date());

		// setup a cache
		app.cache = {};
		// fetch & cache lookup table data (hashtags, photoset_ids, etc)
		app.initTabletop(opts.lookupTableUrl)
	},
	appendHashtags: (photoset_id, title) => {
		// split the tags string into an array, append the '#' and append to the image title
		const tags = app.cache.hashtags[0].split(',');
		
		if (tags.length > 0 && tags[0] !== '') {
			tags.forEach(d => {
				title += ' #' + d.trim();
			});	
		}

		// cache for later
		app.cache.status = title;
	},
	cacheLookupTable: (data) => {
		lookup = data;

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
			const photoset = app.getRandomItem(lookup);
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
		return lookup
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

				// add hashtags to the title & cache for later use as twitter status
				app.appendHashtags(ps_id, photo.title);

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
};

// start it up!
app.init();

