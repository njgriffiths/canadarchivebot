module.exports = {
	
	cron: {
		random_image: '0 6,12,18 * * *', // run at 6am, noon & 6pm every day
		random_image: '0 * * * *', // TESTING: run every minute
		fetch_photosets: '0 24 * * *'
	},
	image: {
		dir: './assets', // directory to store temp image before posting
		filename: 'image.jpg'
	},
	photoset: {
		dir: './assets',
		filename: 'phototsets.json'
	},
	flickr: {
		nsid: '28853433@N02',
		photo_label: 'Original',
	},
	lookupTableUrl: 'https://docs.google.com/spreadsheets/d/1cFkla2_LmEKyAo0wHWBgLN9fQLtDpos8T-dCiOYZaY8/edit?usp=sharing',
	// below used by flickr.js
	pages: 1,
	results_count: 1, 
	sort: 'interestingness-desc', //The possible values are: date-posted-asc, date-posted-desc, date-taken-asc, date-taken-desc, interestingness-desc, interestingness-asc, and relevance.
	tags: '',
	text: ''
};