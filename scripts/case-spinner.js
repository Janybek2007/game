class CaseSpinner {
	static CONFIG = {
		animation: {
			minDuration: 4000,
			maxDuration: 8000,
			initialVelocity: 2000,
			friction: 0.95,
			minVelocity: 5
		},
		items: {
			width: 170,
			repeats: 30,
			targetRepeatIndex: 15
		},
		sound: {
			enabled: false,
			spinSound: null,
			winSound: null
		}
	};

	constructor(caseData, items, headers) {
		this.case = caseData;
		this.items = items.map(item => ({
			...item,
			images: item.images || [item.image]
		}));
		this.headers = headers;

		this.initDOMElements();

		this.isSpinning = false;
		this.animationId = null;
		this.currentPosition = 0;
		this.velocity = 0;
		this.targetPosition = 0;
		this.winningIndex = 0;

		this.startTime = 0;
		this.duration = 0;

		this.init();
	}

	/**
	 * Инициализация DOM элементов
	 */
	initDOMElements() {
		this.spinnerEl = document.getElementById('caseSpinner');
		this.itemsEl = document.getElementById('spinnerItems');
		this.spinButton = document.getElementById('spinButton');
		this.resultContainer = document.getElementById('resultContainer');
		this.resultItem = document.getElementById('resultItem');

		this.winModal = document.getElementById('winModal');
		this.winItemImage = document.getElementById('winItemImage');
		this.winItemName = document.getElementById('winItemName');
		this.closeModalButton = document.getElementById('closeModalButton');
		this.spinButton = document.getElementById('spinButton');
	}

	/**
	 * Инициализация спиннера
	 */
	init() {
		this.generateItems();
		this.attachEventListeners();
		this.resetPosition();
	}

	/**
	 * Генерация предметов в ленте
	 */
	generateItems() {
		this.itemsEl.innerHTML = '';
		const fragment = document.createDocumentFragment();

		for (let repeat = 0; repeat < CaseSpinner.CONFIG.items.repeats; repeat++) {
			this.items.forEach((item, index) => {
				const itemEl = this.createItemElement(item, repeat, index);
				fragment.appendChild(itemEl);
			});
		}

		this.itemsEl.appendChild(fragment);
	}

	getImageUrl(item) {
		return item.images && item.images.length > 0 && item.images[0].image
			? item.images[0].image
			: item.image && typeof item.image === 'object' && item.image.image
			? item.image.image
			: '';
	}

	/**
	 * Создание элемента предмета
	 */
	createItemElement(item, repeatIndex, itemIndex) {
		const itemEl = document.createElement('div');
		itemEl.className = 'spinner-item';
		itemEl.setAttribute('data-item-id', item.id);
		itemEl.setAttribute('data-repeat', repeatIndex);
		itemEl.setAttribute('data-index', itemIndex);

		const imageContainer = document.createElement('div');
		imageContainer.className = 'item-image-container';

		const img = document.createElement('img');
		const imageSrc = this.getImageUrl(item);
		if (!imageSrc) {
			console.warn(
				`Нет изображения для предмета id=${item.id}, name=${item.name}`
			);
		}
		img.src = imageSrc;
		img.alt = item.name;
		img.className = 'item-image';
		img.loading = 'lazy';

		imageContainer.appendChild(img);
		itemEl.appendChild(imageContainer);

		return itemEl;
	}

	/**
	 * Подключение обработчиков событий
	 */
	attachEventListeners() {
		this.spinButton.addEventListener('click', () => this.spin());
		if (this.closeModalButton) {
			this.closeModalButton.addEventListener('click', () => this.closeModal());
		}

		let resizeTimeout;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimeout);
			resizeTimeout = setTimeout(() => {
				if (!this.isSpinning) {
					this.resetPosition();
				}
			}, 250);
		});
	}

	/**
	 * Сброс позиции спиннера
	 */
	resetPosition() {
		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}

		this.itemsEl.style.transition = 'none';
		this.itemsEl.style.transform = 'translateX(0px)';
		this.currentPosition = 0;
		this.velocity = 0;

		const previousWinner = this.itemsEl.querySelector('.winner');
		if (previousWinner) {
			previousWinner.classList.remove('winner');
		}

		if (this.resultContainer) {
			this.resultContainer.classList.remove('show');
		}
	}

	/**
	 * Запуск спиннера
	 */
	async spin() {
		if (this.isSpinning) return;

		this.isSpinning = true;
		this.spinButton.disabled = true;
		if (this.resultContainer) {
			this.resultContainer.classList.remove('show');
		}
		this.resetPosition();

		this.playSound('spin');

		try {
			const winningItem = await this.fetchWinningItem();
			this.setupAnimation(winningItem);
			this.startAnimation();
		} catch (error) {
			console.error('Ошибка при открытии кейса:', error);
			alert(error.message || 'Не удалось открыть кейс');
			this.stopSpinning();
		}
	}

	/**
	 * Получение выигрышного предмета через API
	 */
	async fetchWinningItem() {
		const caseId = getCaseId();
		const response = await fetch(
			`https://jackhanmacsgolkgame.pythonanywhere.com/en/cases/${caseId}/open/`,
			{
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
					...this.headers
				}
			}
		);

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.detail || data.error || 'Не удалось открыть кейс');
		}

		return data.item;
	}

	/**
	 * Настройка параметров анимации
	 */
	setupAnimation(winningItem) {
		const itemIndex = this.items.findIndex(item => item.id == winningItem.id);
		if (itemIndex === -1) {
			throw new Error('Выигрышный предмет не найден в списке кейса');
		}

		this.winningIndex =
			CaseSpinner.CONFIG.items.targetRepeatIndex * this.items.length +
			itemIndex;

		const spinnerRect = this.spinnerEl.getBoundingClientRect();
		const spinnerCenter = spinnerRect.width / 2;

		this.targetPosition =
			-(this.winningIndex * CaseSpinner.CONFIG.items.width) +
			spinnerCenter -
			CaseSpinner.CONFIG.items.width / 2;

		const offset = (Math.random() * 0.8 - 0.4) * CaseSpinner.CONFIG.items.width;
		this.targetPosition += offset;

		this.duration = this.getRandomDuration();
		this.velocity = CaseSpinner.CONFIG.animation.initialVelocity;
		this.startTime = performance.now();
	}

	/**
	 * Запуск анимации
	 */
	startAnimation() {
		this.animationId = requestAnimationFrame(this.animate.bind(this));
	}

	/**
	 * Основной цикл анимации
	 */
	animate(currentTime) {
		const elapsed = currentTime - this.startTime;
		const progress = Math.min(elapsed / this.duration, 1);

		this.animateMainPhase(progress, currentTime);

		this.updatePosition();

		if (progress < 1) {
			this.animationId = requestAnimationFrame(this.animate.bind(this));
		} else {
			this.finishAnimation();
		}
	}

	/**
	 * Анимация основной фазы
	 */
	animateMainPhase(progress) {
		const easedProgress = this.applyEasing(progress);
		let position = this.targetPosition * easedProgress;

		this.currentPosition = position;
	}

	/**
	 * Применение easing функции
	 */
	applyEasing(t) {
		return 1 - Math.pow(1 - t, 3);
	}

	/**
	 * Обновление позиции элемента
	 */
	updatePosition() {
		this.itemsEl.style.transform = `translate3d(${Math.round(
			this.currentPosition
		)}px, 0, 0)`;
	}

	/**
	 * Завершение анимации
	 */
	finishAnimation() {
		this.currentPosition = this.targetPosition;
		this.updatePosition();

		this.highlightWinner();
		this.playSound('win');

		setTimeout(() => {
			this.showWinModal();
			this.updateUserBalance();
		}, 800);

		this.stopSpinning();
	}

	/**
	 * Выделение выигрышного предмета
	 */
	highlightWinner() {
		const allItems = this.itemsEl.querySelectorAll('.spinner-item');
		const winnerItem = allItems[this.winningIndex];

		if (winnerItem) {
			winnerItem.classList.add('winner');

			if (this.resultItem) {
				const itemId = winnerItem.getAttribute('data-item-id');
				const item = this.items.find(item => item.id == itemId);
				this.resultItem.textContent = item?.name || 'Неизвестный предмет';
			}
		} else {
			console.error('Winner item not found at index:', this.winningIndex);
		}
	}

	/**
	 * Показ модального окна с выигрышем
	 */
	showWinModal() {
		if (!this.winModal || !this.winItemImage || !this.winItemName) {
			console.warn('Модальное окно или его элементы не найдены');
			return;
		}

		const winnerElement = this.itemsEl.querySelector('.winner');
		if (winnerElement) {
			const itemId = winnerElement.getAttribute('data-item-id');
			const winnerItem = this.items.find(item => item.id == itemId);
			if (winnerItem) {
				const imageSrc = this.getImageUrl(winnerItem);
				if (!imageSrc) {
					console.warn(
						`Нет изображения для выигранного предмета id=${itemId}, name=${winnerItem.name}`
					);
				}
				this.winItemImage.src = imageSrc;
				this.winItemImage.alt = winnerItem.name;
				this.winItemName.textContent = winnerItem.name;
				this.winModal.classList.add('show');

				const modalContent = this.winModal.querySelector('.modal-content');
				if (modalContent) {
					modalContent.classList.add('animate-content');
				}
			} else {
				console.error('Выигрышный предмет не найден в списке items:', itemId);
			}
		} else {
			console.error('Выигрышный элемент не найден в DOM');
		}
	}

	/**
	 * Закрытие модального окна
	 */
	closeModal() {
		if (this.winModal) {
			this.winModal.classList.remove('show');
			const modalContent = this.winModal.querySelector('.modal-content');
			if (modalContent) {
				modalContent.classList.remove('animate-content');
			}
		}
		this.resetPosition();

		const caseHeader = document.getElementById('caseHeader');
		const caseItemsSection = document.getElementById('caseItemsSection');
		const caseSpinnerContainer = document.getElementById(
			'caseSpinnerContainer'
		);
		const controls = document.getElementById('controls');
		const resultContainer = document.getElementById('resultContainer');

		caseHeader.classList.remove('hidden');
		caseItemsSection.classList.remove('hidden');
		caseSpinnerContainer.classList.add('hidden');
		controls.classList.remove('hidden');
		resultContainer.classList.add('hidden');

		this.spinButton.textContent = 'Открыть';
	}

	/**
	 * Остановка спиннера
	 */
	stopSpinning() {
		this.isSpinning = false;
		this.spinButton.disabled = false;

		if (this.animationId) {
			cancelAnimationFrame(this.animationId);
			this.animationId = null;
		}
	}

	/**
	 * Обновление баланса пользователя
	 */
	updateUserBalance() {
		if (typeof toUser === 'function') {
			toUser((user, headers) => {
				if (user) {
					const balanceElement = document.getElementById('user-balance');
					if (balanceElement && user.balance !== undefined) {
						balanceElement.textContent = `${user.balance}₽`;
					}
				}
			});
		}
	}

	/**
	 * Воспроизведение звука
	 */
	playSound(type) {
		if (!CaseSpinner.CONFIG.sound.enabled) return;

		const soundPath = CaseSpinner.CONFIG.sound[`${type}Sound`];
		if (soundPath) {
			try {
				const audio = new Audio(soundPath);
				audio.volume = 0.5;
				audio
					.play()
					.catch(e => console.log(`Не удалось воспроизвести звук ${type}:`, e));
			} catch (error) {
				console.log(`Ошибка при создании аудио ${type}:`, error);
			}
		}
	}

	/**
	 * Получение случайной длительности анимации
	 */
	getRandomDuration() {
		const { minDuration, maxDuration } = CaseSpinner.CONFIG.animation;
		return minDuration + Math.random() * (maxDuration - minDuration);
	}
}
