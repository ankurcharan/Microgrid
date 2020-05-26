const express = require('express');
const fs = require('fs');

const dd = require('./API.json');
const simulation = require('./simulation');

const app = express();


app.use(express.static('public'));

let ret = null;

async function run() {
	if(ret === null) 
		ret = await simulation();

	// let data = {
	// 	success: true,
	// 	data: ret
	// };

	fs.writeFileSync('./result.json', JSON.stringify(ret), err => {

		if(err) {
			console.log('Cant write to file: ', err);
		} else {
			console.log('File written');
		}

	})
}
run();

app.use('/data', async (req, res) => {

	
	if(ret === null || ret === undefined) {
		console.log('Object NI aaya ');
		res.status(500).json({
			success: false,
			message: 'Sorry'
		});

		return;
	} else {

		res.status(200).json(ret);
		return;
	}

	res.status(200).json(dd);
});

const PORT = 9000;
app.listen(PORT, (err) => {
	if(err) {
		console.log("Could not start server");
		console.log('Error: ', err);
		return;
	}

	console.log(`Server started at http://localhost:${PORT}`);
})