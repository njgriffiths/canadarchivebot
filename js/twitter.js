'use strict';

var fs = require('fs');
var twit = require('twit');
var config = require('../api-config');

var T = new twit(config.twitter);

var app = {
	encodeImage: function(image) {
		console.log('Encoding image....');

		var b64image = fs.readFileSync(image, { encoding: 'base64' });

		return b64image;
	},
	// takes a base64-encode image & posts it to twitter
	postMedia: function(image, params) {
		console.log('Uploading image...');

		var b64Image = app.encodeImage(image);

		// upload base64-encoded image to twitter's servers
		T.post('media/upload', { media_data: b64Image }, function(err, data, response) {
			if (err) {
				console.log('ERROR: ', err);
			} else {
				/* now we can assign alt text to the media, for use by screen readers and other text-based presentations and interpreters */
				params.media_id = data.media_id_string;
				params.alt_text = {}
				params.alt_text.text = params.status;

				console.log('tpost: ', params)

				// create a media post to be tweeted
				T.post('media/metadata/create', params, function(err, data, response) {
					if (err) {
						console.log('ERROR: ', err);
					} else {
						params.media_ids = [params.media_id]
						
						// create a new tweet with the image
						app.postReply(params);
					}
				});
			}
		});
	},
	postReply: function(params) {
		// create a new tweet with the image
		T.post('statuses/update', params, function(err, data, response) {
			if (err) {
				console.log('ERROR: ', err.code, params);
			} else {
				console.log('IMAGE POSTED!');
			}
		});
	},
	stream: function() {
		var stream = T.stream('user');

		return stream;
	}
};


module.exports = app;	