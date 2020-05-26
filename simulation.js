// const ganache = require('ganache-cli');
const Web3 = require('web3');

// requires
let fs = require('fs');
var csv = require('fast-csv');
let csvWriteStream = require('csv-write-stream');
let parse = require('csv-parse');
let async = require('async');

let calculateIntersection = require('./inter');
const config = require('./config');
const { debug } = config;

// Agent and NationalGridAgent
const { Agent, AgentNationalGrid } = require('./prosumer');
//compiled contracts
const exchange = require('./exchange');
// functions imports
const { readCSV }= require('./utils');

const web3 = new Web3(
	new Web3.providers.HttpProvider(`${config.provider}`)
);

const {
	convertArrayGasToDollars,
	convertArrayWeiToDollars,
	convertWeiToDollars,
	convertGasToDollars
} = require('./conversion');

let id = new Array();

let agentsNoBattery = new Array();
let agentsBattery = new Array();
let numberOfBids = new Array();

// constants 
const outputFile = 'output.csv';
const defaultBatteryCapacity = 12000;

const GASPRICE = 20000000000;  	// 20 GWEI
const PRICE_OF_ETHER = 250; 	// $250 = 1 ether 
const WEI_IN_ETHER = 1000000000000000000; // 10^18
const NATIONAL_GRID_PRICE = 0.1; 

// async function see() {
// 	let accts = await web3.eth.getAccounts();
// 	let a = await web3.eth.accounts;

// 	console.log(accts);
// 	console.log(a);
// }
// see();

// RUN THIS FUNCTION FOR SIMULATION
// init();

