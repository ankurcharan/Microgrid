const Web3 = require('web3');
let config = require('./config');

const web3 = new Web3(
	new Web3.providers.HttpProvider(`${config.provider}`)
);

// requires contract json
const compiledContract = require('./build/Exchange.json');

const deployExchange = async () => {
    const account = await web3.eth.getAccounts();

	console.log('Attempting to deploy from account 0: ', account[0]);

	let Exchange = new web3.eth.Contract(
		JSON.parse(compiledContract.interface)
	)
	let bytecode = compiledContract.bytecode;

	let gasEstimate = await web3.eth.estimateGas(
											{ data: bytecode }
										);

	let exchangeInstance = await Exchange.deploy({
		data: bytecode
	}).send({
		from: account[0],
		gas: gasEstimate 
	})
	console.log('Contract Address: ', exchangeInstance.options.address);
};

deployExchange();