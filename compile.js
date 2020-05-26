const solc = require('solc');
const pth = require('path');
const fs = require('fs-extra');  

// create build path
const build_path = pth.resolve(__dirname, 'build'); //currentdirectoy __dirname; 
// contract path
const contract_path = pth.resolve(__dirname, 'contracts', 'Exchange.sol');

let src = fs.readFileSync(contract_path, 'UTF-8');

const compiledContracts = solc.compile(src, 1).contracts
fs.ensureDirSync(build_path); 

for(let contr in compiledContracts) {

	console.log(contr);
	
	fs.outputJsonSync(
        pth.resolve(									
            build_path,
			contr.replace(':','') + '.json'
		), 
    	compiledContracts[contr]			
	);
}

