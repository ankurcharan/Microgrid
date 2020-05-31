const Web3 = require('web3');
const config = require('./config');
const { debug } = config;

const web3 = new Web3 (
	new Web3.providers.HttpProvider(`${config.provider}`)
);

//compiled contract instance
const exchange = require('./exchange');

// Units of energy in database = kWh
// amount variable in code has energy = Wh unit.
// National Grid Price = $0.1 / kWh

class AgentNationalGrid {
    constructor() {
    	// $0.1 per kWh
        this.national_GridPrice = 0.1;
    }

    async getAccount(idx) {
        let accts = await web3.eth.getAccounts();
        this.ethereum_Address = accts[idx];
        return this.ethereum_Address;
    }
}

// everyone connects to Agent
class Agent{

	// batteryBool 			
	// batteryCapacity 		
    constructor(batteryCapacity, batteryBool) {

        this.timeRow = 0;
        this.balance =0;
        this.householdAddress = 0;
        this.household = 0;
        this.nationalGridAddress = 0;
        this.hasBattery = batteryBool;
        // $250 = 1 ether
        this.priceOfEther = 250;
        this.WEI_IN_ETHER = 1000000000000000000;
        this.balanceHistory = new Array();

        this.batteryCapacity = batteryCapacity;
        this.amountOfCharge = batteryCapacity;                       
        this.excessEnergy = 0;
        this.shortageEnergy = 0;
        this.currentDemand = 0;
        this.currentSupply = 0; 

        // last days data
        this.historicalDemand = new Array();
        this.historicalSupply = new Array();
        this.historicalPrices =  new Array();

        // history
        this.successfulBidHistory = new Array();
        this.successfulAskHistory = new Array();

        // maintain data 
        this.nationalGridPurchases = new Array();
        
        // jo b data hra h 
        this.bidHistory = new Array();
        this.askHistory = new Array();


        this.householdID = 0;
        this.nationalGridPrice = 0.1;   
    }

    async loadSmartMeterData(historicData, householdID) {

        this.householdID = householdID;
        
        for (i = 1; i < historicData.length - 1; i++){
            let currentDemand = {
                time: historicData[i][0], 
                demand: parseFloat(historicData[i][1]) * 1000 			// kWh to Wh
            }

            let currentSupply = {
                time: historicData[i][0], 
                supply: parseFloat(historicData[i][2]) * 1000
			}
			
            this.historicalDemand.push(currentDemand);
            this.historicalSupply.push(currentSupply);
        }

        return true;
    }

    async getAccount(index) {
        let accounts = await web3.eth.getAccounts();
        this.ethereumAddress = accounts[index];
        return this.ethereumAddress;
    }

    async getAgentBalance() {
        let balance = await web3.eth.getBalance(this.ethereumAddress);
        
        this.balance = balance;
        return balance;
    }

    async setAgentBalance() {
        let balance = 0;
        balance = await web3.eth.getBalance(this.ethereumAddress);
        this.balanceHistory.push(balance);
    }

    async setNationalGrid(nationalGridPrice, nationalGridAddress) {
    	// $250 = 1 ether
        let nationalGridPriceEther = nationalGridPrice / 250; 
        let nationalGridPriceWei = await web3.utils.toWei(`${nationalGridPriceEther}`, 'ether');
        this.nationalGridPrice = nationalGridPriceWei;
        this.nationalGridAddress = nationalGridAddress;
    }

    addSuccessfulAsk(amount) {

        let date = (new Date).getTime();
        let newReceivedTransaction = {
            amount: amount,
            date: date,
            timeRow: this.timeRow
        }
        this.successfulAskHistory.push(newReceivedTransaction);
    }

