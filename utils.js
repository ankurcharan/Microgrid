var fs = require('fs');
let csv = require('fast-csv');
let csvParser = require('csv-parser');

// fast csv method
async function readCSV (inputFile) {

    return new Promise((resolve, reject) =>{
		
		/** 
		 * 'fast-csv' version >= 3.0.0
		 * fromPath() deprecated in favour of parseFile()
		 */
		let csvData = [];
		
		// csv.fromPath(inputFile)
		csv.parseFile(inputFile)
		.on("data", function(data) {
			csvData.push(data);
		})
		.on("end", function() {
            resolve(csvData);
        });
    });   
}

async function getFiles() {
	console.log('reading files...');
	
    let householdHistoricData = new Array();
    
    for (i = 1; i <= 15; i++){
            householdHistoricData.push(await readCSV(`./dataset/house${i}.csv`));
    }

    return { householdHistoricData };
}


module.exports = {
	readCSV,
};