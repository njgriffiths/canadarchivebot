const config = require('../api-config');
const opts = require('../app-config');
const Flickr = require('flickr-sdk');

const flickr = new Flickr(config.flickr.api_key);

const flic = {
	// UNUSEDx
	getPublicPhoto: (opts) => {
		return flickr.people.getPublicPhotos({
			format: 'json',
			per_page: opts.results_count,
			tags: opts.tags,
			text: opts.text,
			user_id: config.flickr.nsid
		});

	},
	getPhoto: (photo_id) => {
		return flickr.photos.getSizes({
			photo_id: photo_id
		});
	},
	getPhotosets: (user_id) => {
		return flickr.photosets.getList({
			user_id: user_id
		});
	},
	getPhotosetImages: (photoset_id, user_id) => {
		return flickr.photosets.getPhotos({
			user_id: user_id,
			photoset_id: photoset_id
		});
	}
};


module.exports = flic;