    async buyFromNationalGrid(amount) {
	// buys from national grid, amount units of enerygy

        console.log('national_GridPrice:', this.nationalGridPrice);
		let amountTransaction = (this.nationalGridPrice) * (amount / 1000);



        // **********************************
        // RETURNING FOR API
        let returnData = {};
        returnData.task = 'Buying From National Grid';
        returnData.nationalGridPrice = this.nationalGridPrice;
        // returnData.amountTransaction = amountTransaction;
        // **********************************

        amountTransaction = parseInt( + amountTransaction.toFixed(18));
        
        // **********************************
        // RETURNING FOR API
        returnData.amountTransaction = amountTransaction;
        // **********************************
		
        let transactionReceipt = null;
        try{

            if(debug) {
                console.log();
                console.log('Buying from National grid');
                console.log('addresss: ', this.ethereumAddress);
                console.log('to: ', this.nationalGridAddress);
                console.log('amount: ', amount);
                console.log('amountTransaction: ', amountTransaction);
                console.log();
            }

            // **********************************
            // RETURNING FOR API
            returnData.amount = amount;
            returnData.nationalGridAddress = this.nationalGridAddress;
            // **********************************


			// send funds to national grid
            transactionReceipt = await web3.eth.sendTransaction({
                                                    to: this.nationalGridAddress,
                                                    from: this.ethereumAddress,
                                                    value: amountTransaction,
                                                    gas: '2000000'
                                                });

        } catch (err) {

			console.log('Cannot buy from national grid, prosumer:buyFromNationalGrid() ', err);
			return null;
        };

		// current timestamp
        let date = (new Date).getTime();

		// create transaction object
        let newTransactionReceipt = {
            transactionReceipt: transactionReceipt,				
            transactionCost: transactionReceipt.gasUsed,		
            transactionAmount: amountTransaction,				
            date: date,											
            quantity: amount,									
            timeRow: this.timeRow								
		}
		
		this.nationalGridPurchases.push(newTransactionReceipt);
		
		this.charge(amount);
        
        // **********************************
        // RETURNING FOR API
        returnData.receipt = transactionReceipt;

        return returnData;
 
    }

    async sendFunds(price, amount, receiver) {

		let amountTransaction = price * (amount / 1000);
        amountTransaction = parseInt(amountTransaction);		// assuming asmountTransaction is in Wei's

		let transactionReceipt = null;
        
        try {
            transactionReceipt = await web3.eth.sendTransaction({
				to: receiver, 
				from: this.ethereumAddress, 
				value: amountTransaction
			});
        } catch (err) {
            console.log('error in sending funds, prosume:L230', err);
			return null;
		}
		
        let date = (new Date).getTime();
        let newTransactionReceipt = {
            transactionReceipt: transactionReceipt,
            transactionCost: transactionReceipt.gasUsed,
            transactionAmount: amountTransaction,
            timeRow: this.timeRow,					
            quantity: amount,
            receiver: receiver,
            date: date
		}
		
        this.successfulBidHistory.push(newTransactionReceipt);
		this.charge(amount);

        return transactionReceipt;
    }

    convertWeiToDollars(weiValue) {
        let costEther = weiValue / this.WEI_IN_ETHER;
        let costDollars = costEther * ( + this.priceOfEther.toFixed(18));
        costDollars = + costDollars.toFixed(3);
        return costDollars;
    }

    async placeBuy (price, amount, date) {

        let returnData = {};
        returnData.type  = 'Placing Bid';
        returnData.address = this.ethereumAddress;
        returnData.amount = amount;
        returnData.price = price;

		let transactionReceipt = null;
        try {

            if(debug) {
                console.log('Placing Bid');
                console.log("address: ", this.ethereumAddress);
                console.log('amount: ', amount);
                console.log('price: ', price);
            }

            transactionReceipt = await exchange.methods.placeBid(
													Math.floor(price), 
													Math.floor(amount), 
													date)
												.send({
													// from current agents address
													from: this.ethereumAddress,
													gas: '3000000'
												});
        } catch(err) {

            console.log('Cannot place bid - prosumer:placeBuy() ', err);
			return false;
		}
		
        let newBid = {
            address: this.ethereumAddress,						
            price: price,										
            amount: amount,										
            date: date,											
            timeRow: this.timeRow,								
            transactionCost: transactionReceipt.gasUsed		
		}
		
        this.bidHistory.push(newBid);

        returnData.transactionReceipt = transactionReceipt;
        
        return returnData;
    }

