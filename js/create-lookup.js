const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');

const fileIn = path.resolve(__dirname, '../assets/photosets.json');
const fileOut = path.resolve(__dirname, '../assets/lookup-table.json');

const readStream = fs.createReadStream(fileIn, 'utf-8');
const writeJsonStream = fs.createWriteStream(fileOut, 'utf-8');
const csvStream = csv.createWriteStream({headers: false});
const writeCsvStream = fs.createWriteStream('../assets/lookup-table.csv');


var data = '';


readStream.on('data', (chunk) => {
	data += chunk;
}).on('end', () => {
	let lookup = createLookups(data);

	// createLookupsPromise(data)
	// 	.then(res => {
	// 		console.log(lookups)
	// 	});
});

async function writeLookups(data) {

}

async function createLookups(data) {
	let lookupTable = [];
	const json = JSON.parse(data);

	csvStream.pipe(writeCsvStream);
	
	json.photosets.photoset.forEach((d) => {
		let set = {};
		set.id = d.id 
		set.title = d.title._content;
		set.hashtag = [];
		lookupTable.push(set)
		csvStream.write(set);
	});

	writeJsonStream.write(JSON.stringify(lookupTable));

	return lookupTable;
};

function createLookupsPromise(data) {
	return new Promise((resolve, reject) => {
		function createLookups(data) {
			console.log(typeof(JSON.parse(data)))

			const json = JSON.parse(data);
			
			json.photosets.photoset.forEach((d) => {
				let set = {}
				set.id = d.id 
				set.title = d.title._content;
				lookups.push(set)
			});

			resolve();
		};
	});
}