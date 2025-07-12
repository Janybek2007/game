/**
 * CaseSpinner - Современная версия спиннера для кейсов с гибкой конфигурацией
 * @version 2.0.0
 */
class CaseSpinner {
	// Конфигурация спиннера с современным подходом и гибкостью
	static DEFAULT_CONFIG = {
		animation: {
			minDuration: 9000, // Увеличено с 7000 до 9000 мс (+2 секунды)
			maxDuration: 12000, // Увеличено с 9000 до 12000 мс (+3 секунды)
			initialVelocity: 600,
			friction: 0.992,
			minVelocity: 2,
			easing: 'power4.out'
		},
		layout: {
			itemWidth: 170,
			repeats: 5,
			targetRepeatIndex: 3,
			centerOffset: 0
		},
		ui: {
			spinnerId: 'caseSpinner', // ID элемента спиннера
			itemsContainerId: 'spinnerItems', // ID контейнера для предметов
			spinButtonId: 'spinButton', // ID кнопки запуска
			resultContainerId: 'resultContainer', // ID контейнера результата
			resultItemId: 'resultItem', // ID элемента результата
			winModalId: 'winModal', // ID модального окна выигрыша
			winItemImageId: 'winItemImage', // ID изображения в модальном окне
			winItemNameId: 'winItemName', // ID названия предмета в модальном окне
			closeModalButtonId: 'closeModalButton' // ID кнопки закрытия модального окна
		},
		api: {
			openCaseEndpoint:
				'https://jackhanmacsgolkgame.pythonanywhere.com/en/cases/{caseId}/open/', // Эндпоинт для открытия кейса
			credentials: 'include', // Использовать куки для авторизации
			headers: {
				'Content-Type': 'application/json'
			}
		}
	};

	constructor(caseData, items, headers = {}, customConfig = {}) {
		// Слияние дефолтной конфигурации с пользовательской
		this.config = { ...CaseSpinner.DEFAULT_CONFIG, ...customConfig };
		this.case = caseData;
		this.items = items.map(item => ({
			id: item.id,
			name: item.name,
			image: this.normalizeImageUrl(
				item.image || (item.images && item.images[0])
			),
			price: item.price,
			rarityClass: this.getRarityClass(item.price)
		}));
		this.headers = headers;

		this.adjustLayoutBasedOnItems();

		// Состояние спиннера
		this.isSpinning = false;
		this.animationId = null;
		this.currentPosition = 0;
		this.velocity = 0;
		this.targetPosition = 0;
		this.winningIndex = 0;
		this.startTime = 0;
		this.duration = 0;

		// Инициализация
		this.initDOMElements();
		this.init();
	}

	/**
	 * Нормализация URL изображения
	 * @param {string|object} image - URL или объект изображения
	 * @returns {string} - Нормализованный URL
	 */
	normalizeImageUrl(image) {
		if (typeof image === 'string') return image;
		if (image && typeof image === 'object' && image.image) return image.image;
		return '';
	}

	/**
	 * Определение класса редкости на основе цены
	 * @param {string|number} price - Цена предмета
	 * @returns {string} - Класс редкости
	 */
	getRarityClass(price) {
		const priceValue = parseFloat(price);
		if (priceValue >= 5000) return 'legendary';
		if (priceValue >= 1000) return 'epic';
		if (priceValue >= 500) return 'rare';
		return 'common';
	}