    async placeAsk(price, amount, date) {

        let returnData = {};
        returnData.price = price;
        returnData.amount = amount;
        returnData.date = date;

		let transactionReceipt = null;
		try {

            transactionReceipt = await exchange.methods.placeAsk(
				Math.floor(price), 
				Math.floor(amount), 
				date
			).send({
                from: this.ethereumAddress,
                gas: '3000000'
			});
			
        } catch(err) {
			console.log('Error in placeAsk, prosumer:L281', err);
			return false;
		}
		
        let newAsk = {
            address: this.ethereumAddress,
            price: price,
            amount: amount,
            date: date,
            timeRow: this.timeRow,
            transactionCost: transactionReceipt.gasUsed
        }
		
		// main ask history record
		this.askHistory.push(newAsk);
        
        returnData.action = 'Place Ask';
        returnData.receipt = transactionReceipt;
        
        return returnData;
    }

	// charges your battery
    charge(amount) {

        this.amountOfCharge += amount;
		if(this.amountOfCharge > this.batteryCapacity) {
			// 100% charged
            this.amountOfCharge = this.batteryCapacity;
		}
    }

    discharge(amount){
        this.amountOfCharge -= amount;
        if(this.amountOfCharge <= 0) {
            this.amountOfCharge = 0;
        }
    }

    setCurrentTime(row) {
        this.timeRow = row;
	}

    async unfilledOrdersProcess() {

        let ret = {};

        let demand = this.historicalDemand[this.timeRow].demand;
        let supply = this.historicalSupply[this.timeRow].supply;
        
        ret.demand = demand;
        ret.supply = supply;
        
		let shortageOfEnergy = demand;


        if(this.hasBattery)
            shortageOfEnergy = demand - supply;

        ret.hasBattery = this.hasBattery;
        ret.shortageOfEnergy = shortageOfEnergy;

        let s = await this.buyFromNationalGrid(shortageOfEnergy);
        
        ret.buyFromNationalGrid = s;

        return ret;
    }

    calculateYesterdayAverage() {
        if (this.timeRow - 24 <= 0) {
            return this.timeRow - 24;
        }

		// get the day
        let scaledTime = (this.timeRow - 24) / 24;
        let startOfDay = Math.floor(scaledTime) * 24;
		let endOfDay = startOfDay + 24;

        let sumPrices = 0;
        for (let i = startOfDay; i <= endOfDay; i++) {
            sumPrices += this.historicalPrices[i]
		}
		
		// returns avergage of yesterdays historical prices
        return sumPrices / 24; 

    }