async function init() {

    let unFilledBids = new Array();
    let unFilledAsks = new Array();
    let aggregatedDemand = new Array();
    let aggregatedSupply = new Array();
    let historicalPricesPlot = new Array();
    // let nationalGridBalanceHistory = new Array();
    // let amountBidsPerT = new Array();
    // let amountAsksPerT = new Array();

	var accounts = await web3.eth.getAccounts();

    let { householdHistoricData } = await getFiles();   

    let { 
		agents, 
		agentNationalGrid 
	} = await createAgents(householdHistoricData, defaultBatteryCapacity, false);
    
	let agentsBattery = agents; 	

    // last account as national grid address
    let nationalGridAddress = await agentNationalGrid.getAccount(accounts.length - 1); 


	console.log(`${agentsBattery.length} agents created.`);
    console.log('Starting Simulation');


    let dataToReturnApi = [];

    dataToReturnApi.nationalGridAddress = nationalGridAddress;
    dataToReturnApi.NATIONAL_GRID_PRICE = NATIONAL_GRID_PRICE;

    if(debug) {
        console.log();
        console.log('NATIONAL_GRID_PRICE: ', NATIONAL_GRID_PRICE);
        console.log('nationalGridAddress: ', nationalGridAddress);
        console.log();
    }
    
    
	let timeArray = new Array();
    
    for (let i = 2184; i < 2232; i++) {

        timeArray.push(i);

        let retData = {};
        retData.time = i;

        if(debug)
            console.log('Time: ', i, '\n');

        let agentPurchaseLogic = [];
        for (let j = 0; j < agentsBattery.length; j++) {

            agentsBattery[j].agent.setCurrentTime(i);

			if(i == 2184) {
                await agentsBattery[j].agent.setNationalGrid(
					NATIONAL_GRID_PRICE, 
					nationalGridAddress
				);
			}
            
			// run purchase logic for the each agent at that time
            try{
                let some = await agentsBattery[j].agent.purchaseLogic();
                if(some === null || some === undefined) {

                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log('Some= ', some);
                    console.log('TIme: ', i);
                    console.log('Agent: ', j);
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                    console.log()
                }
                agentPurchaseLogic.push(some);
            } catch(err){
				console.log('error from purchase logic', err);
			}
        }

        retData.purchaseLogic = agentPurchaseLogic;

       
        // all bids and asks in array
        let { bids, asks } = await getExchangeBids();        
        // amountBidsPerT.push(bids.length);
        // amountAsksPerT.push(asks.length);

		console.log('Bid Length: ', bids.length);
        console.log('Ask Length: ', asks.length);
        
        retData.bidLength = bids.length;
        retData.askLength = asks.length;

        if (bids.length >= 2  && asks.length  >= 2) {

            let intersection = calculateIntersection(bids, asks);
			
			let priceDollars = convertWeiToDollars(intersection[1], WEI_IN_ETHER, PRICE_OF_ETHER);

            console.log('price in Dollars', priceDollars);

			let paidBids = new Array();

            // bid/ask sorted in desc by the amount
            bids = bids.sort(sortByAmount);
            asks = asks.sort(sortByAmount);
			
			numberOfBids.push(bids.length);
			
            for (let j = 0; j < agentsBattery.length; j++) {
                agentsBattery[j].agent.historicalPrices[i] = intersection[1];
            }

            let {
				bids: unfilledBids, 
				asks: unfilledAsks, 
				agentsBattery: agentsBattery2
			} = await matchBids(bids.length - 1, asks.length - 1, bids, asks, agentsBattery, intersection);

            bids = unfilledBids;
            asks = unfilledAsks;
			agentsBattery = agentsBattery2;

            // unfulfilled bids
            if(bids.length > 0) {
                for (let i = 0; i < bids.length; i++) {
                    let obj = agentsBattery.find(function (obj) { 
						return obj.agentAccount === bids[i].address; 
					});
					
					obj.agent.unfilledOrdersProcess(); 

                    unFilledBids.push(bids[i]);
                }
			}
			
			// ask unfullfilled
            if(asks.length > 0) {
                for (let i = 0; i < asks.length; i++) {

					let obj = agentsBattery.find(function (obj) { 
						return obj.agentAccount === asks[i].address; 
					});

					obj.agent.charge(asks[i].amount);    
					unFilledAsks.push(asks[i]);
                }
			}
			
            try{
				console.log('clearing Market');
                await clearMarket();
            } catch(err) {
                console.log('Error while trying to clear market, simulation:L213', err);
            }
        }
        // one of them can be large
        else if (bids.length < 2  || asks.length  < 2) {
			
			numberOfBids.push(bids.length);
           
            for (let j = 0; j < bids.length; j++) {

				unFilledBids.push(bids[j]);
                
                let obj = agentsBattery.find(function (obj) { 
					return obj.agentAccount === bids[j].address; 
                });
                
				if(!obj) {
                    if(debug) {
                        console.log('Bidder not found, simulation:bids<2asks<2', j, i);
                        console.log('For bid', bids[j]);
                    }
					continue;
				}

                let s = obj.agent.unfilledOrdersProcess();                
            }

            for (let x = 0; x < asks.length; x++) {

                unFilledAsks.push(asks[x]);
                
				let obj = agentsBattery.find(function (obj) { 
					return obj.agentAccount === asks[x].address; 
				});

				if(!obj) {
                    if(debug) {
                        console.log('Asker not found simulation:bids<2asks<2', x, i);
                        console.log('For ask', asks[x]);
                    }
					continue;
				}

				obj.agent.charge(asks[x].amount);
            }
            			
            for (let j = 0; j < agentsBattery.length; j++) {
                agentsBattery[j].agent.historicalPrices[i] = 0; 
            }

            try {
                await clearMarket();
            } catch(err) {
                console.log('Error clearMarket, simulation:bids<2asks<2 ', err);
            }
        }
        

        dataToReturnApi.push(retData);
	}
	

    let agentBalanceAverage = new Array();

    
    let history = agentsBattery[0].agent.historicalPrices;
    let aggActualDemand =  new Array();
    let transactionCostBid = new Array();
    let transactionCostAsk = new Array();
    let transactionCostAvg = new Array();
    let transactionCost = new Array();
    let nationalGridBidsAggAmount= new Array();
    let nationalGridBidsAggGas = new Array();
    let nationalGridPurchases = new Array();
    let nationalGridTotalCost = new Array();
    
    
    let totalNumberTransactions = new Array();
    let successfulBidsAggAmount = new Array();
    let successfulBidsAggGas = new Array();
    let successfulBidsTotalCost = new Array();
    let totalExpenditureHourly = new Array();
    let totalExpenditure = new Array();

    //averages parameters (for each agent)
    let averageNumberTransactions = new Array();
    let averageNationalGridPurchases = new Array();




    let agent;

    let simulationCSV = new Array();
    let csvData = new Array();


    const sumPrices= history.reduce((a, b) => a + b, 0);

    //Calculating Parameters from simulation to plot
    //
    for (let i = 2184; i < 2232; i++) {

    // for (let i = 2184; i < 2188; i++) {

    
		let demand = new Array();
        let supply = new Array();
        let gasCostBids = new Array();
        let gasCostAsks = new Array();
        let nationalGridBidsGas = new Array();
        let successfulBidsGas = new Array();
      
        historicalPricesPlot[i] = convertWeiToDollars(
			agentsBattery[0].agent.historicalPrices[i], 
			WEI_IN_ETHER, 
			PRICE_OF_ETHER
		);


        for (let j = 0; j < agentsBattery.length; j++) {

            demand.push(agentsBattery[j].agent.historicalDemand[i].demand);
            if(j>=8)
                supply.push(agentsBattery[j].agent.historicalSupply[i].supply);
            
            for(let k = 0; k < agentsBattery[j].agent.bidHistory.length; k++) {
                if(agentsBattery[j].agent.bidHistory[k].timeRow == i){
                    gasCostBids.push(agentsBattery[j].agent.bidHistory[k].transactionCost);
                }
            }
            
            for(let z=0; z < agentsBattery[j].agent.askHistory.length; z++) {

                if(agentsBattery[j].agent.askHistory[z].timeRow == i){
                    gasCostAsks.push(agentsBattery[j].agent.askHistory[z].transactionCost);
                }
            }
            
            for(let k = 0; k < agentsBattery[j].agent.successfulBidHistory.length; k++) {
                if (agentsBattery[j].agent.successfulBidHistory[k].timeRow == i) {
                    successfulBidsGas.push(agentsBattery[j].agent.successfulBidHistory[k].transactionCost);
                }
            }
            
            for(let k=0; k < agentsBattery[j].agent.nationalGridPurchases.length; k++) {
                if (agentsBattery[j].agent.nationalGridPurchases[k].timeRow == i) {
                    nationalGridBidsGas.push(agentsBattery[j].agent.nationalGridPurchases[k].transactionCost);
                }
            }
        }

    
        if(gasCostBids.length > 0) {
            let bidCostDollars = convertArrayGasToDollars(gasCostBids, GASPRICE, WEI_IN_ETHER, PRICE_OF_ETHER);
            transactionCostBid[i] = bidCostDollars;
        }
        else if(gasCostBids.length == 0) {
            transactionCostBid[i] = 0;
        }

        if(gasCostAsks.length > 0) {
            let askCostDollars = await convertArrayGasToDollars(gasCostAsks, GASPRICE, WEI_IN_ETHER, PRICE_OF_ETHER);
            transactionCostAsk[i] = askCostDollars;
        }
        else if(gasCostAsks.length == 0) {
            transactionCostAsk[i] = 0;
        }
        
       
        let sumTransactions = nationalGridBidsGas.length + gasCostAsks.length + gasCostBids.length + successfulBidsGas.length;
        totalNumberTransactions.push(sumTransactions);

        // numbermarket = total - netional grid
        let numberMarketTransactions = gasCostAsks.length + gasCostBids.length + successfulBidsGas.length;
	  
		// accumulate demand and supply
        const sumDemand = demand.reduce((a, b) => a + b, 0);
        const sumSupply = supply.reduce((a, b) => a + b, 0);
   
        // aggregates demand and supply
        aggregatedDemand[i] = sumDemand;
        aggregatedSupply[i] = sumSupply;

		// create new csv entry
        let newCsvEntry = {
            time: i,
            agg_demand: aggregatedDemand[i],
            agg_supply: aggregatedSupply[i],
            historical_prices: historicalPricesPlot[i],
            no_total_transactions: totalNumberTransactions[i-2184],
            no_trades_market:  successfulBidsGas.length,
            no_market_transactions: numberMarketTransactions,
            no_nat_grid_transactions: nationalGridBidsGas.length,
           
		}
		// push to csv data
        csvData.push(newCsvEntry);
	}
	
	// write to output.csv file
    console.log(`writing results of simulation to csv file : ${outputFile}`);

	// var csvStream = csv.createWriteStream({ headers: true }),
	let csvStream = csvWriteStream();
    writableStream = fs.createWriteStream(outputFile);

    writableStream.on('finish', function () {
        console.log('DONE!');
    });
    
    csvStream.pipe(writableStream);
    for(let i = 0; i < csvData.length; i++) {
    	csvStream.write(csvData[i]);
	}
	
    csvStream.end();


    console.log('Returnning Data for API');
 
    return {
        data: dataToReturnApi,
        nationalGridAddress: nationalGridAddress,
        nationalGridPrice: NATIONAL_GRID_PRICE   
    };
};

