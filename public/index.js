

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
	
	let ap = data.purchaseLogic.map((item, idx) => {

		return `
			<div class='col col-lg-4 col-md-6 col-sm-12'>

				<div class="card">
						<div class="card-body">
							<strong>House ${idx + 1}</strong>
						</div>
						<div class="card">
							<ul class="list-group list-group-flush">
							
								<li class="list-group-item">
									hasBattery: <span>${item.hasBattery}</span>
								</li>
								<li class="list-group-item">
									hasBattery: <span>${item.batteryPercentage}</span>
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

	printForTime(data.data[idx]);
}