    async purchaseLogic() {

        if(debug) {
            console.log('Purchase Logic: ', this.ethereumAddress, ": ", this.timeRow);
        }

        let demand = this.historicalDemand[this.timeRow].demand;
        let supply = this.historicalSupply[this.timeRow].supply;

        let excessEnergy = null;
        let shortageOfEnergy = null;
        let time = (new Date()).getTime();
		let price = 0;
		let bidsCount = 0;
        let bid = 0;
        let asksCount = 0;
        let ask = 0;
		
        if(supply >= demand) {
            excessEnergy = supply - demand;
        }
        else if(supply < demand) {
            shortageOfEnergy = demand - supply;
        }

        if(debug) {
            console.log('excessEnergy: ', excessEnergy);
            console.log('shortageOfEnergy: ', shortageOfEnergy);
            console.log('Battery: ', this.hasBattery);
        }

        // **************************************************
        // RETURNING TO API
        let returnData = {};
        // returnData.address = this.ethereumAddress;
        returnData.supply = supply;
        returnData.demand = demand;
        if(excessEnergy)
            returnData.excessEnergy = excessEnergy;
        if(shortageOfEnergy)
            returnData.shortageEnergy = shortageOfEnergy;
        returnData.hasBattery = this.hasBattery;
        // **************************************************

        if(this.hasBattery === true) {

            if(excessEnergy !== null) {
			   
				// if less than 50%, to use yourself
                if (this.amountOfCharge <= 0.5 * this.batteryCapacity) {

                    let per = (this.amountOfCharge/this.batteryCapacity) * 100;
					console.log('charging < 50');
                    this.charge(excessEnergy);

                    // **************************************************
                    // RETURNING TO API
                    returnData.batteryPercentage = per;
                    returnData.action = 'Battery Charged';
                    // **************************************************
                }
				// if battery is 50% to 80%
                else if ((this.amountOfCharge > 0.5 * this.batteryCapacity) && (this.amountOfCharge < 0.8 * this.batteryCapacity)) {

                    bidsCount = await exchange.methods.getBidsCount().call();
                    let per = (this.amountOfCharge/this.batteryCapacity) * 100;
                    // **************************************************
                    // RETURNING TO API
                    returnData.batteryPercentage = per;
                    returnData.bidsCount = bidsCount;
                    // **************************************************
                    
                    if(debug) {
                        console.log('Battery: 50-80%');
                        console.log('Bids Count: ', bidsCount);
                    }
                    
					if(bidsCount > 0) {

						// get last bid
                        bid = await exchange.methods.getBid(bidsCount - 1).call();

                        if(this.historicalPrices[this.timeRow - 24] !== null || this.historicalPrices[this.timeRow - 24] !== undefined) {
							
							let averagePrice = this.calculateYesterdayAverage();
														
							if(debug) {
                                console.log('Ask or charge');
                                console.log('yesterdayAverage: ', averagePrice);
                                console.log('lastBidPrice: ', bid[1]);
                            }

                            // **************************************************
                            returnData.yesterdayAverage = averagePrice;
                            returnData.lastBidPrice = bid[1];
                            // **************************************************

							if(bid[1] >= averagePrice) {
								console.log('Placing ask from: ', this.ethereumAddress);
								let success = await this.placeAsk(bid[1], Math.floor(excessEnergy), time);
								
								if(typeof(success) === 'boolean' && success === false) {
									// error occured
                                    console.log('Could not place Ask, prosumer:purchaseLogic,bidsCount>0');
                                    console.log('Ask Error');
									return returnData;
                                }
                                
                                returnData.task = 'Ask Placed';
							}
							// if last bids price is less than the yesterday's average price 
                            else if(bid[1] < averagePrice) {
                                
                                returnData.task = 'Charge Battery';
								this.charge(excessEnergy);
                            }
                        }
                        else
                        {
							let success = await this.placeAsk(
								bid[1], 
								Math.floor(excessEnergy), 
								time
							);
							
							if(typeof(success) === 'boolean' && success === false) {
								// error occured
								console.log('Could not place Ask, prosumer:purchaseLogic()bid > 0 else');
                                console.log('Place Ask Error');
                                return returnData;
                            }
                            

                            returnData.task = 'Ask Placed';
                        }
                    }
                    else {

                        if(debug) {
                            console.log('Charged Own Battery')
                        }

                        returnData.task = 'Charged Battery';
						this.charge(excessEnergy);
                    }
				}
				// if battery is more than 80%
                else if (this.amountOfCharge >= this.batteryCapacity * 0.8 ) {

                    let per = (this.amountOfCharge/this.batteryCapacity) * 100;
                    
                    if(debug) {
                        console.log('Battery > 80%');
                    }

					// TODO - why energy multiplied by 100
					excessEnergy *= 100;

					// random price generated 
                    price = generateRandomPriceInDollar();
					price = await this.convertToWei(price);
					
					// ask place for this pricr
                    let success = await this.placeAsk(
						price, 
						Math.floor(excessEnergy), 
						time
					);

                    if(typeof(success) === 'boolean' && success === false) {
						console.log('Could not place Ask, prosumer:L493');
						return;
                    }
                    
                    returnData.batteryPercentage = per;
                    returnData.task = 'Ask Placed';
                }
            }
            else if (shortageOfEnergy !== null) {

				// if battery is more than 50%
                if (this.amountOfCharge >= 0.5 * this.batteryCapacity) {
                    
                    let per = (this.amountOfCharge/this.batteryCapacity) * 100;

                    if(debug) {
                        console.log();
                        console.log('Battery > 50%');
                        console.log('Discharging: ', shortageOfEnergy);
                        console.log();
                    }

                    returnData.batteryPercentage = per;
                    returnData.task = 'Battery Discharged';

                    this.discharge(shortageOfEnergy);
				}
				// if battery is between 20% to 50%
                else if(this.amountOfCharge < 0.5 * this.batteryCapacity && this.amountOfCharge > 0.2 * this.batteryCapacity){
                    
                    let per = (this.amountOfCharge/this.batteryCapacity) * 100;

                    let price = generateRandomPriceInDollar();
                    let amount = this.formulateAmount();

                    if(debug) {
                        console.log('Battery 20-50%');
                        console.log('formulateAmount: ', amount);
				    }
                    if(typeof(amount) === 'boolean' && amount === false) {
                        return;
                    }
					
					// convert random price to dollar
                    price = await this.convertToWei(price);
                    
        			// place the bid
					let success = await this.placeBuy(
						Math.floor(price), 
						Math.floor(amount), 
						time
                    );
                    
					if(typeof(success) === 'boolean' && success === false) {
						// error occured
                        console.log('Could not place buy, pronsumer:purchaseLogic() Battery@20-50');
                        
                        console.log('Place Buy Error');
                        returnData.task = 'Place Buy Error';
						return returnData;
					}

                    returnData.batteryPercentage = per;
                    returnData.task = 'Place Bid';
                }
                else if (this.amountOfCharge <= 0.2 * this.batteryCapacity) {

                    let per = (this.amountOfCharge/this.batteryCapacity) * 100;

                    if(debug) {
                        console.log('Battery < 20%, buying shortage from national grid');
                    }

                    await this.buyFromNationalGrid(0.5 * this.batteryCapacity);

                    returnData.batteryPercentage = per;
                    returnData.task = 'Buy From National Grid';
                }   
            }  
		}
		else {

			if(shortageOfEnergy === null || shortageOfEnergy === undefined) {

                returnData.task = 'Nothing';
                return returnData;
            }
				

			shortageOfEnergy = demand;
			
            price = generateRandomPriceInDollar();
			price = await this.convertToWei(price);

            let success = await this.placeBuy(price, shortageOfEnergy, time); 
			if(typeof(success) === 'boolean' && success === false) {
				// error occured
                console.log('Could not place Ask, purchaseLogic:noBattery');
                console.log('No Battery, Place Buy Error');
				return returnData;
            }
            
            returnData.batteryPercentage = 0;
            returnData.task = 'Place Bid';
		}

        if(debug) {
            console.log();
            console.log();    
        }

        console.log(returnData);
		return returnData;
	}

               