async function getFiles() {
    console.log('readings files...');
    let householdHistoricData = new Array();
    
    for (i = 1; i <= 15; i++){
            householdHistoricData.push(
				await readCSV(`./dataset/house${i}.csv`)
			);
    }

    return {
		householdHistoricData
	};
}


async function createAgents(householdHistoricData, batteryCapacity, batteryBool) {
	
	console.log('Creating Agents...');

	// national grid agent
	let agentNationalGrid = new AgentNationalGrid();
	// battery household agents 
	let agents = new Array();

        for (let i = 1; i <= 15; i++) {
            if(i >= 8) {
                batteryBool = true;
			}

    		// create agent for each house
			agent = new Agent(batteryCapacity, batteryBool);
	        agentAccount = await agent.getAccount(i);
	     
	        await agent.loadSmartMeterData(
				householdHistoricData[i - 1], 	
				i								
			);

	        let newAgent = {
	            id: i,					
	            agent,					
	            agentAccount			
			}
			
	        agents.push(newAgent);      
        }
        
    return { 
		agents, 
		agentNationalGrid 
	};
}

async function getExchangeBids() {

	// variable declaration
    let bids = new Array();
    let asks = new Array();
    let bid = 0;
    let ask = 0;

	// get bids and ask count
    let bidsCount = await exchange.methods.getBidsCount().call();
    let asksCount = await exchange.methods.getAsksCount().call();   

    console.log("Number of bids Placed: " + bidsCount);
    console.log("Number of Asks Placed: " + asksCount);

    for (let i = 0; i <= bidsCount - 1 ; i++) {
		try {
			bid = await exchange.methods.getBid(i).call();
		} catch (err) {
			console.log('Error in getting bid, simulation: L507')
		}

		// get bid date
        let date = new Date(parseInt(bid[3]));
		date = date.toLocaleString();

		// TODO
        if(bid[0] === '0x0000000000000000000000000000000000000000')
        {
            if(debug) {
                console.log('Zero Bid', i, ' with ', bidsCount);
            }
            continue;
        }
			
		newBid = {
            price: parseInt(bid[1]),
            amount: parseInt(bid[2]),
            address: bid[0],
            date: date
		}
		
		// add to bids array
        bids.push(newBid);
    }
    for (let j = 0; j <= asksCount - 1; j++) {

        try {
            ask = await exchange.methods.getAsk(j).call();
        } catch(err){
            console.log('Error in getting ask, simlation:L468', err);
        }

        let date = new Date(parseInt(ask[3]));
        date = date.toLocaleString();

        if(ask[0] === '0x0000000000000000000000000000000000000000')
        {
            console.log('Zero Ask', i, ' with ', asksCount);
            continue;
        }
			
        newAsk = {
            price: parseInt(ask[1]),
            amount: parseInt(ask[2]),
            address: ask[0],
            date: date
        }
        asks.push(newAsk);
	}
	
	// return all bids and asks
    return { 
		bids, 
		asks 
	};
}

