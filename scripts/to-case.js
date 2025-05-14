function getCaseId() {
	const urlParams = new URLSearchParams(window.location.search);
	return urlParams.get('id');
}

class CaseSpinner {
	static CONFIG = {
		animation: {
			minDuration: 10000,
			maxDuration: 14000,
			initialVelocity: 15,
			easingPower: 3,
			finalSlowdownDuration: 1500,
			fps: 60
		},
		items: {
			width: 170,
			repeats: 15,
			targetRepeatIndex: 8
		},
		randomness: {
			positionVariance: 40,
			winningItemOffset: 0.5
		}
	};

	static RARITY_TEXT = {
		common: 'Обычный',
		rare: 'Редкий',
		epic: 'Эпический',
		legendary: 'Легендарный'
	};

	static RARITY_COLORS = {
		common: '#8b9bb4',
		rare: '#4b69ff',
		epic: '#d32ce6',
		legendary: '#ffcc00'
	};

	constructor(caseData, items, headers) {
		this.case = caseData;
		this.items = items;
		this.headers = headers;

		this.spinnerEl = document.getElementById('caseSpinner');
		this.itemsEl = document.getElementById('spinnerItems');
		this.spinButton = document.getElementById('spinButton');
		this.resultContainer = document.getElementById('resultContainer');
		this.resultItem = document.getElementById('resultItem');
		this.resultRarity = document.getElementById('resultRarity');

		// Modal elements
		this.winModal = document.getElementById('winModal');
		this.winItemImage = document.getElementById('winItemImage');
		this.winItemName = document.getElementById('winItemName');
		this.winItemRarity = document.getElementById('winItemRarity');
		this.closeModalButton = document.getElementById('closeModalButton');

		this.isSpinning = false;
		this.hasSpun = false;
		this.itemsCount = 0;
		this.winningIndex = 0;
		this.animationId = null;
		this.currentPosition = 0;

		this.animationState = {
			startTime: 0,
			duration: 0,
			startPosition: 0,
			targetPosition: 0,
			finalPhase: false,
			finalPhaseStartTime: 0,
			finalPhaseStartPosition: 0
		};

		this.init();
	}

	init() {
		this.generateItems();
		this.attachEventListeners();
	}

	generateItems() {
		this.itemsEl.innerHTML = '';
		this.itemsCount = 0;

		for (let i = 0; i < CaseSpinner.CONFIG.items.repeats; i++) {
			this.items.forEach(item => {
				const itemEl = this.createItemElement(item);
				this.itemsEl.appendChild(itemEl);
				this.itemsCount++;
			});
		}

		this.resetPosition();
	}

	createItemElement(item) {
		const itemEl = document.createElement('div');
		itemEl.className = `item ${item.rarity}`;

		const imageContainer = document.createElement('div');
		imageContainer.className = 'item-image-container';
		const img = document.createElement('img');
		img.src = item.image;
		img.alt = item.name;
		img.className = 'item-image';

		const nameEl = document.createElement('div');
		nameEl.className = 'item-name';
		nameEl.textContent = item.name;

		const rarityEl = document.createElement('div');
		rarityEl.className = 'item-rarity';
		rarityEl.textContent = CaseSpinner.RARITY_TEXT[item.rarity];

		imageContainer.appendChild(img);
		itemEl.appendChild(imageContainer);
		itemEl.appendChild(nameEl);
		itemEl.appendChild(rarityEl);

		return itemEl;
	}

	attachEventListeners() {
		this.spinButton.addEventListener('click', () => this.spin());
		this.closeModalButton.addEventListener('click', () => this.closeModal());
		window.addEventListener('resize', () => {
			if (!this.isSpinning) {
				this.resetPosition();
			}
		});
	}

	resetPosition() {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}

		this.itemsEl.style.transition = 'none';
		this.itemsEl.style.transform = 'translateX(0)';
		this.currentPosition = 0;

		const previousWinner = document.querySelector('.winner');
		if (previousWinner) {
			previousWinner.classList.remove('winner');
		}

