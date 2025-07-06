function load(authHeaders) {
	function findDictIndex(id) {
		return window.imageDict.findIndex(item => item.id === id);
	}

	async function fetchWinningItem() {
		const caseId = getCaseId();
		if (!caseId) return;

		const response = await fetch(
			`https://jackhanmacsgolkgame.pythonanywhere.com/en/cases/${caseId}/open/`,
			{
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					...authHeaders
				}
			}
		);

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.detail || data.error || 'Не удалось открыть кейс');
		}

		return data.item;
	}

	const imageDict = window.imageDict;

	function populateBoxes() {
		var boxes = $('#boxes');
		boxes.empty();
		imageDict.forEach(item => {
			boxes.append(
				"<li><img src='" + item.url + "' alt='" + item.id + "'></li>"
			);
		});
	}

	function start() {
		var boxed = 3;
		var righ = 0;
		var speed = Math.floor(Math.random() * -4) + 25;
		var delbox = 164;

		$('button').css('opacity', '0.5');
		$('.mainbutt').prop('disabled', true);

		async function animated() {
			var imgs = await fetchWinningItem();
			var index = findDictIndex(imgs.id);
			var child3 = $('.tape:nth-child(3) img');
			var firS = $('.tape:first-child');
			var cons = righ - delbox;

			if (righ >= delbox) {
				firS.remove();
				$('#boxes').append(
					"<li class='tape'><img src='" +
						imageDict[index].url +
						"' alt='" +
						imgs.id +
						"' class='tape-img'></li>"
				);
				righ = cons + speed;
				$('.tape').css('right', righ + 'px');
				boxed++;
			} else {
				if (speed > 12) {
					speed -= 0.1;
				} else if (speed > 7) {
					speed -= 0.02;
				} else {
					speed -= 0.01;
				}
				righ += speed;
				$('.tape').css('right', righ + 'px');
			}
			if (speed <= 0) {
				$('.tape').animate({ right: '95px' }, 2400);
				$('.addimg img').attr(
					'src',
					imageDict[index].url + 'img/20181001_' + child3.attr('alt') + '.png'
				);
				setTimeout(swi, 2500);
			} else {
				requestAnimationFrame(animated);
			}
		}

		requestAnimationFrame(animated);
	}

	function swi() {
		var nnu = $('.tape:nth-child(4) img').attr('alt');
		console.log(nnu, 'nnu');
		var winData = imageDict[nnu];

		$('#loadingSpinner').hide();
		$('#loadingText').hide();

		if (winData) {
			$('#winImage').attr('src', winData.url);
			$('#winText').html(
				'<strong>' + winData.name + '</strong><br>Цена: ' + winData.price
			);

			$('#overlay').fadeIn();
			$('#winModal').fadeIn();
		}
		$('#closeWinBtn').on('click', function () {
			$('#overlay').fadeOut();
			$('#winModal').fadeOut();
		});
		$('#restartButton').prop('disabled', false).css('opacity', '1').show();
	}

	function startGame() {
		$('#startImage').hide();
		$('#main').show();

		$('#startButton').hide();
		$('#restartButton').hide();
		$('#loadingSpinner').show();
		$('#loadingText').show();

		start();
	}

	$(function () {
		$('span').click(function () {
			$('.opn').toggle(300);
		});
		$('.close,.winbutt').click(function () {
			$('.blscreen').toggle(400);
		});
		populateBoxes();
	});
	function startGame() {
		$('#startImage').hide();
		$('#main').show();

		$('#startButton').hide();
		$('#restartButton').hide();
		$('#loadingSpinner').show();
		$('#loadingText').show();

		start();
	}
	$('#startButton').on('click', startGame);
	$('#restartButton').on('click', startGame);
}