	/**
	 * Инициализация DOM элементов на основе конфигурации
	 */
	initDOMElements() {
		const uiConfig = this.config.ui;
		this.spinnerEl = document.getElementById(uiConfig.spinnerId);
		this.itemsEl = document.getElementById(uiConfig.itemsContainerId);
		this.spinButton = document.getElementById(uiConfig.spinButtonId);
		this.resultContainer = document.getElementById(uiConfig.resultContainerId);
		this.resultItem = document.getElementById(uiConfig.resultItemId);
		this.winModal = document.getElementById(uiConfig.winModalId);
		this.winItemImage = document.getElementById(uiConfig.winItemImageId);
		this.winItemName = document.getElementById(uiConfig.winItemNameId);
		this.closeModalButton = document.getElementById(
			uiConfig.closeModalButtonId
		);
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
	 * Генерация предметов в ленте спиннера
	 */
	generateItems() {
		this.itemsEl.innerHTML = '';
		const fragment = document.createDocumentFragment();
		const repeats = this.config.layout.repeats;

		for (let repeat = 0; repeat < repeats; repeat++) {
			this.items.forEach((item, index) => {
				const itemEl = this.createItemElement(item, repeat, index);
				fragment.appendChild(itemEl);
			});
		}

		this.itemsEl.appendChild(fragment);
	}

	/**
	 * Создание DOM элемента для предмета
	 * @param {object} item - Данные предмета
	 * @param {number} repeatIndex - Индекс повтора
	 * @param {number} itemIndex - Индекс предмета
	 * @returns {HTMLElement} - Элемент предмета
	 */
	createItemElement(item, repeatIndex, itemIndex) {
		const itemEl = document.createElement('div');
		itemEl.className = `spinner-item ${item.rarityClass}`;
		itemEl.setAttribute('data-item-id', item.id);
		itemEl.setAttribute('data-repeat', repeatIndex);
		itemEl.setAttribute('data-index', itemIndex);

		const imageContainer = document.createElement('div');
		imageContainer.className = 'item-image-container';

		const img = document.createElement('img');
		img.classList.add('item-image');
		if (!item.image) {
			console.warn(
				`Нет изображения для предмета id=${item.id}, name=${item.name}`
			);
		}
		img.src = item.image || '';
		img.alt = item.name;
		img.loading = 'lazy';

		imageContainer.appendChild(img);
		itemEl.appendChild(imageContainer);
		return itemEl;
	}

	/**
	 * Подключение обработчиков событий
	 */
	attachEventListeners() {
		if (this.spinButton) {
			this.spinButton.addEventListener('click', () => this.spin());
		}
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
		if (this.spinButton) {
			this.spinButton.disabled = true;
		}
		if (this.resultContainer) {
			this.resultContainer.classList.remove('show');
		}
		this.resetPosition();

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
	 * @returns {Promise<object>} - Данные выигрышного предмета
	 */
	async fetchWinningItem() {
		const caseId = getCaseId();
		if (!caseId) throw new Error('ID кейса не найден');

		const endpoint = this.config.api.openCaseEndpoint.replace(
			'{caseId}',
			caseId
		);
		const response = await fetch(endpoint, {
			method: 'POST',
			credentials: this.config.api.credentials,
			headers: {
				...this.config.api.headers,
				...this.headers
			}
		});

		const data = await response.json();
		if (!response.ok) {
			throw new Error(data.detail || data.error || 'Не удалось открыть кейс');
		}

		return data.item;
	}

	/**
	 * Настройка параметров анимации
	 * @param {object} winningItem - Выигрышный предмет
	 */
	setupAnimation(winningItem) {
		const itemIndex = this.items.findIndex(item => item.id == winningItem.id);
		if (itemIndex === -1) {
			throw new Error('Выигрышный предмет не найден в списке кейса');
		}

		this.winningIndex =
			this.config.layout.targetRepeatIndex * this.items.length + itemIndex;

		const spinnerRect = this.spinnerEl.getBoundingClientRect();
		const spinnerCenter = spinnerRect.width / 2;

		this.targetPosition =
			-(this.winningIndex * this.config.layout.itemWidth) +
			spinnerCenter -
			this.config.layout.itemWidth / 2 +
			this.config.layout.centerOffset;

		const offset = (Math.random() * 0.8 - 0.4) * this.config.layout.itemWidth;
		this.targetPosition += offset;

		this.duration = this.getRandomDuration();
		this.velocity = this.config.animation.initialVelocity;
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
	 * @param {number} currentTime - Текущее время
	 */
	animate(currentTime) {
		const elapsed = currentTime - this.startTime;
		const progress = Math.min(elapsed / this.duration, 1);

		this.animateMainPhase(progress);
		this.updatePosition();

		if (progress < 1) {
			this.animationId = requestAnimationFrame(this.animate.bind(this));
		} else {
			this.finishAnimation();
		}
	}

	/**
	 * Анимация основной фазы
	 * @param {number} progress - Прогресс анимации (0-1)
	 */
	animateMainPhase(progress) {
		const easedProgress = this.applyEasing(
			progress,
			this.config.animation.easing
		);
		this.currentPosition = this.targetPosition * easedProgress;
	}

	/**
	 * Применение функции смягчения (easing)
	 * @param {number} t - Прогресс (0-1)
	 * @param {string} type - Тип функции смягчения
	 * @returns {number} - Скорректированный прогресс
	 */
	applyEasing(t, type = 'power4.out') {
		switch (type) {
			case 'power4.out':
				return 1 - Math.pow(1 - t, 4.5);
			case 'power3.out':
				return 1 - Math.pow(1 - t, 3);
			case 'linear':
				return t;
			default:
				return 1 - Math.pow(1 - t, 4.5);
		}
	}

	/**
	 * Обновление позиции спиннера
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
				const item = this.items.find(i => i.id == itemId);
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
				if (!winnerItem.image) {
					console.warn(
						`Нет изображения для выигранного предмета id=${itemId}, name=${winnerItem.name}`
					);
				}
				this.winItemImage.src = winnerItem.image || '';
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

		if (caseHeader) caseHeader.classList.remove('hidden');
		if (caseItemsSection) caseItemsSection.classList.remove('hidden');
		if (caseSpinnerContainer) caseSpinnerContainer.classList.add('hidden');
		if (controls) controls.classList.remove('hidden');
		if (resultContainer) resultContainer.classList.add('hidden');

		if (this.spinButton) {
			this.spinButton.textContent = 'Открыть';
		}
	}

	/**
	 * Остановка спиннера
	 */
	stopSpinning() {
		this.isSpinning = false;
		if (this.spinButton) {
			this.spinButton.disabled = false;
		}
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
	 * Динамическая настройка repeats, targetRepeatIndex и initialVelocity на основе количества предметов
	 */
	adjustLayoutBasedOnItems() {
		const itemCount = this.items.length;
		if (itemCount < 10) {
			console.log('itemCount < 10');
			this.config.layout.repeats = 18;
			this.config.layout.targetRepeatIndex = 9;
			this.config.animation.initialVelocity = 400;
		} else if (itemCount < 15) {
			console.log('itemCount < 15');
			this.config.layout.repeats = 14;
			this.config.layout.targetRepeatIndex = 7;
			this.config.animation.initialVelocity = 300;
		} else if (itemCount < 20) {
			console.log('itemCount < 20');
			this.config.layout.repeats = 10;
			this.config.layout.targetRepeatIndex = 5;
			this.config.animation.initialVelocity = 200; // Уменьшенная скорость
		} else {
			console.log('itemCount > 20');
			this.config.layout.repeats = 2;
			this.config.layout.targetRepeatIndex = 1;
			this.config.animation.initialVelocity = 100; // Минимальная скорость для большого числа элементов
		}
	}

	/**
	 * Получение случайной длительности анимации
	 * @returns {number} - Длительность в миллисекундах
	 */
	getRandomDuration() {
		const { minDuration, maxDuration } = this.config.animation;
		return minDuration + Math.random() * (maxDuration - minDuration);
	}
}
