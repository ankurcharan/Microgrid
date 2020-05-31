

let time = null;
let data = null;

window.addEventListener('load', function() {

	$.ajax({
		url: 'http://localhost:9000/data',
		type: 'GET',
		success: function(res, status) {
			if(status === 'success') {
				// console.log(res);
				data = res;
				time = 0
				printToScreen(0);
				console.log(data)
			}
		},
		failure: function(err, status) {
			console.log(err);
		}
	})
})


function printForTime(data) {

	$('#time').children('span').text(data.time);

	let icon1 = "&#xf244;"
	let icon2 = "&#xf243;"
	let icon3 = "&#xf242;"
	let icon4 = "&#xf241;"
	let icon5 = "&#xf240;"
	let displayIcon;
	
	let ap = data.purchaseLogic.map((item, idx) => {

		console.log(item.batteryPercentage)

		if(item.batteryPercentage == 0)
		displayIcon = icon1
		else if(item.batteryPercentage > 0 && item.batteryPercentage <= 20)
		displayIcon = icon2
		else if(item.batteryPercentage > 20 && item.batteryPercentage <= 50)
		displayIcon = icon3
		else if(item.batteryPercentage > 50 && item.batteryPercentage <= 90)
		displayIcon = icon4
		else
		displayIcon = icon5

		return `
			<div class='col col-lg-4 col-md-6 col-sm-12'>

				<div class="card">
						<div class="card-body">
							<strong>House ${idx + 1}</strong>
						</div>
						<div class="card">
							<ul class="list-group list-group-flush">
							
								<li class="list-group-item">
									Indicator : <span class = "fa">${displayIcon}</span>
								</li>
								<li class="list-group-item">
									Battery(kWh) : <span class = "fa">${item.batteryPercentage}</span>
								</li>
								<li class="list-group-item">
									Demand(kWh) : <span>${item.demand.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Supply(kWh) : <span>${item.supply.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Task : <span>${item.task}</span>
								</li>
								<li class="list-group-item">
									<button id="houseDetail" type="button" class="btn btn-dark" onclick="houseDetail(${idx})"> Detail </button>
								</li>
							</ul>
						</div>
					</div>

			</div>
		`
	});

	$('#houseData').html(ap);

	$('#bidLength').text(data.bidLength);
	$('#askLength').text(data.askLength);
}

function previousTime() {

	if(time == 0)
		return;

	time = time - 1;
	printToScreen(time);
}
function nextTime() {
	if(time == data.data.length) 
		return;

	time = time + 1;

	printToScreen(time);
}

function printToScreen(idx) {

	$('#nationalGridAddress').text(data.nationalGridAddress);
	$('#nationalGridPrice').text('$' + data.nationalGridPrice);
	$('#houseNumber').hide();
	$('#dashboard').hide();

	printForTime(data.data[idx]);
}

let i = 0;

function runSimulation() {
	
	setTimeout(function() {
		printToScreen(i);
		i++;
		if(i == data.data.length)
		return;
		else
		runSimulation();
	},1000)
}

function printForHouse(data,houseIndex) {

	$('#time').children('span').text(houseIndex);

	let icon1 = "&#xf244;"
	let icon2 = "&#xf243;"
	let icon3 = "&#xf242;"
	let icon4 = "&#xf241;"
	let icon5 = "&#xf240;"
	let displayIcon;
	
	let ap = data.map((item, idx) => {
		
		let houseData = item.purchaseLogic[houseIndex]

		if(houseData.batteryPercentage == 0)
		displayIcon = icon1
		else if(houseData.batteryPercentage > 0 && houseData.batteryPercentage <= 20)
		displayIcon = icon2
		else if(houseData.batteryPercentage > 20 && houseData.batteryPercentage <= 50)
		displayIcon = icon3
		else if(houseData.batteryPercentage > 50 && houseData.batteryPercentage <= 90)
		displayIcon = icon4
		else
		displayIcon = icon5

		return `
			<div class='col col-lg-4 col-md-6 col-sm-12'>

				<div class="card">
						<div class="card-body">
							<strong>Time ${item.time}</strong>
						</div>
						<div class="card">
							<ul class="list-group list-group-flush">
							
								<li class="list-group-item">
									Indicator : <span class = "fa">${displayIcon}</span>
								</li>
								<li class="list-group-item">
									Battery(kWh) : <span class = "fa">${houseData.batteryPercentage}</span>
								</li>
								<li class="list-group-item">
									Demand(kWh) : <span>${houseData.demand.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Supply(kWh) : <span>${houseData.supply.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Task : <span>${houseData.task}</span>
								</li>
							</ul>
						</div>
					</div>

			</div>
		`
	});

	$('#houseData').html(ap);
}

function houseDetail(idx) {

	$('#nationalGridAddress').text(data.nationalGridAddress);
	$('#nationalGridPrice').text('$' + data.nationalGridPrice);
	
	$('#time').hide();
	$('#dashboard').show();
	$('#houseNumber').show();
	$('#houseNumber').children('span').text(idx+1);

	printForHouse(data.data,idx);
}

function showDashboard() {

	location.reload();
}