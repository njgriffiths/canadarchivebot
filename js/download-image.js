'use strict';

const fs = require('fs');
const axios = require('axios');

/*
 Stolen from: https://futurestud.io/tutorials/download-files-images-with-axios-in-node-js
*/
async function downloadImage(url, filepath) {
	// axios image download with response type "stream"
	const response = await axios({
		method: 'GET',
		url: url,
		responseType: 'stream'
	});

	// pipe the result stream into a file on disc
	response.data.pipe(fs.createWriteStream(filepath));

	// return a promise and resolve when download finishes
	return new Promise((resolve, reject) => {
		response.data.on('end', () => {
			resolve();
		});

		response.data.on('error', () => {
			reject();
		});
  	});
}

module.exports = downloadImage;