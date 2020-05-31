

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
			}
		},
		failure: function(err, status) {
			console.log(err);
		}
	})
})


function printForTime(data) {
	console.log('time', data);

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
									hasBattery: <span class = "fa">${displayIcon}</span>
								</li>
								<li class="list-group-item">
									hasBattery: <span class = "fa">${item.batteryPercentage}</span>
								</li>
								<li class="list-group-item">
									Demand: <span>${item.demand.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Supply: <span>${item.supply.toFixed(3)}</span>
								</li>
								<li class="list-group-item">
									Task: <span>${item.task}</span>
								</li>
								<li class="list-group-item">
									<button id="houseDetail" type="button" class="btn btn-dark" onclick="houseDetail()"> Detail </button>
								</li>
							</ul>
						</div>
					</div>

			</div>
		`
	});

	$('#houseData').html(ap);
}

function printToScreen(idx) {

	$('#nationalGridAddress').text(data.nationalGridAddress);
	$('#nationalGridPrice').text('$' + data.nationalGridPrice);

	printForTime(data.data[idx]);
}

