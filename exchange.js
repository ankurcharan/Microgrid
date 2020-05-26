const Web3 = require('web3');

let config = require('./config');

const web3 = new Web3(
	new Web3.providers.HttpProvider(`${config.provider}`)
);

const Exchange = require ('./build/Exchange.json');

const instance = new web3.eth.Contract(
    JSON.parse(Exchange.interface),
    config.contractAddress
);

module.exports = instance;