//decreasing amount
function sortByAmount(a, b) {
    if (a.amount === b.amount) {
        return 0;
    }
    else {
        return (a.amount > b.amount) ? -1 : 1;
    }
}

async function clearMarket() {
    let bidsCount = await exchange.methods.getBidsCount().call();
    let asksCount = await exchange.methods.getAsksCount().call();
    let accounts = await web3.eth.getAccounts();


    if(debug) {
        console.log('clearMarket()')
        console.log('bidsCount: ', bidsCount);
        console.log('asksCount: ', asksCount);
    }


    // await exchange.methods.clearBids().send({
    //     from: accounts[accounts.length - 2],
    //     gas: '200000000000'
    // });
    // await exchange.methods.clearAsks().send({
    //     from: accounts[accounts.length - 2],
    //     gas: '200000000000'
    // });

    await exchange.methods.clearMarket().send({
        from: accounts[accounts.length - 2],
        gas: '2000000'
    })

	// TODO: 19th account ki transactions
    // for (let i = bidsCount - 1; i >= 0; i--) {
    //     await exchange.methods.removeBid(i).send({
    //         from: accounts[accounts.length - 2],
    //         gas: '2000000'
    //     });
    //     bidsCount = await exchange.methods.getBidsCount().call();
    
    //     if(debug) {
    //         console.log('Bids: ', bidsCount);
    //     }
    // }
    // for (let i = asksCount - 1; i >= 0; i--) {
    //     await exchange.methods.removeAsk(i).send({
    //         from: accounts[accounts.length - 2],
    //         gas: '2000000'
    //     });
    //     asksCount = await exchange.methods.getAsksCount().call();
    
    //     if(debug) {
    //         console.log('Asks: ', asksCount);
    //     }
    // }
    
    bidsCount = await exchange.methods.getBidsCount().call();
    asksCount = await exchange.methods.getAsksCount().call();

    if(debug) {
        console.log('Market Cleared');
        console.log('bidsCount: ', bidsCount);
        console.log('asksCount: ', asksCount);
    }
}