		this.resultContainer.classList.remove('show');
	}

	async spin() {
		if (this.isSpinning) return;

		this.isSpinning = true;
		this.spinButton.disabled = true;
		this.resultContainer.classList.remove('show');
		this.resetPosition();

		const caseId = getCaseId();

		try {
			const response = await fetch(
				`https://jackhanmacsgolkgame.pythonanywhere.com/en/cases/${caseId}/open/`,
				{
					method: 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json', ...this.headers }
				}
			);

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.detail || data.error || 'Не удалось открыть кейс');
			}

			const winningItemId = data.item.id;
			const itemIndex = this.items.findIndex(item => item.id === winningItemId);
			if (itemIndex === -1) {
				throw new Error('Выигрышный предмет не найден в списке кейса');
			}

			this.winningIndex =
				CaseSpinner.CONFIG.items.targetRepeatIndex * this.items.length +
				itemIndex;

			const spinnerRect = this.spinnerEl.getBoundingClientRect();
			const spinnerCenter = spinnerRect.width / 2;

			const randomOffset = this.getRandomNumber(
				-CaseSpinner.CONFIG.randomness.positionVariance,
				CaseSpinner.CONFIG.randomness.positionVariance
			);

			const itemOffset =
				CaseSpinner.CONFIG.items.width *
				CaseSpinner.CONFIG.randomness.winningItemOffset;
			const targetPosition =
				-(this.winningIndex * CaseSpinner.CONFIG.items.width) +
				spinnerCenter -
				itemOffset +
				randomOffset;

			this.animationState = {
				startTime: performance.now(),
				duration: this.getRandomNumber(
					CaseSpinner.CONFIG.animation.minDuration,
					CaseSpinner.CONFIG.animation.maxDuration
				),
				startPosition: 0,
				targetPosition: targetPosition,
				finalPhase: false,
				finalPhaseStartTime: 0,
				finalPhaseStartPosition: 0
			};

			this.animationId = requestAnimationFrame(this.animate.bind(this));
		} catch (error) {
			alert(error.message);
			this.isSpinning = false;
			this.spinButton.disabled = false;
		}
	}

	animate(currentTime) {
		const state = this.animationState;
		const elapsed = currentTime - state.startTime;
		let progress = Math.min(elapsed / state.duration, 1);

		if (state.finalPhase) {
			const finalElapsed = currentTime - state.finalPhaseStartTime;
			const finalProgress = Math.min(
				finalElapsed / CaseSpinner.CONFIG.animation.finalSlowdownDuration,
				1
			);
			const easedFinalProgress = this.easeOutQuad(finalProgress);

			this.currentPosition =
				state.finalPhaseStartPosition +
				(state.targetPosition - state.finalPhaseStartPosition) *
					easedFinalProgress;
		} else {
			const easedProgress = this.customEaseOut(progress);
			this.currentPosition =
				state.startPosition +
				(state.targetPosition - state.startPosition) * easedProgress;

			if (progress >= 0.85 && !state.finalPhase) {
				state.finalPhase = true;
				state.finalPhaseStartTime = currentTime;
				state.finalPhaseStartPosition = this.currentPosition;
			}
		}

		this.itemsEl.style.transform = `translateX(${this.currentPosition}px)`;

		if (
			progress < 1 ||
			(state.finalPhase &&
				currentTime - state.finalPhaseStartTime <
					CaseSpinner.CONFIG.animation.finalSlowdownDuration)
		) {
			this.animationId = requestAnimationFrame(this.animate.bind(this));
		} else {
			this.animationComplete();
		}
	}

	animationComplete() {
		const allItems = document.querySelectorAll('.item');
		const winnerItem = allItems[this.winningIndex];

		if (winnerItem) {
			winnerItem.classList.add('winner');
			const winnerName = winnerItem.querySelector('.item-name').textContent;
			const winnerImage = winnerItem.querySelector('.item-image').src;
			const winnerRarity = Array.from(winnerItem.classList).find(cls =>
				['common', 'rare', 'epic', 'legendary'].includes(cls)
			);

			// Update result container (for backward compatibility)
			this.resultItem.textContent = winnerName;
			this.resultItem.style.color = CaseSpinner.RARITY_COLORS[winnerRarity];
			this.resultRarity.textContent = CaseSpinner.RARITY_TEXT[winnerRarity];
			this.resultRarity.style.color = CaseSpinner.RARITY_COLORS[winnerRarity];
			this.resultRarity.style.borderColor =
				CaseSpinner.RARITY_COLORS[winnerRarity];

			// Update and show modal
			this.winItemImage.src = winnerImage;
			this.winItemName.textContent = winnerName;
			this.winItemName.style.color = CaseSpinner.RARITY_COLORS[winnerRarity];
			this.winItemRarity.textContent = CaseSpinner.RARITY_TEXT[winnerRarity];
			this.winItemRarity.style.color = CaseSpinner.RARITY_COLORS[winnerRarity];
			this.winItemRarity.style.borderColor =
				CaseSpinner.RARITY_COLORS[winnerRarity];

			setTimeout(() => {
				this.showModal();
			}, 1000);
		}

		this.isSpinning = false;
		this.animationId = null;
		this.spinButton.disabled = false;
	}

	showModal() {
		this.winModal.classList.add('show');
	}

	closeModal() {
		this.winModal.classList.remove('show');
		this.resetPosition();
	}

	customEaseOut(t) {
		return 1 - Math.pow(1 - t, CaseSpinner.CONFIG.animation.easingPower);
	}

	easeOutQuad(t) {
		return 1 - (1 - t) * (1 - t);
	}

	getRandomNumber(min, max) {
		return Math.random() * (max - min) + min;
	}
}

function toCase() {
	toUser((user, headers) => {
		const caseId = getCaseId();

		fetch(`https://jackhanmacsgolkgame.pythonanywhere.com/cases/${caseId}`, {
			method: 'GET',
			credentials: 'include',
			headers: {
				...headers,
				'Content-Type': 'application/json'
			}
		})
			.then(r => {
				if (!r.ok) {
					throw new Error(`HTTP error! Status: ${r.status}`);
				}
				return r.json();
			})
			.then(_case => {
				const items = _case.items.map(({ item }) => ({
					id: item.id,
					name: item.name,
					image: item.item_image[0].image,
					rarity: 'common'
				}));
				console.log(_case);
				new CaseSpinner(_case, items, headers);
			})
			.catch(error => {
				console.error('Ошибка при получении данных кейса:', error);
			});
	});
}