    formulateAmount() {
       
        let timeInterval = 10;
        let supplySum = 0;
        let demandSum = 0;
		let energyNeeded = 0;

        for(let i = this.timeRow ; i < this.timeRow + timeInterval; i++) {
            supplySum += this.historicalSupply[i].supply;
            demandSum += this.historicalDemand[i].demand;
		}

        if(supplySum - demandSum >= 0) {
            return false;
        }
        if(supplySum - demandSum < 0) {
            energyNeeded = Math.abs(supplySum - demandSum);
        }

        if(this.amountOfCharge + energyNeeded >= this.batteryCapacity) {
            energyNeeded = this.batteryCapacity - this.amountOfCharge;
        }
        return energyNeeded;
    }

	// converts price in dollar to Wei
    async convertToWei(price) {

        let ethers = (price / this.priceOfEther);
		ethers = ethers.toFixed(18);
		
        try {
            price = await web3.utils.toWei(ethers, 'ether');
        } catch(err) {
			console.log('Error - prosumer.js:convertToWei() ', err);
		};

        price = parseInt(price);
		
		// returns price in Wei
		return price;
	}
}

function generateRandomPriceInDollar() {
    // return Math.random() * 0.03 + 0.04;
    return 0.1;
}

module.exports = {
	Agent,
	AgentNationalGrid
};