async function matchBids(bid_index, ask_index, bids, asks, agentsBattery, intersection) {
	
	if (bids.length == 0 || asks.length == 0) {
		return { bids, asks, agentsBattery};
    }

    let obj = agentsBattery.find(function (obj) { 
		return obj.agentAccount === bids[bid_index].address; 
	});

	// if buyer wants more than seller
    if(bids[bid_index].amount - asks[ask_index].amount >= 0) {
        let remainder = bids[bid_index].amount - asks[ask_index].amount;
		let calcAmount = asks[ask_index].amount;		

        await obj.agent.sendFunds(intersection[1], calcAmount, asks[ask_index].address);

        let objSeller = agentsBattery.find(function (obj) { 
			return obj.agentAccount === asks[ask_index].address; 
		});

		// objSeller.agent.discharge(calcAmount);

		objSeller.agent.addSuccessfulAsk(calcAmount);

        bids[bid_index].amount = remainder;

        if(remainder === 0) {
            bids.splice(bid_index, 1);
		}
        asks.splice(ask_index, 1);
		
		// recursive call
        return (matchBids(bids.length-1, asks.length-1, bids, asks, agentsBattery, intersection));
	}
	// buyer needs less than than the giver
	else if(bids[bid_index].amount - asks[ask_index].amount < 0) {

        let remainder = asks[ask_index].amount - bids[bid_index].amount;
		let calcAmount = bids[bid_index].amount;
		
        await obj.agent.sendFunds(intersection[1], calcAmount, asks[ask_index].address);

        let objSeller = agentsBattery.find(function (obj) { return obj.agentAccount === asks[ask_index].address; });
		objSeller.agent.discharge(calcAmount);

        objSeller.agent.addSuccessfulAsk(calcAmount);

		asks[ask_index].amount = remainder;

        if(remainder == 0) {
            asks.splice(ask_index, 1);
		}
        bids.splice(bid_index, 1);
		
		// recursive call for remaining indexes
        return (matchBids(bids.length-1, asks.length-1, bids, asks, agentsBattery, intersection)); 
    }
}




module.exports = init;